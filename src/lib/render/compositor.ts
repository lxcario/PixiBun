// Single source of visual truth for "what a frame looks like": bottom-up
// layer compositing honoring visibility, opacity, and blend modes. Deliberately
// overlay-free - no onion skins, grid, or selection marquee ever
// leak into what the eyedropper samples or what exporters write to disk.
//
// Reads DOM canvases and the raster registry. Fresh output is the default;
// callers retaining frames must not opt into the shared mutable canvas.

import type { AnimationFrame } from '@/types/canvas';
import { getOrCreateBuffer, hasBuffer } from '@/lib/engine/bufferRegistry';

export interface CompositeOptions {
  /** Include hidden layers (used by flatten-style exports). Default false. */
  includeInvisible?: boolean;
  /** Defaults true. False reuses a shared canvas whose contents change on the next call. A targetCanvas takes precedence. */
  freshCanvas?: boolean;
}

let sharedOffscreenCanvas: HTMLCanvasElement | null = null;

export function compositeFrame(
  frames: AnimationFrame[],
  frameIndex: number,
  width: number,
  height: number,
  options: CompositeOptions = {},
  targetCanvas?: HTMLCanvasElement
): HTMLCanvasElement | null {
  const frame = frames[frameIndex];
  if (!frame || typeof document === 'undefined') return null;

  const out =
    targetCanvas ||
    (options.freshCanvas ?? true
      ? document.createElement('canvas')
      : sharedOffscreenCanvas ?? (sharedOffscreenCanvas = document.createElement('canvas')));
  if (out.width !== width || out.height !== height) {
    out.width = width;
    out.height = height;
  }
  const ctx = out.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;

  for (const layer of frame.layers.slice().reverse()) {
    if (!layer.visible && !options.includeInvisible) continue;
    if (!hasBuffer(layer.id)) continue;
    const buffer = getOrCreateBuffer(layer.id, width, height);
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode;
    ctx.drawImage(buffer.canvas, 0, 0);
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return out;
}
