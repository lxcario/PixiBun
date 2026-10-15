// "On artwork only" (source-atop) layers clip to whatever is composited below
// them, so paint that lands on transparent space is kept in the layer (its
// thumbnail shows it) but never reaches the stage. That is intended clipping,
// not a repaint bug - this module makes it visible to the artist instead.

import type { AnimationFrame, Layer } from '@/types/canvas';
import { compositeFrame } from '@/lib/render/compositor';
import { studioEvents } from '@/lib/events/studioEvents';
import { useStudioStore } from '@/stores/studioStore';

/**
 * Counts pixels a stroke painted (opaque and changed) where nothing below the
 * layer is opaque, i.e. pixels a source-atop layer keeps but cannot display.
 * Erased pixels are ignored. A null `below` means nothing is painted below.
 */
export function countHiddenClippedPixels(
  before: Uint8ClampedArray,
  after: Uint8ClampedArray,
  below: Uint8ClampedArray | null
): number {
  let hidden = 0;
  for (let i = 0; i < after.length; i += 4) {
    if (after[i + 3] === 0) continue;
    if (below && below[i + 3] !== 0) continue;
    if (
      after[i] === before[i] &&
      after[i + 1] === before[i + 1] &&
      after[i + 2] === before[i + 2] &&
      after[i + 3] === before[i + 3]
    ) continue;
    hidden++;
  }
  return hidden;
}

/** Nearest visible, unlocked, normally blended layer under `layerIndex`. */
export function findPaintableLayerBelow(layers: Layer[], layerIndex: number): Layer | undefined {
  return layers
    .slice(layerIndex + 1)
    .find((layer) => layer.visible && !layer.locked && layer.blendMode === 'source-over');
}

const hintedLayerIds = new Set<string>();

/** Test hook: forget which layers already showed the hint. */
export function resetClippedStrokeHints(): void {
  hintedLayerIds.clear();
}

/**
 * After a stroke commits, tell the artist once per layer when a clipped layer
 * swallowed some of it, and offer the likely fix: paint on the artwork layer
 * below (generated matte/glint layers) or switch the layer to Normal blending.
 */
export function maybeHintClippedStroke(args: {
  frames: AnimationFrame[];
  frameIndex: number;
  layerId: string;
  before: ImageData;
  after: ImageData;
}): number {
  const { frames, frameIndex, layerId, before, after } = args;
  const frame = frames[frameIndex];
  const layerIndex = frame?.layers.findIndex((layer) => layer.id === layerId) ?? -1;
  const layer = layerIndex >= 0 ? frame.layers[layerIndex] : undefined;
  if (!frame || !layer || !layer.visible || layer.blendMode !== 'source-atop') return 0;
  if (hintedLayerIds.has(layerId)) return 0;

  const { width, height } = after;
  const belowFrame: AnimationFrame = { ...frame, layers: frame.layers.slice(layerIndex + 1) };
  const belowCanvas = compositeFrame([belowFrame], 0, width, height, { freshCanvas: false });
  const below = belowCanvas?.getContext('2d', { willReadFrequently: true })?.getImageData(0, 0, width, height).data ?? null;
  const hidden = countHiddenClippedPixels(before.data, after.data, below);
  if (hidden === 0) return 0;

  hintedLayerIds.add(layerId);
  const target = layer.tag ? findPaintableLayerBelow(frame.layers, layerIndex) : undefined;
  const pixels = hidden === 1 ? '1 pixel' : `${hidden} pixels`;
  studioEvents.emit('pixibun:toast', {
    message: `“${layer.name}” is On artwork only: it shows only over artwork below it, so ${pixels} of that stroke stay hidden.`,
    action: target
      ? { label: `Draw on ${target.name}`, onClick: () => useStudioStore.getState().setActiveLayer(target.id) }
      : { label: 'Use Normal blend', onClick: () => useStudioStore.getState().setLayerBlendMode(layerId, 'source-over') },
  });
  return hidden;
}
