import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

interface Golden {
  id: string;
  replay: string;
  steps: number;
  expect: {
    size: string; frame: string; frames: number; layer: string; layers: number;
    pixels: number; colors: number; topColors: string; digest: string;
  };
  afterUndo: { pixels: number; colors: number; topColors: string; digest: string };
}

// The same values the TestSprite PRD publishes (docs/testsprite/replays.md).
const goldens = (JSON.parse(readFileSync('docs/testsprite/replays.json', 'utf8')) as { replays: Golden[] }).replays;

async function readoutRevision(page: Page) {
  return Number(await page.getByTestId('canvas-readout').getAttribute('data-revision'));
}

/** Waits for a re-read newer than `after`, then for it to match the live drawing. */
async function waitForReadout(page: Page, after: number) {
  await expect.poll(() => readoutRevision(page)).toBeGreaterThan(after);
  await expect(page.getByTestId('canvas-readout')).toHaveAttribute('data-state', 'ready');
}

for (const golden of goldens) {
  test(`replay link “${golden.id}” draws its golden pixels, and Undo/Redo step through it`, async ({ page }) => {
    await page.goto(`/studio?replay=${golden.replay}`);
    const status = page.getByTestId('replay-status');
    await expect(status).toHaveAttribute('data-state', 'applied', { timeout: 15_000 });
    await expect(status).toHaveAttribute('data-steps', String(golden.steps));
    await expect(page.getByTestId('replay-error')).toHaveCount(0);
    await expect(page.getByTestId('canvas-readout')).toHaveAttribute('data-state', 'ready');

    const { expect: values, afterUndo } = golden;
    await expect(page.getByTestId('canvas-readout-digest')).toHaveText(values.digest);
    await expect(page.getByTestId('canvas-readout-size')).toHaveText(values.size);
    await expect(page.getByTestId('canvas-readout-frame')).toHaveText(values.frame);
    await expect(page.getByTestId('canvas-readout-frames')).toHaveText(String(values.frames));
    await expect(page.getByTestId('canvas-readout-layer')).toHaveText(values.layer);
    await expect(page.getByTestId('canvas-readout-layers')).toHaveText(String(values.layers));
    await expect(page.getByTestId('canvas-readout-pixels')).toHaveText(String(values.pixels));
    await expect(page.getByTestId('canvas-readout-colors')).toHaveText(String(values.colors));
    await expect(page.getByTestId('canvas-readout-top-colors')).toHaveText(values.topColors);
    // Reload restores the saved drawing instead of replaying the link again.
    expect(new URL(page.url()).searchParams.has('replay')).toBe(false);

    const undo = page.getByTestId('undo-button');
    await expect(undo).toBeEnabled();
    let revision = await readoutRevision(page);
    await undo.click();
    await waitForReadout(page, revision);
    await expect(page.getByTestId('canvas-readout-digest')).toHaveText(afterUndo.digest);
    await expect(page.getByTestId('canvas-readout-pixels')).toHaveText(String(afterUndo.pixels));
    await expect(page.getByTestId('canvas-readout-colors')).toHaveText(String(afterUndo.colors));
    await expect(page.getByTestId('canvas-readout-top-colors')).toHaveText(afterUndo.topColors);
    await expect(page.getByTestId('canvas-readout-frame')).toHaveText(values.frame);

    revision = await readoutRevision(page);
    await page.getByTestId('redo-button').click();
    await waitForReadout(page, revision);
    await expect(page.getByTestId('canvas-readout-digest')).toHaveText(values.digest);
    await expect(page.getByTestId('canvas-readout-pixels')).toHaveText(String(values.pixels));
  });
}

test('a broken replay link explains the problem and leaves the drawing unchanged', async ({ page }) => {
  await page.goto('/studio?replay=1_16x16_ff0000_p5.1.1');
  await expect(page.getByTestId('replay-status')).toHaveAttribute('data-state', 'error');
  const alert = page.getByTestId('replay-error');
  await expect(alert).toBeVisible();
  await expect(alert).toHaveAttribute('role', 'alert');
  await expect(page.getByTestId('replay-error-message')).toHaveText('Step 1 (p5.1.1) uses color 5, but the palette only has color 0.');
  await expect(alert).toContainText('Your drawing is unchanged.');

  await expect(page.getByTestId('canvas-readout')).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('canvas-readout-size')).toHaveText('32×32');
  await expect(page.getByTestId('canvas-readout-pixels')).toHaveText('0');
  await expect(page.getByTestId('canvas-readout-digest')).toHaveText('8c00b365');
  await expect(page.getByTestId('undo-button')).toBeDisabled();

  await page.getByTestId('replay-error-dismiss').click();
  await expect(alert).toHaveCount(0);
});
