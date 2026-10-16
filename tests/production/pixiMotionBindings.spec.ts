import { openMotionCapture } from '../helpers/motion';
import { expect, test, type Page } from '@playwright/test';
import { chooseTool } from '../helpers/tools';

const pixels = (page: Page, testId = 'main-composite-canvas') => page.getByTestId(testId).evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));

function translated(source: number[], dx: number) {
  const result = new Array<number>(source.length).fill(0);
  for (let y = 0; y < 32; y++) for (let x = 0; x + dx < 32; x++) {
    const src = (y * 32 + x) * 4, dst = (y * 32 + x + dx) * 4;
    for (let c = 0; c < 4; c++) result[dst + c] = source[src + c];
  }
  return result;
}

async function readyWithMark(page: Page) {
  // These exact-pixel/history journeys use the flat desk. Animated scene
  // geometry is covered separately; its repaint work is not this contract.
  await page.addInitScript(() => localStorage.setItem('pixibun-studio-theme', 'atelier'));
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const canvas = page.getByTestId('main-composite-canvas'); const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4, { steps: 4 }); await page.mouse.up();
  await expect.poll(async () => (await pixels(page)).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  return pixels(page);
}
async function capture(page: Page) {
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Escape');
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await chooseTool(page, 'select-box');
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 4 }); await page.mouse.up();
  await page.getByTestId('tab-tools').click();
  await openMotionCapture(page); await page.getByTestId('create-motion-part-btn').click(); await expect(page.getByTestId('piximotion-panel')).toBeVisible();
}
async function setArc(page: Page) {
  const translation = page.getByRole('slider', { name: 'Pose translation X', exact: true }); await translation.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight'); await expect(translation).toHaveValue('4');
  const count = page.getByRole('slider', { name: 'Motion frame count', exact: true }); await count.focus();
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(count).toHaveValue('3');
  await page.getByRole('combobox', { name: 'Motion easing', exact: true }).selectOption('linear');
}
const frame = (page: Page, n: number) => page.getByRole('button', { name: new RegExp(`Select frame ${n}\\.`) });

test('compiled stale source refuses bake; fresh capture previews, bakes, undoes, redoes and reloads exact translated pixels', async ({ page }) => {
  const original = await readyWithMark(page); await capture(page);
  await page.getByTestId('piximotion-panel').getByRole('button', { name: 'Cancel (Escape)', exact: true }).focus();
  await page.keyboard.press('Enter'); await expect(page.getByTestId('piximotion-panel')).toBeHidden();
  await expect(frame(page, 2)).toHaveCount(0); await expect.poll(() => pixels(page)).toEqual(original);
  await capture(page); await page.locator('#center-canvas-area').focus();
  await page.keyboard.press('ArrowRight'); await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 1));
  await page.keyboard.press('ArrowLeft'); await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(original);
  await page.getByTestId('undo-button').click();
  await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 1));
  await page.getByTestId('redo-button').click();
  await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(original);
  // Move the overlay away, then edit the captured source through the real pen tool.
  const x = page.getByRole('spinbutton', { name: 'Position X pixels', exact: true });
  await x.fill('24'); await x.press('Enter');
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('b');
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await expect(page.getByTestId('piximotion-panel').getByRole('status').filter({ hasText: /source artwork changed/ })).toHaveText(/source artwork changed/);
  await expect(page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true })).toBeDisabled();
  await expect.poll(() => pixels(page)).not.toEqual(original);
  await expect(page.getByTestId('main-composite-canvas')).toHaveCSS('opacity', '1');
  await page.getByTestId('piximotion-panel').getByRole('button', { name: 'Cancel (Escape)', exact: true }).click();
  await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(original);
  await capture(page); await setArc(page);
  await expect(page.getByTestId('main-composite-canvas')).toHaveCSS('opacity', '0');
  await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 4));
  await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
  await expect(page.getByTestId('piximotion-panel')).toBeHidden(); await expect(frame(page, 3)).toBeVisible();
  await expect(frame(page, 4)).toHaveCount(0); await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  await frame(page, 2).click(); await expect.poll(() => pixels(page)).toEqual(translated(original, 2));
  await frame(page, 1).click(); await expect.poll(() => pixels(page)).toEqual(original);
  await page.getByTestId('undo-button').click(); await expect(frame(page, 2)).toHaveCount(0);
  await expect.poll(() => pixels(page)).toEqual(original);
  await page.getByTestId('redo-button').click(); await expect(frame(page, 3)).toBeVisible();
  await expect(frame(page, 1)).toHaveClass(/timeline-frame-active-bg/);
  await frame(page, 3).click();
  await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  await page.getByTestId('save-button').click();
  await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect(frame(page, 3)).toBeVisible(); await frame(page, 3).click();
  await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  await frame(page, 2).click(); await expect.poll(() => pixels(page)).toEqual(translated(original, 2));
  await expect(page.getByTestId('piximotion-panel')).toHaveCount(0);
});

test('compiled frame duplication never retargets a captured part and bake Undo restores the previously active copy', async ({ page }) => {
  const original = await readyWithMark(page); await capture(page); await setArc(page);
  // A first-install WebKit worker notification can cover this timeline control.
  // Dismiss it through the UI; keep the full frame and history assertions.
  const dismissUpdate = page.getByRole('button', { name: 'Dismiss update banner', exact: true });
  if (await dismissUpdate.isVisible()) await dismissUpdate.click();
  await page.getByRole('button', { name: 'Duplicate frame', exact: true }).click(); await expect(frame(page, 2)).toBeVisible();
  await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
  await expect(frame(page, 4)).toBeVisible(); await expect(frame(page, 5)).toHaveCount(0);
  await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  await frame(page, 4).click(); await expect.poll(() => pixels(page)).toEqual(original);
  await page.getByTestId('undo-button').click(); await expect(frame(page, 3)).toHaveCount(0);
  await expect(frame(page, 2)).toHaveClass(/timeline-frame-active-bg/); await expect.poll(() => pixels(page)).toEqual(original);
  await page.getByTestId('redo-button').click(); await expect(frame(page, 4)).toHaveClass(/timeline-frame-active-bg/);
  await frame(page, 3).click();
  await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
});
