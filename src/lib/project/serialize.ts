// Bridge between live studio state (metadata in Zustand, pixels in the buffer
// registry) and the portable `.pixibun` ProjectFile format. Every byte of
// artwork passes through here for autosave, project export, and restore.

import { useStudioStore } from '@/stores/studioStore';
import {
  createEntry,
  replaceAllBuffers,
  snapshotBuffers,
  clearAllBuffers,
  getOrCreateBuffer,
  getBufferRevision,
  getBufferGeneration,
  type BufferEntry,
} from '@/lib/engine/bufferRegistry';
import {
  PROJECT_FORMAT_ID,
  PROJECT_FORMAT_VERSION,
  type ProjectFile,
  type SerializedLayer,
} from '@/types/project';
import type { StoredLayerBlob } from '@/lib/storage/db';
import { validateProjectFile } from '@/lib/project/schema';
import { ImageHeaderProbe } from '@/lib/safety/imageHeaderProbe';
import { studioEvents } from '@/lib/events/studioEvents';
import { reserveMemory } from '@/lib/safety/memoryBudget';
import { mapBounded, SerializationSupersededError } from '@/lib/safety/boundedWork';
import {
  isLayerDirty,
  getPersistedRevision,
  setPersistedRevision,
  commitPersistedRevisions,
  initProjectPersistedRevisions,
  clearPersistedRevisions,
  type PersistedLayerRevision,
} from './persistenceRevisions';

export {
  isLayerDirty,
  getPersistedRevision,
  setPersistedRevision,
  commitPersistedRevisions,
  initProjectPersistedRevisions,
  clearPersistedRevisions,
  type PersistedLayerRevision,
};

function requireBrowser(): void {
  if (typeof document === 'undefined') {
    throw new Error('Project serialization needs a browser environment.');
  }
}

/** Losslessly encodes one layer buffer to base64 PNG (no data-URL prefix). */
export function rasterizeLayerPng(layerId: string, width: number, height: number): string | undefined {
  requireBrowser();
  const hasContent = getOrCreateBuffer(layerId, width, height);
  const dataUrl = hasContent.canvas.toDataURL('image/png');
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  // An all-transparent layer still encodes to PNG; that is fine to keep.
  return base64;
}

/** Asynchronously encodes one layer buffer to base64 PNG using non-blocking toBlob. */
export async function rasterizeLayerPngAsync(layerId: string, width: number, height: number): Promise<string | undefined> {
  requireBrowser();
  const hasContent = getOrCreateBuffer(layerId, width, height);
  if (!hasContent || !hasContent.canvas) return undefined;

  return new Promise((resolve, reject) => {
    if (typeof hasContent.canvas.toBlob !== 'function') {
      return resolve(rasterizeLayerPng(layerId, width, height));
    }
    hasContent.canvas.toBlob((blob) => {
      if (!blob) {
        return reject(new Error('Layer encoding failed.'));
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result ? result.replace(/^data:image\/png;base64,/, '') : undefined;
        resolve(base64);
      };
      reader.onerror = () => {
        reject(new Error('Encoded layer could not be read.'));
      };
      reader.readAsDataURL(blob);
    }, 'image/png');
  });
}

/** Asynchronously encodes one layer buffer to a binary PNG Blob. */
export async function rasterizeLayerBlobAsync(layerId: string, width: number, height: number): Promise<Blob | undefined> {
  requireBrowser();
  const hasContent = getOrCreateBuffer(layerId, width, height);
  if (!hasContent || !hasContent.canvas) return undefined;

  return new Promise((resolve) => {
    if (typeof hasContent.canvas.toBlob !== 'function') {
      // Fallback: convert data URL to Blob
      try {
        const dataUrl = hasContent.canvas.toDataURL('image/png');
        const binStr = atob(dataUrl.split(',')[1]);
        const len = binStr.length;
        const arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          arr[i] = binStr.charCodeAt(i);
        }
        return resolve(new Blob([arr], { type: 'image/png' }));
      } catch {
        return resolve(undefined);
      }
    }
    hasContent.canvas.toBlob((blob) => {
      resolve(blob || undefined);
    }, 'image/png');
  });
}

export interface AutosavePayload {
  project: ProjectFile;
  layerBlobs: Array<{ layerId: string; frameIndex: number; blob: Blob }>;
  dirtyLayerCount: number;
  totalLayerCount: number;
  capturedRevisions: Map<string, PersistedLayerRevision>;
}

async function encodeProjectLayers(state: ReturnType<typeof useStudioStore.getState>, projectId?: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const plans = state.frames.flatMap((frame, frameIndex) => frame.layers.map(layer => {
    const entry = getOrCreateBuffer(layer.id, state.canvasWidth, state.canvasHeight);
    return { layer, frameIndex, revision: entry.contentRevision, generation: entry.generation,
      dirty: projectId === undefined || isLayerDirty(projectId, layer.id, entry.contentRevision, frameIndex) };
  }));
  const layerBlobs: AutosavePayload['layerBlobs'] = [];
  const capturedRevisions = new Map<string, PersistedLayerRevision>();
  const retained: Array<() => void> = [];
  try {
    const layers = await mapBounded(plans, async plan => {
      signal?.throwIfAborted();
      const { layer, frameIndex, revision, generation, dirty } = plan;
      let pngBase64: string | undefined;
      if (dirty) {
        // A queued layer must still belong to the original snapshot. Already
        // encoded layers may change: their captured revision keeps them dirty.
        if (getBufferRevision(layer.id) !== revision || getBufferGeneration(layer.id) !== generation) {
          throw new SerializationSupersededError();
        }
        const release = reserveMemory(state.canvasWidth * state.canvasHeight * 4 * (projectId === undefined ? 4 : 3) + 65536, 'Encoding project layer');
        try {
          if (projectId === undefined) {
            pngBase64 = await rasterizeLayerPngAsync(layer.id, state.canvasWidth, state.canvasHeight);
            if (!pngBase64) throw new Error('Layer encoding failed; project was not exported.');
            retained.push(reserveMemory(pngBase64.length * 2, 'Prepared project PNG'));
          } else {
            const blob = await rasterizeLayerBlobAsync(layer.id, state.canvasWidth, state.canvasHeight);
            if (!blob) throw new Error('Layer encoding failed; workspace was not saved.');
            retained.push(reserveMemory(blob.size, 'Prepared autosave PNG'));
            layerBlobs.push({ layerId: layer.id, frameIndex, blob });
            capturedRevisions.set(layer.id, { revision, generation, frameIndex });
          }
        } finally { release(); }
      } else if (projectId !== undefined) {
        const persisted = getPersistedRevision(projectId, layer.id);
        if (persisted) capturedRevisions.set(layer.id, { ...persisted });
      }
      return { id: layer.id, name: layer.name, visible: layer.visible, locked: layer.locked,
        opacity: layer.opacity, blendMode: layer.blendMode, tag: layer.tag,
        effect: layer.effect ? structuredClone(layer.effect) : undefined,
        research: layer.research ? structuredClone(layer.research) : undefined, pngBase64 } satisfies SerializedLayer;
    });
    signal?.throwIfAborted();
    let offset = 0;
    const frames = state.frames.map(frame => ({ id: frame.id, durationMs: frame.durationMs,
      layers: layers.slice(offset, offset += frame.layers.length) }));
    return { frames, layerBlobs, capturedRevisions, dirtyLayerCount: plans.filter(plan => plan.dirty).length, totalLayerCount: plans.length };
  } finally {
    // mapBounded drains native callbacks before releasing preparation ownership.
    // IndexedDB owns its byte-copy reservation once the payload is handed off.
    for (const release of retained) release();
  }
}

/**
 * Asynchronously snapshots studio metadata without base64 layer duplication,
 * extracting raw binary Blobs for direct IndexedDB layerBlobs storage.
 * Encodes Blobs only for dirty layers whose buffer revisions exceed persisted state.
 */
export async function buildAutosavePayloadAsync(projectId?: string): Promise<AutosavePayload> {
  const state = useStudioStore.getState();
  const projId = projectId || state.currentProjectId;
  const now = Date.now();
  const { frames, layerBlobs, capturedRevisions, dirtyLayerCount, totalLayerCount } = await encodeProjectLayers(state, projId);

  const project: ProjectFile = {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name: state.projectName,
    width: state.canvasWidth,
    height: state.canvasHeight,
    fps: state.fps,
    loopMode: state.loopMode,
    onionSkin: { ...state.onionSkin },
    palettes: structuredClone(state.palettes),
    currentPaletteId: state.currentPaletteId,
    customRamps: state.customRamps.map(r => ({ ...r, shades: [...r.shades] })),
    clips: state.clips.map(c => ({ ...c })),
    frames,
    createdAt: state.projectCreatedAt,
    updatedAt: now,
  };

  return { project, layerBlobs, dirtyLayerCount, totalLayerCount, capturedRevisions };
}

/** Snapshots the entire studio - metadata plus every layer's pixels - into a portable ProjectFile. */
export function buildProjectFile(): ProjectFile {
  const state = useStudioStore.getState();
  const now = Date.now();

  return {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name: state.projectName,
    width: state.canvasWidth,
    height: state.canvasHeight,
    fps: state.fps,
    loopMode: state.loopMode,
    onionSkin: { ...state.onionSkin },
    palettes: structuredClone(state.palettes),
    currentPaletteId: state.currentPaletteId,
    customRamps: state.customRamps.map(r => ({ ...r, shades: [...r.shades] })),
    clips: state.clips.map(c => ({ ...c })),
    frames: state.frames.map(frame => ({
      id: frame.id,
      durationMs: frame.durationMs,
      layers: frame.layers.map((layer): SerializedLayer => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        opacity: layer.opacity,
        blendMode: layer.blendMode,
        tag: layer.tag,
        effect: layer.effect ? structuredClone(layer.effect) : undefined,
            research: layer.research ? structuredClone(layer.research) : undefined,
        pngBase64: rasterizeLayerPng(layer.id, state.canvasWidth, state.canvasHeight),
      })),
    })),
    createdAt: state.projectCreatedAt,
    updatedAt: now,
  };
}

/** Asynchronously snapshots the entire studio with non-blocking layer rasterization. */
export async function buildProjectFileAsync(signal?: AbortSignal): Promise<ProjectFile> {
  const state = useStudioStore.getState();
  const now = Date.now();

  const { frames } = await encodeProjectLayers(state, undefined, signal);

  return {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name: state.projectName,
    width: state.canvasWidth,
    height: state.canvasHeight,
    fps: state.fps,
    loopMode: state.loopMode,
    onionSkin: { ...state.onionSkin },
    palettes: structuredClone(state.palettes),
    currentPaletteId: state.currentPaletteId,
    customRamps: state.customRamps.map(r => ({ ...r, shades: [...r.shades] })),
    clips: state.clips.map(c => ({ ...c })),
    frames,
    createdAt: state.projectCreatedAt,
    updatedAt: now,
  };
}

/**
 * Renders a lightweight downscaled composite thumbnail PNG data-URL from visible layers
 * of the active frame. Used by autosave to populate the Projects Gallery without re-decoding.
 */
export function generateCompositeThumbnail(maxWidth = 128, maxHeight = 128): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const state = useStudioStore.getState();
  const currentFrame = state.frames[state.activeFrameIndex] || state.frames[0];
  if (!currentFrame) return undefined;

  const w = state.canvasWidth;
  const h = state.canvasHeight;
  if (w <= 0 || h <= 0) return undefined;

  const scale = Math.min(maxWidth / w, maxHeight / h, 1);
  const targetW = Math.max(1, Math.round(w * scale));
  const targetH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;

  ctx.imageSmoothingEnabled = false;

  currentFrame.layers.slice().reverse().forEach((layer) => {
    if (!layer.visible) return;
    const entry = getOrCreateBuffer(layer.id, w, h);
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode;
    ctx.drawImage(entry.canvas, 0, 0, targetW, targetH);
  });

  return canvas.toDataURL('image/png');
}

function base64ToBlob(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'image/png' });
}

/** Decode and validate off to the side; publish only a complete project. */
export async function hydrateProject(
  file: ProjectFile,
  projectId?: string,
  layerBlobs?: readonly StoredLayerBlob[] | StoredLayerBlob[],
  canPublish: () => boolean = () => true
): Promise<void> {
  requireBrowser();
  const result = validateProjectFile(file);
  if (!result.ok) throw new Error(result.error);
  file = result.value;
  const staged = new Map<string, BufferEntry>();
  const blobMap = new Map((layerBlobs ?? []).map(b => [b.layerId + ':' + b.frameIndex, b.blob]));
  const activeInitialLayerId = file.frames[0]?.layers[0]?.id;
  const rasterCount = file.frames.reduce((count, frame, index) => count + frame.layers.filter(layer =>
    blobMap.has(layer.id + ':' + index) || layer.pngBase64 || layer.id === activeInitialLayerId).length, 0);
  // Include the largest decoded bitmap alongside the staged canvases and old workspace.
  const release = reserveMemory((rasterCount + 1) * file.width * file.height * 4, 'Project hydration staging');
  try {

    for (const [frameIndex, frame] of file.frames.entries()) {
      for (const layer of frame.layers) {
        const blob = blobMap.get(layer.id + ':' + frameIndex) ??
          (layer.pngBase64 ? base64ToBlob(layer.pngBase64) : undefined);
        if (blob) {
          const entry = createEntry(file.width, file.height, 1, true);
          const dimensions = await ImageHeaderProbe.probe(blob);
          if (dimensions.width !== file.width || dimensions.height !== file.height) {
            throw new Error('Layer dimensions do not match the project canvas.');
          }
          const bitmap = await createImageBitmap(blob);
          try { entry.ctx.drawImage(bitmap, 0, 0); } finally { bitmap.close(); }
          staged.set(layer.id, entry);
        } else if (layer.id === activeInitialLayerId) {
          // Guarantee active initial layer always has an allocated buffer ready
          staged.set(layer.id, createEntry(file.width, file.height, 1, true));
        }
      }
    }
    if (!canPublish()) throw new Error('The workspace changed while the project was loading.');
    // Hydration is synchronous from here; validation and every decode already succeeded.
    // Publish pixels before notifying store subscribers (including co-draw),
    // Snapshot both buffer registry and store state before publication.
    // If store publication, subscriber notifications, or event emissions throw,
    // we roll back both buffers and store state to ensure the workspace never enters
    // a split-brain state (e.g. Project B store metadata with Project A buffers).
    const previousBuffers = snapshotBuffers();
    const prevState = useStudioStore.getState();
    const previousProjectId = prevState.currentProjectId;
    const previousProjectSnapshot: Partial<ProjectFile> = {
      createdAt: prevState.projectCreatedAt,
      name: prevState.projectName,
      width: prevState.canvasWidth,
      height: prevState.canvasHeight,
      fps: prevState.fps,
      loopMode: prevState.loopMode,
      onionSkin: { ...prevState.onionSkin },
      customRamps: prevState.customRamps ? prevState.customRamps.map(r => ({ ...r, shades: [...r.shades] })) : [],
      frames: prevState.frames ? prevState.frames.map(f => ({
        id: f.id,
        durationMs: f.durationMs,
        layers: f.layers.map(l => ({ ...l })),
      })) : [],
      palettes: prevState.palettes ? structuredClone(prevState.palettes) : [],
      currentPaletteId: prevState.currentPaletteId,
      clips: prevState.clips ? prevState.clips.map(c => ({ ...c })) : [],
    };
    const prevActiveFrameIndex = prevState.activeFrameIndex;
    const prevActiveLayerId = prevState.activeLayerId;

    try {
      replaceAllBuffers(staged);
      useStudioStore.getState().loadProjectState(file, projectId);
      useStudioStore.getState().bumpBufferVersion();
      studioEvents.emit('pixibun:history-clear');
    } catch (publishErr) {
      // Two-phase consistent rollback: restore both buffer registry and store state
      replaceAllBuffers(previousBuffers);
      try {
        useStudioStore.getState().loadProjectState(previousProjectSnapshot, previousProjectId);
        useStudioStore.setState(s => {
          s.activeFrameIndex = prevActiveFrameIndex;
          s.activeLayerId = prevActiveLayerId;
        });
        useStudioStore.getState().bumpBufferVersion();
      } catch {
        // If rolling back to previous project state fails, place workspace in a defined safe reset state
        try {
          useStudioStore.getState().resetToNewProject();
        } catch {
          clearAllBuffers();
        }
      }
      throw publishErr;
    }

    if (projectId) {
      const persisted = new Map<string, PersistedLayerRevision>();
      for (const [frameIndex, frame] of file.frames.entries()) {
        for (const layer of frame.layers) {
          const hasStoredData = blobMap.has(layer.id + ':' + frameIndex) || !!layer.pngBase64;
          if (hasStoredData) {
            persisted.set(layer.id, { revision: 1, frameIndex, generation: getBufferGeneration(layer.id) });
          }
        }
      }
      initProjectPersistedRevisions(projectId, persisted);
    }
    useStudioStore.getState().setSaveStatus(projectId ? 'saved' : 'idle');
  } finally { release(); }
}
