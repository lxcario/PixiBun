/**
 * autotileEngine.ts
 *
 * 47-Blob Autotile Interactive Engine for PixiBun Atelier.
 * 100% scratch, zero third-party dependencies.
 *
 * Implements canonical 8-neighbor Moore bitmasking with cardinal-corner dominance,
 * constant-time O(1) 256-element lookup into the 47 Wang/Blob equivalence classes,
 * Chebyshev-bounded 3x3 dirty neighborhood reactive updates, and procedural 47-tile rendering.
 */

/**
 * The 47 canonical bitmasks derived from 8-neighbor Moore adjacency
 * under cardinal corner masking rules:
 * - NE is masked out unless N && E
 * - SE is masked out unless S && E
 * - SW is masked out unless S && W
 * - NW is masked out unless N && W
 */
export const CANONICAL_47_MASKS: readonly number[] = [
  0, 1, 4, 5, 7, 16, 17, 20, 21, 23,
  28, 29, 31, 64, 65, 68, 69, 71, 80, 81,
  84, 85, 87, 92, 93, 95, 112, 113, 116, 117,
  119, 124, 125, 127, 193, 197, 199, 209, 213, 215,
  221, 223, 241, 245, 247, 253, 255,
];

/**
 * Complete 256-element O(1) precomputed lookup table mapping any raw 8-bit neighbor
 * bitmask (0..255) directly to its canonical 47-tile index (0..46).
 */
export const BITMASK_TO_47_INDEX: Uint8Array = new Uint8Array([
  0,  1,  0,  1,  2,  3,  2,  4,  0,  1,  0,  1,  2,  3,  2,  4,
  5,  6,  5,  6,  7,  8,  7,  9,  5,  6,  5,  6, 10, 11, 10, 12,
  0,  1,  0,  1,  2,  3,  2,  4,  0,  1,  0,  1,  2,  3,  2,  4,
  5,  6,  5,  6,  7,  8,  7,  9,  5,  6,  5,  6, 10, 11, 10, 12,
 13, 14, 13, 14, 15, 16, 15, 17, 13, 14, 13, 14, 15, 16, 15, 17,
 18, 19, 18, 19, 20, 21, 20, 22, 18, 19, 18, 19, 23, 24, 23, 25,
 13, 14, 13, 14, 15, 16, 15, 17, 13, 14, 13, 14, 15, 16, 15, 17,
 26, 27, 26, 27, 28, 29, 28, 30, 26, 27, 26, 27, 31, 32, 31, 33,
  0,  1,  0,  1,  2,  3,  2,  4,  0,  1,  0,  1,  2,  3,  2,  4,
  5,  6,  5,  6,  7,  8,  7,  9,  5,  6,  5,  6, 10, 11, 10, 12,
  0,  1,  0,  1,  2,  3,  2,  4,  0,  1,  0,  1,  2,  3,  2,  4,
  5,  6,  5,  6,  7,  8,  7,  9,  5,  6,  5,  6, 10, 11, 10, 12,
 13, 34, 13, 34, 15, 35, 15, 36, 13, 34, 13, 34, 15, 35, 15, 36,
 18, 37, 18, 37, 20, 38, 20, 39, 18, 37, 18, 37, 23, 40, 23, 41,
 13, 34, 13, 34, 15, 35, 15, 36, 13, 34, 13, 34, 15, 35, 15, 36,
 26, 42, 26, 42, 28, 43, 28, 44, 26, 42, 26, 42, 31, 45, 31, 46
]);

/**
 * Calculates raw 8-neighbor bitmask:
 * N=1, NE=2, E=4, SE=8, S=16, SW=32, W=64, NW=128.
 */
export function calculateRawNeighborBitmask(
  isMatchingNeighbor: (nx: number, ny: number) => boolean,
  x: number,
  y: number
): number {
  const N  = isMatchingNeighbor(x, y - 1) ? 1 : 0;
  const NE = isMatchingNeighbor(x + 1, y - 1) ? 2 : 0;
  const E  = isMatchingNeighbor(x + 1, y) ? 4 : 0;
  const SE = isMatchingNeighbor(x + 1, y + 1) ? 8 : 0;
  const S  = isMatchingNeighbor(x, y + 1) ? 16 : 0;
  const SW = isMatchingNeighbor(x - 1, y + 1) ? 32 : 0;
  const W  = isMatchingNeighbor(x - 1, y) ? 64 : 0;
  const NW = isMatchingNeighbor(x - 1, y - 1) ? 128 : 0;

  return N | NE | E | SE | S | SW | W | NW;
}

/**
 * Calculates canonical 47-tile bitmask (with cardinal-corner dominance).
 */
export function calculate47TileBitmask(
  isMatchingNeighbor: (nx: number, ny: number) => boolean,
  x: number,
  y: number
): number {
  const N = isMatchingNeighbor(x, y - 1) ? 1 : 0;
  const E = isMatchingNeighbor(x + 1, y) ? 1 : 0;
  const S = isMatchingNeighbor(x, y + 1) ? 1 : 0;
  const W = isMatchingNeighbor(x - 1, y) ? 1 : 0;

  const NE = N && E && isMatchingNeighbor(x + 1, y - 1) ? 1 : 0;
  const SE = S && E && isMatchingNeighbor(x + 1, y + 1) ? 1 : 0;
  const SW = S && W && isMatchingNeighbor(x - 1, y + 1) ? 1 : 0;
  const NW = N && W && isMatchingNeighbor(x - 1, y - 1) ? 1 : 0;

  return (
    N * 1 +
    NE * 2 +
    E * 4 +
    SE * 8 +
    S * 16 +
    SW * 32 +
    W * 64 +
    NW * 128
  );
}

/**
 * Returns canonical tile index (0..46) in O(1) from 8-neighbor queries.
 */
export function calculate47TileIndex(
  isMatchingNeighbor: (nx: number, ny: number) => boolean,
  x: number,
  y: number
): number {
  const rawMask = calculateRawNeighborBitmask(isMatchingNeighbor, x, y);
  return BITMASK_TO_47_INDEX[rawMask];
}

export interface AutotileUpdate {
  x: number;
  y: number;
  tileId: number | null; // null if tile is empty/deleted, 0..46 otherwise
}

/**
 * Updates an autotile at (cx, cy) and reactively re-evaluates only its
 * surrounding 3x3 Chebyshev neighborhood.
 */
export function updateAutotileAt(
  tileGrid: Map<string, number>, // "x,y" => autotileId
  gridWidth: number,
  gridHeight: number,
  cx: number,
  cy: number,
  isPlacing: boolean
): AutotileUpdate[] {
  const isMatching = (nx: number, ny: number): boolean => {
    if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) return false;
    return tileGrid.has(`${nx},${ny}`);
  };

  const key = `${cx},${cy}`;
  if (isPlacing) {
    tileGrid.set(key, 0); // temporary
  } else {
    tileGrid.delete(key);
  }

  const updates: AutotileUpdate[] = [];

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = cx + dx;
      const ty = cy + dy;
      if (tx < 0 || tx >= gridWidth || ty < 0 || ty >= gridHeight) continue;

      const tKey = `${tx},${ty}`;
      if (!tileGrid.has(tKey)) {
        if (tx === cx && ty === cy && !isPlacing) {
          updates.push({ x: tx, y: ty, tileId: null });
        }
        continue;
      }

      const tileIndex = calculate47TileIndex(isMatching, tx, ty);
      tileGrid.set(tKey, tileIndex);
      updates.push({ x: tx, y: ty, tileId: tileIndex });
    }
  }

  return updates;
}

/**
 * AutotileGrid manages a reactive 2D autotile layer.
 */
export class AutotileGrid {
  private tiles = new Map<string, number>();
  public readonly width: number;
  public readonly height: number;
  public readonly tileSize: number;

  constructor(width: number, height: number, tileSize: number = 8) {
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
  }

  public getTile(gx: number, gy: number): number | undefined {
    return this.tiles.get(`${gx},${gy}`);
  }

  public hasTile(gx: number, gy: number): boolean {
    return this.tiles.has(`${gx},${gy}`);
  }

  public place(gx: number, gy: number): AutotileUpdate[] {
    return updateAutotileAt(this.tiles, this.width, this.height, gx, gy, true);
  }

  public erase(gx: number, gy: number): AutotileUpdate[] {
    return updateAutotileAt(this.tiles, this.width, this.height, gx, gy, false);
  }

  public clear(): void {
    this.tiles.clear();
  }

  public getAllTiles(): { x: number; y: number; tileId: number }[] {
    const list: { x: number; y: number; tileId: number }[] = [];
    for (const [k, tileId] of this.tiles.entries()) {
      const [x, y] = k.split(',').map(Number);
      list.push({ x, y, tileId });
    }
    return list;
  }
}
