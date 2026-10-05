# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: artworkIdentity.spec.ts >> compiled duplication preserves later clips and palette roles through undo, redo, save and reload
- Location: tests\production\artworkIdentity.spec.ts:54:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByTestId('undo-button')
    - locator resolved to <button title="Undo (Ctrl+Z)" data-testid="undo-button" aria-label="Undo last action" class="w-7 h-7 rounded-[2px] flex items-center justify-center pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)] disabled:opacity-25 disabled:pointer-events-none cursor-pointer">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <span class="text-[10px] font-sans font-medium text-[var(--text-heading)] shrink-0 hidden xl:inline">…</span> from <div role="group" aria-label="Drawing controls" class="relative flex shrink-0 items-center">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <span class="text-[10px] font-sans font-medium text-[var(--text-heading)] shrink-0 hidden xl:inline">…</span> from <div role="group" aria-label="Drawing controls" class="relative flex shrink-0 items-center">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    109 × waiting for element to be visible, enabled and stable
        - element is visible, enabled and stable
        - scrolling into view if needed
        - done scrolling
        - <span class="text-[10px] font-sans font-medium text-[var(--text-heading)] shrink-0 hidden xl:inline">…</span> from <div role="group" aria-label="Drawing controls" class="relative flex shrink-0 items-center">…</div> subtree intercepts pointer events
      - retrying click action
        - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
        - button "Rename project Identity fixture" [ref=e180] [cursor=pointer]: Identity fixture
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
        - button "Export drawing" [active] [ref=e236]:
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
            - generic [ref=e295]:
              - 'button "#ff0000 (Click: Primary | Right-click: Secondary)" [ref=e296] [cursor=pointer]'
              - 'button "#ff0000 (Click: Primary | Right-click: Secondary)" [ref=e297] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e298] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e302]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e303]
      - complementary [ref=e306]:
        - generic [ref=e307]:
          - button "Tools" [ref=e308]
          - button "Layers" [pressed] [ref=e310]
          - button "Palette" [ref=e312]
          - button "PixiTools" [ref=e314]:
            - generic [ref=e315]: FX
        - generic [ref=e317]:
          - generic [ref=e318]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e319]:
              - text: Frame 2 · Layers
              - generic [ref=e320]: (1)
            - generic [ref=e321]:
              - button "Add New Layer" [ref=e322]
              - button "Duplicate Layer" [ref=e324]
              - button "Merge Down" [disabled] [ref=e326]
              - button "Delete Layer" [disabled] [ref=e328]
          - generic [ref=e330]:
            - generic [ref=e331]:
              - generic [ref=e332]: Opacity
              - slider "Layer opacity" [ref=e333] [cursor=pointer]: "100"
              - generic [ref=e334]: 100%
            - generic [ref=e335]:
              - generic [ref=e336]: Blend
              - combobox "Layer blend mode" [ref=e337] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e339]:
            - generic [ref=e340]:
              - button "Reorder layer Body" [disabled] [ref=e341]:
                - generic [ref=e342]: ⠿
              - generic [ref=e343]:
                - button "Select layer Body. Double click to rename" [ref=e344] [cursor=pointer]: Body
                - button "Rename layer Body" [ref=e345] [cursor=pointer]
            - generic [ref=e346]:
              - button "Lock layer Body" [ref=e347]
              - button "Hide layer Body" [ref=e348]
    - contentinfo [ref=e350]:
      - generic [ref=e351]:
        - generic [ref=e352]:
          - generic [ref=e353]:
            - button "Play" [ref=e354]
            - button "Previous Frame (,)" [ref=e357]
            - button "Next Frame (.)" [ref=e359]
            - button "Repeat" [ref=e361]
          - generic [ref=e365]:
            - button "Preview speed" [ref=e367]:
              - generic [ref=e368]: Preview
              - generic [ref=e369]: 1×
              - generic [ref=e370]: ▾
            - generic [ref=e371]:
              - generic [ref=e372]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e373]: "100"
              - generic [ref=e374]: ms
            - button "Onion Skin" [ref=e375]
            - button "Onion skin settings" [ref=e378]: ⚙
        - generic [ref=e379]:
          - button "+ Frame" [ref=e380]:
            - generic [ref=e381]: Frame
          - group [ref=e383]:
            - generic "Frame actions" [ref=e384] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e385]: ▾
          - button "Collapse Timeline" [ref=e387]:
            - generic [ref=e388]:
              - generic [ref=e389]: ▼
              - generic [ref=e390]: Collapse
      - generic [ref=e391]:
        - generic [ref=e392]:
          - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e393]':
            - generic:
              - generic: "#1"
              - generic: 100ms
          - 'button "Select frame 2. Duration: 100ms. Drag to reorder." [ref=e394]':
            - generic:
              - generic: "#2"
              - generic: 100ms
          - 'button "Select frame 3. Duration: 100ms. Drag to reorder." [ref=e395]':
            - generic:
              - generic: "#3"
              - generic: 100ms
          - 'button "Select frame 4. Duration: 100ms. Drag to reorder." [ref=e396]':
            - generic:
              - generic: "#4"
              - generic: 100ms
          - 'button "Select frame 5. Duration: 100ms. Drag to reorder." [ref=e397]':
            - generic:
              - generic: "#5"
              - generic: 100ms
        - button "Clips" [ref=e398]
    - generic [ref=e400]:
      - generic [ref=e401]: "X: — Y: —"
      - generic [ref=e404]: 32×32
      - generic [ref=e407]: 1600%
      - generic [ref=e409]: Frame 2/5
      - generic [ref=e411]: Body
      - generic [ref=e412]: pen
      - status "All changes saved to local storage" [ref=e417]:
        - generic [ref=e419]: Saved
  - alert [ref=e420]
```

# Test source

```ts
  1  | import { readFile } from 'node:fs/promises';
  2  | import { expect, test, type Page } from '@playwright/test';
  3  | import type { ProjectFile } from '@/types/project';
  4  | 
  5  | async function importFixture(page: Page) {
  6  |   await page.addInitScript(() => { Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }); });
  7  |   await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  8  |   const project = await page.evaluate(() => {
  9  |     const png = (alpha = 1) => {
  10 |       const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
  11 |       const ctx = canvas.getContext('2d')!; ctx.fillStyle = `rgba(255,0,0,${alpha})`; ctx.fillRect(2, 2, 3, 3);
  12 |       return canvas.toDataURL('image/png').split(',')[1];
  13 |     };
  14 |     const body = (i: number) => ({ id: `body-${i}`, name: 'Body', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: png() });
  15 |     const light = { id: 'light-1', name: 'Lighting', visible: false, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: png(0.2) };
  16 |     return { format: 'pixibun-project', version: 3, name: 'Identity fixture', width: 32, height: 32, fps: 8, loopMode: 'repeat',
  17 |       onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, prevColor: '#c792df', nextColor: '#dcabdf', opacity: 0.45 },
  18 |       palettes: [{ id: 'roles', name: 'Roles', colors: ['#ff0000', '#ff0000'], semantics: {
  19 |         entries: [{ id: 'cloth', role: 'cloth' }, { id: 'fire', role: 'fire' }],
  20 |         bindings: [{ id: 'fire-region', frameId: 'frame-0', entryId: 'fire', x: 0, y: 0, w: 32, h: 32 }],
  21 |       } }], currentPaletteId: 'roles', customRamps: [], clips: [{ id: 'attack', name: 'Attack', startFrame: 1, endFrame: 2, loopMode: 'forward' }],
  22 |       frames: [0, 1, 2, 3].map(i => ({ id: `frame-${i}`, durationMs: 100, layers: i === 1 ? [light, body(i)] : [body(i)] })), createdAt: 1, updatedAt: 1 };
  23 |   });
  24 |   await page.locator('input[type=file]').first().setInputFiles({ name: 'identity.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  25 |   const dialog = page.getByRole('dialog', { name: 'Import Project (.pixibun)' });
  26 |   await dialog.getByRole('button', { name: 'Confirm Import' }).click(); await expect(dialog).toBeHidden();
  27 |   await expect(page.getByRole('button', { name: /Select frame 4\./ })).toBeVisible();
  28 |   return project;
  29 | }
  30 | async function frameAction(page: Page, name: string) {
  31 |   await page.locator('summary').filter({ hasText: 'Frame actions' }).click();
  32 |   await page.getByRole('button', { name, exact: true }).click();
  33 | }
  34 | async function backup(page: Page): Promise<ProjectFile> {
  35 |   await page.getByTestId('export-button').click();
  36 |   await page.getByTestId('export-tab-project').click();
  37 |   const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download project backup', exact: true }).click();
  38 |   const downloaded = await pending, path = await downloaded.path();
  39 |   if (!path) throw new Error('Project backup has no local artifact.');
  40 |   return JSON.parse(await readFile(path, 'utf8'));
  41 | }
  42 | const clipMembers = (project: ProjectFile) => {
  43 |   const clip = project.clips.find(c => c.id === 'attack')!;
  44 |   return project.frames.slice(clip.startFrame, clip.endFrame + 1).map(frame => frame.id);
  45 | };
  46 | async function alpha(page: Page, base64: string) {
  47 |   return page.evaluate(async png => {
  48 |     const image = new Image(); image.src = 'data:image/png;base64,' + png; await image.decode();
  49 |     const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
  50 |     const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0); return ctx.getImageData(2, 2, 1, 1).data[3];
  51 |   }, base64);
  52 | }
  53 | 
  54 | test('compiled duplication preserves later clips and palette roles through undo, redo, save and reload', async ({ page }) => {
  55 |   await importFixture(page);
  56 |   await page.getByRole('button', { name: /Select frame 1\./ }).click(); await frameAction(page, 'Duplicate frame');
  57 |   const duplicated = await backup(page); expect(clipMembers(duplicated)).toEqual(['frame-1', 'frame-2']);
  58 |   const duplicateId = duplicated.frames[1].id;
  59 |   expect(duplicated.palettes[0].semantics!.bindings.find(b => b.frameId === duplicateId)?.entryId).toBe('fire');
  60 |   expect(await alpha(page, duplicated.frames[1].layers[0].pngBase64!)).toBe(255);
> 61 |   await page.getByTestId('undo-button').click();
     |                                         ^ Error: locator.click: Test timeout of 60000ms exceeded.
  62 |   const undone = await backup(page); expect(undone.frames).toHaveLength(4); expect(undone.palettes[0].semantics!.bindings).toHaveLength(1);
  63 |   await page.getByTestId('redo-button').click(); await page.getByTestId('save-button').click();
  64 |   await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible();
  65 |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  66 |   const reopened = await backup(page); expect(clipMembers(reopened)).toEqual(['frame-1', 'frame-2']);
  67 |   expect(reopened.palettes[0].semantics!.bindings.find(b => b.frameId === duplicateId)?.entryId).toBe('fire');
  68 |   expect(await alpha(page, reopened.frames[1].layers[0].pngBase64!)).toBe(255);
  69 | });
  70 | 
  71 | test('compiled frame move refuses to split a clip without changing the exported artwork order', async ({ page }) => {
  72 |   await importFixture(page); await page.getByRole('button', { name: /Select frame 1\./ }).click();
  73 |   await frameAction(page, 'Move frame later');
  74 |   await expect(page.getByText('Moving this frame would split the "Attack" clip. Adjust its range before moving the frame.', { exact: true })).toBeVisible();
  75 |   const project = await backup(page); expect(project.frames.map(frame => frame.id)).toEqual(['frame-0', 'frame-1', 'frame-2', 'frame-3']);
  76 |   expect(clipMembers(project)).toEqual(['frame-1', 'frame-2']);
  77 | });
  78 | 
  79 | test('compiled all-frame color erase follows Body across reordered stacks and undo preserves hidden Lighting', async ({ page }) => {
  80 |   await importFixture(page); await page.getByRole('button', { name: /Select frame 1\./ }).click();
  81 |   await page.getByTestId('erase-color-tool').click(); await page.getByTestId('tool-options-button').click();
  82 |   await page.getByRole('button', { name: 'Erase Color frame scope' }).click();
  83 |   const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  84 |   await page.mouse.click(box.x + box.width * 3.5 / 32, box.y + box.height * 3.5 / 32);
  85 |   const erased = await backup(page);
  86 |   for (const frame of erased.frames) expect(await alpha(page, frame.layers.find(layer => layer.name === 'Body')!.pngBase64!)).toBe(0);
  87 |   expect(await alpha(page, erased.frames[1].layers.find(layer => layer.name === 'Lighting')!.pngBase64!)).toBe(51);
  88 |   await page.getByTestId('undo-button').click(); const restored = await backup(page);
  89 |   for (const frame of restored.frames) expect(await alpha(page, frame.layers.find(layer => layer.name === 'Body')!.pngBase64!)).toBe(255);
  90 |   expect(await alpha(page, restored.frames[1].layers.find(layer => layer.name === 'Lighting')!.pngBase64!)).toBe(51);
  91 | });
  92 | 
```