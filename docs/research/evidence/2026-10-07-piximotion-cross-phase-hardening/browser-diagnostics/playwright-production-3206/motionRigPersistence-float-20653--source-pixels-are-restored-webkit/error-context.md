# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: motionRigPersistence.spec.ts >> floating artwork blocks saved-rig opening and fresh capture until its source pixels are restored
- Location: tests\production\motionRigPersistence.spec.ts:109:5

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator:  getByRole('button', { name: 'Open rig Wave', exact: true })
Expected: disabled
Received: enabled
Timeout:  10000ms

Call log:
  - Expect "toBeDisabled" with timeout 10000ms
  - waiting for getByRole('button', { name: 'Open rig Wave', exact: true })
    22 × locator resolved to <button type="button" aria-label="Open rig Wave" class="pixel-tactile-btn p-1">Open</button>
       - unexpected value "enabled"

```

```yaml
- button "Open rig Wave": Open
```

# Test source

```ts
  14  | }
  15  | 
  16  | async function readyWithMark(page: Page) {
  17  |   await page.setViewportSize({ width: 1600, height: 1000 });
  18  |   await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  19  |   const canvas = page.getByTestId('main-composite-canvas'); const box = (await canvas.boundingBox())!;
  20  |   await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4); await page.mouse.down();
  21  |   await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4, { steps: 4 }); await page.mouse.up();
  22  |   await expect.poll(async () => (await pixels(page)).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  23  |   return pixels(page);
  24  | }
  25  | async function capture(page: Page) {
  26  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Escape');
  27  |   const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  28  |   await page.getByTestId('select-box-tool').click();
  29  |   await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2); await page.mouse.down();
  30  |   await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 4 }); await page.mouse.up();
  31  |   await page.getByTestId('tab-tools').click();
  32  |   await page.getByTestId('create-motion-part-btn').click(); await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  33  | }
  34  | async function setArc(page: Page) {
  35  |   const translation = page.getByRole('slider', { name: 'Pose translation X', exact: true }); await translation.focus();
  36  |   for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight'); await expect(translation).toHaveValue('4');
  37  |   const count = page.getByRole('slider', { name: 'Motion frame count', exact: true }); await count.focus();
  38  |   await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(count).toHaveValue('3');
  39  |   await page.getByRole('combobox', { name: 'Motion easing', exact: true }).selectOption('linear');
  40  | }
  41  | 
  42  | async function saveRig(page: Page) {
  43  |   await page.getByRole('textbox', { name: 'Rig name', exact: true }).fill('Wave');
  44  |   await page.getByRole('button', { name: 'Save motion rig', exact: true }).click();
  45  |   await expect(page.getByTestId('motion-rig-library').getByRole('status')).toContainText('Motion rig ready');
  46  |   await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click();
  47  |   await expect(page.getByTestId('piximotion-panel')).toBeHidden();
  48  | }
  49  | async function saveReload(page: Page) {
  50  |   await page.getByTestId('save-button').click();
  51  |   await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
  52  |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  53  |   await page.getByTestId('tab-tools').click();
  54  | }
  55  | 
  56  | test('saved rigid-part poses survive a real project reload and reopen with exact source and translated pixels', async ({ page }) => {
  57  |   const original = await readyWithMark(page); await capture(page); await setArc(page); await saveRig(page); await saveReload(page);
  58  |   await expect.poll(() => pixels(page)).toEqual(original);
  59  |   await expect(page.getByTestId('piximotion-panel')).toHaveCount(0);
  60  |   await page.getByRole('button', { name: 'Open rig Wave', exact: true }).click();
  61  |   await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  62  |   await expect(page.getByRole('slider', { name: 'Pose translation X', exact: true })).toHaveValue('4');
  63  |   await expect(page.getByRole('slider', { name: 'Motion frame count', exact: true })).toHaveValue('3');
  64  |   await expect(page.getByRole('combobox', { name: 'Motion easing', exact: true })).toHaveValue('linear');
  65  |   await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 4));
  66  |   await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
  67  |   await expect(page.getByRole('button', { name: /Select frame 3\./ })).toBeVisible();
  68  |   await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  69  |   await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(original);
  70  |   await expect(page.getByRole('button', { name: /Select frame 2\./ })).toHaveCount(0);
  71  |   await expect(page.getByRole('button', { name: 'Open rig Wave', exact: true })).toBeVisible();
  72  | });
  73  | 
  74  | test('saved rig deletion is reversible and edited source is refused after save and reload without changing artwork', async ({ page }) => {
  75  |   await readyWithMark(page); await capture(page); await setArc(page); await saveRig(page);
  76  |   await page.getByRole('button', { name: 'Delete rig Wave', exact: true }).click();
  77  |   await expect(page.getByRole('button', { name: 'Open rig Wave', exact: true })).toHaveCount(0);
  78  |   await page.getByTestId('undo-button').click(); await expect(page.getByRole('button', { name: 'Open rig Wave', exact: true })).toBeVisible();
  79  |   await page.getByTestId('redo-button').click(); await expect(page.getByRole('button', { name: 'Open rig Wave', exact: true })).toHaveCount(0);
  80  |   await page.getByTestId('undo-button').click();
  81  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Escape'); await page.keyboard.press('KeyB');
  82  |   const before = await pixels(page), box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  83  |   await page.mouse.click(box.x + box.width * 0.65, box.y + box.height * 0.6);
  84  |   await expect.poll(() => pixels(page)).not.toEqual(before);
  85  |   const changed = await pixels(page); await saveReload(page);
  86  |   await expect.poll(() => pixels(page)).toEqual(changed);
  87  |   await page.getByRole('button', { name: 'Open rig Wave', exact: true }).click();
  88  |   await expect(page.getByTestId('motion-rig-library').getByRole('status')).toContainText('saved source artwork changed');
  89  |   await expect(page.getByTestId('piximotion-panel')).toHaveCount(0);
  90  |   await expect(page.getByTestId('main-composite-canvas')).toHaveCSS('opacity', '1');
  91  |   await expect.poll(() => pixels(page)).toEqual(changed);
  92  |   await expect(page.getByRole('button', { name: /Select frame 2\./ })).toHaveCount(0);
  93  | });
  94  | 
  95  | test('opening a saved rig selects its source cel after a frame copy and cancellation restores that source display', async ({ page }) => {
  96  |   const original = await readyWithMark(page); await capture(page); await setArc(page); await saveRig(page);
  97  |   await page.locator('summary').filter({ hasText: 'Frame actions' }).click();
  98  |   await page.getByRole('button', { name: 'Duplicate frame', exact: true }).click();
  99  |   const first = page.getByRole('button', { name: /Select frame 1\./ }), second = page.getByRole('button', { name: /Select frame 2\./ });
  100 |   await expect(second).toHaveClass(/timeline-frame-active-bg/);
  101 |   await page.getByRole('button', { name: 'Open rig Wave', exact: true }).click();
  102 |   await expect(first).toHaveClass(/timeline-frame-active-bg/);
  103 |   await expect(page.getByRole('slider', { name: 'Pose translation X', exact: true })).toHaveValue('4');
  104 |   await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 4));
  105 |   await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click();
  106 |   await expect.poll(() => pixels(page)).toEqual(original); await expect(first).toHaveClass(/timeline-frame-active-bg/);
  107 | });
  108 | 
  109 | test('floating artwork blocks saved-rig opening and fresh capture until its source pixels are restored', async ({ page }) => {
  110 |   const original = await readyWithMark(page); await capture(page); await setArc(page); await saveRig(page);
  111 |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('ArrowRight');
  112 |   await expect(page.getByTestId('gizmo-commit-btn')).toBeVisible();
  113 |   const open = page.getByRole('button', { name: 'Open rig Wave', exact: true });
> 114 |   await expect(open).toBeDisabled();
      |                      ^ Error: expect(locator).toBeDisabled() failed
  115 |   await page.getByTestId('create-motion-part-btn').click();
  116 |   await expect(page.getByText('Commit or cancel the floating selection before creating a motion part.', { exact: true })).toBeVisible();
  117 |   await expect(page.getByTestId('piximotion-panel')).toHaveCount(0);
  118 |   await page.getByTestId('gizmo-cancel-btn').click();
  119 |   await expect(open).toBeEnabled(); await expect.poll(() => pixels(page)).toEqual(original);
  120 |   await open.click(); await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  121 |   await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 4));
  122 | });
  123 | 
  124 | test('a portable backup preserves editable rig IDs and poses and imports with matching source pixels', async ({ page }, info) => {
  125 |   await page.addInitScript(() => { Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }); });
  126 |   const original = await readyWithMark(page); await capture(page); await setArc(page); await saveRig(page);
  127 |   await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-project').click();
  128 |   const download = page.waitForEvent('download');
  129 |   await page.getByRole('button', { name: 'Download project backup', exact: true }).click();
  130 |   const path = await (await download).path(); expect(path).toBeTruthy();
  131 |   const raw = await readFile(path!, 'utf8'), file = JSON.parse(raw);
  132 |   expect(file.version).toBe(4); expect(file.motionRigs).toHaveLength(1);
  133 |   const rig = file.motionRigs[0]; expect(rig.name).toBe('Wave'); expect(rig.part.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
  134 |   expect(rig.part.endPose.translationX).toBe(4); expect(rig.part.frameCount).toBe(3);
  135 |   expect(rig.part).not.toHaveProperty('raster'); expect(rig.part).not.toHaveProperty('sourceVersion');
  136 |   await writeFile(info.outputPath('saved-rig.pixibun'), raw);
  137 |   await expect(page.getByRole('dialog', { name: /Export/ })).toBeHidden();
  138 |   await page.locator('input[type=file]').first().setInputFiles({ name: 'saved-rig.pixibun', mimeType: 'application/json', buffer: Buffer.from(raw) });
  139 |   const importer = page.getByRole('dialog', { name: 'Import Project (.pixibun)' });
  140 |   await importer.getByRole('button', { name: 'Confirm Import', exact: true }).click(); await expect(importer).toBeHidden();
  141 |   await expect.poll(() => pixels(page)).toEqual(original); await page.getByTestId('tab-tools').click();
  142 |   await page.getByRole('button', { name: 'Open rig Wave', exact: true }).click();
  143 |   await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  144 |   await expect(page.getByRole('slider', { name: 'Motion frame count', exact: true })).toHaveValue('3');
  145 |   await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 4));
  146 | });
  147 | 
```