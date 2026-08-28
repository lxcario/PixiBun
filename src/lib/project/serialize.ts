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

/**
 * Rebuilds the whole studio from a validated ProjectFile: decodes every layer
 * PNG back into fresh buffers, then rehydrates store metadata. Assumes the
 * file already passed `validateProjectFile`.
 */
export async function hydrateProject(file: ProjectFile): Promise<void> {
  requireBrowser();
  clearAllBuffers();

  for (const frame of file.frames) {
    for (const layer of frame.layers) {
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
  loadProjectState(file);
}
