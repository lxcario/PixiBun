import type { Page } from '@playwright/test';

export async function openMotionCapture(page: Page) {
  await page.getByTestId('tab-tools').click();
  const section = page.getByTestId('animate-artwork');
  if (!(await section.evaluate(element => (element as HTMLDetailsElement).open))) {
    await section.locator('summary').click();
  }
}
