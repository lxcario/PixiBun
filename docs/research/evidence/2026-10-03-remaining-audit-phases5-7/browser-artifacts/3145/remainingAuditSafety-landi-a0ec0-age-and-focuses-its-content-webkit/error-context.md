# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remainingAuditSafety.spec.ts >> landing skip link stays on the landing page and focuses its content
- Location: tests\production\remainingAuditSafety.spec.ts:26:5

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByRole('link', { name: 'Skip to content', exact: true })
Expected: focused
Received: inactive
Timeout:  10000ms

Call log:
  - Expect "toBeFocused" with timeout 10000ms
  - waiting for getByRole('link', { name: 'Skip to content', exact: true })
    19 × locator resolved to <a href="#top" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-[99999] px-4 py-2 bg-[var(--desk-surface)] text-[var(--accent-gold)] border-2 border-[var(--accent-gold)] font-mono text-xs rounded shadow-lg">Skip to content</a>
       - unexpected value "inactive"

```

```yaml
- link "Skip to content":
  - /url: "#top"
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import { readFile } from 'node:fs/promises';
  3   | import { inflateSync } from 'node:zlib';
  4   | 
  5   | const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  6   |   Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
  7   | async function ready(page: Page) {
  8   |   await page.goto('/studio');
  9   |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  10  | }
  11  | async function image(page: Page, width: number, height: number) {
  12  |   const base64 = await page.evaluate(({ width, height }) => {
  13  |     const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  14  |     const ctx = canvas.getContext('2d')!;
  15  |     ctx.fillStyle = '#ff0000'; ctx.fillRect(0, height - 1, 1, 1);
  16  |     ctx.fillStyle = '#0000ff'; ctx.fillRect(width - 1, height - 1, 1, 1);
  17  |     const data = canvas.toDataURL('image/png').split(',')[1]; canvas.width = 0; canvas.height = 0; return data;
  18  |   }, { width, height });
  19  |   await page.locator('input[type=file]').first().setInputFiles({ name: 'audit-sheet.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
  20  |   const dialog = page.getByRole('dialog', { name: 'Import Image' });
  21  |   await expect(dialog).toBeVisible();
  22  |   await dialog.getByRole('button', { name: 'Sprite Sheet Slicer', exact: true }).click();
  23  |   return dialog;
  24  | }
  25  | 
  26  | test('landing skip link stays on the landing page and focuses its content', async ({ page }) => {
  27  |   await page.goto('/');
  28  |   await page.keyboard.press('Tab');
> 29  |   await expect(page.getByRole('link', { name: 'Skip to content', exact: true })).toBeFocused();
      |                                                                                  ^ Error: expect(locator).toBeFocused() failed
  30  |   await page.keyboard.press('Enter');
  31  |   await expect(page).toHaveURL(/\/#top$/);
  32  |   await expect(page.locator('main#top')).toBeFocused();
  33  | });
  34  | 
  35  | test('large source uses a bounded slicer preview and cancellation preserves artwork and undo', async ({ page }) => {
  36  |   await ready(page);
  37  |   const before = await pixels(page), box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  38  |   await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
  39  |   await expect.poll(() => pixels(page)).not.toEqual(before);
  40  |   const drawing = await pixels(page);
  41  |   const dialog = await image(page, 4096, 1025);
  42  |   await dialog.getByRole('spinbutton', { name: 'Frame cell width in pixels' }).fill('1024');
  43  |   await dialog.getByRole('spinbutton', { name: 'Frame cell height in pixels' }).fill('1025');
  44  |   await dialog.getByRole('checkbox', { name: /Skip Empty/ }).check();
  45  |   await expect(dialog.getByText('For large sheets, empty cells are checked during import. This preview shows all cells.')).toBeVisible();
  46  |   await expect.poll(() => dialog.getByTestId('slicer-cutline-preview').evaluate((canvas: HTMLCanvasElement) => [canvas.width, canvas.height])).toEqual([1024, 256]);
  47  |   await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  48  |   await expect(dialog).toBeHidden();
  49  |   expect(await pixels(page)).toEqual(drawing);
  50  |   await page.keyboard.press('Control+z'); await expect.poll(() => pixels(page)).toEqual(before);
  51  | });
  52  | 
  53  | for (const fallback of [false, true]) test(`thin source details survive empty-cell filtering and APNG download (fallback=${fallback})`, async ({ page }, info) => {
  54  |   if (fallback) await page.addInitScript(() => { Object.defineProperty(window, 'CompressionStream', { value: undefined, configurable: true }); });
  55  |   await ready(page);
  56  |   const dialog = await image(page, 96, 32);
  57  |   for (const [label, value] of [['Frame cell width in pixels', '32'], ['Frame cell height in pixels', '32'],
  58  |     ['Start X in pixels', '0'], ['Start Y in pixels', '0'], ['Gap X in pixels', '0'], ['Gap Y in pixels', '0']]) {
  59  |     await dialog.getByRole('spinbutton', { name: label }).fill(value);
  60  |   }
  61  |   await dialog.getByRole('button', { name: 'Replace Frames', exact: true }).click();
  62  |   const skip = dialog.getByRole('checkbox', { name: /Skip Empty/ }); await expect(skip).not.toBeChecked();
  63  |   await expect(dialog.getByRole('button', { name: 'Slice & Import Frames' })).toContainText('(3)');
  64  |   await skip.check();
  65  |   await expect(dialog.getByRole('button', { name: 'Slice & Import Frames' })).toContainText('(2)');
  66  |   await dialog.getByRole('button', { name: 'Slice & Import Frames' }).click(); await expect(dialog).toBeHidden();
  67  |   await expect(page.getByRole('button', { name: /^Select frame \d+\./ })).toHaveCount(2);
  68  |   const expected: number[][] = [];
  69  |   for (let index = 1; index <= 2; index++) {
  70  |     await page.getByRole('button', { name: new RegExp(`^Select frame ${index}\\.`) }).click();
  71  |     await expect.poll(async () => (await pixels(page)).filter((v, i) => i % 4 === 3 && v > 0).length).toBe(1);
  72  |     expected.push(await pixels(page));
  73  |   }
  74  |   await page.getByTestId('export-button').click(); const exporting = page.getByRole('dialog');
  75  |   await exporting.getByTestId('export-tab-apng').click();
  76  |   await exporting.getByRole('button', { name: '1x', exact: true }).click();
  77  |   const pending = page.waitForEvent('download'); await exporting.getByRole('button', { name: 'Download APNG', exact: true }).click();
  78  |   const download = await pending, output = info.outputPath('thin-details.apng'); await download.saveAs(output);
  79  |   const bytes = await readFile(output), decoded: number[][] = [];
  80  |   for (let offset = 8; offset < bytes.length;) {
  81  |     const length = bytes.readUInt32BE(offset), type = bytes.subarray(offset + 4, offset + 8).toString();
  82  |     if (type === 'IDAT' || type === 'fdAT') {
  83  |       const data = inflateSync(bytes.subarray(offset + (type === 'fdAT' ? 12 : 8), offset + 8 + length));
  84  |       expect(data.length).toBe(32 * 129);
  85  |       const rgba: number[] = [];
  86  |       for (let row = 0; row < 32; row++) { expect(data[row * 129]).toBe(0); rgba.push(...data.subarray(row * 129 + 1, (row + 1) * 129)); }
  87  |       decoded.push(rgba);
  88  |     }
  89  |     offset += length + 12;
  90  |   }
  91  |   expect(decoded).toEqual(expected);
  92  |   await expect(exporting).toBeHidden();
  93  |   expect(await pixels(page)).toEqual(expected[1]);
  94  | });
  95  | 
  96  | test('invalid project JSON gives a readable error and preserves active pixels', async ({ page }) => {
  97  |   await ready(page); const before = await pixels(page);
  98  |   await page.locator('input[type=file]').first().setInputFiles({ name: 'invalid.pixibun', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  99  |   await expect(page.getByText(/not valid JSON/)).toBeVisible();
  100 |   expect(await pixels(page)).toEqual(before);
  101 | });
  102 | 
```