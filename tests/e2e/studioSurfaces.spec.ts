import { expect, test, type Page } from '@playwright/test';

/* Shared surface motion (src/lib/motion, src/components/ui/surfaces). These are geometry and
   behaviour checks sampled per animation frame, not frame-rate or device measurements. */

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => localStorage.setItem('pixibun-studio-theme', 'moonlit'));
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
});

/** Sample a value every animation frame for `ms`, starting with the frame after `start` runs. */
async function sampleFrames<T>(page: Page, start: string, read: string, ms = 900): Promise<T[]> {
  return page.evaluate(async ({ start, read, ms }) => {
    const sample = new Function(`return (${read})`) as () => T;
    (new Function(start) as () => void)();
    const values: T[] = [];
    const began = performance.now();
    await new Promise<void>(resolve => {
      const tick = () => {
        values.push(sample());
        if (performance.now() - began < ms || values.length < 6) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    return values;
  }, { start, read, ms });
}

test('Studio and View popovers bloom from their trigger and keep keyboard behaviour', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Studio options', exact: true });
  await trigger.click();
  const studio = page.getByRole('dialog', { name: 'Studio options' });
  await expect(studio).toBeInViewport();
  await expect(studio.getByRole('button', { name: 'Co-Draw session' })).toBeFocused();
  // The bloom points at the trigger: its origin lies within the trigger's horizontal span.
  const origin = await studio.evaluate(element => {
    const [x] = getComputedStyle(element).transformOrigin.split(' ').map(parseFloat);
    const panel = element.getBoundingClientRect();
    const button = document.querySelector('[data-testid="appearance-button"]')!.getBoundingClientRect();
    return { x: panel.left + x, left: button.left, right: button.right };
  });
  expect(origin.x).toBeGreaterThanOrEqual(origin.left - 1);
  expect(origin.x).toBeLessThanOrEqual(origin.right + 1);
  await studio.getByRole('radio', { name: /^Plum/ }).click();
  await page.keyboard.press('ArrowUp');
  await expect(studio.getByRole('radio', { name: /^Graphite/ })).toHaveAttribute('aria-checked', 'true');
  await expect(studio.getByRole('radio', { name: /^Graphite/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('dialog', { name: 'Studio options' })).toHaveCount(0);
  await expect(page.locator('[data-surface="panel"]')).toHaveCount(0);

  const view = page.getByRole('button', { name: 'View options menu', exact: true });
  await view.click();
  const region = page.getByRole('region', { name: 'View options menu' });
  await expect(region).toBeInViewport();
  await region.getByRole('button', { name: 'Live preview Floating window', exact: true }).click();
  await expect(region.getByRole('button', { name: 'Live preview Floating window', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await region.getByRole('combobox', { name: 'Composition guide' }).selectOption('diagonals');
  await expect(page.getByTestId('diagonal-composition-guide')).toBeVisible();
  await page.mouse.click(400, 500);
  await expect(page.getByRole('region', { name: 'View options menu' })).toHaveCount(0);
});

test('a modal scales up out of its opener and returns focus while melting away', async ({ page }) => {
  await page.getByTestId('file-menu-button').click();
  const scales = await sampleFrames<number>(page,
    "document.querySelector('[data-testid=\"new-drawing-button\"]').click()",
    "(() => { const p = document.querySelector('[data-surface-panel]'); if (!p) return -1; const t = getComputedStyle(p).transform; return t === 'none' ? 1 : new DOMMatrix(t).a; })()");
  const shown = scales.filter(scale => scale > 0);
  expect(shown[0]).toBeLessThan(1);
  expect(Math.min(...shown)).toBeGreaterThanOrEqual(0.94);
  expect(shown.at(-1)).toBeCloseTo(1, 3);
  const dialog = page.getByRole('dialog', { name: 'Start a New Drawing?' });
  const sizes = dialog.getByRole('radiogroup', { name: 'Canvas size' });
  await expect(sizes.getByRole('radio', { checked: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(sizes.getByRole('radio', { name: /^48 by 48/ })).toBeFocused();
  await expect(sizes.getByRole('radio', { name: /^48 by 48/ })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Start a New Drawing?' })).toHaveCount(0);
  await expect(page.locator('dialog')).toHaveCount(0);
});

test('the timeline collapses and expands on the island’s bouncy height spring', async ({ page }) => {
  const height = "document.querySelector('.moon-slot-timeline > footer').getBoundingClientRect().height";
  const collapse = await sampleFrames<number>(page, "document.querySelector('[aria-label=\"Collapse Timeline\"]').click()", height);
  const compact = await page.getByTestId('bottom-timeline-collapsed').evaluate(element => element.getBoundingClientRect().height);
  // Shrinks smoothly and never dips below the compact strip it lands on.
  expect(collapse.some(value => value > compact + 4 && value < 128 - 4)).toBe(true);
  expect(Math.min(...collapse)).toBeGreaterThanOrEqual(compact - 0.5);
  expect(collapse.at(-1)).toBeCloseTo(compact, 0);
  // Controls are never scaled by the morph: they keep their 28 px height.
  expect((await page.getByRole('button', { name: 'Expand Timeline' }).boundingBox())!.height).toBe(28);
  const expand = await sampleFrames<number>(page, "document.querySelector('[aria-label=\"Expand Timeline\"]').click()", height);
  // Overshoots its full height once, like the island growing, then settles exactly.
  expect(Math.max(...expand)).toBeGreaterThan(128 + 2);
  expect(expand.at(-1)).toBeCloseTo(128, 0);
  await expect(page.getByTestId('bottom-timeline')).toBeVisible();
});

test('reduced motion cross-fades without scaling, and the timeline snaps', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByTestId('export-button').click();
  const transform = await page.locator('[data-surface-panel]').evaluate(element => getComputedStyle(element).transform);
  expect(transform === 'none' || new DOMMatrix(transform).a === 1).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).toHaveCount(0);
  const heights = await sampleFrames<number>(page, "document.querySelector('[aria-label=\"Collapse Timeline\"]').click()",
    "document.querySelector('.moon-slot-timeline > footer').getBoundingClientRect().height", 300);
  expect(new Set(heights.map(Math.round)).size).toBe(1);
});

test('selects stay native and keep their keyboard and form behaviour', async ({ page }) => {
  const select = page.getByLabel('Workspace layout');
  expect(await select.evaluate(element => element.tagName)).toBe('SELECT');
  await select.selectOption('animation');
  await expect(select.locator('option:checked')).toHaveText('Animation');
  // Keyboard: open the list, move to the previous choice, pick it.
  await select.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(select).toHaveValue('drawing');
  await expect(select).toBeFocused();
});
