import { expect, test } from '@playwright/test';

// Automated browsers only get the journey when asked (?welcome=1).

test('the welcome journey sets skill, look and a first drawing, and does not return after reload', async ({ page }) => {
  await page.goto('/studio?welcome=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('welcome-step-hello')).toBeVisible();
  await page.getByRole('button', { name: 'Set up my Desk →' }).click();

  await page.getByTestId('skill-option-new').click();
  await expect(page.getByTestId('skill-option-new')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('welcome-next').click();

  await page.getByTestId('welcome-theme-tidepool').click();
  await page.getByTestId('welcome-scheme-toggle').click();
  await expect.poll(() => page.evaluate(() => [document.documentElement.dataset.studioTheme, document.documentElement.dataset.colorScheme])).toEqual(['tidepool', 'light']);
  await page.getByTestId('welcome-next').click();

  await expect(page.getByTestId('welcome-step-tour')).toBeVisible();
  await page.getByTestId('welcome-next').click();

  await page.locator('[data-restoration-phase="active"]').waitFor();
  await page.getByTestId('welcome-start-blank-16').click();
  await expect(page.getByTestId('welcome-journey')).toHaveCount(0);
  await expect.poll(() => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => [canvas.width, canvas.height])).toEqual([16, 16]);
  expect(new URL(page.url()).searchParams.has('welcome')).toBe(false);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-restoration-phase="active"]').waitFor();
  await expect(page.getByTestId('welcome-journey')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => [document.documentElement.dataset.studioTheme, document.documentElement.dataset.colorScheme])).toEqual(['tidepool', 'light']);
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('pixibun-preferences')))!)).toMatchObject({ experience: 'new', tipsEnabled: true });
});

for (const [keymap, panKey] of [['standard', 'Space'], ['classic', 'Alt']] as const) {
test(`a newcomer gets the ${keymap} pan tip beside the canvas and can turn tips off`, async ({ page }) => {
  await page.addInitScript(keymap => localStorage.setItem('pixibun-preferences', JSON.stringify({ experience: 'new', onboardedAt: 1, seenTips: [], tipsEnabled: true, keymap })), keymap);
  await page.goto('/studio', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-restoration-phase="active"]').waitFor();
  const canvas = page.getByTestId('main-composite-canvas');
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4);
  const tip = page.getByTestId('coach-tip-first-edit');
  await expect(tip).toBeVisible();
  await expect(tip).toContainText(`hold ${panKey} and drag`);
  await expect(page.getByRole('application', { name: /^Pixel art drawing canvas/ })).toHaveAttribute('aria-label', new RegExp(`${panKey}\\+drag to pan`));
  // The tip never covers the canvas it is talking about.
  const tipBox = (await tip.boundingBox())!;
  const overlaps = tipBox.x < box.x + box.width && tipBox.x + tipBox.width > box.x && tipBox.y < box.y + box.height && tipBox.y + tipBox.height > box.y;
  expect(overlaps).toBe(false);
  await tip.getByRole('button', { name: 'Turn off tips' }).click();
  await expect(tip).toHaveCount(0);
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('pixibun-preferences')))!)).toMatchObject({ tipsEnabled: false, seenTips: ['first-edit'] });
});
}

test('the Studio menu replays the welcome journey', async ({ page }) => {
  await page.goto('/studio', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-restoration-phase="active"]').waitFor();
  await expect(page.getByTestId('welcome-journey')).toHaveCount(0);
  await page.getByRole('button', { name: 'Studio options', exact: true }).click();
  await page.getByTestId('replay-welcome').click();
  await expect(page.getByTestId('welcome-step-hello')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('welcome-journey')).toHaveCount(0);
});
