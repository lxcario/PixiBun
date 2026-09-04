/**
 * Tileset / Tile-Stamping Engine for PixiBun Atelier.
 *
 * Industry Standard Reference:
 * - 2D Grid Tilemap Architecture (Tiled map editor format & Aseprite tilemap layer spec).
 * - Finite Grid Decompositions and Atlas Packing.
 *
 * Provides deterministic grid-snapped tile extraction, tile palette caching,
 * tile transformations (flip/rotate), tile deduplication, and tilemap indexing
 * for RPG, platformer, and roguelike asset production pipelines.
 */

export interface TileGridCoord {
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
}

export interface RawPixelBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray<ArrayBufferLike> | Uint8Array<ArrayBufferLike>;
}

/**
 * Snaps continuous canvas pixel coordinates to the nearest tile grid cell origin.
 */
export function snapToTileGrid(x: number, y: number, tileSize: number): TileGridCoord {
  const size = Math.max(1, Math.floor(tileSize));
  const gridX = Math.floor(x / size);
  const gridY = Math.floor(y / size);
  return {
    gridX,
    gridY,
    pixelX: gridX * size,
    pixelY: gridY * size,
  };
}

/**
 * Extracts a rectangular tile of size (tileSize x tileSize) from a raw pixel buffer.
 */
export function extractTileFromBuffer(
  source: RawPixelBuffer,
  pixelX: number,
  pixelY: number,
  tileSize: number
): Uint8ClampedArray {
  const size = Math.max(1, Math.floor(tileSize));
  const result = new Uint8ClampedArray(size * size * 4);

  for (let ty = 0; ty < size; ty++) {
    const sy = pixelY + ty;
    for (let tx = 0; tx < size; tx++) {
      const sx = pixelX + tx;
      const targetIdx = (ty * size + tx) * 4;

      if (sx >= 0 && sx < source.width && sy >= 0 && sy < source.height) {
        const sourceIdx = (sy * source.width + sx) * 4;
        result[targetIdx] = source.data[sourceIdx];
        result[targetIdx + 1] = source.data[sourceIdx + 1];
        result[targetIdx + 2] = source.data[sourceIdx + 2];
        result[targetIdx + 3] = source.data[sourceIdx + 3];
      } else {
        // Out of bounds: transparent
        result[targetIdx] = 0;
        result[targetIdx + 1] = 0;
        result[targetIdx + 2] = 0;
        result[targetIdx + 3] = 0;
      }
    }
  }

  return result;
}

/**
 * Stamps an extracted tile buffer onto a target pixel buffer at specified coordinates.
 */
export function stampTileOntoBuffer(
  target: RawPixelBuffer,
  tileData: Uint8ClampedArray | Uint8Array,
  tileSize: number,
  destPixelX: number,
  destPixelY: number,
  opacity: number = 1.0
): void {
  const size = Math.max(1, Math.floor(tileSize));
  const alphaMul = Math.max(0, Math.min(1, opacity));

  for (let ty = 0; ty < size; ty++) {
    const dy = destPixelY + ty;
    if (dy < 0 || dy >= target.height) continue;

    for (let tx = 0; tx < size; tx++) {
      const dx = destPixelX + tx;
      if (dx < 0 || dx >= target.width) continue;

      const tileIdx = (ty * size + tx) * 4;
      const srcA = (tileData[tileIdx + 3] / 255) * alphaMul;
      if (srcA <= 0) continue;

      const targetIdx = (dy * target.width + dx) * 4;
      if (srcA >= 1.0) {
        target.data[targetIdx] = tileData[tileIdx];
        target.data[targetIdx + 1] = tileData[tileIdx + 1];
        target.data[targetIdx + 2] = tileData[tileIdx + 2];
        target.data[targetIdx + 3] = tileData[tileIdx + 3];
      } else {
        // Standard alpha compositing (source-over)
        const dstA = target.data[targetIdx + 3] / 255;
        const outA = srcA + dstA * (1 - srcA);

        if (outA > 0) {
          const srcR = tileData[tileIdx];
          const srcG = tileData[tileIdx + 1];
          const srcB = tileData[tileIdx + 2];

          const dstR = target.data[targetIdx];
          const dstG = target.data[targetIdx + 1];
          const dstB = target.data[targetIdx + 2];

          target.data[targetIdx] = Math.round((srcR * srcA + dstR * dstA * (1 - srcA)) / outA);
          target.data[targetIdx + 1] = Math.round((srcG * srcA + dstG * dstA * (1 - srcA)) / outA);
          target.data[targetIdx + 2] = Math.round((srcB * srcA + dstB * dstA * (1 - srcA)) / outA);
          target.data[targetIdx + 3] = Math.round(outA * 255);
        }
      }
    }
  }
}

/**
 * Checks if two tile byte arrays are identical.
 */
export function tilesAreEqual(
  a: Uint8ClampedArray | Uint8Array,
  b: Uint8ClampedArray | Uint8Array
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Horizontally flips a tile buffer in-place or returns a new buffer.
 */
export function flipTileHorizontal(
  tileData: Uint8ClampedArray | Uint8Array,
  size: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(tileData.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const srcIdx = (y * size + x) * 4;
      const dstIdx = (y * size + (size - 1 - x)) * 4;
      result[dstIdx] = tileData[srcIdx];
      result[dstIdx + 1] = tileData[srcIdx + 1];
      result[dstIdx + 2] = tileData[srcIdx + 2];
      result[dstIdx + 3] = tileData[srcIdx + 3];
    }
  }
  return result;
}

/**
 * Vertically flips a tile buffer.
 */
export function flipTileVertical(
  tileData: Uint8ClampedArray | Uint8Array,
  size: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(tileData.length);
  for (let y = 0; y < size; y++) {
    const dstY = size - 1 - y;
    for (let x = 0; x < size; x++) {
      const srcIdx = (y * size + x) * 4;
      const dstIdx = (dstY * size + x) * 4;
      result[dstIdx] = tileData[srcIdx];
      result[dstIdx + 1] = tileData[srcIdx + 1];
      result[dstIdx + 2] = tileData[srcIdx + 2];
      result[dstIdx + 3] = tileData[srcIdx + 3];
    }
  }
  return result;
}

/**
 * Rotates a square tile buffer by 90 degrees clockwise.
 */
export function rotateTile90(
  tileData: Uint8ClampedArray | Uint8Array,
  size: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(tileData.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const srcIdx = (y * size + x) * 4;
      // 90 deg clockwise: (x, y) -> (size - 1 - y, x)
      const dstX = size - 1 - y;
      const dstY = x;
      const dstIdx = (dstY * size + dstX) * 4;
      result[dstIdx] = tileData[srcIdx];
      result[dstIdx + 1] = tileData[srcIdx + 1];
      result[dstIdx + 2] = tileData[srcIdx + 2];
      result[dstIdx + 3] = tileData[srcIdx + 3];
    }
  }
  return result;
}

/**
 * Decomposes a canvas buffer into a distinct tileset palette and a 2D tilemap index grid.
 */
export function decomposeIntoTileset(
  source: RawPixelBuffer,
  tileSize: number
): { tileset: Uint8ClampedArray[]; tilemap: number[][] } {
  const size = Math.max(1, Math.floor(tileSize));
  const cols = Math.floor(source.width / size);
  const rows = Math.floor(source.height / size);

  const tileset: Uint8ClampedArray[] = [];
  const tilemap: number[][] = [];

  for (let r = 0; r < rows; r++) {
    const rowIndices: number[] = [];
    for (let c = 0; c < cols; c++) {
      const tile = extractTileFromBuffer(source, c * size, r * size, size);

      // Check if tile already exists in tileset
      let tileIndex = -1;
      for (let i = 0; i < tileset.length; i++) {
        if (tilesAreEqual(tileset[i], tile)) {
          tileIndex = i;
          break;
        }
      }

      if (tileIndex === -1) {
        tileIndex = tileset.length;
        tileset.push(tile);
      }

      rowIndices.push(tileIndex);
    }
    tilemap.push(rowIndices);
  }

  return { tileset, tilemap };
}

/**
 * Extracts a rectangular tile of size (tileSize x tileSize) from a source canvas.
 */
export function extractTileFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  pixelX: number,
  pixelY: number,
  tileSize: number
): ImageData | null {
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const size = Math.max(1, Math.floor(tileSize));
  return ctx.getImageData(pixelX, pixelY, size, size);
}

/**
 * Stamps an extracted tile onto a target layer canvas at grid-snapped coordinates.
 */
export function stampTileOntoCanvas(
  targetCanvas: HTMLCanvasElement,
  tileData: ImageData,
  destPixelX: number,
  destPixelY: number,
  blendMode: GlobalCompositeOperation = 'source-over'
): void {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const prevComp = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = blendMode;

  if (typeof document !== 'undefined') {
    const scratch = document.createElement('canvas');
    scratch.width = tileData.width;
    scratch.height = tileData.height;
    const sCtx = scratch.getContext('2d');
    if (sCtx) {
      sCtx.putImageData(tileData, 0, 0);
      ctx.drawImage(scratch, destPixelX, destPixelY);
    }
  }

  ctx.globalCompositeOperation = prevComp;
}
