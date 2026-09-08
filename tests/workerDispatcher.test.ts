import { describe, it, expect } from 'vitest';
import {
  runRotSpriteInWorker,
  runWfcInWorker,
  runMorphInWorker,
} from '@/lib/engine/workerDispatcher';

describe('workerDispatcher sync fallback and execution', () => {
  it('runRotSpriteInWorker successfully executes via sync fallback in node/vitest', async () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255,
      0, 0, 255, 255, 255, 255, 0, 255,
    ]);
    const src = { width: 2, height: 2, data };

    const result = await runRotSpriteInWorker(src, Math.PI / 2);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.data.length).toBe(16);
  });

  it('runWfcInWorker successfully executes via sync fallback', async () => {
    const sampleData = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255,
      0, 0, 255, 255, 255, 255, 0, 255,
    ]);
    const input = {
      sampleData,
      sampleWidth: 2,
      sampleHeight: 2,
      outputWidth: 4,
      outputHeight: 4,
    };

    const result = await runWfcInWorker(input, { N: 2, seed: 123 });
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    expect(result.data.length).toBe(4 * 4 * 4);
  });

  it('runMorphInWorker successfully executes via sync fallback', async () => {
    const frameA = {
      width: 4,
      height: 4,
      data: new Uint8ClampedArray(4 * 4 * 4).fill(100),
    };
    const frameB = {
      width: 4,
      height: 4,
      data: new Uint8ClampedArray(4 * 4 * 4).fill(200),
    };

    const result = await runMorphInWorker(frameA, frameB, 1);
    expect(result).toHaveLength(1);
    expect(result[0].width).toBe(4);
    expect(result[0].height).toBe(4);
  });

  it('runRotSpriteInWorker forwards expanded target dimensions and pivot coordinates', async () => {
    const data = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    const src = { width: 4, height: 4, data };

    const result = await runRotSpriteInWorker(
      src,
      Math.PI / 4,
      2,
      2,
      8,
      8,
      4,
      4
    );
    expect(result.width).toBe(8);
    expect(result.height).toBe(8);
    expect(result.data.length).toBe(8 * 8 * 4);
  });
});
