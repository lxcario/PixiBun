import { describe, expect, it } from 'vitest';
import { analyzeSpriteSheetGrid } from '@/lib/canvas/spriteSheetAnalysis';
import { suggestSpriteSheetGrid } from '@/lib/canvas/spriteSheetSuggestion';

function sheet(width: number, height: number, background?: [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  const fill = (x: number, y: number, w: number, h: number, color: [number, number, number, number]) => {
    for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) {
      data.set(color, (row * width + col) * 4);
    }
  };
  if (background) fill(0, 0, width, height, background);
  return { data, width, height, fill };
}

describe('sprite sheet pixel analysis', () => {
  it('measures nonstandard frame cells, leading margins, and transparent gutters', () => {
    const image = sheet(45, 39);
    for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
      image.fill(3 + col * 22, 2 + row * 19, 19, 16, [220, 40, 80, 255]);
    }
    expect(analyzeSpriteSheetGrid(image, 32, 32)).toEqual({
      width: 19, height: 16, frames: 4, startX: 3, startY: 2, spacingX: 3, spacingY: 3,
    });
  });

  it('finds repeating artwork against an opaque, uniform-color background', () => {
    const image = sheet(39, 20, [255, 255, 255, 255]);
    image.fill(3, 2, 16, 16, [70, 30, 100, 255]);
    image.fill(21, 2, 16, 16, [20, 130, 230, 255]);
    expect(analyzeSpriteSheetGrid(image, 32, 32)).toEqual({
      width: 16, height: 16, frames: 2, startX: 3, startY: 2, spacingX: 2, spacingY: 0,
    });
  });

  it('keeps a regular cell grid when sprite silhouettes have different widths', () => {
    const image = sheet(100, 32);
    image.fill(6, 5, 20, 22, [200, 40, 50, 255]);
    image.fill(37, 5, 23, 22, [40, 200, 50, 255]);
    image.fill(73, 5, 18, 22, [40, 50, 200, 255]);
    expect(analyzeSpriteSheetGrid(image, 32, 32)).toEqual({
      width: 32, height: 32, frames: 3, startX: 0, startY: 0, spacingX: 2, spacingY: 0,
    });
  });

  it('finds four by two large sprites on a noisy opaque background despite labels crossing every axis', () => {
    const image = sheet(512, 384, [20, 210, 40, 255]);
    for (let y = 0; y < 384; y++) for (let x = 0; x < 512; x++) {
      if ((x + y) % 7 === 0) image.fill(x, y, 1, 1, [24, 206, 44, 255]);
    }
    for (let row = 0; row < 2; row++) for (let column = 0; column < 4; column++) {
      image.fill(column * 128 + 25, row * 192 + 35, 78, 130, [245, 245, 245, 255]);
      image.fill(column * 128 + 50, row * 192 + 55, 20, 15, [30, 20, 30, 255]);
    }
    // Sparse registration marks make every row and column technically nonempty.
    for (let x = 0; x < 512; x++) image.fill(x, 0, 1, 1, [0, 0, 0, 255]);
    for (let y = 0; y < 384; y++) image.fill(0, y, 1, 1, [0, 0, 0, 255]);
    expect(suggestSpriteSheetGrid(512, 384, 64, 64, 'cats.png')).toEqual({ width: 64, height: 64, frames: 48 });
    expect(analyzeSpriteSheetGrid(image, 64, 64)).toEqual({
      width: 128, height: 192, frames: 8, startX: 0, startY: 0, spacingX: 0, spacingY: 0,
    });
  });

  it('defers to the workspace grid rather than deleting a blank timing cell', () => {
    const image = sheet(192, 64);
    image.fill(0, 0, 64, 64, [255, 0, 0, 255]);
    image.fill(128, 0, 64, 64, [0, 0, 255, 255]);
    expect(analyzeSpriteSheetGrid(image, 64, 64)).toBeNull();
    expect(suggestSpriteSheetGrid(192, 64, 64, 64, 'walk.png')).toEqual({ width: 64, height: 64, frames: 3 });
  });

  it('finds a blank timing slot from repeated artwork when the workspace size differs', () => {
    const image = sheet(70, 16);
    image.fill(0, 0, 16, 16, [255, 0, 0, 255]);
    image.fill(18, 0, 16, 16, [0, 255, 0, 255]);
    image.fill(54, 0, 16, 16, [0, 0, 255, 255]);
    expect(analyzeSpriteSheetGrid(image, 32, 32)).toEqual({
      width: 16, height: 16, frames: 4, startX: 0, startY: 0, spacingX: 2, spacingY: 0,
    });
  });

  it('does not infer an animation from a single picture or irregular separators', () => {
    const single = sheet(32, 32);
    single.fill(8, 8, 16, 16, [200, 10, 10, 255]);
    expect(analyzeSpriteSheetGrid(single, 32, 32)).toBeNull();

    const twoEyes = sheet(32, 32);
    twoEyes.fill(8, 8, 8, 16, [200, 10, 10, 255]);
    twoEyes.fill(24, 8, 8, 16, [200, 10, 10, 255]);
    expect(analyzeSpriteSheetGrid(twoEyes, 32, 32)).toBeNull();

    const irregular = sheet(70, 32);
    irregular.fill(2, 2, 12, 20, [200, 10, 10, 255]);
    irregular.fill(23, 2, 12, 20, [200, 10, 10, 255]);
    irregular.fill(55, 2, 12, 20, [200, 10, 10, 255]);
    expect(analyzeSpriteSheetGrid(irregular, 32, 32)).toBeNull();
  });
});
