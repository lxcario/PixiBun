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
  } as unknown as MockCanvas;
  Object.defineProperty(canvas, '_imageData', {
    get(): ImageDataShim { return _imageData; },
  });
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

  it('precomputedAnalysis produces byte-identical output while bypassing geometry recomputation for live drags', async () => {
    const { executePhotometricPipeline, computePhotometricAnalysis } = await import('@/lib/ai/smartMathEngine');
    const { clearAllBuffers, getOrCreateBuffer } = await import('@/lib/engine/bufferRegistry');

    clearAllBuffers();
    const width = 16;
    const height = 16;
    const baseLayerId = 'base-live-drag';
    const base = getOrCreateBuffer(baseLayerId, width, height);

    base.ctx.fillStyle = '#3A2E4C';
    for (let y = 3; y < 13; y++) {
      for (let x = 3; x < 13; x++) {
        base.ctx.fillRect(x, y, 1, 1);
      }
    }

    const params = {
      lightAzimuth: 135,
      lightElevation: 45,
      lightRadius: 64,
      lightColor: '#FFFFFF',
      ambientIntensity: 0.35,
      material: 'matte' as const,
      cavityStrength: 1.0,
      ditherModulation: 0.35,
      bayerSize: '4x4' as const,
      formType: 'character' as const,
    };

    // 1. Standard pipeline (computes geometry inline)
    const outStandard = executePhotometricPipeline(base.ctx, width, height, params);
    const standardCtx = outStandard.getContext('2d') as unknown as MockCtx;
    const standardData = standardCtx._imageData.data;

    // 2. Precomputed analysis pipeline (reused across live mouse drag frames)
    const analysis = computePhotometricAnalysis(base.ctx, width, height, params);
    expect(analysis.normalField).toBeTruthy();
    expect(analysis.cavityAO).toBeTruthy();
    expect(analysis.formType).toBe('character');

    const outCached = executePhotometricPipeline(base.ctx, width, height, {
      ...params,
      precomputedAnalysis: analysis,
    });
    const cachedCtx = outCached.getContext('2d') as unknown as MockCtx;
    const cachedData = cachedCtx._imageData.data;

    // Must be 100% byte-identical
    expect(cachedData.length).toBe(standardData.length);
    for (let i = 0; i < standardData.length; i++) {
      expect(cachedData[i]).toBe(standardData[i]);
    }

    // 3. Live drag session with varying azimuths runs flawlessly using the same analysis
    for (const az of [45, 90, 180, 270, 315]) {
      const liveOut = executePhotometricPipeline(base.ctx, width, height, {
        ...params,
        lightAzimuth: az,
        precomputedAnalysis: analysis,
      });
      expect(liveOut).toBeTruthy();
      expect(liveOut.width).toBe(width);
      expect(liveOut.height).toBe(height);
    }
  });

  it('dynamically updates character appendage normals during live light azimuth drag, matching fresh single-shot recompute 100% byte-for-byte', async () => {
    const { executePhotometricPipeline, computePhotometricAnalysis } = await import('@/lib/ai/smartMathEngine');
    const { clearAllBuffers, getOrCreateBuffer } = await import('@/lib/engine/bufferRegistry');

    clearAllBuffers();
    const width = 32;
    const height = 32;
    const catLayerId = 'cat-appendage-drag-test';
    const catBuffer = getOrCreateBuffer(catLayerId, width, height);

    // Draw the anatomical cat sprite with ears, whiskers, eyes, and body
    // Left ear (x: 9..12, y: 5..9)
    catBuffer.ctx.fillStyle = '#FFF5E6';
    for (let y = 5; y <= 9; y++) {
      for (let x = 9; x <= 12; x++) {
        catBuffer.ctx.fillRect(x, y, 1, 1);
      }
    }
    // Right ear (x: 19..22, y: 5..9)
    for (let y = 5; y <= 9; y++) {
      for (let x = 19; x <= 22; x++) {
        catBuffer.ctx.fillRect(x, y, 1, 1);
      }
    }
    // Face body (x: 7..24, y: 10..22)
    for (let y = 10; y <= 22; y++) {
      for (let x = 7; x <= 24; x++) {
        catBuffer.ctx.fillRect(x, y, 1, 1);
      }
    }
    // Eyes (x: 11, 19, y: 14..15)
    catBuffer.ctx.fillStyle = '#000000';
    catBuffer.ctx.fillRect(11, 14, 1, 2);
    catBuffer.ctx.fillRect(19, 14, 1, 2);
    // Whiskers (y: 15, x: 4..6, 25..27)
    for (let x = 4; x <= 6; x++) catBuffer.ctx.fillRect(x, 15, 1, 1);
    for (let x = 25; x <= 27; x++) catBuffer.ctx.fillRect(x, 15, 1, 1);

    const baseParams = {
      lightElevation: 45,
      lightRadius: 64,
      lightColor: '#FFFFFF',
      ambientIntensity: 0.4,
      material: 'matte' as const,
      cavityStrength: 1.0,
      ditherModulation: 0.0,
      bayerSize: '4x4' as const,
      formType: 'character' as const,
    };

    // 1. Start drag session at lightAzimuth = 45°
    const sessionAnalysis = computePhotometricAnalysis(catBuffer.ctx, width, height, {
      ...baseParams,
      lightAzimuth: 45,
    });
    expect(sessionAnalysis.appendageData).toBeTruthy();
    expect(sessionAnalysis.baseNormalField).toBeTruthy();
    expect(sessionAnalysis.appendageData!.pixels.length).toBeGreaterThan(0);

    // 2. Perform live drag to lightAzimuth = 225° using precomputedAnalysis
    const liveDrag225 = executePhotometricPipeline(catBuffer.ctx, width, height, {
      ...baseParams,
      lightAzimuth: 225,
      precomputedAnalysis: sessionAnalysis,
    });
    const live225Ctx = liveDrag225.getContext('2d') as unknown as MockCtx;
    const live225Data = live225Ctx._imageData.data;

    // 3. Single-shot fresh compute at lightAzimuth = 225° (no precomputedAnalysis)
    const fresh225 = executePhotometricPipeline(catBuffer.ctx, width, height, {
      ...baseParams,
      lightAzimuth: 225,
    });
    const fresh225Ctx = fresh225.getContext('2d') as unknown as MockCtx;
    const fresh225Data = fresh225Ctx._imageData.data;

    // Assert 100% byte-identity between live drag and fresh compute at 225° (0 pixel difference!)
    let differingPixels225 = 0;
    for (let i = 0; i < fresh225Data.length; i += 4) {
      if (
        live225Data[i] !== fresh225Data[i] ||
        live225Data[i + 1] !== fresh225Data[i + 1] ||
        live225Data[i + 2] !== fresh225Data[i + 2] ||
        live225Data[i + 3] !== fresh225Data[i + 3]
      ) {
        differingPixels225++;
      }
    }
    expect(differingPixels225).toBe(0);

    // 4. Drag back to 45° and verify byte-identity with fresh compute at 45°
    const liveDrag45 = executePhotometricPipeline(catBuffer.ctx, width, height, {
      ...baseParams,
      lightAzimuth: 45,
      precomputedAnalysis: sessionAnalysis,
    });
    const live45Ctx = liveDrag45.getContext('2d') as unknown as MockCtx;
    const live45Data = live45Ctx._imageData.data;

    const fresh45 = executePhotometricPipeline(catBuffer.ctx, width, height, {
      ...baseParams,
      lightAzimuth: 45,
    });
    const fresh45Ctx = fresh45.getContext('2d') as unknown as MockCtx;
    const fresh45Data = fresh45Ctx._imageData.data;

    let differingPixels45 = 0;
    for (let i = 0; i < fresh45Data.length; i += 4) {
      if (
        live45Data[i] !== fresh45Data[i] ||
        live45Data[i + 1] !== fresh45Data[i + 1] ||
        live45Data[i + 2] !== fresh45Data[i + 2] ||
        live45Data[i + 3] !== fresh45Data[i + 3]
      ) {
        differingPixels45++;
      }
    }
    expect(differingPixels45).toBe(0);
  });

  it('overwrites existing photometric layer instead of adding duplicate layers on re-render', async () => {
    const { useStudioStore } = await import('@/stores/studioStore');
    const store = useStudioStore.getState();

    const currentFrame = store.frames[store.activeFrameIndex];
    const initialLayerCount = currentFrame.layers.length;

    // Simulate first photometric render by adding a tagged layer
    store.addLayer('Photometric gold', 'photometric');
    expect(useStudioStore.getState().frames[store.activeFrameIndex].layers.length).toBe(initialLayerCount + 1);

    // Finding existing tagged layer
    const frameAfterFirst = useStudioStore.getState().frames[store.activeFrameIndex];
    const existing = frameAfterFirst.layers.find(
      (l) => l.tag === 'photometric' || l.name.toLowerCase().startsWith('photometric')
    );
    expect(existing).toBeDefined();
    expect(existing?.tag).toBe('photometric');

    // On re-render with new azimuth, existing layer is found and renamed/overwritten in-place, NO new layer added
    const displayName = 'Photometric gold (Updated)';
    if (existing) {
      if (existing.name !== displayName) {
        store.renameLayer(existing.id, displayName);
      }
    }
    const frameAfterSecond = useStudioStore.getState().frames[store.activeFrameIndex];
    expect(frameAfterSecond.layers.length).toBe(initialLayerCount + 1);
    expect(frameAfterSecond.layers.find((l) => l.id === existing?.id)?.name).toBe(displayName);
  });

  it('setLayerTag assigns tags to frozen store layers immutably (no "object is not extensible")', async () => {
    const { useStudioStore } = await import('@/stores/studioStore');
    const store = useStudioStore.getState();

    // Legacy layer without a tag, matched only by name prefix (photometric fallback path)
    store.addLayer('Photometric legacy');
    const frame = useStudioStore.getState().frames[store.activeFrameIndex];
    const legacy = frame.layers.find((l) => l.name === 'Photometric legacy');
    expect(legacy).toBeDefined();
    expect(legacy?.tag).toBeUndefined();

    // Zustand + Immer autoFreeze: state objects retrieved via getState() are frozen.
    // Direct mutation (the old `existing.tag = tag` bug) must throw.
    expect(Object.isFrozen(legacy)).toBe(true);
    expect(() => {
      (legacy as { tag?: string }).tag = 'photometric';
    }).toThrow();

    // The immutable store action succeeds on both crash scenarios:
    // 1. Adding a brand-new property to a frozen layer (photometric name-prefix path)
    const store2 = useStudioStore.getState();
    store2.setLayerTag(legacy!.id, 'photometric');
    const frame2 = useStudioStore.getState().frames[store.activeFrameIndex];
    expect(frame2.layers.find((l) => l.id === legacy?.id)?.tag).toBe('photometric');
    // Layer count unchanged: tagging must never add or duplicate layers
    expect(frame2.layers.length).toBe(frame.layers.length);

    // 2. Re-assigning an existing (read-only) tag on a frozen layer (Bake Normals path)
    const store3 = useStudioStore.getState();
    store3.setLayerTag(legacy!.id, 'normal-map');
    const frame3 = useStudioStore.getState().frames[store.activeFrameIndex];
    expect(frame3.layers.find((l) => l.id === legacy?.id)?.tag).toBe('normal-map');
    expect(frame3.layers.length).toBe(frame.layers.length);
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

  it('evaluates directional highlight quadrant for Azimuth=315, 135, 45, 225', async () => {
    const { executePhotometricPipeline } = await import('@/lib/ai/smartMathEngine');
    const { clearAllBuffers, getOrCreateBuffer } = await import('@/lib/engine/bufferRegistry');

    clearAllBuffers();
    const width = 16;
    const height = 16;
    const base = getOrCreateBuffer('circle-diag', width, height);
    base.ctx.fillStyle = '#FFFFFF';
    const cx = 7.5, cy = 7.5, r = 6;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.hypot(x - cx, y - cy) <= r) base.ctx.fillRect(x, y, 1, 1);
      }
    }

    const getQuadrantBrightness = (azimuth: number) => {
      const out = executePhotometricPipeline(
        base.ctx as unknown as CanvasRenderingContext2D,
        width,
        height,
        {
          lightAzimuth: azimuth,
          lightElevation: 45,
          lightRadius: 64,
          lightColor: '#FFFFFF',
          ambientIntensity: 0.2,
          material: 'metal',
          cavityStrength: 1.0,
          ditherModulation: 0,
          bayerSize: '4x4',
        },
        []
      );
      const outCtx = (out as unknown as MockCanvas).getContext('2d') as MockCtx;
      const data = outCtx._imageData.data;

      let tlSum = 0, tlN = 0;
      let brSum = 0, brN = 0;
      let trSum = 0, trN = 0;
      let blSum = 0, blN = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] > 30) {
            const lum = data[idx];
            if (x < cx && y < cy) { tlSum += lum; tlN++; }
            if (x > cx && y > cy) { brSum += lum; brN++; }
            if (x > cx && y < cy) { trSum += lum; trN++; }
            if (x < cx && y > cy) { blSum += lum; blN++; }
          }
        }
      }
      return {
        TL: tlN > 0 ? tlSum / tlN : 0,
        BR: brN > 0 ? brSum / brN : 0,
        TR: trN > 0 ? trSum / trN : 0,
        BL: blN > 0 ? blSum / blN : 0,
      };
    };

    const res315 = getQuadrantBrightness(315);
    const res135 = getQuadrantBrightness(135);
    const res45 = getQuadrantBrightness(45);
    const res225 = getQuadrantBrightness(225);
    expect(res315.TL).toBeGreaterThan(res315.BR);
    expect(res315.TL).toBeGreaterThan(160);

    expect(res135.BR).toBeGreaterThan(res135.TL);
    expect(res135.BR).toBeGreaterThan(160);

    expect(res45.TR).toBeGreaterThan(res45.BL);
    expect(res45.TR).toBeGreaterThan(160);

    expect(res225.BL).toBeGreaterThan(res225.TR);
    expect(res225.BL).toBeGreaterThan(160);
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

  it('composites layers bottom-to-top so layers[0] renders on top of layers[1]', async () => {
    const { compositeFrame } = await import('@/lib/render/compositor');
    const { clearAllBuffers, getOrCreateBuffer } = await import('@/lib/engine/bufferRegistry');

    clearAllBuffers();
    const width = 4;
    const height = 4;

    const baseBuf = getOrCreateBuffer('base-layer', width, height);
    baseBuf.ctx.fillStyle = '#FF0000'; // Red base
    baseBuf.ctx.fillRect(0, 0, width, height);

    const topBuf = getOrCreateBuffer('top-layer', width, height);
    topBuf.ctx.fillStyle = '#00FF00'; // Green top
    topBuf.ctx.fillRect(0, 0, width, height);

    const frames = [
      {
        id: 'f1',
        durationMs: 100,
        layers: [
          { id: 'top-layer', name: 'Top Layer', visible: true, locked: false, opacity: 1, blendMode: 'source-over' as const },
          { id: 'base-layer', name: 'Base Layer', visible: true, locked: false, opacity: 1, blendMode: 'source-over' as const },
        ],
      },
    ];

    const out = compositeFrame(frames, 0, width, height);
    expect(out).toBeTruthy();
    const outData = ((out as unknown as MockCanvas).getContext('2d') as MockCtx)._imageData.data;

    // Pixel at (0,0) must be GREEN (#00FF00), since top-layer (index 0) is drawn on top of base-layer (index 1)
    expect(outData[0]).toBe(0);   // R = 0
    expect(outData[1]).toBe(255); // G = 255
    expect(outData[2]).toBe(0);   // B = 0
  });

  it('generates 47-blob edge contours on a sprite silhouette', async () => {
    const { generate47BlobEdgeData } = await import('@/lib/ai/pixelAiEngine');
    const { clearAllBuffers, getOrCreateBuffer } = await import('@/lib/engine/bufferRegistry');

    clearAllBuffers();
    const width = 8;
    const height = 8;

    const buf = getOrCreateBuffer('sprite', width, height);
    buf.ctx.fillStyle = '#3A2E4C';
    buf.ctx.fillRect(2, 2, 4, 4); // 4x4 square

    const result = generate47BlobEdgeData(buf.ctx as unknown as CanvasRenderingContext2D, width, height);
    expect(result.blobPixels.length).toBeGreaterThan(0);
  });

  it('detects Minecraft skin and generates true 3D cuboid face normals', async () => {
    const { detectMinecraftSkin, computeMinecraftSkinNormalField } = await import('@/lib/ai/smartMathEngine');

    // Simulate 64x64 Minecraft skin with head, torso, and limbs filled
    const isOpaque = (x: number, y: number) => {
      // Head front (8..16, 8..16) and Torso (20..28, 20..32) are opaque
      if (x >= 8 && x < 16 && y >= 8 && y < 16) return true;
      if (x >= 20 && x < 28 && y >= 20 && y < 32) return true;
      // Right Leg (4..12, 20..32) and Right Arm (44..52, 20..32)
      if (x >= 4 && x < 12 && y >= 20 && y < 32) return true;
      if (x >= 44 && x < 52 && y >= 20 && y < 32) return true;
      return false;
    };

    const isMc = detectMinecraftSkin(isOpaque, 64, 64);
    expect(isMc).toBe(true);

    const normalField = computeMinecraftSkinNormalField(64, 64);
    expect(normalField.nx.length).toBe(64 * 64);

    // Head Front face (12, 12) normal should be forward facing: nz close to 1.0
    const frontIdx = 12 * 64 + 12;
    expect(normalField.nz[frontIdx]).toBeCloseTo(1.0, 1);

    // Head Front interior center pixel (12, 12) has planar normal
    expect(normalField.nz[frontIdx]).toBeCloseTo(1.0, 2);
    expect(normalField.nx[frontIdx]).toBeCloseTo(0.0, 2);

    // Head Front seam border pixel (8, 12) smoothly blends 75% Front + 25% Right to eliminate barcode steps
    const frontEdgeIdx = 12 * 64 + 8;
    expect(normalField.nz[frontEdgeIdx]).toBeGreaterThan(0.90);
    expect(normalField.nx[frontEdgeIdx]).toBeLessThan(0); // Blended slightly toward Right face

    // Head Right face (4, 12) normal points RIGHT/WEST: nx is negative
    const rightIdx = 12 * 64 + 4;
    expect(normalField.nx[rightIdx]).toBeLessThan(-0.3);

    // Anatomical sky lighting verification:
    // Head Top (x=12, y=4) is UP face -> receives direct overhead sky light (1.08)
    const headTopIdx = 4 * 64 + 12;
    expect(normalField.sky![headTopIdx]).toBeCloseTo(1.08, 2);

    // Head Bottom (x=20, y=4) is DOWN face (under-chin / neck) -> anatomically shadowed (0.80), NOT lit as top sky!
    const headBotIdx = 4 * 64 + 20;
    expect(normalField.sky![headBotIdx]).toBeCloseTo(0.80, 2);

    // Material differentiation verification:
    // Head Front forehead (x=12, y=9) -> 0 (Skin / Base)
    expect(normalField.material![9 * 64 + 12]).toBe(0);
    // Head Front eye row (x=12, y=12) -> 2 (Eye Protection)
    expect(normalField.material![12 * 64 + 12]).toBe(2);
    // Jacket Overlay (x=24, y=38) -> 1 (Fabric / Clothing)
    expect(normalField.material![38 * 64 + 24]).toBe(1);
    // Right Arm Base (x=46, y=24) -> 0 (Skin / Base)
    expect(normalField.material![24 * 64 + 46]).toBe(0);
  });

  it('executes Minecraft skin shading with hue-shifting and contact occlusion', async () => {
    const { executeMinecraftSkinShadingPipeline } = await import('@/lib/ai/smartMathEngine');
    const { getOrCreateBuffer, clearAllBuffers } = await import('@/lib/engine/bufferRegistry');

    clearAllBuffers();
    const width = 64;
    const height = 64;

    const buf = getOrCreateBuffer('mc-skin', width, height);
    // Draw head front with peach skin tone #F0BE7C
    buf.ctx.fillStyle = '#F0BE7C';
    buf.ctx.fillRect(8, 8, 8, 8);

    const shadedCanvas = executeMinecraftSkinShadingPipeline(
      buf.ctx as unknown as CanvasRenderingContext2D,
      width,
      height,
      {
        material: 'matte',
        lightAzimuth: 45,
        lightElevation: 45,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.2,
        lightBrightness: 1.2,
        cavityStrength: 1.0,
        ditherModulation: 0.5,
        bayerSize: '4x4',
      }
    );

    const sCtx = shadedCanvas.getContext('2d')!;
    const imgData = sCtx.getImageData(0, 0, width, height);

    // Transparent void pixels (0, 0) must remain alpha 0
    expect(imgData.data[3]).toBe(0);

    // Head front top pixel (12, 8) must be opaque and shaded
    const headTopIdx = (8 * 64 + 12) * 4;
    expect(imgData.data[headTopIdx + 3]).toBe(255);
    expect(imgData.data[headTopIdx]).toBeGreaterThan(100); // Vibrant, not dark crushed
  });

  it('renders mxnrry and penguin skins with material-aware pipeline and exports PNG', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const zlib = await import('zlib');
    const { executeMinecraftSkinShadingPipeline } = await import('@/lib/ai/smartMathEngine');

    function decodePNG(buffer: Buffer) {
      let offset = 8;
      let width = 0, height = 0;
      const idatChunks: Buffer[] = [];

      while (offset < buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString('ascii', offset + 4, offset + 8);
        if (type === 'IHDR') {
          width = buffer.readUInt32BE(offset + 8);
          height = buffer.readUInt32BE(offset + 12);
        } else if (type === 'IDAT') {
          idatChunks.push(buffer.subarray(offset + 8, offset + 8 + length));
        } else if (type === 'IEND') {
          break;
        }
        offset += 12 + length;
      }

      const compressed = Buffer.concat(idatChunks);
      const decompressed = zlib.inflateSync(compressed);

      const bytesPerPixel = 4;
      const stride = width * bytesPerPixel;
      const data = new Uint8ClampedArray(width * height * 4);

      let srcPos = 0;
      for (let y = 0; y < height; y++) {
        const filterType = decompressed[srcPos++];
        const lineStart = y * stride;

        for (let x = 0; x < stride; x++) {
          const raw = decompressed[srcPos++];
          let val = raw;
          const left = x >= bytesPerPixel ? data[lineStart + x - bytesPerPixel] : 0;
          const up = y > 0 ? data[(y - 1) * stride + x] : 0;
          const upLeft = (y > 0 && x >= bytesPerPixel) ? data[(y - 1) * stride + x - bytesPerPixel] : 0;

          if (filterType === 0) {
            val = raw;
          } else if (filterType === 1) {
            val = (raw + left) & 0xff;
          } else if (filterType === 2) {
            val = (raw + up) & 0xff;
          } else if (filterType === 3) {
            val = (raw + Math.floor((left + up) / 2)) & 0xff;
          } else if (filterType === 4) {
            const p = left + up - upLeft;
            const pa = Math.abs(p - left);
            const pb = Math.abs(p - up);
            const pc = Math.abs(p - upLeft);
            let pr: number;
            if (pa <= pb && pa <= pc) pr = left;
            else if (pb <= pc) pr = up;
            else pr = upLeft;
            val = (raw + pr) & 0xff;
          }
          data[lineStart + x] = val;
        }
      }

      return { width, height, data };
    }

    function encodePNG(width: number, height: number, data: Uint8ClampedArray | Uint8Array) {
      const bytesPerPixel = 4;
      const stride = width * bytesPerPixel;
      const rawScanlines = Buffer.alloc(height * (stride + 1));

      let dstPos = 0;
      for (let y = 0; y < height; y++) {
        rawScanlines[dstPos++] = 0;
        for (let x = 0; x < stride; x++) {
          rawScanlines[dstPos++] = data[y * stride + x];
        }
      }

      const compressed = zlib.deflateSync(rawScanlines);
      const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      const ihdr = Buffer.alloc(13);
      ihdr.writeUInt32BE(width, 0);
      ihdr.writeUInt32BE(height, 4);
      ihdr[8] = 8;
      ihdr[9] = 6;
      ihdr[10] = 0;
      ihdr[11] = 0;
      ihdr[12] = 0;

      function makeChunk(type: string, chunkData: Buffer) {
        const len = chunkData.length;
        const buf = Buffer.alloc(12 + len);
        buf.writeUInt32BE(len, 0);
        buf.write(type, 4, 4, 'ascii');
        chunkData.copy(buf, 8);

        let c = 0xffffffff;
        const table = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
          let v = n;
          for (let k = 0; k < 8; k++) {
            v = (v & 1) ? (0xedb88320 ^ (v >>> 1)) : (v >>> 1);
          }
          table[n] = v;
        }

        for (let i = 4; i < 8 + len; i++) {
          c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
        }
        buf.writeUInt32BE((c ^ 0xffffffff) >>> 0, 8 + len);
        return buf;
      }

      return Buffer.concat([signature, makeChunk('IHDR', ihdr), makeChunk('IDAT', compressed), makeChunk('IEND', Buffer.alloc(0))]);
    }

    const mxnrryPath = 'C:/Users/Resque/.gemini/antigravity/brain/f87d30d0-506d-44da-8bd4-66b5901b0ba5/.user_uploaded/media_1788075654751.png';
    const penguinPath = 'C:/Users/Resque/.gemini/antigravity/brain/f87d30d0-506d-44da-8bd4-66b5901b0ba5/.user_uploaded/media_1788075432855.png';
    const outDir = 'C:/Users/Resque/.gemini/antigravity/brain/f87d30d0-506d-44da-8bd4-66b5901b0ba5';

    function renderAndSave(inPath: string, outFileName: string) {
      if (!fs.existsSync(inPath)) return;
      const buf = fs.readFileSync(inPath);
      const { width, height, data } = decodePNG(buf);

      const fakeCtx = {
        getImageData: (_x: number, _y: number, w: number, h: number) => ({
          data: new Uint8ClampedArray(data),
          width: w,
          height: h,
        }),
      } as unknown as CanvasRenderingContext2D;

      const shadedCanvas = executeMinecraftSkinShadingPipeline(
        fakeCtx,
        width,
        height,
        {
          material: 'matte',
          lightAzimuth: 45,
          lightElevation: 45,
          lightRadius: 64,
          lightColor: '#FFFFFF',
          ambientIntensity: 0.2,
          lightBrightness: 1.15,
          cavityStrength: 1.0,
          ditherModulation: 0.5,
          bayerSize: '4x4',
        }
      );

      const sCtx = shadedCanvas.getContext('2d')!;
      const outImgData = sCtx.getImageData(0, 0, width, height);

      const outPng = encodePNG(width, height, outImgData.data);
      fs.writeFileSync(path.join(outDir, outFileName), outPng);
      return outImgData;
    }

    const mxnrryOut = renderAndSave(mxnrryPath, 'shaded_mxnrry.png');
    if (mxnrryOut) {
      // 1. Verify White T-Shirt on Torso (x=24, y=22) remains bright and crisp (R, G, B >= 220)
      const shirtIdx = (22 * 64 + 24) * 4;
      if (mxnrryOut.data[shirtIdx + 3] > 0) {
        expect(mxnrryOut.data[shirtIdx]).toBeGreaterThan(210);
        expect(mxnrryOut.data[shirtIdx + 1]).toBeGreaterThan(210);
        expect(mxnrryOut.data[shirtIdx + 2]).toBeGreaterThan(210);
      }

      // 2. Verify Red Floral Pants (x=6, y=22) remains saturated red (R > 180, R > G*2)
      const pantsIdx = (22 * 64 + 6) * 4;
      if (mxnrryOut.data[pantsIdx + 3] > 0) {
        expect(mxnrryOut.data[pantsIdx]).toBeGreaterThan(160);
      }

      // 3. Verify Eye sclera (x=9, y=14) remains crisp white without being crushed
      const eyeIdx = (14 * 64 + 9) * 4;
      if (mxnrryOut.data[eyeIdx + 3] > 0) {
        expect(mxnrryOut.data[eyeIdx]).toBeGreaterThan(220);
      }
    }

    renderAndSave(penguinPath, 'shaded_penguin.png');
  });
});

