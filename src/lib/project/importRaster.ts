import { reserveMemory } from '@/lib/safety/memoryBudget';

export const IMPORT_PREVIEW_MAX_DIMENSION = 1024;
export const IMPORT_PREVIEW_SCAN_PIXELS = 4_194_304;

export function importPreviewSize(width: number, height: number, limit = IMPORT_PREVIEW_MAX_DIMENSION) {
  if (![width, height, limit].every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new RangeError('Image dimensions must be positive whole numbers.');
  }
  const scale = Math.min(1, limit / width, limit / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** An exclusive scratch surface: never use this destructor on artwork registry canvases. */
export function reserveImportCanvas(width: number, height: number, operation: string) {
  if (![width, height].every(value => Number.isSafeInteger(value) && value > 0)) throw new RangeError('Image dimensions must be positive whole numbers.');
  const release = reserveMemory(width * height * 4, operation);
  let canvas: HTMLCanvasElement | undefined;
  try {
    canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const owned = canvas;
    return { canvas: owned, release: () => { owned.width = 0; owned.height = 0; release(); } };
  } catch (error) {
    if (canvas) { canvas.width = 0; canvas.height = 0; }
    release(); throw error;
  }
}

/** Read original pixels in strips; display scaling must not decide whether a cell is empty. */
export function isSourceCellEmpty(source: CanvasImageSource, x: number, y: number, width: number, height: number): boolean {
  if (![width, height].every(value => Number.isSafeInteger(value) && value > 0) ||
    ![x, y].every(value => Number.isSafeInteger(value) && value >= 0)) throw new RangeError('Sprite sheet cells must use valid whole-number dimensions and offsets.');
  const tileWidth = Math.min(width, 256);
  const tileHeight = Math.min(height, 64);
  const releaseRead = reserveMemory(tileWidth * tileHeight * 4, 'Reading sprite sheet cells');
  let scratch: ReturnType<typeof reserveImportCanvas> | undefined;
  try {
    scratch = reserveImportCanvas(tileWidth, tileHeight, 'Checking sprite sheet cells');
    const context = scratch.canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('The image preview could not be rendered.');
    context.imageSmoothingEnabled = false;
    for (let offsetY = 0; offsetY < height; offsetY += tileHeight) {
      for (let offsetX = 0; offsetX < width; offsetX += tileWidth) {
        const w = Math.min(tileWidth, width - offsetX), h = Math.min(tileHeight, height - offsetY);
        context.clearRect(0, 0, tileWidth, tileHeight);
        context.drawImage(source, x + offsetX, y + offsetY, w, h, 0, 0, w, h);
        const data = context.getImageData(0, 0, w, h).data;
        for (let index = 3; index < data.length; index += 4) if (data[index] > 5) return false;
      }
    }
    return true;
  } finally { releaseRead(); scratch?.release(); }
}
