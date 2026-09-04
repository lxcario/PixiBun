/**
 * Phase 37.1: Tileset / Tile-Stamping Engine Unit Tests
 *
 * Industry Standard Reference:
 * - 2D Grid Tilemap Architecture (Tiled map editor & Aseprite tilemap layer spec).
 *
 * Verifies grid snapping, pixel extraction, stamping, tile transformations (flip/rotate),
 * tile equality, and tileset palette decomposition.
 */

import { describe, it, expect } from 'vitest';
import {
  snapToTileGrid,
  extractTileFromBuffer,
  stampTileOntoBuffer,
  flipTileHorizontal,
  flipTileVertical,
  rotateTile90,
  tilesAreEqual,
  decomposeIntoTileset,
  RawPixelBuffer,
} from '@/lib/canvas/tileStamp';

describe('Phase 37.1: Tileset / Tile-Stamping Engine', () => {
  describe('snapToTileGrid', () => {
    it('snaps continuous pixel coordinates to tile grid boundaries', () => {
      const tileSize = 16;

      const p1 = snapToTileGrid(0, 0, tileSize);
      expect(p1).toEqual({ gridX: 0, gridY: 0, pixelX: 0, pixelY: 0 });

      const p2 = snapToTileGrid(15, 15, tileSize);
      expect(p2).toEqual({ gridX: 0, gridY: 0, pixelX: 0, pixelY: 0 });

      const p3 = snapToTileGrid(16, 32, tileSize);
      expect(p3).toEqual({ gridX: 1, gridY: 2, pixelX: 16, pixelY: 32 });

      const p4 = snapToTileGrid(35, 50, tileSize);
      expect(p4).toEqual({ gridX: 2, gridY: 3, pixelX: 32, pixelY: 48 });
    });

    it('safely handles non-positive or fractional tile sizes', () => {
      const p = snapToTileGrid(10, 20, 0);
      expect(p.gridX).toBe(10);
      expect(p.pixelX).toBe(10);
    });
  });

  describe('extractTileFromBuffer & stampTileOntoBuffer', () => {
    function createBuffer(w: number, h: number, fillColor?: [number, number, number, number]): RawPixelBuffer {
      const data = new Uint8ClampedArray(w * h * 4);
      if (fillColor) {
        for (let i = 0; i < w * h; i++) {
          data[i * 4] = fillColor[0];
          data[i * 4 + 1] = fillColor[1];
          data[i * 4 + 2] = fillColor[2];
          data[i * 4 + 3] = fillColor[3];
        }
      }
      return { width: w, height: h, data };
    }

    it('extracts tile within bounds accurately', () => {
      const buf = createBuffer(16, 16);
      // Place a red pixel at (4, 4)
      const idx = (4 * 16 + 4) * 4;
      buf.data[idx] = 255;
      buf.data[idx + 1] = 0;
      buf.data[idx + 2] = 0;
      buf.data[idx + 3] = 255;

      const tile = extractTileFromBuffer(buf, 0, 0, 8);
      expect(tile.length).toBe(8 * 8 * 4);

      // In the 8x8 tile, pixel (4, 4) should be red
      const tileIdx = (4 * 8 + 4) * 4;
      expect(tile[tileIdx]).toBe(255);
      expect(tile[tileIdx + 1]).toBe(0);
      expect(tile[tileIdx + 2]).toBe(0);
      expect(tile[tileIdx + 3]).toBe(255);
    });

    it('pads out-of-bounds regions with transparent pixels', () => {
      const buf = createBuffer(8, 8, [100, 150, 200, 255]);
      // Extract starting from (4, 4) with tileSize 8 (extends beyond 8x8 buffer)
      const tile = extractTileFromBuffer(buf, 4, 4, 8);

      // (0, 0) of tile maps to (4, 4) inside buffer -> opaque
      expect(tile[3]).toBe(255);

      // (7, 7) of tile maps to (11, 11) outside buffer -> transparent (0)
      const outIdx = (7 * 8 + 7) * 4;
      expect(tile[outIdx + 3]).toBe(0);
    });

    it('stamps tile buffer onto destination buffer', () => {
      const target = createBuffer(16, 16, [0, 0, 0, 0]);
      const tile = new Uint8ClampedArray(4 * 4 * 4);
      // Fill tile with solid blue [0, 0, 255, 255]
      for (let i = 0; i < 4 * 4; i++) {
        tile[i * 4 + 2] = 255;
        tile[i * 4 + 3] = 255;
      }

      stampTileOntoBuffer(target, tile, 4, 8, 8);

      // Check pixel at (8, 8)
      const targetIdx = (8 * 16 + 8) * 4;
      expect(target.data[targetIdx + 2]).toBe(255);
      expect(target.data[targetIdx + 3]).toBe(255);

      // Untouched pixel at (0, 0) should remain transparent
      expect(target.data[3]).toBe(0);
    });
  });

  describe('Tile Transformations (flip & rotate)', () => {
    it('flipTileHorizontal is an involution (f(f(x)) === x)', () => {
      const size = 4;
      const original = new Uint8ClampedArray(size * size * 4);
      for (let i = 0; i < original.length; i++) original[i] = i % 256;

      const flippedOnce = flipTileHorizontal(original, size);
      const flippedTwice = flipTileHorizontal(flippedOnce, size);

      expect(tilesAreEqual(original, flippedTwice)).toBe(true);
    });

    it('flipTileVertical is an involution', () => {
      const size = 4;
      const original = new Uint8ClampedArray(size * size * 4);
      for (let i = 0; i < original.length; i++) original[i] = (i * 7) % 256;

      const flippedOnce = flipTileVertical(original, size);
      const flippedTwice = flipTileVertical(flippedOnce, size);

      expect(tilesAreEqual(original, flippedTwice)).toBe(true);
    });

    it('rotateTile90 applied 4 times returns to identity', () => {
      const size = 4;
      const original = new Uint8ClampedArray(size * size * 4);
      for (let i = 0; i < original.length; i++) original[i] = (i * 13) % 256;

      let current: Uint8ClampedArray<ArrayBufferLike> = original;
      for (let r = 0; r < 4; r++) {
        current = rotateTile90(current, size);
      }

      expect(tilesAreEqual(original, current)).toBe(true);
    });
  });

  describe('decomposeIntoTileset', () => {
    it('extracts unique tileset palette and builds 2D tilemap matrix', () => {
      // Create a 16x16 buffer with 4 quadrants of 8x8:
      // Top-Left: Red
      // Top-Right: Green
      // Bottom-Left: Red (duplicate of Top-Left)
      // Bottom-Right: Blue
      const buf: RawPixelBuffer = {
        width: 16,
        height: 16,
        data: new Uint8ClampedArray(16 * 16 * 4),
      };

      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const idx = (y * 16 + x) * 4;
          if (x < 8 && y < 8) {
            // Red
            buf.data[idx] = 255;
            buf.data[idx + 3] = 255;
          } else if (x >= 8 && y < 8) {
            // Green
            buf.data[idx + 1] = 255;
            buf.data[idx + 3] = 255;
          } else if (x < 8 && y >= 8) {
            // Red (same as TL)
            buf.data[idx] = 255;
            buf.data[idx + 3] = 255;
          } else {
            // Blue
            buf.data[idx + 2] = 255;
            buf.data[idx + 3] = 255;
          }
        }
      }

      const { tileset, tilemap } = decomposeIntoTileset(buf, 8);

      // Should find exactly 3 unique tiles: Red, Green, Blue
      expect(tileset.length).toBe(3);

      // Tilemap should be 2x2
      expect(tilemap.length).toBe(2);
      expect(tilemap[0].length).toBe(2);
      expect(tilemap[1].length).toBe(2);

      // Quadrants:
      // TL (Red) === BL (Red)
      expect(tilemap[0][0]).toBe(tilemap[1][0]);
      // TR (Green) is different from TL (Red)
      expect(tilemap[0][1]).not.toBe(tilemap[0][0]);
      // BR (Blue) is different from both
      expect(tilemap[1][1]).not.toBe(tilemap[0][0]);
      expect(tilemap[1][1]).not.toBe(tilemap[0][1]);
    });
  });
});
