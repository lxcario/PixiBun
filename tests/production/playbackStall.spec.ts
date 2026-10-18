import { expect, test } from '@playwright/test';

// M3: after a long gap between animation frames, playback used to consume poses unseen.
// Four frames, each with one red pixel at x = 0..3, so the shown pose is readable from the canvas.
const REPLAY = '1_4x4_ff0000_p0.0.0~F~p0.1.0~F~p0.2.0~F~p0.3.0';

test('playback shows every pose in order through a main-thread stall', async ({ page }) => {
  await page.goto(`/studio?replay=${REPLAY}`);
  await expect(page.getByTestId('replay-status')).toHaveAttribute('data-state', 'applied');
  await page.getByRole('button', { name: /^Select frame 1\./ }).click();

  // Record each pose change as the page paints it, on every animation frame.
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="main-composite-canvas"]')!;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    const seen: number[] = [];
    const sample = () => {
      const row = context.getImageData(0, 0, 4, 1).data;
      const pose = [0, 1, 2, 3].find(x => row[x * 4 + 3] > 0) ?? -1;
      if (pose !== seen[seen.length - 1]) seen.push(pose);
      requestAnimationFrame(sample);
    };
    Object.assign(window, { __poses: seen });
    requestAnimationFrame(sample);
  });

  const play = page.getByTestId('bottom-timeline').locator('[data-tutorial="play-button"]');
  await play.click();
  await expect(play).toHaveText('Pause');
  await page.waitForTimeout(700);
  // A 300 ms busy main thread: the next animation frame arrives after several poses' holds.
  await page.evaluate(() => { const end = performance.now() + 300; while (performance.now() < end) { /* stall */ } });
  await page.waitForTimeout(1500);
  await play.click();

  const poses = await page.evaluate(() => (window as unknown as { __poses: number[] }).__poses);
  const shown = poses.filter(pose => pose >= 0);
  expect(shown.length).toBeGreaterThanOrEqual(8);
  for (let i = 1; i < shown.length; i++) expect(shown[i], `poses shown: ${shown.join(',')}`).toBe((shown[i - 1] + 1) % 4);
});
