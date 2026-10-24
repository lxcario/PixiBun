import { expect, test } from '@playwright/test';

// 23 October: clicking Create palette again just after saving one revived the closing
// dialog, which was then removed while the panel still counted it as open, so the button
// did nothing until the panel remounted. The race needs production timing; a development
// build did not reproduce it.

test('Create palette opens again right after a save, with a fresh draft', async ({ page }) => {
  await page.goto('/studio', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const skip = page.getByRole('button', { name: 'Skip setup' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await page.getByRole('button', { name: 'Palette', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Create palette' });
  for (let round = 0; round < 4; round++) {
    await page.getByRole('button', { name: 'Create palette', exact: true }).first().click();
    await dialog.getByLabel('Palette name').fill(`Reopen ${round}`);
    // Save, then click the panel's Create palette one task later, while the saved dialog starts to close.
    await page.evaluate(async () => {
      const save = [...document.querySelectorAll<HTMLButtonElement>('dialog[open] button')].find(button => button.textContent?.trim() === 'Create palette')!;
      const opener = [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim().endsWith('Create palette') && !button.closest('dialog'))!;
      save.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      opener.click();
    });
    await expect(dialog.getByLabel('Palette name')).toHaveValue('My palette');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toBeHidden();
  }
  const names = await page.getByLabel('Color palette preset', { exact: true }).evaluate((select: HTMLSelectElement) => [...select.options].map(option => option.text));
  for (let round = 0; round < 4; round++) expect(names.some(name => name.startsWith(`Reopen ${round}`))).toBe(true);
});
