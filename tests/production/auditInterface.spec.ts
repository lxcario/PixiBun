import { expect, test, type Page } from '@playwright/test';
import { chooseTool } from '../helpers/tools';
import { openMotionCapture } from '../helpers/motion';
import AxeBuilder from '@axe-core/playwright';

for (const theme of ['atelier', 'sakura']) {
  for (const scheme of ['dark', 'light']) {
    test(`inspector labels and controls fit narrow laptop layouts in ${theme} ${scheme}`, async ({ page }) => {
      await page.addInitScript(({ theme, scheme }) => {
        localStorage.setItem('pixibun-studio-theme', theme);
        localStorage.setItem('pixibun-color-scheme', scheme);
        localStorage.setItem('pixibun:artist-workspace:v1', JSON.stringify({ layout: { inspectorWidth: 260, inspectorSide: 'right', timeline: true, navigator: false, color: false } }));
      }, { theme, scheme });
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/studio');
      await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
      await page.getByTestId('tab-layers').click();
      for (let i = 0; i < 9; i++) await page.getByRole('button', { name: 'Add New Layer', exact: true }).click();
      for (const width of [1024, 1280, 1920]) {
        await page.setViewportSize({ width, height: 720 });
        for (const tab of ['tools', 'layers', 'palette', 'ai']) {
          await page.getByTestId(`tab-${tab}`).click();
          await expect.poll(() => page.getByRole('group', { name: 'Inspector sections' }).getByRole('button').evaluateAll(buttons => buttons.every(button => {
            const label = button.querySelector<HTMLElement>('[data-inspector-tab-label]')!;
            const b = button.getBoundingClientRect(), t = label.getBoundingClientRect();
            return b.height >= 24 && b.width >= 24 && label.scrollWidth <= label.clientWidth + 1 && t.left >= b.left && t.right <= b.right && parseFloat(getComputedStyle(label).fontSize) >= 12;
          }))).toBe(true);
        }
      }
      await page.getByTestId('tab-tools').click();
      const slider = page.getByRole('slider', { name: 'Tool panel brush size', exact: true });
      expect((await slider.boundingBox())!.height).toBeGreaterThanOrEqual(24);
      await slider.focus(); await slider.press('Home'); await slider.press('ArrowRight');
      await expect(slider).toHaveValue('2');
      await expect(page.getByTestId('create-motion-part-btn')).toBeHidden();
      await openMotionCapture(page);
      await expect(page.getByTestId('create-motion-part-btn')).toBeVisible();
      const contrast = await new AxeBuilder({ page }).include('[data-testid="status-bar"]').include('[data-testid="bottom-timeline"]').withRules(['color-contrast']).analyze();
      expect(contrast.violations).toEqual([]);
    });
  }
}

test('Animate artwork retains whole-layer capture and exact cancellation without a selection', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const canvas = page.getByTestId('main-composite-canvas');
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4);
  const pixels = () => canvas.evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
  const original = await pixels(); expect(original.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  await chooseTool(page, 'color-replace');
  await expect(page.getByTestId('create-motion-part-btn')).toBeHidden();
  await openMotionCapture(page);
  await page.getByTestId('create-motion-part-btn').click();
  await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click();
  await expect.poll(pixels).toEqual(original);
});

async function labelProblems(page: Page) {
  return page.getByRole('region', { name: 'Welcome to PixiBun' }).evaluate(section => {
    const host = section.getBoundingClientRect();
    const copy = section.querySelector('[data-hero-copy]')!.getBoundingClientRect();
    const labels = Array.from(section.querySelectorAll<HTMLElement>('[data-constellation-label]')).filter(e => getComputedStyle(e).visibility !== 'hidden').map(e => e.getBoundingClientRect());
    const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    return labels.flatMap((r, i) => [
      ...(r.left < host.left || r.right > host.right || r.top < host.top || r.bottom > host.bottom ? ['outside'] : []),
      ...(overlaps(r, copy) ? ['copy overlap'] : []),
      ...labels.slice(i + 1).filter(other => overlaps(r, other)).map(() => 'label overlap'),
    ]);
  });
}

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`constellation names stay unique and clear of hero copy on resize and scroll (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(() => { Math.random = () => 0.99; });
    await page.goto('/');
    const hero = page.getByRole('region', { name: 'Welcome to PixiBun' });
    const heading = hero.locator('h1'); await expect(heading).toBeVisible();
    const box = (await heading.boundingBox())!;
    for (let i = 0; i < 4; i++) {
      await page.mouse.move(box.x + 30, box.y + 60 + i * 25); await page.mouse.down();
      await page.mouse.move(box.x + 80, box.y + 60 + i * 25); await page.mouse.move(box.x + 130, box.y + 60 + i * 25); await page.mouse.up();
    }
    const labels = hero.locator('[data-constellation-label]');
    await expect(labels).toHaveCount(4);
    const names = await labels.allTextContents(); expect(new Set(names).size).toBe(4);
    await expect.poll(() => labels.evaluateAll(es => es.some(e => getComputedStyle(e).visibility === 'visible'))).toBe(true);
    for (const width of [1280, 390, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const y of [0, 200]) {
        await page.evaluate(y => window.scrollTo(0, y), y);
        await expect.poll(() => labelProblems(page)).toEqual([]);
      }
    }
  });
}
