// Bridge between live studio state (metadata in Zustand, pixels in the buffer
// registry) and the portable `.pixibun` ProjectFile format. Every byte of
// artwork passes through here for autosave, project export, and restore.

import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import {
  PROJECT_FORMAT_ID,
  PROJECT_FORMAT_VERSION,
  type ProjectFile,
  type SerializedLayer,
} from '@/types/project';
import type { StoredLayerBlob } from '@/lib/storage/db';
import { studioEvents } from '@/lib/events/studioEvents';

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

  return new Promise((resolve) => {
    hasContent.canvas.toBlob((blob) => {
      if (!blob) {
        // Fallback to sync if blob fails
        return resolve(rasterizeLayerPng(layerId, width, height));
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result ? result.replace(/^data:image\/png;base64,/, '') : undefined;
        resolve(base64);
      };
      reader.onerror = () => {
        resolve(rasterizeLayerPng(layerId, width, height));
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
    hasContent.canvas.toBlob((blob) => {
      resolve(blob || undefined);
    }, 'image/png');
  });
}

export interface AutosavePayload {
  project: ProjectFile;
  layerBlobs: Array<{ layerId: string; frameIndex: number; blob: Blob }>;
}

/**
 * Asynchronously snapshots studio metadata without base64 layer duplication,
 * extracting raw binary Blobs for direct IndexedDB layerBlobs storage.
 */
export async function buildAutosavePayloadAsync(): Promise<AutosavePayload> {
  const state = useStudioStore.getState();
  const now = Date.now();
  const layerBlobs: Array<{ layerId: string; frameIndex: number; blob: Blob }> = [];

  const frames = await Promise.all(
    state.frames.map(async (frame, frameIndex) => {
      const layers = await Promise.all(
        frame.layers.map(async (layer): Promise<SerializedLayer> => {
          const blob = await rasterizeLayerBlobAsync(layer.id, state.canvasWidth, state.canvasHeight);
          if (blob) {
            layerBlobs.push({
              layerId: layer.id,
              frameIndex,
              blob,
            });
          }
          return {
            id: layer.id,
            name: layer.name,
            visible: layer.visible,
            locked: layer.locked,
            opacity: layer.opacity,
            blendMode: layer.blendMode,
            // Omit pngBase64 in metadata payload when storing binary blobs to prevent double-storage
            pngBase64: undefined,
          };
        })
      );
      return {
        id: frame.id,
        durationMs: frame.durationMs,
        layers,
      };
    })
  );

  const project: ProjectFile = {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name: state.projectName,
    width: state.canvasWidth,
    height: state.canvasHeight,
    fps: state.fps,
    loopMode: state.loopMode,
    onionSkin: { ...state.onionSkin },
    palettes: state.palettes.map(p => ({ ...p, colors: [...p.colors] })),
    currentPaletteId: state.currentPaletteId,
    customRamps: state.customRamps.map(r => ({ ...r, shades: [...r.shades] })),
    clips: state.clips.map(c => ({ ...c })),
    frames,
    createdAt: now,
    updatedAt: now,
  };

  return { project, layerBlobs };
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
    palettes: state.palettes.map(p => ({ ...p, colors: [...p.colors] })),
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
        pngBase64: rasterizeLayerPng(layer.id, state.canvasWidth, state.canvasHeight),
      })),
    })),
    createdAt: now,
    updatedAt: now,
  };
}

/** Asynchronously snapshots the entire studio with non-blocking layer rasterization. */
export async function buildProjectFileAsync(): Promise<ProjectFile> {
  const state = useStudioStore.getState();
  const now = Date.now();

  const frames = await Promise.all(
    state.frames.map(async (frame) => {
      const layers = await Promise.all(
        frame.layers.map(async (layer): Promise<SerializedLayer> => {
          const pngBase64 = await rasterizeLayerPngAsync(layer.id, state.canvasWidth, state.canvasHeight);
          return {
            id: layer.id,
            name: layer.name,
            visible: layer.visible,
            locked: layer.locked,
            opacity: layer.opacity,
            blendMode: layer.blendMode,
            pngBase64,
          };
        })
      );
      return {
        id: frame.id,
        durationMs: frame.durationMs,
        layers,
      };
    })
  );

  return {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name: state.projectName,
    width: state.canvasWidth,
    height: state.canvasHeight,
    fps: state.fps,
    loopMode: state.loopMode,
    onionSkin: { ...state.onionSkin },
    palettes: state.palettes.map(p => ({ ...p, colors: [...p.colors] })),
    currentPaletteId: state.currentPaletteId,
    customRamps: state.customRamps.map(r => ({ ...r, shades: [...r.shades] })),
    clips: state.clips.map(c => ({ ...c })),
    frames,
    createdAt: now,
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

async function paintLayerFromPng(layerId: string, pngBase64: string, width: number, height: number): Promise<void> {
  const entry = getOrCreateBuffer(layerId, width, height);
  const bitmap = await createImageBitmap(base64ToBlob(pngBase64));
  try {
    entry.ctx.imageSmoothingEnabled = false;
    entry.ctx.clearRect(0, 0, width, height);
    entry.ctx.drawImage(bitmap, 0, 0);
  } finally {
    bitmap.close();
  }
}

async function paintLayerFromBlob(layerId: string, blob: Blob, width: number, height: number): Promise<void> {
  const entry = getOrCreateBuffer(layerId, width, height);
  const bitmap = await createImageBitmap(blob);
  try {
    entry.ctx.imageSmoothingEnabled = false;
    entry.ctx.clearRect(0, 0, width, height);
    entry.ctx.drawImage(bitmap, 0, 0);
  } finally {
    bitmap.close();
  }
}

/**
 * Rebuilds the whole studio from a validated ProjectFile: decodes every layer
 * from binary Blobs (or legacy PNG base64 fallback) back into fresh buffers,
 * then rehydrates store metadata. Assumes the file already passed `validateProjectFile`.
 */
export async function hydrateProject(
  file: ProjectFile,
  projectId?: string,
  layerBlobs?: StoredLayerBlob[]
): Promise<void> {
  requireBrowser();
  clearAllBuffers();

  const blobMap = new Map<string, Blob>();
  if (layerBlobs && layerBlobs.length > 0) {
    for (const lb of layerBlobs) {
      blobMap.set(`${lb.layerId}_${lb.frameIndex}`, lb.blob);
      blobMap.set(lb.layerId, lb.blob);
    }
  }

  for (let frameIndex = 0; frameIndex < file.frames.length; frameIndex++) {
    const frame = file.frames[frameIndex];
    for (const layer of frame.layers) {
      const blob = blobMap.get(`${layer.id}_${frameIndex}`) || blobMap.get(layer.id);
      if (blob) {
        try {
          await paintLayerFromBlob(layer.id, blob, file.width, file.height);
          continue;
        } catch (err) {
          console.error(`Layer "${layer.name}" could not be painted from Blob. Falling back to base64.`, err);
        }
      }

      if (layer.pngBase64) {
        try {
          await paintLayerFromPng(layer.id, layer.pngBase64, file.width, file.height);
        } catch (err) {
          // One unreadable layer should not sink the whole restore.
          console.error(`Layer "${layer.name}" could not be decoded during restore.`, err);
        }
      }
    }
  }

  const { loadProjectState } = useStudioStore.getState();
  loadProjectState(file, projectId);

  // Invalidate history stack across project boundary to prevent cross-project undo corruption
  studioEvents.emit('pixibun:history-clear');
}
