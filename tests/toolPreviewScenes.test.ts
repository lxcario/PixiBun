import { describe, expect, it } from 'vitest';
import { DRAWING_PREVIEWS, PIXITOOLS, type Scene } from '@/components/ui/ToolMotionPreview';
import { drawToolPreviewFrame } from '@/components/ui/ToolPreviewCanvas';

function renderCommands(scene: Scene, time: number) {
  const commands: string[] = [];
  const context = {
    fillStyle: '',
    font: '',
    fillRect(x: number, y: number, width: number, height: number) {
      commands.push([context.fillStyle, x, y, width, height].join(':'));
    },
    fillText() {},
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    clip() {},
  } as unknown as CanvasRenderingContext2D;
  const label = drawToolPreviewFrame(context, scene, time);
  return { commands, label };
}

describe('tool preview storyboards', () => {
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

  it.each([...scenes])('%s has a distinct visible result', (scene) => {
    const before = renderCommands(scene, 0.05);
    const result = renderCommands(scene, 0.85);
    expect(before.commands.length).toBeGreaterThan(100);
    expect(result.commands.length).toBeGreaterThan(100);
    expect(result.label).not.toBe('RESULT');
    expect(result.commands).not.toEqual(before.commands);
  });
});
