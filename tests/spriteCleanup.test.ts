import { describe, expect, it } from 'vitest';
import { planSpriteCleanup, type SpriteCleanupOptions } from '@/lib/ai/spriteCleanup';

const options: SpriteCleanupOptions = {
  alphaCutoff: 96, maxSpeckPixels: 2, paletteSize: 24,
  simplifyColors: false, thinDarkLines: false,
};

function raster(width: number, height: number, entries: Array<[number, number, [number, number, number, number]]>) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y, color] of entries) data.set(color, (y * width + x) * 4);
  return { width, height, data };
}

function at(data: Uint8ClampedArray, width: number, x: number, y: number) {
  return Array.from(data.slice((y * width + x) * 4, (y * width + x) * 4 + 4));
}

describe('Analyze & Crisp Artwork', () => {
  it('removes faint pixels and detached noise while preserving the connected drawing and source', () => {
    const ink: [number, number, number, number] = [12, 20, 30, 255];
    const source = raster(8, 5, [
      [2, 2, ink], [3, 2, ink], [4, 2, ink], [5, 2, ink],
      [0, 0, [120, 120, 120, 50]], [7, 4, ink],
      [2, 3, [12, 20, 30, 180]],
    ]);
    const original = new Uint8ClampedArray(source.data);
    const plan = planSpriteCleanup(source, options);
    expect(plan.stats.removedFaint).toBe(1);
    expect(plan.stats.removedSpecks).toBe(1);
    expect(at(plan.data, 8, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(at(plan.data, 8, 7, 4)).toEqual([0, 0, 0, 0]);
    expect(at(plan.data, 8, 2, 3)).toEqual(ink);
    expect(source.data).toEqual(original);
  });

  it('reduces near-duplicate shades but preserves a unique saturated accent', () => {
    const source = raster(6, 1, [
      [0, 0, [250, 250, 250, 255]], [1, 0, [250, 250, 250, 255]],
      [2, 0, [245, 245, 245, 255]], [3, 0, [245, 245, 245, 255]],
      [4, 0, [18, 24, 31, 255]], [5, 0, [240, 80, 110, 255]],
    ]);
    const plan = planSpriteCleanup(source, { ...options, maxSpeckPixels: 0, simplifyColors: true, paletteSize: 2 });
    expect(plan.stats.simplifiedColors).toBeGreaterThan(0);
    expect(at(plan.data, 6, 5, 0)).toEqual([240, 80, 110, 255]);
    expect(plan.stats.resultColors).toBeLessThan(plan.stats.sourceColors);
  });

  it('reduces the inside of a thick dark outline to 1–2 px while retaining its outer edge and white fill', () => {
    const dark: [number, number, number, number] = [15, 22, 32, 255];
    const white: [number, number, number, number] = [245, 245, 245, 255];
    const entries: Array<[number, number, [number, number, number, number]]> = [];
    for (let y = 1; y <= 5; y++) for (let x = 1; x <= 5; x++) {
      entries.push([x, y, x >= 3 && x <= 4 && y >= 2 && y <= 4 ? white : dark]);
    }
    const source = raster(7, 7, entries);
    const plan = planSpriteCleanup(source, { ...options, maxSpeckPixels: 0, thinDarkLines: true });
    expect(plan.stats.thinnedLinePixels).toBeGreaterThan(0);
    expect(at(plan.data, 7, 1, 3)).toEqual(dark);
    expect(at(plan.data, 7, 2, 3)).toEqual(white);
    expect(at(plan.data, 7, 3, 3)).toEqual(white);
  });

  it('keeps a tiny drawing rather than deleting its largest component as a speck', () => {
    const source = raster(3, 3, [[1, 1, [20, 30, 40, 255]]]);
    const plan = planSpriteCleanup(source, options);
    expect(plan.stats.removedSpecks).toBe(0);
    expect(at(plan.data, 3, 1, 1)).toEqual([20, 30, 40, 255]);
  });

  it('removes fully opaque gray specks from white paper and collapses gray antialias bands', () => {
    const entries: Array<[number, number, [number, number, number, number]]> = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      entries.push([x, y, [255, 255, 255, 255]]);
    }
    entries.push([1, 1, [190, 193, 191, 255]]);
    entries.push([3, 3, [25, 30, 38, 255]]);
    entries.push([4, 3, [32, 35, 40, 255]]);
    entries.push([3, 4, [35, 38, 42, 255]]);
    entries.push([4, 4, [100, 103, 105, 255]]);
    const source = raster(8, 8, entries);
    const plan = planSpriteCleanup(source, { ...options, simplifyColors: true });
    expect(plan.stats.removedFaint).toBe(0);
    expect(plan.stats.removedSpecks).toBe(1);
    expect(at(plan.data, 8, 1, 1)).toEqual([255, 255, 255, 255]);
    expect(plan.stats.resultColors).toBeLessThan(plan.stats.sourceColors);
    expect((at(plan.data, 8, 3, 3))[3]).toBe(255);
  });

  it('reduces a many-gray opaque raster without deleting an isolated saturated accent', () => {
    const entries: Array<[number, number, [number, number, number, number]]> = [];
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
      entries.push([x, y, [255, 255, 255, 255]]);
    }
    for (let x = 3; x < 17; x++) {
      entries.push([x, 7, [20 + x * 4, 22 + x * 4, 24 + x * 4, 255]]);
      entries.push([x, 8, [100 + x * 6, 102 + x * 6, 104 + x * 6, 255]]);
    }
    entries.push([2, 2, [180, 182, 181, 255]]);
    entries.push([10, 12, [245, 70, 115, 255]]);
    const plan = planSpriteCleanup(raster(20, 20, entries), {
      ...options, simplifyColors: true, thinDarkLines: false,
    });
    expect(plan.stats.sourceColors).toBeGreaterThan(20);
    expect(plan.stats.resultColors).toBeLessThanOrEqual(5);
    expect(at(plan.data, 20, 2, 2)).toEqual([255, 255, 255, 255]);
    expect(at(plan.data, 20, 10, 12)).toEqual([245, 70, 115, 255]);
  });
});
