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

function createEntry(width: number, height: number): BufferEntry {
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
      next.ctx.drawImage(entry.canvas, 0, 0, newWidth, newHeight);
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
