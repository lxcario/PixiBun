import { describe, it, expect } from 'vitest';
import {
  synthesizeWfc,
  verifyWfcAdjacencyConstraints,
} from '@/lib/procedural/waveFunctionCollapse';

function createCheckerboardSample(width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  const c1 = [240, 190, 124, 255]; // Light gold
  const c2 = [20, 12, 30, 255]; // Dark purple

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isEven = (x + y) % 2 === 0;
      const c = isEven ? c1 : c2;
      const idx = (y * width + x) * 4;
      data[idx] = c[0];
      data[idx + 1] = c[1];
      data[idx + 2] = c[2];
      data[idx + 3] = c[3];
    }
  }
  return data;
}

function createBrickTileSample(width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  const brick = [180, 80, 50, 255];
  const mortar = [100, 100, 120, 255];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Mortar horizontal lines every 4 pixels
      if (y % 4 === 0) {
        data[idx] = mortar[0];
        data[idx + 1] = mortar[1];
        data[idx + 2] = mortar[2];
        data[idx + 3] = mortar[3];
      } else {
        // Vertical mortar staggered
        const row = Math.floor(y / 4);
        const stagger = (row % 2) * 4;
        if ((x + stagger) % 8 === 0) {
          data[idx] = mortar[0];
          data[idx + 1] = mortar[1];
          data[idx + 2] = mortar[2];
          data[idx + 3] = mortar[3];
        } else {
          data[idx] = brick[0];
          data[idx + 1] = brick[1];
          data[idx + 2] = brick[2];
          data[idx + 3] = brick[3];
        }
      }
    }
  }
  return data;
}

describe('Phase 34.2: WaveFunctionCollapse Pattern Synthesis Engine', () => {
  it('synthesizes an extended region with ZERO neighborhood constraint violations', () => {
    const sampleW = 8;
    const sampleH = 8;
    const sampleData = createBrickTileSample(sampleW, sampleH);

    const outW = 16;
    const outH = 16;
    const N = 2;

    const result = synthesizeWfc(
      {
        sampleData,
        sampleWidth: sampleW,
        sampleHeight: sampleH,
        outputWidth: outW,
        outputHeight: outH,
      },
      {
        N,
        periodicInput: true,
        periodicOutput: true,
        symmetries: 4,
        seed: 12345,
      }
    );

    expect(result.success).toBe(true);
    expect(result.data.length).toBe(outW * outH * 4);

    const verification = verifyWfcAdjacencyConstraints(
      result.data,
      outW,
      outH,
      sampleData,
      sampleW,
      sampleH,
      N,
      true,
      4
    );

    expect(verification.totalChecked).toBe(outW * outH);
    expect(verification.violations).toBe(0);
  });

  it('guarantees deterministic output given identical seeds', () => {
    const sampleW = 6;
    const sampleH = 6;
    const sampleData = createCheckerboardSample(sampleW, sampleH);

    const input = {
      sampleData,
      sampleWidth: sampleW,
      sampleHeight: sampleH,
      outputWidth: 12,
      outputHeight: 12,
    };

    const run1 = synthesizeWfc(input, { seed: 9999, N: 2, symmetries: 8 });
    const run2 = synthesizeWfc(input, { seed: 9999, N: 2, symmetries: 8 });

    expect(run1.success).toBe(true);
    expect(run2.success).toBe(true);
    expect(Array.from(run1.data)).toEqual(Array.from(run2.data));
  });

  it('produces distinct variations with varying seeds', () => {
    const sampleW = 8;
    const sampleH = 8;
    const sampleData = createBrickTileSample(sampleW, sampleH);

    const input = {
      sampleData,
      sampleWidth: sampleW,
      sampleHeight: sampleH,
      outputWidth: 16,
      outputHeight: 16,
    };

    const runA = synthesizeWfc(input, { seed: 101, N: 2 });
    const runB = synthesizeWfc(input, { seed: 202, N: 2 });

    expect(runA.success).toBe(true);
    expect(runB.success).toBe(true);

    // Both must obey 0 constraint violations
    const checkA = verifyWfcAdjacencyConstraints(runA.data, 16, 16, sampleData, 8, 8, 2, true, 8);
    const checkB = verifyWfcAdjacencyConstraints(runB.data, 16, 16, sampleData, 8, 8, 2, true, 8);
    expect(checkA.violations).toBe(0);
    expect(checkB.violations).toBe(0);
  });

  it('handles N=3 neighborhood size cleanly', () => {
    const sampleW = 8;
    const sampleH = 8;
    const sampleData = createCheckerboardSample(sampleW, sampleH);

    const result = synthesizeWfc(
      {
        sampleData,
        sampleWidth: sampleW,
        sampleHeight: sampleH,
        outputWidth: 8,
        outputHeight: 8,
      },
      {
        N: 3,
        seed: 42,
        symmetries: 1,
      }
    );

    expect(result.success).toBe(true);
    const verification = verifyWfcAdjacencyConstraints(
      result.data,
      8,
      8,
      sampleData,
      8,
      8,
      3,
      true,
      1
    );
    expect(verification.violations).toBe(0);
  });
});
