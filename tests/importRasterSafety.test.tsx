// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { importPreviewSize, isSourceCellEmpty, reserveImportCanvas } from '@/lib/project/importRaster';
import { COMBINED_MEMORY_LIMIT_BYTES, getMemoryBudgetUsage, reserveMemory } from '@/lib/safety/memoryBudget';
import { readImportFile, importErrorMessage } from '@/lib/project/importFile';
import { SafeJson } from '@/lib/safety/safeJson';
import { usePixelizeEngine } from '@/hooks/usePixelizeEngine';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function contexts(visible?: { x: number; y: number }, fail = false) {
  const reads: number[] = [];
  const owned: HTMLCanvasElement[] = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    owned.push(this);
    let pixel = false;
    return {
      clearRect: () => { pixel = false; },
      drawImage: (_source: unknown, x: number, y: number, width: number, height: number) => {
        if (fail) throw new Error('read fixture failure');
        pixel = Boolean(visible && visible.x >= x && visible.x < x + width && visible.y >= y && visible.y < y + height);
      },
      getImageData: (_x: number, _y: number, width: number, height: number) => {
        reads.push(width * height * 4);
        expect(getMemoryBudgetUsage().reservedBytes).toBeGreaterThan(0);
        const data = new Uint8ClampedArray(width * height * 4);
        if (pixel) data[3] = 255;
        return { data, width, height };
      },
    } as unknown as CanvasRenderingContext2D;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext);
  return { reads, owned };
}

describe('Import-owned raster admission and cleanup', () => {
  it('bounds displayed dimensions while preserving aspect ratio', () => {
    expect(importPreviewSize(8192, 4096)).toEqual({ width: 1024, height: 512 });
    expect(importPreviewSize(16, 32)).toEqual({ width: 16, height: 32 });
    expect(() => importPreviewSize(0, 1)).toThrow();
  });

  it('rejects before canvas creation when the retained artwork leaves insufficient budget', () => {
    const baseline = getMemoryBudgetUsage().reservedBytes;
    const release = reserveMemory(COMBINED_MEMORY_LIMIT_BYTES - getMemoryBudgetUsage().totalBytes - 16, 'fixture');
    const create = vi.spyOn(document, 'createElement');
    try {
      expect(() => reserveImportCanvas(4, 4, 'Import preview')).toThrow(/memory budget/);
      expect(create).not.toHaveBeenCalled();
    } finally { release(); }
    expect(getMemoryBudgetUsage().reservedBytes).toBe(baseline);
  });

  it('finds a single original pixel at the far edge without reading a full source plane', () => {
    const baseline = getMemoryBudgetUsage().reservedBytes;
    const fixture = contexts({ x: 8191, y: 4095 });
    const image = { width: 8192, height: 8192 } as CanvasImageSource;
    expect(isSourceCellEmpty(image, 7680, 3968, 512, 128)).toBe(false);
    expect(fixture.reads.every(bytes => bytes <= 256 * 64 * 4)).toBe(true);
    expect(fixture.owned.every(canvas => canvas.width === 0 && canvas.height === 0)).toBe(true);
    expect(getMemoryBudgetUsage().reservedBytes).toBe(baseline);
  });

  it('releases scratch reservations on a failed read and on a blank cell', () => {
    const baseline = getMemoryBudgetUsage().reservedBytes;
    contexts(undefined, true);
    expect(() => isSourceCellEmpty({} as CanvasImageSource, 0, 0, 32, 32)).toThrow('read fixture failure');
    expect(getMemoryBudgetUsage().reservedBytes).toBe(baseline);
    vi.restoreAllMocks();
    contexts();
    expect(isSourceCellEmpty({} as CanvasImageSource, 0, 0, 32, 32)).toBe(true);
    expect(getMemoryBudgetUsage().reservedBytes).toBe(baseline);
  });

  it('releases a canvas reservation if canvas creation throws', () => {
    const baseline = getMemoryBudgetUsage().reservedBytes;
    vi.spyOn(document, 'createElement').mockImplementation(() => { throw new Error('allocation fixture'); });
    expect(() => reserveImportCanvas(32, 32, 'preview')).toThrow('allocation fixture');
    expect(getMemoryBudgetUsage().reservedBytes).toBe(baseline);
  });

  it('retains one exact preview reservation and releases its exclusively owned surface on replacement and unmount', () => {
    contexts();
    const baseline = getMemoryBudgetUsage().reservedBytes;
    const { result, unmount } = renderHook(() => usePixelizeEngine({ canvasWidth: 32, canvasHeight: 32, activePalette: [] }));
    const image = { width: 2, height: 2, naturalWidth: 2, naturalHeight: 2 } as HTMLImageElement;
    act(() => result.current.runPixelization(image));
    const first = result.current.previewResult!.canvas;
    expect(getMemoryBudgetUsage().reservedBytes - baseline).toBe(16);
    act(() => result.current.runPixelization(image));
    expect(first.width).toBe(0);
    expect(getMemoryBudgetUsage().reservedBytes - baseline).toBe(16);
    const second = result.current.previewResult!.canvas;
    unmount();
    expect(second.width).toBe(0);
    expect(getMemoryBudgetUsage().reservedBytes).toBe(baseline);
  });
});

describe('Import file admission', () => {
  it('checks metadata traversal before publishing project JSON', async () => {
    const file = new File([JSON.stringify(Array(50_001).fill(0))], 'complex.pixibun');
    await expect(readImportFile(file)).rejects.toMatchObject({ code: 'SAFE_JSON_TRAVERSAL_LIMIT' });
  });

  it('does not decode an image before the modal owns its memory reservation', async () => {
    const constructor = vi.fn();
    vi.stubGlobal('Image', constructor);
    const header = new Uint8Array(24);
    header.set([137, 80, 78, 71, 13, 10, 26, 10]);
    const view = new DataView(header.buffer);
    view.setUint32(12, 0x49484452);
    view.setUint32(16, 2); view.setUint32(20, 2);
    const payload = await readImportFile(new File([header], 'image.png'));
    expect(payload.imgWidth).toBe(2);
    expect(constructor).not.toHaveBeenCalled();
  });

  it('translates parser failures without altering the technical diagnostic', () => {
    let failure: unknown;
    try { SafeJson.parse('{bad'); } catch (error) { failure = error; }
    expect(importErrorMessage(failure)).toContain('not valid JSON');
    expect((failure as Error).message).toContain('[SafeJson]');
  });
});
