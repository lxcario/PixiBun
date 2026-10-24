import { expect, test, type Page } from '@playwright/test';
import { importAnimationReviewFixture } from '../helpers/animationReviewFixture';
import { chooseTool } from '../helpers/tools';

const pixel = (page: Page, x: number, y: number) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement, point: number[]) =>
  Array.from(canvas.getContext('2d')!.getImageData(point[0], point[1], 1, 1).data), [x, y]);

test('compiled animation worker, saved exceptions and protected cleanup preserve native artwork', async ({ page }) => {
  await importAnimationReviewFixture(page);
  const worker = page.waitForEvent('worker'); await page.getByRole('button', { name: 'Scan animation', exact: true }).click();
  expect((await worker).url()).toContain('/_next/');
  await expect(page.getByTestId('animation-review-report')).toBeVisible();
  await expect(page.getByText(/Motion: \(1, 0\) px/)).toBeVisible();
  await page.getByRole('button', { name: 'Mark this change intentional' }).click();
  await page.getByTestId('save-button').click();
  await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible();
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.getByTestId('tab-ai').click();
  await page.getByRole('combobox', { name: 'Animation review clip' }).selectOption({ label: 'Animation review (1–2)' });
  await page.getByRole('button', { name: 'Scan animation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reopen this interval' })).toBeVisible();
  await chooseTool(page, 'select-box');
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width * 1.5 / 32, box.y + box.height * 1.5 / 32); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 4.5 / 32, box.y + box.height * 4.5 / 32, { steps: 4 }); await page.mouse.up();
  await page.getByText('Regions and protection (0)', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Animation region name' }).fill('Eye highlight');
  await page.getByRole('button', { name: 'Save selected region' }).click();
  await expect(page.getByText(/Eye highlight: protect/)).toBeVisible();
  await page.getByRole('button', { name: 'Choose another task' }).click(); await page.getByTestId('pixitools-task-polish').click();
  await page.getByRole('button', { name: 'Cleanup frame scope' }).click();
  await page.getByRole('button', { name: 'Scan artwork for cleanup' }).click();
  await expect(page.getByText(/Kept 2 protected pixels/)).toBeVisible();
  await page.getByRole('button', { name: 'Apply Cleanup', exact: true }).click();
  expect(await pixel(page, 2, 2)).toEqual([120, 120, 120, 51]); await expect.poll(() => pixel(page, 6, 6)).toEqual([0, 0, 0, 0]);
  await page.getByRole('button', { name: 'Select frame 2. #2 100ms. Drag to reorder.', exact: true }).click();
  expect(await pixel(page, 2, 2)).toEqual([120, 120, 120, 51]); await expect.poll(() => pixel(page, 6, 6)).toEqual([0, 0, 0, 0]);
  await page.getByTestId('undo-button').click(); await expect.poll(() => pixel(page, 6, 6)).toEqual([120, 120, 120, 51]);
});
