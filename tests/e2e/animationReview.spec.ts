import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { importAnimationReviewFixture as fixture } from '../helpers/animationReviewFixture';

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
const pixel = (page: Page, x: number, y: number) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement, point: number[]) =>
  Array.from(canvas.getContext('2d')!.getImageData(point[0], point[1], 1, 1).data), [x, y]);

test('native animation review is read-only, undoable, persists exceptions and expires them after drawing', async ({ page }) => {
  await fixture(page); const before = await pixels(page);
  const worker = page.waitForEvent('worker'); await page.getByRole('button', { name: 'Scan animation', exact: true }).click();
  expect((await worker).url()).toContain('animationStability');
  const report = page.getByTestId('animation-review-report'); await expect(report).toBeVisible();
  await expect(report.getByText(/Motion: \(1, 0\) px/)).toBeVisible();
  expect(await pixels(page)).toEqual(before);
  await page.getByRole('combobox', { name: 'Animation comparison zoom' }).selectOption('1');
  await expect(report.getByRole('img', { name: 'Before: frame 1', exact: true })).toHaveCSS('width', '32px');
  await page.getByRole('button', { name: 'Mark this change intentional' }).click();
  await expect(page.getByText(/Marked intentional for these exact frames/)).toBeVisible();
  await page.getByTestId('undo-button').click(); await expect(page.getByRole('button', { name: 'Mark this change intentional' })).toBeVisible();
  await page.getByTestId('redo-button').click(); await expect(page.getByRole('button', { name: 'Reopen this interval' })).toBeVisible();
  await page.getByTestId('save-button').click();
  await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible();
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.getByTestId('tab-ai').click();
  await page.getByRole('combobox', { name: 'Animation review clip' }).selectOption({ label: 'Animation review (1–2)' });
  await page.getByRole('button', { name: 'Scan animation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reopen this interval' })).toBeVisible();
  await page.getByTestId('pen-tool').click();
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.65, box.y + box.height * 0.65);
  await expect(report).toHaveCount(0); await expect(page.getByText('Artwork or review regions changed. Scan again.')).toBeVisible();
  await page.getByRole('button', { name: 'Scan animation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark this change intentional' })).toBeVisible();
});

test('selected protection survives cleanup across the clip and metadata undo/redo and reload', async ({ page }) => {
  await fixture(page);
  await page.getByTestId('select-box-tool').click();
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width * 1.5 / 32, box.y + box.height * 1.5 / 32); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 4.5 / 32, box.y + box.height * 4.5 / 32, { steps: 4 }); await page.mouse.up();
  await page.getByText('Regions and protection (0)', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Animation region name' }).fill('Eye highlight');
  await page.getByRole('button', { name: 'Save selected region' }).click();
  await expect(page.getByText(/Eye highlight: protect/)).toBeVisible();
  await page.getByTestId('undo-button').click(); await expect(page.getByText(/Eye highlight: protect/)).toHaveCount(0);
  await page.getByTestId('redo-button').click(); await expect(page.getByText(/Eye highlight: protect/)).toBeVisible();
  await page.getByRole('button', { name: 'Choose another task' }).click(); await page.getByTestId('pixitools-task-polish').click();
  await page.getByRole('button', { name: 'Cleanup frame scope' }).click();
  await page.getByRole('button', { name: 'Scan artwork for cleanup' }).click();
  await expect(page.getByText(/Kept 2 protected pixels/)).toBeVisible();
  await page.getByRole('button', { name: 'Apply analyzed artwork cleanup' }).click();
  expect(await pixel(page, 2, 2)).toEqual([120, 120, 120, 51]); await expect.poll(() => pixel(page, 6, 6)).toEqual([0, 0, 0, 0]);
  await page.getByTestId('undo-button').click(); await expect.poll(() => pixel(page, 6, 6)).toEqual([120, 120, 120, 51]);
  await page.getByTestId('save-button').click();
  await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible();
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.getByTestId('tab-ai').click(); await page.getByRole('button', { name: 'Choose another task' }).click();
  await page.getByTestId('pixitools-task-animation').click();
  await page.getByRole('combobox', { name: 'Animation review clip' }).selectOption({ label: 'Animation review (1–2)' });
  await page.getByText('Regions and protection (1)', { exact: true }).click();
  await expect(page.getByText(/Eye highlight: protect/)).toBeVisible();
});

test('the animation review remains accessible and fits the inspector at native and enlarged zoom', async ({ page }, info) => {
  await fixture(page); await page.getByRole('button', { name: 'Scan animation', exact: true }).click();
  await expect(page.getByTestId('animation-review-report')).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByRole('combobox', { name: 'Animation comparison zoom' }).selectOption('8');
  expect(await page.getByTestId('right-inspector').evaluate(element => element.scrollWidth > element.clientWidth + 1)).toBe(false);
  const result = await new AxeBuilder({ page }).include('[data-testid="right-inspector"]').analyze();
  expect(result.violations).toEqual([]);
  await page.screenshot({ path: info.outputPath('animation-review-1024.png'), fullPage: true });
});
