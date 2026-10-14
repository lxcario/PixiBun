import type { Page } from '@playwright/test';

/**
 * Choose a tool from the left shelf. On shorter windows the shelf folds tool
 * groups into slots; a tool that is not the one its slot shows is picked from
 * the slot's flyout, as a person would.
 */
export async function chooseTool(page: Page, id: string): Promise<void> {
  const shelf = page.locator('[data-shelf]');
  const direct = shelf.getByTestId(`${id}-tool`);
  if (await direct.isVisible()) {
    await direct.click();
    return;
  }
  await shelf.locator(`[data-tools~="${id}"] button[aria-haspopup]`).click({ button: 'right' });
  await page.getByRole('menu').getByTestId(`${id}-tool`).click();
}
