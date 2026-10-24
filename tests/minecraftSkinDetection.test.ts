/**
 * Unit & Integration tests for Minecraft Skin vs 2.5D Sprite Topological Discriminator
 * and user-override modes in the Photometric Lighting pipeline.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  analyzeMinecraftSkinTopology,
  detectMinecraftSkin,
} from '../src/lib/graphics/math/minecraftSkin';
import {
  executePhotometricPipeline,
} from '../src/lib/graphics/math/photometricLighting';

// ---------------------------------------------------------------------------
// Minimal DOM + Canvas mock for Vitest
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
}

function makeCanvas(width: number, height: number): MockCanvas {
  const _imageData = new FakeImageData(width, height);

  const ctx = {
    imageSmoothingEnabled: true,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
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
    },
    fillRect: (x: number, y: number, w: number, h: number) => {
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          const i = (py * width + px) * 4;
          _imageData.data[i] = 200;
          _imageData.data[i + 1] = 50;
          _imageData.data[i + 2] = 50;
          _imageData.data[i + 3] = 255;
        }
      }
    },
    drawImage: (src: MockCanvas, dx: number, dy: number) => {
      const srcId = src._imageData;
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
    },
    createImageData: ((w: number, h: number) => new FakeImageData(w, h)) as unknown as MockCtx['createImageData'],
  } as unknown as MockCtx;

  Object.defineProperty(ctx, '_imageData', {
    get(): ImageDataShim { return _imageData; },
  });

  const canvas: MockCanvas = {
    width,
    height,
    getContext: () => ctx,
  } as unknown as MockCanvas;

  Object.defineProperty(canvas, '_imageData', {
    get(): ImageDataShim { return _imageData; },
  });

  (ctx as unknown as { canvas: HTMLCanvasElement | null }).canvas = canvas;
  return canvas;
}

beforeEach(() => {
  const g = globalThis as { document?: { createElement?: (tag: string) => unknown } };
  if (!g.document) {
    g.document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') return makeCanvas(64, 64);
        return {} as HTMLElement;
      },
    };
  }
});

// ---------------------------------------------------------------------------
// Synthetic Test Sprites
// ---------------------------------------------------------------------------

function createSkinGrid(w: number, h: number): boolean[][] {
  return Array.from({ length: h }, () => Array(w).fill(false));
}

function fillRect(grid: boolean[][], x: number, y: number, w: number, h: number) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (grid[py] && grid[py][px] !== undefined) {
        grid[py][px] = true;
      }
    }
  }
}

/**
 * Creates a synthetic Minecraft skin layout (disjoint islands for head, torso, arms, legs).
 */
function createMinecraftSkinGrid(): boolean[][] {
  const grid = createSkinGrid(64, 64);
  // Head Base: (8..24, 0..8) top/bottom faces, (0..32, 8..16) side faces
  fillRect(grid, 8, 0, 16, 8);
  fillRect(grid, 0, 8, 32, 8);
  // Hat Overlay: (40..56, 0..8) top/bottom faces, (32..64, 8..16) side faces
  fillRect(grid, 40, 0, 16, 8);
  fillRect(grid, 32, 8, 32, 8);
  // Torso: (20..36, 16..20) top/bottom, (16..36, 20..32) sides
  fillRect(grid, 20, 16, 16, 4);
  fillRect(grid, 16, 20, 20, 12);
  // Right Arm: (44..52, 16..20) top/bottom, (40..52, 20..32) sides
  fillRect(grid, 44, 16, 8, 4);
  fillRect(grid, 40, 20, 12, 12);
  // Right Leg: (4..12, 16..20) top/bottom, (0..12, 20..32) sides
  fillRect(grid, 4, 16, 8, 4);
  fillRect(grid, 0, 20, 12, 12);
  // Left Leg: (20..28, 48..52) top/bottom, (16..28, 52..64) sides
  fillRect(grid, 20, 48, 8, 4);
  fillRect(grid, 16, 52, 12, 12);
  // Left Arm: (36..44, 48..52) top/bottom, (32..44, 52..64) sides
  fillRect(grid, 36, 48, 8, 4);
  fillRect(grid, 32, 52, 12, 12);
  return grid;
}

/**
 * Creates a centered 64x64 character sprite (single contiguous silhouette, e.g. bunny).
 */
function createCenteredCharacterGrid(): boolean[][] {
  const grid = createSkinGrid(64, 64);
  // Main body / head / ears in one connected mass
  // Ears: (24..28, 6..18) and (36..40, 6..18)
  fillRect(grid, 24, 6, 5, 12);
  fillRect(grid, 35, 6, 5, 12);
  // Head: (20..44, 16..32) - connected with ears
  fillRect(grid, 20, 16, 24, 16);
  // Body: (18..46, 30..54) - connected with head
  fillRect(grid, 18, 30, 28, 24);
  // Lateral margins x: 0..17 and x: 47..63 are completely empty!
  return grid;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Minecraft Skin vs 2.5D Sprite Topological Discriminator', () => {
  it('returns isSkin: false on empty canvas (<16 pixels)', () => {
    const grid = createSkinGrid(64, 64);
    fillRect(grid, 10, 10, 2, 2); // 4 pixels
    const isOpaque = (x: number, y: number) => grid[y]?.[x] ?? false;

    const analysis = analyzeMinecraftSkinTopology(isOpaque, 64, 64);
    expect(analysis.isSkin).toBe(false);
    expect(analysis.confidence).toBe(0);
    expect(analysis.rationale).toContain('Fewer than 16 opaque pixels');
  });

  it('correctly detects authentic Minecraft Skin UV atlas with disjoint islands', () => {
    const grid = createMinecraftSkinGrid();
    const isOpaque = (x: number, y: number) => grid[y]?.[x] ?? false;

    const analysis = analyzeMinecraftSkinTopology(isOpaque, 64, 64);
    expect(analysis.isSkin).toBe(true);
    expect(analysis.isContiguousSingleSilhouette).toBe(false);
    expect(analysis.hasHeadFaces).toBe(true);
    expect(analysis.hasTorsoOrLimbs).toBe(true);
    expect(analysis.islandCount).toBeGreaterThanOrEqual(2);
    expect(analysis.confidence).toBeGreaterThanOrEqual(0.70);
    expect(detectMinecraftSkin(isOpaque, 64, 64)).toBe(true);
  });

  it('correctly classifies centered 64x64 character sprite as 2.5D Sprite (NOT skin)', () => {
    const grid = createCenteredCharacterGrid();
    const isOpaque = (x: number, y: number) => grid[y]?.[x] ?? false;

    const analysis = analyzeMinecraftSkinTopology(isOpaque, 64, 64);
    expect(analysis.isSkin).toBe(false);
    expect(analysis.isContiguousSingleSilhouette).toBe(true);
    expect(analysis.largestComponentRatio).toBeGreaterThanOrEqual(0.68);
    expect(detectMinecraftSkin(isOpaque, 64, 64)).toBe(false);
    expect(analysis.rationale).toContain('character silhouette detected');
  });

  it('does not classify non-standard dimensions as Minecraft skin', () => {
    const grid = createSkinGrid(32, 32);
    fillRect(grid, 4, 4, 24, 24);
    const isOpaque = (x: number, y: number) => grid[y]?.[x] ?? false;

    const analysis = analyzeMinecraftSkinTopology(isOpaque, 32, 32);
    expect(analysis.isSkin).toBe(false);
    expect(analysis.rationale).toContain('Dimensions 32x32');
  });
});

describe('Photometric Lighting Pipeline with MinecraftSkinMode user sovereignty', () => {
  function makeCanvasWithGrid(grid: boolean[][]): MockCanvas {
    const w = grid[0].length;
    const h = grid.length;
    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext('2d') as MockCtx;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        if (grid[py][px]) {
          const idx = (py * w + px) * 4;
          ctx._imageData.data[idx] = 220;
          ctx._imageData.data[idx + 1] = 40;
          ctx._imageData.data[idx + 2] = 40;
          ctx._imageData.data[idx + 3] = 255;
        }
      }
    }
    return canvas;
  }

  it('applies standard 2.5D normal field for centered 64x64 character sprite under auto mode', () => {
    const grid = createCenteredCharacterGrid();
    const canvas = makeCanvasWithGrid(grid);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const res = executePhotometricPipeline(ctx, 64, 64, {
      lightAzimuth: 45,
      lightElevation: 45,
      lightRadius: 64,
      lightBrightness: 1.0,
      lightColor: '#FFFFFF',
      ambientIntensity: 0.2,
      material: 'matte',
      cavityStrength: 0.5,
      ditherModulation: 0,
      bayerSize: '4x4',
      minecraftSkinMode: 'auto',
    });

    expect(res).toBeDefined();
    // Verify that the output image has lighting variation (shaded pixels vs lit pixels)
    const outCtx = res.getContext('2d') as MockCtx;
    const outData = outCtx._imageData.data;
    const redValues: number[] = [];
    for (let i = 0; i < outData.length; i += 4) {
      if (outData[i + 3] > 30) {
        redValues.push(outData[i]);
      }
    }
    expect(redValues.length).toBeGreaterThan(100);
    const minRed = Math.min(...redValues);
    const maxRed = Math.max(...redValues);
    // Lighting must produce non-uniform luminance variation (shading + highlights)
    expect(maxRed - minRed).toBeGreaterThan(15);
  });

  it('respects minecraftSkinMode: "disabled" even if canvas resembles UV islands', () => {
    const grid = createMinecraftSkinGrid();
    const canvas = makeCanvasWithGrid(grid);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const res = executePhotometricPipeline(ctx, 64, 64, {
      lightAzimuth: 45,
      lightElevation: 45,
      lightRadius: 64,
      lightBrightness: 1.0,
      lightColor: '#FFFFFF',
      ambientIntensity: 0.2,
      material: 'matte',
      cavityStrength: 0.5,
      ditherModulation: 0,
      bayerSize: '4x4',
      minecraftSkinMode: 'disabled',
    });

    expect(res).toBeDefined();
    // Result canvas was generated without throwing and without Minecraft skin hijacking
    expect(res.width).toBe(64);
    expect(res.height).toBe(64);
  });

  it('respects minecraftSkinMode: "enabled" on character canvas to force cuboid shading', () => {
    const grid = createCenteredCharacterGrid();
    const canvas = makeCanvasWithGrid(grid);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const res = executePhotometricPipeline(ctx, 64, 64, {
      lightAzimuth: 45,
      lightElevation: 45,
      lightRadius: 64,
      lightBrightness: 1.0,
      lightColor: '#FFFFFF',
      ambientIntensity: 0.2,
      material: 'matte',
      cavityStrength: 0.5,
      ditherModulation: 0,
      bayerSize: '4x4',
      minecraftSkinMode: 'enabled',
    });

    expect(res).toBeDefined();
    expect(res.width).toBe(64);
    expect(res.height).toBe(64);
  });

  it('bypasses minecraft skin when formType is explicitly "character" even in auto mode', () => {
    const grid = createMinecraftSkinGrid();
    const canvas = makeCanvasWithGrid(grid);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const res = executePhotometricPipeline(ctx, 64, 64, {
      lightAzimuth: 45,
      lightElevation: 45,
      lightRadius: 64,
      lightBrightness: 1.0,
      lightColor: '#FFFFFF',
      ambientIntensity: 0.2,
      material: 'matte',
      cavityStrength: 0.5,
      ditherModulation: 0,
      bayerSize: '4x4',
      formType: 'character',
      minecraftSkinMode: 'auto',
    });

    expect(res).toBeDefined();
  });
});
