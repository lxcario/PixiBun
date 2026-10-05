import { readFile, writeFile } from 'node:fs/promises';
const directory = 'docs/research/evidence/2026-10-05-audit-hardening';
let diagnostic = await readFile('tests/production/artistWorkspace.spec.ts', 'utf8');
diagnostic = diagnostic.replace("async ({ page }) => {\n  await ready(page); const blank", "async ({ page }, info) => {\n  await ready(page); const blank");
diagnostic = diagnostic.replace("  // Repeating the identical fill creates no extra history step.", `  // Record native reads/writes around the repeated stroke, without changing pixels.
  await page.evaluate(() => {
    const records: unknown[] = []; (window as unknown as { gradientRecords: unknown[] }).gradientRecords = records;
    const read = CanvasRenderingContext2D.prototype.getImageData, put = CanvasRenderingContext2D.prototype.putImageData;
    const record = (kind: string, ctx: CanvasRenderingContext2D, data: ImageData) => {
      if (ctx.canvas.width !== 32 || data.width !== 32 || data.height !== 32) return;
      records.push({ kind, bytes: Array.from(data.data), stack: new Error().stack });
    };
    CanvasRenderingContext2D.prototype.getImageData = function(...args) { const data = read.apply(this, args as Parameters<typeof read>); record('read', this, data); return data; };
    CanvasRenderingContext2D.prototype.putImageData = function(this: CanvasRenderingContext2D, ...args: Parameters<typeof put>) { record('put', this, args[0]); return Reflect.apply(put, this, args); } as typeof put;
  });
  // Repeating the identical fill creates no extra history step.`);
diagnostic = diagnostic.replace("await draw(page, [16, 16], [24, 16]); await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(blank);", `await draw(page, [16, 16], [24, 16]);
  const records = await page.evaluate(() => (window as unknown as { gradientRecords: unknown[] }).gradientRecords);
  await info.attach('gradient-native-records', { body: JSON.stringify({ records, filled, afterRepeat: await pixels(page) }), contentType: 'application/json' });
  await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(blank);`);
await writeFile(`${directory}/gradient-diagnostic.spec.ts`, diagnostic);

let cycle = await readFile('tests/e2e/paletteCycleExport.spec.ts', 'utf8');
cycle = cycle.replace("'../helpers/gameAnimationDownload'", "'../../../../tests/helpers/gameAnimationDownload'");
cycle = cycle.replace(/  await page.evaluate\(\(\) => \(window as unknown as \{ __studioStore:[\s\S]*?\}\s*\} \}\s*\)\.__studioStore.getState\(\).addExtractedPalette\('No cycle yet', \['#080808', '#FF8C00'\]\)\);/, `  await importFixture(page, await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 32; return c.toDataURL().split(',')[1]; }), false);`);
const start = cycle.indexOf("  await page.locator('input[type=file]').first().setInputFiles"), end = cycle.indexOf('  const pixels = () =>', start);
if (start < 0 || end < 0 || cycle.includes('No cycle yet')) throw new Error('Cycle fixture match failed');
cycle = cycle.slice(0, start) + `  await importFixture(page, image, true);
  await page.getByTestId('tab-palette').click();
  await page.getByRole('button', { name: /Cycle Engine/ }).click();
  await page.getByLabel('Playback Speed', { exact: true }).selectOption('2');
` + cycle.slice(end);
const helper = `
async function importFixture(page: import('@playwright/test').Page, image: string, active: boolean) {
  const project = { format: 'pixibun-project', version: 3, name: active ? 'Fire and wood' : 'No cycle yet', width: 32, height: 32, fps: 8, loopMode: 'repeat',
    palettes: [{ id: 'cycle-colors', name: 'Cycle colors', colors: active ? ['#080808', '#664422', '#C43C18', '#D88000', '#FF8C00', '#FFB833'] : ['#080808', '#FF8C00'], cycleTracks: active ? [{ id: 'fire', low: 2, high: 5, rate: 4, direction: 'forward', enabled: true, blendShift: false }] : [] }],
    currentPaletteId: 'cycle-colors', customRamps: [], clips: [], frames: [{ id: 'cycle-frame', durationMs: 100, layers: [{ id: 'cycle-layer', name: 'Artwork', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: image }] }], createdAt: 1000, updatedAt: 1000 };
  await page.locator('input[type=file]').first().setInputFiles({ name: 'cycle.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  const dialog = page.getByRole('dialog', { name: 'Import Project (.pixibun)' }); await dialog.getByRole('button', { name: 'Confirm Import' }).click(); await expect(dialog).toBeHidden();
}
`;
await writeFile(`${directory}/palette-cycle-compiled.spec.ts`, cycle + helper);
