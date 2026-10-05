# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: memoryPaths.spec.ts >> compiled timeline and backup retain exact pixels with bounded preview and encoding work
- Location: tests\production\memoryPaths.spec.ts:4:5

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 2
Received:    3
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
        - button "Rename project Memory fixture" [ref=e180] [cursor=pointer]: Memory fixture
        - generic "Canvas size · change it in File" [ref=e181]: 128×128
        - button "Save now" [ref=e182]:
          - generic [ref=e183]: Save
        - generic [ref=e185]:
          - button "Undo last action" [ref=e187] [cursor=pointer]
          - generic [ref=e188]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e189]:
        - generic "Tool options rail" [ref=e190]:
          - generic [ref=e191]: "Eraser:"
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
      - generic [ref=e202]:
        - group "Canvas controls" [ref=e203]:
          - group "Mirror drawing" [ref=e204]:
            - generic [ref=e205]: Mirror
            - button "Horizontal symmetry" [ref=e207] [cursor=pointer]
            - button "Vertical symmetry" [ref=e209] [cursor=pointer]
          - generic [ref=e211]:
            - generic [ref=e212]:
              - button "Zoom Out" [ref=e213] [cursor=pointer]: −
              - button "Zoom 300 percent. Choose zoom level" [ref=e215]: 300%
              - button "Zoom In" [ref=e216] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e218] [cursor=pointer]: Fit
          - button "View options menu" [ref=e222] [cursor=pointer]:
            - generic [ref=e223]:
              - generic [ref=e224]: View
              - generic "1 active view options" [ref=e225]
            - generic [ref=e226]: ▼
        - group "Workspace presets" [ref=e227]:
          - combobox "Workspace layout" [ref=e228] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e229]:
          - button "Studio options" [ref=e230] [cursor=pointer]:
            - generic [ref=e231]: Studio
            - generic [ref=e232]: ▼
        - button "Export drawing" [active] [ref=e234]:
          - generic [ref=e235]: Export
    - status [ref=e237]: Changes saved
    - generic [ref=e238]:
      - complementary [ref=e240]:
        - generic [ref=e242]:
          - group "Drawing" [ref=e243]:
            - button "Pen" [ref=e245] [cursor=pointer]
            - button "Bézier Curve" [ref=e247] [cursor=pointer]
            - button "Eraser" [pressed] [ref=e249] [cursor=pointer]
            - button "Flood Fill" [ref=e251] [cursor=pointer]
            - button "Pixel Gradient" [ref=e253] [cursor=pointer]
            - button "Dither Brush" [ref=e255] [cursor=pointer]
            - button "Color Replace" [ref=e257] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e259] [cursor=pointer]
          - group "Selection" [ref=e260]:
            - button "Marquee Box" [ref=e263] [cursor=pointer]
            - button "Lasso Select" [ref=e265] [cursor=pointer]
            - button "Magic Wand" [ref=e267] [cursor=pointer]
          - group "Geometry" [ref=e268]:
            - button "Line" [ref=e271] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e273] [cursor=pointer]
            - button "Rectangle" [ref=e275] [cursor=pointer]
            - button "Ellipse" [ref=e277] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e278]:
            - button "Normal Chisel" [ref=e281] [cursor=pointer]
          - group "Utility" [ref=e282]:
            - button "Eyedropper" [ref=e285] [cursor=pointer]
        - generic [ref=e286]:
          - generic [ref=e287]:
            - button "Swap colors (X)" [ref=e288] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e289] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e290] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e291] [cursor=pointer]'
          - generic [ref=e292]:
            - 'button "#ff0000 (Click: Primary | Right-click: Secondary)" [ref=e294] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e295] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e299]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e300]
      - complementary [ref=e303]:
        - generic [ref=e304]:
          - button "Tools" [ref=e305]
          - button "Layers" [pressed] [ref=e307]
          - button "Palette" [ref=e309]
          - button "PixiTools" [ref=e311]:
            - generic [ref=e312]: FX
        - generic [ref=e314]:
          - generic [ref=e315]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e316]:
              - text: Frame 1 · Layers
              - generic [ref=e317]: (1)
            - generic [ref=e318]:
              - button "Add New Layer" [ref=e319]
              - button "Duplicate Layer" [ref=e321]
              - button "Merge Down" [disabled] [ref=e323]
              - button "Delete Layer" [disabled] [ref=e325]
          - generic [ref=e327]:
            - generic [ref=e328]:
              - generic [ref=e329]: Opacity
              - slider "Layer opacity" [ref=e330] [cursor=pointer]: "100"
              - generic [ref=e331]: 100%
            - generic [ref=e332]:
              - generic [ref=e333]: Blend
              - combobox "Layer blend mode" [ref=e334] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e336]:
            - generic [ref=e337]:
              - button "Reorder layer Body" [disabled] [ref=e338]:
                - generic [ref=e339]: ⠿
              - generic [ref=e340]:
                - button "Select layer Body. Double click to rename" [ref=e341] [cursor=pointer]: Body
                - button "Rename layer Body" [ref=e342] [cursor=pointer]
            - generic [ref=e343]:
              - button "Lock layer Body" [ref=e344]
              - button "Hide layer Body" [ref=e345]
    - contentinfo [ref=e347]:
      - generic [ref=e348]:
        - generic [ref=e349]:
          - generic [ref=e350]:
            - button "Play" [ref=e351]
            - button "Previous Frame (,)" [ref=e354]
            - button "Next Frame (.)" [ref=e356]
            - button "Repeat" [ref=e358]
          - generic [ref=e362]:
            - button "Preview speed" [ref=e364]:
              - generic [ref=e365]: Preview
              - generic [ref=e366]: 1×
              - generic [ref=e367]: ▾
            - generic [ref=e368]:
              - generic [ref=e369]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e370]: "100"
              - generic [ref=e371]: ms
            - button "Onion Skin" [ref=e372]
            - button "Onion skin settings" [ref=e375]: ⚙
        - generic [ref=e376]:
          - button "+ Frame" [ref=e377]:
            - generic [ref=e378]: Frame
          - group [ref=e380]:
            - generic "Frame actions" [ref=e381] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e382]: ▾
          - button "Collapse Timeline" [ref=e384]:
            - generic [ref=e385]:
              - generic [ref=e386]: ▼
              - generic [ref=e387]: Collapse
      - generic [ref=e388]:
        - generic [ref=e389]:
          - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e390]':
            - generic:
              - generic: "#1"
              - generic: 100ms
          - 'button "Select frame 2. Duration: 100ms. Drag to reorder." [ref=e391]':
            - generic:
              - generic: "#2"
              - generic: 100ms
          - 'button "Select frame 3. Duration: 100ms. Drag to reorder." [ref=e392]':
            - generic:
              - generic: "#3"
              - generic: 100ms
          - 'button "Select frame 4. Duration: 100ms. Drag to reorder." [ref=e393]':
            - generic:
              - generic: "#4"
              - generic: 100ms
          - 'button "Select frame 5. Duration: 100ms. Drag to reorder." [ref=e394]':
            - generic:
              - generic: "#5"
              - generic: 100ms
          - 'button "Select frame 6. Duration: 100ms. Drag to reorder." [ref=e395]':
            - generic:
              - generic: "#6"
              - generic: 100ms
          - 'button "Select frame 7. Duration: 100ms. Drag to reorder." [ref=e396]':
            - generic:
              - generic: "#7"
              - generic: 100ms
          - 'button "Select frame 8. Duration: 100ms. Drag to reorder." [ref=e397]':
            - generic:
              - generic: "#8"
              - generic: 100ms
          - 'button "Select frame 9. Duration: 100ms. Drag to reorder." [ref=e398]':
            - generic:
              - generic: "#9"
              - generic: 100ms
          - 'button "Select frame 10. Duration: 100ms. Drag to reorder." [ref=e399]':
            - generic:
              - generic: "#10"
              - generic: 100ms
          - 'button "Select frame 11. Duration: 100ms. Drag to reorder." [ref=e400]':
            - generic:
              - generic: "#11"
              - generic: 100ms
          - 'button "Select frame 12. Duration: 100ms. Drag to reorder." [ref=e401]':
            - generic:
              - generic: "#12"
              - generic: 100ms
          - 'button "Select frame 13. Duration: 100ms. Drag to reorder." [ref=e402]':
            - generic:
              - generic: "#13"
              - generic: 100ms
          - 'button "Select frame 14. Duration: 100ms. Drag to reorder." [ref=e403]':
            - generic:
              - generic: "#14"
              - generic: 100ms
          - 'button "Select frame 15. Duration: 100ms. Drag to reorder." [ref=e404]':
            - generic:
              - generic: "#15"
              - generic: 100ms
          - 'button "Select frame 16. Duration: 100ms. Drag to reorder." [ref=e405]':
            - generic:
              - generic: "#16"
              - generic: 100ms
          - 'button "Select frame 17. Duration: 100ms. Drag to reorder." [ref=e406]':
            - generic:
              - generic: "#17"
              - generic: 100ms
          - 'button "Select frame 18. Duration: 100ms. Drag to reorder." [ref=e407]':
            - generic:
              - generic: "#18"
              - generic: 100ms
          - 'button "Select frame 19. Duration: 100ms. Drag to reorder." [ref=e408]':
            - generic:
              - generic: "#19"
              - generic: 100ms
          - 'button "Select frame 20. Duration: 100ms. Drag to reorder." [ref=e409]':
            - generic:
              - generic: "#20"
              - generic: 100ms
          - 'button "Select frame 21. Duration: 100ms. Drag to reorder." [ref=e410]':
            - generic:
              - generic: "#21"
              - generic: 100ms
          - 'button "Select frame 22. Duration: 100ms. Drag to reorder." [ref=e411]':
            - generic:
              - generic: "#22"
              - generic: 100ms
          - 'button "Select frame 23. Duration: 100ms. Drag to reorder." [ref=e412]':
            - generic:
              - generic: "#23"
              - generic: 100ms
          - 'button "Select frame 24. Duration: 100ms. Drag to reorder." [ref=e413]':
            - generic:
              - generic: "#24"
              - generic: 100ms
          - 'button "Select frame 25. Duration: 100ms. Drag to reorder." [ref=e414]':
            - generic:
              - generic: "#25"
              - generic: 100ms
          - 'button "Select frame 26. Duration: 100ms. Drag to reorder." [ref=e415]':
            - generic:
              - generic: "#26"
              - generic: 100ms
          - 'button "Select frame 27. Duration: 100ms. Drag to reorder." [ref=e416]':
            - generic:
              - generic: "#27"
              - generic: 100ms
          - 'button "Select frame 28. Duration: 100ms. Drag to reorder." [ref=e417]':
            - generic:
              - generic: "#28"
              - generic: 100ms
          - 'button "Select frame 29. Duration: 100ms. Drag to reorder." [ref=e418]':
            - generic:
              - generic: "#29"
              - generic: 100ms
          - 'button "Select frame 30. Duration: 100ms. Drag to reorder." [ref=e419]':
            - generic:
              - generic: "#30"
              - generic: 100ms
          - 'button "Select frame 31. Duration: 100ms. Drag to reorder." [ref=e420]':
            - generic:
              - generic: "#31"
              - generic: 100ms
          - 'button "Select frame 32. Duration: 100ms. Drag to reorder." [ref=e421]':
            - generic:
              - generic: "#32"
              - generic: 100ms
          - 'button "Select frame 33. Duration: 100ms. Drag to reorder." [ref=e422]':
            - generic:
              - generic: "#33"
              - generic: 100ms
          - 'button "Select frame 34. Duration: 100ms. Drag to reorder." [ref=e423]':
            - generic:
              - generic: "#34"
              - generic: 100ms
          - 'button "Select frame 35. Duration: 100ms. Drag to reorder." [ref=e424]':
            - generic:
              - generic: "#35"
              - generic: 100ms
          - 'button "Select frame 36. Duration: 100ms. Drag to reorder." [ref=e425]':
            - generic:
              - generic: "#36"
              - generic: 100ms
          - 'button "Select frame 37. Duration: 100ms. Drag to reorder." [ref=e426]':
            - generic:
              - generic: "#37"
              - generic: 100ms
          - 'button "Select frame 38. Duration: 100ms. Drag to reorder." [ref=e427]':
            - generic:
              - generic: "#38"
              - generic: 100ms
          - 'button "Select frame 39. Duration: 100ms. Drag to reorder." [ref=e428]':
            - generic:
              - generic: "#39"
              - generic: 100ms
          - 'button "Select frame 40. Duration: 100ms. Drag to reorder." [ref=e429]':
            - generic:
              - generic: "#40"
              - generic: 100ms
          - 'button "Select frame 41. Duration: 100ms. Drag to reorder." [ref=e430]':
            - generic:
              - generic: "#41"
              - generic: 100ms
          - 'button "Select frame 42. Duration: 100ms. Drag to reorder." [ref=e431]':
            - generic:
              - generic: "#42"
              - generic: 100ms
          - 'button "Select frame 43. Duration: 100ms. Drag to reorder." [ref=e432]':
            - generic:
              - generic: "#43"
              - generic: 100ms
          - 'button "Select frame 44. Duration: 100ms. Drag to reorder." [ref=e433]':
            - generic:
              - generic: "#44"
              - generic: 100ms
          - 'button "Select frame 45. Duration: 100ms. Drag to reorder." [ref=e434]':
            - generic:
              - generic: "#45"
              - generic: 100ms
          - 'button "Select frame 46. Duration: 100ms. Drag to reorder." [ref=e435]':
            - generic:
              - generic: "#46"
              - generic: 100ms
          - 'button "Select frame 47. Duration: 100ms. Drag to reorder." [ref=e436]':
            - generic:
              - generic: "#47"
              - generic: 100ms
          - 'button "Select frame 48. Duration: 100ms. Drag to reorder." [ref=e437]':
            - generic:
              - generic: "#48"
              - generic: 100ms
          - 'button "Select frame 49. Duration: 100ms. Drag to reorder." [ref=e438]':
            - generic:
              - generic: "#49"
              - generic: 100ms
          - 'button "Select frame 50. Duration: 100ms. Drag to reorder." [ref=e439]':
            - generic:
              - generic: "#50"
              - generic: 100ms
          - 'button "Select frame 51. Duration: 100ms. Drag to reorder." [ref=e440]':
            - generic:
              - generic: "#51"
              - generic: 100ms
          - 'button "Select frame 52. Duration: 100ms. Drag to reorder." [ref=e441]':
            - generic:
              - generic: "#52"
              - generic: 100ms
          - 'button "Select frame 53. Duration: 100ms. Drag to reorder." [ref=e442]':
            - generic:
              - generic: "#53"
              - generic: 100ms
          - 'button "Select frame 54. Duration: 100ms. Drag to reorder." [ref=e443]':
            - generic:
              - generic: "#54"
              - generic: 100ms
          - 'button "Select frame 55. Duration: 100ms. Drag to reorder." [ref=e444]':
            - generic:
              - generic: "#55"
              - generic: 100ms
          - 'button "Select frame 56. Duration: 100ms. Drag to reorder." [ref=e445]':
            - generic:
              - generic: "#56"
              - generic: 100ms
          - 'button "Select frame 57. Duration: 100ms. Drag to reorder." [ref=e446]':
            - generic:
              - generic: "#57"
              - generic: 100ms
          - 'button "Select frame 58. Duration: 100ms. Drag to reorder." [ref=e447]':
            - generic:
              - generic: "#58"
              - generic: 100ms
          - 'button "Select frame 59. Duration: 100ms. Drag to reorder." [ref=e448]':
            - generic:
              - generic: "#59"
              - generic: 100ms
          - 'button "Select frame 60. Duration: 100ms. Drag to reorder." [ref=e449]':
            - generic:
              - generic: "#60"
              - generic: 100ms
          - 'button "Select frame 61. Duration: 100ms. Drag to reorder." [ref=e450]':
            - generic:
              - generic: "#61"
              - generic: 100ms
          - 'button "Select frame 62. Duration: 100ms. Drag to reorder." [ref=e451]':
            - generic:
              - generic: "#62"
              - generic: 100ms
          - 'button "Select frame 63. Duration: 100ms. Drag to reorder." [ref=e452]':
            - generic:
              - generic: "#63"
              - generic: 100ms
          - 'button "Select frame 64. Duration: 100ms. Drag to reorder." [ref=e453]':
            - generic:
              - generic: "#64"
              - generic: 100ms
        - button "Clips" [ref=e454]
    - generic [ref=e456]:
      - generic [ref=e457]: "X: — Y: —"
      - generic [ref=e460]: 128×128
      - generic [ref=e463]: 300%
      - generic [ref=e465]: Frame 1/64
      - generic [ref=e467]: Body
      - generic [ref=e468]: eraser
      - status "All changes saved to local storage" [ref=e473]:
        - generic [ref=e475]: Saved
  - alert [ref=e476]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { readFile, writeFile } from 'node:fs/promises';
  3  | 
  4  | test('compiled timeline and backup retain exact pixels with bounded preview and encoding work', async ({ page }, info) => {
  5  |   await page.addInitScript(() => {
  6  |     Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true });
  7  |     const stats = { draws: 0, encodes: 0, peakEncodes: 0, pending: 0 };
  8  |     Object.assign(window, { memoryPathStats: stats });
  9  |     const draw = CanvasRenderingContext2D.prototype.drawImage;
  10 |     CanvasRenderingContext2D.prototype.drawImage = function(...args: unknown[]) {
  11 |       if (this.canvas instanceof HTMLCanvasElement && this.canvas.matches('[data-testid^="frame-thumbnail"]')) stats.draws++;
  12 |       return Reflect.apply(draw, this, args);
  13 |     };
  14 |     const encode = HTMLCanvasElement.prototype.toBlob;
  15 |     HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
  16 |       stats.encodes++; stats.pending++; stats.peakEncodes = Math.max(stats.peakEncodes, stats.pending);
  17 |       return encode.call(this, blob => { stats.pending--; callback(blob); }, ...args);
  18 |     };
  19 |   });
  20 |   await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  21 |   const fixture = await page.evaluate(() => {
  22 |     const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  23 |     const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 128, 128);
  24 |     ctx.fillStyle = '#00ff00'; ctx.fillRect(32, 32, 32, 32);
  25 |     const pngBase64 = canvas.toDataURL().split(',')[1];
  26 |     return { format: 'pixibun-project', version: 3, name: 'Memory fixture', width: 128, height: 128, fps: 8, loopMode: 'repeat',
  27 |       palettes: [{ id: 'colors', name: 'Colors', colors: ['#ff0000'] }], currentPaletteId: 'colors', customRamps: [], clips: [],
  28 |       frames: Array.from({ length: 64 }, (_, i) => ({ id: `frame-${i}`, durationMs: 100, layers: [{ id: `layer-${i}`, name: 'Body', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64 }] })), createdAt: 1, updatedAt: 1 };
  29 |   });
  30 |   await page.locator('input[type=file]').first().setInputFiles({ name: 'memory.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  31 |   const dialog = page.getByRole('dialog', { name: 'Import Project (.pixibun)' });
  32 |   await dialog.getByRole('button', { name: 'Confirm Import' }).click(); await expect(dialog).toBeHidden();
  33 |   await expect(page.getByTestId('frame-thumbnail-0')).toBeVisible();
  34 |   await page.getByTestId('fit-canvas-button').click();
  35 |   await page.getByTestId('save-button').click();
  36 |   await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible();
  37 |   const retained = await page.locator('[data-testid^="frame-thumbnail"]').evaluateAll(elements => elements.map(element => {
  38 |     const canvas = element as HTMLCanvasElement; return { width: canvas.width, height: canvas.height };
  39 |   }));
  40 |   await page.evaluate(() => { (window as unknown as { memoryPathStats: { draws: number } }).memoryPathStats.draws = 0; });
  41 |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('e');
  42 |   const canvas = page.getByTestId('main-composite-canvas'), box = (await canvas.boundingBox())!;
  43 |   const inputStarted = Date.now();
  44 |   await page.mouse.click(box.x + box.width * 40.5 / 128, box.y + box.height * 40.5 / 128);
  45 |   await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(40, 40, 1, 1).data[3])).toBe(0);
  46 |   const inputObservedMs = Date.now() - inputStarted;
  47 |   const strokeDraws = await page.evaluate(() => (window as unknown as { memoryPathStats: { draws: number } }).memoryPathStats.draws);
  48 |   const editedPng = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL().split(',')[1]);
  49 |   const before = await page.evaluate(() => {
  50 |     const stats = (window as unknown as { memoryPathStats: { draws: number; peakEncodes: number } }).memoryPathStats;
  51 |     stats.draws = 0; stats.peakEncodes = 0; return performance.now();
  52 |   });
  53 |   await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-project').click();
  54 |   const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download project backup', exact: true }).click();
  55 |   const path = await (await download).path(); expect(path).toBeTruthy();
  56 |   const project = JSON.parse(await readFile(path!, 'utf8'));
  57 |   expect(project.frames).toHaveLength(64);
  58 |   expect(project.frames.map((frame: { layers: { pngBase64: string }[] }) => frame.layers[0].pngBase64)).toEqual(fixture.frames.map((f, i) => i === 0 ? editedPng : f.layers[0].pngBase64));
  59 |   const metrics = await page.evaluate(start => ({ elapsedMs: performance.now() - start, ...(window as unknown as { memoryPathStats: { draws: number; peakEncodes: number } }).memoryPathStats }), before);
  60 |   await info.attach('memory-path-measurement', { body: JSON.stringify({ retained, backingBytes: retained.reduce((n, c) => n + c.width * c.height * 4, 0), metrics }, null, 2), contentType: 'application/json' });
  61 |   await writeFile(`docs/research/evidence/2026-10-05-audit-phase4/${process.env.PIXIBUN_MEMORY_BASELINE ? 'baseline' : 'after'}-${info.project.name}.json`, JSON.stringify({ retained, backingBytes: retained.reduce((n, c) => n + c.width * c.height * 4, 0), metrics, strokeDraws, inputObservedMs }, null, 2));
  62 |   if (!process.env.PIXIBUN_MEMORY_BASELINE) {
  63 |     expect(retained.length).toBeLessThan(32); expect(retained.every(c => c.width <= 24 && c.height <= 24)).toBe(true);
> 64 |     expect((metrics as { peakEncodes: number }).peakEncodes).toBeLessThanOrEqual(2);
     |                                                              ^ Error: expect(received).toBeLessThanOrEqual(expected)
  65 |     expect(strokeDraws).toBeLessThanOrEqual(4);
  66 |   }
  67 |   await page.getByRole('button', { name: /Select frame 64\./ }).scrollIntoViewIfNeeded();
  68 |   await expect(page.getByTestId('frame-thumbnail-63')).toBeVisible();
  69 |   expect(await page.getByTestId('frame-thumbnail-63').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(Math.floor(c.width * 0.375), Math.floor(c.height * 0.375), 1, 1).data))).toEqual([0, 255, 0, 255]);
  70 | });
  71 | 
  72 | test('compiled small previews match native composites with alpha, blends, hidden layers and rectangular artwork', async ({ page }) => {
  73 |   await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  74 |   const fixture = await page.evaluate(() => {
  75 |     const png = (color: string) => {
  76 |       const c = document.createElement('canvas'); c.width = 48; c.height = 24;
  77 |       const ctx = c.getContext('2d')!; ctx.fillStyle = color; ctx.fillRect(0, 0, 48, 24);
  78 |       ctx.clearRect(12, 6, 12, 6); return c.toDataURL().split(',')[1];
  79 |     };
  80 |     const layer = (id: string, color: string, opacity: number, blendMode: string, visible = true) => ({ id, name: id, opacity, blendMode, visible, locked: false, pngBase64: png(color) });
  81 |     return { format: 'pixibun-project', version: 3, name: 'Preview blend fixture', width: 48, height: 24, fps: 8, loopMode: 'repeat',
  82 |       palettes: [{ id: 'colors', name: 'Colors', colors: ['#ff0000'] }], currentPaletteId: 'colors', customRamps: [], clips: [],
  83 |       frames: [{ id: 'frame', durationMs: 100, layers: [layer('hidden', '#ff0000', 1, 'source-over', false), layer('light', '#80ff8080', 0.4, 'screen'), layer('base', '#40208080', 0.7, 'source-over')] }], createdAt: 1, updatedAt: 1 };
  84 |   });
  85 |   await page.locator('input[type=file]').first().setInputFiles({ name: 'blend.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  86 |   const dialog = page.getByRole('dialog', { name: 'Import Project (.pixibun)' }); await dialog.getByRole('button', { name: 'Confirm Import' }).click(); await expect(dialog).toBeHidden();
  87 |   await expect(page.getByTestId('frame-thumbnail-0')).toBeVisible();
  88 |   const comparison = await page.evaluate(() => {
  89 |     const source = document.querySelector<HTMLCanvasElement>('[data-testid=main-composite-canvas]')!;
  90 |     const actual = document.querySelector<HTMLCanvasElement>('[data-testid=frame-thumbnail-0]')!;
  91 |     const expected = document.createElement('canvas'); expected.width = 24; expected.height = 12;
  92 |     const ctx = expected.getContext('2d')!; ctx.imageSmoothingEnabled = false; ctx.drawImage(source, 0, 0, 24, 12);
  93 |     return { width: actual.width, height: actual.height, expected: Array.from(ctx.getImageData(0, 0, 24, 12).data), actual: Array.from(actual.getContext('2d')!.getImageData(0, 0, actual.width, actual.height).data) };
  94 |   });
  95 |   expect(comparison.width).toBe(24); expect(comparison.height).toBe(12); expect(comparison.actual).toEqual(comparison.expected);
  96 | });
  97 | 
```