import { chromium } from '@playwright/test';
import fs from 'node:fs';
const directory = 'docs/research/evidence/2026-10-05-deep-audit';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const output = { revision: 'f18f4e47d299685d7fdf23de158ae082a883483d', environment: 'local compiled Chromium, isolated browser storage', checks: [], errors: [] };
page.on('pageerror', e => output.errors.push(e.message));
try {
  await page.goto('http://localhost:3107/studio');
  await page.locator('[data-restoration-phase="active"]').waitFor();
  await page.getByTestId('main-composite-canvas').waitFor();
  await page.screenshot({ path: `${directory}/studio.png` });
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  await page.waitForFunction(() => document.body.innerText.includes('Changes saved'));
  await page.locator('#center-canvas-area').focus();
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Command Palette' }).waitFor();
  await page.getByLabel('Search studio commands').focus();
  const onion = await page.getByRole('option').filter({ hasText: 'Onion Skin' }).innerText();
  output.checks.push({ name: 'onion command shortcut', displayed: onion });
  for (let i = 0; i < 70; i++) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => ({ inside: !!document.activeElement?.closest('[role="dialog"]'), label: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim().slice(0, 80) }));
    if (!focus.inside) { output.checks.push({ name: 'command palette focus escape', tabs: i + 1, focus }); break; }
  }
  await page.getByLabel('Search studio commands').focus(); await page.keyboard.press('Escape');
  await page.getByLabel('Workspace layout').selectOption('lighting');
  await page.getByRole('region', { name: 'Canvas navigator' }).waitFor();
  output.checks.push({ name: 'navigator coordinate spaces', data: await page.evaluate(() => {
    const c = document.querySelector('[data-testid="navigator-canvas"]');
    const box = c.getBoundingClientRect(); const overlay = document.querySelector('[data-testid="navigator-view-bounds"]');
    return { intrinsic: [c.width, c.height], displayed: [box.width, box.height], overlayLeft: overlay.style.left, overlayTop: overlay.style.top, mainContent: [document.getElementById('main-content').clientWidth, document.getElementById('main-content').clientHeight] };
  }) });
  output.checks.push({ name: 'small visible buttons', buttons: await page.locator('button').evaluateAll(items => items.flatMap(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24) ? [{ name: b.getAttribute('aria-label') || b.textContent.trim(), width: r.width, height: r.height }] : []; }).slice(0, 30)) });
  await page.screenshot({ path: `${directory}/lighting-workspace.png` });
  await page.getByLabel('Workspace layout').selectOption('drawing');
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Control+k');
  await page.getByLabel('Search studio commands').fill('Gallery');
  await page.keyboard.press('Enter'); await page.getByRole('dialog', { name: 'Atelier Projects & Gallery' }).waitFor();
  await page.getByRole('button', { name: 'Rename artwork', exact: true }).first().click();
  await page.getByRole('dialog', { name: 'Atelier Projects & Gallery' }).locator('input').last().fill('Audit Renamed');
  await page.getByRole('button', { name: 'Save title', exact: true }).click();
  await page.waitForTimeout(1600);
  output.checks.push({ name: 'active gallery rename', text: (await page.locator('body').innerText()).slice(-4500) });
  output.checks.push({ name: 'stored project names after gallery rename', names: await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => { const request = indexedDB.open('PixiBunDB'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const rows = await new Promise((resolve, reject) => { const request = database.transaction('projects').objectStore('projects').getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); database.close(); return rows.map(row => row.name);
  }) });
  if (await page.getByRole('button', { name: 'Close dialog', exact: true }).isVisible()) await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  await page.waitForTimeout(1000);
  output.checks.push({ name: 'save after own rename', text: (await page.locator('body').innerText()).slice(-3000) });
  await page.screenshot({ path: `${directory}/self-rename.png` });
} catch (e) { output.failure = e.message; }
finally { await browser.close(); fs.writeFileSync(`${directory}/browser-results.json`, JSON.stringify(output, null, 2)); console.log(JSON.stringify(output, null, 2)); }
