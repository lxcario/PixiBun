import { describe, it, expect, beforeEach } from 'vitest';
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
    drawImage: (src: MockCanvas | HTMLCanvasElement, dx: number, dy: number) => {
      const srcData = (src as MockCanvas)._imageData;
      if (!srcData) return;
      const alpha = ctx.globalAlpha;
      for (let py = 0; py < srcData.height; py++) {
        for (let px = 0; px < srcData.width; px++) {
          const destX = px + dx;
          const destY = py + dy;
          if (destX < 0 || destY < 0 || destX >= width || destY >= height) continue;
          const srcIdx = (py * srcData.width + px) * 4;
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
  useStudioStore.getState().resetToNewProject();
});

describe('Layer Merge Down (mergeLayerDown)', () => {
  it('merges an upper layer onto the underlying layer and prunes the stack', () => {
    const store = useStudioStore.getState();
    const frame = store.frames[0];
    const baseLayerId = frame.layers[0].id;

    store.addLayer('Top Layer');
    const updatedFrame = useStudioStore.getState().frames[0];
    expect(updatedFrame.layers).toHaveLength(2);
    const topLayerId = updatedFrame.layers[0].id;
    expect(updatedFrame.layers[1].id).toBe(baseLayerId);

    const baseBuf = getOrCreateBuffer(baseLayerId, 16, 16);
    baseBuf.ctx.fillStyle = '#FF0000';
    baseBuf.ctx.fillRect(0, 0, 16, 16);

    const topBuf = getOrCreateBuffer(topLayerId, 16, 16);
    topBuf.ctx.fillStyle = '#0000FF';
    topBuf.ctx.fillRect(0, 0, 8, 8);

    useStudioStore.getState().mergeLayerDown(topLayerId);

    const finalFrame = useStudioStore.getState().frames[0];
    expect(finalFrame.layers).toHaveLength(1);
    expect(finalFrame.layers[0].id).toBe(baseLayerId);
    expect(useStudioStore.getState().activeLayerId).toBe(baseLayerId);

    const mergedBuf = getOrCreateBuffer(baseLayerId, 16, 16);
    const pixelTopLeft = mergedBuf.ctx.getImageData(0, 0, 1, 1).data;
    expect(pixelTopLeft[0]).toBe(0);
    expect(pixelTopLeft[1]).toBe(0);
    expect(pixelTopLeft[2]).toBe(255);
    expect(pixelTopLeft[3]).toBe(255);

    const pixelBottomRight = mergedBuf.ctx.getImageData(12, 12, 1, 1).data;
    expect(pixelBottomRight[0]).toBe(255);
    expect(pixelBottomRight[1]).toBe(0);
    expect(pixelBottomRight[2]).toBe(0);
    expect(pixelBottomRight[3]).toBe(255);
  });

  it('honors upper layer opacity when merging', () => {
    const store = useStudioStore.getState();
    const frame = store.frames[0];
    const baseLayerId = frame.layers[0].id;

    store.addLayer('Transparent Top');
    const topLayerId = useStudioStore.getState().frames[0].layers[0].id;
    store.setLayerOpacity(topLayerId, 0.5);

    const baseBuf = getOrCreateBuffer(baseLayerId, 16, 16);
    baseBuf.ctx.fillStyle = '#000000';
    baseBuf.ctx.fillRect(0, 0, 16, 16);

    const topBuf = getOrCreateBuffer(topLayerId, 16, 16);
    topBuf.ctx.fillStyle = '#FFFFFF';
    topBuf.ctx.fillRect(0, 0, 16, 16);

    useStudioStore.getState().mergeLayerDown(topLayerId);

    const mergedBuf = getOrCreateBuffer(baseLayerId, 16, 16);
    const pixel = mergedBuf.ctx.getImageData(0, 0, 1, 1).data;
    expect(pixel[0]).toBeGreaterThan(120);
    expect(pixel[0]).toBeLessThan(135);
  });

  it('no-ops when called on the bottom-most layer', () => {
    const store = useStudioStore.getState();
    store.addLayer('Layer 2');
    const frame = useStudioStore.getState().frames[0];
    expect(frame.layers).toHaveLength(2);

    const bottomLayerId = frame.layers[1].id;
    useStudioStore.getState().mergeLayerDown(bottomLayerId);

    const afterFrame = useStudioStore.getState().frames[0];
    expect(afterFrame.layers).toHaveLength(2);
  });

  it('no-ops when frame has only a single layer', () => {
    const store = useStudioStore.getState();
    const frame = store.frames[0];
    expect(frame.layers).toHaveLength(1);

    store.mergeLayerDown(frame.layers[0].id);
    expect(useStudioStore.getState().frames[0].layers).toHaveLength(1);
  });
});
