/**
 * Minimal DOM + Canvas mock shared by unit tests that exercise the compositor
 * or buffer registry in the node environment (pattern established in
 * photometricNonDestructive.test.ts).
 */

export interface ImageDataShim {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export class FakeImageData implements ImageDataShim {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

export interface MockCanvas extends HTMLCanvasElement {
  _imageData: ImageDataShim;
}

export interface MockCtx extends CanvasRenderingContext2D {
  _imageData: ImageDataShim;
}

export function parseColor(input: string): [number, number, number, number] {
  let hex = input.trim();
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length === 6) hex += 'ff';
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
      parseInt(hex.slice(6, 8), 16),
    ];
  }
  const m = hex.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
    return [parts[0] | 0, parts[1] | 0, parts[2] | 0, Math.round((parts[3] ?? 1) * 255)];
  }
  return [0, 0, 0, 255];
}

export function makeCanvas(width: number, height: number): MockCanvas {
  let _imageData = new FakeImageData(width, height);

  const ctx = {
    imageSmoothingEnabled: true,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000000',
    clearRect: (x: number, y: number, w: number, h: number) => {
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          const i = (py * width + px) * 4;
          _imageData.data[i] = 0;
          _imageData.data[i + 1] = 0;
          _imageData.data[i + 2] = 0;
          _imageData.data[i + 3] = 0;
        }
      }
    },
    fillRect: (x: number, y: number, w: number, h: number) => {
      const rgba = parseColor(String(ctx.fillStyle));
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          const i = (py * width + px) * 4;
          if (ctx.globalCompositeOperation === 'destination-out') {
            _imageData.data[i + 3] = 0;
          } else {
            _imageData.data[i] = rgba[0];
            _imageData.data[i + 1] = rgba[1];
            _imageData.data[i + 2] = rgba[2];
            _imageData.data[i + 3] = rgba[3];
          }
        }
      }
    },
    drawImage: (src: MockCanvas | HTMLCanvasElement, dx: number, dy: number) => {
      const srcData: ImageDataShim | undefined = (src as MockCanvas)?._imageData;
      if (!srcData) return;
      for (let py = 0; py < srcData.height; py++) {
        for (let px = 0; px < srcData.width; px++) {
          const sx = px + dx;
          const sy = py + dy;
          if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
          const si = (py * srcData.width + px) * 4;
          const di = (sy * width + sx) * 4;
          _imageData.data[di] = srcData.data[si];
          _imageData.data[di + 1] = srcData.data[si + 1];
          _imageData.data[di + 2] = srcData.data[si + 2];
          _imageData.data[di + 3] = srcData.data[si + 3];
        }
      }
    },
    getImageData: (x: number, y: number, w: number, h: number) => {
      const out = new FakeImageData(w, h);
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const sx = px + x;
          const sy = py + y;
          if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
          const si = (sy * width + sx) * 4;
          const di = (py * w + px) * 4;
          out.data[di] = _imageData.data[si];
          out.data[di + 1] = _imageData.data[si + 1];
          out.data[di + 2] = _imageData.data[si + 2];
          out.data[di + 3] = _imageData.data[si + 3];
        }
      }
      return out as unknown as ImageData;
    },
    putImageData: (data: ImageData, x: number, y: number) => {
      for (let py = 0; py < data.height; py++) {
        for (let px = 0; px < data.width; px++) {
          const sx = px + x;
          const sy = py + y;
          if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
          const si = (py * data.width + px) * 4;
          const di = (sy * width + sx) * 4;
          _imageData.data[di] = data.data[si];
          _imageData.data[di + 1] = data.data[si + 1];
          _imageData.data[di + 2] = data.data[si + 2];
          _imageData.data[di + 3] = data.data[si + 3];
        }
      }
    },
    createImageData: ((w: number, h: number) => new FakeImageData(w, h)) as unknown as MockCtx['createImageData'],
    setTransform: () => {},
    resetTransform: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    strokeRect: () => {},
    setLineDash: () => {},
    createLinearGradient: () => ({
      addColorStop: () => {},
    }),
    createRadialGradient: () => ({
      addColorStop: () => {},
    }),
  } as unknown as MockCtx;
  Object.defineProperty(ctx, '_imageData', {
    get(): ImageDataShim {
      return _imageData;
    },
  });
  Object.defineProperty(ctx, 'canvas', { value: null, writable: true });

  const canvas: MockCanvas = {
    width,
    height,
    getContext: () => ctx,
  } as unknown as MockCanvas;
  Object.defineProperty(canvas, '_imageData', {
    get(): ImageDataShim {
      return _imageData;
    },
  });
  Object.defineProperty(canvas, 'width', {
    get() {
      return width;
    },
    set(v: number) {
      width = v;
      _imageData = new FakeImageData(width, height);
    },
  });
  Object.defineProperty(canvas, 'height', {
    get() {
      return height;
    },
    set(v: number) {
      height = v;
      _imageData = new FakeImageData(width, height);
    },
  });
  (ctx as { canvas: HTMLCanvasElement | null }).canvas = canvas;
  return canvas;
}

/** Installs a global document shim whose createElement('canvas') returns our fake. */
export function installDocumentCanvasMock(): void {
  const g = globalThis as {
    document?: { createElement?: (tag: string) => unknown };
    window?: unknown;
  };
  if (!g.document) {
    g.document = {};
  }
  g.document.createElement = (tag: string) => {
    if (tag === 'canvas') {
      return makeCanvas(1, 1);
    }
    return {};
  };
  g.window = g.window ?? g;
}