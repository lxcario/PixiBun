import { describe, it, expect } from 'vitest';
import { rotSprite, PixelBuffer } from '@/lib/canvas/rotSprite';
import { rotateWithRotSprite } from '@/lib/ai/math/rotSprite';

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

function makeMockCanvas(width: number, height: number) {
  let _imageData = new FakeImageData(width, height);
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

describe('RotSprite Rectangular Fast Paths', () => {
  describe('rotSprite (PixelBuffer pipeline)', () => {
    // 3x2 image:
    // Row 0: [R, G, B]
    // Row 1: [Y, M, C]
    const w = 3;
    const h = 2;
    const srcData = new Uint8ClampedArray(w * h * 4);
    // (0,0) Red
    srcData[0] = 255; srcData[3] = 255;
    // (1,0) Green
    srcData[5] = 255; srcData[7] = 255;
    // (2,0) Blue
    srcData[10] = 255; srcData[11] = 255;
    // (0,1) Yellow (R+G)
    srcData[12] = 255; srcData[13] = 255; srcData[15] = 255;
    // (1,1) Magenta (R+B)
    srcData[16] = 255; srcData[18] = 255; srcData[19] = 255;
    // (2,1) Cyan (G+B)
    srcData[21] = 255; srcData[22] = 255; srcData[23] = 255;

    const src: PixelBuffer = { width: w, height: h, data: srcData };

    it('rotates rectangular buffer 90° clockwise with transposed dimensions', () => {
      const res = rotSprite(src, Math.PI / 2);
      expect(res.width).toBe(2);
      expect(res.height).toBe(3);

      // (0,1) Yellow moves to (0,0) in out (x'=h-1-y=0, y'=x=0)
      const outIdx00 = (0 * 2 + 0) * 4;
      expect(res.data[outIdx00]).toBe(255); // R
      expect(res.data[outIdx00 + 1]).toBe(255); // G

      // (0,0) Red moves to (1,0) in out (x'=h-1-y=1, y'=x=0)
      const outIdx10 = (0 * 2 + 1) * 4;
      expect(res.data[outIdx10]).toBe(255); // R
      expect(res.data[outIdx10 + 1]).toBe(0);

      // (2,1) Cyan moves to (0,2) in out (x'=h-1-y=0, y'=x=2)
      const outIdx02 = (2 * 2 + 0) * 4;
      expect(res.data[outIdx02 + 1]).toBe(255); // G
      expect(res.data[outIdx02 + 2]).toBe(255); // B
    });

    it('rotates rectangular buffer 270° clockwise with transposed dimensions', () => {
      const res = rotSprite(src, (3 * Math.PI) / 2);
      expect(res.width).toBe(2);
      expect(res.height).toBe(3);

      // (2,0) Blue moves to (0,0) in out (x'=y=0, y'=w-1-x=0)
      const outIdx00 = (0 * 2 + 0) * 4;
      expect(res.data[outIdx00 + 2]).toBe(255); // B

      // (2,1) Cyan moves to (1,0) in out (x'=y=1, y'=w-1-x=0)
      const outIdx10 = (0 * 2 + 1) * 4;
      expect(res.data[outIdx10 + 1]).toBe(255); // G
      expect(res.data[outIdx10 + 2]).toBe(255); // B

      // (0,0) Red moves to (0,2) in out (x'=y=0, y'=w-1-x=2)
      const outIdx02 = (2 * 2 + 0) * 4;
      expect(res.data[outIdx02]).toBe(255); // R
      expect(res.data[outIdx02 + 1]).toBe(0);
    });

    it('rotates rectangular buffer 180° preserving dimensions', () => {
      const res = rotSprite(src, Math.PI);
      expect(res.width).toBe(3);
      expect(res.height).toBe(2);

      // (0,0) Red moves to (2,1)
      const outIdx21 = (1 * 3 + 2) * 4;
      expect(res.data[outIdx21]).toBe(255);
      expect(res.data[outIdx21 + 1]).toBe(0);
    });
  });

  describe('rotateWithRotSprite (HTMLCanvasElement pipeline)', () => {
    const originalCreateElement = globalThis.document?.createElement;

    it('rotates rectangular canvas 90° clockwise', () => {
      const mock = makeMockCanvas(4, 2);
      // (0,0) is Red
      mock.data[0] = 255;
      mock.data[3] = 255;
      // (3,1) is Green
      const idx31 = (1 * 4 + 3) * 4;
      mock.data[idx31 + 1] = 255;
      mock.data[idx31 + 3] = 255;

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
        const outCanvas = rotateWithRotSprite(
          mock.ctx as unknown as CanvasRenderingContext2D,
          4,
          2,
          90
        );
        expect(outCanvas.width).toBe(2);
        expect(outCanvas.height).toBe(4);
      } finally {
        if (originalCreateElement) {
          (globalThis as unknown as { document: unknown }).document = { createElement: originalCreateElement };
        }
      }
    });

    it('rotates rectangular canvas 270° clockwise', () => {
      const mock = makeMockCanvas(4, 2);
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
        const outCanvas = rotateWithRotSprite(
          mock.ctx as unknown as CanvasRenderingContext2D,
          4,
          2,
          270
        );
        expect(outCanvas.width).toBe(2);
        expect(outCanvas.height).toBe(4);
      } finally {
        if (originalCreateElement) {
          (globalThis as unknown as { document: unknown }).document = { createElement: originalCreateElement };
        }
      }
    });
  });
});
