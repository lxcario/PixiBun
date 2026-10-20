import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, liquidControls: boolean) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(on => {
    localStorage.setItem('pixibun-studio-theme', 'moonlit');
    localStorage.setItem('pixibun:labs:v1', JSON.stringify({ island: false, liquidTabs: false, liquidControls: on, paletteStudio: false, quickMagic: false }));
  }, liquidControls);
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
}

test('the lens is the active tool highlight and springs to a newly chosen tool', async ({ page }) => {
  await open(page, true);
  const lens = page.getByTestId('tool-rail-lens');
  const boxOf = (testId: string) => page.getByTestId(testId).evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y }; });
  const lensBox = () => lens.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y }; });
  await expect.poll(() => lens.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await expect.poll(async () => Math.abs((await lensBox()).y - (await boxOf('pen-tool')).y)).toBeLessThan(1.5);
  const moved = page.evaluate(() => new Promise<boolean>(resolve => {
    const host = document.querySelector('.lq-rail-host')!;
    const observer = new MutationObserver(() => {
      if (host.classList.contains('lq-rail-moving')) { observer.disconnect(); resolve(true); }
    });
    observer.observe(host, { attributes: true, attributeFilter: ['class'] });
    setTimeout(() => resolve(false), 3000);
  }));
  await page.getByTestId('eraser-tool').click();
  expect(await moved).toBe(true);
  await expect(page.getByTestId('eraser-tool')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.lq-rail-host')).not.toHaveClass(/lq-rail-moving/);
  await expect.poll(async () => Math.abs((await lensBox()).y - (await boxOf('eraser-tool')).y)).toBeLessThan(1.5);
  expect(Math.abs((await lensBox()).x - (await boxOf('eraser-tool')).x)).toBeLessThan(1.5);
});

test('slider handles turn to glass while held and settle back without leftovers', async ({ page }) => {
  await open(page, true);
  await expect(page.locator('body')).toHaveClass(/lq-sliders/);
  const slider = page.getByRole('slider', { name: 'Layer opacity' });
  const box = (await slider.boundingBox())!;
  await page.mouse.move(box.x + box.width - 8, box.y + box.height / 2);
  await page.mouse.down();
  await expect(slider).toHaveAttribute('data-lq-glass', '');
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  await page.mouse.move(20, 600);
  await expect(slider).not.toHaveAttribute('data-lq-glass');
  await expect.poll(() => slider.evaluate(el => el.getAttribute('style') ?? '')).not.toContain('--lq-x');
});

test('with the lab off there is no lens and sliders keep the classic handle', async ({ page }) => {
  await open(page, false);
  await expect(page.getByTestId('pen-tool')).toBeVisible();
  await expect(page.getByTestId('tool-rail-lens')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/lq-sliders/);
});

test('press, hold and slide lifts the lens and picks the tool it is released on', async ({ page }) => {
  await open(page, true);
  const lens = page.getByTestId('tool-rail-lens');
  const pen = (await page.getByTestId('pen-tool').boundingBox())!;
  const eraser = (await page.getByTestId('eraser-tool').boundingBox())!;
  await page.mouse.move(pen.x + pen.width / 2, pen.y + pen.height / 2);
  await page.mouse.down();
  await expect(lens).toHaveClass(/is-glass/);
  await page.mouse.move(eraser.x + eraser.width / 2, eraser.y + eraser.height / 2, { steps: 6 });
  await expect(page.getByTestId('eraser-tool')).toHaveAttribute('data-lq-under', '');
  await page.mouse.up();
  await expect(page.getByTestId('eraser-tool')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('pen-tool')).toHaveAttribute('aria-pressed', 'false');
  await expect(lens).not.toHaveClass(/is-glass/);
  await expect(page.locator('[data-lq-under]')).toHaveCount(0);
});

test('a still hold on a grouped slot still opens its flyout', async ({ page }) => {
  await open(page, true);
  const grouped = page.locator('button[data-testid$="-tool"][aria-haspopup="menu"]').first();
  const box = (await grouped.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(grouped).toHaveAttribute('aria-expanded', 'true');
  await page.mouse.up();
  await expect(page.getByTestId('tool-rail-lens')).not.toHaveClass(/is-glass/);
});

test('release selects the pointed tool even before the lens animation advances', async ({ page }) => {
  await open(page, true);
  const pen = (await page.getByTestId('pen-tool').boundingBox())!;
  const eraser = (await page.getByTestId('eraser-tool').boundingBox())!;
  // Hold animation frames still, while genuine pointer events keep arriving.
  // Tool selection must follow the pointer target, not a lagging spring value.
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.mouse.move(pen.x + pen.width / 2, pen.y + pen.height / 2);
  await page.mouse.down();
  await page.mouse.move(eraser.x + eraser.width / 2, eraser.y + eraser.height / 2, { steps: 6 });
  await expect(page.getByTestId('eraser-tool')).toHaveAttribute('data-lq-under', '');
  await page.mouse.up();
  await expect(page.getByTestId('eraser-tool')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('pen-tool')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-lq-under]')).toHaveCount(0);
  await page.clock.resume();
});
