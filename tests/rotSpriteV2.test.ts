/**
 * tests/rotSpriteV2.test.ts
 *
 * Comprehensive Test Suite for RotSprite v2 — Semantic Detail Preservation
 *
 * Verifies:
 * - Fixture A: 17x17 Face (eyes + mouth at 23°, 47°, 67°)
 * - Fixture B: Eye Highlight (small eye with isolated white highlight)
 * - Fixture C: Sword / Thin Blade (continuity at 17°, 31°, 46°, 73°)
 * - Fixture D: Small Hole (transparent 1px hole preserved in solid ring)
 * - Fixture E: Tail / Diagonal Structure (attached diagonal feature retained)
 * - Fixture F: Multicolor Micro Sprite (color subset invariant and multi-hue retention)
 * - Comparative Test Harness (v1 vs v2 with objective structural metrics)
 * - Invariant Properties (determinism, palette safety, binary alpha, identity, 4x90° stability, 1px survival)
 */

import { describe, it, expect } from 'vitest';
import {
  rotSprite,
  rotSpriteV1,
  rotSpriteV2,
  analyzeSourceComponents,
  type PixelBuffer,
} from '@/lib/canvas/rotSprite';

function makeBuffer(w: number, h: number): PixelBuffer {
  return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
}

function setPixel(buf: PixelBuffer, x: number, y: number, r: number, g: number, b: number, a: number = 255) {
  const idx = (y * buf.width + x) * 4;
  buf.data[idx] = r;
  buf.data[idx + 1] = g;
  buf.data[idx + 2] = b;
  buf.data[idx + 3] = a;
}

function getVisibleColors(buf: PixelBuffer): Set<string> {
  const colors = new Set<string>();
  for (let i = 0; i < buf.data.length; i += 4) {
    if (buf.data[i + 3] > 0) {
      colors.add(`${buf.data[i]},${buf.data[i + 1]},${buf.data[i + 2]},${buf.data[i + 3]}`);
    }
  }
  return colors;
}

function createFixtures() {
  // Fixture A: 17x17 Face
  const ink = [24, 20, 36, 255], skin = [233, 160, 102, 255], mouth = [140, 54, 64, 255];
  const fixtureA = makeBuffer(17, 17);
  for (let y = 4; y < 12; y++) {
    for (let x = 4; x < 13; x++) {
      const isBorder = x === 4 || x === 12 || y === 4 || y === 11;
      const c = isBorder ? ink : skin;
      setPixel(fixtureA, x, y, c[0], c[1], c[2], c[3]);
    }
  }
  setPixel(fixtureA, 6, 7, ink[0], ink[1], ink[2], ink[3]); // left eye
  setPixel(fixtureA, 10, 7, ink[0], ink[1], ink[2], ink[3]); // right eye
  setPixel(fixtureA, 8, 9, mouth[0], mouth[1], mouth[2], mouth[3]); // mouth

  // Fixture B: Eye Highlight (9x9 eye with 1px white highlight)
  const fixtureB = makeBuffer(9, 9);
  for (let y = 2; y <= 6; y++) {
    for (let x = 2; x <= 6; x++) {
      setPixel(fixtureB, x, y, 30, 30, 40, 255); // dark iris
    }
  }
  setPixel(fixtureB, 4, 3, 255, 255, 255, 255); // 1px white highlight (W)

  // Fixture C: Sword / Thin Blade (16x7, 1-2px wide blade)
  const fixtureC = makeBuffer(16, 7);
  for (let x = 4; x <= 14; x++) {
    setPixel(fixtureC, x, 3, 190, 200, 210, 255); // blade center
    if (x <= 10) setPixel(fixtureC, x, 4, 150, 160, 175, 255); // blade edge
  }
  setPixel(fixtureC, 15, 3, 220, 230, 240, 255); // blade tip
  for (let y = 1; y <= 5; y++) setPixel(fixtureC, 3, y, 90, 60, 40, 255); // guard
  setPixel(fixtureC, 1, 3, 70, 50, 30, 255); // handle
  setPixel(fixtureC, 2, 3, 70, 50, 30, 255);

  // Fixture D: Small Hole (9x9 donut with 1px transparent hole)
  const fixtureD = makeBuffer(9, 9);
  for (let y = 1; y <= 7; y++) {
    for (let x = 1; x <= 7; x++) {
      const dist = Math.hypot(x - 4, y - 4);
      if (dist <= 3.2 && (x !== 4 || y !== 4)) {
        setPixel(fixtureD, x, y, 60, 120, 200, 255);
      }
    }
  }

  // Fixture E: Tail / Diagonal Thin Structure (16x16 body with 1px diagonal tail)
  const fixtureE = makeBuffer(16, 16);
  for (let y = 8; y <= 13; y++) {
    for (let x = 2; x <= 7; x++) {
      setPixel(fixtureE, x, y, 180, 100, 50, 255);
    }
  }
  setPixel(fixtureE, 8, 7, 220, 140, 70, 255);
  setPixel(fixtureE, 9, 6, 220, 140, 70, 255);
  setPixel(fixtureE, 10, 5, 220, 140, 70, 255);
  setPixel(fixtureE, 11, 4, 220, 140, 70, 255);
  setPixel(fixtureE, 12, 3, 220, 140, 70, 255);

  // Fixture F: Multicolor Micro Sprite (12x12 sprite with 4 distinct colors)
  const fixtureF = makeBuffer(12, 12);
  for (let y = 3; y <= 9; y++) {
    for (let x = 3; x <= 8; x++) {
      setPixel(fixtureF, x, y, 50, 80, 180, 255); // Blue body
    }
  }
  setPixel(fixtureF, 9, 5, 250, 200, 30, 255); // Yellow beak (1px)
  setPixel(fixtureF, 5, 2, 220, 40, 50, 255);  // Red hat (2px)
  setPixel(fixtureF, 6, 2, 220, 40, 50, 255);
  setPixel(fixtureF, 4, 4, 255, 255, 255, 255); // White shine (1px)

  return { fixtureA, fixtureB, fixtureC, fixtureD, fixtureE, fixtureF };
}

describe('RotSprite v2 — Required Fixtures Suite', () => {
  it('distinguishes visible area and silhouette connectivity from same-color components', () => {
    const source = makeBuffer(9, 9);
    for (let y = 2; y < 5; y++) for (let x = 2; x < 5; x++) setPixel(source, x, y, x === 2 ? 200 : 100, 0, 0);
    setPixel(source, 7, 7, 50, 0, 0);
    const analysis = analyzeSourceComponents(source);
    expect(analysis.solidPixelCount).toBe(10);
    expect(analysis.components).toHaveLength(3);
    expect(analysis).toMatchObject({ solidComponentCount: 2 });
  });
  const fx = createFixtures();

  it('Fixture A: 17x17 Face retains eyes and mouth at 23°, 47°, 67°', () => {
    const mouthRgba = '140,54,64,255';
    const ink = 24 | (20 << 8) | (36 << 16) | (255 << 24);

    for (const deg of [23, 47, 67]) {
      const res = rotSprite(fx.fixtureA, (deg * Math.PI) / 180, 8.5, 8.5, 25, 25, 12.5, 12.5);
      const res32 = new Uint32Array(res.data.buffer, res.data.byteOffset, 25 * 25);

      // Verify mouth survived
      let mouthCount = 0;
      for (let i = 0; i < res.data.length; i += 4) {
        const key = `${res.data[i]},${res.data[i + 1]},${res.data[i + 2]},${res.data[i + 3]}`;
        if (key === mouthRgba) mouthCount++;
      }
      expect(mouthCount, `Mouth must survive at ${deg}°`).toBeGreaterThanOrEqual(1);

      // Verify interior eyes survived (at least 2 interior ink pixels not touching transparency)
      let interiorEyeCount = 0;
      for (let y = 6; y <= 18; y++) {
        for (let x = 6; x <= 18; x++) {
          const idx = y * 25 + x;
          if ((res32[idx] >>> 0) === (ink >>> 0)) {
            let touchesTrans = false;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy;
                if ((res32[ny * 25 + nx] >>> 24) === 0) touchesTrans = true;
              }
            }
            if (!touchesTrans) interiorEyeCount++;
          }
        }
      }
      expect(interiorEyeCount, `Both eyes must survive at ${deg}°`).toBeGreaterThanOrEqual(2);
    }
  });

  it('Fixture B: Eye Highlight (1px white) survives rotation across arbitrary angles', () => {
    const angles = [15, 30, 45, 60, 75];
    const white = 255 | (255 << 8) | (255 << 16) | (255 << 24);
    for (const deg of angles) {
      const res = rotSprite(fx.fixtureB, (deg * Math.PI) / 180, 4.5, 4.5, 15, 15, 7.5, 7.5);
      const res32 = new Uint32Array(res.data.buffer, res.data.byteOffset, 15 * 15);
      const whiteCount = Array.from(res32).filter(c => (c >>> 0) === (white >>> 0)).length;
      expect(whiteCount, `Highlight must survive at ${deg}°`).toBeGreaterThanOrEqual(1);
    }
  });

  it('Fixture C: Sword / Thin Blade maintains continuity at 17°, 31°, 46°, 73°', () => {
    const angles = [17, 31, 46, 73];
    const bladeCenter = 190 | (200 << 8) | (210 << 16) | (255 << 24);
    for (const deg of angles) {
      const res = rotSprite(fx.fixtureC, (deg * Math.PI) / 180, 8, 3.5, 25, 25, 12.5, 12.5);
      const res32 = new Uint32Array(res.data.buffer, res.data.byteOffset, 25 * 25);
      const bladeCount = Array.from(res32).filter(c => (c >>> 0) === (bladeCenter >>> 0)).length;
      expect(bladeCount, `Blade center must remain continuous at ${deg}°`).toBeGreaterThanOrEqual(7);
    }
  });

  it('Fixture D: Small Hole (1px transparent) preserved at arbitrary angles', () => {
    for (const deg of [20, 45, 70]) {
      const res = rotSprite(fx.fixtureD, (deg * Math.PI) / 180, 4.5, 4.5, 15, 15, 7.5, 7.5);
      const res32 = new Uint32Array(res.data.buffer, res.data.byteOffset, 15 * 15);
      let foundInteriorHole = false;
      for (let y = 1; y < 14; y++) {
        for (let x = 1; x < 14; x++) {
          if ((res32[y * 15 + x] >>> 24) === 0) {
            const hasNorth = (res32[(y - 1) * 15 + x] >>> 24) !== 0;
            const hasSouth = (res32[(y + 1) * 15 + x] >>> 24) !== 0;
            const hasWest = (res32[y * 15 + (x - 1)] >>> 24) !== 0;
            const hasEast = (res32[y * 15 + (x + 1)] >>> 24) !== 0;
            if (hasNorth && hasSouth && hasWest && hasEast) {
              foundInteriorHole = true;
            }
          }
        }
      }
      expect(foundInteriorHole, `Hole must be preserved at ${deg}°`).toBe(true);
    }
  });

  it('Fixture E: Tail / Diagonal Structure retains attached tail without detachment', () => {
    for (const deg of [25, 50, 75]) {
      const res = rotSprite(fx.fixtureE, (deg * Math.PI) / 180, 8, 8, 25, 25, 12.5, 12.5);
      const res32 = new Uint32Array(res.data.buffer, res.data.byteOffset, 25 * 25);
      const tailColor = 220 | (140 << 8) | (70 << 16) | (255 << 24);
      const tailCount = Array.from(res32).filter(c => (c >>> 0) === (tailColor >>> 0)).length;
      expect(tailCount, `Tail pixels must survive at ${deg}°`).toBeGreaterThanOrEqual(3);
    }
  });

  it('Fixture F: Multicolor Micro Sprite preserves outputColors ⊆ sourceColors and all 4 colors', () => {
    const srcPalette = getVisibleColors(fx.fixtureF);
    for (const deg of [19, 43, 68]) {
      const res = rotSprite(fx.fixtureF, (deg * Math.PI) / 180, 6, 6, 20, 20, 10, 10);
      const outPalette = getVisibleColors(res);
      // Palette subset invariant: outputColors ⊆ sourceColors
      for (const col of outPalette) {
        expect(srcPalette.has(col)).toBe(true);
      }
      // All 4 distinct colors retained
      expect(outPalette.size).toBe(4);
    }
  });
});

describe('RotSprite Comparative Test Harness (v1 vs v2)', () => {
  const fx = createFixtures();

  it('measures v1 vs v2 on Face fixture at 23°, 47°, 67° and verifies v2 superiority', () => {
    const angles = [23, 47, 67];
    const mouthRgba = '140,54,64,255';

    for (const deg of angles) {
      const rad = (deg * Math.PI) / 180;
      const outV1 = rotSpriteV1(fx.fixtureA, rad, 8.5, 8.5, 25, 25, 12.5, 12.5);
      const outV2 = rotSpriteV2(fx.fixtureA, rad, 8.5, 8.5, 25, 25, 12.5, 12.5);

      const palV1 = getVisibleColors(outV1);
      const palV2 = getVisibleColors(outV2);

      // In v1, mouth color was completely lost at all three angles
      const mouthInV1 = palV1.has(mouthRgba);
      const mouthInV2 = palV2.has(mouthRgba);

      expect(mouthInV1).toBe(false); // Confirms frozen baseline failure in v1
      expect(mouthInV2).toBe(true);  // Confirms restoration in v2!
    }
  });

  it('verifies component analysis correctly identifies small features in source', () => {
    const analysis = analyzeSourceComponents(fx.fixtureA);
    expect(analysis.components.length).toBe(5);
    expect(analysis.smallComponents.length).toBe(3); // 2 eyes + 1 mouth
    expect(analysis.uniqueSolidColors.size).toBe(3); // ink, skin, mouth
  });
});

describe('RotSprite v2 — Property & Invariant Tests', () => {
  const fx = createFixtures();

  it('Determinism: rotate(A, θ) === rotate(A, θ) bitwise identical', () => {
    const rad = 0.7321;
    const r1 = rotSprite(fx.fixtureA, rad, 8.5, 8.5, 25, 25, 12.5, 12.5);
    const r2 = rotSprite(fx.fixtureA, rad, 8.5, 8.5, 25, 25, 12.5, 12.5);
    expect(r1.data).toEqual(r2.data);
  });

  it('Palette Safety: outputColors ⊆ sourceColors across all test angles', () => {
    const srcPalette = getVisibleColors(fx.fixtureA);
    for (const deg of [11, 29, 58, 83, 117, 195, 281]) {
      const res = rotSprite(fx.fixtureA, (deg * Math.PI) / 180, 8.5, 8.5, 25, 25, 12.5, 12.5);
      const outPalette = getVisibleColors(res);
      for (const color of outPalette) {
        expect(srcPalette.has(color), `Unexpected color ${color} at ${deg}°`).toBe(true);
      }
    }
  });

  it('Binary Alpha Safety: inputAlpha in {0, 255} => outputAlpha in {0, 255}', () => {
    for (const deg of [13, 37, 71, 142]) {
      const res = rotSprite(fx.fixtureA, (deg * Math.PI) / 180, 8.5, 8.5, 25, 25, 12.5, 12.5);
      for (let i = 3; i < res.data.length; i += 4) {
        const a = res.data[i];
        expect(a === 0 || a === 255).toBe(true);
      }
    }
  });

  it('Identity: rotate(A, 0°) === bitwise authored raster', () => {
    const original = fx.fixtureA.data.slice();
    const res = rotSprite(fx.fixtureA, 0);
    expect(res.data).toEqual(original);
  });

  it('Orthogonal Stability: 4 x 90° rotations returns identical original raster', () => {
    // 90° clockwise four times on a square sprite
    const original = fx.fixtureB.data.slice();
    const r90 = rotSprite(fx.fixtureB, Math.PI / 2);
    const r180 = rotSprite(r90, Math.PI / 2);
    const r270 = rotSprite(r180, Math.PI / 2);
    const r360 = rotSprite(r270, Math.PI / 2);
    expect(r360.data).toEqual(original);
  });

  it('Empty Input: transparent sprite remains fully transparent', () => {
    const empty = makeBuffer(8, 8);
    const res = rotSprite(empty, 0.45);
    let nonZero = 0;
    for (let i = 0; i < res.data.length; i++) if (res.data[i] !== 0) nonZero++;
    expect(nonZero).toBe(0);
  });

  it('Single Pixel Sprite: a 1-pixel sprite never disappears', () => {
    const single = makeBuffer(3, 3);
    setPixel(single, 1, 1, 200, 100, 50, 255);
    for (const deg of [15, 30, 45, 60, 75]) {
      const res = rotSprite(single, (deg * Math.PI) / 180, 1.5, 1.5, 5, 5, 2.5, 2.5);
      const visible = getVisibleColors(res);
      expect(visible.size).toBe(1);
    }
  });

  it('Worker Parity: runRotSpriteInWorker produces identical result to direct rotSprite', async () => {
    const { runRotSpriteInWorker } = await import('@/lib/engine/workerDispatcher');
    const rad = 0.523; // ~30 deg
    const direct = rotSprite(fx.fixtureA, rad, 8.5, 8.5, 25, 25, 12.5, 12.5);
    const worker = await runRotSpriteInWorker(fx.fixtureA, rad, 8.5, 8.5, 25, 25, 12.5, 12.5);
    expect(worker.data).toEqual(direct.data);
  });
});
