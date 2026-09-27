import { describe, expect, it } from 'vitest';
import { planLayerRotation } from '@/lib/canvas/rotSpriteLayer';
import { rotSprite, type PixelBuffer } from '@/lib/canvas/rotSprite';
import { OUTLINED_CIRCLE_ROWS } from './fixtures/outlinedCircle';

function circle(): PixelBuffer {
  const width = 32, height = 32;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < OUTLINED_CIRCLE_ROWS.length; y++) for (let x = 0; x < width; x++) {
    const glyph = OUTLINED_CIRCLE_ROWS[y][x];
    if (glyph === '.') continue;
    data.set(glyph === '#' ? [46, 32, 61, 255] : [178, 120, 202, 255], ((y + 8) * width + x) * 4);
  }
  return { width, height, data };
}

function rotate(layer: PixelBuffer, angle: number): PixelBuffer {
  const result = planLayerRotation(layer, angle);
  if (!result.plan) throw new Error(result.error ?? 'No rotation plan');
  const p = result.plan;
  const output = rotSprite(p.source, angle, p.sourcePivotX, p.sourcePivotY,
    p.targetWidth, p.targetHeight, p.outputPivotX, p.outputPivotY);
  const data = new Uint8ClampedArray(layer.data.length);
  for (let y = 0; y < output.height; y++) {
    const row = output.data.subarray(y * output.width * 4, (y + 1) * output.width * 4);
    data.set(row, ((y + p.destY) * layer.width + p.destX) * 4);
  }
  return { ...layer, data };
}

function assertCleanOutline(layer: PixelBuffer): void {
  const { width, height, data } = layer;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && data[(y * width + x) * 4 + 3] !== 0;
  let outline = 0;
  let fill = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (data[i + 3] === 0) continue;
    const interior = solid(x - 1, y) && solid(x + 1, y) && solid(x, y - 1) && solid(x, y + 1);
    expect(Array.from(data.slice(i, i + 4))).toEqual(interior
      ? [178, 120, 202, 255]
      : [46, 32, 61, 255]);
    if (interior) fill++;
    else outline++;
  }
  expect(outline).toBeGreaterThan(35);
  expect(fill).toBeGreaterThan(100);
}

describe('circle rotation regression', () => {
  it('keeps the screenshot-sized circle outline closed through 45 degrees and back', () => {
    const source = circle();
    const rotated = rotate(source, Math.PI / 4);
    const back = rotate(rotated, -Math.PI / 4);
    assertCleanOutline(rotated);
    assertCleanOutline(back);
  });
});
