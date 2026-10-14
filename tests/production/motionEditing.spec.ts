import { expect, test, type Page } from '@playwright/test';
import { chooseTool } from '../helpers/tools';

const pixels = (page: Page, testId = 'main-composite-canvas') => page.getByTestId(testId).evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
async function setup(page: Page) {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4, { steps: 4 }); await page.mouse.up();
  await expect.poll(async () => (await pixels(page)).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  const authored = await pixels(page);
  await chooseTool(page, 'select-box');
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 4 }); await page.mouse.up();
  await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click();
  await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  return authored;
}
async function numeric(page: Page, label: string, value: string) {
  const field = page.getByRole('spinbutton', { name: label, exact: true });
  await field.fill(value); await field.press('Enter'); await expect(field).toHaveValue(value);
}

test('motion parameter Undo owns the session and preserves authored pixels through Cancel', async ({ page }) => {
  const authored = await setup(page);
  await numeric(page, 'Position X pixels', '12');
  await numeric(page, 'Pivot X pixels', '15.5');
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('ControlOrMeta+z');
  await expect(page.getByRole('spinbutton', { name: 'Position X pixels', exact: true })).toHaveValue('12');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.getByRole('spinbutton', { name: 'Position X pixels', exact: true })).toHaveValue('0');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(page.getByRole('spinbutton', { name: 'Position X pixels', exact: true })).toHaveValue('12');
  await page.getByRole('button', { name: 'Reset Pose', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Position X pixels', exact: true })).toHaveValue('0');
  await page.getByRole('button', { name: 'Undo motion edit', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Position X pixels', exact: true })).toHaveValue('12');
  await page.getByTestId('piximotion-panel').getByRole('button', { name: 'Cancel (Escape)', exact: true }).click();
  await expect.poll(() => pixels(page)).toEqual(authored);
});

test('a held slider gesture creates one Undo and the full 30-frame arc can bake and undo', async ({ page }) => {
  const authored = await setup(page), slider = page.getByRole('slider', { name: 'Pose translation X', exact: true });
  await slider.focus(); for(let i = 0; i < 6; i++) await page.keyboard.down('ArrowRight'); await page.keyboard.up('ArrowRight');
  await expect(slider).toHaveValue('6'); await page.getByRole('button', { name: 'Undo motion edit', exact: true }).click(); await expect(slider).toHaveValue('0');
  await page.getByRole('button', { name: 'Redo motion edit', exact: true }).click(); await expect(slider).toHaveValue('6');
  const count = page.getByRole('slider', { name: 'Motion frame count', exact: true }); await count.focus(); await count.press('End'); await expect(count).toHaveValue('30');
  await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Select frame \d+\./ })).toHaveCount(30);
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('ControlOrMeta+z');
  await expect(page.getByRole('button', { name: /^Select frame \d+\./ })).toHaveCount(1); await expect.poll(() => pixels(page)).toEqual(authored);
  await page.keyboard.press('ControlOrMeta+Shift+z'); await expect(page.getByRole('button', { name: /^Select frame \d+\./ })).toHaveCount(30);
});

test('a canvas motion drag is one Undo step', async ({ page }) => {
  await setup(page);
  const box = (await page.getByTestId('piximotion-bounding-box').boundingBox())!;
  const start = { x: box.x + box.width * 0.25, y: box.y + box.height * 0.5 };
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(start.x + 35, start.y + 14, { steps: 8 }); await page.mouse.up();
  const field = page.getByRole('spinbutton', { name: 'Position X pixels', exact: true });
  await expect(field).not.toHaveValue('0');
  await page.getByRole('button', { name: 'Undo motion edit', exact: true }).click(); await expect(field).toHaveValue('0');
  await expect(page.getByRole('button', { name: 'Undo motion edit', exact: true })).toBeDisabled();
});

test('Cancel during a delayed worker bake preserves the original timeline and artwork', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(message: unknown, options?: Transferable[] | StructuredSerializeOptions): void {
        const request = message as { raster?: unknown; bounds?: unknown; pose?: unknown };
        if (request?.raster && request.bounds && request.pose) {
          setTimeout(() => super.postMessage(message, options as Transferable[]), 500);
        } else super.postMessage(message, options as Transferable[]);
      }
    };
  });
  const authored = await setup(page);
  await numeric(page, 'Rotation degrees', '45');
  const panel = page.getByTestId('piximotion-panel');
  await panel.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
  await expect(panel).toHaveAttribute('aria-busy', 'true');
  await panel.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click();
  await expect(panel).toBeHidden(); await page.waitForTimeout(1000);
  await expect(page.getByRole('button', { name: /^Select frame \d+\./ })).toHaveCount(1);
  await expect.poll(() => pixels(page)).toEqual(authored);
});

test('fractional-pivot arbitrary-angle preview matches the baked cel and survives Undo/Redo', async ({ page }) => {
  const authored = await setup(page);
  await numeric(page, 'Rotation degrees', '33.3'); await numeric(page, 'Pivot X pixels', '15.5');
  await numeric(page, 'Position X pixels', '4'); await numeric(page, 'Motion frames', '3');
  await expect(page.getByTestId('piximotion-preview-canvas')).toHaveAttribute('aria-busy', 'false');
  const preview = await pixels(page, 'piximotion-preview-canvas');
  await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
  await expect(page.getByTestId('piximotion-panel')).toBeHidden(); await expect.poll(() => pixels(page)).toEqual(preview);
  await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(authored);
  await page.getByTestId('redo-button').click();
  await page.getByRole('button', { name: /Select frame 3\./ }).click(); await expect.poll(() => pixels(page)).toEqual(preview);
});

test('fractional-pivot rotated artwork clips at the left edge with a bounded worker raster and exact Undo/Redo', async ({ page }) => {
  await page.addInitScript(() => {
    const observed: { width: number; height: number; destX: number }[] = [];
    Object.assign(window, { motionRasterObservations: observed });
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener('message', ({ data }) => {
          if (data?.result?.data instanceof Uint8ClampedArray && Number.isInteger(data.result.destX)) {
            observed.push({ width: data.result.width, height: data.result.height, destX: data.result.destX });
          }
        });
      }
    };
  });
  const authored = await setup(page);
  await numeric(page, 'Rotation degrees', '33.3'); await numeric(page, 'Pivot X pixels', '15.3');
  await numeric(page, 'Position X pixels', '-12'); await numeric(page, 'Motion frames', '3');
  await expect(page.getByTestId('piximotion-preview-canvas')).toHaveAttribute('aria-busy', 'false');
  const preview = await pixels(page, 'piximotion-preview-canvas');
  expect(preview.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  expect(preview).not.toEqual(authored);
  await expect.poll(() => page.evaluate(() => {
    const observed = (window as unknown as { motionRasterObservations: { width: number; height: number; destX: number }[] }).motionRasterObservations;
    return observed.some(r => r.width < 32 && r.height < 32 && r.destX < 0);
  })).toBe(true);
  await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
  await expect(page.getByTestId('piximotion-panel')).toBeHidden(); await expect.poll(() => pixels(page)).toEqual(preview);
  await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(authored);
  await page.getByTestId('redo-button').click(); await page.getByRole('button', { name: /Select frame 3\./ }).click();
  await expect.poll(() => pixels(page)).toEqual(preview);
});
