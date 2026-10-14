import { expect, test, type Page } from '@playwright/test';
import { chooseTool } from '../helpers/tools';

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
async function ready(page: Page) {
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
}
async function paint(page: Page) {
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => (await pixels(page)).some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
  return box;
}
async function select(page: Page, box: { x: number; y: number; width: number; height: number }) {
  await chooseTool(page, 'select-box');
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByTestId('selection-transform-gizmo')).toBeVisible();
}

test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 1600, height: 1000 }); });

test('Help owns keyboard input and closing it preserves artwork, selection and Undo', async ({ page }) => {
  await ready(page); const box = await paint(page); await select(page, box);
  const artwork = await pixels(page);
  const gizmo = page.getByTestId('selection-transform-gizmo'); const bounds = await gizmo.boundingBox();
  await page.locator('#main-content').focus(); await page.keyboard.press('Shift+/');
  const dialog = page.getByRole('dialog', { name: 'Guide & Shortcuts' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Letter shortcuts use QWERTY key positions/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).focus();
  for (const key of ['Control+z', 'Control+Shift+z', 'Control+s', 'e', 'Delete', 'ArrowRight', 'Shift+h']) await page.keyboard.press(key);
  await expect(dialog).toBeVisible();
  expect(await pixels(page)).toEqual(artwork); expect(await gizmo.boundingBox()).toEqual(bounds);
  await expect(page.getByTestId('select-box-tool')).toHaveClass(/pixel-primary-btn/);
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await expect(gizmo).toBeVisible(); expect(await pixels(page)).toEqual(artwork);
  await page.locator('#main-content').focus(); await page.keyboard.press('Control+z');
  await expect.poll(() => pixels(page)).not.toEqual(artwork);
  await page.keyboard.press('Control+Shift+z'); await expect.poll(() => pixels(page)).toEqual(artwork);
});

test('physical letter events work across layouts while editable input keeps its native commands', async ({ page }) => {
  await ready(page); await paint(page); const artwork = await pixels(page);
  await page.locator('#main-content').focus();
  for (const [key, code, tool] of [['ı', 'KeyI', 'eyedropper'], ['у', 'KeyE', 'eraser'], ['β', 'KeyB', 'pen']]) {
    // Produced characters/code pairs exercise the compiled handler; OS layout is not changed.
    await page.evaluate(({ key, code }) => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true })), { key, code });
    await expect(page.getByTestId(`${tool}-tool`)).toHaveClass(/pixel-primary-btn/);
  }
  await page.evaluate(() => {
    const editor = document.createElement('div'); editor.id = 'test-editable'; editor.contentEditable = 'true'; editor.tabIndex = 0;
    editor.setAttribute('aria-label', 'Test editable input'); document.body.append(editor); editor.focus();
  });
  await page.keyboard.type('e'); await expect(page.locator('#test-editable')).toHaveText('e');
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('pen-tool')).toHaveClass(/pixel-primary-btn/); expect(await pixels(page)).toEqual(artwork);
  await page.evaluate(() => document.getElementById('test-editable')!.remove());
  await page.locator('#main-content').focus(); await page.keyboard.press('e');
  await expect(page.getByTestId('eraser-tool')).toHaveClass(/pixel-primary-btn/);
});

test('a floating selection and its gizmo nudge together once and commit remains undoable', async ({ page }) => {
  await ready(page); const blank = await pixels(page); const box = await paint(page); const original = await pixels(page);
  await select(page, box);
  const body = (await page.getByTestId('gizmo-translate-body').boundingBox())!;
  await page.mouse.move(body.x + body.width * 0.25, body.y + body.height * 0.3); await page.mouse.down();
  await page.mouse.move(body.x + body.width * 0.25 + box.width / 32, body.y + body.height * 0.3, { steps: 3 }); await page.mouse.up();
  const moved = await pixels(page); expect(moved).not.toEqual(original); expect(moved).not.toEqual(blank);
  const gizmo = page.getByTestId('selection-transform-gizmo'); const before = (await gizmo.boundingBox())!;
  await page.locator('#main-content').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await gizmo.boundingBox())!.x).toBeCloseTo(before.x + box.width / 32, 1);
  const nudged = await pixels(page); expect(nudged).not.toEqual(moved);
  await page.keyboard.press('Enter'); await expect(gizmo).not.toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(nudged);
  await page.keyboard.press('Control+z'); await expect.poll(() => pixels(page)).toEqual(original);
});

test('a rotated floating preview updates after a flip and its committed pixels match the preview', async ({ page }) => {
  await ready(page); const box = await paint(page);
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.6);
  const original = await pixels(page); await select(page, box);
  await page.getByTitle('Rotate 90° CW', { exact: true }).click();
  await expect.poll(() => pixels(page)).not.toEqual(original);
  const rotated = await pixels(page);
  await page.getByTitle('Flip Horizontal (H)', { exact: true }).click();
  await expect.poll(() => pixels(page)).not.toEqual(rotated);
  const flipped = await pixels(page);
  await page.getByTestId('gizmo-commit-btn').click();
  await expect(page.getByTestId('selection-transform-gizmo')).toBeHidden();
  await expect.poll(() => pixels(page)).toEqual(flipped);
  await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(original);
});

test('the practice Teaching Board owns its dialog keys and retains separate artwork on return', async ({ page }) => {
  await ready(page); await paint(page); const original = await pixels(page);
  await page.getByTestId('save-button').click();
  await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toHaveText('Changes saved');
  await page.getByTitle('Return to PixiBun Home', { exact: true }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
  await page.getByRole('navigation').getByRole('link', { name: 'Playground', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Return to drawing', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Trace Stencil', exact: true }).click();
  await expect.poll(async () => (await pixels(page)).some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
  const traced = await pixels(page);
  await page.locator('#main-content').focus();
  await page.evaluate(() => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'у', code: 'KeyE', bubbles: true, cancelable: true })));
  await expect(page.getByTestId('eraser-tool')).toHaveClass(/pixel-primary-btn/);
  await page.getByRole('button', { name: /Teaching Board$/ }).click();
  const board = page.getByRole('dialog', { name: 'PixiBun Teaching Animation Board' }); await expect(board).toBeVisible();
  await page.keyboard.press('Control+z'); await page.keyboard.press('b');
  expect(await pixels(page)).toEqual(traced); await expect(page.getByTestId('eraser-tool')).toHaveClass(/pixel-primary-btn/);
  await page.keyboard.press('Escape'); await expect(board).not.toBeVisible();
  await page.locator('#main-content').focus(); await page.keyboard.press('Control+z');
  await expect.poll(() => pixels(page)).not.toEqual(traced);
  await page.keyboard.press('Control+Shift+z'); await expect.poll(() => pixels(page)).toEqual(traced);
  await page.getByRole('button', { name: 'Return to drawing', exact: true }).click();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await expect.poll(() => pixels(page)).toEqual(original);
});

test('tablet touch drawing uses the artwork policy and survives save/reload', async ({ browser, browserName }, testInfo) => {
  test.skip(browserName === 'firefox', 'Playwright Firefox does not support mobile/touch context emulation. Desktop input coverage runs separately.');
  const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, hasTouch: true, isMobile: true, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await ready(page); const blank = await pixels(page); const canvas = page.getByTestId('main-composite-canvas');
    const box = (await canvas.boundingBox())!;
    expect(await page.locator('#main-content').evaluate(element => getComputedStyle(element).touchAction)).toBe('none');
    expect(await page.locator('header').first().evaluate(element => getComputedStyle(element).touchAction)).toBe('auto');
    await page.locator('#main-content').evaluate(element => {
      element.setAttribute('data-test-touch-cancels', '0');
      element.addEventListener('pointercancel', event => {
        if ((event as PointerEvent).pointerType === 'touch') element.setAttribute('data-test-touch-cancels', String(Number(element.getAttribute('data-test-touch-cancels')) + 1));
      });
    });
    if (browserName === 'chromium') {
      const session = await context.newCDPSession(page);
      const first = { id: 1, x: box.x + box.width * 0.3, y: box.y + box.height * 0.4 };
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
      first.x += box.width * 0.05;
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first] });
      const primaryOnly = await pixels(page);
      const second = { id: 2, x: box.x + box.width * 0.75, y: box.y + box.height * 0.7 };
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, second] });
      second.x += box.width * 0.05;
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first, second] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [first] });
      expect(await pixels(page)).toEqual(primaryOnly);
      first.x += box.width * 0.2;
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await session.detach();
    } else {
      // WebKit exposes native taps here; drag/multi-touch are Chromium-only checks.
      await page.touchscreen.tap(box.x + box.width * 0.4, box.y + box.height * 0.4);
    }
    const artwork = await pixels(page); expect(artwork).not.toEqual(blank);
    await expect(page.locator('#main-content')).toHaveAttribute('data-test-touch-cancels', '0');
    await page.getByTestId('undo-button').tap(); await expect.poll(() => pixels(page)).toEqual(blank);
    await page.getByTestId('redo-button').tap(); await expect.poll(() => pixels(page)).toEqual(artwork);
    await page.getByTestId('save-button').tap();
    await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toHaveText('Changes saved');
    await page.reload(); await expect.poll(() => pixels(page)).toEqual(artwork);
    await page.screenshot({ path: testInfo.outputPath('tablet-artwork-reloaded.png') });
  } finally { await context.close(); }
});
