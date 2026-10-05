# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: palette-cycle-compiled.spec.ts >> downloads two-second fire-only cycles at 3, 5, 8 and 15 FPS as APNG and GIF
- Location: docs\research\evidence\2026-10-05-audit-hardening\palette-cycle-compiled.spec.ts:6:5

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
        - button "Rename project Fire and wood" [ref=e180] [cursor=pointer]: Fire and wood
        - generic "Canvas size · change it in File" [ref=e181]: 32×32
        - button "Save now" [ref=e182]:
          - generic [ref=e183]: Save
        - generic [ref=e185]:
          - generic [ref=e186]:
            - button "Undo last action" [disabled]
          - generic [ref=e187]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e188]:
        - generic "Tool options rail" [ref=e189]:
          - generic [ref=e190]: "Pen:"
          - generic [ref=e191]:
            - button "Brush size 1 pixels" [ref=e192]:
              - generic [ref=e193]: Size
              - generic [ref=e194]: 1 px
              - generic [ref=e195]: ▾
            - generic "Quick brush size presets" [ref=e196]:
              - button "1px brush preset" [pressed] [ref=e197]: "1"
              - button "2px brush preset" [ref=e198]: "2"
              - button "3px brush preset" [ref=e199]: "3"
              - button "4px brush preset" [ref=e200]: "4"
            - button "Disable clean corners" [pressed] [ref=e201]:
              - generic [ref=e202]: Pixel-Perfect
      - generic [ref=e203]:
        - group "Canvas controls" [ref=e204]:
          - group "Mirror drawing" [ref=e205]:
            - generic [ref=e206]: Mirror
            - button "Horizontal symmetry" [ref=e208] [cursor=pointer]
            - button "Vertical symmetry" [ref=e210] [cursor=pointer]
          - generic [ref=e212]:
            - generic [ref=e213]:
              - button "Zoom Out" [ref=e214] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e216]: 1600%
              - button "Zoom In" [ref=e217] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e219] [cursor=pointer]: Fit
          - button "View options menu" [ref=e223] [cursor=pointer]:
            - generic [ref=e224]:
              - generic [ref=e225]: View
              - generic "1 active view options" [ref=e226]
            - generic [ref=e227]: ▼
        - group "Workspace presets" [ref=e228]:
          - combobox "Workspace layout" [ref=e229] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e230]:
          - button "Studio options" [ref=e231] [cursor=pointer]:
            - generic [ref=e232]: Studio
            - generic [ref=e233]: ▼
        - button "Export drawing" [ref=e235]:
          - generic [ref=e236]: Export
    - status [ref=e238]: Changes saved
    - generic [ref=e239]:
      - complementary [ref=e241]:
        - generic [ref=e243]:
          - group "Drawing" [ref=e244]:
            - button "Pen" [pressed] [ref=e246] [cursor=pointer]
            - button "Bézier Curve" [ref=e248] [cursor=pointer]
            - button "Eraser" [ref=e250] [cursor=pointer]
            - button "Flood Fill" [ref=e252] [cursor=pointer]
            - button "Pixel Gradient" [ref=e254] [cursor=pointer]
            - button "Dither Brush" [ref=e256] [cursor=pointer]
            - button "Color Replace" [ref=e258] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e260] [cursor=pointer]
          - group "Selection" [ref=e261]:
            - button "Marquee Box" [ref=e264] [cursor=pointer]
            - button "Lasso Select" [ref=e266] [cursor=pointer]
            - button "Magic Wand" [ref=e268] [cursor=pointer]
          - group "Geometry" [ref=e269]:
            - button "Line" [ref=e272] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e274] [cursor=pointer]
            - button "Rectangle" [ref=e276] [cursor=pointer]
            - button "Ellipse" [ref=e278] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e279]:
            - button "Normal Chisel" [ref=e282] [cursor=pointer]
          - group "Utility" [ref=e283]:
            - button "Eyedropper" [ref=e286] [cursor=pointer]
        - generic [ref=e287]:
          - generic [ref=e288]:
            - button "Swap colors (X)" [ref=e289] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e290] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e291] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e292] [cursor=pointer]'
          - generic [ref=e293]:
            - generic [ref=e294]:
              - 'button "#080808 (Click: Primary | Right-click: Secondary)" [ref=e295] [cursor=pointer]'
              - 'button "#664422 (Click: Primary | Right-click: Secondary)" [ref=e296] [cursor=pointer]'
              - 'button "#C43C18 (Click: Primary | Right-click: Secondary)" [ref=e297] [cursor=pointer]'
              - 'button "#D88000 (Click: Primary | Right-click: Secondary)" [ref=e298] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e299] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e303]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e304]
      - complementary [ref=e307]:
        - generic [ref=e308]:
          - button "Tools" [ref=e309]
          - button "Layers" [ref=e311]
          - button "Palette" [pressed] [ref=e313]
          - button "PixiTools" [ref=e315]:
            - generic [ref=e316]: FX
        - generic [ref=e318]:
          - region "Pinned color panel" [ref=e319]:
            - generic [ref=e320]:
              - generic [ref=e321]:
                - generic [ref=e322]: Color Wheel
                - generic [ref=e323]:
                  - button "Foreground ·" [pressed] [ref=e324]:
                    - generic [ref=e326]: Foreground
                    - text: ·
                  - button "Background" [ref=e327]
              - generic [ref=e330]:
                - button "Collapse pinned color panel" [ref=e331]: ▲
                - button "Unpin color panel" [ref=e332]: ✕
            - generic [ref=e334]:
              - generic [ref=e335]:
                - generic [ref=e336]: Color picker
                - combobox "Color picker shape" [ref=e337]:
                  - option "Triangle" [selected]
                  - option "Square"
              - img "Saturation and value triangle. Use the sliders below for keyboard control." [ref=e341]
              - generic [ref=e342]:
                - generic [ref=e343]: Hue
                - slider "Picker hue" [ref=e344]: "264"
              - generic [ref=e345]:
                - generic [ref=e346]: Saturation
                - slider "Picker saturation" [ref=e347]: "39"
              - generic [ref=e348]:
                - generic [ref=e349]: Value
                - slider "Picker value" [ref=e350]: "30"
              - textbox "Picker hex color" [ref=e353]: "#3A2E4C"
          - generic [ref=e354]:
            - generic [ref=e355]:
              - generic [ref=e356]: Palette
              - combobox "Color palette preset" [ref=e357] [cursor=pointer]:
                - option "Cycle colors (6)" [selected]
            - generic [ref=e358]:
              - 'generic "Primary Color: #3A2E4C" [ref=e359]': "1"
              - generic [ref=e362]: "|"
              - 'generic "Secondary Color: #C792DF" [ref=e363]': "2"
          - button "Browse palettes Previews & favorites →" [ref=e366]:
            - text: Browse palettes
            - generic [ref=e367]: Previews & favorites →
          - generic [ref=e368]:
            - generic [ref=e369]:
              - 'button "Select color #080808" [ref=e370] [cursor=pointer]'
              - 'button "Select color #664422" [ref=e371] [cursor=pointer]'
              - 'button "Select color #C43C18" [ref=e372] [cursor=pointer]'
              - 'button "Select color #D88000" [ref=e373] [cursor=pointer]'
              - 'button "Select color #FF8C00" [ref=e374] [cursor=pointer]'
              - 'button "Select color #FFB833" [ref=e375] [cursor=pointer]'
            - generic [ref=e376]:
              - generic [ref=e377]: Choose a color
              - button "Remove color" [disabled] [ref=e378]
          - generic [ref=e380]:
            - button "Create palette" [ref=e381]
            - button "Scan Canvas" [ref=e383]
            - button "+ OKLCH Ramp" [ref=e385]:
              - generic [ref=e386]: + OKLCH
            - button "+ Lospec" [ref=e387]
          - group [ref=e389]:
            - generic "Roles and index bindings" [ref=e390] [cursor=pointer]
            - 'option "#0: #080808" [selected]'
            - 'option "#1: #664422"'
            - 'option "#2: #C43C18"'
            - 'option "#3: #D88000"'
            - 'option "#4: #FF8C00"'
            - 'option "#5: #FFB833"'
          - generic [ref=e391]:
            - generic [ref=e392]:
              - heading [level=3] [ref=e393]:
                - button "Cycle Engine" [expanded] [ref=e394] [cursor=pointer]:
                  - generic [ref=e397]: ▾
              - button "Play Cycle" [ref=e399]
            - generic [ref=e401]:
              - generic [ref=e402]:
                - generic [ref=e403]: Playback Speed
                - combobox "Playback Speed" [ref=e404]:
                  - option "0.25x"
                  - option "0.5x"
                  - option "1.0x"
                  - option "2.0x" [selected]
                  - option "4.0x"
              - generic [ref=e405]:
                - generic [ref=e406]: CYCLE TRACKS (1)
                - button "+ Import CRNG" [ref=e408] [cursor=pointer]
              - generic [ref=e411]:
                - heading [level=3] [ref=e412]:
                  - button "Track [2..5]" [ref=e413] [cursor=pointer]:
                    - generic [ref=e416]: ▸
                - generic [ref=e418]:
                  - generic [ref=e420]:
                    - checkbox [checked] [ref=e421]
                    - button [ref=e422] [cursor=pointer]
                  - button "CRNG" [ref=e423]
                  - button "Delete track" [ref=e425]
              - button "Add Color Range Track" [ref=e426]
    - contentinfo [ref=e430]:
      - generic [ref=e431]:
        - generic [ref=e432]:
          - generic [ref=e433]:
            - button "Play" [ref=e434]
            - button "Previous Frame (,)" [ref=e437]
            - button "Next Frame (.)" [ref=e439]
            - button "Repeat" [ref=e441]
          - generic [ref=e445]:
            - button "Preview speed" [ref=e447]:
              - generic [ref=e448]: Preview
              - generic [ref=e449]: 1×
              - generic [ref=e450]: ▾
            - generic [ref=e451]:
              - generic [ref=e452]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e453]: "100"
              - generic [ref=e454]: ms
            - button "Onion Skin" [ref=e455]
            - button "Onion skin settings" [ref=e458]: ⚙
        - generic [ref=e459]:
          - button "+ Frame" [ref=e460]:
            - generic [ref=e461]: Frame
          - group [ref=e463]:
            - generic "Frame actions" [ref=e464] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e465]: ▾
          - button "Collapse Timeline" [ref=e467]:
            - generic [ref=e468]:
              - generic [ref=e469]: ▼
              - generic [ref=e470]: Collapse
      - generic [ref=e471]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e473]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e474]
    - generic [ref=e476]:
      - generic [ref=e477]: "X: — Y: —"
      - generic [ref=e480]: 32×32
      - generic [ref=e483]: 1600%
      - generic [ref=e485]: Frame 1/1
      - generic [ref=e487]: Artwork
      - generic [ref=e488]: pen
      - status "All changes saved to local storage" [ref=e493]:
        - generic [ref=e495]: Saved
    - dialog [ref=e496]:
      - generic [ref=e497]:
        - generic [ref=e498]:
          - heading "✦ Export Studio Assets" [level=2] [ref=e499]
          - button "Close dialog" [ref=e500] [cursor=pointer]: ✕
        - generic [ref=e501]:
          - generic [ref=e502]:
            - generic [ref=e503]:
              - generic [ref=e504]: Image & Animation
              - generic [ref=e505]:
                - button "PNG" [active] [ref=e506] [cursor=pointer]
                - button "GIF" [ref=e507] [cursor=pointer]
                - button "APNG" [ref=e508] [cursor=pointer]
                - button "WebM Video" [ref=e509] [cursor=pointer]
                - button "MP4 Video" [ref=e510] [cursor=pointer]
                - button "Vector SVG" [ref=e511] [cursor=pointer]
                - button "Timelapse" [ref=e512] [cursor=pointer]
            - generic [ref=e513]:
              - generic [ref=e514]: Game Delivery
              - generic [ref=e515]:
                - button "Sprite Sheet" [ref=e516] [cursor=pointer]
                - button "Godot Kit" [ref=e517] [cursor=pointer]
                - button "Shaders" [ref=e518] [cursor=pointer]
                - button "Cycle Loop" [ref=e519] [cursor=pointer]
            - generic [ref=e520]:
              - generic [ref=e521]: Backup & Archive
              - button "Project Backup" [ref=e523] [cursor=pointer]
          - generic [ref=e524]:
            - generic [ref=e525]:
              - generic [ref=e526]: Loop length
              - group "Loop length" [ref=e527]:
                - button "1s" [ref=e528] [cursor=pointer]
                - button "2s" [pressed] [ref=e529] [cursor=pointer]
                - button "3s" [ref=e530] [cursor=pointer]
                - button "4s" [ref=e531] [cursor=pointer]
                - button "5s" [ref=e532] [cursor=pointer]
            - generic [ref=e533]:
              - generic [ref=e534]: Frame rate
              - group "Frame rate" [ref=e535]:
                - button "3 FPS" [ref=e536] [cursor=pointer]: "3"
                - button "5 FPS" [ref=e537] [cursor=pointer]: "5"
                - button "8 FPS" [ref=e538] [cursor=pointer]: "8"
                - button "10 FPS" [ref=e539] [cursor=pointer]: "10"
                - button "12 FPS" [ref=e540] [cursor=pointer]: "12"
                - button "15 FPS" [pressed] [ref=e541] [cursor=pointer]: "15"
                - button "24 FPS" [ref=e542] [cursor=pointer]: "24"
                - button "30 FPS" [ref=e543] [cursor=pointer]: "30"
            - generic [ref=e544]:
              - generic [ref=e545]: File format
              - group "Cycle file format" [ref=e546]:
                - button "APNG" [pressed] [ref=e547] [cursor=pointer]: apng
                - button "GIF" [ref=e548] [cursor=pointer]: gif
            - generic [ref=e549]:
              - generic [ref=e550]: Image size
              - group "Cycle image size" [ref=e551]:
                - button "1x" [pressed] [ref=e552] [cursor=pointer]
                - button "2x" [ref=e553] [cursor=pointer]
                - button "4x" [ref=e554] [cursor=pointer]
                - button "8x" [ref=e555] [cursor=pointer]
            - generic [ref=e556]:
              - status [ref=e557]: 30 frames · 2 seconds · 15 FPS
              - paragraph [ref=e558]: Uses this frame and enabled cycles. Speed adjusts to close the loop.
              - paragraph [ref=e559]: APNG keeps exact frame timing and full transparency.
          - generic [ref=e560]:
            - button "Cancel" [ref=e561]
            - button "Download cycle animation" [ref=e563]
  - alert [ref=e566]
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | import { readFile } from 'node:fs/promises';
  3   | import { inflateSync } from 'node:zlib';
  4   | import { apngTiming, gifHolds } from '../../../../tests/helpers/gameAnimationDownload';
  5   | 
  6   | test('downloads two-second fire-only cycles at 3, 5, 8 and 15 FPS as APNG and GIF', async ({ page }, testInfo) => {
  7   |   await page.setViewportSize({ width: 1280, height: 1000 });
  8   |   await page.addInitScript(() => localStorage.setItem('pixibun:tool-previews-disabled', 'true'));
  9   |   await page.goto('/studio');
  10  |   await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  11  |   await importFixture(page, await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 32; return c.toDataURL().split(',')[1]; }), false);
  12  |   await page.getByTestId('export-button').click();
  13  |   const dialog = page.getByRole('dialog', { name: 'Export Studio Assets' });
  14  |   await dialog.getByTestId('export-tab-palette-cycle').click();
  15  |   await expect(dialog.getByRole('button', { name: '8 FPS', exact: true })).toHaveAttribute('aria-pressed', 'true');
  16  |   await expect(dialog.getByRole('alert')).toContainText('at least two colors');
  17  |   await expect(dialog.getByRole('button', { name: 'Download cycle animation' })).toBeDisabled();
  18  |   await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  19  |   const image = await page.evaluate(() => {
  20  |     const c = document.createElement('canvas'); c.width = c.height = 32;
  21  |     const ctx = c.getContext('2d')!;
  22  |     ctx.fillStyle = '#080808'; ctx.fillRect(7, 4, 18, 19); ctx.fillRect(3, 22, 26, 7);
  23  |     ['#C43C18', '#D88000', '#FF8C00', '#FFB833'].forEach((color, i) => {
  24  |       ctx.fillStyle = color; ctx.fillRect(8 + i * 4, 5, 4, 17);
  25  |     });
  26  |     ctx.fillStyle = '#684628'; ctx.fillRect(4, 23, 24, 5);
  27  |     return c.toDataURL('image/png').split(',')[1];
  28  |   });
  29  |   await importFixture(page, image, true);
  30  |   await page.getByTestId('tab-palette').click();
  31  |   await page.getByRole('button', { name: /Cycle Engine/ }).click();
  32  |   await page.getByLabel('Playback Speed', { exact: true }).selectOption('2');
  33  |   const pixels = () => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
  34  |   const original = await pixels();
  35  |   for (const rate of [3, 5, 8, 15]) for (const format of ['apng', 'gif'] as const) {
  36  |     await page.getByTestId('export-button').click();
> 37  |     await dialog.getByTestId('export-tab-palette-cycle').click();
      |                                                          ^ Error: locator.click: Test timeout of 60000ms exceeded.
  38  |     await dialog.getByRole('button', { name: `${rate} FPS`, exact: true }).click();
  39  |     await dialog.getByRole('group', { name: 'Loop length' }).getByRole('button', { name: '2s', exact: true }).click();
  40  |     await dialog.getByRole('group', { name: 'Cycle file format' }).getByRole('button', { name: format.toUpperCase(), exact: true }).click();
  41  |     await dialog.getByRole('group', { name: 'Cycle image size' }).getByRole('button', { name: '1x', exact: true }).click();
  42  |     await expect(dialog.getByRole('group', { name: 'Cycle image size' }).getByRole('button', { name: '1x', exact: true })).toHaveAttribute('aria-pressed', 'true');
  43  |     await expect(dialog.getByRole('combobox', { name: 'Export frame scope' })).toHaveCount(0);
  44  |     await expect(dialog.getByRole('status')).toHaveText(`${rate * 2} frames · 2 seconds · ${rate} FPS`);
  45  |     await expect(dialog.getByRole('button', { name: `${rate} FPS`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  46  |     const boxes = await Promise.all((await dialog.getByRole('group', { name: 'Frame rate' }).getByRole('button').all()).map(button => button.boundingBox()));
  47  |     expect(Math.max(...boxes.map(b => b!.width)) - Math.min(...boxes.map(b => b!.width))).toBeLessThan(1);
  48  |     if (format === 'apng' && rate === 8) await page.screenshot({ path: testInfo.outputPath('cycle-export-low-fps.png'), animations: 'disabled' });
  49  |     const pending = page.waitForEvent('download');
  50  |     await dialog.getByRole('button', { name: 'Download cycle animation', exact: true }).click();
  51  |     const download = await pending, path = testInfo.outputPath(`fire-${rate}fps.${format === 'gif' ? 'gif' : 'png'}`);
  52  |     await download.saveAs(path); const bytes = await readFile(path);
  53  |     if (format === 'apng') {
  54  |       const timing = apngTiming(bytes);
  55  |       expect(timing.count).toBe(rate * 2); expect(timing.plays).toBe(0);
  56  |       timing.holds.forEach(hold => expect(hold).toBeCloseTo(1000 / rate, 8));
  57  |       expect(timing.holds.reduce((a, b) => a + b, 0)).toBeCloseTo(2000, 8);
  58  |       const decoded: number[][] = [];
  59  |       for (let offset = 8; offset < bytes.length;) {
  60  |         const length = bytes.readUInt32BE(offset), type = bytes.subarray(offset + 4, offset + 8).toString(), start = offset + 8;
  61  |         if (type === 'IDAT' || type === 'fdAT') {
  62  |           const raw = inflateSync(bytes.subarray(start + (type === 'fdAT' ? 4 : 0), start + length)), rgba: number[] = [];
  63  |           for (let y = 0; y < 32; y++) {
  64  |             expect(raw[y * 129]).toBe(0);
  65  |             rgba.push(...raw.subarray(y * 129 + 1, (y + 1) * 129));
  66  |           }
  67  |           decoded.push(rgba);
  68  |         }
  69  |         offset += length + 12;
  70  |       }
  71  |       expect(decoded).toHaveLength(rate * 2);
  72  |       const fireOffset = (5 * 32 + 8) * 4;
  73  |       expect(decoded[0].slice(fireOffset, fireOffset + 4)).toEqual(original.slice(fireOffset, fireOffset + 4));
  74  |       if (rate === 15) expect(decoded[2].slice(fireOffset, fireOffset + 3)).toEqual([255, 184, 51]);
  75  |       expect(new Set(decoded.map(frame => frame.slice(fireOffset, fireOffset + 3).join(','))).size).toBeGreaterThan(1);
  76  |       const outsideFire = original.map((_, i) => i).filter(i => {
  77  |         const pixel = Math.floor(i / 4), x = pixel % 32, y = Math.floor(pixel / 32);
  78  |         return x < 8 || x >= 24 || y < 5 || y >= 22;
  79  |       });
  80  |       const unchanged = outsideFire.map(i => original[i]);
  81  |       for (const frame of decoded) expect(outsideFire.map(i => frame[i])).toEqual(unchanged);
  82  |     } else {
  83  |       const holds = gifHolds(bytes);
  84  |       expect(holds).toHaveLength(rate * 2);
  85  |       expect(Math.min(...holds)).toBeGreaterThanOrEqual(Math.floor(100 / rate) * 10);
  86  |       expect(Math.max(...holds)).toBeLessThanOrEqual(Math.ceil(100 / rate) * 10);
  87  |       expect(holds.reduce((a, b) => a + b, 0)).toBe(2000);
  88  |     }
  89  |     await expect(dialog).toBeHidden();
  90  |     expect(await pixels()).toEqual(original);
  91  |   }
  92  | });
  93  | 
  94  | async function importFixture(page: import('@playwright/test').Page, image: string, active: boolean) {
  95  |   const project = { format: 'pixibun-project', version: 3, name: active ? 'Fire and wood' : 'No cycle yet', width: 32, height: 32, fps: 8, loopMode: 'repeat',
  96  |     palettes: [{ id: 'cycle-colors', name: 'Cycle colors', colors: active ? ['#080808', '#664422', '#C43C18', '#D88000', '#FF8C00', '#FFB833'] : ['#080808', '#FF8C00'], cycleTracks: active ? [{ id: 'fire', low: 2, high: 5, rate: 4, direction: 'forward', enabled: true, blendShift: false }] : [] }],
  97  |     currentPaletteId: 'cycle-colors', customRamps: [], clips: [], frames: [{ id: 'cycle-frame', durationMs: 100, layers: [{ id: 'cycle-layer', name: 'Artwork', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: image }] }], createdAt: 1000, updatedAt: 1000 };
  98  |   await page.locator('input[type=file]').first().setInputFiles({ name: 'cycle.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  99  |   const dialog = page.getByRole('dialog', { name: 'Import Project (.pixibun)' }); await dialog.getByRole('button', { name: 'Confirm Import' }).click(); await expect(dialog).toBeHidden();
  100 | }
  101 | 
```