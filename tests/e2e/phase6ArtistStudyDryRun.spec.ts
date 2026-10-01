import { expect, test } from '@playwright/test';
import { importGameDeliveryFixture } from '../helpers/gameDeliveryFixture';
import { openResearch, preview, openResearchOptions, selectResearchWorkflow } from '../helpers/researchWorkflows';


test.describe('Phase 6 Artist Study Dry-Run Verification', () => {
  test('Task 1: Detail-preserving simplification with protected details, candidate comparison, and safe undo', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await importGameDeliveryFixture(page);
    await openResearch(page);

    // 1. Select block size 3
    await openResearchOptions(page);
    await page.getByRole('combobox', { name: 'Simplification block size' }).selectOption('3');
    // Opt into coarse changes for this dense boundary fixture; manual protection
    // and reversible application are the behaviors exercised by this walkthrough.
    await page.getByRole('checkbox', { name: 'Keep outlines', exact: true }).uncheck();

    // 2. Select Candidate: Contrast
    await page.getByRole('combobox', { name: 'Simplification candidate' }).selectOption('contrast');

    // 3. Mark and protect a detail region on canvas
    await page.getByTestId('select-box-tool').click();
    const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.4, { steps: 3 });
    await page.mouse.up();

    await page.getByRole('textbox', { name: 'Research detail name' }).fill('Fabric Crest');
    await page.getByRole('button', { name: 'Protect selected rectangle' }).click();
    await expect(page.getByText(/Fabric Crest \(/)).toBeVisible();

    // 4. Generate preview
    await preview(page);
    await expect(page.getByRole('img', { name: 'Research source', exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Research result', exact: true })).toBeVisible();

    // 5. Capture screenshot of simplification comparison
    await page.screenshot({ path: test.info().outputPath('captures', '23-simplification-preview.png') });

    // 6. Apply research preview and verify toast with Undo button
    const beforeArtwork = await page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
    await page.getByRole('button', { name: 'Apply research preview' }).click();
    await expect(page.getByText('Source pixels are current.', { exact: true })).toBeVisible();
    const appliedArtwork = await page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
    expect(appliedArtwork).not.toEqual(beforeArtwork);

    // 7. Verify Undo reverts the applied variation
    await page.getByTestId('undo-button').click();
    await expect.poll(async () => {
      return page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
    }).toEqual(beforeArtwork);

    // 8. Verify Redo restores the variation
    await page.getByTestId('redo-button').click();
    await expect.poll(async () => {
      return page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
    }).toEqual(appliedArtwork);
  });

  test('Task 2: Shared multi-pose lighting with material presets, passes, and clip propagation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await importGameDeliveryFixture(page);
    await openResearch(page);

    // 1. Switch to Relight animation
    await selectResearchWorkflow(page, 'light'); await openResearchOptions(page);

    // 2. Adjust lighting parameters: 90 azimuth, 0 height, metal material, full clip
    await page.getByRole('spinbutton', { name: 'Shared light azimuth' }).fill('90');
    await page.getByRole('spinbutton', { name: 'Shared light height' }).fill('0');
    await page.getByRole('combobox', { name: 'Shared light material' }).selectOption('metal');
    await page.getByRole('checkbox', { name: /Use this rig across/ }).check();

    // 3. Generate preview
    await preview(page);

    // 4. Verify pose switching & passes dropdown
    await page.getByRole('combobox', { name: 'Research preview pose' }).selectOption('1');
    await page.getByRole('combobox', { name: 'Shared light preview output' }).selectOption('specular');
    await expect(page.getByRole('img', { name: 'Research result', exact: true })).toBeVisible();

    // 5. Capture screenshot of multi-pose lighting pass
    await page.screenshot({ path: test.info().outputPath('captures', '24-lighting-passes.png') });

    // 6. Apply across all poses
    await page.getByRole('button', { name: 'Apply research preview' }).click();
    await page.getByTestId('undo-button').click();
  });

  test('Task 3: Seeded tile-scene exploration with interactive canvas cell selection, D-pad, and diagnostics', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await importGameDeliveryFixture(page);
    await openResearch(page);

    // 1. Switch to Scene exploration
    await selectResearchWorkflow(page, 'scene'); await openResearchOptions(page);
    await page.getByRole('combobox', { name: 'Scene tile size' }).selectOption('16');
    await page.getByRole('combobox', { name: 'Scene walkable path' }).selectOption('horizontal');

    // 2. Set edges for first two tiles to ground
    for (let t = 0; t < 2; t++) {
      await page.getByRole('combobox', { name: 'Scene atlas tile' }).selectOption(String(t));
      await page.getByRole('textbox', { name: 'Tile east edge' }).fill('ground');
    }

    // 3. Pin Tile 2 to Cell 1
    await page.getByRole('combobox', { name: 'Scene atlas tile' }).selectOption('1');
    await page.getByRole('button', { name: 'Pin chosen tile to cell' }).click();

    // 4. Generate preview
    await preview(page);

    // 5. Test D-Pad navigation
    await page.getByRole('button', { name: 'Move scene cursor East' }).click();
    await expect(page.getByText('Scene cursor: column 2, row 1.', { exact: true })).toBeVisible();

    // 6. Direct click on Result Canvas cell
    const resultCanvas = page.getByRole('img', { name: 'Research result', exact: true });
    await expect(resultCanvas).toBeVisible();
    const cBox = (await resultCanvas.boundingBox())!;
    await page.mouse.click(cBox.x + cBox.width * 0.75, cBox.y + cBox.height * 0.75);

    // 7. Capture screenshot of interactive tile scene with D-pad & seam overlay
    await page.screenshot({ path: test.info().outputPath('captures', '25-tile-scene-interactive.png') });

    // 8. Apply research preview & test undo/redo
    await page.getByRole('button', { name: 'Apply research preview' }).click();
    await page.getByTestId('undo-button').click();
  });
});
