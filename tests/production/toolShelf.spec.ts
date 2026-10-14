import { expect, test } from '@playwright/test';
import { CANONICAL_TOOLS } from '../../src/config/shortcuts';
import { chooseTool } from '../helpers/tools';

// Audit v1.14.1: on small laptop windows, tools fell below the shelf and the
// 32×32 canvas opened at 1600%, cut off top and bottom.

for (const size of [{ width: 1280, height: 720 }, { width: 1366, height: 657 }]) {
  test(`every tool is reachable and the canvas opens fully visible at ${size.width}×${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/studio');
    await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();

    const stage = (await page.locator('#main-content').boundingBox())!;
    await expect.poll(async () => {
      const art = (await page.getByTestId('main-composite-canvas').boundingBox())!;
      return art.y >= stage.y && art.y + art.height <= stage.y + stage.height && art.x >= stage.x && art.x + art.width <= stage.x + stage.width;
    }, { message: 'the artwork fits inside the stage' }).toBe(true);

    const shelf = page.locator('[data-shelf]');
    await expect(shelf).toHaveAttribute('data-shelf', /^folded /);
    const bottom = await shelf.evaluate(el => el.getBoundingClientRect().bottom);
    const below = await shelf.locator('button').evaluateAll((buttons, limit) =>
      buttons.filter(button => button.getBoundingClientRect().bottom > limit + 0.5).length, bottom);
    expect(below, 'no shelf button is cut off').toBe(0);

    for (const tool of CANONICAL_TOOLS) {
      await chooseTool(page, tool.id);
      await expect(shelf.getByTestId(`${tool.id}-tool`)).toHaveAttribute('aria-pressed', 'true');
    }
  });
}

test('a folded group opens a keyboard-friendly flyout and keeps the last tool on its slot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  // The slot button opens its group with the Right arrow (or right-click / press and hold).
  const opener = page.locator('[data-tool-slot="shapes"] button[aria-haspopup="menu"]');
  await opener.focus(); await page.keyboard.press('ArrowRight');
  await expect(opener).toHaveAttribute('aria-expanded', 'true');
  const flyout = page.getByRole('menu', { name: 'Lines and shapes' });
  await expect(flyout).toBeVisible();
  await expect(flyout.getByRole('menuitemradio', { name: /Line/ }).first()).toBeFocused();
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  await expect(flyout.getByRole('menuitemradio', { name: /Ellipse/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(flyout).toHaveCount(0);
  await expect(opener).toBeFocused();

  // Press and hold opens the group too, without choosing the slot's tool on release.
  const pen = page.locator('[data-tool-slot="pen"] button[aria-haspopup="menu"]');
  const box = (await pen.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up();
  await expect(page.getByRole('menu', { name: 'Pen tools' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu', { name: 'Pen tools' })).toHaveCount(0);

  await chooseTool(page, 'ellipse');
  await chooseTool(page, 'pen');
  // The shapes slot still shows Ellipse, one click away.
  await expect(page.locator('[data-tool-slot="shapes"]').getByTestId('ellipse-tool')).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('l');
  await expect(page.locator('[data-tool-slot="shapes"]').getByTestId('line-tool')).toHaveAttribute('aria-pressed', 'true');
});

test('tall windows keep every tool on the shelf', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1200 });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect(page.locator('[data-shelf]')).toHaveAttribute('data-shelf', 'full');
  for (const tool of CANONICAL_TOOLS) await expect(page.locator('[data-shelf]').getByTestId(`${tool.id}-tool`)).toBeVisible();
});
