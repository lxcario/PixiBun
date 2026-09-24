// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  packSpriteSheet,
  calculateSpriteSheetGeometry,
  validateExportGeometry,
} from '@/lib/export/spriteSheetPacker';
import {
  MAX_SAFE_CANVAS_DIMENSION,
  MAX_SAFE_CANVAS_PIXELS,
} from '@/config/canvasLimits';

function createMockCanvas(width: number, height: number): HTMLCanvasElement {
  return {
    width,
    height,
    getContext: () => ({
      imageSmoothingEnabled: false,
      drawImage: vi.fn(),
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        width: w,
        height: h,
        data: new Uint8ClampedArray(w * h * 4),
      }),
    }),
  } as unknown as HTMLCanvasElement;
}

describe('Sprite-Sheet Export Output Ceilings (H2 Verification)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // A. Safe horizontal sheet succeeds
  it('A. packs safe horizontal sheet without error and matches expected dimensions', () => {
    const frames = [
      createMockCanvas(32, 32),
      createMockCanvas(32, 32),
      createMockCanvas(32, 32),
      createMockCanvas(32, 32),
    ];
    const packed = packSpriteSheet(frames, 32, 32, 8, 'Hero', {
      layout: 'horizontal',
      scale: 2,
      padding: 1,
    });

    // 4 frames * (32 * 2 = 64) + (4 + 1) * 1 = 256 + 5 = 261
    // 1 row * 64 + (1 + 1) * 1 = 66
    expect(packed.metadata.width).toBe(261);
    expect(packed.metadata.height).toBe(66);
    expect(packed.canvas.width).toBe(261);
    expect(packed.canvas.height).toBe(66);
    expect(packed.metadata.totalFrames).toBe(4);
  });

  // B. Safe vertical sheet succeeds
  it('B. packs safe vertical sheet without error and matches expected dimensions', () => {
    const frames = [
      createMockCanvas(32, 32),
      createMockCanvas(32, 32),
      createMockCanvas(32, 32),
      createMockCanvas(32, 32),
    ];
    const packed = packSpriteSheet(frames, 32, 32, 8, 'Hero', {
      layout: 'vertical',
      scale: 2,
      padding: 1,
    });

    // 1 col * 64 + 2 * 1 = 66
    // 4 rows * 64 + 5 * 1 = 261
    expect(packed.metadata.width).toBe(66);
    expect(packed.metadata.height).toBe(261);
    expect(packed.canvas.width).toBe(66);
    expect(packed.canvas.height).toBe(261);
  });

  // C. Safe grid sheet succeeds
  it('C. packs safe grid sheet without error and matches expected dimensions', () => {
    const frames = [
      createMockCanvas(32, 32),
      createMockCanvas(32, 32),
      createMockCanvas(32, 32),
      createMockCanvas(32, 32),
    ];
    const packed = packSpriteSheet(frames, 32, 32, 8, 'Hero', {
      layout: 'grid',
      scale: 2,
      padding: 2,
      columns: 2,
    });

    // 2 cols * 64 + 3 * 2 = 128 + 6 = 134
    // 2 rows * 64 + 3 * 2 = 128 + 6 = 134
    expect(packed.metadata.width).toBe(134);
    expect(packed.metadata.height).toBe(134);
    expect(packed.canvas.width).toBe(134);
    expect(packed.canvas.height).toBe(134);
  });

  // D. Width exceeds safe dimension
  it('D. rejects before final canvas allocation when sheet width exceeds MAX_SAFE_CANVAS_DIMENSION', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');

    // 5 frames of 1000px width at 1x = 5000px > 4096px
    const frames = [
      createMockCanvas(1000, 64),
      createMockCanvas(1000, 64),
      createMockCanvas(1000, 64),
      createMockCanvas(1000, 64),
      createMockCanvas(1000, 64),
    ];

    expect(() => {
      packSpriteSheet(frames, 1000, 64, 8, 'Hero', {
        layout: 'horizontal',
        scale: 1,
        padding: 0,
      });
    }).toThrow(RangeError);

    // Assert document.createElement('canvas') was NEVER called
    const canvasAllocations = createElementSpy.mock.calls.filter((call) => call[0] === 'canvas');
    expect(canvasAllocations).toHaveLength(0);
  });

  // E. Height exceeds safe dimension
  it('E. rejects before final canvas allocation when sheet height exceeds MAX_SAFE_CANVAS_DIMENSION', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');

    // 5 frames of 1000px height at 1x = 5000px > 4096px in vertical layout
    const frames = [
      createMockCanvas(64, 1000),
      createMockCanvas(64, 1000),
      createMockCanvas(64, 1000),
      createMockCanvas(64, 1000),
      createMockCanvas(64, 1000),
    ];

    expect(() => {
      packSpriteSheet(frames, 64, 1000, 8, 'Hero', {
        layout: 'vertical',
        scale: 1,
        padding: 0,
      });
    }).toThrow(RangeError);

    const canvasAllocations = createElementSpy.mock.calls.filter((call) => call[0] === 'canvas');
    expect(canvasAllocations).toHaveLength(0);
  });

  // F. Width/height individually legal but total area exceeds safe pixel ceiling
  it('F. rejects when total pixel area exceeds configured pixel ceiling', () => {
    // 3000 x 3000 is individually <= 4096, but 3000 * 3000 = 9,000,000 px.
    // If a custom limit of 8,000,000 pixels is passed:
    const validation = validateExportGeometry(3000, 3000, {
      maxDimension: 4096,
      maxPixels: 8_000_000,
    });

    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('exceeds-pixels');
    expect(validation.error).toContain('exceeds maximum safety limit');
  });

  // G. Padding pushes otherwise-valid sheet over the ceiling
  it('G. rejects when padding pushes an otherwise-exact 4096px sheet over the boundary', () => {
    // 4 frames of 1024px: 4 * 1024 = 4096px (exact limit without padding)
    const exactGeo = calculateSpriteSheetGeometry(4, 1024, 64, {
      layout: 'horizontal',
      scale: 1,
      padding: 0,
    });
    expect(exactGeo.sheetWidth).toBe(4096);
    expect(validateExportGeometry(exactGeo.sheetWidth, exactGeo.sheetHeight).valid).toBe(true);

    // Adding 1px padding: 4096 + (4 + 1) * 1 = 4101px > 4096px
    const paddedGeo = calculateSpriteSheetGeometry(4, 1024, 64, {
      layout: 'horizontal',
      scale: 1,
      padding: 1,
    });
    expect(paddedGeo.sheetWidth).toBe(4101);
    const paddedValidation = validateExportGeometry(paddedGeo.sheetWidth, paddedGeo.sheetHeight);
    expect(paddedValidation.valid).toBe(false);
    expect(paddedValidation.reason).toBe('exceeds-dimension');

    // packSpriteSheet also rejects before canvas allocation
    const createElementSpy = vi.spyOn(document, 'createElement');
    const frames = [
      createMockCanvas(1024, 64),
      createMockCanvas(1024, 64),
      createMockCanvas(1024, 64),
      createMockCanvas(1024, 64),
    ];
    expect(() => {
      packSpriteSheet(frames, 1024, 64, 8, 'Hero', {
        layout: 'horizontal',
        scale: 1,
        padding: 1,
      });
    }).toThrow(RangeError);
    expect(createElementSpy.mock.calls.filter((c) => c[0] === 'canvas')).toHaveLength(0);
  });

  // H. High frame count causes unsafe geometry and preflight rejects before expensive frame compositing
  it('H. detects unsafe geometry in preflight for high frame count before frame preparation', () => {
    const frameCount = 100;
    const canvasWidth = 64;
    const canvasHeight = 64;
    const scale = 2; // scaledWidth = 128px

    // Horizontal: 100 * 128 = 12,800px > 4096px
    const geo = calculateSpriteSheetGeometry(frameCount, canvasWidth, canvasHeight, {
      layout: 'horizontal',
      scale,
      padding: 0,
    });

    expect(geo.sheetWidth).toBe(12800);
    const validation = validateExportGeometry(geo.sheetWidth, geo.sheetHeight);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('exceeds-dimension');

    // UI preflight invariant: validation.valid is false, which stops handleExportSpriteSheet
    // before any loop over compositeFrame begins!
  });

  // I. Low-level packSpriteSheet direct call with unsafe geometry
  it('I. packSpriteSheet throws typed RangeError with descriptive error message on unsafe geometry', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');

    const frames = [
      createMockCanvas(512, 512),
      createMockCanvas(512, 512),
      createMockCanvas(512, 512),
      createMockCanvas(512, 512),
      createMockCanvas(512, 512),
      createMockCanvas(512, 512),
      createMockCanvas(512, 512),
      createMockCanvas(512, 512),
      createMockCanvas(512, 512),
    ];

    // Horizontal 9 frames of 512 * 4 = 2048px each -> 9 * 2048 = 18,432px
    expect(() => {
      packSpriteSheet(frames, 512, 512, 12, 'Monster', {
        layout: 'horizontal',
        scale: 4,
        padding: 0,
      });
    }).toThrow(/Sprite sheet export aborted: Export dimensions 18432x2048 exceed maximum dimension limit of 4096px/);

    expect(createElementSpy.mock.calls.filter((c) => c[0] === 'canvas')).toHaveLength(0);
  });

  // J. Boundary values: exactly at dimension/pixel limit
  it('J. correctly accepts exact 4096px boundary and rejects 4097px boundary', () => {
    // Exact dimension limit
    const exactLimitValidation = validateExportGeometry(
      MAX_SAFE_CANVAS_DIMENSION,
      MAX_SAFE_CANVAS_DIMENSION
    );
    expect(exactLimitValidation.valid).toBe(true);
    expect(exactLimitValidation.totalPixels).toBe(MAX_SAFE_CANVAS_PIXELS);

    // 1px over width
    const overWidth = validateExportGeometry(
      MAX_SAFE_CANVAS_DIMENSION + 1,
      64
    );
    expect(overWidth.valid).toBe(false);
    expect(overWidth.reason).toBe('exceeds-dimension');

    // 1px over height
    const overHeight = validateExportGeometry(
      64,
      MAX_SAFE_CANVAS_DIMENSION + 1
    );
    expect(overHeight.valid).toBe(false);
    expect(overHeight.reason).toBe('exceeds-dimension');

    // Invalid non-positive / non-finite dimensions
    expect(validateExportGeometry(0, 100).valid).toBe(false);
    expect(validateExportGeometry(100, -5).valid).toBe(false);
    expect(validateExportGeometry(NaN, 100).valid).toBe(false);
    expect(validateExportGeometry(Infinity, 100).valid).toBe(false);
  });

  it('rejects empty frame list with RangeError before allocation', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    expect(() => {
      packSpriteSheet([], 32, 32, 8, 'Hero');
    }).toThrow(/Cannot pack sprite sheet: no frames provided/);
    expect(createElementSpy.mock.calls.filter((c) => c[0] === 'canvas')).toHaveLength(0);
  });
});
