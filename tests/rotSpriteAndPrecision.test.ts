import { describe, it, expect, beforeEach } from 'vitest';
import { rotateWithRotSprite } from '@/lib/ai/smartMathEngine';
import { useStudioStore } from '@/stores/studioStore';
import { getOrCreateBuffer, clearAllBuffers } from '@/lib/engine/bufferRegistry';

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

interface MockCtx extends CanvasRenderingContext2D {
  _imageData: ImageDataShim;
}

function parseColor(input: string): [number, number, number, number] {
  if (input.startsWith('#')) {
    let hex = input.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length === 6) hex += 'ff';
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = parseInt(hex.slice(6, 8), 16);
    return [r, g, b, a];
  }
  return [0, 0, 0, 255];
}

function makeCanvas(initialWidth: number, initialHeight: number): MockCanvas {
  let width = initialWidth;
  let height = initialHeight;
  let imageData = new FakeImageData(width, height);

  const ctx = {
    imageSmoothingEnabled: false,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000000',
    save: () => {},
    restore: () => {},
    clearRect: (x: number, y: number, w: number, h: number) => {
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          const idx = (py * width + px) * 4;
          imageData.data[idx] = 0;
          imageData.data[idx + 1] = 0;
          imageData.data[idx + 2] = 0;
          imageData.data[idx + 3] = 0;
        }
      }
    },
    fillRect: (x: number, y: number, w: number, h: number) => {
      const [r, g, b, a] = parseColor(String(ctx.fillStyle));
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          const idx = (py * width + px) * 4;
          imageData.data[idx] = r;
          imageData.data[idx + 1] = g;
          imageData.data[idx + 2] = b;
          imageData.data[idx + 3] = a;
        }
      }
    },
    drawImage: (src: MockCanvas | HTMLCanvasElement, dx: number, dy: number, dw?: number, dh?: number) => {
      const srcData = (src as MockCanvas)._imageData;
      if (!srcData) return;
      const alpha = ctx.globalAlpha;
      const targetW = dw ?? srcData.width;
      const targetH = dh ?? srcData.height;

      for (let py = 0; py < targetH; py++) {
        for (let px = 0; px < targetW; px++) {
          const destX = px + dx;
          const destY = py + dy;
          if (destX < 0 || destY < 0 || destX >= width || destY >= height) continue;
          const srcX = Math.floor((px / targetW) * srcData.width);
          const srcY = Math.floor((py / targetH) * srcData.height);
          const srcIdx = (srcY * srcData.width + srcX) * 4;
          const destIdx = (destY * width + destX) * 4;

          const sa = (srcData.data[srcIdx + 3] / 255) * alpha;
          if (sa <= 0) continue;

          const da = imageData.data[destIdx + 3] / 255;
          const outA = sa + da * (1 - sa);

          if (outA > 0) {
            imageData.data[destIdx] = Math.round(
              (srcData.data[srcIdx] * sa + imageData.data[destIdx] * da * (1 - sa)) / outA
            );
            imageData.data[destIdx + 1] = Math.round(
              (srcData.data[srcIdx + 1] * sa + imageData.data[destIdx + 1] * da * (1 - sa)) / outA
            );
            imageData.data[destIdx + 2] = Math.round(
              (srcData.data[srcIdx + 2] * sa + imageData.data[destIdx + 2] * da * (1 - sa)) / outA
            );
            imageData.data[destIdx + 3] = Math.round(outA * 255);
          }
        }
      }
    },
    getImageData: (x: number, y: number, w: number, h: number) => {
      const out = new FakeImageData(w, h);
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const srcX = px + x;
          const srcY = py + y;
          if (srcX < 0 || srcY < 0 || srcX >= width || srcY >= height) continue;
          const srcIdx = (srcY * width + srcX) * 4;
          const destIdx = (py * w + px) * 4;
          out.data[destIdx] = imageData.data[srcIdx];
          out.data[destIdx + 1] = imageData.data[srcIdx + 1];
          out.data[destIdx + 2] = imageData.data[srcIdx + 2];
          out.data[destIdx + 3] = imageData.data[srcIdx + 3];
        }
      }
      return out;
    },
    createImageData: (w: number, h: number) => {
      return new FakeImageData(w, h);
    },
    putImageData: (img: ImageDataShim, x: number, y: number) => {
      for (let py = 0; py < img.height; py++) {
        for (let px = 0; px < img.width; px++) {
          const destX = px + x;
          const destY = py + y;
          if (destX < 0 || destY < 0 || destX >= width || destY >= height) continue;
          const srcIdx = (py * img.width + px) * 4;
          const destIdx = (destY * width + destX) * 4;
          imageData.data[destIdx] = img.data[srcIdx];
          imageData.data[destIdx + 1] = img.data[srcIdx + 1];
          imageData.data[destIdx + 2] = img.data[srcIdx + 2];
          imageData.data[destIdx + 3] = img.data[srcIdx + 3];
        }
      }
    },
  } as unknown as MockCtx;

  const canvas = {
    getContext: () => ctx,
  } as unknown as MockCanvas;

  Object.defineProperty(canvas, '_imageData', {
    get: () => imageData,
  });
  Object.defineProperty(canvas, 'width', {
    get: () => width,
    set: (val: number) => {
      width = val;
      imageData = new FakeImageData(width, height);
    },
  });
  Object.defineProperty(canvas, 'height', {
    get: () => height,
    set: (val: number) => {
      height = val;
      imageData = new FakeImageData(width, height);
    },
  });

  return canvas;
}

describe('RotSprite Engine & Precision Viewport Fixes', () => {
  beforeEach(() => {
    const g = globalThis as unknown as {
      document?: { createElement?: (tag: string) => unknown };
      window?: unknown;
    };
    if (!g.document) {
      g.document = {};
    }
    g.document.createElement = (tag: string) => {
      if (tag === 'canvas') {
        return makeCanvas(16, 16);
      }
      return {};
    };
    g.window = g.window ?? g;

    clearAllBuffers();
  });

  it('rotates 90 degrees orthogonally with lossless pixel preservation', () => {
    const canvas = makeCanvas(4, 4);
    const ctx = canvas.getContext('2d')!;
    
    // Draw a single red pixel at top-left (0, 0)
    const imgData = ctx.createImageData(4, 4);
    imgData.data[0] = 255;
    imgData.data[1] = 0;
    imgData.data[2] = 0;
    imgData.data[3] = 255;
    ctx.putImageData(imgData, 0, 0);

    const rotated = rotateWithRotSprite(ctx, 4, 4, 90);
    const rCtx = rotated.getContext('2d')!;
    const rData = rCtx.getImageData(0, 0, 4, 4).data;

    // In a 4x4 canvas, (0, 0) rotated 90 deg clockwise maps to (3, 0): (dstX = 4 - 1 - 0 = 3, dstY = 0)
    const targetIdx = (0 * 4 + 3) * 4;
    expect(rData[targetIdx]).toBe(255);
    expect(rData[targetIdx + 3]).toBe(255);

    // Old position (0, 0) should now be empty
    expect(rData[0]).toBe(0);
    expect(rData[3]).toBe(0);
  });

  it('rotates 180 degrees orthogonally with lossless pixel preservation', () => {
    const canvas = makeCanvas(4, 4);
    const ctx = canvas.getContext('2d')!;
    
    // Pixel at (1, 1)
    const imgData = ctx.createImageData(4, 4);
    const srcIdx = (1 * 4 + 1) * 4;
    imgData.data[srcIdx] = 120;
    imgData.data[srcIdx + 1] = 200;
    imgData.data[srcIdx + 2] = 50;
    imgData.data[srcIdx + 3] = 255;
    ctx.putImageData(imgData, 0, 0);

    const rotated = rotateWithRotSprite(ctx, 4, 4, 180);
    const rCtx = rotated.getContext('2d')!;
    const rData = rCtx.getImageData(0, 0, 4, 4).data;

    // (1, 1) rotated 180 deg maps to (4 - 1 - 1 = 2, 4 - 1 - 1 = 2)
    const targetIdx = (2 * 4 + 2) * 4;
    expect(rData[targetIdx]).toBe(120);
    expect(rData[targetIdx + 1]).toBe(200);
    expect(rData[targetIdx + 2]).toBe(50);
    expect(rData[targetIdx + 3]).toBe(255);
  });

  it('rotates arbitrary angles using majority color voting without dropping solid strokes', () => {
    const canvas = makeCanvas(8, 8);
    const ctx = canvas.getContext('2d')!;
    
    // Draw a 2x2 solid center block at (3..4, 3..4)
    const imgData = ctx.createImageData(8, 8);
    for (let y = 3; y <= 4; y++) {
      for (let x = 3; x <= 4; x++) {
        const idx = (y * 8 + x) * 4;
        imgData.data[idx] = 255;
        imgData.data[idx + 1] = 255;
        imgData.data[idx + 2] = 255;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const rotated = rotateWithRotSprite(ctx, 8, 8, 45);
    const rCtx = rotated.getContext('2d')!;
    const rData = rCtx.getImageData(0, 0, 8, 8).data;

    // Count solid pixels in rotated output - should not be empty or degenerate
    let solidPixels = 0;
    for (let i = 3; i < rData.length; i += 4) {
      if (rData[i] > 32) solidPixels++;
    }
    expect(solidPixels).toBeGreaterThanOrEqual(4);
  });

  it('defaults dither modulation to 0.0 in studioStore tools', () => {
    const state = useStudioStore.getState();
    expect(state.tools.ditherModulation).toBe(0.0);
  });

  it('defaults resample to true when resizing canvas', () => {
    const state = useStudioStore.getState();
    state.resetToNewProject();
    
    // Set 32x32 canvas
    state.setCanvasSize(32, 32, 'center', false);
    const activeLayerId = useStudioStore.getState().activeLayerId;
    const buf = getOrCreateBuffer(activeLayerId, 32, 32);
    
    // Draw a pixel
    buf.ctx.fillStyle = '#ff0000';
    buf.ctx.fillRect(0, 0, 16, 16);

    // Resize to 16x16 with default resample (resample=true)
    useStudioStore.getState().setCanvasSize(16, 16);
    expect(useStudioStore.getState().canvasWidth).toBe(16);
    expect(useStudioStore.getState().canvasHeight).toBe(16);

    // Buffer has been resampled into 16x16 bounds
    const nextBuf = getOrCreateBuffer(activeLayerId, 16, 16);
    const pixel = nextBuf.ctx.getImageData(0, 0, 1, 1).data;
    expect(pixel[3]).toBeGreaterThan(0);
  });
});
