import { describe, it, expect, vi } from 'vitest';
import {
  computeGridDimensions,
  isCellEmpty,
  sliceSpriteSheet,
  extractPaletteFromFrames,
} from '@/lib/canvas/spritesheetSlicer';
import { makeCanvas } from './helpers/mockCanvas';

function createMockCanvas(width: number, height: number, initialPixels?: Uint8ClampedArray): HTMLCanvasElement {
  const canvas = makeCanvas(width, height);
  if (initialPixels) canvas.getContext('2d')!.putImageData({ data: initialPixels, width, height } as ImageData, 0, 0);
  return canvas as unknown as HTMLCanvasElement;
}

if (typeof document === 'undefined') {
  (globalThis as unknown as { document: unknown }).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return createMockCanvas(16, 16);
      }
      return {};
    },
  };
}

describe('spritesheetSlicer pure utilities', () => {
  it('rejects an excessive cell grid before reading pixels or allocating frame canvases', () => {
    const getImageData = vi.fn();
    const sheet = { width: 1024, height: 1024, getContext: () => ({ getImageData }) } as unknown as HTMLCanvasElement;
    expect(() => sliceSpriteSheet(sheet, { cellWidth: 1, cellHeight: 1, skipEmpty: false })).toThrow(/more than 500 cells/);
    expect(getImageData).not.toHaveBeenCalled();
  });

  it('does not report cells when the configured cell is larger than the image', () => {
    expect(computeGridDimensions(16, 16, 32, 32).totalCells).toBe(0);
  });

  it('honors offset, spacing and column traversal without reading pixels when blanks are kept', () => {
    const getImageData = vi.fn();
    const sheet = {
      width: 38, height: 20,
      getContext: () => ({ getImageData }),
    } as unknown as HTMLCanvasElement;
    const result = sliceSpriteSheet(sheet, {
      cellWidth: 8, cellHeight: 8, startX: 2, startY: 1,
      spacingX: 2, spacingY: 2, skipEmpty: false, order: 'column-major',
    });
    expect(result.totalCells).toBe(6);
    expect(result.frames).toHaveLength(6);
    expect(getImageData).not.toHaveBeenCalled();
  });

  it('computes grid columns and rows correctly', () => {
    // 64x32 image with 16x16 cells -> 4 columns, 2 rows, 8 total
    const grid = computeGridDimensions(64, 32, 16, 16);
    expect(grid.columns).toBe(4);
    expect(grid.rows).toBe(2);
    expect(grid.totalCells).toBe(8);

    // With spacing
    const gridWithSpacing = computeGridDimensions(70, 35, 16, 16, 0, 0, 2, 2);
    expect(gridWithSpacing.columns).toBe(4);
    expect(gridWithSpacing.rows).toBe(2);
  });

  it('detects empty transparent cells vs non-empty cells', () => {
    const width = 8;
    const height = 8;
    const data = new Uint8ClampedArray(width * height * 4); // all 0 (transparent)

    expect(isCellEmpty({ data, width, height }, 0, 0, 4, 4)).toBe(true);

    // Put a solid pixel at (2, 2)
    const idx = (2 * width + 2) * 4;
    data[idx] = 255;
    data[idx + 1] = 0;
    data[idx + 2] = 0;
    data[idx + 3] = 255; // Alpha 255

    expect(isCellEmpty({ data, width, height }, 0, 0, 4, 4)).toBe(false);
    expect(isCellEmpty({ data, width, height }, 4, 0, 4, 4)).toBe(true);
  });

  it('slices sprite sheet and filters out empty cells', () => {
    const width = 32;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);

    // Cell 0 (0..16, 0..16) has pixel at (2, 2)
    const p1 = (2 * width + 2) * 4;
    data[p1] = 255; data[p1 + 3] = 255;

    // Cell 1 (16..32, 0..16) is fully transparent

    const mockSource = createMockCanvas(width, height, data);
    const result = sliceSpriteSheet(mockSource, {
      cellWidth: 16,
      cellHeight: 16,
      skipEmpty: true,
    });

    expect(result.totalCells).toBe(2);
    expect(result.nonEmptyCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.frames).toHaveLength(1);
  });

  it('extracts unique hex palette from frame canvases', () => {
    const data1 = new Uint8ClampedArray(4 * 4 * 4);
    // Red pixel
    data1[0] = 255; data1[1] = 0; data1[2] = 0; data1[3] = 255;
    // Green pixel
    data1[4] = 0; data1[5] = 255; data1[6] = 0; data1[7] = 255;

    const canvas1 = createMockCanvas(4, 4, data1);
    const palette = extractPaletteFromFrames([canvas1]);

    expect(palette).toContain('#FF0000');
    expect(palette).toContain('#00FF00');
  });

  it('slices a completely blank sheet and returns 0 frames when skipEmpty is true', () => {
    const width = 32;
    const height = 32;
    const data = new Uint8ClampedArray(width * height * 4); // all 0
    const mockSource = createMockCanvas(width, height, data);

    const result = sliceSpriteSheet(mockSource, {
      cellWidth: 16,
      cellHeight: 16,
      skipEmpty: true,
    });

    expect(result.totalCells).toBe(4);
    expect(result.nonEmptyCount).toBe(0);
    expect(result.skippedCount).toBe(4);
    expect(result.frames).toHaveLength(0);
  });

  it('slices in column-major order when specified', () => {
    const width = 32;
    const height = 32;
    const data = new Uint8ClampedArray(width * height * 4);
    // Put a solid pixel in every cell so none are skipped
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 100;
      data[i + 3] = 255;
    }
    const mockSource = createMockCanvas(width, height, data);

    const result = sliceSpriteSheet(mockSource, {
      cellWidth: 16,
      cellHeight: 16,
      skipEmpty: false,
      order: 'column-major',
    });

    expect(result.frames).toHaveLength(4);
  });
});
