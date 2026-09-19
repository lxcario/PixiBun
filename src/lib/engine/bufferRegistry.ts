// Engine-level pixel buffer registry.
//
// Layer bitmaps previously lived in a React ref inside CenterViewport, which
// made them unserializable (autosave and .pixibun export stored empty
// metadata), wiped on remount, and unclonable when duplicating frames or
// layers. This module is the single owner of offscreen layer canvases so the
// store can clone/delete/serialize them deterministically.

import type { AnchorPosition } from '@/components/modals/CanvasResizeModal';

export interface BufferEntry {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

const buffers = new Map<string, BufferEntry>();

export function createEntry(width: number, height: number): BufferEntry {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not acquire a 2D context for a layer buffer.');
  }
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/** Returns the buffer for a layer, creating a blank one (or resizing in place, content preserved top-left) on demand. */
export function getOrCreateBuffer(layerId: string, width: number, height: number): BufferEntry {
  const existing = buffers.get(layerId);
  if (!existing) {
    const entry = createEntry(width, height);
    buffers.set(layerId, entry);
    return entry;
  }
  const { canvas } = existing;
  if (canvas.width !== width || canvas.height !== height) {
    const previous = document.createElement('canvas');
    previous.width = canvas.width;
    previous.height = canvas.height;
    previous.getContext('2d')?.drawImage(canvas, 0, 0);

    canvas.width = width;
    canvas.height = height;
    existing.ctx.imageSmoothingEnabled = false;
    existing.ctx.drawImage(previous, 0, 0);
  }
  return existing;
}

export function hasBuffer(layerId: string): boolean {
  return buffers.has(layerId);
}

/**
 * Copies pixel content from source layer buffers into destination layer
 * buffers. Used when duplicating layers or frames so copies carry real
 * artwork instead of inheriting an empty canvas.
 */
export function cloneBuffers(srcLayerIds: string[], dstLayerIds: string[], width: number, height: number): void {
  const count = Math.min(srcLayerIds.length, dstLayerIds.length);
  for (let i = 0; i < count; i++) {
    const src = buffers.get(srcLayerIds[i]);
    const dst = getOrCreateBuffer(dstLayerIds[i], width, height);
    dst.ctx.imageSmoothingEnabled = false;
    dst.ctx.clearRect(0, 0, width, height);
    if (src) {
      dst.ctx.drawImage(src.canvas, 0, 0);
    }
  }
}

export function deleteBuffers(layerIds: string[]): void {
  for (const id of layerIds) {
    buffers.delete(id);
  }
}

export function clearAllBuffers(): void {
  buffers.clear();
}

/** Publish a fully decoded project without exposing partially loaded layers. */
export function replaceAllBuffers(entries: Map<string, BufferEntry>): void {
  buffers.clear();
  for (const [id, entry] of entries) buffers.set(id, entry);
}

function anchorOffsets(
  anchor: AnchorPosition,
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number
): { offsetX: number; offsetY: number } {
  const half = (value: number) => Math.floor(value / 2);
  switch (anchor) {
    case 'top-left': return { offsetX: 0, offsetY: 0 };
    case 'top-center': return { offsetX: half(newWidth - oldWidth), offsetY: 0 };
    case 'top-right': return { offsetX: newWidth - oldWidth, offsetY: 0 };
    case 'middle-left': return { offsetX: 0, offsetY: half(newHeight - oldHeight) };
    case 'center': return { offsetX: half(newWidth - oldWidth), offsetY: half(newHeight - oldHeight) };
    case 'middle-right': return { offsetX: newWidth - oldWidth, offsetY: half(newHeight - oldHeight) };
    case 'bottom-left': return { offsetX: 0, offsetY: newHeight - oldHeight };
    case 'bottom-center': return { offsetX: half(newWidth - oldWidth), offsetY: newHeight - oldHeight };
    case 'bottom-right': return { offsetX: newWidth - oldWidth, offsetY: newHeight - oldHeight };
  }
}

export function resamplePixelArtBuffer(
  srcCanvas: HTMLCanvasElement,
  dstCtx: CanvasRenderingContext2D,
  newWidth: number,
  newHeight: number
): void {
  const oldWidth = srcCanvas.width;
  const oldHeight = srcCanvas.height;
  if (oldWidth === 0 || oldHeight === 0 || newWidth === 0 || newHeight === 0) return;

  // When upscaling both axes, crisp nearest-neighbor drawImage is exact and immediate
  if (newWidth >= oldWidth && newHeight >= oldHeight) {
    dstCtx.imageSmoothingEnabled = false;
    dstCtx.drawImage(srcCanvas, 0, 0, newWidth, newHeight);
    return;
  }

  // When downscaling, naive drawImage skips odd coordinates and perforates 1px strokes.
  // Area-preserving downsampling with presence conservation prevents line dropouts.
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) {
    dstCtx.drawImage(srcCanvas, 0, 0, newWidth, newHeight);
    return;
  }

  const srcData = srcCtx.getImageData(0, 0, oldWidth, oldHeight).data;
  const dstImgData = dstCtx.createImageData(newWidth, newHeight);
  const dstData = dstImgData.data;

  const scaleX = oldWidth / newWidth;
  const scaleY = oldHeight / newHeight;

  for (let y = 0; y < newHeight; y++) {
    const y0 = Math.floor(y * scaleY);
    const y1 = Math.min(oldHeight, Math.ceil((y + 1) * scaleY));

    for (let x = 0; x < newWidth; x++) {
      const x0 = Math.floor(x * scaleX);
      const x1 = Math.min(oldWidth, Math.ceil((x + 1) * scaleX));

      // Scan source footprint [x0, x1) x [y0, y1)
      const colorVotes = new Map<number, { r: number; g: number; b: number; a: number; count: number }>();
      let solidCount = 0;

      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const sIdx = (sy * oldWidth + sx) * 4;
          const a = srcData[sIdx + 3];
          if (a > 32) {
            solidCount++;
            const r = srcData[sIdx];
            const g = srcData[sIdx + 1];
            const b = srcData[sIdx + 2];
            const key = (r << 24) | (g << 16) | (b << 8) | a;
            const entry = colorVotes.get(key);
            if (entry) {
              entry.count++;
            } else {
              colorVotes.set(key, { r, g, b, a, count: 1 });
            }
          }
        }
      }

      const dIdx = (y * newWidth + x) * 4;
      // Presence conservation: Any solid stroke in the cell guarantees a solid pixel
      if (solidCount > 0 && colorVotes.size > 0) {
        let bestVote = 0;
        let bestColor = { r: 0, g: 0, b: 0, a: 255 };
        for (const v of colorVotes.values()) {
          if (v.count > bestVote) {
            bestVote = v.count;
            bestColor = v;
          }
        }
        dstData[dIdx] = bestColor.r;
        dstData[dIdx + 1] = bestColor.g;
        dstData[dIdx + 2] = bestColor.b;
        dstData[dIdx + 3] = bestColor.a;
      }
    }
  }

  dstCtx.putImageData(dstImgData, 0, 0);
}

/**
 * Resizes every buffer, honoring the user's anchor choice. With resample the
 * content scales into the new bounds; otherwise it shifts per the anchor
 * (cropping overflow, revealing transparent padding).
 */
export function resizeAllBuffers(
  newWidth: number,
  newHeight: number,
  anchor: AnchorPosition,
  resample: boolean
): void {
  for (const [layerId, entry] of buffers) {
    const oldWidth = entry.canvas.width;
    const oldHeight = entry.canvas.height;
    if (oldWidth === newWidth && oldHeight === newHeight) continue;

    const next = createEntry(newWidth, newHeight);
    next.ctx.imageSmoothingEnabled = false;

    if (resample) {
      resamplePixelArtBuffer(entry.canvas, next.ctx, newWidth, newHeight);
    } else {
      const { offsetX, offsetY } = anchorOffsets(anchor, oldWidth, oldHeight, newWidth, newHeight);
      next.ctx.drawImage(entry.canvas, offsetX, offsetY);
    }

    buffers.set(layerId, next);
  }
}

/** Exposed for tests and serialization diagnostics. */
export function bufferCount(): number {
  return buffers.size;
}
