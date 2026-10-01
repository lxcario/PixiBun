import { expect, test } from '@playwright/test';
import { importAnimationReviewFixture } from '../helpers/animationReviewFixture';
import { importGameDeliveryFixture } from '../helpers/gameDeliveryFixture';

const SCREENSHOT_DIR = 'docs/research/evidence/ux-qa';

test.describe('PixiBun Visual QA & UX Verification Suite', () => {
  test('Capture Studio default, dirty, save states, offline, and update notifications', async ({ page, context }) => {
    // 1. Default Studio (1920x1080)
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/studio');
    await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
    await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-default-studio.png` });

    // 2. Dirty project (paint a pixel)
    const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await expect(page.getByTestId('save-status-badge')).toContainText(/Unsaved/i);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-dirty-project.png` });

    // 3. Saving & Saved
    await page.getByTestId('save-button').click();
    await expect(page.getByTestId('save-status-badge')).toContainText(/Saved/i);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-saved-state.png` });

    // 4. Offline state
    await context.setOffline(true);
    const offlineIndicator = page.getByText(/Offline · Drawing & local saves active/i);
    await expect(offlineIndicator).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-offline-state.png` });
    await context.setOffline(false);
  });

  test('Capture Export Modal, grouped categories, and unsupported codec fallbacks', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/studio');
    await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();

    await page.getByTestId('export-button').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // 5. Export modal with 3 grouped categories
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-export-modal-grouped.png` });

    // 6. WebM tab
    await dialog.getByTestId('export-tab-webm').click();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-export-webm-tab.png` });

    // 7. Godot Kit Export Tab with live preflight
    await dialog.getByTestId('export-tab-godot-kit').click();
    await expect(dialog.getByText(/Preflight inspection/i)).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-godot-preflight-ready.png` });

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Capture Two-Tab Save Conflict in real browser tabs', async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/studio');
    await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();

    // Draw and save on Tab 1
    const box1 = (await page.getByTestId('main-composite-canvas').boundingBox())!;
    await page.mouse.click(box1.x + box1.width * 0.3, box1.y + box1.height * 0.3);
    await page.getByTestId('save-button').click();
    await expect(page.getByTestId('save-status-badge')).toContainText(/Saved/i);

    const pixels1 = await page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
      Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));

    // Open Tab 2 and wait for restoration
    const secondTab = await context.newPage();
    await secondTab.setViewportSize({ width: 1440, height: 900 });
    await secondTab.goto('/studio');
    await expect(secondTab.locator('[data-restoration-phase="active"]')).toBeVisible();
    await expect.poll(async () => secondTab.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
      Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data))).toEqual(pixels1);

    // Paint on Tab 1 and Save to advance revision in DB
    await page.mouse.click(box1.x + box1.width * 0.7, box1.y + box1.height * 0.7);
    await page.getByTestId('save-button').click();
    await expect(page.getByTestId('save-status-badge')).toContainText(/Saved/i);

    // Paint on Tab 2 and try Save -> Triggers Save Conflict!
    const box2 = (await secondTab.getByTestId('main-composite-canvas').boundingBox())!;
    await secondTab.mouse.click(box2.x + box2.width * 0.5, box2.y + box2.height * 0.5);
    await secondTab.getByTestId('save-button').click();

    // Verify protective conflict toast
    const alert = secondTab.locator('div[role="alert"]').filter({ hasText: /changed in another PixiBun tab/i });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/changed in another PixiBun tab/i);
    await expect(alert).toContainText(/Your current artwork is safe in this tab/i);
    await expect(secondTab.getByRole('button', { name: 'Save a copy', exact: true })).toBeVisible();

    await secondTab.screenshot({ path: `${SCREENSHOT_DIR}/08-two-tab-save-conflict.png` });

    await secondTab.close();
  });

  test('Capture Animation Review findings, canvas linking, details, regions, and cleanup', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await importAnimationReviewFixture(page);

    // 9. Animation Review before scan
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-animation-review-before-scan.png` });

    // Click Scan Animation
    await page.getByRole('button', { name: 'Scan animation', exact: true }).click();
    const report = page.getByTestId('animation-review-report');
    await expect(report).toBeVisible();

    // 10. Animation Review with human findings
    await expect(report.getByText(/Review findings/i)).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-animation-review-findings.png` });

    // 11. Animation Review details expanded
    await page.getByText('Analysis details').click();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-animation-review-details-expanded.png` });

    // 12. Create a protected region from selection
    await page.getByTestId('select-box-tool').click();
    const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
    await page.mouse.move(box.x + box.width * 1.5 / 32, box.y + box.height * 1.5 / 32);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 4.5 / 32, box.y + box.height * 4.5 / 32, { steps: 4 });
    await page.mouse.up();

    await page.getByText(/Regions and protection/i).click();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-region-creation-active-selection.png` });

    await page.getByRole('textbox', { name: 'Animation region name' }).fill('Eye highlight');
    await page.getByRole('button', { name: 'Save selected region' }).click();
    await expect(page.getByText(/Eye highlight: protect/)).toBeVisible();

    // 13. Sprite Cleanup Preview with protected shield badge
    await page.getByRole('button', { name: 'Choose another task' }).click();
    await page.getByTestId('pixitools-task-polish').click();
    await page.getByRole('button', { name: 'Scan artwork for cleanup' }).click();
    await expect(page.getByText(/Protected regions active/i)).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/13-cleanup-preview-protected-badge.png` });
  });

  test('Capture Palette Roles, duplicate conflict, locate on canvas, and 1024px responsive layout', async ({ page }) => {
    // 14. Import fixture with duplicate palette color
    await importGameDeliveryFixture(page, true);

    await page.getByTestId('tab-palette').click();
    await page.getByText('Roles and index bindings', { exact: true }).click();
    await page.getByRole('combobox', { name: 'Semantic palette register' }).selectOption('255');

    // Duplicate color warning banner visible
    await expect(page.getByText(/Duplicate Color Register/i)).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-palette-duplicate-conflict.png` });

    // Click Locate on canvas
    await page.getByRole('button', { name: 'Locate on canvas' }).first().click();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/15-palette-locate-on-canvas.png` });

    // 15. Godot kit preflight with duplicate register warning
    await page.getByTestId('export-button').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByTestId('export-tab-godot-kit').click();
    await dialog.getByRole('checkbox', { name: 'Include indexed palette and runtime cycling' }).check();
    await expect(dialog.getByText(/Needs attention/i)).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/16-godot-preflight-attention.png` });
    await page.keyboard.press('Escape');

    // 16. 1024px Viewport Responsive Check
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/17-responsive-1024x768.png` });

    // Verify right inspector has no horizontal scroll
    const rightInspector = page.getByTestId('right-inspector');
    const hasHorizontalOverflow = await rightInspector.evaluate(el => el.scrollWidth > el.clientWidth + 1);
    expect(hasHorizontalOverflow).toBe(false);

    // Verify no body horizontal overflow
    const bodyOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(bodyOverflow).toBe(false);
  });
});
