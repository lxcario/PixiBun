import { expect, test } from '@playwright/test';

type State = {
  setActiveTool: (tool: string) => void;
  setSelection: (box: { x: number; y: number; w: number; h: number }, mask: Uint8Array) => void;
  selectionMask: Uint8Array | null;
  selection: unknown;
};
type StudioWindow = Window & { __studioStore: { getState: () => State } };

for (const tool of ['select-box', 'select-lasso', 'select-wand']) {
  test(`${tool}: Alt subtracts inside an existing selection instead of panning or moving pixels`, async ({ page }) => {
    await page.goto('/studio');
    await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
    const close = page.getByRole('button', { name: 'Close Preview Window' });
    if (await close.isVisible()) await close.click();
    await page.evaluate(tool => {
      const state = (window as unknown as StudioWindow).__studioStore.getState();
      const mask = new Uint8Array(32 * 32);
      for (let y = 8; y < 24; y++) for (let x = 8; x < 24; x++) mask[y * 32 + x] = 1;
      state.setSelection({ x: 8, y: 8, w: 16, h: 16 }, mask);
      state.setActiveTool(tool);
    }, tool);
    const canvas = page.getByTestId('main-composite-canvas');
    const box = (await canvas.boundingBox())!;
    const at = (x: number, y: number) => ({ x: box.x + (x + 0.5) * box.width / 32, y: box.y + (y + 0.5) * box.height / 32 });
    const before = await canvas.evaluate((node: HTMLCanvasElement) => Array.from(node.getContext('2d')!.getImageData(0, 0, 32, 32).data));
    await page.keyboard.down('Alt');
    await page.mouse.move(at(12, 12).x, at(12, 12).y);
    await page.mouse.down();
    if (tool === 'select-box') await page.mouse.move(at(18, 18).x, at(18, 18).y, { steps: 5 });
    if (tool === 'select-lasso') {
      await page.mouse.move(at(18, 12).x, at(18, 12).y, { steps: 4 });
      await page.mouse.move(at(12, 18).x, at(12, 18).y, { steps: 4 });
      await page.mouse.move(at(12, 12).x, at(12, 12).y, { steps: 4 });
    }
    await page.mouse.up();
    await page.keyboard.up('Alt');
    if (tool === 'select-wand') {
      // The blank layer is one contiguous transparent region.
      await expect.poll(() => page.evaluate(() => (window as unknown as StudioWindow).__studioStore.getState().selection)).toBeNull();
    } else {
      await expect.poll(() => page.evaluate(() => {
        const mask = (window as unknown as StudioWindow).__studioStore.getState().selectionMask;
        return mask ? [mask[9 * 32 + 9], mask[14 * 32 + 14]] : null;
      })).toEqual([1, 0]);
    }
    const afterBox = (await canvas.boundingBox())!;
    expect(afterBox.x).toBe(box.x);
    expect(afterBox.y).toBe(box.y);
    expect(await canvas.evaluate((node: HTMLCanvasElement) => Array.from(node.getContext('2d')!.getImageData(0, 0, 32, 32).data))).toEqual(before);
    if (tool === 'select-box') {
      await page.mouse.move(at(12, 12).x, at(12, 12).y);
      await page.mouse.down({ button: 'middle' });
      await page.mouse.move(at(12, 12).x + 24, at(12, 12).y);
      await page.mouse.up({ button: 'middle' });
      await expect.poll(async () => (await canvas.boundingBox())!.x).toBe(box.x + 24);
      await page.evaluate(() => (window as unknown as StudioWindow).__studioStore.getState().setActiveTool('pen'));
      // Standard keymap: hold Space to pan with a drawing tool (Alt picks a color).
      await page.keyboard.down('Space');
      await page.mouse.down();
      await page.mouse.move(at(12, 12).x + 48, at(12, 12).y);
      await page.mouse.up();
      await page.keyboard.up('Space');
      await expect.poll(async () => (await canvas.boundingBox())!.x).toBe(box.x + 48);
    }
  });
}
