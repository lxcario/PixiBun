import { describe, it, expect } from 'vitest';
import { diffImageDataToOps } from '@/lib/sync/strokeDiff';
import { CrdtPixelBuffer } from '@/lib/collab/crdtPixelBuffer';

function makeImageData(
  width: number,
  height: number,
  paint: (x: number, y: number) => [number, number, number, number]
) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = paint(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return { width, height, data };
}

describe('strokeDiff: ImageData delta extraction for CRDT op broadcast', () => {
  it('returns an empty delta list for identical buffers', () => {
    const before = makeImageData(4, 4, () => [10, 20, 30, 255]);
    const after = makeImageData(4, 4, () => [10, 20, 30, 255]);
    expect(diffImageDataToOps(before, after)).toEqual([]);
  });

  it('extracts exactly the pixels that changed between snapshots', () => {
    const before = makeImageData(4, 4, () => [0, 0, 0, 0]);
    const after = makeImageData(4, 4, (x, y) =>
      x === 1 && y === 2 ? [255, 128, 0, 255] : [0, 0, 0, 0]
    );

    const deltas = diffImageDataToOps(before, after);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]).toEqual({ x: 1, y: 2, r: 255, g: 128, b: 0, a: 255 });
  });

  it('reports alpha-only changes (eraser strokes) as deltas', () => {
    const before = makeImageData(2, 1, () => [255, 0, 0, 255]);
    const after = makeImageData(2, 1, (x) => (x === 0 ? [255, 0, 0, 0] : [255, 0, 0, 255]));

    const deltas = diffImageDataToOps(before, after);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]).toMatchObject({ x: 0, y: 0, a: 0 });
  });

  it('returns an empty list when dimensions differ (resize boundary)', () => {
    const before = makeImageData(4, 4, () => [0, 0, 0, 0]);
    const after = makeImageData(8, 8, () => [0, 0, 0, 0]);
    expect(diffImageDataToOps(before, after)).toEqual([]);
  });

  it('handles full-canvas diffs (every pixel changed)', () => {
    const before = makeImageData(8, 8, () => [0, 0, 0, 0]);
    const after = makeImageData(8, 8, () => [200, 200, 200, 255]);
    expect(diffImageDataToOps(before, after)).toHaveLength(64);
  });

  it('produces deltas that round-trip through CrdtPixelBuffer', () => {
    const before = makeImageData(4, 4, () => [0, 0, 0, 0]);
    const after = makeImageData(4, 4, (x, y) =>
      (x + y) % 2 === 0 ? [10, 20, 30, 255] : [0, 0, 0, 0]
    );

    const deltas = diffImageDataToOps(before, after);
    const buffer = new CrdtPixelBuffer(4, 4, 'peer-diff');
    let applied = 0;
    for (const d of deltas) {
      if (buffer.setPixel(d.x, d.y, [d.r, d.g, d.b, d.a])) applied++;
    }
    expect(applied).toBe(deltas.length);
    expect(buffer.getPixel(0, 0)).toEqual([10, 20, 30, 255]);
    expect(buffer.getPixel(1, 0)).toEqual([0, 0, 0, 0]);
  });
});