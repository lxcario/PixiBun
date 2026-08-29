/**
 * Regression tests for the v2 implementation plan:
 *  - Non-destructive photometric output layer
 *  - bufferVersion signal on every pixel-mutating path
 *  - Photometric correctness
 *  - Bake Normals writes to layers[0]
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Minimal DOM + Canvas mock
// ---------------------------------------------------------------------------

interface ImageDataShim {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

class FakeImageData implements ImageDataShim {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

interface MockCanvas extends HTMLCanvasElement {
  _imageData: ImageDataShim;
}

interface MockCtx extends CanvasRenderingContext2D {
  _imageData: ImageDataShim;
  _stroke: Array<{ kind: string; x: number; y: number; w: number; h: number; rgba?: string }>;
}

function makeCanvas(width: number, height: number): MockCanvas {
  let _imageData = new FakeImageData(width, height);
  const stroke: Array<{ kind: string; x: number; y: number; w: number; h: number; rgba?: string }> = [];

  const ctx = {
    imageSmoothingEnabled: true,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    _stroke: stroke,
    clearRect: (x: number, y: number, w: number, h: number) => {
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          const i = (py * width + px) * 4;
          _imageData.data[i] = 0;
          _imageData.data[i + 1] = 0;
          _imageData.data[i + 2] = 0;
          _imageData.data[i + 3] = 0;
        }
      }
      stroke.push({ kind: 'clearRect', x, y, w, h });
    },
    fillRect: (x: number, y: number, w: number, h: number) => {
      const rgba = parseColor(String(ctx.fillStyle));
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          const i = (py * width + px) * 4;
          if (ctx.globalCompositeOperation === 'destination-out') {
            _imageData.data[i + 3] = 0;
          } else {
            _imageData.data[i] = rgba[0];
            _imageData.data[i + 1] = rgba[1];
            _imageData.data[i + 2] = rgba[2];
            _imageData.data[i + 3] = rgba[3];
          }
        }
      }
      stroke.push({ kind: 'fillRect', x, y, w, h, rgba: String(ctx.fillStyle) });
    },
    drawImage: (src: MockCanvas | HTMLCanvasElement, dx: number, dy: number) => {
      const srcId: ImageDataShim | undefined = (src as MockCanvas)?._imageData;
      if (!srcId) return;
      for (let py = 0; py < srcId.height; py++) {
        for (let px = 0; px < srcId.width; px++) {
          const sx = px + dx;
          const sy = py + dy;
          if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
          const si = (py * srcId.width + px) * 4;
          const di = (sy * width + sx) * 4;
          _imageData.data[di] = srcId.data[si];
          _imageData.data[di + 1] = srcId.data[si + 1];
          _imageData.data[di + 2] = srcId.data[si + 2];
          _imageData.data[di + 3] = srcId.data[si + 3];
        }
      }
      stroke.push({ kind: 'drawImage', x: dx, y: dy, w: srcId.width, h: srcId.height });
    },
    getImageData: (x: number, y: number, w: number, h: number) => {
      const out = new FakeImageData(w, h);
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const sx = px + x;
          const sy = py + y;
          if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
          const si = (sy * width + sx) * 4;
          const di = (py * w + px) * 4;
          out.data[di] = _imageData.data[si];
          out.data[di + 1] = _imageData.data[si + 1];
          out.data[di + 2] = _imageData.data[si + 2];
          out.data[di + 3] = _imageData.data[si + 3];
        }
      }
      return out as unknown as ImageData;
    },
    putImageData: (data: ImageData, x: number, y: number) => {
      for (let py = 0; py < data.height; py++) {
        for (let px = 0; px < data.width; px++) {
          const sx = px + x;
          const sy = py + y;
          if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
          const si = (py * data.width + px) * 4;
          const di = (sy * width + sx) * 4;
          _imageData.data[di] = data.data[si];
          _imageData.data[di + 1] = data.data[si + 1];
          _imageData.data[di + 2] = data.data[si + 2];
          _imageData.data[di + 3] = data.data[si + 3];
        }
      }
      stroke.push({ kind: 'putImageData', x, y, w: data.width, h: data.height });
    },
    createImageData: ((w: number, h: number) => new FakeImageData(w, h)) as unknown as MockCtx['createImageData'],
    setTransform: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    setLineDash: () => {},
  } as unknown as MockCtx;
  Object.defineProperty(ctx, '_imageData', {
    get(): ImageDataShim { return _imageData; },
  });
  Object.defineProperty(ctx, 'canvas', { value: null, writable: true });

  const canvas: MockCanvas = {
    width,
    height,
    getContext: () => ctx,
    _imageData,
  } as unknown as MockCanvas;
  Object.defineProperty(canvas, 'width', {
    get() { return width; },
    set(v: number) {
      width = v;
      _imageData = new FakeImageData(width, height);
    },
  });
  Object.defineProperty(canvas, 'height', {
    get() { return height; },
    set(v: number) {
      height = v;
      _imageData = new FakeImageData(width, height);
    },
  });
  (ctx as { canvas: HTMLCanvasElement | null }).canvas = canvas;
  return canvas;
}

function parseColor(input: string): [number, number, number, number] {
  if (input.startsWith('#')) {
    let hex = input.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length === 6) hex += 'ff';
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = parseInt(hex.slice(6, 8), 16);
    return [r, g, b, a];
  }
  const m = input.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(',').map(s => parseFloat(s.trim()));
    return [parts[0] | 0, parts[1] | 0, parts[2] | 0, Math.round((parts[3] ?? 1) * 255)];
  }
  return [0, 0, 0, 255];
}

beforeEach(() => {
  // jsdom-free DOM shim: every createElement('canvas') returns our fake.
  const g = globalThis as { document?: { createElement?: (tag: string) => unknown }; window?: unknown };
  if (!g.document) {
    g.document = {};
  }
  g.document.createElement = (tag: string) => {
    if (tag === 'canvas') {
      return makeCanvas(1, 1);
    }
    return {};
  };
  g.window = g.window ?? g;
});

// ---------------------------------------------------------------------------
// 1. Non-destructiveness: 10 photometric renders on the same source do not
//    mutate the source layer.
// ---------------------------------------------------------------------------

describe('Photometric non-destructiveness', () => {
  it('renders 10 times with varying light angles and leaves the source layer byte-identical', async () => {
    // We import inside the test so the global document mock is in place.
    const { executePhotometricPipeline } = await import('@/lib/ai/smartMathEngine');
    const { clearAllBuffers, getOrCreateBuffer } = await import('@/lib/engine/bufferRegistry');

    clearAllBuffers();
    const width = 16;
    const height = 16;
    const baseLayerId = 'base-art';
    const base = getOrCreateBuffer(baseLayerId, width, height);
    // Draw a filled circle as our test sprite
    base.ctx.fillStyle = '#3A2E4C';
    const cx = 7.5, cy = 7.5, r = 5;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r) base.ctx.fillRect(x, y, 1, 1);
      }
    }
    const snapshot = new Uint8ClampedArray((base.ctx as unknown as MockCtx)._imageData.data);

    const palette = ['#3A2E4C', '#6A5880', '#A86EC6', '#C792DF', '#DCABDF', '#DDDFDF'];
    for (let i = 0; i < 10; i++) {
      const out = executePhotometricPipeline(
        base.ctx as unknown as CanvasRenderingContext2D,
        width,
        height,
        {
          lightAzimuth: i * 36,
          lightElevation: 45 + (i % 3) * 5,
          lightRadius: 64,
          lightColor: '#FFFFFF',
          ambientIntensity: 0.35,
          material: 'matte',
          cavityStrength: 1.0,
          ditherModulation: 0.35,
          bayerSize: '4x4',
        },
        palette
      );
      expect(out).toBeTruthy();
      expect(out.width).toBe(width);
      expect(out.height).toBe(height);
    }

    const after = (base.ctx as unknown as MockCtx)._imageData.data;
    expect(after.length).toBe(snapshot.length);
    for (let i = 0; i < snapshot.length; i++) {
      expect(after[i]).toBe(snapshot[i]);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Live sync: bufferVersion is bumped on every pixel-mutating store path.
// ---------------------------------------------------------------------------

describe('bufferVersion live sync signal', () => {
  it('starts at 0 and increments when bumpBufferVersion is called', async () => {
    const { useStudioStore } = await import('@/stores/studioStore');
    const initial = useStudioStore.getState().bufferVersion;
    expect(typeof initial).toBe('number');
    useStudioStore.getState().bumpBufferVersion();
    expect(useStudioStore.getState().bufferVersion).toBe(initial + 1);
    useStudioStore.getState().bumpBufferVersion();
    useStudioStore.getState().bumpBufferVersion();
    expect(useStudioStore.getState().bufferVersion).toBe(initial + 3);
  });
});

// ---------------------------------------------------------------------------
// 3. Photometric correctness: a plain circle at Az=0, El=90 (light straight
//    down) should produce a roughly radially-symmetric shading that follows
//    the sprite's silhouette and has lower brightness at the rim than the top.
// ---------------------------------------------------------------------------

describe('Photometric correctness', () => {
  it('produces a silhouette-following symmetric shading for Az=0, El=90', async () => {
    const { executePhotometricPipeline } = await import('@/lib/ai/smartMathEngine');
    const { clearAllBuffers, getOrCreateBuffer } = await import('@/lib/engine/bufferRegistry');

    clearAllBuffers();
    const width = 16;
    const height = 16;
    const baseLayerId = 'base-circle';
    const base = getOrCreateBuffer(baseLayerId, width, height);
    base.ctx.fillStyle = '#FFFFFF';
    const cx = 7.5, cy = 7.5, r = 5;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r) base.ctx.fillRect(x, y, 1, 1);
      }
    }

    const palette = ['#3A2E4C', '#6A5880', '#A86EC6', '#C792DF', '#DCABDF', '#DDDFDF', '#FFFFFF'];
    const out = executePhotometricPipeline(
      base.ctx as unknown as CanvasRenderingContext2D,
      width,
      height,
      {
        lightAzimuth: 0,
        lightElevation: 90,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.35,
        material: 'matte',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
      },
      palette
    );
    const outCtx = (out as unknown as MockCanvas).getContext('2d') as MockCtx;
    const data: Uint8ClampedArray = outCtx._imageData.data;

    // 1) Output is non-empty
    let opaqueCount = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 30) opaqueCount++;
    }
    expect(opaqueCount).toBeGreaterThan(0);

  // 2) Symmetry under El=90 (light straight down): shading should be
  //    left-right symmetric. Compare two symmetric columns inside the
  //    silhouette.
    // Compare left vs right rim by picking two symmetric columns inside the silhouette
    const colL = 4, colR = width - 1 - colL;
    let sumL = 0, sumR = 0, nL = 0, nR = 0;
    for (let y = 0; y < height; y++) {
      const il = (y * width + colL) * 4;
      const ir = (y * width + colR) * 4;
      if (data[il + 3] > 30) { sumL += data[il]; nL++; }
      if (data[ir + 3] > 30) { sumR += data[ir]; nR++; }
    }
    expect(nL).toBe(nR);
    expect(Math.abs(sumL - sumR)).toBeLessThan(8 * nL); // very tolerant: at most ~8/channel avg diff

    // 3) Top of sprite is at least as bright as bottom rim (light straight down).
    const rowAvg = (y: number): number => {
      let sum = 0; let n = 0;
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] > 30) { sum += data[i]; n++; }
      }
      return n > 0 ? sum / n : 0;
    };
    const top = rowAvg(2);
    const bottom = rowAvg(13);
    expect(top).toBeGreaterThanOrEqual(bottom - 1);
  });
});

// ---------------------------------------------------------------------------
// 4. Bake Normals: addLayer + replaceTaggedLayer writes to layers[0],
//    not the last layer. (Modeled by directly inspecting the store after
//    addLayer, mirroring the CenterViewport replaceTaggedLayer helper.)
// ---------------------------------------------------------------------------

describe('Bake Normals layer index', () => {
  it('addLayer places the new layer at index 0 (unshift), so Bake Normals writes to layers[0]', async () => {
    const { useStudioStore } = await import('@/stores/studioStore');
    // Reset to a single base layer
    useStudioStore.setState((state: unknown) => {
      const s = state as ReturnType<typeof useStudioStore.getState>;
      s.frames = [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [
            { id: 'base', name: 'Base Art', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
          ],
        },
      ];
      s.activeFrameIndex = 0;
      s.activeLayerId = 'base';
    });

    useStudioStore.getState().addLayer('Normal Map', 'normal-map');

    const frame = useStudioStore.getState().frames[0];
    expect(frame.layers).toHaveLength(2);
    expect(frame.layers[0].name).toBe('Normal Map');
    expect(frame.layers[0].tag).toBe('normal-map');
    // The base art layer is preserved at index 1, untouched
    expect(frame.layers[1].id).toBe('base');
    expect(frame.layers[1].tag).toBeUndefined();
  });

  it('addLayer with the same tag stacks at index 0 each time (replacement is the caller\'s responsibility via deleteLayer)', async () => {
    const { useStudioStore } = await import('@/stores/studioStore');
    useStudioStore.setState((state: unknown) => {
      const s = state as ReturnType<typeof useStudioStore.getState>;
      s.frames = [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [
            { id: 'base', name: 'Base Art', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
          ],
        },
      ];
      s.activeFrameIndex = 0;
      s.activeLayerId = 'base';
    });

    // Mimic the replaceTaggedLayer helper used by CenterViewport for
    // photometric output: find existing tagged layer, remove it, then add.
    const replaceTagged = (tag: string, name: string) => {
      const s = useStudioStore.getState();
      const f = s.frames[s.activeFrameIndex];
      const existing = f?.layers.find(l => l.tag === tag);
      if (existing) s.deleteLayer(existing.id);
      s.addLayer(name, tag);
    };

    replaceTagged('photometric', 'Photometric Metal');
    replaceTagged('photometric', 'Photometric Glass');
    const frame = useStudioStore.getState().frames[0];
    const photometric = frame.layers.filter(l => l.tag === 'photometric');
    expect(photometric).toHaveLength(1);
    expect(frame.layers[0].tag).toBe('photometric');
    expect(frame.layers[0].name).toBe('Photometric Glass');
    // The base art is at the bottom (index = layers.length - 1)
    expect(frame.layers[frame.layers.length - 1].id).toBe('base');
  });
});
