import { describe, it, expect } from 'vitest';
import { MathInvariants } from '@/lib/safety/mathInvariants';
import { SafeCanvas, CanvasHardwareLimits } from '@/lib/safety/safeCanvas';
import { SafeJson } from '@/lib/safety/safeJson';
import { ImageHeaderProbe } from '@/lib/safety/imageHeaderProbe';
import { StorageResilience } from '@/lib/safety/storageResilience';

describe('Defensive Hardening Suite', () => {
  describe('MathInvariants', () => {
    it('clampZoom defends against NaN, Infinity, 0, negative, and extreme values', () => {
      expect(MathInvariants.clampZoom(NaN, 1.0)).toBe(1.0);
      expect(MathInvariants.clampZoom(Infinity, 1.0)).toBe(1.0);
      expect(MathInvariants.clampZoom(-Infinity, 1.0)).toBe(1.0);
      expect(MathInvariants.clampZoom(0, 1.0)).toBe(1.0);
      expect(MathInvariants.clampZoom(-5, 1.0)).toBe(1.0);
      expect(MathInvariants.clampZoom(0.01)).toBe(0.05); // MIN_ZOOM floor
      expect(MathInvariants.clampZoom(100.0)).toBe(64.0); // MAX_ZOOM ceiling
      expect(MathInvariants.clampZoom(16.0)).toBe(16.0);
    });

    it('safeDivide protects against zero and near-zero denominators', () => {
      expect(MathInvariants.safeDivide(10, 0, 0)).toBe(0);
      expect(MathInvariants.safeDivide(10, 1e-8, 0)).toBe(0); // below epsilon
      expect(MathInvariants.safeDivide(NaN, 5, 0)).toBe(0);
      expect(MathInvariants.safeDivide(10, NaN, 0)).toBe(0);
      expect(MathInvariants.safeDivide(10, 2)).toBe(5);
    });

    it('normalizeRect converts arbitrary inverted vectors to canonical positive rectangles', () => {
      // Dragging from bottom-right (50, 60) to top-left (10, 20)
      const norm = MathInvariants.normalizeRect(50, 60, 10, 20);
      expect(norm).toEqual({ x: 10, y: 20, w: 40, h: 40 });

      // Handles non-finite inputs gracefully
      const safeNorm = MathInvariants.normalizeRect(NaN, 10, 50, Infinity);
      expect(safeNorm.x).toBe(0);
      expect(safeNorm.y).toBe(0);
    });

    it('clipLineToCanvas correctly executes Cohen-Sutherland clipping', () => {
      const w = 100;
      const h = 100;

      // Fully interior line
      const interior = MathInvariants.clipLineToCanvas(10, 10, 50, 50, w, h);
      expect(interior).toEqual({ x0: 10, y0: 10, x1: 50, y1: 50 });

      // Completely exterior line (all x > max)
      const exterior = MathInvariants.clipLineToCanvas(150, 10, 200, 50, w, h);
      expect(exterior).toBeNull();

      // Line crossing left boundary (from x=-50, y=50 to x=50, y=50)
      const clippedLeft = MathInvariants.clipLineToCanvas(-50, 50, 50, 50, w, h);
      expect(clippedLeft).not.toBeNull();
      expect(clippedLeft?.x0).toBe(0);
      expect(clippedLeft?.y0).toBe(50);
      expect(clippedLeft?.x1).toBe(50);
      expect(clippedLeft?.y1).toBe(50);

      // Diagonal line crossing through the whole canvas (-50, -50) -> (150, 150)
      const diagonal = MathInvariants.clipLineToCanvas(-50, -50, 150, 150, w, h);
      expect(diagonal).not.toBeNull();
      expect(diagonal?.x0).toBe(0);
      expect(diagonal?.y0).toBe(0);
      expect(diagonal?.x1).toBe(99);
      expect(diagonal?.y1).toBe(99);
    });
  });

  describe('SafeCanvas', () => {
    it('createImageData prevents IndexSizeError on 0 or negative dimensions', () => {
      const img1 = SafeCanvas.createImageData(null, 0, 0);
      expect(img1.width).toBe(1);
      expect(img1.height).toBe(1);

      const img2 = SafeCanvas.createImageData(null, -10, 50);
      expect(img2.width).toBe(1);
      expect(img2.height).toBe(50);
    });

    it('createImageData rejects memory allocations exceeding the safe area ceiling', () => {
      expect(() => {
        SafeCanvas.createImageData(null, CanvasHardwareLimits.DEFAULT_SAFE_DIM + 1, CanvasHardwareLimits.DEFAULT_SAFE_DIM + 1);
      }).toThrow();
    });
  });

  describe('SafeJson & Prototype Pollution Defense (CWE-1321)', () => {
    it('strips __proto__, constructor, and prototype during JSON parsing', () => {
      const maliciousPayload = '{"title":"Cozy","__proto__":{"polluted":true},"constructor":{"hacked":true}}';
      const parsed = SafeJson.parse<Record<string, any>>(maliciousPayload);

      expect(parsed.title).toBe('Cozy');
      expect(Object.prototype.hasOwnProperty.call(parsed, '__proto__')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(parsed, 'constructor')).toBe(false);
      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    it('enforces maximum recursion depth against stack overflow exploits', () => {
      // Build a 40-level deep nested JSON string
      let deepJson = '{"val": 1}';
      for (let i = 0; i < 40; i++) {
        deepJson = `{"nested": ${deepJson}}`;
      }

      expect(() => {
        SafeJson.parse(deepJson, 32);
      }).toThrow(/max recursion depth/);
    });

    it('sanitizeObject strips prototype keys recursively from in-memory objects', () => {
      const obj = {
        name: 'Project',
        __proto__: { bad: true },
        nested: {
          constructor: 'evil',
          colors: ['#fff'],
        },
      };

      const clean = SafeJson.sanitizeObject(obj);
      expect(clean.name).toBe('Project');
      expect((clean as any).__proto__).toBeUndefined();
      expect(clean.nested.constructor).toBeUndefined();
      expect(clean.nested.colors).toEqual(['#fff']);
    });
  });

  describe('ImageHeaderProbe (CWE-409 Decompression Bomb Defense)', () => {
    it('detects and parses valid synthetic PNG header dimensions', async () => {
      // Construct minimal 24-byte PNG header: Magic (8) + IHDR length (4) + 'IHDR' (4) + Width (4) + Height (4)
      const pngHeader = new Uint8Array(24);
      pngHeader.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
      const view = new DataView(pngHeader.buffer);
      view.setUint32(8, 13, false); // Length
      pngHeader.set([0x49, 0x48, 0x44, 0x52], 12); // 'IHDR'
      view.setUint32(16, 64, false); // Width = 64
      view.setUint32(20, 128, false); // Height = 128

      const result = await ImageHeaderProbe.probe(pngHeader);
      expect(result.format).toBe('PNG');
      expect(result.width).toBe(64);
      expect(result.height).toBe(128);
    });

    it('detects and parses valid synthetic GIF header dimensions', async () => {
      const gifHeader = new Uint8Array(10);
      gifHeader.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0); // 'GIF89a'
      const view = new DataView(gifHeader.buffer);
      view.setUint16(6, 32, true); // Width = 32 (Little Endian)
      view.setUint16(8, 48, true); // Height = 48 (Little Endian)

      const result = await ImageHeaderProbe.probe(gifHeader);
      expect(result.format).toBe('GIF');
      expect(result.width).toBe(32);
      expect(result.height).toBe(48);
    });

    it('rejects decompression bombs with dimensions exceeding 8192px', async () => {
      const bombHeader = new Uint8Array(24);
      bombHeader.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
      const view = new DataView(bombHeader.buffer);
      view.setUint32(8, 13, false);
      bombHeader.set([0x49, 0x48, 0x44, 0x52], 12);
      view.setUint32(16, 65535, false); // 65535px width bomb
      view.setUint32(20, 65535, false); // 65535px height bomb

      await expect(ImageHeaderProbe.probe(bombHeader)).rejects.toThrow(/exceed maximum allowed workstation limit/);
    });

    it('rejects unrecognized image formats', async () => {
      const randomData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
      await expect(ImageHeaderProbe.probe(randomData)).rejects.toThrow(/Unsupported or unrecognizable/);
    });
  });

  describe('StorageResilience', () => {
    it('correctly detects QuotaExceededError variants', () => {
      const quotaErr1 = { name: 'QuotaExceededError', message: 'Quota exceeded' };
      const quotaErr2 = { name: 'DOMException', code: 22, message: 'Storage full' };
      const quotaErr3 = new Error('The quota has been exceeded for this origin');
      const standardErr = new Error('Connection refused');

      expect(StorageResilience.isQuotaExceeded(quotaErr1)).toBe(true);
      expect(StorageResilience.isQuotaExceeded(quotaErr2)).toBe(true);
      expect(StorageResilience.isQuotaExceeded(quotaErr3)).toBe(true);
      expect(StorageResilience.isQuotaExceeded(standardErr)).toBe(false);
    });

    it('prunes volatile caches non-destructively', async () => {
      let clearCalled = false;
      const mockDb = {
        diagnostics: {
          count: async () => 15,
          clear: async () => {
            clearCalled = true;
          },
        },
      };

      const pruned = await StorageResilience.pruneVolatileCaches(mockDb);
      expect(pruned).toBe(15);
      expect(clearCalled).toBe(true);
    });
  });
});
