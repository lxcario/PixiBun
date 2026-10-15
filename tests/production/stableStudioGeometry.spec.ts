import { expect, test, type Page } from '@playwright/test';
import { chooseTool } from '../helpers/tools';

const pixels = (page: Page, id = 'main-composite-canvas') => page.getByTestId(id).evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
async function numeric(page: Page, label: string, value: string) { const input = page.getByRole('spinbutton', { name: label, exact: true }); await input.fill(value); await input.press('Enter'); }
async function draw(page: Page, x: number, y: number) { const canvas = page.getByTestId('main-composite-canvas'), box = (await canvas.boundingBox())!, size = await canvas.evaluate((c: HTMLCanvasElement) => [c.width, c.height]); await page.mouse.click(box.x + (x + .5) * box.width / size[0], box.y + (y + .5) * box.height / size[1]); }

test('the original compact color dock stays bottom left and its wells, swatches, swap and reset work', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 900 }); await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const dock = page.getByTestId('toolbar-color-dock'), primary = dock.getByRole('button', { name: /^Primary color / }), secondary = dock.getByRole('button', { name: /^Secondary color / });
  const boxes = await Promise.all([primary.boundingBox(), secondary.boundingBox(), dock.boundingBox(), page.getByTestId('bottom-timeline').boundingBox()]);
  expect(boxes[0]!.width).toBe(24); expect(boxes[1]!.width).toBe(22); expect(boxes[2]!.height).toBeLessThanOrEqual(124);
  expect(boxes[0]!.x + boxes[0]!.width).toBeGreaterThan(boxes[1]!.x);
  expect(boxes[2]!.x).toBeLessThan(10); expect(boxes[2]!.y + boxes[2]!.height).toBeCloseTo(boxes[3]!.y, 0);
  const color = (well: typeof primary) => well.evaluate(button => (button as HTMLButtonElement).style.backgroundColor);
  const before = await Promise.all([color(primary), color(secondary)]); await dock.getByRole('button', { name: 'Swap colors (X)', exact: true }).click();
  expect(await Promise.all([color(primary), color(secondary)])).toEqual([before[1], before[0]]);
  const swatch = dock.getByRole('button', { name: /^Quick color / }).first(), swatchColor = await color(swatch); await swatch.click(); expect(await color(primary)).toBe(swatchColor);
  await swatch.click({ button: 'right' }); expect(await color(secondary)).toBe(swatchColor);
  await dock.getByRole('button', { name: /^Reset default/ }).click(); expect(await Promise.all([color(primary), color(secondary)])).toEqual(['rgb(0, 0, 0)', 'rgb(255, 255, 255)']);
  await dock.getByRole('button', { name: 'Quick Swatches Flyout', exact: true }).click(); await expect(page.getByRole('region', { name: 'Color quick access flyout', exact: true })).toBeVisible(); await page.keyboard.press('Escape');
  await dock.screenshot({ path: info.outputPath('compact-color-dock.png') });
});

for (const theme of ['atelier', 'cozy-classic']) test(`${theme} controls and canvas keep their geometry when onion help and motion states change`, async ({ page }, info) => {
  await page.setViewportSize({ width: 1920, height: 1000 }); await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.getByRole('button', { name: 'Studio options', exact: true }).click(); await page.getByTestId(`theme-option-${theme}`).click(); await page.keyboard.press('Escape');
  for (const width of [1920, 1280, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    const geometry = () => page.evaluate(() => ['main-composite-canvas', 'bottom-timeline'].map(id => { const r = document.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
    const before = await geometry(), onion = page.getByRole('button', { name: 'Onion Skin', exact: true });
    await onion.click(); await expect.poll(geometry).toEqual(before); await onion.click(); await expect.poll(geometry).toEqual(before);
    const row = page.getByTestId('bottom-timeline'); expect(await row.evaluate(element => {
      const bounds = element.getBoundingClientRect(); return Array.from(element.querySelectorAll('button')).filter(button => !button.closest('details:not([open])') && button.getClientRects().length && button.getBoundingClientRect().top < bounds.top + 40).every(button => { const box = button.getBoundingClientRect(); return box.left >= bounds.left && box.right <= bounds.right && box.height === 28; });
    })).toBe(true);
  }
  await draw(page, 8, 8); await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click();
  const actions = [page.getByRole('button', { name: 'Undo motion edit', exact: true }), page.getByRole('button', { name: 'Redo motion edit', exact: true }), page.getByRole('button', { name: 'Reset Pose', exact: true })];
  const boxes = await Promise.all(actions.map(action => action.boundingBox())); expect(boxes.every(box => box && box.height === 28 && Math.abs(box.width - boxes[0]!.width) < 1 && box.y === boxes[0]!.y)).toBe(true);
  for (const action of actions) expect(await action.evaluate(button => { const label = button.firstElementChild!.getBoundingClientRect(), outer = button.getBoundingClientRect(); return Math.abs((label.top + label.bottom - outer.top - outer.bottom) / 2) < 1 && getComputedStyle(button).fontSize === '12px' && label.height <= outer.height - 2; })).toBe(true);
  const start = page.getByTestId('pose-btn-start'), end = page.getByTestId('pose-btn-end'); const poseBoxes = await Promise.all([start.boundingBox(), end.boundingBox()]); expect(poseBoxes[0]!.height).toBe(poseBoxes[1]!.height);
  await start.click(); expect((await start.boundingBox())!.height).toBe(poseBoxes[0]!.height); await end.click();
  const play = page.getByRole('button', { name: 'Play Loop', exact: true }), playBox = await play.boundingBox(); await play.click(); await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible();
  const pause = page.getByTestId('piximotion-panel').getByRole('button', { name: 'Pause', exact: true }); expect((await pause.boundingBox())!.width).toBe(playBox!.width); await pause.click();
  await page.screenshot({ path: info.outputPath(`motion-${theme}-1024-bottom.png`) });
  await page.getByTestId('right-inspector').locator('.overflow-y-auto').evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({ path: info.outputPath(`motion-${theme}-1024-top.png`) });
});

test('merging layered artwork moves every painted layer without leaving an original drawing, and Undo restores the separate layers', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 }); await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await draw(page, 8, 8); await page.getByTestId('tab-layers').click(); await page.getByRole('button', { name: 'Add New Layer', exact: true }).click(); await draw(page, 12, 8);
  await page.getByRole('slider', { name: 'Layer opacity', exact: true }).fill('50'); const original = await pixels(page); expect(original.filter((v, i) => i % 4 === 3 && v)).toHaveLength(2);
  await chooseTool(page, 'select-box'); const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width * 7 / 32, box.y + box.height * 7 / 32); await page.mouse.down(); await page.mouse.move(box.x + box.width * 10 / 32, box.y + box.height * 10 / 32); await page.mouse.up();
  await page.getByTestId('tab-tools').click(); await page.getByTestId('create-visible-motion-btn').click();
  await numeric(page, 'Position X pixels', '2'); await numeric(page, 'Motion frames', '3');
  const expected = new Array<number>(original.length).fill(0); for (let y = 0; y < 32; y++) for (let x = 0; x + 2 < 32; x++) for (let c = 0; c < 4; c++) expected[(y * 32 + x + 2) * 4 + c] = original[(y * 32 + x) * 4 + c];
  await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(expected);
  await page.getByTestId('pose-btn-start').click(); await numeric(page, 'Position X pixels', '1'); await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click(); await expect(page.getByTestId('piximotion-panel')).toBeHidden();
  await expect.poll(() => pixels(page)).toEqual(expected); await page.getByRole('button', { name: /Select frame 1\./ }).click();
  const first = new Array<number>(original.length).fill(0); for (let y = 0; y < 32; y++) for (let x = 0; x + 1 < 32; x++) for (let c = 0; c < 4; c++) first[(y * 32 + x + 1) * 4 + c] = original[(y * 32 + x) * 4 + c];
  await expect.poll(() => pixels(page)).toEqual(first); expect(first).not.toEqual(original);
  await page.getByTestId('undo-button').click(); await expect(page.getByRole('button', { name: /^Select frame \d+\./ })).toHaveCount(1); await expect.poll(() => pixels(page)).toEqual(original);
  await page.getByTestId('undo-button').click(); await page.getByTestId('tab-layers').click(); await expect(page.getByTestId('layers-stack-count')).toHaveText('(2)'); await expect.poll(() => pixels(page)).toEqual(original);
  await page.getByTestId('redo-button').click(); await expect(page.getByTestId('layers-stack-count')).toHaveText('(1)'); await page.getByTestId('redo-button').click(); await page.getByRole('button', { name: /Select frame 3\./ }).click(); await expect.poll(() => pixels(page)).toEqual(expected);
});

test('motion preview suppresses neighboring ghosts and reports painted pixels cropped outside the canvas', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 }); await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await draw(page, 8, 8);
  await page.locator('summary').filter({ hasText: 'Frame actions' }).click(); await page.getByRole('button', { name: 'Duplicate frame', exact: true }).click();
  await page.getByRole('button', { name: 'Onion Skin', exact: true }).click(); await expect.poll(async () => (await pixels(page, 'onion-skin-canvas')).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click(); await numeric(page, 'Position X pixels', '50');
  await expect(page.getByTestId('motion-clipping-notice')).toContainText('1 painted pixel leaves the canvas'); await expect.poll(() => pixels(page, 'onion-skin-canvas')).toEqual(new Array(32 * 32 * 4).fill(0));
  await numeric(page, 'Position X pixels', '2'); await expect(page.getByTestId('piximotion-preview-canvas')).toHaveAttribute('data-clipped-pixels', '0');
  const preview = await pixels(page, 'piximotion-preview-canvas'); expect(preview[(8 * 32 + 8) * 4 + 3]).toBe(0); expect(preview[(8 * 32 + 10) * 4 + 3]).toBe(255);
  await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click(); await expect.poll(async () => (await pixels(page, 'onion-skin-canvas')).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
});
test('motion preview advances when worker results take longer than a cel duration', async ({ page }) => {
  await page.addInitScript(() => {
    const presented: string[] = [];
    (window as unknown as Window & { motionPresentations: string[] }).motionPresentations = presented;
    window.addEventListener('pixibun:motion-preview-status', event => {
      if ((event as CustomEvent).detail?.pending !== false) return;
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="piximotion-preview-canvas"]');
      if (!canvas) return;
      presented.push(Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data).join(','));
      if (presented.length > 20) presented.shift();
    });
    const NativeWorker = window.Worker;
    window.Worker = new Proxy(NativeWorker, { construct(Target, args) {
      const worker = Reflect.construct(Target, args) as Worker;
      return new Proxy(worker, { get(target, key) { const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; },
        set(target, key, value) { return Reflect.set(target, key, key === 'onmessage' && typeof value === 'function' ? (event: MessageEvent) => {
          if (typeof event.data?.result?.destX === 'number') setTimeout(() => value.call(target, event), 400); else value.call(target, event);
        } : value, target); } });
    } });
  });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio?template=mochi');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click();
  const end = page.getByRole('spinbutton', { name: 'Position X pixels', exact: true }); await end.fill('4'); await end.press('Enter');
  const preview = page.getByTestId('piximotion-preview-canvas'); await expect(preview).toHaveAttribute('aria-busy', 'false');
  const signature = () => preview.evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data).join(','));
  const changedSince = (baseline: string) => page.evaluate(value => (window as unknown as Window & { motionPresentations: string[] }).motionPresentations.some(frame => frame !== value), baseline);
  const clearPresentations = () => page.evaluate(() => { (window as unknown as Window & { motionPresentations: string[] }).motionPresentations.length = 0; });
  const first = await signature(); await clearPresentations(); await page.getByRole('button', { name: 'Play Loop', exact: true }).click();
  // Capture each presented raster: periodic polling can alias a looping animation.
  await expect.poll(() => changedSince(first), { timeout: 4000 }).toBe(true);
  await page.getByTestId('piximotion-panel').getByRole('button', { name: 'Pause', exact: true }).click(); await expect(preview).toHaveAttribute('aria-busy', 'false');
  const paused = await signature(); await clearPresentations(); await page.getByRole('button', { name: 'Play Loop', exact: true }).click(); await expect.poll(() => changedSince(paused), { timeout: 4000 }).toBe(true);
  await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click(); await expect(preview).toHaveCount(0);
});
