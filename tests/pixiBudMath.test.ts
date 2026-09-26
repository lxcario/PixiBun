/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderParametric2p5DLighting } from '@/lib/ai/math/photometricLighting';
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

function parseColor(input: string): [number, number, number, number] {
  if (input.startsWith('#')) {
    let hex = input.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length === 6) hex += 'ff';
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = parseInt(hex.slice(6, 8), 16);
    return [r, g, b, a];
  }
  return [0, 0, 0, 255];
}

function makeCanvas(initialWidth: number, initialHeight: number): HTMLCanvasElement {
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
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;

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

describe('PixiBud AI Math & Rendering Engines', () => {
  beforeEach(() => {
    document.createElement = ((orig) => (tagName: string) => {
      if (tagName === 'canvas') {
        return makeCanvas(32, 32);
      }
      return orig.call(document, tagName);
    })(document.createElement);
  });

  describe('2.5D Photometric Specular Glint', () => {
    it('generates a tight, pinpoint glint bounded to <= 4 pixels on a 32x32 sphere rather than a blown-out wash', () => {
      const w = 32, h = 32;
      const canvas = makeCanvas(w, h);
      const ctx = canvas.getContext('2d')!;

      // Draw a solid circle / sphere in center (cx: 16, cy: 16, r: 10)
      ctx.fillStyle = '#f0be7c';
      for (let y = 6; y <= 26; y++) {
        for (let x = 6; x <= 26; x++) {
          if (Math.hypot(x - 16, y - 16) <= 10) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }

      const { specularPixels } = renderParametric2p5DLighting(ctx, w, h, {
        azimuthDeg: 315,
        elevationDeg: 45,
        shadowIntensity: 0.8,
        specularShininess: 64,
        material: 'gold',
      });

      // Glints must be pinpoint sparkles, not broad blobs covering the sprite
      expect(specularPixels.length).toBeGreaterThan(0);
      expect(specularPixels.length).toBeLessThanOrEqual(4);

      // Verify all glint pixels are clustered near the light source reflection apex (top-left)
      specularPixels.forEach((p) => {
        expect(p.x).toBeLessThan(18);
        expect(p.y).toBeLessThan(18);
      });
    });

    it('tints metallic specular glints with warm champagne/albedo instead of flat chalky white', () => {
      const w = 32, h = 32;
      const canvas = makeCanvas(w, h);
      const ctx = canvas.getContext('2d')!;

      // Draw with deep gold albedo
      ctx.fillStyle = '#d4af37';
      for (let y = 6; y <= 26; y++) {
        for (let x = 6; x <= 26; x++) {
          if (Math.hypot(x - 16, y - 16) <= 10) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }

      const { specularPixels } = renderParametric2p5DLighting(ctx, w, h, {
        azimuthDeg: 315,
        elevationDeg: 45,
        shadowIntensity: 0.8,
        specularShininess: 64,
        material: 'gold',
      });

      expect(specularPixels.length).toBeGreaterThan(0);
      // Gold conductor specular should retain warm tint (R > G > B, not cold white 255,255,255)
      const apex = specularPixels[0];
      expect(apex.r).toBeGreaterThan(apex.g);
      expect(apex.g).toBeGreaterThan(apex.b);
      expect(apex.r).toBeGreaterThanOrEqual(160);
    });

    it('uses pure crisp white for dielectric materials (e.g. glass)', () => {
      const w = 32, h = 32;
      const canvas = makeCanvas(w, h);
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#6b8cff';
      for (let y = 6; y <= 26; y++) {
        for (let x = 6; x <= 26; x++) {
          if (Math.hypot(x - 16, y - 16) <= 10) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }

      const { specularPixels } = renderParametric2p5DLighting(ctx, w, h, {
        azimuthDeg: 315,
        elevationDeg: 45,
        shadowIntensity: 0.8,
        specularShininess: 64,
        material: 'glass',
      });

      expect(specularPixels.length).toBeGreaterThan(0);
      const apex = specularPixels[0];
      expect(apex.r).toBe(255);
      expect(apex.g).toBe(255);
      expect(apex.b).toBe(255);
    });
  });

  describe('RotSprite 45° Canonical Rotation Engine', () => {
    it('rotates a 32x32 symmetrical octagon at 45 degrees without creating detached stray orphan pixels', () => {
      const w = 32, h = 32;
      const canvas = makeCanvas(w, h);
      const ctx = canvas.getContext('2d')!;

      // Draw a symmetrical 1px purple octagon outline (like user's test asset)
      ctx.fillStyle = '#9b5de5';
      const points = [
        // Top edge
        [12, 8], [13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [18, 8], [19, 8],
        // Top-right diagonal
        [20, 9], [21, 10], [22, 11],
        // Right edge
        [23, 12], [23, 13], [23, 14], [23, 15], [23, 16], [23, 17], [23, 18], [23, 19],
        // Bottom-right diagonal
        [22, 20], [21, 21], [20, 22],
        // Bottom edge
        [19, 23], [18, 23], [17, 23], [16, 23], [15, 23], [14, 23], [13, 23], [12, 23],
        // Bottom-left diagonal
        [11, 22], [10, 21], [9, 20],
        // Left edge
        [8, 19], [8, 18], [8, 17], [8, 16], [8, 15], [8, 14], [8, 13], [8, 12],
        // Top-left diagonal
        [9, 11], [10, 10], [11, 9]
      ];

      points.forEach(([x, y]) => {
        ctx.fillRect(x, y, 1, 1);
      });

      const rotatedCanvas = rotateWithRotSprite(ctx, w, h, 45);
      const rData = rotatedCanvas.getContext('2d')!.getImageData(0, 0, w, h).data;

      // 1. Verify NO detached orphan pixels in the outer boundary margin
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const alpha = rData[idx + 3];
          if (alpha > 30) {
            // Check distance from center (16, 16)
            const distFromCenter = Math.hypot(x - 16, y - 16);
            expect(distFromCenter).toBeLessThanOrEqual(15);

            // Check 8-connectivity: every solid pixel must have at least one 8-neighbor
            let hasNeighbor = false;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                  const nIdx = (ny * w + nx) * 4;
                  if (rData[nIdx + 3] > 30) {
                    hasNeighbor = true;
                    break;
                  }
                }
              }
              if (hasNeighbor) break;
            }
            expect(hasNeighbor).toBe(true);
          }
        }
      }

      // 2. Symmetry check across 4 quadrants
      let qTL = 0, qTR = 0, qBL = 0, qBR = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          if (rData[idx + 3] > 30) {
            if (x < 16 && y < 16) qTL++;
            else if (x >= 16 && y < 16) qTR++;
            else if (x < 16 && y >= 16) qBL++;
            else qBR++;
          }
        }
      }

      // Quadrants must be balanced and symmetrical
      expect(Math.abs(qTL - qBR)).toBeLessThanOrEqual(3);
      expect(Math.abs(qTR - qBL)).toBeLessThanOrEqual(3);
    });

    it('performs canonical 8x8 block color voting and preserves interior fill separation', () => {
      const w = 32, h = 32;
      const canvas = makeCanvas(w, h);
      const ctx = canvas.getContext('2d')!;

      // 10x10 square with red outline and blue interior
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(11, 11, 10, 10);
      ctx.fillStyle = '#0000ff';
      ctx.fillRect(12, 12, 8, 8);

      const rotated = rotateWithRotSprite(ctx, w, h, 45);
      const rData = rotated.getContext('2d')!.getImageData(0, 0, w, h).data;

      let hasRed = false;
      let hasBlue = false;
      for (let i = 0; i < rData.length; i += 4) {
        if (rData[i] > 200 && rData[i + 2] < 50) hasRed = true;
        if (rData[i + 2] > 200 && rData[i] < 50) hasBlue = true;
      }

      expect(hasRed).toBe(true);
      expect(hasBlue).toBe(true);
    });
  });
});
