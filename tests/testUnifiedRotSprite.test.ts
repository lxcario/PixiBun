import { describe, it, expect } from 'vitest';
import { type PixelBuffer } from '@/lib/canvas/rotSprite';
import catFixture from './fixtures/pixiMotionCatOutline.json';

describe('Unified RotSprite Implementation Test', () => {
  it('tests user cat sprite at 39.2 deg and 45 deg', async () => {
    const catData = new Uint8ClampedArray(catFixture.width * catFixture.height * 4);
    for (const [x, y] of catFixture.points) catData.set(catFixture.color, (y * catFixture.width + x) * 4);
    const catBuf: PixelBuffer = { width: catFixture.width, height: catFixture.height, data: catData };
    const { rotSprite, computeRotatedBounds } = await import('@/lib/canvas/rotSprite');

    for (const deg of [15, 30, 39.2, 45, 60]) {
      const rad = (deg * Math.PI) / 180;
      const b = computeRotatedBounds(32, 32, 0, 0, 16, 16, rad);
      const res = rotSprite(catBuf, rad, b.localPivotX, b.localPivotY, b.targetW, b.targetH, b.outPivotX, b.outPivotY, true);

      let solidCount = 0;
      for (let i = 3; i < res.data.length; i += 4) {
        if (res.data[i] > 0) solidCount++;
      }
      // Verify pixel count:
      // A clean 44px outline should be 40-65px when rotated, NEVER 80+ bloated or <35 severed!
      expect(solidCount).toBeGreaterThanOrEqual(40);
      expect(solidCount).toBeLessThanOrEqual(65);
    }
  });

  it('guarantees preview (CenterViewport) and commit (worker) outputs are pixel-identical', async () => {
    const { rotSprite, computeRotatedBounds } = await import('@/lib/canvas/rotSprite');
    const { runRotSpriteInWorker } = await import('@/lib/engine/workerDispatcher');

    // Create a 32x32 test sprite with a shape and single-pixel details
    const w = 32, h = 32;
    const testData = new Uint8ClampedArray(w * h * 4);
    // Draw an octagon contour and 2 isolated eyes
    for (let x = 10; x <= 22; x++) {
      testData[(8 * w + x) * 4] = 46; testData[(8 * w + x) * 4 + 3] = 255;
      testData[(24 * w + x) * 4] = 46; testData[(24 * w + x) * 4 + 3] = 255;
    }
    for (let y = 10; y <= 22; y++) {
      testData[(y * w + 8) * 4] = 46; testData[(y * w + 8) * 4 + 3] = 255;
      testData[(y * w + 24) * 4] = 46; testData[(y * w + 24) * 4 + 3] = 255;
    }
    // Eyes:
    testData[(14 * w + 12) * 4] = 46; testData[(14 * w + 12) * 4 + 3] = 255;
    testData[(14 * w + 20) * 4] = 46; testData[(14 * w + 20) * 4 + 3] = 255;

    const buf: PixelBuffer = { width: w, height: h, data: testData };

    for (const deg of [20, 39.2, 45]) {
      const rad = (deg * Math.PI) / 180;
      const b = computeRotatedBounds(w, h, 0, 0, 16, 16, rad);

      // Preview call (CenterViewport.tsx)
      const preview = rotSprite(buf, rad, b.localPivotX, b.localPivotY, b.targetW, b.targetH, b.outPivotX, b.outPivotY, true);

      // Commit call (useViewportSelectionTransform.ts)
      const commit = await runRotSpriteInWorker(
        buf,
        rad,
        b.localPivotX,
        b.localPivotY,
        b.targetW,
        b.targetH,
        { outPivotX: b.outPivotX, outPivotY: b.outPivotY, pixelPerfect: true }
      );

      expect(commit.width).toBe(preview.width);
      expect(commit.height).toBe(preview.height);
      expect(Array.from(commit.data)).toEqual(Array.from(preview.data));
    }
  });

  it('guarantees preview and commit parity for Paeth 3-shear algorithm', async () => {
    const { paethRotate } = await import('@/lib/canvas/paethRotation');
    const { computeRotatedBounds } = await import('@/lib/canvas/rotSprite');
    const { runRotSpriteInWorker } = await import('@/lib/engine/workerDispatcher');

    const w = 16, h = 16;
    const testData = new Uint8ClampedArray(w * h * 4);
    // Draw an alternating 8x8 checkerboard in center
    for (let y = 4; y < 12; y++) {
      for (let x = 4; x < 12; x++) {
        if ((x + y) % 2 === 0) {
          testData[(y * w + x) * 4] = 255;
          testData[(y * w + x) * 4 + 3] = 255;
        }
      }
    }
    const buf: PixelBuffer = { width: w, height: h, data: testData };

    for (const deg of [15, 22.5, 30]) {
      const rad = (deg * Math.PI) / 180;
      const b = computeRotatedBounds(w, h, 0, 0, 8, 8, rad);

      const preview = paethRotate(buf, rad, b.localPivotX, b.localPivotY, b.targetW, b.targetH, b.outPivotX, b.outPivotY);
      const commit = await runRotSpriteInWorker(
        buf,
        rad,
        b.localPivotX,
        b.localPivotY,
        b.targetW,
        b.targetH,
        { outPivotX: b.outPivotX, outPivotY: b.outPivotY, algorithm: 'paeth' }
      );

      expect(commit.width).toBe(preview.width);
      expect(commit.height).toBe(preview.height);
      expect(Array.from(commit.data)).toEqual(Array.from(preview.data));
    }
  });

  it('guarantees preview and commit parity for Normal Map layer rotation', async () => {
    const { rotSprite, computeRotatedBounds } = await import('@/lib/canvas/rotSprite');
    const { rotateNormalVectors } = await import('@/lib/canvas/normalMapRotation');
    const { runRotSpriteInWorker } = await import('@/lib/engine/workerDispatcher');

    const w = 8, h = 8;
    const testData = new Uint8ClampedArray(w * h * 4);
    // Fill an upward-facing normal patch at center
    for (let y = 2; y <= 5; y++) {
      for (let x = 2; x <= 5; x++) {
        const i = (y * w + x) * 4;
        testData[i] = 128; testData[i + 1] = 255; testData[i + 2] = 255; testData[i + 3] = 255;
      }
    }
    const buf: PixelBuffer = { width: w, height: h, data: testData };

    const rad = Math.PI / 2; // 90 deg clockwise
    const b = computeRotatedBounds(w, h, 0, 0, 4, 4, rad);

    const previewSpatial = rotSprite(buf, rad, b.localPivotX, b.localPivotY, b.targetW, b.targetH, b.outPivotX, b.outPivotY, true);
    const preview = rotateNormalVectors(previewSpatial, rad);

    const commit = await runRotSpriteInWorker(
      buf,
      rad,
      b.localPivotX,
      b.localPivotY,
      b.targetW,
      b.targetH,
      { outPivotX: b.outPivotX, outPivotY: b.outPivotY, pixelPerfect: true, isNormalMap: true }
    );

    expect(commit.width).toBe(preview.width);
    expect(commit.height).toBe(preview.height);
    expect(Array.from(commit.data)).toEqual(Array.from(preview.data));
  });
});
