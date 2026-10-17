import { describe, expect, it, vi } from 'vitest';
import type { AnimationFrame } from '@/types/canvas';

const composite = { data: new Uint8ClampedArray(0) };
vi.mock('@/lib/render/compositor', () => ({
  compositeFrame: vi.fn((_frames: unknown, _index: number, width: number, height: number) => ({
    getContext: () => ({ getImageData: () => ({ data: composite.data, width, height }) }),
  })),
}));

import { compositeFrame } from '@/lib/render/compositor';
import {
  describeCanvasReadout,
  formatReadoutColors,
  readActiveFrameReadout,
  summarizeCanvasPixels,
} from '@/lib/render/canvasReadout';

/** Byte-wise FNV-1a reference written independently of the module. */
function referenceDigest(width: number, height: number, rgba: number[]): string {
  const bytes: number[] = [];
  for (const value of [width, height]) bytes.push(value & 255, (value >> 8) & 255, (value >> 16) & 255, (value >> 24) & 255);
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] === 0) bytes.push(0, 0, 0, 0);
    else bytes.push(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]);
  }
  let hash = 0x811c9dc5n;
  for (const byte of bytes) hash = ((hash ^ BigInt(byte)) * 0x01000193n) & 0xffffffffn;
  return hash.toString(16).padStart(8, '0');
}

function canvas(width: number, height: number, paint: Array<[number, number, number[]]> = []): number[] {
  const rgba = new Array<number>(width * height * 4).fill(0);
  for (const [x, y, color] of paint) rgba.splice((y * width + x) * 4, 4, ...color);
  return rgba;
}

const RED = [255, 48, 48, 255];
const INK = [0, 0, 0, 255];
const GLAZE = [16, 32, 64, 128];

describe('summarizeCanvasPixels', () => {
  it('reports an empty canvas as zero painted pixels and no colors', () => {
    const rgba = canvas(32, 32);
    const summary = summarizeCanvasPixels(new Uint8ClampedArray(rgba), 32, 32);
    expect(summary).toEqual({
      width: 32,
      height: 32,
      paintedPixels: 0,
      colorCount: 0,
      topColors: [],
      digest: referenceDigest(32, 32, rgba),
    });
  });

  it('counts painted pixels and ranks colors by count then hex', () => {
    const paint: Array<[number, number, number[]]> = [];
    for (let x = 4; x < 12; x++) paint.push([x, 4, RED]);
    paint.push([0, 0, INK], [1, 0, INK], [2, 2, GLAZE], [3, 3, [0, 0, 1, 255]], [5, 5, [0, 0, 2, 255]]);
    const rgba = canvas(16, 8, paint);
    const summary = summarizeCanvasPixels(rgba, 16, 8);
    expect(summary.paintedPixels).toBe(13);
    expect(summary.colorCount).toBe(5);
    expect(summary.topColors).toEqual([
      { hex: '#ff3030', count: 8 },
      { hex: '#000000', count: 2 },
      { hex: '#000001', count: 1 },
      { hex: '#000002', count: 1 },
    ]);
    expect(summary.digest).toBe(referenceDigest(16, 8, rgba));
  });

  it('writes alpha into the hex of translucent colors only', () => {
    const summary = summarizeCanvasPixels(canvas(2, 1, [[0, 0, GLAZE], [1, 0, RED]]), 2, 1);
    expect(summary.topColors.map((color) => color.hex).sort()).toEqual(['#10204080', '#ff3030']);
  });

  it('treats any fully transparent pixel as blank for counts and digest', () => {
    const blank = canvas(4, 4);
    const erased = canvas(4, 4, [[1, 1, [200, 100, 50, 0]]]);
    const a = summarizeCanvasPixels(blank, 4, 4);
    const b = summarizeCanvasPixels(erased, 4, 4);
    expect(b.paintedPixels).toBe(0);
    expect(b.digest).toBe(a.digest);
  });

  it('changes the digest when one pixel, its position or the canvas shape changes', () => {
    const base = summarizeCanvasPixels(canvas(4, 4, [[1, 1, RED]]), 4, 4).digest;
    expect(summarizeCanvasPixels(canvas(4, 4, [[1, 1, [255, 48, 49, 255]]]), 4, 4).digest).not.toBe(base);
    expect(summarizeCanvasPixels(canvas(4, 4, [[2, 1, RED]]), 4, 4).digest).not.toBe(base);
    // Same 16 pixels as 8×2 rather than 4×4.
    expect(summarizeCanvasPixels(canvas(4, 4, [[1, 1, RED]]), 8, 2).digest).not.toBe(base);
    expect(summarizeCanvasPixels(canvas(4, 4, [[1, 1, RED]]), 4, 4).digest).toBe(base);
  });

  it('keeps the digests the testing guide and TestSprite PRD publish', () => {
    expect(summarizeCanvasPixels(canvas(32, 32), 32, 32).digest).toBe('8c00b365');
    const paint: Array<[number, number, number[]]> = [];
    for (let x = 4; x <= 11; x++) paint.push([x, 4, [0x3a, 0x2e, 0x4c, 255]]);
    expect(summarizeCanvasPixels(canvas(32, 32, paint), 32, 32).digest).toBe('f26dc755');
  });

  it('honors the top-color limit and rejects short buffers', () => {
    const rgba = canvas(3, 1, [[0, 0, RED], [1, 0, INK], [2, 0, GLAZE]]);
    expect(summarizeCanvasPixels(rgba, 3, 1, 1).topColors).toHaveLength(1);
    expect(summarizeCanvasPixels(rgba, 3, 1, 0).topColors).toEqual([]);
    expect(() => summarizeCanvasPixels(rgba, 4, 1)).toThrow(RangeError);
  });
});

describe('readout text', () => {
  const readout = {
    width: 32, height: 32, paintedPixels: 1, colorCount: 1, topColors: [{ hex: '#ff3030', count: 1 }],
    digest: '00000000', frameNumber: 2, frameCount: 3, layerName: 'Ink', layerCount: 2,
  };

  it('formats top colors as hex and count pairs', () => {
    expect(formatReadoutColors([{ hex: '#ff3030', count: 8 }, { hex: '#000000', count: 2 }])).toBe('#ff3030 8, #000000 2');
    expect(formatReadoutColors([])).toBe('none');
  });

  it('describes the frame in one sentence with singular and plural counts', () => {
    expect(describeCanvasReadout(readout)).toBe('32×32 canvas, frame 2 of 3, layer Ink: 1 painted pixel in 1 color.');
    expect(describeCanvasReadout({ ...readout, paintedPixels: 9, colorCount: 2 })).toContain('9 painted pixels in 2 colors.');
  });
});

describe('readActiveFrameReadout', () => {
  const frames = [
    { id: 'f1', durationMs: 100, layers: [{ id: 'a', name: 'Base Layer', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
    { id: 'f2', durationMs: 100, layers: [
      { id: 'b', name: 'Ink', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
      { id: 'c', name: 'Paper', visible: false, locked: false, opacity: 1, blendMode: 'source-over' },
    ] },
  ] as AnimationFrame[];

  it('summarizes the active frame composite with its frame and layer context', () => {
    composite.data = new Uint8ClampedArray(canvas(2, 2, [[0, 0, RED], [1, 1, RED]]));
    const readout = readActiveFrameReadout({ frames, activeFrameIndex: 1, activeLayerId: 'b', canvasWidth: 2, canvasHeight: 2 });
    expect(compositeFrame).toHaveBeenLastCalledWith(frames, 1, 2, 2);
    expect(readout).toMatchObject({
      paintedPixels: 2, colorCount: 1, topColors: [{ hex: '#ff3030', count: 2 }],
      frameNumber: 2, frameCount: 2, layerName: 'Ink', layerCount: 2,
    });
  });

  it('returns null for a missing frame and names a missing layer as none', () => {
    expect(readActiveFrameReadout({ frames, activeFrameIndex: 5, activeLayerId: 'a', canvasWidth: 2, canvasHeight: 2 })).toBeNull();
    composite.data = new Uint8ClampedArray(canvas(2, 2));
    expect(readActiveFrameReadout({ frames, activeFrameIndex: 0, activeLayerId: 'gone', canvasWidth: 2, canvasHeight: 2 })?.layerName).toBe('none');
  });
});
