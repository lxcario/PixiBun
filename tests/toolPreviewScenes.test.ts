import { describe, expect, it } from 'vitest';
import { DRAWING_PREVIEWS, PIXITOOLS, type Scene } from '@/components/ui/ToolMotionPreview';
import { CLIP_SCENES, clipFor } from '@/components/ui/toolPreview/clips';
import { ART_H, ART_W } from '@/components/ui/toolPreview/raster';

function differs(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  let count = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) count++;
  }
  return count;
}

describe('tool preview clips', () => {
  const scenes = new Set<Scene>([
    ...Object.values(DRAWING_PREVIEWS).map((preview) => preview.scene),
    ...PIXITOOLS.map(([, preview]) => preview.scene),
  ]);

  it('covers every canonical drawing tool', () => {
    expect(Object.keys(DRAWING_PREVIEWS)).toEqual(expect.arrayContaining([
      'pen', 'curve', 'eraser', 'bucket', 'dither', 'color-replace', 'erase-color',
      'select-box', 'select-lasso', 'select-wand', 'line', 'isometric-line',
      'rectangle', 'ellipse', 'normal-chisel', 'eyedropper',
    ]));
  });

  it('has a clip for every scene a preview can name', () => {
    for (const scene of scenes) expect(CLIP_SCENES).toContain(scene);
  });

  // The 2.5D lighting engine composites through a real canvas, which Node lacks;
  // the e2e preview spec covers these four in the browser.
  const needsCanvas = new Set<Scene>(['light', 'bake-light', 'glow', 'depth']);
  const testable = [...scenes].filter((scene) => typeof document !== 'undefined' || !needsCanvas.has(scene));

  it.each(testable)('%s plays a real change on the canvas or its overlay', (scene) => {
    const clip = clipFor(scene);
    const first = clip.frame(0);
    const last = clip.frame(clip.steps);
    expect(first.width).toBe(ART_W);
    expect(first.height).toBe(ART_H);
    expect(clip.labels).toHaveLength(3);
    expect(new Set(clip.labels).size).toBe(3);
    // Selection, picking, slicing and palette tools mark the art without editing it.
    if (differs(first.data, last.data) === 0) expect(clip.overlay).toBeTypeOf('function');
    else expect(differs(first.data, clip.frame(Math.round(clip.steps / 2)).data)).toBeGreaterThan(0);
    if (clip.kind !== 'run') expect(clip.pointer).toBeTypeOf('function');
  });

  it('draws the pen stroke without doubled L-corners', () => {
    const clip = clipFor('stroke');
    const art = clip.frame(clip.steps);
    const pink = (x: number, y: number) => {
      const i = (y * ART_W + x) * 4;
      return art.data[i] === 0xff && art.data[i + 1] === 0x6b && art.data[i + 2] === 0x8b;
    };
    for (let y = 0; y < ART_H - 1; y++) {
      for (let x = 19; x < ART_W - 1; x++) {
        const block = [pink(x, y), pink(x + 1, y), pink(x, y + 1), pink(x + 1, y + 1)].filter(Boolean).length;
        expect(block).toBeLessThan(3);
      }
    }
  });

  it('really turns the carrot: RotSprite output changes at every step', () => {
    const clip = clipFor('rotate');
    for (let k = 1; k <= clip.steps; k++) {
      expect(differs(clip.frame(k - 1).data, clip.frame(k).data)).toBeGreaterThan(4);
    }
  });

  it('generates one in-between frame halfway up the hop, then plays 1 · ½ · 2', () => {
    const clip = clipFor('animate');
    expect(clip.loop).toBeTypeOf('function');
    const top = (art: { data: Uint8ClampedArray }) => {
      for (let y = 0; y < ART_H; y++) for (let x = 0; x < ART_W; x++) if (art.data[(y * ART_W + x) * 4 + 3] > 200) return y;
      return -1;
    };
    const [first, middle, last] = [clip.loop!(0), clip.loop!(200), clip.loop!(400)];
    expect(top(first)).toBe(top(last) + 2);
    expect(top(middle)).toBe(top(last) + 1);
  });

  it('erases only the sampled sketch color, leaving Bun intact', () => {
    const clip = clipFor('erase-color');
    const before = clip.frame(0);
    const after = clip.frame(clip.steps);
    for (let i = 0; i < before.data.length; i += 4) {
      const sketch = before.data[i] === 0x5f && before.data[i + 1] === 0xa8 && before.data[i + 2] === 0xff;
      if (sketch) expect(after.data[i + 3]).toBe(0);
      else expect([...after.data.subarray(i, i + 4)]).toEqual([...before.data.subarray(i, i + 4)]);
    }
  });
});
