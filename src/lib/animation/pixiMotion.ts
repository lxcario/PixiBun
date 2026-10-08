/**
 * src/lib/animation/pixiMotion.ts
 *
 * PixiMotion Slice 1 — Rigid Part Transform -> Cel Bake Engine
 *
 * Provides deterministic rigid raster transformations,
 * pivot control, pose interpolation, non-destructive previewing, and
 * atomic cel baking for PixiBun Atelier.
 */

import { AnimationFrame } from '@/types/canvas';
import { createId } from '@/lib/engine/id';
import {
  snapshotBuffers,
  replaceAllBuffers,
  createEntry,
} from '@/lib/engine/bufferRegistry';
import { commitWorkspace } from '@/lib/engine/workspaceTransaction';
import { pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';
import { canAddFramesToProject } from '@/lib/project/workspaceEnvelopeGuard';
import { useStudioStore } from '@/stores/studioStore';
import { assertMemoryAvailable, reserveMemory } from '@/lib/safety/memoryBudget';
import { clipsAfterFrameDuplication } from '@/lib/animation/clipFrameMutations';
import { MAX_PALETTE_BINDINGS } from '@/lib/color/paletteSemantics';
import { isNormalLayer } from '@/lib/export/normalLayers';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';
import { MOTION_EDIT_LIMITS, validMotionSettings } from './motionEditing';
import { copyPlacedMotionRaster, motionRasterPlacement, renderPlacedMotionRaster, stampPlacedMotionRaster, type PlacedMotionRaster } from './motionRaster';
import { createMotionRenderer } from './motionRenderer';
import { beginWorkspaceJob } from '@/lib/engine/workspaceJob';
import type { StudioState } from '@/stores/slices/types';

export type MotionEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface MotionPose {
  translationX: number; // in pixels
  translationY: number; // in pixels
  rotation: number; // in radians
}

export interface MotionPartBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MotionPivot {
  x: number;
  y: number;
}

export interface MotionPart {
  readonly id: string;
  readonly sourceVersion: {
    readonly projectId: string | null;
    readonly canvasWidth: number;
    readonly canvasHeight: number;
    readonly generation: number;
    readonly contentRevision: number;
  };
  /** Capture-time hint only. Resolve ownership by IDs after timeline changes. */
  sourceFrameIndex: number;
  readonly sourceLayerId: string;
  readonly sourceFrameId: string;
  bounds: MotionPartBounds;
  pivot: MotionPivot;
  startPose: MotionPose;
  endPose: MotionPose;
  frameCount: number; // Total frames in arc, min 2, max 30
  easing: MotionEasing;
  raster: ImageData; // Extracted raster of the selected part
  mask: Uint8Array | null; // 1-bit selection mask in canvas coordinates
}

export type MotionPartSettings = Pick<MotionPart, 'pivot' | 'frameCount' | 'easing'>;

/** Geometric center in canvas boundary coordinates; odd extents need half pixels. */
export function getMotionBoundsCenter(bounds: MotionPartBounds): MotionPivot {
  return { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 };
}

/** Read-only source resolution: never create a blank replacement or fall back to the active cel. */
export function resolveMotionSource(part: MotionPart, state: Pick<StudioState, 'currentProjectId' | 'canvasWidth' | 'canvasHeight' | 'frames'> = useStudioStore.getState()) {
  const fail = (reason: string) => ({ ok: false as const, reason });
  const version = part.sourceVersion;
  if (!version || version.projectId !== state.currentProjectId) {
    return fail('This motion part belongs to a different project. Capture a new part.');
  }
  if (version.canvasWidth !== state.canvasWidth || version.canvasHeight !== state.canvasHeight) {
    return fail('The canvas size changed. Capture a new motion part.');
  }
  const frameIndex = state.frames.findIndex(frame => frame.id === part.sourceFrameId);
  const frame = state.frames[frameIndex];
  if (!frame) return fail('The source frame no longer exists. Capture a new motion part.');
  const layer = frame.layers.find(layer => layer.id === part.sourceLayerId);
  if (!layer) return fail('The source layer no longer exists on the source frame. Capture a new motion part.');
  if (isNormalLayer(layer)) return fail('Motion parts currently support color artwork. Use layer rotation for normal maps.');
  if (layer.locked) return fail('Cannot bake motion onto a locked layer. Unlock it first.');
  const moving = [part.startPose, part.endPose].some(pose => pose.translationX !== 0 || pose.translationY !== 0 || pose.rotation !== 0);
  if (moving && frame.layers.some(sibling => sibling.id !== layer.id && (isNormalLayer(sibling) ||
    (sibling.research?.source.frameId === frame.id &&
      (sibling.research.source.layerId === layer.id || sibling.research.source.normalLayerId === layer.id))))) {
    return fail('This frame has normal artwork or dependent derived layers. Remove or separate those layers before moving the part; they cannot yet move with it.');
  }
  const entry = snapshotBuffers().get(layer.id);
  if (!entry || entry.generation !== version.generation ||
    entry.contentRevision !== version.contentRevision ||
    entry.canvas.width !== state.canvasWidth || entry.canvas.height !== state.canvasHeight) {
    return fail('The source artwork changed. Cancel and capture a new motion part before baking.');
  }
  return { ok: true as const, frameIndex, frame, layer, entry };
}

/**
 * Evaluates an animation easing curve for t in [0, 1].
 * Completely deterministic pure math with zero dependencies.
 */
export function evaluateEasing(t: number, easing: MotionEasing): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case 'linear':
      return clamped;
    case 'ease-in':
      return clamped * clamped;
    case 'ease-out':
      return clamped * (2 - clamped);
    case 'ease-in-out':
      return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped;
    default:
      return clamped;
  }
}

/**
 * Interpolates between start and end poses at progression t in [0, 1].
 */
export function interpolatePose(
  start: MotionPose,
  end: MotionPose,
  t: number,
  easing: MotionEasing
): MotionPose {
  const factor = evaluateEasing(t, easing);
  const rounded = (value: number) => { const result = Math.round(value); return result === 0 ? 0 : result; };
  return {
    translationX: rounded(start.translationX + (end.translationX - start.translationX) * factor),
    translationY: rounded(start.translationY + (end.translationY - start.translationY) * factor),
    rotation: start.rotation + (end.rotation - start.rotation) * factor,
  };
}

/**
 * Captures selected raster content from an existing canvas layer as a temporary MotionPart.
 * Does NOT mutate the source layer.
 */
export function captureMotionPart(params: {
  canvasWidth: number;
  canvasHeight: number;
  activeFrameIndex: number;
  activeLayerId: string;
  frames: AnimationFrame[];
  selection: { x: number; y: number; w: number; h: number } | null;
  selectionMask: Uint8Array | null;
  layerCanvas: HTMLCanvasElement;
}): MotionPart | null {
  const {
    canvasWidth,
    canvasHeight,
    activeFrameIndex,
    activeLayerId,
    frames,
    selection,
    selectionMask,
    layerCanvas,
  } = params;

  const frame = frames[activeFrameIndex];
  if (!frame) return null;
  const layer = frame.layers.find((l) => l.id === activeLayerId);
  if (!layer || layer.locked || isNormalLayer(layer)) return null;

  const state = useStudioStore.getState();
  if (state.hasFloatingSelection || coDrawBridge.getRole() !== null) return null;
  const entry = snapshotBuffers().get(activeLayerId);
  if (!entry || entry.canvas !== layerCanvas || state.canvasWidth !== canvasWidth ||
    state.canvasHeight !== canvasHeight || !state.frames.some(f => f.id === frame.id &&
      f.layers.some(l => l.id === activeLayerId)) || layerCanvas.width !== canvasWidth ||
    layerCanvas.height !== canvasHeight || (selectionMask && selectionMask.length !== canvasWidth * canvasHeight)) return null;
  if (selection && (!Object.values(selection).every(Number.isSafeInteger) || selection.w <= 0 || selection.h <= 0)) return null;

  // If no selection bounding box, default to full canvas
  const bounds: MotionPartBounds = selection
    ? {
        x: Math.max(0, selection.x),
        y: Math.max(0, selection.y),
        w: Math.min(canvasWidth, selection.x + selection.w) - Math.max(0, selection.x),
        h: Math.min(canvasHeight, selection.y + selection.h) - Math.max(0, selection.y),
      }
    : { x: 0, y: 0, w: canvasWidth, h: canvasHeight };
  if (bounds.w <= 0 || bounds.h <= 0) return null;

  const ctx = layerCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  assertMemoryAvailable(bounds.w * bounds.h * 8 + (selectionMask ? canvasWidth * canvasHeight : 0), 'Motion capture');
  const region = ctx.getImageData(bounds.x, bounds.y, bounds.w, bounds.h);
  const partBytes = new Uint8ClampedArray(bounds.w * bounds.h * 4);

  let hasVisiblePixels = false;
  for (let y = 0; y < bounds.h; y++) {
    for (let x = 0; x < bounds.w; x++) {
      const cx = bounds.x + x;
      const cy = bounds.y + y;
      const cIdx = cy * canvasWidth + cx;
      const isSelected = selectionMask ? selectionMask[cIdx] === 1 : true;

      if (isSelected) {
        const srcOffset = (y * bounds.w + x) * 4;
        const dstOffset = (y * bounds.w + x) * 4;
        const a = region.data[srcOffset + 3];
        if (a > 0) {
          partBytes[dstOffset] = region.data[srcOffset];
          partBytes[dstOffset + 1] = region.data[srcOffset + 1];
          partBytes[dstOffset + 2] = region.data[srcOffset + 2];
          partBytes[dstOffset + 3] = a;
          hasVisiblePixels = true;
        }
      }
    }
  }

  // Refuse empty selections
  if (!hasVisiblePixels) return null;

  const raster = new ImageData(partBytes, bounds.w, bounds.h);
  const pivot = getMotionBoundsCenter(bounds);

  return {
    id: createId('motion-part'),
    sourceVersion: {
      projectId: state.currentProjectId, canvasWidth, canvasHeight,
      generation: entry.generation, contentRevision: entry.contentRevision,
    },
    sourceFrameIndex: activeFrameIndex,
    sourceLayerId: activeLayerId,
    sourceFrameId: frame.id,
    bounds,
    pivot,
    startPose: { translationX: 0, translationY: 0, rotation: 0 },
    endPose: { translationX: 0, translationY: 0, rotation: 0 },
    frameCount: 5,
    easing: 'ease-in-out',
    raster,
    mask: selectionMask ? new Uint8Array(selectionMask) : null,
  };
}

/**
 * Transforms a motion part raster according to a pose (translation + rotation around pivot)
 * and renders it onto a full canvas sized ImageData.
 *
 * Uses the shared rectangle renderer and clipped placement without another resample.
 * RotSprite's sampled candidates and contour restoration are pixel-art heuristics;
 * they do not guarantee continuity or preservation of every authored feature.
 */
export function transformMotionPart(
  part: Pick<MotionPart, 'bounds' | 'pivot' | 'raster'>,
  pose: MotionPose,
  canvasWidth: number,
  canvasHeight: number
): ImageData {
  assertMemoryAvailable(canvasWidth * canvasHeight * 4, 'PixiMotion compatibility output');
  const sprite = renderMotionPart(part, pose);
  const data = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);
  copyPlacedMotionRaster({ data, width: canvasWidth, height: canvasHeight }, sprite);
  return new ImageData(data, canvasWidth, canvasHeight);
}

/** Synchronous counterpart of the worker's rectangle-sized render. */
export function renderMotionPart(part: Pick<MotionPart, 'bounds' | 'pivot' | 'raster'>, pose: MotionPose): PlacedMotionRaster {
  const box = motionRasterPlacement(part.bounds, part.pivot, pose);
  assertMemoryAvailable((part.bounds.w * part.bounds.h * 90 + box.width * box.height * 16) * 4, 'PixiMotion transform scratch');
  return renderPlacedMotionRaster(part.raster, part.bounds, part.pivot, pose);
}

/**
 * Clears the selected region from a source ImageData in-place.
 */
export function clearSelectionFromImageData(
  target: ImageData,
  bounds: MotionPartBounds,
  mask: Uint8Array | null,
  canvasWidth: number,
  canvasHeight: number
): void {
  const { data } = target;
  for (let y = 0; y < bounds.h; y++) {
    for (let x = 0; x < bounds.w; x++) {
      const cx = bounds.x + x;
      const cy = bounds.y + y;
      if (cx >= 0 && cx < canvasWidth && cy >= 0 && cy < canvasHeight) {
        const cIdx = cy * canvasWidth + cx;
        const isSelected = mask ? mask[cIdx] === 1 : true;
        if (isSelected) {
          const offset = cIdx * 4;
          data[offset] = 0;
          data[offset + 1] = 0;
          data[offset + 2] = 0;
          data[offset + 3] = 0;
        }
      }
    }
  }
}

/**
 * Alpha-over stamps a transformed part onto a target ImageData in-place.
 */
export function stampTransformedPart(
  target: ImageData,
  transformed: ImageData
): void {
  const tData = target.data;
  const sData = transformed.data;
  const len = tData.length;

  for (let i = 0; i < len; i += 4) {
    const sA = sData[i + 3];
    if (sA === 0) continue;

    if (sA === 255) {
      tData[i] = sData[i];
      tData[i + 1] = sData[i + 1];
      tData[i + 2] = sData[i + 2];
      tData[i + 3] = 255;
    } else {
      const tA = tData[i + 3];
      const srcAlpha = sA / 255;
      const dstAlpha = tA / 255;
      const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha);

      if (outAlpha > 0) {
        tData[i] = Math.round(
          (sData[i] * srcAlpha + tData[i] * dstAlpha * (1 - srcAlpha)) / outAlpha
        );
        tData[i + 1] = Math.round(
          (sData[i + 1] * srcAlpha + tData[i + 1] * dstAlpha * (1 - srcAlpha)) / outAlpha
        );
        tData[i + 2] = Math.round(
          (sData[i + 2] * srcAlpha + tData[i + 2] * dstAlpha * (1 - srcAlpha)) / outAlpha
        );
        tData[i + 3] = Math.round(outAlpha * 255);
      }
    }
  }
}

export interface BakeResult {
  ok: boolean;
  reason?: string;
  addedFrameCount?: number;
}

/**
 * Executes the atomic PixiMotion Cel Bake transaction.
 *
 * 1. Pre-validates project capacity and target layer locking rules.
 * 2. Generates all N poses and their transformed rasters.
 * 3. Records a single StructuralHistoryStep capturing previous frames and buffers.
 * 4. Inserts (N - 1) newly generated frames into the timeline within commitWorkspace.
 * 5. Restores the prior workspace if synchronous publication fails.
 */
function sameBakeWorkspace(before: StudioState, after: StudioState): boolean {
  return before.currentProjectId === after.currentProjectId && before.canvasWidth === after.canvasWidth &&
    before.canvasHeight === after.canvasHeight && before.editRevision === after.editRevision &&
    before.bufferVersion === after.bufferVersion && before.frames === after.frames && before.palettes === after.palettes &&
    before.clips === after.clips && before.activeFrameIndex === after.activeFrameIndex && before.activeLayerId === after.activeLayerId &&
    before.motionPart === after.motionPart && before.motionHistory === after.motionHistory &&
    before.hasFloatingSelection === after.hasFloatingSelection;
}

function* motionBakeSteps(part: MotionPart, asynchronous = false): Generator<MotionPose, BakeResult, PlacedMotionRaster> {
  if (coDrawBridge.getRole() !== null) return { ok: false, reason: 'Close co-draw before baking motion.' };
  const state = useStudioStore.getState();
  const { canvasWidth, canvasHeight, frames } = state;
  if (state.hasFloatingSelection) return { ok: false, reason: 'Commit or cancel the floating selection before baking motion.' };
  const source = resolveMotionSource(part, state);
  if (!source.ok) return source;
  const { frame: sourceFrame, layer: sourceLayer, frameIndex: sourceFrameIndex } = source;
  const { bounds } = part;
  const numbers = [part.pivot.x, part.pivot.y, ...Object.values(part.startPose), ...Object.values(part.endPose)];
  if (!validMotionSettings(part) || !numbers.every(Number.isFinite) || !Number.isInteger(part.frameCount) ||
    part.frameCount < MOTION_EDIT_LIMITS.minFrames || part.frameCount > MOTION_EDIT_LIMITS.maxFrames ||
    !['linear', 'ease-in', 'ease-out', 'ease-in-out'].includes(part.easing) ||
    !Object.values(bounds).every(Number.isSafeInteger) || bounds.x < 0 || bounds.y < 0 ||
    bounds.w < 1 || bounds.h < 1 || bounds.x + bounds.w > canvasWidth || bounds.y + bounds.h > canvasHeight ||
    part.raster.width !== bounds.w || part.raster.height !== bounds.h ||
    (part.mask && part.mask.length !== canvasWidth * canvasHeight)) {
    return { ok: false, reason: 'Invalid motion settings. Cancel and capture a new motion part.' };
  }
  const totalFrames = part.frameCount;
  const framesToInsert = totalFrames - 1;
  const incomingLayerCount = sourceFrame.layers.length;
  const bindingCopies = state.palettes.map(palette => palette.semantics?.bindings.filter(binding => binding.frameId === sourceFrame.id) ?? []);
  if (state.palettes.some((palette, i) => (palette.semantics?.bindings.length ?? 0) + bindingCopies[i].length * framesToInsert > MAX_PALETTE_BINDINGS)) {
    return { ok: false, reason: 'Baking would exceed the palette binding limit. Reduce the frame count or palette bindings.' };
  }
  const capacity = canAddFramesToProject(frames, canvasWidth, canvasHeight,
    Array(framesToInsert).fill({ layerCount: incomingLayerCount }));
  if (!capacity.ok) return { ok: false, reason: capacity.reason || 'Workspace capacity ceiling reached.' };

  const rasterBytes = canvasWidth * canvasHeight * 4;
  let releaseStaging: (() => void) | undefined;
  try {
    // Retain the old source until publication succeeds. Include output, copies and pose scratch.
    const largestOutputBytes = Math.max(...Array.from({ length: totalFrames }, (_, i) => {
      const box = motionRasterPlacement(bounds, part.pivot, interpolatePose(part.startPose, part.endPose, i / (totalFrames - 1), part.easing));
      return box.width * box.height * 4;
    }));
    releaseStaging = reserveMemory((framesToInsert * incomingLayerCount + 3) * rasterBytes + largestOutputBytes, 'PixiMotion bake staging');
    const originalSourceImage = source.entry.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const previousBuffers = snapshotBuffers();
    const stagedBuffers = new Map(previousBuffers);
    const nextFrames = structuredClone(frames);
    const editedSourceLayer = nextFrames[sourceFrameIndex].layers.find(layer => layer.id === sourceLayer.id)!;
    editedSourceLayer.effect = undefined;
    editedSourceLayer.research = undefined;
    const newFrameObjects: AnimationFrame[] = [];
    const nextPalettes = structuredClone(state.palettes);
    let addedPaletteBytes = 0;
    let nextClips = state.clips;
    let lastSourceLayerId = sourceLayer.id;

    for (let i = 0; i < totalFrames; i++) {
      const pose = interpolatePose(part.startPose, part.endPose, i / (totalFrames - 1), part.easing);
      const transformed = yield pose;
      const image = new ImageData(new Uint8ClampedArray(originalSourceImage.data), canvasWidth, canvasHeight);
      clearSelectionFromImageData(image, bounds, part.mask, canvasWidth, canvasHeight);
      stampPlacedMotionRaster(image, transformed);
      if (i === 0) {
        const replacement = createEntry(canvasWidth, canvasHeight, source.entry.contentRevision + 1, true);
        replacement.ctx.putImageData(image, 0, 0);
        stagedBuffers.set(sourceLayer.id, replacement);
        continue;
      }
      const duplicate = structuredClone(sourceFrame);
      duplicate.id = createId('frame');
      nextPalettes.forEach((palette, index) => {
        if (!palette.semantics) return;
        const copies = bindingCopies[index].map(binding => ({ ...binding, id: createId('binding'), frameId: duplicate.id }));
        addedPaletteBytes += JSON.stringify(copies).length * 2;
        palette.semantics.bindings.push(...copies);
      });
      const layerIds = new Map(duplicate.layers.map(layer => [layer.id, createId('layer')]));
      for (const layer of duplicate.layers) {
        const originalId = layer.id;
        layer.id = layerIds.get(originalId)!;
        if (layer.effect) layer.effect.id = createId('effect');
        if (layer.research?.source.frameId === sourceFrame.id) {
          const recipeSource = layer.research.source;
          recipeSource.frameId = duplicate.id;
          recipeSource.layerId = layerIds.get(recipeSource.layerId) ?? recipeSource.layerId;
          if (recipeSource.normalLayerId) recipeSource.normalLayerId = layerIds.get(recipeSource.normalLayerId) ?? recipeSource.normalLayerId;
        }
        const entry = createEntry(canvasWidth, canvasHeight, 1, true);
        if (originalId === sourceLayer.id) {
          layer.effect = undefined;
          layer.research = undefined;
          entry.ctx.putImageData(image, 0, 0);
          lastSourceLayerId = layer.id;
        } else {
          const original = previousBuffers.get(originalId);
          if (original && (original.canvas.width !== canvasWidth || original.canvas.height !== canvasHeight)) {
            throw new Error('A sibling layer has mismatched pixel dimensions. Restore the drawing before baking.');
          }
          // Unallocated layers are legitimately empty in the lazy buffer registry.
          if (original) entry.ctx.drawImage(original.canvas, 0, 0);
        }
        stagedBuffers.set(layer.id, entry);
      }
      newFrameObjects.push(duplicate);
      nextClips = clipsAfterFrameDuplication(nextClips, sourceFrameIndex + i - 1);
    }
    nextFrames.splice(sourceFrameIndex + 1, 0, ...newFrameObjects);

    // Synchronous guards also catch injected/reentrant changes during raster generation.
    const current = useStudioStore.getState();
    const currentSource = resolveMotionSource(part, current);
    if (!currentSource.ok) return currentSource;
    if ((asynchronous ? !sameBakeWorkspace(state, current) : current !== state) || coDrawBridge.getRole() !== null) return { ok: false, reason: 'The workspace changed during baking. Try again.' };
    commitWorkspace(() => {
      if (!pushStructuralHistoryStep('PixiMotion Bake', {
        opKind: 'add-frame', affectedLayerIds: [sourceLayer.id], addedFrameCount: framesToInsert,
        addedLayerCount: framesToInsert * incomingLayerCount,
        redoBufferCount: framesToInsert * incomingLayerCount + 1,
        includePalettes: true, addedMetadataBytes: addedPaletteBytes,
      })) throw new Error('Could not record history snapshot for bake.');
      replaceAllBuffers(stagedBuffers);
      useStudioStore.setState({
        frames: nextFrames, clips: nextClips, palettes: nextPalettes,
        activeFrameIndex: sourceFrameIndex + framesToInsert,
        activeLayerId: lastSourceLayerId,
        motionPart: null, motionPreviewIndex: null, motionHistory: null,
        isDirty: true, editRevision: state.editRevision + 1, bufferVersion: state.bufferVersion + 1,
      });
    });
    return { ok: true, addedFrameCount: framesToInsert };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'Unknown error during bake commit.' };
  } finally {
    releaseStaging?.();
  }
}

/** Synchronous engine entry point for small deterministic operations and tests. */
export function bakeMotionToTimeline(part: MotionPart): BakeResult {
  const steps = motionBakeSteps(part);
  try {
    let next = steps.next();
    while (!next.done) {
      next = steps.next(renderMotionPart(part, next.value));
    }
    return next.value;
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'Motion rendering failed.' };
  } finally { steps.return({ ok: false }); }
}

let baking = false;
/** Stage in an isolated worker; source/session changes abort before atomic publication. */
export async function bakeMotionToTimelineAsync(part: MotionPart): Promise<BakeResult> {
  if (baking) return { ok: false, reason: 'A motion bake is already running.' };
  const source = resolveMotionSource(part);
  if (!source.ok) return source;
  baking = true;
  const state = useStudioStore.getState(), steps = motionBakeSteps(part, true), renderer = createMotionRenderer();
  const job = beginWorkspaceJob([part.sourceLayerId], undefined, () =>
    sameBakeWorkspace(state, useStudioStore.getState()) && resolveMotionSource(part).ok && coDrawBridge.getRole() === null ? 'owned' : 'changed');
  const abort = () => renderer.dispose(); job.signal.addEventListener('abort', abort, { once: true });
  try {
    job.check();
    let next = steps.next();
    while (!next.done) {
      const image = await renderer.render(part, next.value, state.canvasWidth, state.canvasHeight);
      job.check(); next = steps.next(image);
    }
    return next.value;
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'Motion baking was cancelled.' };
  } finally {
    steps.return({ ok: false }); job.signal.removeEventListener('abort', abort); job.dispose(); renderer.dispose(); baking = false;
  }
}
