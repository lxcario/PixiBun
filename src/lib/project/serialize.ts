// Bridge between live studio state (metadata in Zustand, pixels in the buffer
// registry) and the portable `.pixibun` ProjectFile format. Every byte of
// artwork passes through here for autosave, project export, and restore.

import { useStudioStore } from '@/stores/studioStore';
import { createEntry, replaceAllBuffers, getOrCreateBuffer, type BufferEntry } from '@/lib/engine/bufferRegistry';
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
          if (!blob) throw new Error('Layer encoding failed; workspace was not saved.');
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
            tag: layer.tag,
            effect: layer.effect ? structuredClone(layer.effect) : undefined,
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
        tag: layer.tag,
        effect: layer.effect ? structuredClone(layer.effect) : undefined,
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
            tag: layer.tag,
            effect: layer.effect ? structuredClone(layer.effect) : undefined,
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

/** Decode and validate off to the side; publish only a complete project. */
export async function hydrateProject(
  file: ProjectFile,
  projectId?: string,
  layerBlobs?: StoredLayerBlob[],
  canPublish: () => boolean = () => true
): Promise<void> {
  requireBrowser();
  const result = validateProjectFile(file);
  if (!result.ok) throw new Error(result.error);
  file = result.value;
  const staged = new Map<string, BufferEntry>();
  const blobMap = new Map((layerBlobs ?? []).map(b => [b.layerId + ':' + b.frameIndex, b.blob]));
  for (const [frameIndex, frame] of file.frames.entries()) {
    for (const layer of frame.layers) {
      const blob = blobMap.get(layer.id + ':' + frameIndex) ??
        (layer.pngBase64 ? base64ToBlob(layer.pngBase64) : undefined);
      const entry = createEntry(file.width, file.height);
      if (blob) {
        const dimensions = await ImageHeaderProbe.probe(blob);
        if (dimensions.width !== file.width || dimensions.height !== file.height) {
          throw new Error('Layer dimensions do not match the project canvas.');
        }
        const bitmap = await createImageBitmap(blob);
        try { entry.ctx.drawImage(bitmap, 0, 0); } finally { bitmap.close(); }
      }
      staged.set(layer.id, entry);
    }
  }
  if (!canPublish()) throw new Error('The workspace changed while the project was loading.');
  // Hydration is synchronous from here; validation and every decode already succeeded.
  // Publish pixels before notifying store subscribers (including co-draw),
  // so observers of the new metadata always see the matching decoded artwork.
  replaceAllBuffers(staged);
  useStudioStore.getState().loadProjectState(file, projectId);
  useStudioStore.getState().bumpBufferVersion();
  studioEvents.emit('pixibun:history-clear');
}
