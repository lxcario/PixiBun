import { expect, test } from '@playwright/test';

test('drawing tools show a short visual preview on hover and keyboard focus', async ({ page }, testInfo) => {
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.evaluate(() => localStorage.removeItem('pixibun:tool-previews-disabled'));
  const pen = page.getByTestId('pen-tool');
  await page.mouse.move(400, 200);
  await pen.hover();
  const preview = page.getByRole('group', { name: 'Pen preview' });
  await expect(preview).toHaveCount(0);
  await expect(preview).toBeVisible();
  await expect(preview.getByText('Draw crisp, pixel-perfect strokes and contours.')).toBeVisible();
  await expect(preview.locator('canvas')).toBeVisible();
  await expect(preview).toHaveCSS('width', '304px');
  await expect(preview.locator('p')).toHaveCSS('font-size', '13px');
  await page.waitForTimeout(600);
  await preview.screenshot({ path: testInfo.outputPath('pen-preview.png') });
  await page.keyboard.press('Escape');
  await expect(preview).toHaveCount(0);

  await pen.focus();
  await expect(preview).toBeVisible();
  await preview.getByRole('button', { name: 'Close tool preview' }).click();
  await expect(preview).toHaveCount(0);

  const eraser = page.getByTestId('eraser-tool');
  await eraser.hover();
  await page.mouse.move(400, 200);
  await page.waitForTimeout(400);
  await expect(page.getByRole('group', { name: 'Eraser preview' })).toHaveCount(0);

  await page.getByTestId('line-tool').hover();
  await expect(page.getByRole('group', { name: 'Line preview' })).toBeVisible();

  // Capture Eraser preview screenshot
  await page.getByTestId('eraser-tool').hover();
  const eraserPreview = page.getByRole('group', { name: 'Eraser preview' });
  await expect(eraserPreview).toBeVisible();
  await page.waitForTimeout(600);
  await eraserPreview.screenshot({ path: testInfo.outputPath('eraser-preview.png') });

  // Capture Dither preview screenshot
  await page.getByTestId('dither-tool').hover();
  const ditherPreview = page.getByRole('group', { name: 'Dither Brush preview' });
  await expect(ditherPreview).toBeVisible();
  await page.waitForTimeout(600);
  await ditherPreview.screenshot({ path: testInfo.outputPath('dither-preview.png') });

  // Capture Normal Chisel preview screenshot
  await page.getByTestId('normal-chisel-tool').hover();
  const chiselPreview = page.getByRole('group', { name: 'Normal Chisel preview' });
  await expect(chiselPreview).toBeVisible();
  await page.waitForTimeout(1200);
  await chiselPreview.screenshot({ path: testInfo.outputPath('chisel-preview.png') });

  // Capture Bucket preview screenshot
  await page.getByTestId('bucket-tool').hover();
  const bucketPreview = page.getByRole('group', { name: 'Flood Fill preview' });
  await expect(bucketPreview).toBeVisible();
  await page.waitForTimeout(1000);
  await bucketPreview.screenshot({ path: testInfo.outputPath('bucket-preview.png') });

  // Capture Curve preview screenshot
  await page.getByTestId('curve-tool').hover();
  const curvePreview = page.getByRole('group', { name: 'Bézier Curve preview' });
  await expect(curvePreview).toBeVisible();
  await page.waitForTimeout(1000);
  await curvePreview.screenshot({ path: testInfo.outputPath('curve-preview.png') });

  // Capture Color Replace preview screenshot
  await page.getByTestId('color-replace-tool').hover();
  const recolorPreview = page.getByRole('group', { name: 'Color Replace preview' });
  await expect(recolorPreview).toBeVisible();
  await page.waitForTimeout(1200);
  await recolorPreview.screenshot({ path: testInfo.outputPath('recolor-preview.png') });

  // Capture Ellipse preview screenshot
  await page.getByTestId('ellipse-tool').hover();
  const ellipsePreview = page.getByRole('group', { name: 'Ellipse preview' });
  await expect(ellipsePreview).toBeVisible();
  await page.waitForTimeout(1000);
  await ellipsePreview.screenshot({ path: testInfo.outputPath('ellipse-preview.png') });

  // Capture 2:1 Iso Line preview screenshot
  await page.getByTestId('isometric-line-tool').hover();
  const isoPreview = page.getByRole('group', { name: '2:1 Iso Line preview' });
  await expect(isoPreview).toBeVisible();
  await page.waitForTimeout(1000);
  await isoPreview.screenshot({ path: testInfo.outputPath('iso-preview.png') });

  // Freeform and connected-color selections must have their own demonstrations.
  await page.getByTestId('select-lasso-tool').hover();
  const lassoPreview = page.getByRole('group', { name: 'Lasso Select preview' });
  await expect(lassoPreview.locator('canvas[data-scene="select-lasso"]')).toBeVisible();
  await expect(lassoPreview.locator('[data-step-label]')).toHaveAttribute('data-step-label', /TRACE ARTWORK|FREEFORM SELECTED/);
  await expect(lassoPreview.locator('canvas')).toHaveAttribute('data-preview-phase', 'result', { timeout: 3000 });
  await lassoPreview.screenshot({ path: testInfo.outputPath('lasso-preview.png') });

  await page.getByTestId('select-wand-tool').hover();
  const wandPreview = page.getByRole('group', { name: 'Magic Wand preview' });
  await expect(wandPreview.locator('canvas[data-scene="select-wand"]')).toBeVisible();
  await expect(wandPreview.locator('canvas')).toHaveAttribute('data-preview-phase', 'result', { timeout: 3000 });
  await wandPreview.screenshot({ path: testInfo.outputPath('wand-preview.png') });
});

test('PixiTools actions preview their effect without changing the project', async ({ page }, testInfo) => {
  await page.goto('/studio');
  await page.evaluate(() => localStorage.removeItem('pixibun:tool-previews-disabled'));
  await page.getByTestId('tab-ai').click();
  await page.getByTestId('pixitools-browse-all').click();
  const lighting = page.getByRole('button', { name: '3D Lighting & Shading (2.5D Photometric Studio)' });
  await expect(lighting).toBeVisible();
  await lighting.hover();
  await page.waitForTimeout(400);
  await expect(page.getByRole('group', { name: /preview/ })).toHaveCount(0);
  await page.getByText('More lighting actions').click();
  const viewNormals = page.getByRole('button', { name: /View Normals/ });
  await viewNormals.hover();
  const preview = page.getByRole('group', { name: 'Normal Map preview' });
  await expect(preview).toBeVisible();
  await expect(preview.getByText('See the surface directions used for lighting.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(preview).toHaveCount(0);

  await page.getByTestId('analyze-light-bulb').hover();
  const lightPreview = page.getByRole('group', { name: 'Lighting preview' });
  await expect(lightPreview).toBeVisible();
  await lightPreview.screenshot({ path: testInfo.outputPath('lighting-preview.png') });
  await page.waitForTimeout(1000);
  await lightPreview.screenshot({ path: testInfo.outputPath('lighting-preview-result.png') });

  // Hover Sel-Out button and verify dedicated preview
  const selOut = page.getByRole('button', { name: 'Sel-Out' });
  await selOut.hover();
  const selOutPreview = page.getByRole('group', { name: 'Selective Outline preview' });
  await expect(selOutPreview).toBeVisible();
  await page.waitForTimeout(1200);
  await selOutPreview.screenshot({ path: testInfo.outputPath('selout-preview.png') });

  // Hover Specular Glint button and verify dedicated HUD Heart preview
  const specular = page.getByRole('button', { name: 'Specular Glint' });
  await specular.hover();
  const specularPreview = page.getByRole('group', { name: 'Specular Glint preview' });
  await expect(specularPreview).toBeVisible();
  await page.waitForTimeout(1000);
  await specularPreview.screenshot({ path: testInfo.outputPath('specular-preview.png') });

  // Open Cast & Ground Shadows section and hover Add Floor Shadow to verify dedicated HUD Heart preview
  const shadowHeader = page.getByRole('button', { name: /Cast & Ground Shadows/i });
  await shadowHeader.click();
  const floorShadow = page.getByRole('button', { name: /Analyze & Cast Shadow/i });
  await floorShadow.hover();
  const shadowPreview = page.getByRole('group', { name: 'Ground Shadow preview' });
  await expect(shadowPreview).toBeVisible();
  await page.waitForTimeout(1000);
  await shadowPreview.screenshot({ path: testInfo.outputPath('shadow-preview.png') });

  // Verify distinct previews for Smooth Jaggies, Thin to 1px, and Erase Stray Pixels
  const smoothJaggies = page.getByRole('button', { name: /Smooth Jaggies/i });
  await smoothJaggies.hover();
  const jaggiesPreview = page.getByRole('group', { name: 'Smooth Jaggies preview' });
  await expect(jaggiesPreview).toBeVisible();
  await expect(jaggiesPreview.getByText('Eliminate unsightly single-pixel L-corner stair-stepping along strokes.')).toBeVisible();
  await jaggiesPreview.screenshot({ path: testInfo.outputPath('jaggies-preview.png') });

  const thin1px = page.getByRole('button', { name: /Thin to 1px/i });
  await thin1px.hover();
  const thinPreview = page.getByRole('group', { name: 'Thin to 1px preview' });
  await expect(thinPreview).toBeVisible();
  await expect(thinPreview.getByText('Trim thick pixel strokes down to crisp, razor-sharp 1px lines.')).toBeVisible();
  await thinPreview.screenshot({ path: testInfo.outputPath('thin-preview.png') });

  const eraseStrays = page.getByRole('button', { name: /Erase Stray Pixels/i });
  await eraseStrays.hover();
  const straysPreview = page.getByRole('group', { name: 'Erase Stray Pixels preview' });
  await expect(straysPreview).toBeVisible();
  await expect(straysPreview.getByText('Find and erase isolated single-pixel dots with no touching neighbors.')).toBeVisible();
  await straysPreview.screenshot({ path: testInfo.outputPath('strays-preview.png') });

  // Verify Scan Artwork preview
  const scanArtwork = page.getByRole('button', { name: /Scan artwork/i });
  await scanArtwork.hover();
  const scanPreview = page.getByRole('group', { name: 'Scan Artwork preview' });
  await expect(scanPreview).toBeVisible();
  await expect(scanPreview.getByText(/Scan the selected layer for faint pixels/i)).toBeVisible();
  await page.waitForTimeout(600);
  await scanPreview.screenshot({ path: testInfo.outputPath('scan-preview.png') });

  // Verify Apply Cleanup preview (even when temporarily disabled)
  const applyCleanup = page.getByRole('button', { name: /Apply analyzed artwork cleanup/i });
  await applyCleanup.hover();
  const applyPreview = page.getByRole('group', { name: 'Apply Cleanup preview' });
  await expect(applyPreview).toBeVisible();
  await expect(applyPreview.getByText(/Batch-fix detected noise, harden semi-transparent edges/i)).toBeVisible();
  await page.waitForTimeout(600);
  await applyPreview.screenshot({ path: testInfo.outputPath('apply-preview.png') });

  // Verify RotSprite Clean Rotation preview
  const rotateCleanly = page.getByRole('button', { name: /Rotate Cleanly/i });
  await rotateCleanly.hover();
  const rotatePreview = page.getByRole('group', { name: 'RotSprite Clean Rotation preview' });
  await expect(rotatePreview).toBeVisible();
  await expect(rotatePreview.getByText(/Rotate pixel art at arbitrary angles without blurry bilinear smoothing/i)).toBeVisible();
  await page.waitForTimeout(600);
  await rotatePreview.screenshot({ path: testInfo.outputPath('rotate-preview.png') });
});

test('user can dismiss preview permanently via "Don\'t show again"', async ({ page }) => {
  await page.goto('/studio');
  await page.evaluate(() => localStorage.removeItem('pixibun:tool-previews-disabled'));

  const pen = page.getByTestId('pen-tool');
  await pen.hover();
  const preview = page.getByRole('group', { name: 'Pen preview' });
  await expect(preview).toBeVisible();

  // Click "Don't show again"
  const dontShowBtn = preview.getByRole('button', { name: "Don't show again" });
  await expect(dontShowBtn).toBeVisible();
  await dontShowBtn.click();

  // Preview should be dismissed immediately
  await expect(preview).toHaveCount(0);

  // Hovering pen again should NOT show the preview
  await pen.hover();
  await page.waitForTimeout(400);
  await expect(preview).toHaveCount(0);

  // Hovering other tools should also NOT show any preview
  await page.getByTestId('eraser-tool').hover();
  await page.waitForTimeout(400);
  await expect(page.getByRole('group', { name: /preview/ })).toHaveCount(0);

  // Re-enable in localStorage
  await page.evaluate(() => {
    localStorage.removeItem('pixibun:tool-previews-disabled');
    window.dispatchEvent(new Event('pixibun:tool-previews-changed'));
  });

  // Previews work again
  await pen.hover();
  await expect(preview).toBeVisible();
});
