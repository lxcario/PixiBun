/**
 * Pure sprite sheet slicing engine for PixiBun.
 * Slices a composite sprite sheet image into individual animation frame canvases,
 * with options for cell sizing, column/row layouts, non-empty frame detection,
 * and palette extraction.
 */
import { MAX_CANVAS_FRAMES } from '@/config/canvasLimits';

export interface SliceConfig {
  cellWidth: number;
  cellHeight: number;
  columns?: number;
  rows?: number;
  startX?: number;
  startY?: number;
  spacingX?: number;
  spacingY?: number;
  skipEmpty?: boolean;
  order?: 'row-major' | 'column-major';
}

export interface SliceResult {
  frames: HTMLCanvasElement[];
  totalCells: number;
  nonEmptyCount: number;
  skippedCount: number;
}

/**
 * Automatically computes standard column and row counts from image and cell dimensions.
 */
export function computeGridDimensions(
  imageWidth: number,
  imageHeight: number,
  cellWidth: number,
  cellHeight: number,
  startX = 0,
  startY = 0,
  spacingX = 0,
  spacingY = 0
): { columns: number; rows: number; totalCells: number } {
  const safeCellW = Math.max(1, cellWidth);
  const safeCellH = Math.max(1, cellHeight);
  const stepX = safeCellW + spacingX;
  const stepY = safeCellH + spacingY;

  const availableW = Math.max(0, imageWidth - startX);
  const availableH = Math.max(0, imageHeight - startY);

  const columns = availableW >= safeCellW && stepX > 0 ? Math.max(0, Math.floor((availableW + spacingX) / stepX)) : 0;
  const rows = availableH >= safeCellH && stepY > 0 ? Math.max(0, Math.floor((availableH + spacingY) / stepY)) : 0;

  return {
    columns,
    rows,
    totalCells: columns * rows,
  };
}

/**
 * Inspects an RGBA ImageData buffer to determine if a cell contains any visible pixels.
 */
export function isCellEmpty(
  imgData: ImageData | { data: Uint8ClampedArray; width: number; height: number },
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number
): boolean {
  const { data, width, height } = imgData;
  const endX = Math.min(width, cellX + cellW);
  const endY = Math.min(height, cellY + cellH);

  for (let y = Math.max(0, cellY); y < endY; y++) {
    for (let x = Math.max(0, cellX); x < endX; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 5) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Extracts individual frame cells from an HTMLCanvasElement sprite sheet source.
 */
export function sliceSpriteSheet(
  sourceCanvas: HTMLCanvasElement,
  config: SliceConfig
): SliceResult {
  const { width: imgW, height: imgH } = sourceCanvas;
  const {
    cellWidth,
    cellHeight,
    startX = 0,
    startY = 0,
    spacingX = 0,
    spacingY = 0,
    skipEmpty = true,
    order = 'row-major',
  } = config;

  if ([cellWidth, cellHeight, startX, startY, spacingX, spacingY].some((value) => !Number.isSafeInteger(value) || value < 0) ||
      cellWidth < 1 || cellHeight < 1 ||
      (config.columns !== undefined && (!Number.isSafeInteger(config.columns) || config.columns < 0)) ||
      (config.rows !== undefined && (!Number.isSafeInteger(config.rows) || config.rows < 0))) {
    throw new RangeError('Sprite sheet cell size, offsets, spacing, and grid counts must be valid whole numbers.');
  }

  const grid = computeGridDimensions(imgW, imgH, cellWidth, cellHeight, startX, startY, spacingX, spacingY);
  const cols = config.columns ?? grid.columns;
  const rows = config.rows ?? grid.rows;
  const totalCells = cols * rows;
  if (totalCells > MAX_CANVAS_FRAMES) {
    throw new RangeError(`Sprite sheet has more than ${MAX_CANVAS_FRAMES} cells. Increase the cell size or crop the sheet.`);
  }
  if (totalCells === 0) return { frames: [], totalCells: 0, nonEmptyCount: 0, skippedCount: 0 };

  const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) {
    return { frames: [], totalCells: 0, nonEmptyCount: 0, skippedCount: 0 };
  }

  const fullImageData = skipEmpty ? srcCtx.getImageData(0, 0, imgW, imgH) : null;
  const frames: HTMLCanvasElement[] = [];
  let skippedCount = 0;

  const stepX = cellWidth + spacingX;
  const stepY = cellHeight + spacingY;

  // Build cell coordinates according to traversal order
  const coords: { c: number; r: number }[] = [];
  if (order === 'column-major') {
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        coords.push({ c, r });
      }
    }
  } else {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        coords.push({ c, r });
      }
    }
  }

  for (const { c, r } of coords) {
    const x = startX + c * stepX;
    const y = startY + r * stepY;

    if (x + cellWidth > imgW || y + cellHeight > imgH) {
      skippedCount++;
      continue;
    }

    if (fullImageData && isCellEmpty(fullImageData, x, y, cellWidth, cellHeight)) {
      skippedCount++;
      continue;
    }

    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = cellWidth;
    frameCanvas.height = cellHeight;
    const fCtx = frameCanvas.getContext('2d');
    if (!fCtx) continue;

    fCtx.imageSmoothingEnabled = false;
    fCtx.drawImage(sourceCanvas, x, y, cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);
    frames.push(frameCanvas);
  }

  return {
    frames,
    totalCells,
    nonEmptyCount: frames.length,
    skippedCount,
  };
}

/**
 * Extracts a deduplicated hex palette from a collection of sliced frame canvases.
 */
export function extractPaletteFromFrames(frames: HTMLCanvasElement[], maxColors = 64): string[] {
  const colorSet = new Set<string>();

  for (const canvas of frames) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) continue;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    for (let i = 0; i < imgData.length; i += 4) {
      const a = imgData[i + 3];
      if (a > 10) {
        const r = imgData[i].toString(16).padStart(2, '0');
        const g = imgData[i + 1].toString(16).padStart(2, '0');
        const b = imgData[i + 2].toString(16).padStart(2, '0');
        colorSet.add(`#${r}${g}${b}`.toUpperCase());
        if (colorSet.size >= maxColors) {
          return Array.from(colorSet);
        }
      }
    }
  }

  return Array.from(colorSet);
}
