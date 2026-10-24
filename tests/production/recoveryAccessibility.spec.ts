import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.use({ hasTouch: true });

test('visible Home and Studio labels are included in accessible names', async ({ page }, info) => {
  for (const url of ['/', '/studio']) {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(url);
    if (url === '/studio') await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
    const results = await new AxeBuilder({ page }).withRules(['label-content-name-mismatch']).analyze();
    await info.attach(`label-name-${url === '/' ? 'home' : 'studio'}`, { body: Buffer.from(JSON.stringify(results.violations, null, 2)), contentType: 'application/json' });
    expect(results.violations).toEqual([]);
  }
});

test('large flyout color controls support taps without changing canvas pixels', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const pixels = () => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
  const before = await pixels();
  const dock = page.getByTestId('toolbar-color-dock');
  const trigger = dock.getByRole('button', { name: 'Quick Swatches Flyout', exact: true });
  const triggerBox = (await trigger.boundingBox())!;
  expect(triggerBox.width).toBeGreaterThanOrEqual(24); expect(triggerBox.height).toBeGreaterThanOrEqual(24);
  await trigger.tap();
  const flyout = page.getByRole('dialog', { name: 'Color quick access flyout', exact: true });
  await expect(flyout).toBeVisible();
  // Measure targets at rest: the flyout blooms and unfolds its rows before settling.
  await flyout.evaluate(element => Promise.all(element.getAnimations({ subtree: true })
    .filter(animation => animation.effect?.getComputedTiming().endTime !== Infinity)
    .map(animation => animation.finished.catch(() => undefined))));
  // Measure in CSS pixels from the page. Firefox's protocol boundingBox() rounds fractional
  // positions to float32, so a 44 px button at x = 230.3 reads 43.99998 px there.
  const sizes = await flyout.getByRole('button').evaluateAll(buttons => buttons.map(button => {
    const box = button.getBoundingClientRect(); return { width: box.width, height: box.height };
  }));
  expect(sizes.length).toBeGreaterThan(0);
  for (const box of sizes) {
    expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const primary = dock.getByRole('button', { name: /^Primary color / });
  const color = () => primary.evaluate(button => (button as HTMLButtonElement).style.backgroundColor);
  const swatch = flyout.getByRole('button', { name: /^Palette color / }).nth(2);
  const swatchColor = await swatch.evaluate(button => (button as HTMLButtonElement).style.backgroundColor);
  await swatch.tap(); expect(await color()).toBe(swatchColor);
  await flyout.getByRole('button', { name: /^Secondary/ }).tap();
  await flyout.getByRole('button', { name: /^Palette color / }).nth(3).tap();
  await flyout.getByRole('button', { name: 'Reset default black and white colors', exact: true }).tap();
  expect(await color()).toBe('rgb(0, 0, 0)');
  await flyout.getByRole('button', { name: 'Swap colors', exact: true }).tap();
  expect(await color()).toBe('rgb(255, 255, 255)');
  await flyout.screenshot({ path: info.outputPath('large-color-controls.png') });
  expect(await pixels()).toEqual(before);
});
