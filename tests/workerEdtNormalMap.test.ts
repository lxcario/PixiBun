import { describe, it, expect } from 'vitest';
import { runEdtNormalMapInWorker } from '@/lib/engine/workerDispatcher';

describe('Web Worker Offloading - EDT Normal Map', () => {
  it('computes 2.5D EDT normal map via workerDispatcher (with automatic sync fallback in test runner)', async () => {
    const width = 16;
    const height = 16;
    const rgba = new Uint8ClampedArray(width * height * 4);

    // Create an 8x8 filled square in the center
    for (let y = 4; y < 12; y++) {
      for (let x = 4; x < 12; x++) {
        const idx = (y * width + x) * 4;
        rgba[idx] = 255;
        rgba[idx + 1] = 100;
        rgba[idx + 2] = 50;
        rgba[idx + 3] = 255; // Opaque
      }
    }

    const result = await runEdtNormalMapInWorker(rgba, width, height, {
      depthScale: 2.0,
    });

    expect(result.width).toBe(width);
    expect(result.height).toBe(height);
    expect(result.data.length).toBe(width * height * 4);

    // Transparent area should be transparent normal map
    expect(result.data[3]).toBe(0);

    // Center of the square (e.g. x=8, y=8) should face straight outward (+Z): normal ~ (0, 0, 1) -> RGB ~ (128, 128, 255)
    const centerIdx = (8 * width + 8) * 4;
    expect(result.data[centerIdx + 3]).toBe(255); // Opaque
    expect(result.data[centerIdx + 2]).toBeGreaterThan(200); // Blue (Z axis) dominant
  });

  it('supports minecraft skin normal field generation option', async () => {
    const width = 64;
    const height = 64;
    const rgba = new Uint8ClampedArray(width * height * 4);
    rgba.fill(255); // Fully opaque canvas

    const result = await runEdtNormalMapInWorker(rgba, width, height, {
      isMinecraftSkin: true,
    });

    expect(result.width).toBe(64);
    expect(result.height).toBe(64);
    expect(result.data.length).toBe(64 * 64 * 4);
    // Verified non-empty normal map
    expect(result.data.some((b) => b > 0)).toBe(true);
  });
});
