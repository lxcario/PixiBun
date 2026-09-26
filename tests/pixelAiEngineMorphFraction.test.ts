import { describe, it, expect } from 'vitest';
import {
  morphInBetweenFrameAtFraction,
  morphInBetweenFramesSync,
  morphInBetweenFrames,
} from '@/lib/ai/pixelAiEngine';

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

function makeMockCanvas(width: number, height: number, initialData?: Uint8ClampedArray) {
  let _imageData = new FakeImageData(width, height);
  if (initialData) {
    _imageData.data.set(initialData);
  }
  const ctx = {
    imageSmoothingEnabled: false,
    getImageData: () => _imageData,
    createImageData: (w: number, h: number) => new FakeImageData(w, h),
    putImageData: (data: FakeImageData) => {
      _imageData = data;
    },
  };
  const canvas = {
    width,
    height,
    getContext: () => ctx,
  };
  return { canvas, ctx, get data() { return _imageData.data; } };
}

describe('In-Between Frame Morphing with Fraction & Multi-Source BFS', () => {
  // Simple 4x4 test frames
  // Frame A: Red 2x2 square in top-left
  // Frame B: Blue 2x2 square in bottom-right
  const width = 4;
  const height = 4;
  const dataA = new Uint8ClampedArray(width * height * 4);
  const dataB = new Uint8ClampedArray(width * height * 4);

  // Frame A: Red 3x3 square in top-left (0..2, 0..2)
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const idx = (y * width + x) * 4;
      dataA[idx] = 255;
      dataA[idx + 3] = 255;
    }
  }

  // Frame B: Blue 3x3 square in bottom-right (1..3, 1..3)
  for (let y = 1; y < 4; y++) {
    for (let x = 1; x < 4; x++) {
      const idx = (y * width + x) * 4;
      dataB[idx + 2] = 255;
      dataB[idx + 3] = 255;
    }
  }

  it('returns exact clone of frameA when fraction is 0', () => {
    const res = morphInBetweenFrameAtFraction(
      { width, height, data: dataA },
      { width, height, data: dataB },
      0
    );
    expect(res.width).toBe(width);
    expect(res.height).toBe(height);
    expect(Array.from(res.data)).toEqual(Array.from(dataA));
  });

  it('returns exact clone of frameB when fraction is 1', () => {
    const res = morphInBetweenFrameAtFraction(
      { width, height, data: dataA },
      { width, height, data: dataB },
      1
    );
    expect(res.width).toBe(width);
    expect(res.height).toBe(height);
    expect(Array.from(res.data)).toEqual(Array.from(dataB));
  });

  it('interpolates colors smoothly at fraction 0.5', () => {
    const res = morphInBetweenFrameAtFraction(
      { width, height, data: dataA },
      { width, height, data: dataB },
      0.5
    );
    expect(res.width).toBe(width);
    expect(res.height).toBe(height);

    // Some intermediate pixels should be opaque
    let opaqueCount = 0;
    for (let i = 0; i < width * height; i++) {
      if (res.data[i * 4 + 3] > 0) {
        opaqueCount++;
      }
    }
    expect(opaqueCount).toBeGreaterThan(0);
  });

  it('preserves intermediate alpha and rejects mismatched frame dimensions', () => {
    const translucentA = new Uint8ClampedArray(dataA);
    const translucentB = new Uint8ClampedArray(dataB);
    for (let i = 3; i < translucentA.length; i += 4) {
      if (translucentA[i] > 0) translucentA[i] = 64;
      if (translucentB[i] > 0) translucentB[i] = 192;
    }
    const frameA = { width, height, data: translucentA };
    const frameB = { width, height, data: translucentB };
    const middle = morphInBetweenFrameAtFraction(frameA, frameB, 0.5);
    expect(middle.data[(1 * width + 1) * 4 + 3]).toBe(128);
    expect(morphInBetweenFramesSync(frameA, frameB, 1)[0].data[(1 * width + 1) * 4 + 3]).toBe(128);

    expect(() => morphInBetweenFrameAtFraction(frameA, { ...frameB, width: width + 1 }, 0.5)).toThrow(RangeError);
    expect(() => morphInBetweenFramesSync(frameA, { ...frameB, width: width + 1 }, 1)).toThrow(RangeError);
  });

  it('morphInBetweenFrames respects arbitrary t parameter instead of hardcoding 0.5', () => {
    const originalCreateElement = globalThis.document?.createElement;
    const docShim = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return makeMockCanvas(1, 1).canvas;
        }
        return {};
      },
    };
    (globalThis as unknown as { document: unknown }).document = docShim;

    try {
      const mockA = makeMockCanvas(width, height, dataA);
      const mockB = makeMockCanvas(width, height, dataB);

      const frameAt0 = morphInBetweenFrames(
        mockA.ctx as unknown as CanvasRenderingContext2D,
        mockB.ctx as unknown as CanvasRenderingContext2D,
        width,
        height,
        0
      );
      const ctx0 = frameAt0.getContext('2d')!;
      const img0 = ctx0.getImageData(0, 0, width, height);
      expect(Array.from(img0.data)).toEqual(Array.from(dataA));

      const frameAt1 = morphInBetweenFrames(
        mockA.ctx as unknown as CanvasRenderingContext2D,
        mockB.ctx as unknown as CanvasRenderingContext2D,
        width,
        height,
        1
      );
      const ctx1 = frameAt1.getContext('2d')!;
      const img1 = ctx1.getImageData(0, 0, width, height);
      expect(Array.from(img1.data)).toEqual(Array.from(dataB));
    } finally {
      if (originalCreateElement) {
        (globalThis as unknown as { document: unknown }).document = { createElement: originalCreateElement };
      }
    }
  });

  it('morphInBetweenFramesSync outputs correct number of intermediate steps', () => {
    const results = morphInBetweenFramesSync(
      { width, height, data: dataA },
      { width, height, data: dataB },
      3
    );
    expect(results.length).toBe(3);
    for (const r of results) {
      expect(r.width).toBe(width);
      expect(r.height).toBe(height);
      expect(r.data.length).toBe(width * height * 4);
    }
  });
});
