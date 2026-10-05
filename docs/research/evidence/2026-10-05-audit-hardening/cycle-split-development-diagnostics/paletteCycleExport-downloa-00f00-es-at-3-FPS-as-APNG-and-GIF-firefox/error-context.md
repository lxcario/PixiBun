# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: paletteCycleExport.spec.ts >> downloads two-second fire-only cycles at 3 FPS as APNG and GIF
- Location: tests\e2e\paletteCycleExport.spec.ts:6:39

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('dialog', { name: 'Import Image' }).getByRole('button', { name: 'Import Image', exact: true })

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
        - button "Rename project Untitled Sprite" [ref=e180] [cursor=pointer]: Untitled Sprite
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
            - generic [ref=e295]:
              - 'button "#080808 (Click: Primary | Right-click: Secondary)" [ref=e296] [cursor=pointer]'
              - 'button "#FF8C00 (Click: Primary | Right-click: Secondary)" [ref=e297] [cursor=pointer]'
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
              - text: Frame 1 · Layers
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
              - button "Reorder layer Base Layer" [disabled] [ref=e341]:
                - generic [ref=e342]: ⠿
              - generic [ref=e343]:
                - button "Select layer Base Layer. Double click to rename" [ref=e344] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e345] [cursor=pointer]
            - generic [ref=e346]:
              - button "Lock layer Base Layer" [ref=e347]
              - button "Hide layer Base Layer" [ref=e348]
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
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e393]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e394]
    - generic [ref=e396]:
      - generic [ref=e397]: "X: — Y: —"
      - generic [ref=e400]: 32×32
      - generic [ref=e403]: 1600%
      - generic [ref=e405]: Frame 1/1
      - generic [ref=e407]: Base Layer
      - generic [ref=e408]: pen
      - status "All changes saved to local storage" [ref=e413]:
        - generic [ref=e415]: Saved
    - dialog [ref=e416]:
      - generic [ref=e417]:
        - generic [ref=e418]:
          - heading "✦ Import Image & Sprite Sheet Slicer" [level=2] [ref=e419]
          - button "Close dialog" [ref=e420] [cursor=pointer]: ✕
        - generic [ref=e422]:
          - generic [ref=e423]:
            - generic [ref=e424]: File Source Selection
            - generic [ref=e425]: fire-and-wood.png
          - generic [ref=e426]:
            - button "Single Sprite / Layer" [active] [ref=e427] [cursor=pointer]
            - button "Sprite Sheet Slicer" [ref=e428] [cursor=pointer]
          - generic [ref=e430]:
            - generic [ref=e431]:
              - generic [ref=e432]:
                - generic [ref=e433]: fire-and-wood.png
                - generic [ref=e434]: 32 × 32 px
              - generic [ref=e435]:
                - generic [ref=e436]: Canvas Sizing
                - generic [ref=e437] [cursor=pointer]:
                  - radio "Match Image Size (32×32 px) Keeps exact 1:1 original pixels." [checked] [ref=e438]
                  - generic [ref=e439]:
                    - generic [ref=e440]: Match Image Size (32×32 px)
                    - generic [ref=e441]: Keeps exact 1:1 original pixels.
                - generic [ref=e442] [cursor=pointer]:
                  - radio "Fit into Current Canvas (32×32 px) Fits proportionally inside the current canvas dimensions." [ref=e443]
                  - generic [ref=e444]:
                    - generic [ref=e445]: Fit into Current Canvas (32×32 px)
                    - generic [ref=e446]: Fits proportionally inside the current canvas dimensions.
              - generic [ref=e447]:
                - generic [ref=e448]: Color & Quality
                - generic [ref=e449]:
                  - button "Exact 1:1 Pixels" [ref=e450] [cursor=pointer]
                  - button "Retro Pixelize" [ref=e451] [cursor=pointer]
                - generic [ref=e452] [cursor=pointer]:
                  - checkbox "Add Colors to Swatches" [ref=e453]
                  - generic [ref=e454]: Add Colors to Swatches
              - generic [ref=e455]:
                - generic [ref=e456]: Destination
                - generic [ref=e457]:
                  - button "New Layer" [ref=e458] [cursor=pointer]
                  - button "Replace" [ref=e459] [cursor=pointer]
                  - button "New Frame" [ref=e460] [cursor=pointer]
            - generic [ref=e461]:
              - generic [ref=e462]:
                - generic [ref=e463]: Canvas Preview
                - generic [ref=e465]: 32 × 32 px
              - generic [ref=e468]: Canvas will be set to 32×32 px with exact pixels
          - generic [ref=e469]:
            - button "Cancel" [ref=e470]
            - button "Import Image" [ref=e472]
  - button "Open Next.js Dev Tools" [ref=e480] [cursor=pointer]
  - alert [ref=e485]
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | import { readFile } from 'node:fs/promises';
  3   | import { inflateSync } from 'node:zlib';
  4   | import { apngTiming, gifHolds } from '../helpers/gameAnimationDownload';
  5   | 
  6   | for (const rate of [3, 5, 8, 15]) test(`downloads two-second fire-only cycles at ${rate} FPS as APNG and GIF`, async ({ page }, testInfo) => {
  7   |   await page.setViewportSize({ width: 1280, height: 1000 });
  8   |   await page.addInitScript(() => localStorage.setItem('pixibun:tool-previews-disabled', 'true'));
  9   |   await page.goto('/studio');
  10  |   await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  11  |   await page.evaluate(() => (window as unknown as { __studioStore: { getState: () => {
  12  |     addExtractedPalette: (name: string, colors: string[]) => boolean;
  13  |   } } }).__studioStore.getState().addExtractedPalette('No cycle yet', ['#080808', '#FF8C00']));
  14  |   await page.getByTestId('export-button').click();
  15  |   const dialog = page.getByRole('dialog', { name: 'Export Studio Assets' });
  16  |   await dialog.getByTestId('export-tab-palette-cycle').click();
  17  |   await expect(dialog.getByRole('button', { name: '8 FPS', exact: true })).toHaveAttribute('aria-pressed', 'true');
  18  |   await expect(dialog.getByRole('alert')).toContainText('at least two colors');
  19  |   await expect(dialog.getByRole('button', { name: 'Download cycle animation' })).toBeDisabled();
  20  |   await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  21  |   const image = await page.evaluate(() => {
  22  |     const c = document.createElement('canvas'); c.width = c.height = 32;
  23  |     const ctx = c.getContext('2d')!;
  24  |     ctx.fillStyle = '#080808'; ctx.fillRect(7, 4, 18, 19); ctx.fillRect(3, 22, 26, 7);
  25  |     ['#C43C18', '#D88000', '#FF8C00', '#FFB833'].forEach((color, i) => {
  26  |       ctx.fillStyle = color; ctx.fillRect(8 + i * 4, 5, 4, 17);
  27  |     });
  28  |     ctx.fillStyle = '#684628'; ctx.fillRect(4, 23, 24, 5);
  29  |     return c.toDataURL('image/png').split(',')[1];
  30  |   });
  31  |   await page.locator('input[type=file]').first().setInputFiles({ name: 'fire-and-wood.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  32  |   const importer = page.getByRole('dialog', { name: 'Import Image' });
  33  |   await importer.getByRole('button', { name: 'Single Sprite / Layer' }).click();
> 34  |   await importer.getByRole('button', { name: 'Import Image', exact: true }).click();
      |                                                                             ^ Error: locator.click: Test timeout of 60000ms exceeded.
  35  |   await expect(importer).toBeHidden();
  36  |   await page.evaluate(() => {
  37  |     const state = (window as unknown as { __studioStore: { getState: () => {
  38  |       currentPaletteId: string;
  39  |       addExtractedPalette: (name: string, colors: string[]) => boolean;
  40  |       addPaletteCycleTrack: (id: string, track: { id: string; low: number; high: number; rate: number; direction: 'forward'; enabled: boolean; blendShift: boolean }) => void;
  41  |       setPaletteCycleSpeedMultiplier: (speed: number) => void;
  42  |     } } }).__studioStore;
  43  |     state.getState().addExtractedPalette('Fire + wood', ['#080808', '#664422', '#C43C18', '#D88000', '#FF8C00', '#FFB833']);
  44  |     state.getState().addPaletteCycleTrack(state.getState().currentPaletteId, { id: 'fire', low: 2, high: 5, rate: 4, direction: 'forward', enabled: true, blendShift: false });
  45  |     // 4 registers/sec * 2x = 8 registers/sec; each 15-FPS frame should advance
  46  |     // after two samples, rather than four when preview speed is ignored.
  47  |     state.getState().setPaletteCycleSpeedMultiplier(2);
  48  |   });
  49  |   const pixels = () => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
  50  |   const original = await pixels();
  51  |   for (const format of ['apng', 'gif'] as const) {
  52  |     await page.getByTestId('export-button').click();
  53  |     await dialog.getByTestId('export-tab-palette-cycle').click();
  54  |     await dialog.getByRole('button', { name: `${rate} FPS`, exact: true }).click();
  55  |     await dialog.getByRole('group', { name: 'Loop length' }).getByRole('button', { name: '2s', exact: true }).click();
  56  |     await dialog.getByRole('group', { name: 'Cycle file format' }).getByRole('button', { name: format.toUpperCase(), exact: true }).click();
  57  |     await dialog.getByRole('group', { name: 'Cycle image size' }).getByRole('button', { name: '1x', exact: true }).click();
  58  |     await expect(dialog.getByRole('group', { name: 'Cycle image size' }).getByRole('button', { name: '1x', exact: true })).toHaveAttribute('aria-pressed', 'true');
  59  |     await expect(dialog.getByRole('combobox', { name: 'Export frame scope' })).toHaveCount(0);
  60  |     await expect(dialog.getByRole('status')).toHaveText(`${rate * 2} frames · 2 seconds · ${rate} FPS`);
  61  |     await expect(dialog.getByRole('button', { name: `${rate} FPS`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  62  |     const boxes = await Promise.all((await dialog.getByRole('group', { name: 'Frame rate' }).getByRole('button').all()).map(button => button.boundingBox()));
  63  |     expect(Math.max(...boxes.map(b => b!.width)) - Math.min(...boxes.map(b => b!.width))).toBeLessThan(1);
  64  |     if (format === 'apng' && rate === 8) await page.screenshot({ path: testInfo.outputPath('cycle-export-low-fps.png'), animations: 'disabled' });
  65  |     const pending = page.waitForEvent('download');
  66  |     await dialog.getByRole('button', { name: 'Download cycle animation', exact: true }).click();
  67  |     const download = await pending, path = testInfo.outputPath(`fire-${rate}fps.${format === 'gif' ? 'gif' : 'png'}`);
  68  |     await download.saveAs(path); const bytes = await readFile(path);
  69  |     if (format === 'apng') {
  70  |       const timing = apngTiming(bytes);
  71  |       expect(timing.count).toBe(rate * 2); expect(timing.plays).toBe(0);
  72  |       timing.holds.forEach(hold => expect(hold).toBeCloseTo(1000 / rate, 8));
  73  |       expect(timing.holds.reduce((a, b) => a + b, 0)).toBeCloseTo(2000, 8);
  74  |       const decoded: number[][] = [];
  75  |       for (let offset = 8; offset < bytes.length;) {
  76  |         const length = bytes.readUInt32BE(offset), type = bytes.subarray(offset + 4, offset + 8).toString(), start = offset + 8;
  77  |         if (type === 'IDAT' || type === 'fdAT') {
  78  |           const raw = inflateSync(bytes.subarray(start + (type === 'fdAT' ? 4 : 0), start + length)), rgba: number[] = [];
  79  |           for (let y = 0; y < 32; y++) {
  80  |             expect(raw[y * 129]).toBe(0);
  81  |             rgba.push(...raw.subarray(y * 129 + 1, (y + 1) * 129));
  82  |           }
  83  |           decoded.push(rgba);
  84  |         }
  85  |         offset += length + 12;
  86  |       }
  87  |       expect(decoded).toHaveLength(rate * 2);
  88  |       const fireOffset = (5 * 32 + 8) * 4;
  89  |       expect(decoded[0].slice(fireOffset, fireOffset + 4)).toEqual(original.slice(fireOffset, fireOffset + 4));
  90  |       if (rate === 15) expect(decoded[2].slice(fireOffset, fireOffset + 3)).toEqual([255, 184, 51]);
  91  |       expect(new Set(decoded.map(frame => frame.slice(fireOffset, fireOffset + 3).join(','))).size).toBeGreaterThan(1);
  92  |       const outsideFire = original.map((_, i) => i).filter(i => {
  93  |         const pixel = Math.floor(i / 4), x = pixel % 32, y = Math.floor(pixel / 32);
  94  |         return x < 8 || x >= 24 || y < 5 || y >= 22;
  95  |       });
  96  |       const unchanged = outsideFire.map(i => original[i]);
  97  |       for (const frame of decoded) expect(outsideFire.map(i => frame[i])).toEqual(unchanged);
  98  |     } else {
  99  |       const holds = gifHolds(bytes);
  100 |       expect(holds).toHaveLength(rate * 2);
  101 |       expect(Math.min(...holds)).toBeGreaterThanOrEqual(Math.floor(100 / rate) * 10);
  102 |       expect(Math.max(...holds)).toBeLessThanOrEqual(Math.ceil(100 / rate) * 10);
  103 |       expect(holds.reduce((a, b) => a + b, 0)).toBe(2000);
  104 |     }
  105 |     await expect(dialog).toBeHidden();
  106 |     expect(await pixels()).toEqual(original);
  107 |   }
  108 | });
  109 | 
```