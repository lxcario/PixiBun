import { describe, it, expect } from 'vitest';
import {
  CANONICAL_47_MASKS,
  BITMASK_TO_47_INDEX,
  calculate47TileBitmask,
  calculate47TileIndex,
  calculateRawNeighborBitmask,
  updateAutotileAt,
  AutotileGrid,
} from '@/lib/ai/math/autotileEngine';

describe('47-Blob Autotile Mathematical Specification', () => {
  it('has exactly 47 canonical masks without duplicates', () => {
    expect(CANONICAL_47_MASKS.length).toBe(47);
    const unique = new Set(CANONICAL_47_MASKS);
    expect(unique.size).toBe(47);
  });

  it('contains 256 entries in BITMASK_TO_47_INDEX, all within [0..46]', () => {
    expect(BITMASK_TO_47_INDEX.length).toBe(256);
    for (let i = 0; i < 256; i++) {
      const idx = BITMASK_TO_47_INDEX[i];
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(46);
    }
  });

  it('correctly reduces any 8-bit raw mask to canonical mask according to corner masking', () => {
    for (let raw = 0; raw < 256; raw++) {
      const hasN = (raw & 1) !== 0;
      const hasNE = (raw & 2) !== 0;
      const hasE = (raw & 4) !== 0;
      const hasSE = (raw & 8) !== 0;
      const hasS = (raw & 16) !== 0;
      const hasSW = (raw & 32) !== 0;
      const hasW = (raw & 64) !== 0;
      const hasNW = (raw & 128) !== 0;

      // Mask diagonal corners unless both adjacent cardinals are present
      const validNE = hasN && hasE && hasNE ? 2 : 0;
      const validSE = hasS && hasE && hasSE ? 8 : 0;
      const validSW = hasS && hasW && hasSW ? 32 : 0;
      const validNW = hasN && hasW && hasNW ? 128 : 0;

      const canonicalValue =
        (hasN ? 1 : 0) |
        validNE |
        (hasE ? 4 : 0) |
        validSE |
        (hasS ? 16 : 0) |
        validSW |
        (hasW ? 64 : 0) |
        validNW;

      const tileIdx = BITMASK_TO_47_INDEX[raw];
      const actualCanonical = CANONICAL_47_MASKS[tileIdx];

      expect(actualCanonical).toBe(canonicalValue);
    }
  });

  it('maps raw neighbors to 47 canonical tiles correctly', () => {
    // Isolated tile -> index 0 (mask 0)
    const isIsolated = () => false;
    expect(calculate47TileIndex(isIsolated, 5, 5)).toBe(0);

    // Fully surrounded 3x3 block -> center tile has index 46 (mask 255)
    const isSolid = () => true;
    expect(calculate47TileIndex(isSolid, 5, 5)).toBe(46);
    expect(calculate47TileBitmask(isSolid, 5, 5)).toBe(255);
    expect(calculateRawNeighborBitmask(isSolid, 5, 5)).toBe(255);
    expect(CANONICAL_47_MASKS[46]).toBe(255);
  });
});

describe('Reactive 3x3 Dirty Neighborhood Updates', () => {
  it('places an isolated tile and returns tileId 0', () => {
    const grid = new Map<string, number>();
    const updates = updateAutotileAt(grid, 10, 10, 5, 5, true);

    expect(updates.length).toBe(1);
    expect(updates[0]).toEqual({ x: 5, y: 5, tileId: 0 });
    expect(grid.get('5,5')).toBe(0);
  });

  it('placing a neighbor updates both tiles reactively', () => {
    const grid = new Map<string, number>();
    updateAutotileAt(grid, 10, 10, 5, 5, true); // initial isolated

    // Place east neighbor at (6, 5)
    const updates = updateAutotileAt(grid, 10, 10, 6, 5, true);

    // Both (5,5) and (6,5) should be updated
    const tile55 = grid.get('5,5');
    const tile65 = grid.get('6,5');

    // (5,5) has East neighbor -> mask 4 -> canonical index 2
    expect(tile55).toBe(2);
    // (6,5) has West neighbor -> mask 64 -> canonical index 13
    expect(tile65).toBe(13);

    expect(updates.some((u) => u.x === 5 && u.y === 5 && u.tileId === 2)).toBe(true);
    expect(updates.some((u) => u.x === 6 && u.y === 5 && u.tileId === 13)).toBe(true);
  });

  it('erasing a tile notifies deletion and recomputes neighbors', () => {
    const grid = new Map<string, number>();
    updateAutotileAt(grid, 10, 10, 5, 5, true);
    updateAutotileAt(grid, 10, 10, 6, 5, true);

    // Erase (6, 5)
    const eraseUpdates = updateAutotileAt(grid, 10, 10, 6, 5, false);

    expect(grid.has('6,5')).toBe(false);
    // (5, 5) reverts back to isolated tile 0
    expect(grid.get('5,5')).toBe(0);

    expect(eraseUpdates.some((u) => u.x === 6 && u.y === 5 && u.tileId === null)).toBe(true);
    expect(eraseUpdates.some((u) => u.x === 5 && u.y === 5 && u.tileId === 0)).toBe(true);
  });

  it('AutotileGrid class handles complete 3x3 block correctly', () => {
    const autoGrid = new AutotileGrid(8, 8, 16);

    // Fill a 3x3 square [1..3, 1..3]
    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) {
        autoGrid.place(x, y);
      }
    }

    // Center tile (2, 2) must be 46 (fully surrounded solid)
    expect(autoGrid.getTile(2, 2)).toBe(46);

    // Erase center tile (2, 2)
    autoGrid.erase(2, 2);
    expect(autoGrid.hasTile(2, 2)).toBe(false);

    // Surrounding cardinals now have an opening towards (2, 2)
    const all = autoGrid.getAllTiles();
    expect(all.length).toBe(8);
  });
});
