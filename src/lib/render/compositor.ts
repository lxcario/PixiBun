// Single source of visual truth for "what a frame looks like": bottom-up
// layer compositing honoring visibility, opacity, and blend modes. Deliberately
// pure and overlay-free - no onion skins, grid, or selection marquee ever
// leak into what the eyedropper samples or what exporters write to disk.
//
// Milestone 2 migrates the viewport renderer itself onto this module; today
// it already feeds every export path so exported files can never contain
// editor chrome.

import type { AnimationFrame } from '@/types/canvas';
import { getOrCreateBuffer } from '@/lib/engine/bufferRegistry';

export interface CompositeOptions {
  /** Include hidden layers (used by flatten-style exports). Default false. */
  includeInvisible?: boolean;
  /** If true, always allocates a fresh HTMLCanvasElement instance rather than using the pooled singleton. */
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
    (options.freshCanvas
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
    const buffer = getOrCreateBuffer(layer.id, width, height);
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode;
    ctx.drawImage(buffer.canvas, 0, 0);
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return out;
}
