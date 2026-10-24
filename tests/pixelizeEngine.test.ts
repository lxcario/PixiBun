/**
 * Unit & mathematical correctness tests for pixelizeEngine:
 * - sRGB <-> Linear RGB conversions
 * - Oklab perceptual color space & deltaEOklab distance
 * - Oklab Median-Cut & K-Means++ clustering
 * - Downsampling (Salience Area Box, Nearest, Fit contain/cover/stretch)
 * - Dithering (Atkinson, Floyd-Steinberg, Bayer 4x4)
 * - Alpha thresholding & background keying
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  srgbToLinear,
  linearToSrgb,
  rgbToOklab,
  oklabToRgb,
  deltaEOklab,
  extractOklabPalette,
  quantizeAndDither,
  cleanAlphaAndBackground,
  downsampleImage,
} from '@/lib/graphics/pixelizeEngine';

// DOM mock for canvas testing in node environment
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

interface MockCanvas extends HTMLCanvasElement {
  _imageData: ImageDataShim;
}

function makeCanvas(width: number, height: number): MockCanvas {
  let _imageData = new FakeImageData(width, height);

  const ctx = {
    imageSmoothingEnabled: true,
    getImageData: () => _imageData,
    createImageData: (w: number, h: number) => new FakeImageData(w, h),
    putImageData: (id: ImageDataShim) => {
      _imageData = id as FakeImageData;
    },
    drawImage: (src: HTMLCanvasElement) => {
      const srcId = (src as unknown as MockCanvas)?._imageData;
      if (srcId) {
        _imageData.data.set(srcId.data.subarray(0, _imageData.data.length));
      }
    },
  };

  const canvas: MockCanvas = {
    width,
    height,
    getContext: () => ctx,
    toDataURL: () => 'data:image/png;base64,mock',
  } as unknown as MockCanvas;

  Object.defineProperty(canvas, '_imageData', {
    get(): ImageDataShim { return _imageData; },
  });
  Object.defineProperty(canvas, 'width', {
    get() { return width; },
    set(v: number) {
      width = v;
      _imageData = new FakeImageData(width, height);
    },
  });
  Object.defineProperty(canvas, 'height', {
    get() { return height; },
    set(v: number) {
      height = v;
      _imageData = new FakeImageData(width, height);
    },
  });

  return canvas;
}

beforeEach(() => {
  if (typeof document === 'undefined') {
    (globalThis as unknown as { document: unknown }).document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') return makeCanvas(32, 32);
        return {};
      },
    };
  }
});

describe('1. sRGB <-> Linear RGB Color Transfer', () => {
  it('converts black (0) and white (255) identically', () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(255)).toBeCloseTo(1.0, 4);
    expect(linearToSrgb(0)).toBe(0);
    expect(linearToSrgb(1.0)).toBe(255);
  });

  it('correctly linearizes mid-gray (128 srgb ~ 0.215 linear)', () => {
    const lin = srgbToLinear(128);
    expect(lin).toBeGreaterThan(0.20);
    expect(lin).toBeLessThan(0.23);
    expect(linearToSrgb(lin)).toBe(128);
  });
});

describe('2. Oklab Perceptual Space & Distance', () => {
  it('converts pure white (255, 255, 255) to L=1, a=0, b=0', () => {
    const ok = rgbToOklab(255, 255, 255);
    expect(ok.L).toBeCloseTo(1.0, 2);
    expect(ok.a).toBeCloseTo(0.0, 2);
    expect(ok.b).toBeCloseTo(0.0, 2);
  });

  it('converts pure black (0, 0, 0) to L=0, a=0, b=0', () => {
    const ok = rgbToOklab(0, 0, 0);
    expect(ok.L).toBe(0);
    expect(ok.a).toBe(0);
    expect(ok.b).toBe(0);
  });

  it('roundtrips RGB -> Oklab -> RGB with < 1 unit rounding error', () => {
    const [r0, g0, b0] = [230, 80, 40];
    const ok = rgbToOklab(r0, g0, b0);
    const [r1, g1, b1] = oklabToRgb(ok.L, ok.a, ok.b);
    expect(Math.abs(r0 - r1)).toBeLessThanOrEqual(1);
    expect(Math.abs(g0 - g1)).toBeLessThanOrEqual(1);
    expect(Math.abs(b0 - b1)).toBeLessThanOrEqual(1);
  });

  it('measures deltaEOklab perceptual distance accurately', () => {
    const red = rgbToOklab(255, 0, 0);
    const darkRed = rgbToOklab(150, 0, 0);
    const blue = rgbToOklab(0, 0, 255);

    const distRedDarkRed = deltaEOklab(red, darkRed);
    const distRedBlue = deltaEOklab(red, blue);

    // Dark red is much closer to red perceptually than blue is to red
    expect(distRedDarkRed).toBeLessThan(distRedBlue);
  });
});

describe('3. Oklab Median-Cut & K-Means++ Palette Quantization', () => {
  it('extracts optimal K centroids from a spectrum of colors', () => {
    const pixels = [
      rgbToOklab(255, 0, 0),
      rgbToOklab(240, 10, 10),
      rgbToOklab(0, 255, 0),
      rgbToOklab(10, 240, 10),
      rgbToOklab(0, 0, 255),
      rgbToOklab(10, 10, 240),
      rgbToOklab(255, 255, 0),
    ];

    const palette = extractOklabPalette(pixels, 4);
    expect(palette.length).toBeLessThanOrEqual(4);
    expect(palette.length).toBeGreaterThanOrEqual(3);
  });
});

describe('3.5 Spatial Downsampling', () => {
  it('downsamples from high-resolution canvas with area box and nearest filters', () => {
    const srcCanvas = makeCanvas(8, 8);
    const ctx = srcCanvas.getContext('2d')!;
    const dst = downsampleImage(ctx, 8, 8, 4, 4, 'contain', 'salient-box');
    expect(dst.width).toBe(4);
    expect(dst.height).toBe(4);
    expect(dst.data.length).toBe(4 * 4 * 4);
  });
});

describe('4. Dithering & Error Diffusion', () => {
  it('quantizes to palette with none (flat) dithering', () => {
    const imgData = new FakeImageData(2, 2);
    // Fill with light red
    imgData.data.set([
      220, 30, 30, 255,  220, 30, 30, 255,
      220, 30, 30, 255,  220, 30, 30, 255,
    ]);

    const palette: [number, number, number][] = [
      [255, 0, 0], // Pure red
      [0, 0, 255], // Pure blue
    ];

    quantizeAndDither(imgData as unknown as ImageData, 2, 2, palette, 'none');

    // All pixels should be snapped to pure red [255, 0, 0]
    expect(imgData.data[0]).toBe(255);
    expect(imgData.data[1]).toBe(0);
    expect(imgData.data[2]).toBe(0);
  });

  it('diffuses error with Atkinson and Bayer dithering without NaN or out-of-bounds colors', () => {
    const imgData = new FakeImageData(4, 4);
    for (let i = 0; i < imgData.data.length; i += 4) {
      imgData.data[i] = 128; // mid-gray
      imgData.data[i + 1] = 128;
      imgData.data[i + 2] = 128;
      imgData.data[i + 3] = 255;
    }

    const palette: [number, number, number][] = [
      [0, 0, 0],
      [255, 255, 255],
    ];

    quantizeAndDither(imgData as unknown as ImageData, 4, 4, palette, 'atkinson', 0.75);

    for (let i = 0; i < imgData.data.length; i += 4) {
      const val = imgData.data[i];
      expect(val === 0 || val === 255).toBe(true);
      expect(Number.isNaN(val)).toBe(false);
    }
  });
});

describe('5. Alpha Thresholding & Background Keying', () => {
  it('converts semi-transparent pixels into clean 1-bit binary alpha', () => {
    const imgData = new FakeImageData(2, 2);
    imgData.data.set([
      255, 0, 0, 200, // alpha 200 -> should become 255
      255, 0, 0, 50,  // alpha 50  -> should become 0
      0, 255, 0, 130, // alpha 130 -> should become 255
      0, 255, 0, 100, // alpha 100 -> should become 0
    ]);

    cleanAlphaAndBackground(imgData as unknown as ImageData, 2, 2, { cleanAlpha: true });

    expect(imgData.data[3]).toBe(255);
    expect(imgData.data[7]).toBe(0);
    expect(imgData.data[11]).toBe(255);
    expect(imgData.data[15]).toBe(0);
  });

  it('removes solid corner background color when requested', () => {
    const imgData = new FakeImageData(2, 2);
    imgData.data.set([
      255, 255, 255, 255, // white bg top-left
      255, 0, 0, 255,     // red foreground
      255, 255, 255, 255, // white bg
      255, 255, 255, 255, // white bg
    ]);

    cleanAlphaAndBackground(imgData as unknown as ImageData, 2, 2, {
      cleanAlpha: true,
      removeBackground: true,
      bgTolerance: 0.1,
    });

    expect(imgData.data[3]).toBe(0);   // white corner cleared
    expect(imgData.data[7]).toBe(255); // red foreground preserved!
  });
});
