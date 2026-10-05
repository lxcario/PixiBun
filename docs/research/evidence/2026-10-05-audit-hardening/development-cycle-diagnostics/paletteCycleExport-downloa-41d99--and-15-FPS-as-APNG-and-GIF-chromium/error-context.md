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
    - generic [ref=e11]:
      - button "Open issues overlay" [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: "1"
          - generic [ref=e15]: "2"
        - generic [ref=e16]:
          - text: Issue
          - generic [ref=e17]: s
      - button "Collapse issues badge" [ref=e18]
  - link "Skip to content" [ref=e21] [cursor=pointer]:
    - /url: "#main-workspace"
  - generic [ref=e23]:
    - banner [ref=e25]:
      - group "Project controls" [ref=e26]:
        - link "PixiBun Home" [ref=e27] [cursor=pointer]:
          - /url: /
          - generic [ref=e28]:
            - img "Bun, the PixiBun bunny" [ref=e30]
            - generic [ref=e194]:
              - generic [ref=e195]: PIXIBUN
              - generic [ref=e196]: ATELIER
        - button "File" [ref=e197]:
          - text: File
          - generic [ref=e198]: ▼
        - button "Rename project Untitled Sprite" [ref=e199] [cursor=pointer]: Untitled Sprite
        - generic "Canvas size · change it in File" [ref=e200]: 32×32
        - button "Save now" [ref=e201]:
          - generic [ref=e202]: Save
        - generic [ref=e204]:
          - button "Undo last action" [ref=e206] [cursor=pointer]
          - generic [ref=e207]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e208]:
        - generic "Tool options rail" [ref=e209]:
          - generic [ref=e210]: "Pen:"
          - generic [ref=e211]:
            - button "Brush size 1 pixels" [ref=e212]:
              - generic [ref=e213]: Size
              - generic [ref=e214]: 1 px
              - generic [ref=e215]: ▾
            - generic "Quick brush size presets" [ref=e216]:
              - button "1px brush preset" [pressed] [ref=e217]: "1"
              - button "2px brush preset" [ref=e218]: "2"
              - button "3px brush preset" [ref=e219]: "3"
              - button "4px brush preset" [ref=e220]: "4"
            - button "Disable clean corners" [pressed] [ref=e221]:
              - generic [ref=e222]: Pixel-Perfect
      - generic [ref=e223]:
        - group "Canvas controls" [ref=e224]:
          - group "Mirror drawing" [ref=e225]:
            - generic [ref=e226]: Mirror
            - button "Horizontal symmetry" [ref=e228] [cursor=pointer]
            - button "Vertical symmetry" [ref=e230] [cursor=pointer]
          - generic [ref=e232]:
            - generic [ref=e233]:
              - button "Zoom Out" [ref=e234] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e236]: 1600%
              - button "Zoom In" [ref=e237] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e239] [cursor=pointer]: Fit
          - button "View options menu" [ref=e243] [cursor=pointer]:
            - generic [ref=e244]:
              - generic [ref=e245]: View
              - generic "1 active view options" [ref=e246]
            - generic [ref=e247]: ▼
        - group "Workspace presets" [ref=e248]:
          - combobox "Workspace layout" [ref=e249] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e250]:
          - button "Studio options" [ref=e251] [cursor=pointer]:
            - generic [ref=e252]: Studio
            - generic [ref=e253]: ▼
        - button "Export drawing" [active] [ref=e255]:
          - generic [ref=e256]: Export
    - status [ref=e258]: Changes saved
    - generic [ref=e259]:
      - complementary [ref=e261]:
        - generic [ref=e263]:
          - group "Drawing" [ref=e264]:
            - button "Pen" [pressed] [ref=e266] [cursor=pointer]
            - button "Bézier Curve" [ref=e268] [cursor=pointer]
            - button "Eraser" [ref=e270] [cursor=pointer]
            - button "Flood Fill" [ref=e272] [cursor=pointer]
            - button "Pixel Gradient" [ref=e274] [cursor=pointer]
            - button "Dither Brush" [ref=e276] [cursor=pointer]
            - button "Color Replace" [ref=e278] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e280] [cursor=pointer]
          - group "Selection" [ref=e281]:
            - button "Marquee Box" [ref=e284] [cursor=pointer]
            - button "Lasso Select" [ref=e286] [cursor=pointer]
            - button "Magic Wand" [ref=e288] [cursor=pointer]
          - group "Geometry" [ref=e289]:
            - button "Line" [ref=e292] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e294] [cursor=pointer]
            - button "Rectangle" [ref=e296] [cursor=pointer]
            - button "Ellipse" [ref=e298] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e299]:
            - button "Normal Chisel" [ref=e302] [cursor=pointer]
          - group "Utility" [ref=e303]:
            - button "Eyedropper" [ref=e306] [cursor=pointer]
        - generic [ref=e307]:
          - generic [ref=e308]:
            - button "Swap colors (X)" [ref=e309] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e310] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e311] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e312] [cursor=pointer]'
          - generic [ref=e313]:
            - generic [ref=e314]:
              - 'button "#080808 (Click: Primary | Right-click: Secondary)" [ref=e315] [cursor=pointer]'
              - 'button "#FF8C00 (Click: Primary | Right-click: Secondary)" [ref=e316] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e317] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e321]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e322]
      - complementary [ref=e325]:
        - generic [ref=e326]:
          - button "Tools" [ref=e327]
          - button "Layers" [pressed] [ref=e329]
          - button "Palette" [ref=e331]
          - button "PixiTools" [ref=e333]:
            - generic [ref=e334]: FX
        - generic [ref=e336]:
          - generic [ref=e337]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e338]:
              - text: Frame 1 · Layers
              - generic [ref=e339]: (1)
            - generic [ref=e340]:
              - button "Add New Layer" [ref=e341]
              - button "Duplicate Layer" [ref=e343]
              - button "Merge Down" [disabled] [ref=e345]
              - button "Delete Layer" [disabled] [ref=e347]
          - generic [ref=e349]:
            - generic [ref=e350]:
              - generic [ref=e351]: Opacity
              - slider "Layer opacity" [ref=e352] [cursor=pointer]: "100"
              - generic [ref=e353]: 100%
            - generic [ref=e354]:
              - generic [ref=e355]: Blend
              - combobox "Layer blend mode" [ref=e356] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e358]:
            - generic [ref=e359]:
              - button "Reorder layer Base Layer" [disabled] [ref=e360]:
                - generic [ref=e361]: ⠿
              - generic [ref=e362]:
                - button "Select layer Base Layer. Double click to rename" [ref=e363] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e364] [cursor=pointer]
            - generic [ref=e365]:
              - button "Lock layer Base Layer" [ref=e366]
              - button "Hide layer Base Layer" [ref=e367]
    - contentinfo [ref=e369]:
      - generic [ref=e370]:
        - generic [ref=e371]:
          - generic [ref=e372]:
            - button "Play" [ref=e373]
            - button "Previous Frame (,)" [ref=e376]
            - button "Next Frame (.)" [ref=e378]
            - button "Repeat" [ref=e380]
          - generic [ref=e384]:
            - button "Preview speed" [ref=e386]:
              - generic [ref=e387]: Preview
              - generic [ref=e388]: 1×
              - generic [ref=e389]: ▾
            - generic [ref=e390]:
              - generic [ref=e391]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e392]: "100"
              - generic [ref=e393]: ms
            - button "Onion Skin" [ref=e394]
            - button "Onion skin settings" [ref=e397]: ⚙
        - generic [ref=e398]:
          - button "+ Frame" [ref=e399]:
            - generic [ref=e400]: Frame
          - group [ref=e402]:
            - generic "Frame actions" [ref=e403] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e404]: ▾
          - button "Collapse Timeline" [ref=e406]:
            - generic [ref=e407]:
              - generic [ref=e408]: ▼
              - generic [ref=e409]: Collapse
      - generic [ref=e410]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e412]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e413]
    - generic [ref=e415]:
      - generic [ref=e416]: "X: — Y: —"
      - generic [ref=e419]: 32×32
      - generic [ref=e422]: 1600%
      - generic [ref=e424]: Frame 1/1
      - generic [ref=e426]: Base Layer
      - generic [ref=e427]: pen
      - status "All changes saved to local storage" [ref=e432]:
        - generic [ref=e434]: Saved
  - alert [ref=e435]
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