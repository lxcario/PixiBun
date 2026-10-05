# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: paletteCycleExport.spec.ts >> downloads two-second fire-only cycles at 3, 5, 8 and 15 FPS as APNG and GIF
- Location: tests\e2e\paletteCycleExport.spec.ts:6:5

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
  - link "Skip to content" [ref=e2]:
    - /url: "#main-workspace"
  - generic [ref=e4]:
    - banner [ref=e6]:
      - group "Project controls" [ref=e7]:
        - link "PixiBun Home" [ref=e8]:
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
              - 'button "#664422 (Click: Primary | Right-click: Secondary)" [ref=e297] [cursor=pointer]'
              - 'button "#C43C18 (Click: Primary | Right-click: Secondary)" [ref=e298] [cursor=pointer]'
              - 'button "#D88000 (Click: Primary | Right-click: Secondary)" [ref=e299] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e300] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e304]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e305]
      - complementary [ref=e308]:
        - generic [ref=e309]:
          - button "Tools" [ref=e310]
          - button "Layers" [pressed] [ref=e312]
          - button "Palette" [ref=e314]
          - button "PixiTools" [ref=e316]:
            - generic [ref=e317]: FX
        - generic [ref=e319]:
          - generic [ref=e320]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e321]:
              - text: Frame 1 · Layers
              - generic [ref=e322]: (2)
            - generic [ref=e323]:
              - button "Add New Layer" [ref=e324]
              - button "Duplicate Layer" [ref=e326]
              - button "Merge Down" [ref=e328]
              - button "Delete Layer" [ref=e330]
          - generic [ref=e332]:
            - generic [ref=e333]:
              - generic [ref=e334]: Opacity
              - slider "Layer opacity" [ref=e335] [cursor=pointer]: "100"
              - generic [ref=e336]: 100%
            - generic [ref=e337]:
              - generic [ref=e338]: Blend
              - combobox "Layer blend mode" [ref=e339] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e340]:
            - generic [ref=e341]:
              - generic [ref=e342]:
                - button "Reorder layer fire-and-wood" [ref=e343]:
                  - generic [ref=e344]: ⠿
                - generic [ref=e345]:
                  - button "Select layer fire-and-wood. Double click to rename" [ref=e346] [cursor=pointer]: fire-and-wood
                  - button "Rename layer fire-and-wood" [ref=e347] [cursor=pointer]
              - generic [ref=e348]:
                - button "Merge down layer fire-and-wood" [ref=e349]
                - button "Lock layer fire-and-wood" [ref=e350]
                - button "Hide layer fire-and-wood" [ref=e351]
            - generic [ref=e352]:
              - generic [ref=e353]:
                - button "Reorder layer Base Layer" [ref=e354]:
                  - generic [ref=e355]: ⠿
                - generic [ref=e356]:
                  - button "Select layer Base Layer. Double click to rename" [ref=e357] [cursor=pointer]: Base Layer
                  - button "Rename layer Base Layer" [ref=e358] [cursor=pointer]
              - generic [ref=e359]:
                - button "Lock layer Base Layer" [ref=e360]
                - button "Hide layer Base Layer" [ref=e361]
    - contentinfo [ref=e363]:
      - generic [ref=e364]:
        - generic [ref=e365]:
          - generic [ref=e366]:
            - button "Play" [ref=e367]
            - button "Previous Frame (,)" [ref=e370]
            - button "Next Frame (.)" [ref=e372]
            - button "Repeat" [ref=e374]
          - generic [ref=e378]:
            - button "Preview speed" [ref=e380]:
              - generic [ref=e381]: Preview
              - generic [ref=e382]: 1×
              - generic [ref=e383]: ▾
            - generic [ref=e384]:
              - generic [ref=e385]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e386]: "100"
              - generic [ref=e387]: ms
            - button "Onion Skin" [ref=e388]
            - button "Onion skin settings" [ref=e391]: ⚙
        - generic [ref=e392]:
          - button "+ Frame" [ref=e393]:
            - generic [ref=e394]: Frame
          - group [ref=e396]:
            - generic "Frame actions" [ref=e397] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e398]: ▾
          - button "Collapse Timeline" [ref=e400]:
            - generic [ref=e401]:
              - generic [ref=e402]: ▼
              - generic [ref=e403]: Collapse
      - generic [ref=e404]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e406]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e407]
    - generic [ref=e409]:
      - generic [ref=e410]: "X: — Y: —"
      - generic [ref=e413]: 32×32
      - generic [ref=e416]: 1600%
      - generic [ref=e418]: Frame 1/1
      - generic [ref=e420]: fire-and-wood
      - generic [ref=e421]: pen
      - status "All changes saved to local storage" [ref=e426]:
        - generic [ref=e428]: Saved
    - dialog [ref=e429]:
      - generic [ref=e430]:
        - generic [ref=e431]:
          - heading "✦ Export Studio Assets" [level=2] [ref=e432]
          - button "Close dialog" [ref=e433] [cursor=pointer]: ✕
        - generic [ref=e434]:
          - generic [ref=e435]:
            - generic [ref=e436]:
              - generic [ref=e437]: Image & Animation
              - generic [ref=e438]:
                - button "PNG" [disabled] [ref=e439] [cursor=pointer]
                - button "GIF" [disabled] [ref=e440] [cursor=pointer]
                - button "APNG" [disabled] [ref=e441] [cursor=pointer]
                - button "WebM Video" [disabled] [ref=e442] [cursor=pointer]
                - button "MP4 Video" [disabled] [ref=e443] [cursor=pointer]
                - button "Vector SVG" [disabled] [ref=e444] [cursor=pointer]
                - button "Timelapse" [disabled] [ref=e445] [cursor=pointer]
            - generic [ref=e446]:
              - generic [ref=e447]: Game Delivery
              - generic [ref=e448]:
                - button "Sprite Sheet" [disabled] [ref=e449] [cursor=pointer]
                - button "Godot Kit" [disabled] [ref=e450] [cursor=pointer]
                - button "Shaders" [disabled] [ref=e451] [cursor=pointer]
                - button "Cycle Loop" [disabled] [ref=e452] [cursor=pointer]
            - generic [ref=e453]:
              - generic [ref=e454]: Backup & Archive
              - button "Project Backup" [disabled] [ref=e456] [cursor=pointer]
          - generic [ref=e457]:
            - generic [ref=e458]:
              - generic [ref=e459]: Loop length
              - group "Loop length" [ref=e460]:
                - button "1s" [ref=e461] [cursor=pointer]
                - button "2s" [pressed] [ref=e462] [cursor=pointer]
                - button "3s" [ref=e463] [cursor=pointer]
                - button "4s" [ref=e464] [cursor=pointer]
                - button "5s" [ref=e465] [cursor=pointer]
            - generic [ref=e466]:
              - generic [ref=e467]: Frame rate
              - group "Frame rate" [ref=e468]:
                - button "3 FPS" [ref=e469] [cursor=pointer]: "3"
                - button "5 FPS" [ref=e470] [cursor=pointer]: "5"
                - button "8 FPS" [ref=e471] [cursor=pointer]: "8"
                - button "10 FPS" [ref=e472] [cursor=pointer]: "10"
                - button "12 FPS" [ref=e473] [cursor=pointer]: "12"
                - button "15 FPS" [pressed] [ref=e474] [cursor=pointer]: "15"
                - button "24 FPS" [ref=e475] [cursor=pointer]: "24"
                - button "30 FPS" [ref=e476] [cursor=pointer]: "30"
            - generic [ref=e477]:
              - generic [ref=e478]: File format
              - group "Cycle file format" [ref=e479]:
                - button "APNG" [ref=e480] [cursor=pointer]: apng
                - button "GIF" [pressed] [ref=e481] [cursor=pointer]: gif
            - generic [ref=e482]:
              - generic [ref=e483]: Image size
              - group "Cycle image size" [ref=e484]:
                - button "1x" [pressed] [ref=e485] [cursor=pointer]
                - button "2x" [ref=e486] [cursor=pointer]
                - button "4x" [ref=e487] [cursor=pointer]
                - button "8x" [ref=e488] [cursor=pointer]
            - generic [ref=e489]:
              - status [ref=e490]: 30 frames · 2 seconds · 15 FPS
              - paragraph [ref=e491]: Uses this frame and enabled cycles. Speed adjusts to close the loop.
              - paragraph [ref=e492]: GIF rounds frame timing and uses simple transparency.
          - generic [ref=e493]:
            - button "Cancel" [ref=e494]
            - button "Preparing export…" [disabled] [ref=e496]
  - button "Open Next.js Dev Tools" [ref=e504] [cursor=pointer]
  - alert [ref=e510]
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | import { readFile } from 'node:fs/promises';
  3   | import { inflateSync } from 'node:zlib';
  4   | import { apngTiming, gifHolds } from '../helpers/gameAnimationDownload';
  5   | 
  6   | test('downloads two-second fire-only cycles at 3, 5, 8 and 15 FPS as APNG and GIF', async ({ page }, testInfo) => {
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
  34  |   await importer.getByRole('button', { name: 'Import Image', exact: true }).click();
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
  51  |   for (const rate of [3, 5, 8, 15]) for (const format of ['apng', 'gif'] as const) {
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
> 65  |     const pending = page.waitForEvent('download');
      |                          ^ Error: page.waitForEvent: Test timeout of 60000ms exceeded.
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