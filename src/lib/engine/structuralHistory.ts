/**
 * structuralHistory.ts
 *
 * Implements the structural snapshot recorder for the Hybrid Command Pattern history engine.
 * Records layer/frame tree metadata and only affected raster pixel buffers before destructive
 * structural mutations (layer deletions, merges, duplications, reordering, frame changes).
 */

import { useStudioStore } from '@/stores/studioStore';
import { getOrCreateBuffer, hasBuffer, createEntry, snapshotBuffers, replaceAllBuffers } from '@/lib/engine/bufferRegistry';
import {
  getGlobalHistoryEngine,
  StructuralHistoryStep,
  LayerBufferBackup,
} from '@/lib/engine/historyEngine';
import type { AnimationFrame, StructuralOpKind } from '@/types/canvas';
import type { AnimationClip } from '@/types/animation';
import { studioEvents } from '@/lib/events/studioEvents';
import { assertMemoryAvailable, reserveMemory } from '@/lib/safety/memoryBudget';
import { estimateClipBytes } from '@/lib/animation/reviewMetadata';
import { estimatePaletteBytes } from '@/lib/color/paletteSemantics';
import { motionRigBytes, type MotionRig } from '@/lib/animation/motionRigDocument';
import { researchBytes } from '@/lib/research/recipes';
import type { ColorPalette } from '@/types/palette';
import { commitWorkspace } from './workspaceTransaction';

/**
 * Captures pixel buffers ONLY for the specified layer IDs.
 * Bounded to affected layers — never scans all layers in the project.
 */
export function captureLayerBuffers(layerIds: string[]): LayerBufferBackup[] {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !layerIds || layerIds.length === 0) {
    return [];
  }

  const state = useStudioStore.getState();
  const buffers: LayerBufferBackup[] = [];
  assertMemoryAvailable(new Set(layerIds.filter(hasBuffer)).size * state.canvasWidth * state.canvasHeight * 4, 'History snapshot');
  const seen = new Set<string>();

  for (const layerId of layerIds) {
    if (!seen.has(layerId) && hasBuffer(layerId)) {
      seen.add(layerId);
      const entry = getOrCreateBuffer(layerId, state.canvasWidth, state.canvasHeight);
      const data = entry.ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
      buffers.push({
        layerId,
        imageData: data,
      });
    }
  }

  return buffers;
}


export interface PushStructuralOptions {
  addedMetadataBytes?: number;
  includePalettes?: boolean;
  opKind?: StructuralOpKind;
  affectedLayerIds?: string[];
  canvasWidth?: number;
  canvasHeight?: number;
  redoBufferCount?: number;
  addedLayerCount?: number;
  addedFrameCount?: number;
}

/**
 * Pushes a targeted structural history snapshot onto the active global history engine
 * before a structural mutation takes place.
 */
export function pushStructuralHistoryStep(
  description: string,
  options?: PushStructuralOptions
): boolean {
  const engine = getGlobalHistoryEngine();
  if (!engine) return true;

  const state = useStudioStore.getState();
  const affectedIds = options?.affectedLayerIds ?? [];
  const uniqueAffectedIds = [...new Set(affectedIds)].filter(hasBuffer);
  const width = options?.canvasWidth ?? state.canvasWidth;
  const height = options?.canvasHeight ?? state.canvasHeight;
  const metadataBytes = motionRigBytes(state.motionRigs) + state.frames.reduce((bytes, frame) => bytes + 256 + frame.layers.length * 256, 1024) +
    state.frames.reduce((bytes, frame) => bytes + frame.layers.reduce((sum, layer) => sum + researchBytes(layer.research), 0), 0) +
    state.clips.reduce((bytes, clip) => bytes + estimateClipBytes(clip), 0) +
    (options?.includePalettes ? state.palettes.reduce((bytes, palette) => bytes + estimatePaletteBytes(palette), 0) : 0);
  const rasterBytes = width * height * 4;
  const undoBytes = metadataBytes + uniqueAffectedIds.length * rasterBytes;
  const redoBytes = metadataBytes + (options?.addedMetadataBytes ?? 0) + (options?.addedLayerCount ?? 0) * 256 +
    (options?.addedFrameCount ?? 0) * 256 +
    (options?.redoBufferCount ?? uniqueAffectedIds.length) * rasterBytes;
  const estimatedBytes = Math.max(undoBytes, redoBytes);
  if (estimatedBytes > engine.maxBytes) {
    studioEvents.emit('pixibun:toast', {
      type: 'error',
      message: `This edit needs ${(estimatedBytes / (1024 * 1024)).toFixed(1)} MiB of Undo memory, above the ${(engine.maxBytes / (1024 * 1024)).toFixed(0)} MiB limit. The edit was not applied.`,
    });
    return false;
  }
  try {
    assertMemoryAvailable(estimatedBytes + (options?.addedLayerCount ?? 0) * rasterBytes, 'Structural edit snapshot and staging');
  } catch (error) {
    studioEvents.emit('pixibun:toast', { type: 'error', message: (error as Error).message });
    return false;
  }

  const step: StructuralHistoryStep = {
    type: 'structural',
    opKind: options?.opKind ?? 'generic-structural',
    description,
    frameIndex: state.activeFrameIndex,
    frames: structuredClone(state.frames),
    activeFrameIndex: state.activeFrameIndex,
    activeLayerId: state.activeLayerId,
    clips: structuredClone(state.clips),
    motionRigs: structuredClone(state.motionRigs),
    activeClipId: state.activeClipId,
    ...(options?.includePalettes ? { palettes: structuredClone(state.palettes), currentPaletteId: state.currentPaletteId } : {}),
    canvasWidth: width,
    canvasHeight: height,
    layerBuffers: captureLayerBuffers(uniqueAffectedIds),
    affectedLayerIds: affectedIds,
  };

  const depth = engine.push(step);
  state.setCanUndo(engine.canUndo);
  state.setCanRedo(engine.canRedo);
  return depth > 0;
}

export interface StructuralRestorationTarget {
  palettes?: ColorPalette[];
  currentPaletteId?: string;
  canvasWidth: number;
  canvasHeight: number;
  frames: AnimationFrame[];
  activeFrameIndex: number;
  activeLayerId?: string;
  clips?: AnimationClip[];
  motionRigs?: MotionRig[];
  activeClipId?: string | null;
  layerBuffers?: LayerBufferBackup[];
}

export function estimateRestorationAllocation(target: StructuralRestorationTarget): number {
  const state = useStudioStore.getState();
  const sizeChanged = target.canvasWidth !== state.canvasWidth || target.canvasHeight !== state.canvasHeight;
  const previous = snapshotBuffers();
  const backups = new Set(target.layerBuffers?.map(buffer => buffer.layerId));
  return target.frames.reduce((total, frame) => total + frame.layers.filter(layer =>
    backups.has(layer.id) || (previous.has(layer.id) && sizeChanged)).length, 0) * target.canvasWidth * target.canvasHeight * 4;
}

/**
 * Prevalidated structural workspace restoration for history transitions (undo/redo).
 *
 * Staged buffer resizing is necessary because history restoration
 * applies target dimensions and target frames simultaneously in a single transition.
 * Routing through `setCanvasSize` would incorrectly validate historical dimensions against
 * the pre-transition frames currently in the store rather than the historical target frames.
 */
export function restoreStructuralWorkspace(target: StructuralRestorationTarget): void {
  const state = useStudioStore.getState();
  const sizeChanged = target.canvasWidth !== state.canvasWidth || target.canvasHeight !== state.canvasHeight;
  const previous = snapshotBuffers();
  const staged = new Map<string, ReturnType<typeof createEntry>>();
  const backups = new Map(target.layerBuffers?.map(buf => [buf.layerId, buf.imageData]));
  const release = reserveMemory(estimateRestorationAllocation(target), 'History restoration staging');
  try {
    for (const frame of target.frames) {
      for (const layer of frame.layers) {
        const existing = previous.get(layer.id);
        const backup = backups.get(layer.id);
        if (!existing && !backup) continue; // Unpainted layers remain lazy.
        if (!sizeChanged && !backup && existing) {
          staged.set(layer.id, existing);
          continue;
        }
        const entry = createEntry(target.canvasWidth, target.canvasHeight, 1, true);
        if (backup) entry.ctx.putImageData(backup, 0, 0);
        else if (existing) entry.ctx.drawImage(existing.canvas,
          Math.floor((target.canvasWidth - existing.canvas.width) / 2),
          Math.floor((target.canvasHeight - existing.canvas.height) / 2));
        staged.set(layer.id, entry);
      }
    }
    // Publish pixels before metadata subscribers (autosave/co-draw) see the target tree.
    // History owns redo pixel copies, so removed live canvases need not stay resident.
    commitWorkspace(() => {
      replaceAllBuffers(staged);
      useStudioStore.setState({
        canvasWidth: target.canvasWidth,
        canvasHeight: target.canvasHeight,
        frames: target.frames,
        ...(target.motionRigs !== undefined ? { motionRigs: structuredClone(target.motionRigs) } : {}),
        ...(target.clips !== undefined ? { clips: structuredClone(target.clips) } : {}),
        ...(target.activeClipId !== undefined ? { activeClipId: target.activeClipId } : {}),
        ...(target.palettes !== undefined ? { palettes: structuredClone(target.palettes), currentPaletteId: target.currentPaletteId } : {}),
        activeFrameIndex: Math.min(target.activeFrameIndex, Math.max(0, target.frames.length - 1)),
        activeLayerId: target.activeLayerId,
      });
    });
  } finally { release(); }
}
