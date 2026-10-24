import { expect, test, type Page } from '@playwright/test';

// An asymmetric red L, drawn by a replay link: a 2×10 bar at x 8–9, y 3–12 and a
// 4×2 foot at x 10–13, y 11–12. Its bounding box is x 8–13, y 3–12.
const L = '1_16x16_e83a5c_R0.8.3.9.12~R0.10.11.13.12';
// Expected composites, each drawn directly by its own replay link rather than
// derived from the transform code under test.
const ORIGINAL = '17d70505';
const FLIPPED_H = 'bb308505'; // 1_16x16_e83a5c_R0.12.3.13.12~R0.8.11.11.12
const FLIPPED_V = 'fa2f0505'; // 1_16x16_e83a5c_R0.8.3.9.12~R0.10.3.13.4

async function openL(page: Page) {
  await page.goto(`/studio?replay=${L}`);
  await expect(page.getByTestId('replay-status')).toHaveAttribute('data-state', 'applied', { timeout: 15_000 });
  const skip = page.getByRole('button', { name: 'Skip setup' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await expectDigest(page, ORIGINAL);
}

async function expectDigest(page: Page, digest: string) {
  await expect(page.getByTestId('canvas-readout')).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('canvas-readout-digest')).toHaveText(digest);
  await expect(page.getByTestId('canvas-readout-pixels')).toHaveText('28');
}

/** Magic Wand at the canvas centre (8,8) selects the whole connected L. */
async function selectL(page: Page) {
  await page.keyboard.press('w');
  await page.getByLabel('Pixel art canvas workspace').click();
}

const commit = (page: Page) => page.locator('[title="Commit Transform (Enter)"]').click();
const undo = (page: Page) => page.getByTestId('undo-button').click();
const redo = (page: Page) => page.getByRole('button', { name: 'Redo last action' }).click();

test.describe('a lifted selection keeps the artwork safe', () => {
  test('H flips on the first press; Commit keeps it; Undo and Redo move exactly between the two', async ({ page }) => {
    await openL(page);
    await selectL(page);
    await page.keyboard.press('h');
    await commit(page);
    await expectDigest(page, FLIPPED_H);
    await undo(page);
    await expectDigest(page, ORIGINAL);
    await redo(page);
    await expectDigest(page, FLIPPED_H);
  });

  test('V flips vertically and Undo returns the original', async ({ page }) => {
    await openL(page);
    await selectL(page);
    await page.keyboard.press('v');
    await commit(page);
    await expectDigest(page, FLIPPED_V);
    await undo(page);
    await expectDigest(page, ORIGINAL);
  });

  test('Escape after a key flip puts every pixel back, with nothing new to undo', async ({ page }) => {
    await openL(page);
    await selectL(page);
    await page.keyboard.press('h');
    await page.keyboard.press('Escape');
    await expectDigest(page, ORIGINAL);
    // The only Undo steps left are the replay's own: the first removes the foot.
    await undo(page);
    await expect(page.getByTestId('canvas-readout-pixels')).toHaveText('20');
  });

  test('Escape still cancels while focus is on a transform HUD button', async ({ page }) => {
    await openL(page);
    await selectL(page);
    await page.locator('[title="Flip Horizontal (H)"]').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('[title="Commit Transform (Enter)"]')).toHaveCount(0);
    await expectDigest(page, ORIGINAL);
  });

  test('Ctrl+D commits a flip, and Undo returns the original rather than a hole', async ({ page }) => {
    await openL(page);
    await selectL(page);
    await page.locator('[title="Flip Horizontal (H)"]').click();
    await page.keyboard.press('Control+d');
    await expectDigest(page, FLIPPED_H);
    await undo(page);
    await expectDigest(page, ORIGINAL);
  });
});
