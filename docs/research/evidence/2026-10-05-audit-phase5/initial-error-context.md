# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: projectDatesAndClipboard.spec.ts >> compiled creation date 0 survives import, edits, reload and backup while duplicates get a new date
- Location: tests\production\projectDatesAndClipboard.spec.ts:19:48

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForEvent: Test timeout of 60000ms exceeded.
=========================== logs ===========================
waiting for event "download"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-workspace"
  - generic [ref=e4]:
    - banner [ref=e6]:
      - group "Project controls" [ref=e7]:
        - link "PixiBun Home" [ref=e8] [cursor=pointer]:
          - /url: /
          - generic [ref=e9]:
            - img "Bun, the PixiBun bunny" [ref=e11]
            - generic [ref=e175]:
              - generic [ref=e176]: PIXIBUN
              - generic [ref=e177]: ATELIER
        - button "File" [ref=e178]:
          - text: File
          - generic [ref=e179]: ▼
        - button "Rename project Dated artwork" [ref=e180] [cursor=pointer]: Dated artwork
        - generic "Canvas size · change it in File" [ref=e181]: 32×32
        - button "Save now" [ref=e182]:
          - generic [ref=e183]: Save
        - generic [ref=e185]:
          - button "Undo last action" [ref=e187] [cursor=pointer]
          - generic [ref=e188]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e189]:
        - generic "Tool options rail" [ref=e190]:
          - generic [ref=e191]: "Pen:"
          - generic [ref=e192]:
            - button "Brush size 1 pixels" [ref=e193]:
              - generic [ref=e194]: Size
              - generic [ref=e195]: 1 px
              - generic [ref=e196]: ▾
            - generic "Quick brush size presets" [ref=e197]:
              - button "1px brush preset" [pressed] [ref=e198]: "1"
              - button "2px brush preset" [ref=e199]: "2"
              - button "3px brush preset" [ref=e200]: "3"
              - button "4px brush preset" [ref=e201]: "4"
            - button "Disable clean corners" [pressed] [ref=e202]:
              - generic [ref=e203]: Pixel-Perfect
      - generic [ref=e204]:
        - group "Canvas controls" [ref=e205]:
          - group "Mirror drawing" [ref=e206]:
            - generic [ref=e207]: Mirror
            - button "Horizontal symmetry" [ref=e209] [cursor=pointer]
            - button "Vertical symmetry" [ref=e211] [cursor=pointer]
          - generic [ref=e213]:
            - generic [ref=e214]:
              - button "Zoom Out" [ref=e215] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e217]: 1600%
              - button "Zoom In" [ref=e218] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e220] [cursor=pointer]: Fit
          - button "View options menu" [ref=e224] [cursor=pointer]:
            - generic [ref=e225]:
              - generic [ref=e226]: View
              - generic "1 active view options" [ref=e227]
            - generic [ref=e228]: ▼
        - group "Workspace presets" [ref=e229]:
          - combobox "Workspace layout" [ref=e230] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e231]:
          - button "Studio options" [ref=e232] [cursor=pointer]:
            - generic [ref=e233]: Studio
            - generic [ref=e234]: ▼
        - button "Export drawing" [ref=e236]:
          - generic [ref=e237]: Export
    - status [ref=e239]: Changes saved
    - generic [ref=e240]:
      - complementary [ref=e242]:
        - generic [ref=e244]:
          - group "Drawing" [ref=e245]:
            - button "Pen" [pressed] [ref=e247] [cursor=pointer]
            - button "Bézier Curve" [ref=e249] [cursor=pointer]
            - button "Eraser" [ref=e251] [cursor=pointer]
            - button "Flood Fill" [ref=e253] [cursor=pointer]
            - button "Pixel Gradient" [ref=e255] [cursor=pointer]
            - button "Dither Brush" [ref=e257] [cursor=pointer]
            - button "Color Replace" [ref=e259] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e261] [cursor=pointer]
          - group "Selection" [ref=e262]:
            - button "Marquee Box" [ref=e265] [cursor=pointer]
            - button "Lasso Select" [ref=e267] [cursor=pointer]
            - button "Magic Wand" [ref=e269] [cursor=pointer]
          - group "Geometry" [ref=e270]:
            - button "Line" [ref=e273] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e275] [cursor=pointer]
            - button "Rectangle" [ref=e277] [cursor=pointer]
            - button "Ellipse" [ref=e279] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e280]:
            - button "Normal Chisel" [ref=e283] [cursor=pointer]
          - group "Utility" [ref=e284]:
            - button "Eyedropper" [ref=e287] [cursor=pointer]
        - generic [ref=e288]:
          - generic [ref=e289]:
            - button "Swap colors (X)" [ref=e290] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e291] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e292] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e293] [cursor=pointer]'
          - generic [ref=e294]:
            - 'button "#ff0000 (Click: Primary | Right-click: Secondary)" [ref=e296] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e297] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e301]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e302]
      - complementary [ref=e305]:
        - generic [ref=e306]:
          - button "Tools" [ref=e307]
          - button "Layers" [pressed] [ref=e309]
          - button "Palette" [ref=e311]
          - button "PixiTools" [ref=e313]:
            - generic [ref=e314]: FX
        - generic [ref=e316]:
          - generic [ref=e317]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e318]:
              - text: Frame 1 · Layers
              - generic [ref=e319]: (1)
            - generic [ref=e320]:
              - button "Add New Layer" [ref=e321]
              - button "Duplicate Layer" [ref=e323]
              - button "Merge Down" [disabled] [ref=e325]
              - button "Delete Layer" [disabled] [ref=e327]
          - generic [ref=e329]:
            - generic [ref=e330]:
              - generic [ref=e331]: Opacity
              - slider "Layer opacity" [ref=e332] [cursor=pointer]: "100"
              - generic [ref=e333]: 100%
            - generic [ref=e334]:
              - generic [ref=e335]: Blend
              - combobox "Layer blend mode" [ref=e336] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e338]:
            - generic [ref=e339]:
              - button "Reorder layer Body" [disabled] [ref=e340]:
                - generic [ref=e341]: ⠿
              - generic [ref=e342]:
                - button "Select layer Body. Double click to rename" [ref=e343] [cursor=pointer]: Body
                - button "Rename layer Body" [ref=e344] [cursor=pointer]
            - generic [ref=e345]:
              - button "Lock layer Body" [ref=e346]
              - button "Hide layer Body" [ref=e347]
    - contentinfo [ref=e349]:
      - generic [ref=e350]:
        - generic [ref=e351]:
          - generic [ref=e352]:
            - button "Play" [ref=e353]
            - button "Previous Frame (,)" [ref=e356]
            - button "Next Frame (.)" [ref=e358]
            - button "Repeat" [ref=e360]
          - generic [ref=e364]:
            - button "Preview speed" [ref=e366]:
              - generic [ref=e367]: Preview
              - generic [ref=e368]: 1×
              - generic [ref=e369]: ▾
            - generic [ref=e370]:
              - generic [ref=e371]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e372]: "100"
              - generic [ref=e373]: ms
            - button "Onion Skin" [ref=e374]
            - button "Onion skin settings" [ref=e377]: ⚙
        - generic [ref=e378]:
          - button "+ Frame" [ref=e379]:
            - generic [ref=e380]: Frame
          - group [ref=e382]:
            - generic "Frame actions" [ref=e383] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e384]: ▾
          - button "Collapse Timeline" [ref=e386]:
            - generic [ref=e387]:
              - generic [ref=e388]: ▼
              - generic [ref=e389]: Collapse
      - generic [ref=e390]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e392]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e393]
    - generic [ref=e395]:
      - generic [ref=e396]: "X: — Y: —"
      - generic [ref=e399]: 32×32
      - generic [ref=e402]: 1600%
      - generic [ref=e404]: Frame 1/1
      - generic [ref=e406]: Body
      - generic [ref=e407]: pen
      - status "All changes saved to local storage" [ref=e412]:
        - generic [ref=e414]: Saved
    - dialog [ref=e415]:
      - generic [ref=e416]:
        - generic [ref=e417]:
          - heading "✦ Project backup" [level=2] [ref=e418]
          - button "Close dialog" [ref=e419] [cursor=pointer]: ✕
        - generic [ref=e420]:
          - generic [ref=e421]:
            - generic [ref=e422]:
              - generic [ref=e423]: Image & Animation
              - generic [ref=e424]:
                - button "PNG" [ref=e425] [cursor=pointer]
                - button "GIF" [ref=e426] [cursor=pointer]
                - button "APNG" [ref=e427] [cursor=pointer]
                - button "WebM Video" [ref=e428] [cursor=pointer]
                - button "MP4 Video" [ref=e429] [cursor=pointer]
                - button "Vector SVG" [ref=e430] [cursor=pointer]
                - button "Timelapse" [ref=e431] [cursor=pointer]
            - generic [ref=e432]:
              - generic [ref=e433]: Game Delivery
              - generic [ref=e434]:
                - button "Sprite Sheet" [ref=e435] [cursor=pointer]
                - button "Godot Kit" [ref=e436] [cursor=pointer]
                - button "Shaders" [ref=e437] [cursor=pointer]
                - button "Cycle Loop" [ref=e438] [cursor=pointer]
            - generic [ref=e439]:
              - generic [ref=e440]: Backup & Archive
              - button "Project Backup" [ref=e442] [cursor=pointer]
          - paragraph [ref=e444]: Keep a portable .pixibun copy outside this browser. It includes all 1 frames, layers, palettes, and timing.
          - alert [ref=e445]: No backup was created. Your project is still open here.
          - generic [ref=e446]:
            - button "Cancel" [ref=e447]
            - button "Download project backup" [ref=e449]
  - alert [ref=e452]
```

# Test source

```ts
  1  | import { readFile, writeFile } from 'node:fs/promises';
  2  | import { expect, test, type Page } from '@playwright/test';
  3  | 
  4  | async function ready(page: Page) {
  5  |   await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  6  | }
  7  | async function backup(page: Page) {
  8  |   await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-project').click();
> 9  |   const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download project backup', exact: true }).click();
     |                         ^ Error: page.waitForEvent: Test timeout of 60000ms exceeded.
  10 |   const path = await (await download).path(); expect(path).toBeTruthy();
  11 |   const project = JSON.parse(await readFile(path!, 'utf8'));
  12 |   await expect(page.getByRole('dialog', { name: /Export/ })).toBeHidden();
  13 |   return project;
  14 | }
  15 | async function gallery(page: Page) {
  16 |   await page.getByTestId('file-menu-button').click(); await page.getByRole('menuitem', { name: 'Projects', exact: true }).click();
  17 |   return page.getByRole('dialog', { name: 'Atelier Projects & Gallery' });
  18 | }
  19 | for (const createdAt of [0, 946684800000]) test(`compiled creation date ${createdAt} survives import, edits, reload and backup while duplicates get a new date`, async ({ page }, info) => {
  20 |   await ready(page);
  21 |   const fixture = await page.evaluate(createdAt => {
  22 |     const c = document.createElement('canvas'); c.width = c.height = 32;
  23 |     const ctx = c.getContext('2d')!; ctx.fillStyle = '#ff0000'; ctx.fillRect(4, 4, 1, 1);
  24 |     return { format: 'pixibun-project', version: 3, name: 'Dated artwork', width: 32, height: 32, fps: 8, loopMode: 'repeat',
  25 |       onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, prevColor: '#c792df', nextColor: '#dcabdf', opacity: 0.45 },
  26 |       palettes: [{ id: 'colors', name: 'Colors', colors: ['#ff0000'] }], currentPaletteId: 'colors', customRamps: [], clips: [],
  27 |       frames: [{ id: 'dated-frame', durationMs: 100, layers: [{ id: 'dated-layer', name: 'Body', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: c.toDataURL().split(',')[1] }] }], createdAt, updatedAt: createdAt };
  28 |   }, createdAt);
  29 |   await page.locator('input[type=file]').first().setInputFiles({ name: 'dated.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  30 |   const importer = page.getByRole('dialog', { name: 'Import Project (.pixibun)' });
  31 |   await importer.getByRole('button', { name: 'Confirm Import' }).click(); await expect(importer).toBeHidden();
  32 |   await expect(page.getByRole('button', { name: 'Rename project Dated artwork', exact: true })).toBeVisible();
  33 |   const canvas = page.getByTestId('main-composite-canvas'), box = (await canvas.boundingBox())!;
  34 |   await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
  35 |   await page.getByTestId('save-button').click(); await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
  36 |   const first = await backup(page); expect(first.createdAt).toBe(createdAt); expect(first.updatedAt).toBeGreaterThan(createdAt);
  37 |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  38 |   const reopened = await backup(page); expect(reopened.createdAt).toBe(createdAt);
  39 |   expect(reopened.frames[0].layers[0].pngBase64).toBe(first.frames[0].layers[0].pngBase64);
  40 |   let projects = await gallery(page); const beforeDuplicate = Date.now();
  41 |   await projects.getByRole('button', { name: 'Open project Dated artwork', exact: true }).getByTitle('Duplicate drawing', { exact: true }).click();
  42 |   await projects.getByRole('button', { name: 'Open project Copy of Dated artwork', exact: true }).click(); await expect(projects).toBeHidden();
  43 |   const copy = await backup(page); expect(copy.createdAt).toBeGreaterThanOrEqual(beforeDuplicate);
  44 |   expect(copy.frames[0].layers[0].pngBase64).toBe(first.frames[0].layers[0].pngBase64);
  45 |   projects = await gallery(page); await projects.getByRole('button', { name: 'Open project Dated artwork', exact: true }).click();
  46 |   const original = await backup(page); expect(original.createdAt).toBe(createdAt);
  47 |   const measurement = { createdAt, first: first.createdAt, reopened: reopened.createdAt, copy: copy.createdAt, original: original.createdAt, pixelsPreserved: true };
  48 |   await info.attach('creation-date-roundtrip', { body: JSON.stringify(measurement), contentType: 'application/json' });
  49 |   await writeFile(`docs/research/evidence/2026-10-05-audit-phase5/dates-${createdAt}-${info.project.name}.json`, JSON.stringify(measurement, null, 2));
  50 | });
  51 | 
  52 | test('compiled co-draw denied clipboard selects the full code and a successful retry reports copied', async ({ page }) => {
  53 |   await ready(page);
  54 |   test.skip(!await page.evaluate(() => typeof RTCPeerConnection === 'function'), 'This runtime cannot generate a real WebRTC invite; clipboard state coverage also runs in component tests.');
  55 |   await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new DOMException('Fixture permission denial', 'NotAllowedError'); } } }); });
  56 |   await page.getByRole('button', { name: 'Studio options', exact: true }).click(); await page.getByRole('button', { name: 'Co-Draw session', exact: true }).click();
  57 |   const dialog = page.getByRole('dialog', { name: 'Peer-to-Peer Co-Draw' });
  58 |   await dialog.getByRole('button', { name: 'Generate Invite Code' }).click();
  59 |   const code = dialog.getByRole('textbox', { name: 'Generated invite code' }); await expect(code).not.toHaveValue('');
  60 |   await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
  61 |   await expect(dialog.getByRole('alert')).toHaveText('Couldn’t copy the code. Select the code above and copy it manually.');
  62 |   await expect(code).toBeFocused(); expect(await code.evaluate((field: HTMLTextAreaElement) => [field.selectionStart, field.selectionEnd])).toEqual([0, (await code.inputValue()).length]);
  63 |   await expect(dialog.getByRole('button', { name: 'Copied!', exact: true })).toBeHidden();
  64 |   await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as unknown as { copiedFixture: string }).copiedFixture = text; } } }); });
  65 |   await dialog.getByRole('button', { name: 'Copy', exact: true }).click(); await expect(dialog.getByRole('status')).toHaveText('Invite code copied.');
  66 |   expect(await page.evaluate(() => (window as unknown as { copiedFixture: string }).copiedFixture)).toBe(await code.inputValue());
  67 |   await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  68 |   await page.getByRole('button', { name: 'Studio options', exact: true }).click(); await page.getByRole('button', { name: 'Co-Draw session', exact: true }).click();
  69 |   await expect(dialog.getByRole('status')).toBeHidden();
  70 | });
  71 | 
```