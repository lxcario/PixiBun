// Composite cache for the stroke in progress.
//
// While painting, only the active layer changes, yet compositeFrame redrew
// every visible layer for every stamp. This cache keeps the layers below the
// active one flattened into one canvas, and the layers above it into another
// when that cannot change a single pixel, so a stamp costs at most three draws
// plus one per layer above that has to stay live.
//
// Layers below always flatten exactly: drawing them in order onto a clear
// canvas is the same work compositeFrame does, and copying that canvas onto a
// clear target changes nothing.
//
// Layers above flatten only when every one of them is source-over at full
// opacity and each pixel is fully opaque or fully clear. Porter-Duff "over" is
// associative in exact arithmetic, but canvases store 8-bit values, so
// grouping semi-transparent layers rounds differently (a channel or two out
// of 255). With only opaque or clear pixels "over" is plain replacement and
// the grouping is exact. Multiply, screen, overlay, color-dodge and "On
// artwork only" (source-atop) read what is underneath, including the active
// layer, so layers like that are always drawn live.
//
// The cache key holds each cached layer's id, opacity, blend mode and buffer
// revision, plus the frame, the active layer and the canvas size, so a change
// to any of them rebuilds on the next stamp. Callers drop the cache when the
// stroke ends.

import type { AnimationFrame, Layer } from '@/types/canvas';
import { getBufferGeneration, getBufferRevision, getOrCreateBuffer, hasBuffer } from '@/lib/engine/bufferRegistry';
import { compositeFrame } from '@/lib/render/compositor';

/** Larger layers are not scanned for partial alpha; their layers above stay live. */
export const MAX_ALPHA_SCAN_PIXELS = 1024 * 1024;

/** Visible layers with pixels, split around the active layer, each list bottom to top. */
export interface StrokeLayerSplit {
  below: Layer[];
  active: Layer | null;
  above: Layer[];
  /** Every layer above is source-over at full opacity; flattening still needs opaque-or-clear pixels. */
  aboveMayFlatten: boolean;
}

/** Splits a frame's drawable layers around the active layer; null when it is not in the frame. */
export function splitLayersForStroke(frame: AnimationFrame, activeLayerId: string): StrokeLayerSplit | null {
  // frame.layers lists the top layer first.
  const activeIndex = frame.layers.findIndex((layer) => layer.id === activeLayerId);
  if (activeIndex < 0) return null;
  const drawable = (layer: Layer) => layer.visible && hasBuffer(layer.id);
  const below = frame.layers.slice(activeIndex + 1).filter(drawable).reverse();
  const above = frame.layers.slice(0, activeIndex).filter(drawable).reverse();
  const activeLayer = frame.layers[activeIndex];
  return {
    below,
    active: drawable(activeLayer) ? activeLayer : null,
    above,
    aboveMayFlatten: above.every((layer) => layer.blendMode === 'source-over' && layer.opacity === 1),
  };
}

function bufferStamp(layerId: string): string {
  return `${getBufferGeneration(layerId)}:${getBufferRevision(layerId)}`;
}

// Whether each scanned layer buffer holds only opaque or clear pixels, by buffer stamp.
const binaryAlphaScans = new Map<string, { stamp: string; binary: boolean }>();

/** True when every pixel of the layer is fully opaque or fully clear. */
export function hasBinaryAlpha(layerId: string, width: number, height: number): boolean {
  if (width * height > MAX_ALPHA_SCAN_PIXELS) return false;
  const stamp = bufferStamp(layerId);
  const known = binaryAlphaScans.get(layerId);
  if (known?.stamp === stamp) return known.binary;
  const data = getOrCreateBuffer(layerId, width, height).ctx.getImageData(0, 0, width, height).data;
  let binary = true;
  for (let i = 3; i < data.length; i += 4) {
    const alpha = data[i];
    if (alpha !== 0 && alpha !== 255) {
      binary = false;
      break;
    }
  }
  binaryAlphaScans.set(layerId, { stamp, binary });
  return binary;
}

function groupKey(layers: Layer[]): string {
  return layers.map((layer) => `${layer.id}:${layer.opacity}:${layer.blendMode}:${bufferStamp(layer.id)}`).join('|');
}

function drawLayers(ctx: CanvasRenderingContext2D, layers: Layer[], width: number, height: number): void {
  for (const layer of layers) {
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode;
    ctx.drawImage(getOrCreateBuffer(layer.id, width, height).canvas, 0, 0);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

interface Group {
  canvas: HTMLCanvasElement | null;
  key: string | null;
}

export interface StrokeCompositeStats {
  /** Times a flattened group was redrawn from its layers. */
  rebuilds: number;
  /** Composites served from the cache. */
  cachedComposites: number;
  /** Composites that drew every layer, as compositeFrame does. */
  fullComposites: number;
}

export interface StrokeCompositeCache {
  /**
   * Draws the frame onto target with the same pixels compositeFrame produces,
   * reusing the flattened layers around activeLayerId. Returns false when it
   * drew every layer instead.
   */
  composite(
    frames: AnimationFrame[],
    frameIndex: number,
    activeLayerId: string,
    width: number,
    height: number,
    target: HTMLCanvasElement
  ): boolean;
  /** Forgets the flattened layers; the next composite rebuilds them. */
  invalidate(): void;
  readonly stats: StrokeCompositeStats;
}

export function createStrokeCompositeCache(): StrokeCompositeCache {
  const below: Group = { canvas: null, key: null };
  const above: Group = { canvas: null, key: null };
  const stats: StrokeCompositeStats = { rebuilds: 0, cachedComposites: 0, fullComposites: 0 };

  const flattened = (group: Group, layers: Layer[], key: string, width: number, height: number) => {
    if (group.key === key && group.canvas) return group.canvas;
    const canvas = group.canvas ?? document.createElement('canvas');
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    // Software-backed like the layer buffers and the viewport canvas, so drawing
    // between them never reads pixels back from the GPU.
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;
    drawLayers(ctx, layers, width, height);
    group.canvas = canvas;
    group.key = key;
    stats.rebuilds += 1;
    return canvas;
  };

  const full = (frames: AnimationFrame[], frameIndex: number, width: number, height: number, target: HTMLCanvasElement) => {
    stats.fullComposites += 1;
    compositeFrame(frames, frameIndex, width, height, {}, target);
    return false;
  };

  return {
    stats,
    invalidate() {
      below.key = null;
      above.key = null;
    },
    composite(frames, frameIndex, activeLayerId, width, height, target) {
      const frame = frames[frameIndex];
      if (!frame || typeof document === 'undefined') return full(frames, frameIndex, width, height, target);
      const split = splitLayersForStroke(frame, activeLayerId);
      if (!split) return full(frames, frameIndex, width, height, target);
      const flattenAbove = split.above.length > 0 && split.aboveMayFlatten
        && split.above.every((layer) => hasBinaryAlpha(layer.id, width, height));
      // Nothing to reuse: no layers below, and the layers above stay live.
      if (split.below.length === 0 && !flattenAbove) return full(frames, frameIndex, width, height, target);

      const prefix = `${width}x${height}#${frameIndex}#${activeLayerId}#`;
      const belowCanvas = split.below.length > 0
        ? flattened(below, split.below, prefix + groupKey(split.below), width, height) : null;
      const aboveCanvas = flattenAbove ? flattened(above, split.above, prefix + groupKey(split.above), width, height) : null;
      const ctx = target.getContext('2d');
      if ((split.below.length > 0 && !belowCanvas) || (flattenAbove && !aboveCanvas) || !ctx) {
        return full(frames, frameIndex, width, height, target);
      }

      if (target.width !== width || target.height !== height) {
        target.width = width;
        target.height = height;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (belowCanvas) ctx.drawImage(belowCanvas, 0, 0);
      if (split.active) drawLayers(ctx, [split.active], width, height);
      if (aboveCanvas) ctx.drawImage(aboveCanvas, 0, 0);
      else drawLayers(ctx, split.above, width, height);
      stats.cachedComposites += 1;
      return true;
    },
  };
}
