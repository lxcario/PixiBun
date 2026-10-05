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
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('dialog', { name: 'Export Studio Assets' }).getByTestId('export-tab-palette-cycle')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e6] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e7]
    - generic [ref=e13]:
      - button "Open issues overlay" [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: "1"
          - generic [ref=e17]: "2"
        - generic [ref=e18]:
          - text: Issue
          - generic [ref=e19]: s
      - button "Collapse issues badge" [ref=e20]
  - link "Skip to content" [ref=e23]:
    - /url: "#main-workspace"
  - generic [ref=e25]:
    - banner [ref=e27]:
      - group "Project controls" [ref=e28]:
        - link "PixiBun Home" [ref=e29]:
          - /url: /
          - generic [ref=e30]:
            - img "Bun, the PixiBun bunny" [ref=e32]
            - generic [ref=e196]:
              - generic [ref=e197]: PIXIBUN
              - generic [ref=e198]: ATELIER
        - button "File" [ref=e199]:
          - text: File
          - generic [ref=e200]: ▼
        - button "Rename project Untitled Sprite" [ref=e201] [cursor=pointer]: Untitled Sprite
        - generic "Canvas size · change it in File" [ref=e202]: 32×32
        - button "Save now" [ref=e203]:
          - generic [ref=e204]: Save
        - generic [ref=e206]:
          - button "Undo last action" [ref=e208] [cursor=pointer]
          - generic [ref=e209]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e210]:
        - generic "Tool options rail" [ref=e211]:
          - generic [ref=e212]: "Pen:"
          - generic [ref=e213]:
            - button "Brush size 1 pixels" [ref=e214]:
              - generic [ref=e215]: Size
              - generic [ref=e216]: 1 px
              - generic [ref=e217]: ▾
            - generic "Quick brush size presets" [ref=e218]:
              - button "1px brush preset" [pressed] [ref=e219]: "1"
              - button "2px brush preset" [ref=e220]: "2"
              - button "3px brush preset" [ref=e221]: "3"
              - button "4px brush preset" [ref=e222]: "4"
            - button "Disable clean corners" [pressed] [ref=e223]:
              - generic [ref=e224]: Pixel-Perfect
      - generic [ref=e225]:
        - group "Canvas controls" [ref=e226]:
          - group "Mirror drawing" [ref=e227]:
            - generic [ref=e228]: Mirror
            - button "Horizontal symmetry" [ref=e230] [cursor=pointer]
            - button "Vertical symmetry" [ref=e232] [cursor=pointer]
          - generic [ref=e234]:
            - generic [ref=e235]:
              - button "Zoom Out" [ref=e236] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e238]: 1600%
              - button "Zoom In" [ref=e239] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e241] [cursor=pointer]: Fit
          - button "View options menu" [ref=e245] [cursor=pointer]:
            - generic [ref=e246]:
              - generic [ref=e247]: View
              - generic "1 active view options" [ref=e248]
            - generic [ref=e249]: ▼
        - group "Workspace presets" [ref=e250]:
          - combobox "Workspace layout" [ref=e251] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e252]:
          - button "Studio options" [ref=e253] [cursor=pointer]:
            - generic [ref=e254]: Studio
            - generic [ref=e255]: ▼
        - button "Export drawing" [active] [ref=e257]:
          - generic [ref=e258]: Export
    - status [ref=e260]: Changes saved
    - generic [ref=e261]:
      - complementary [ref=e263]:
        - generic [ref=e265]:
          - group "Drawing" [ref=e266]:
            - button "Pen" [pressed] [ref=e268] [cursor=pointer]
            - button "Bézier Curve" [ref=e270] [cursor=pointer]
            - button "Eraser" [ref=e272] [cursor=pointer]
            - button "Flood Fill" [ref=e274] [cursor=pointer]
            - button "Pixel Gradient" [ref=e276] [cursor=pointer]
            - button "Dither Brush" [ref=e278] [cursor=pointer]
            - button "Color Replace" [ref=e280] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e282] [cursor=pointer]
          - group "Selection" [ref=e283]:
            - button "Marquee Box" [ref=e286] [cursor=pointer]
            - button "Lasso Select" [ref=e288] [cursor=pointer]
            - button "Magic Wand" [ref=e290] [cursor=pointer]
          - group "Geometry" [ref=e291]:
            - button "Line" [ref=e294] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e296] [cursor=pointer]
            - button "Rectangle" [ref=e298] [cursor=pointer]
            - button "Ellipse" [ref=e300] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e301]:
            - button "Normal Chisel" [ref=e304] [cursor=pointer]
          - group "Utility" [ref=e305]:
            - button "Eyedropper" [ref=e308] [cursor=pointer]
        - generic [ref=e309]:
          - generic [ref=e310]:
            - button "Swap colors (X)" [ref=e311] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e312] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e313] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e314] [cursor=pointer]'
          - generic [ref=e315]:
            - generic [ref=e316]:
              - 'button "#080808 (Click: Primary | Right-click: Secondary)" [ref=e317] [cursor=pointer]'
              - 'button "#FF8C00 (Click: Primary | Right-click: Secondary)" [ref=e318] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e319] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e323]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e324]
      - complementary [ref=e327]:
        - generic [ref=e328]:
          - button "Tools" [ref=e329]
          - button "Layers" [pressed] [ref=e331]
          - button "Palette" [ref=e333]
          - button "PixiTools" [ref=e335]:
            - generic [ref=e336]: FX
        - generic [ref=e338]:
          - generic [ref=e339]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e340]:
              - text: Frame 1 · Layers
              - generic [ref=e341]: (1)
            - generic [ref=e342]:
              - button "Add New Layer" [ref=e343]
              - button "Duplicate Layer" [ref=e345]
              - button "Merge Down" [disabled] [ref=e347]
              - button "Delete Layer" [disabled] [ref=e349]
          - generic [ref=e351]:
            - generic [ref=e352]:
              - generic [ref=e353]: Opacity
              - slider "Layer opacity" [ref=e354] [cursor=pointer]: "100"
              - generic [ref=e355]: 100%
            - generic [ref=e356]:
              - generic [ref=e357]: Blend
              - combobox "Layer blend mode" [ref=e358] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e360]:
            - generic [ref=e361]:
              - button "Reorder layer Base Layer" [disabled] [ref=e362]:
                - generic [ref=e363]: ⠿
              - generic [ref=e364]:
                - button "Select layer Base Layer. Double click to rename" [ref=e365] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e366] [cursor=pointer]
            - generic [ref=e367]:
              - button "Lock layer Base Layer" [ref=e368]
              - button "Hide layer Base Layer" [ref=e369]
    - contentinfo [ref=e371]:
      - generic [ref=e372]:
        - generic [ref=e373]:
          - generic [ref=e374]:
            - button "Play" [ref=e375]
            - button "Previous Frame (,)" [ref=e378]
            - button "Next Frame (.)" [ref=e380]
            - button "Repeat" [ref=e382]
          - generic [ref=e386]:
            - button "Preview speed" [ref=e388]:
              - generic [ref=e389]: Preview
              - generic [ref=e390]: 1×
              - generic [ref=e391]: ▾
            - generic [ref=e392]:
              - generic [ref=e393]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e394]: "100"
              - generic [ref=e395]: ms
            - button "Onion Skin" [ref=e396]
            - button "Onion skin settings" [ref=e399]: ⚙
        - generic [ref=e400]:
          - button "+ Frame" [ref=e401]:
            - generic [ref=e402]: Frame
          - group [ref=e404]:
            - generic "Frame actions" [ref=e405] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e406]: ▾
          - button "Collapse Timeline" [ref=e408]:
            - generic [ref=e409]:
              - generic [ref=e410]: ▼
              - generic [ref=e411]: Collapse
      - generic [ref=e412]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e414]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e415]
    - generic [ref=e417]:
      - generic [ref=e418]: "X: — Y: —"
      - generic [ref=e421]: 32×32
      - generic [ref=e424]: 1600%
      - generic [ref=e426]: Frame 1/1
      - generic [ref=e428]: Base Layer
      - generic [ref=e429]: pen
      - status "All changes saved to local storage" [ref=e434]:
        - generic [ref=e436]: Saved
  - alert [ref=e437]
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
> 16  |   await dialog.getByTestId('export-tab-palette-cycle').click();
      |                                                        ^ Error: locator.click: Test timeout of 60000ms exceeded.
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