import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnimationFrame, Layer } from '@/types/canvas';

const below = { data: new Uint8ClampedArray(0) };
const setActiveLayer = vi.fn();
const setLayerBlendMode = vi.fn();

vi.mock('@/lib/render/compositor', () => ({
  compositeFrame: vi.fn(() => ({
    getContext: () => ({ getImageData: () => below }),
  })),
}));
vi.mock('@/stores/studioStore', () => ({
  useStudioStore: { getState: () => ({ setActiveLayer, setLayerBlendMode }) },
}));

import { compositeFrame } from '@/lib/render/compositor';
import { studioEvents } from '@/lib/events/studioEvents';
import {
  countHiddenClippedPixels,
  findPaintableLayerBelow,
  maybeHintClippedStroke,
  resetClippedStrokeHints,
} from '@/lib/render/clippedStrokeHint';

const W = 4;
const H = 1;
const rgba = (...pixels: number[][]) => new Uint8ClampedArray(pixels.flat());
const image = (data: Uint8ClampedArray) => ({ data, width: W, height: H }) as unknown as ImageData;
const EMPTY = [0, 0, 0, 0];
const INK = [20, 20, 40, 255];
const RED = [255, 0, 0, 255];

const layer = (over: Partial<Layer>): Layer => ({
  id: 'x', name: 'Layer', visible: true, locked: false, opacity: 1, blendMode: 'source-over', ...over,
});

describe('countHiddenClippedPixels', () => {
  it('counts painted pixels that have no artwork beneath them', () => {
    const before = rgba(EMPTY, EMPTY, EMPTY, EMPTY);
    const after = rgba(RED, RED, RED, EMPTY);
    expect(countHiddenClippedPixels(before, after, rgba(INK, EMPTY, EMPTY, EMPTY))).toBe(2);
  });

  it('treats a missing below composite as fully transparent', () => {
    expect(countHiddenClippedPixels(rgba(EMPTY, EMPTY, EMPTY, EMPTY), rgba(RED, EMPTY, RED, EMPTY), null)).toBe(2);
  });

  it('ignores unchanged pixels and erasures', () => {
    const before = rgba(RED, RED, EMPTY, EMPTY);
    const after = rgba(RED, EMPTY, EMPTY, EMPTY);
    expect(countHiddenClippedPixels(before, after, null)).toBe(0);
  });
});

describe('findPaintableLayerBelow', () => {
  it('skips hidden, locked and clipped layers', () => {
    const layers = [
      layer({ id: 'matte', blendMode: 'source-atop' }),
      layer({ id: 'hidden', visible: false }),
      layer({ id: 'locked', locked: true }),
      layer({ id: 'clip', blendMode: 'source-atop' }),
      layer({ id: 'base', name: 'Base Layer' }),
    ];
    expect(findPaintableLayerBelow(layers, 0)?.id).toBe('base');
    expect(findPaintableLayerBelow(layers, 4)).toBeUndefined();
  });
});

describe('maybeHintClippedStroke', () => {
  const toasts: { message: string; action?: { label: string; onClick: () => void } }[] = [];
  let unsubscribe: () => void;

  beforeEach(() => {
    resetClippedStrokeHints();
    toasts.length = 0;
    setActiveLayer.mockClear();
    setLayerBlendMode.mockClear();
    vi.mocked(compositeFrame).mockClear();
    below.data = rgba(INK, EMPTY, EMPTY, EMPTY);
    unsubscribe = studioEvents.on('pixibun:toast', (toast) => { toasts.push(toast); });
  });
  afterEach(() => unsubscribe());

  const frameWith = (top: Layer): AnimationFrame[] =>
    [{ id: 'f', durationMs: 100, layers: [top, layer({ id: 'base', name: 'Base Layer' })] } as AnimationFrame];
  const stroke = { before: image(rgba(EMPTY, EMPTY, EMPTY, EMPTY)), after: image(rgba(RED, RED, RED, EMPTY)) };

  it('explains a photometric matte stroke that lands off the artwork and offers the artwork layer', () => {
    const frames = frameWith(layer({ id: 'matte', name: 'Photometric matte', blendMode: 'source-atop', tag: 'photometric' }));
    expect(maybeHintClippedStroke({ frames, frameIndex: 0, layerId: 'matte', ...stroke })).toBe(2);

    // Only the layers under the matte decide what it can show on.
    const [composited] = vi.mocked(compositeFrame).mock.calls[0];
    expect(composited[0].layers.map((l) => l.id)).toEqual(['base']);

    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toContain('“Photometric matte” is On artwork only');
    expect(toasts[0].message).toContain('2 pixels');
    expect(toasts[0].action?.label).toBe('Draw on Base Layer');
    toasts[0].action?.onClick();
    expect(setActiveLayer).toHaveBeenCalledWith('base');

    // One hint per layer per session, so continued painting is not nagged.
    expect(maybeHintClippedStroke({ frames, frameIndex: 0, layerId: 'matte', ...stroke })).toBe(0);
    expect(toasts).toHaveLength(1);
  });

  it('offers Normal blending for an artist-made clipped layer', () => {
    const frames = frameWith(layer({ id: 'shade', name: 'Shading', blendMode: 'source-atop' }));
    maybeHintClippedStroke({ frames, frameIndex: 0, layerId: 'shade', ...stroke });
    expect(toasts[0].action?.label).toBe('Use Normal blend');
    toasts[0].action?.onClick();
    expect(setLayerBlendMode).toHaveBeenCalledWith('shade', 'source-over');
  });

  it('stays quiet for normal layers and for strokes entirely over artwork', () => {
    const normal = frameWith(layer({ id: 'top' }));
    expect(maybeHintClippedStroke({ frames: normal, frameIndex: 0, layerId: 'top', ...stroke })).toBe(0);

    const clipped = frameWith(layer({ id: 'matte', blendMode: 'source-atop' }));
    const onArt = { before: stroke.before, after: image(rgba(RED, EMPTY, EMPTY, EMPTY)) };
    expect(maybeHintClippedStroke({ frames: clipped, frameIndex: 0, layerId: 'matte', ...onArt })).toBe(0);
    expect(toasts).toHaveLength(0);
  });
});
