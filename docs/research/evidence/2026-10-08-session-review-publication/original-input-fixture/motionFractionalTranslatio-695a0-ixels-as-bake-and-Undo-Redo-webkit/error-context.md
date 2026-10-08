# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: motionFractionalTranslation.spec.ts >> fractional translation 4.3 previews the same sampled pixels as bake and Undo/Redo
- Location: tests\production\motionFractionalTranslation.spec.ts:14:7

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByRole('spinbutton', { name: 'Position X pixels', exact: true })
Expected: "4.3"
Received: "4"
Timeout:  10000ms

Call log:
  - Expect "toHaveValue" with timeout 10000ms
  - waiting for getByRole('spinbutton', { name: 'Position X pixels', exact: true })
    21 × locator resolved to <input step="1" value="4" max="8192" min="-8192" type="number" id="studio-number-_r_1_" class="w-[40px] h-full bg-transparent border-none text-center font-mono text-[10px] font-bold text-[var(--text-heading)] focus:outline-none focus:ring-0 p-0 m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield] "/>
       - unexpected value "4"

```

```yaml
- spinbutton "Position X pixels": "4"
```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test';
  2  | 
  3  | const digest = (page: Page, testId: string) => page.getByTestId(testId).evaluate(async (canvas: HTMLCanvasElement) => {
  4  |   const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  5  |   return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', pixels)))
  6  |     .map(value => value.toString(16).padStart(2, '0')).join('');
  7  | });
  8  | async function number(page: Page, label: string, value: string) {
  9  |   const field = page.getByRole('spinbutton', { name: label, exact: true });
> 10 |   await field.fill(value); await field.press('Enter'); await expect(field).toHaveValue(value);
     |                                                                            ^ Error: expect(locator).toHaveValue(expected) failed
  11 | }
  12 | 
  13 | for (const translation of ['4.3', '-1.5']) {
  14 |   test(`fractional translation ${translation} previews the same sampled pixels as bake and Undo/Redo`, async ({ page }) => {
  15 |     await page.setViewportSize({ width: 1600, height: 1100 });
  16 |     await page.goto('/studio?template=hearth-ghost');
  17 |     await expect.poll(() => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => c.width)).toBe(16);
  18 |     await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  19 |     const original = await digest(page, 'main-composite-canvas');
  20 |     await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click();
  21 |     await number(page, 'Rotation degrees', '33.3'); await number(page, 'Pivot X pixels', '8.3');
  22 |     await number(page, 'Position X pixels', translation); await number(page, 'Motion frames', '3');
  23 |     await expect(page.getByTestId('piximotion-preview-canvas')).toHaveAttribute('aria-busy', 'false');
  24 |     const preview = await digest(page, 'piximotion-preview-canvas');
  25 |     expect(preview).not.toBe(original);
  26 |     await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
  27 |     await expect(page.getByTestId('piximotion-panel')).toBeHidden();
  28 |     await expect.poll(() => digest(page, 'main-composite-canvas')).toBe(preview);
  29 |     await page.getByTestId('undo-button').click(); await expect.poll(() => digest(page, 'main-composite-canvas')).toBe(original);
  30 |     await page.getByTestId('redo-button').click(); await page.getByRole('button', { name: /Select frame 3\./ }).click();
  31 |     await expect.poll(() => digest(page, 'main-composite-canvas')).toBe(preview);
  32 |   });
  33 | }
  34 | 
```