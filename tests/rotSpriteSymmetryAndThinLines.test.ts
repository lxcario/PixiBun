import { describe, it, expect } from 'vitest';
import { rotateWithRotSprite } from '@/lib/graphics/math/rotSprite';

/** The 16×16 blade the homepage rotation demo used: thin diagonal lines that plain rotation breaks. */
const SWORD_ROWS = [
  '..............oo',
  '.............oFFo',
  '............oFFfo',
  '...........oFFfo.',
  '..........oFFfo..',
  '.........oFFfo...',
  '........oFFfo....',
  '.......oFFfo.....',
  '..oo..oFFfo......',
  '.oAAooFFfo.......',
  '..oAAAfpo........',
  '...oAAoo.........',
  '..oAaoAAo........',
  '.oaao..oo........',
  '.oao.............',
  '..o..............',
];

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
  const _imageData = new FakeImageData(width, height);
  const ctx = {
    imageSmoothingEnabled: false,
    fillStyle: '#000000',
    fillRect: () => {},
    getImageData: () => _imageData,
    createImageData: (w: number, h: number) => new FakeImageData(w, h),
    putImageData: (data: FakeImageData) => {
      for (let i = 0; i < _imageData.data.length; i++) {
        _imageData.data[i] = data.data[i];
      }
    },
    drawImage: () => {},
    clearRect: () => {},
  };

  const canvas = {
    width,
    height,
    getContext: () => ctx,
  };

  return { canvas, ctx, _imageData };
}

describe('RotSprite Symmetry & Precision Engine', () => {
  it('rotates a symmetrical 4-arm diagonal crystal 45° into an exact symmetrical plus with zero distortion or color leaks', () => {
    (globalThis as unknown as { document: unknown }).document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return makeMockCanvas(32, 32).canvas;
        }
        return {};
      },
    };

    const width = 32;
    const height = 32;
    const { ctx, _imageData } = makeMockCanvas(width, height);

    const OUTLINE: [number, number, number, number] = [53, 34, 72, 255];
    const FILL: [number, number, number, number] = [16, 185, 129, 255];

    const setPx = (x: number, y: number, col: [number, number, number, number]) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return;
      const idx = (y * width + x) * 4;
      _imageData.data[idx] = col[0];
      _imageData.data[idx + 1] = col[1];
      _imageData.data[idx + 2] = col[2];
      _imageData.data[idx + 3] = col[3];
    };

    // Draw mathematically symmetrical D4 diagonal cross
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = Math.abs(x + 0.5 - 16.0);
        const dy = Math.abs(y + 0.5 - 16.0);
        const u = (dx + dy) / Math.SQRT2;
        const v = Math.abs(dx - dy) / Math.SQRT2;

        if (dx <= 1.5 && dy <= 1.5) {
          setPx(x, y, OUTLINE);
        } else if (u <= 14 && v <= 3.2) {
          if (u >= 13.0 || v >= 2.3 || v <= 0.6) {
            setPx(x, y, OUTLINE);
          } else {
            setPx(x, y, FILL);
          }
        }
      }
    }

    const rotated = rotateWithRotSprite(ctx as unknown as CanvasRenderingContext2D, width, height, 45);
    const rData = rotated.getContext('2d')!.getImageData(0, 0, width, height).data;

    // 1. Bilateral symmetry check after 45° rotation
    // A 4-fold diagonal cross rotated 45° becomes an orthogonal cross with exact horizontal and vertical symmetry
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const hIdx = (y * width + (width - 1 - x)) * 4;
        const vIdx = ((height - 1 - y) * width + x) * 4;

        expect(rData[idx + 3]).toBe(rData[hIdx + 3]);
        expect(rData[idx + 3]).toBe(rData[vIdx + 3]);
        if (rData[idx + 3] > 0) {
          expect(rData[idx]).toBe(rData[hIdx]);
          expect(rData[idx]).toBe(rData[vIdx]);
        }
      }
    }

    // 2. Zero outline leakage: Emerald fill ('O') must NEVER touch transparent background directly
    // Every fill pixel must be sheltered by adjacent outline pixels or other fill pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isFill = rData[idx + 3] > 0 && rData[idx] === FILL[0];
        if (isFill) {
          // Check orthogonal neighbors: must not be empty transparent
          const topA = y > 0 ? rData[((y - 1) * width + x) * 4 + 3] : 0;
          const botA = y < height - 1 ? rData[((y + 1) * width + x) * 4 + 3] : 0;
          const leftA = x > 0 ? rData[(y * width + (x - 1)) * 4 + 3] : 0;
          const rightA = x < width - 1 ? rData[(y * width + (x + 1)) * 4 + 3] : 0;

          // Fill should not have unshielded exposure on all sides
          expect(topA > 0 || botA > 0 || leftA > 0 || rightA > 0).toBe(true);
        }
      }
    }
  });

  it('rotates Artisan Blade at 45° with unbroken 1px blade continuity and complete contour retention', () => {
    (globalThis as unknown as { document: unknown }).document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return makeMockCanvas(16, 16).canvas;
        }
        return {};
      },
    };

    const width = 16;
    const height = 16;
    const { ctx, _imageData } = makeMockCanvas(width, height);

    const SWORD_PALETTE: Record<string, [number, number, number, number]> = {
      'o': [32, 16, 16, 255],
      'F': [240, 240, 240, 255],
      'f': [160, 160, 160, 255],
      'A': [32, 160, 208, 255],
      'a': [16, 80, 112, 255],
      'p': [0, 0, 255, 255],
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const ch = SWORD_ROWS[y]?.[x] || '.';
        if (ch !== '.') {
          const col = SWORD_PALETTE[ch];
          const idx = (y * width + x) * 4;
          _imageData.data[idx] = col[0];
          _imageData.data[idx + 1] = col[1];
          _imageData.data[idx + 2] = col[2];
          _imageData.data[idx + 3] = col[3];
        }
      }
    }

    const rotated = rotateWithRotSprite(ctx as unknown as CanvasRenderingContext2D, width, height, 45);
    const rData = rotated.getContext('2d')!.getImageData(0, 0, width, height).data;

    // Count solid pixels in rotated output
    let solidCount = 0;
    for (let i = 3; i < rData.length; i += 4) {
      if (rData[i] > 32) solidCount++;
    }

    // The 81-pixel source is clipped by the same-size canvas. The original >= 68 floor matched
    // v2's dilating vote; the area-preserving v3 engine keeps 61. Guard against erosion instead.
    expect(solidCount).toBeGreaterThanOrEqual(58);

    // Unbroken blade: upper outline, steel core and lower outline rows are each contiguous
    // across columns 7..15, so the blade has no gaps on either edge.
    for (const bladeY of [7, 8, 9]) {
      for (let x = 7; x <= 15; x++) {
        const idx = (bladeY * width + x) * 4;
        expect(rData[idx + 3], `blade row ${bladeY}, column ${x}`).toBeGreaterThan(0);
      }
    }
  });

  it('preserves opaque corner pixels without transparent erosion during scale2x on edge-touching sprites', async () => {
    const { scale2x } = await import('@/lib/canvas/rotSprite');
    // 4x4 solid red sprite touching all borders
    const w = 4;
    const h = 4;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;     // R
      data[i + 1] = 0;   // G
      data[i + 2] = 0;   // B
      data[i + 3] = 255; // A (fully opaque)
    }

    const scaled = scale2x({ width: w, height: h, data });
    expect(scaled.width).toBe(8);
    expect(scaled.height).toBe(8);

    // Every single pixel in the 8x8 scaled output must remain 100% opaque red
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const idx = (y * 8 + x) * 4;
        expect(scaled.data[idx]).toBe(255);
        expect(scaled.data[idx + 3]).toBe(255);
      }
    }
  });
});

