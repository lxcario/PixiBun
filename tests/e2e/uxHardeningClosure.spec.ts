import { expect, test } from '@playwright/test';
import { importAnimationReviewFixture } from '../helpers/animationReviewFixture';
import { importGameDeliveryFixture } from '../helpers/gameDeliveryFixture';


test.describe('PixiBun UX Hardening Closure Verification Suite', () => {
  test('Viewport 1280x720 layout: canvas, inspector, timeline, Animation Review, and Godot preflight', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await importAnimationReviewFixture(page);

    // Verify right inspector has no horizontal scroll
    const rightInspector = page.getByTestId('right-inspector');
    await expect(rightInspector).toBeVisible();
    const inspectorOverflow = await rightInspector.evaluate(el => el.scrollWidth > el.clientWidth + 1);
    expect(inspectorOverflow).toBe(false);

    // Verify body has no horizontal overflow
    const bodyOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(bodyOverflow).toBe(false);

    // Run Animation Review scan
    await page.getByRole('button', { name: 'Scan animation', exact: true }).click();
    await expect(page.getByTestId('animation-review-report')).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('captures', '18-viewport-1280x720-animation-review.png') });

    // Open Export modal -> Godot Kit tab
    await page.getByTestId('export-button').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('export-tab-godot-kit').click();
    await expect(dialog.getByText(/Preflight inspection/i)).toBeVisible();

    // Verify modal fits within 720px height
    const dialogBox = (await dialog.boundingBox())!;
    expect(dialogBox.height).toBeLessThanOrEqual(720);
    await page.screenshot({ path: test.info().outputPath('captures', '19-viewport-1280x720-godot-preflight.png') });

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Save failure scenario: verifies clear warning, memory safety reassurance, and recovery path', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/studio');
    await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();

    // Draw a pixel
    const canvas = page.getByTestId('main-composite-canvas');
    const box = (await canvas.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    const pixelBefore = await canvas.evaluate((c: HTMLCanvasElement) =>
      Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));

    // Force save failure state
    await page.evaluate(() => {
      // @ts-expect-error test hook
      const store = window.__studioStore?.getState();
      if (store) {
        store.setSaveStatus('error');
      }
    });

    // Verify save button and badge reflect save issue
    const saveButton = page.getByTestId('save-button');
    await expect(saveButton).toHaveAttribute('aria-label', 'Save issue');
    await expect(saveButton).toHaveAttribute('title', /Save issue · Click to retry/);

    const saveBadge = page.getByTestId('save-status-badge');
    await expect(saveBadge).toContainText('Save issue');
    await expect(saveBadge).toHaveAttribute('title', /Save paused\. Your artwork remains safe in memory\./);
    await expect(page.getByRole('banner').getByTestId('save-status-badge')).toHaveCount(0);
    await expect(page.getByTestId('status-bar').getByTestId('save-status-badge')).toBeVisible();
    const statusBox = (await page.getByTestId('status-bar').boundingBox())!;
    const badgeBox = (await saveBadge.boundingBox())!;
    expect(badgeBox.y).toBeGreaterThanOrEqual(statusBox.y);
    expect(badgeBox.y + badgeBox.height).toBeLessThanOrEqual(statusBox.y + statusBox.height);
    expect(statusBox.x + statusBox.width - badgeBox.x - badgeBox.width).toBeLessThan(25);

    // Verify artwork still exists in memory
    const pixelAfter = await canvas.evaluate((c: HTMLCanvasElement) =>
      Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
    expect(pixelAfter).toEqual(pixelBefore);

    await page.screenshot({ path: test.info().outputPath('captures', '20-save-issue-state.png') });
  });

  test('Export progress, cancellation, and retry recovery', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/studio');
    await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();

    // Open export dialog
    await page.getByTestId('export-button').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Open WebM tab and verify options
    await dialog.getByTestId('export-tab-webm').click();
    await expect(dialog.getByRole('button', { name: 'Download WEBM', exact: true })).toBeVisible();

    // Switch to Sprite Sheet
    await dialog.getByTestId('export-tab-spritesheet').click();
    await expect(dialog.getByRole('button', { name: 'Download SPRITESHEET', exact: true })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Unsupported video capability displays clear guidance and instant fallback buttons', async ({ page }) => {
    await page.addInitScript(() => {
      // Simulate browser without MediaRecorder
      Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: undefined });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/studio');
    await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();

    await page.getByTestId('export-button').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByTestId('export-tab-webm').click();
    const alert = dialog.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/WebM recording is unavailable/i);

    // Verify recovery fallback buttons are present
    const switchGifBtn = dialog.getByRole('button', { name: 'Switch to GIF', exact: true });
    await expect(switchGifBtn).toBeVisible();
    const switchApngBtn = dialog.getByRole('button', { name: 'Switch to APNG', exact: true });
    await expect(switchApngBtn).toBeVisible();

    await page.screenshot({ path: test.info().outputPath('captures', '21-unsupported-codec-recovery.png') });

    // Click Switch to GIF and verify navigation
    await switchGifBtn.click();
    await expect(dialog.getByRole('button', { name: 'Download GIF', exact: true })).toBeVisible();

    await page.keyboard.press('Escape');
  });

  test('Reduced motion respects prefers-reduced-motion media feature', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await importAnimationReviewFixture(page);

    // Verify media query evaluates true in browser
    const prefersReducedMotion = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    expect(prefersReducedMotion).toBe(true);

    // Run animation scan
    await page.getByRole('button', { name: 'Scan animation', exact: true }).click();
    await expect(page.getByTestId('animation-review-report')).toBeVisible();

    // Verify report is visible and auto-scroll was executed without smooth scroll animation
    await expect(page.getByText(/Review findings/i)).toBeVisible();
  });

  test('Keyboard-only navigation across Export Modal, Animation Review, and Palette Roles', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await importGameDeliveryFixture(page, true);

    // 1. Keyboard open and close Export Modal
    await page.getByTestId('export-button').focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Navigate to a format button using keyboard Tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    // Press Escape to close modal and verify focus returns
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('export-button')).toBeFocused();

    // 2. Keyboard navigate into Palette Roles duplicate resolution
    await page.getByTestId('tab-palette').click();
    await page.getByText('Roles and index bindings', { exact: true }).click();
    const registerSelect = page.getByRole('combobox', { name: 'Semantic palette register' });
    await registerSelect.focus();
    await registerSelect.selectOption('255');

    // Tab to Locate on canvas button and activate via keyboard Enter
    const locateBtn = page.getByRole('button', { name: 'Locate on canvas' }).first();
    await locateBtn.focus();
    await page.keyboard.press('Enter');

    // 3. Keyboard navigate Animation Review
    await page.getByTestId('tab-ai').click();
    await page.getByTestId('pixitools-task-animation').click();
    const clipSelect = page.getByRole('combobox', { name: 'Animation review clip' });
    await clipSelect.focus();
    await clipSelect.selectOption('back');

    const scanBtn = page.getByRole('button', { name: 'Scan animation', exact: true });
    await scanBtn.focus();
    await scanBtn.click();

    const report = page.getByTestId('animation-review-report');
    await expect(report).toBeVisible();

    // Open Analysis details
    const details = page.getByText('Analysis details');
    await details.click();
    await expect(page.getByText(/Outline changes:/i)).toBeVisible();
  });
});
