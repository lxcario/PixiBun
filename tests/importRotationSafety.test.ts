import { describe, expect, it } from 'vitest';
import { suggestSpriteSheetGrid } from '@/lib/canvas/spriteSheetSuggestion';
import { planLayerRotation, MAX_ROTSPRITE_SOURCE_PIXELS } from '@/lib/canvas/rotSpriteLayer';
import { rotSprite, type PixelBuffer } from '@/lib/canvas/rotSprite';
import { useStudioStore } from '@/stores/studioStore';

function layer(width: number, height: number, pixels: Array<[number, number, [number, number, number, number]]>): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y, rgba] of pixels) data.set(rgba, (y * width + x) * 4);
  return { width, height, data };
}

describe('image import suggestions and safe layer rotation', () => {
  it('offers a confirmable grid for a sheet matching the canvas without classifying a lone image', () => {
    expect(suggestSpriteSheetGrid(256, 64, 64, 64, 'walk.png')).toEqual({ width: 64, height: 64, frames: 4 });
    expect(suggestSpriteSheetGrid(64, 64, 64, 64, 'sprite.png')).toBeNull();
    expect(suggestSpriteSheetGrid(101, 77, 64, 64, 'photo.png')).toBeNull();
    expect(suggestSpriteSheetGrid(128, 32, 64, 64, 'walk_sheet.png')).toEqual({ width: 32, height: 32, frames: 4 });
  });

  it('rejects a rotated layer that would clip without altering its pixel buffer', () => {
    const source = layer(16, 16, [[0, 0, [255, 0, 0, 255]], [15, 15, [0, 0, 255, 255]]]);
    const before = source.data.slice();
    const result = planLayerRotation(source, Math.PI / 4);
    expect(result.error).toMatch(/clip/);
    expect(source.data).toEqual(before);
  });

  it('crops a centered sprite and preserves RGBA for an exact quarter turn', () => {
    const source = layer(16, 16, [
      [7, 7, [210, 80, 20, 96]],
      [8, 7, [20, 140, 230, 255]],
    ]);
    const { plan, error } = planLayerRotation(source, Math.PI / 2);
    expect(error).toBeUndefined();
    expect(plan).toBeDefined();
    expect(plan!.source.width).toBe(2);
    expect(plan!.source.height).toBe(1);
    const rotated = rotSprite(plan!.source, Math.PI / 2,
      plan!.sourcePivotX, plan!.sourcePivotY,
      plan!.targetWidth, plan!.targetHeight,
      plan!.outputPivotX, plan!.outputPivotY);
    const colored = [] as string[];
    for (let i = 0; i < rotated.data.length; i += 4) {
      if (rotated.data[i + 3]) colored.push(Array.from(rotated.data.slice(i, i + 4)).join(','));
    }
    expect(colored.sort()).toEqual(['20,140,230,255', '210,80,20,96'].sort());
  });

  it('refuses unsafe 8x source expansion before allocating a crop', () => {
    const width = 513;
    const height = Math.ceil((MAX_ROTSPRITE_SOURCE_PIXELS + 1) / width);
    const source = layer(width, height, [[0, 0, [255, 255, 255, 255]], [width - 1, height - 1, [255, 255, 255, 255]]]);
    expect(planLayerRotation(source, Math.PI / 4).error).toMatch(/too large/);
  });

  it('adds a frame carrying an effect recipe without cloning an Immer proxy', () => {
    useStudioStore.getState().resetToNewProject();
    const store = useStudioStore.getState();
    const sourceId = store.frames[0].layers[0].id;
    store.setLayerEffect(sourceId, {
      id: 'source-effect', kind: 'outline', version: 1,
      sourceMode: 'active-layer', params: { thickness: 1 }, updatedAt: 1,
    });
    expect(() => store.addFrame()).not.toThrow();
    const frames = useStudioStore.getState().frames;
    expect(frames).toHaveLength(2);
    expect(frames[1].layers[0].effect?.kind).toBe('outline');
    expect(frames[1].layers[0].effect?.id).not.toBe('source-effect');
    useStudioStore.getState().resetToNewProject();
  });
});
