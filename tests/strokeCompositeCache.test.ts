import { beforeEach, describe, expect, it } from 'vitest';
import type { AnimationFrame, BlendMode, Layer } from '@/types/canvas';
import { clearAllBuffers, getOrCreateBuffer, touchBuffer } from '@/lib/engine/bufferRegistry';
import { compositeFrame } from '@/lib/render/compositor';
import { createStrokeCompositeCache, splitLayersForStroke } from '@/lib/render/strokeCompositeCache';

/**
 * A canvas that blends like a browser 2D canvas: the W3C compositing formulas
 * for the blend modes PixiBun layers use, with 8-bit unpremultiplied storage
 * after every draw, so grouping rounding shows up as it would on screen.
 */
type Rgba = [number, number, number, number];

class BlendCanvas {
  data: Uint8ClampedArray;
  private ctx: BlendContext;
  constructor(private w = 1, private h = 1) {
    this.data = new Uint8ClampedArray(w * h * 4);
    this.ctx = new BlendContext(this);
  }
  get width() { return this.w; }
  set width(v: number) { this.w = v; this.data = new Uint8ClampedArray(this.w * this.h * 4); }
  get height() { return this.h; }
  set height(v: number) { this.h = v; this.data = new Uint8ClampedArray(this.w * this.h * 4); }
  getContext() { return this.ctx; }
}

const separable: Record<string, (cb: number, cs: number) => number> = {
  'source-over': (_cb, cs) => cs,
  multiply: (cb, cs) => cb * cs,
  screen: (cb, cs) => cb + cs - cb * cs,
  overlay: (cb, cs) => (cb <= 0.5 ? 2 * cs * cb : 1 - 2 * (1 - cs) * (1 - cb)),
  'color-dodge': (cb, cs) => (cb === 0 ? 0 : cs >= 1 ? 1 : Math.min(1, cb / (1 - cs))),
};

class BlendContext {
  globalAlpha = 1;
  globalCompositeOperation: string = 'source-over';
  imageSmoothingEnabled = true;
  fillStyle: Rgba = [0, 0, 0, 255];
  constructor(readonly canvas: BlendCanvas) {}
  clearRect() { this.canvas.data.fill(0); }
  getImageData(x: number, y: number, w: number, h: number) {
    const { data, width } = this.canvas;
    const out = new Uint8ClampedArray(w * h * 4);
    for (let py = 0; py < h; py++) out.set(data.subarray(((y + py) * width + x) * 4, ((y + py) * width + x + w) * 4), py * w * 4);
    return { data: out, width: w, height: h };
  }
  drawImage(src: BlendCanvas) {
    for (let i = 0; i < this.canvas.data.length; i += 4) this.blendPixel(i, [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]]);
  }
  /** Sets one pixel the way an opaque or translucent fillRect would. */
  paint(x: number, y: number, rgba: Rgba) {
    const i = (y * this.canvas.width + x) * 4;
    this.canvas.data.set(rgba, i);
  }
  private blendPixel(i: number, s: Rgba) {
    const d = this.canvas.data;
    const as = (s[3] / 255) * this.globalAlpha;
    const ab = d[i + 3] / 255;
    if (as === 0) return;
    const op = this.globalCompositeOperation;
    let ao: number;
    const co: number[] = [];
    for (let c = 0; c < 3; c++) {
      const cs = s[c] / 255, cb = d[i + c] / 255;
      if (op === 'source-atop') {
        co[c] = as * cs * ab + ab * cb * (1 - as);
      } else {
        const mixed = (1 - ab) * cs + ab * separable[op](cb, cs);
        co[c] = as * mixed + ab * cb * (1 - as);
      }
    }
    if (op === 'source-atop') ao = ab;
    else ao = as + ab * (1 - as);
    d[i + 3] = Math.round(ao * 255);
    for (let c = 0; c < 3; c++) d[i + c] = ao === 0 ? 0 : Math.round((co[c] / ao) * 255);
  }
}

const W = 6;
const H = 4;

function layer(id: string, blendMode: BlendMode, opacity = 1, visible = true): Layer {
  return { id, name: id, visible, locked: false, opacity, blendMode };
}

/** Fills a layer buffer with a deterministic pattern; `alphas` picks the pixel alphas used. */
function paintLayer(id: string, seed: number, alphas: number[]) {
  const ctx = getOrCreateBuffer(id, W, H).ctx as unknown as BlendContext;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = (x * 7 + y * 13 + seed * 5) % 11;
      ctx.paint(x, y, [(k * 37 + seed * 50) % 256, (k * 91 + seed * 20) % 256, (k * 53 + seed * 80) % 256, alphas[(k + seed) % alphas.length]]);
    }
  }
}

function pixels(canvas: HTMLCanvasElement) {
  return Array.from((canvas as unknown as BlendCanvas).data);
}

function newCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  return canvas;
}

/** Composites through the cache and through compositeFrame and returns both. */
function both(cache: ReturnType<typeof createStrokeCompositeCache>, frames: AnimationFrame[], frameIndex: number, activeId: string) {
  const cached = newCanvas();
  const full = newCanvas();
  cache.composite(frames, frameIndex, activeId, W, H, cached);
  compositeFrame(frames, frameIndex, W, H, {}, full);
  return { cached: pixels(cached), full: pixels(full) };
}

// Top layer first, as frame.layers stores them.
const mixedLayers = () => [
  layer('top', 'source-over', 0.6),
  layer('mul', 'multiply', 0.8),
  layer('atop', 'source-atop'),
  layer('active', 'overlay', 0.7),
  layer('scr', 'screen'),
  layer('dodge', 'color-dodge', 0.5),
  layer('mid', 'source-over'),
  layer('base', 'source-over', 0.9),
];

const SEMI = [0, 96, 180, 255];
const BINARY = [0, 255];

beforeEach(() => {
  (globalThis as { document?: unknown }).document = {
    createElement: (tag: string) => (tag === 'canvas' ? new BlendCanvas() : {}),
  };
  clearAllBuffers();
});

describe('stroke composite cache', () => {
  it('splits drawable layers around the active one, bottom to top', () => {
    const frame = { id: 'f', durationMs: 100, layers: mixedLayers() };
    for (const l of frame.layers) paintLayer(l.id, 1, SEMI);
    const split = splitLayersForStroke(frame, 'active')!;
    expect(split.below.map((l) => l.id)).toEqual(['base', 'mid', 'dodge', 'scr']);
    expect(split.above.map((l) => l.id)).toEqual(['atop', 'mul', 'top']);
    expect(split.active?.id).toBe('active');
    expect(split.aboveMayFlatten).toBe(false);
    expect(splitLayersForStroke(frame, 'missing')).toBeNull();
  });

  it('matches compositeFrame pixel for pixel with mixed blend modes, for every active layer', () => {
    const layers = mixedLayers();
    layers.forEach((l, i) => paintLayer(l.id, i + 1, SEMI));
    const frames = [{ id: 'f', durationMs: 100, layers }];
    for (const active of layers) {
      const cache = createStrokeCompositeCache();
      const { cached, full } = both(cache, frames, 0, active.id);
      expect(cached, `active ${active.id}`).toEqual(full);
    }
  });

  it('flattens opaque-or-clear source-over layers above and stays pixel exact', () => {
    const layers = [layer('a1', 'source-over'), layer('a2', 'source-over'), layer('active', 'multiply', 0.7), ...mixedLayers().slice(4)];
    layers.forEach((l, i) => paintLayer(l.id, i + 2, l.id.startsWith('a') && l.id !== 'active' ? BINARY : SEMI));
    const frames = [{ id: 'f', durationMs: 100, layers }];
    const cache = createStrokeCompositeCache();
    const { cached, full } = both(cache, frames, 0, 'active');
    expect(cached).toEqual(full);
    expect(cache.stats.rebuilds).toBe(2); // below and above both flattened
  });

  it('keeps semi-transparent source-over layers above live (grouping them rounds differently in the browser)', () => {
    const layers = [layer('a1', 'source-over'), layer('a2', 'source-over', 1), layer('active', 'source-over'), layer('base', 'source-over', 0.6)];
    layers.forEach((l, i) => paintLayer(l.id, i + 3, SEMI));
    const frames = [{ id: 'f', durationMs: 100, layers }];
    const cache = createStrokeCompositeCache();
    const { cached, full } = both(cache, frames, 0, 'active');
    expect(cached).toEqual(full);
    expect(cache.stats.rebuilds).toBe(1); // only the layers below

  });

  it('reuses the flattened layers while only the active layer is painted', () => {
    const layers = mixedLayers();
    layers.forEach((l, i) => paintLayer(l.id, i + 1, SEMI));
    const frames = [{ id: 'f', durationMs: 100, layers }];
    const cache = createStrokeCompositeCache();
    both(cache, frames, 0, 'active');
    expect(cache.stats.rebuilds).toBe(1);
    for (let stamp = 0; stamp < 5; stamp++) {
      paintLayer('active', 20 + stamp, SEMI);
      touchBuffer('active');
      const { cached, full } = both(cache, frames, 0, 'active');
      expect(cached).toEqual(full);
    }
    expect(cache.stats.rebuilds).toBe(1);
    expect(cache.stats.cachedComposites).toBe(6);
  });

  describe('invalidation', () => {
    const setup = () => {
      const layers = mixedLayers();
      layers.forEach((l, i) => paintLayer(l.id, i + 1, SEMI));
      const cache = createStrokeCompositeCache();
      const frames = [{ id: 'f', durationMs: 100, layers }];
      both(cache, frames, 0, 'active');
      expect(cache.stats.rebuilds).toBe(1);
      return { cache, layers };
    };
    const withLayer = (layers: Layer[], id: string, change: Partial<Layer>) =>
      [{ id: 'f', durationMs: 100, layers: layers.map((l) => (l.id === id ? { ...l, ...change } : l)) }];

    it('rebuilds when a cached layer is painted (buffer revision)', () => {
      const { cache, layers } = setup();
      paintLayer('mid', 40, SEMI);
      touchBuffer('mid');
      const { cached, full } = both(cache, [{ id: 'f', durationMs: 100, layers }], 0, 'active');
      expect(cache.stats.rebuilds).toBe(2);
      expect(cached).toEqual(full);
    });

    it.each([
      ['visibility', { visible: false }],
      ['opacity', { opacity: 0.25 }],
      ['blend mode', { blendMode: 'multiply' as BlendMode }],
    ])('rebuilds when a layer below changes %s', (_name, change) => {
      const { cache, layers } = setup();
      const { cached, full } = both(cache, withLayer(layers, 'mid', change), 0, 'active');
      expect(cache.stats.rebuilds).toBe(2);
      expect(cached).toEqual(full);
    });

    it('rebuilds when layers are reordered', () => {
      const { cache, layers } = setup();
      const reordered = [...layers];
      [reordered[5], reordered[6]] = [reordered[6], reordered[5]];
      const { cached, full } = both(cache, [{ id: 'f', durationMs: 100, layers: reordered }], 0, 'active');
      expect(cache.stats.rebuilds).toBe(2);
      expect(cached).toEqual(full);
    });

    it('rebuilds when the frame changes', () => {
      const { cache, layers } = setup();
      const other = layers.map((l) => ({ ...l, id: `${l.id}-2` }));
      other.forEach((l, i) => paintLayer(l.id, i + 30, SEMI));
      const frames = [{ id: 'f', durationMs: 100, layers }, { id: 'g', durationMs: 100, layers: other }];
      const { cached, full } = both(cache, frames, 1, 'active-2');
      expect(cache.stats.rebuilds).toBe(2);
      expect(cached).toEqual(full);
    });

    it('rebuilds when the active layer changes', () => {
      const { cache, layers } = setup();
      const { cached, full } = both(cache, [{ id: 'f', durationMs: 100, layers }], 0, 'scr');
      expect(cache.stats.rebuilds).toBe(2);
      expect(cached).toEqual(full);
    });

    it('rebuilds after invalidate(), which the viewport calls when the stroke ends', () => {
      const { cache, layers } = setup();
      cache.invalidate();
      both(cache, [{ id: 'f', durationMs: 100, layers }], 0, 'active');
      expect(cache.stats.rebuilds).toBe(2);
    });

    it('stops flattening the layers above once one gains a semi-transparent pixel', () => {
      const layers = [layer('a1', 'source-over'), layer('active', 'source-over'), layer('base', 'source-over')];
      paintLayer('a1', 1, BINARY);
      paintLayer('active', 2, SEMI);
      paintLayer('base', 3, SEMI);
      const frames = [{ id: 'f', durationMs: 100, layers }];
      const cache = createStrokeCompositeCache();
      both(cache, frames, 0, 'active');
      expect(cache.stats.rebuilds).toBe(2);
      (getOrCreateBuffer('a1', W, H).ctx as unknown as BlendContext).paint(0, 0, [10, 20, 30, 128]);
      touchBuffer('a1');
      const { cached, full } = both(cache, frames, 0, 'active');
      expect(cached).toEqual(full);
      expect(cache.stats.rebuilds).toBe(2); // the above group is not rebuilt; a1 is drawn live
    });
  });

  it('draws every layer when there is nothing to reuse', () => {
    const layers = [layer('active', 'source-over'), layer('base', 'multiply')];
    layers.forEach((l, i) => paintLayer(l.id, i + 1, SEMI));
    const cache = createStrokeCompositeCache();
    expect(both(cache, [{ id: 'f', durationMs: 100, layers }], 0, 'base').cached).toEqual(
      both(createStrokeCompositeCache(), [{ id: 'f', durationMs: 100, layers }], 0, 'base').full
    );
    expect(cache.stats.fullComposites).toBe(1);
  });
});
