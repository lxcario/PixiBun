import fs from 'node:fs';
import crypto from 'node:crypto';
import ts from 'typescript';
import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

async function sourceModule(file) {
  const source = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
}
const { STARTER_TEMPLATES, TEMPLATE_PALETTE } = await sourceModule('src/lib/art/starterTemplates.ts');
const { bunPixels, bunOutline, BUN_INK } = await sourceModule('src/lib/art/bunSprite.ts');
const artwork = {
  templates: STARTER_TEMPLATES.filter(t => ['hearth-ghost', 'mushroom'].includes(t.id)),
  palette: TEMPLATE_PALETTE,
  poses: ['idle', 'blink', 'happy'].map(pose => ({ pixels: bunPixels(pose), outline: bunOutline(pose) })), ink: BUN_INK,
};
const output = 'artifacts/feature-repairs/phase5-captures-reviewed/captures'; fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, colorScheme: 'dark', deviceScaleFactor: 1 });
await context.addInitScript(() => {
  localStorage.setItem('pixibun:tool-previews-disabled', 'true');
  localStorage.setItem('pixibun-studio-theme', 'cozy-classic');
  localStorage.setItem('pixibun-color-scheme', 'dark');
  localStorage.setItem('pixibun:timeline-collapsed', 'false');
});
const page = await context.newPage(); const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto('http://localhost:3000/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const screenshots = [];
  async function importProject(solo = false) {
    const project = await page.evaluate(({ artwork, solo }) => {
      const width = solo ? 32 : 56, height = 32;
      const png = frame => {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!solo) for (const [index, template] of artwork.templates.entries()) {
          const ox = index === 0 ? 2 : 20, oy = index === 0 && frame === 1 ? 7 : 8;
          template.rows.forEach((row, y) => [...row].forEach((key, x) => {
            if (artwork.palette[key]) { ctx.fillStyle = artwork.palette[key]; ctx.fillRect(ox + x, oy + y, 1, 1); }
          }));
        }
        const ox = solo ? 8 : 38, oy = 8;
        ctx.fillStyle = artwork.ink;
        for (const [x, y] of artwork.poses[frame].outline) ctx.fillRect(ox + x, oy + y, 1, 1);
        for (const [x, y, w, h, fill] of artwork.poses[frame].pixels) { ctx.fillStyle = fill; ctx.fillRect(ox + x, oy + y, w, h); }
        return canvas.toDataURL('image/png').split(',')[1];
      };
      const colors = [...new Set([...Object.values(artwork.palette), ...artwork.poses.flatMap(p => p.pixels.map(pixel => pixel[4]))])];
      return { format: 'pixibun-project', version: 3, name: solo ? 'Bun by lamplight' : 'Little friends at the desk', width, height, fps: 6, loopMode: 'repeat',
        onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, prevColor: '#C792DF', nextColor: '#DCABDF', opacity: 0.45 },
        palettes: [{ id: 'lamplight', name: 'Lamplight', colors, cycleTracks: [] }], currentPaletteId: 'lamplight', customRamps: [],
        clips: [{ id: 'hello', name: 'A little hello', startFrame: 0, endFrame: 2, loopMode: 'repeat' }],
        frames: [180, 180, 360].map((durationMs, i) => ({ id: `readme-frame-${i}`, durationMs, layers: [{ id: `readme-art-${i}`, name: solo ? 'Bun' : 'Little friends', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: png(i) }] })), createdAt: 1, updatedAt: 1 };
    }, { artwork, solo });
    await page.locator('input[type=file]').first().setInputFiles({ name: 'little-friends.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
    const dialog = page.getByRole('dialog', { name: 'Import Project (.pixibun)' });
    await dialog.getByRole('button', { name: 'Confirm Import' }).click(); await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: /Select frame 3/ })).toBeVisible();
    const close = page.getByRole('button', { name: 'Close Preview Window' });
    if (await close.isVisible()) await close.click();
    await page.keyboard.press('Control+0');
    await page.getByTestId('save-button').click();
    await expect(page.getByTestId('save-status-badge')).toContainText('Saved');
  }
  async function capture(name, description) {
    await page.mouse.move(1400, 945);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByText(/Saved ".+" to browser storage/)).toBeHidden({ timeout: 12000 });
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${output}/${name}`, animations: 'disabled' });
    screenshots.push({ path: name, description, sha256: crypto.createHash('sha256').update(fs.readFileSync(`${output}/${name}`)).digest('hex') });
  }
  await importProject();
  await page.getByRole('button', { name: 'Palette', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-studio-theme', 'cozy-classic');
  await capture('studio-cozy-dark.png', 'Cozy Classic dark; built-in starter artwork and Bun poses arranged in an imported three-frame project.');
  await page.getByRole('button', { name: 'Studio options' }).click();
  await page.getByTestId('scheme-option-light').click(); await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-color-scheme', 'light');
  await capture('studio-cozy-light.png', 'The same project in Cozy Classic light, selected through the actual Studio options.');
  await page.getByRole('button', { name: 'Studio options' }).click();
  await page.getByTestId('scheme-option-dark').click(); await page.keyboard.press('Escape');
  await importProject(true);
  await page.getByRole('button', { name: /PixiTools/ }).click();
  await page.getByTestId('pixitools-task-lighting').click();
  await page.getByRole('button', { name: 'Preview lighting', exact: true }).click();
  await expect(page.getByRole('toolbar', { name: 'Live Light Bulb Controls' })).toBeVisible();
  await capture('bun-lighting-preview.png', 'Actual uncommitted lighting preview on Bun; Apply and Cancel remain visible.');

  await page.reload();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.getByTestId('export-button').click();
  await page.getByTestId('export-tab-apng').click();
  await expect(page.getByText(/APNG keeps full RGBA color and transparency/)).toBeVisible();
  await capture('export-apng.png', 'Actual APNG controls with full RGBA and file-size/playback qualification; no download verdict.');
  await page.getByTestId('export-tab-mp4').click();
  await expect(page.getByText(/MP4 uses the video support available in your browser/)).toBeVisible();
  await capture('export-mp4.png', 'Actual browser-dependent MP4 controls and destination/alpha qualification; no decoder verdict.');
  await page.goto('http://localhost:3000/');
  await expect(page.getByText(/take a Godot kit into your game/)).toBeVisible();
  await expect(page.getByText('GODOT KIT & UNITY SHADERS', {exact:true})).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1100);
  await page.screenshot({ path: output+'/welcome-overview.png', animations:'disabled' });
  screenshots.push({path:'welcome-overview.png',description:'Welcome page with warm beginning and correctly scoped Godot kit.',sha256:crypto.createHash('sha256').update(fs.readFileSync(output+'/welcome-overview.png')).digest('hex')});
  await page.getByRole('tab',{name:/Image Synthesis/}).click();
  await expect(page.getByRole('button',{name:/Preserve edges/})).toBeVisible();
  const imagePanel=page.getByRole('tabpanel',{name:/Image Synthesis/});
  await imagePanel.scrollIntoViewIfNeeded();
  await page.mouse.move(1400,945);
  await imagePanel.screenshot({path:output+'/welcome-pixelize.png',animations:'disabled'});
  screenshots.push({path:'welcome-pixelize.png',description:'Image Synthesis sample, actual sampling/palette controls and bounded edge/detail explanation.',sha256:crypto.createHash('sha256').update(fs.readFileSync(output+'/welcome-pixelize.png')).digest('hex')});
  if (errors.length) throw Error('Page errors: ' + errors.join('; '));
  fs.writeFileSync('artifacts/feature-repairs/phase5-captures-reviewed/run.json', JSON.stringify({ capturedAt: new Date().toISOString(), timezone: 'Europe/Istanbul', revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), workingTree: 'uncommitted October feature repairs including phase 5 public copy; current local application', command: 'Node capture script using Playwright and the visible project importer/theme/lighting controls', runtime: process.version, browser: 'Chromium ' + browser.version(), viewport: '1440x960, device scale 1', verdict: 'seven real UI states captured with assertions and no page errors; illustrations only, full suites recorded separately', artworkSources: ['src/lib/art/starterTemplates.ts', 'src/lib/art/bunSprite.ts'], captures: screenshots }, null, 2) + '\n');
  console.log('Captured seven current studio/welcome states with original PixiBun artwork and no page errors.');
} finally { await context.close(); await browser.close(); }
