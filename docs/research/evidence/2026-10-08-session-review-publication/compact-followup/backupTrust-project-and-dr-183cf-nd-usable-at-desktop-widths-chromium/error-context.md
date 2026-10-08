# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: backupTrust.spec.ts >> project and drawing controls stay grouped, visible and usable at desktop widths
- Location: tests\e2e\backupTrust.spec.ts:78:5

# Error details

```
Error: header control bounds and overlap at 1280px with pen

header control bounds and overlap at 1280px with pen

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
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
        - button "Rename project A long sprite project name for header placement checks" [ref=e180] [cursor=pointer]: A long sprite project name for header placement checks
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
            - button "Disable clean corners" [pressed] [ref=e196]:
              - generic [ref=e197]: Pixel-Perfect
      - generic [ref=e198]:
        - group "Canvas controls" [ref=e199]:
          - group "Mirror drawing" [ref=e200]:
            - generic [ref=e201]: Mirror
            - button "Horizontal symmetry" [ref=e203] [cursor=pointer]
            - button "Vertical symmetry" [ref=e205] [cursor=pointer]
          - generic [ref=e207]:
            - generic [ref=e208]:
              - button "Zoom Out" [ref=e209] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e211]: 1600%
              - button "Zoom In" [ref=e212] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e214] [cursor=pointer]: Fit
          - button "View options menu" [ref=e218] [cursor=pointer]:
            - generic [ref=e219]:
              - generic [ref=e220]: View
              - generic "1 active view options" [ref=e221]
            - generic [ref=e222]: ▼
        - group "Workspace presets" [ref=e223]:
          - combobox "Workspace layout" [ref=e224] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e225]:
          - button "Studio options" [ref=e226] [cursor=pointer]:
            - generic [ref=e227]: Studio
            - generic [ref=e228]: ▼
        - button "Export drawing" [ref=e230]:
          - generic [ref=e231]: Export
    - status [ref=e233]: Changes saved
    - generic [ref=e234]:
      - complementary [ref=e236]:
        - generic [ref=e238]:
          - group "Drawing" [ref=e239]:
            - button "Pen" [pressed] [ref=e241] [cursor=pointer]
            - button "Bézier Curve" [ref=e243] [cursor=pointer]
            - button "Eraser" [ref=e245] [cursor=pointer]
            - button "Flood Fill" [ref=e247] [cursor=pointer]
            - button "Pixel Gradient" [ref=e249] [cursor=pointer]
            - button "Dither Brush" [ref=e251] [cursor=pointer]
            - button "Color Replace" [ref=e253] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e255] [cursor=pointer]
          - group "Selection" [ref=e256]:
            - button "Marquee Box" [ref=e259] [cursor=pointer]
            - button "Lasso Select" [ref=e261] [cursor=pointer]
            - button "Magic Wand" [ref=e263] [cursor=pointer]
          - group "Geometry" [ref=e264]:
            - button "Line" [ref=e267] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e269] [cursor=pointer]
            - button "Rectangle" [ref=e271] [cursor=pointer]
            - button "Ellipse" [ref=e273] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e274]:
            - button "Normal Chisel" [ref=e277] [cursor=pointer]
          - group "Utility" [ref=e278]:
            - button "Eyedropper" [ref=e281] [cursor=pointer]
        - generic [ref=e282]:
          - generic [ref=e283]:
            - button "Swap colors (X)" [ref=e284] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e285] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e286] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e287] [cursor=pointer]'
          - generic [ref=e288]:
            - generic [ref=e289]:
              - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)" [ref=e290] [cursor=pointer]'
              - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)" [ref=e291] [cursor=pointer]'
              - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)" [ref=e292] [cursor=pointer]'
              - 'button "#DCABDF (Click: Primary | Right-click: Secondary)" [ref=e293] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e294] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e298]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e299]
      - complementary [ref=e302]:
        - generic [ref=e303]:
          - button "Tools" [ref=e304]
          - button "Layers" [pressed] [ref=e306]
          - button "Palette" [ref=e308]
          - button "PixiTools" [ref=e310]:
            - generic [ref=e311]: FX
        - generic [ref=e313]:
          - generic [ref=e314]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e315]:
              - text: Frame 1 · Layers
              - generic [ref=e316]: (1)
            - generic [ref=e317]:
              - button "Add New Layer" [ref=e318]
              - button "Duplicate Layer" [ref=e320]
              - button "Merge Down" [disabled] [ref=e322]
              - button "Delete Layer" [disabled] [ref=e324]
          - generic [ref=e326]:
            - generic [ref=e327]:
              - generic [ref=e328]: Opacity
              - slider "Layer opacity" [ref=e329] [cursor=pointer]: "100"
              - generic [ref=e330]: 100%
            - generic [ref=e331]:
              - generic [ref=e332]: Blend
              - combobox "Layer blend mode" [ref=e333] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e335]:
            - generic [ref=e336]:
              - button "Reorder layer Base Layer" [disabled] [ref=e337]:
                - generic [ref=e338]: ⠿
              - generic [ref=e339]:
                - button "Select layer Base Layer. Double click to rename" [ref=e340] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e341] [cursor=pointer]
            - generic [ref=e342]:
              - button "Lock layer Base Layer" [ref=e343]
              - button "Hide layer Base Layer" [ref=e344]
    - contentinfo [ref=e346]:
      - generic [ref=e347]:
        - generic [ref=e348]:
          - generic [ref=e349]:
            - button "Play" [ref=e350]
            - button "Previous Frame (,)" [ref=e353]
            - button "Next Frame (.)" [ref=e355]
            - button "Repeat" [ref=e357]
          - generic [ref=e361]:
            - button "Preview speed" [ref=e363]:
              - generic [ref=e364]: Preview
              - generic [ref=e365]: 1×
              - generic [ref=e366]: ▾
            - generic [ref=e367]:
              - generic [ref=e368]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e369]: "100"
              - generic [ref=e370]: ms
            - button "Onion Skin" [ref=e371]
            - button "Onion skin settings" [ref=e374]: ⚙
        - generic [ref=e375]:
          - button "+ Frame" [ref=e376]:
            - generic [ref=e377]: Frame
          - group [ref=e379]:
            - generic "Frame actions" [ref=e380] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e381]: ▾
          - button "Collapse Timeline" [ref=e383]:
            - generic [ref=e384]:
              - generic [ref=e385]: ▼
              - generic [ref=e386]: Collapse
      - generic [ref=e387]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e389]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e390]
    - generic [ref=e392]:
      - generic [ref=e393]: "X: — Y: —"
      - generic [ref=e396]: 32×32
      - generic [ref=e399]: 1600%
      - generic [ref=e401]: Frame 1/1
      - generic [ref=e403]: Base Layer
      - generic [ref=e404]: pen
      - status "All changes saved to local storage" [ref=e409]:
        - generic [ref=e411]: Saved
  - button "Open Next.js Dev Tools" [ref=e417] [cursor=pointer]
  - alert [ref=e421]
```

# Test source

```ts
  40  |       value: async () => ({ name: 'denied.pixibun', queryPermission: async () => 'denied' }),
  41  |     });
  42  |   });
  43  |   await dialog.getByRole('button', { name: 'Download project backup' }).click();
  44  |   await expect(dialog.getByRole('alert')).toContainText('Couldn’t create the project backup');
  45  |   await expect(dialog).toBeVisible();
  46  | });
  47  | 
  48  | test('project backup writes a complete file without changing local-save status', async ({ page }) => {
  49  |   await page.addInitScript(() => {
  50  |     const testWindow = window as typeof window & { __backupWrites: string[] };
  51  |     testWindow.__backupWrites = [];
  52  |     Object.defineProperty(window, 'showOpenFilePicker', { configurable: true, value: async () => [] });
  53  |     Object.defineProperty(window, 'showSaveFilePicker', {
  54  |       configurable: true,
  55  |       value: async () => ({
  56  |         name: 'untitled-sprite.pixibun',
  57  |         queryPermission: async () => 'granted',
  58  |         createWritable: async () => ({
  59  |           write: async (data: string) => { testWindow.__backupWrites.push(data); },
  60  |           close: async () => {},
  61  |         }),
  62  |       }),
  63  |     });
  64  |   });
  65  |   await page.goto('/studio');
  66  |   await page.getByTestId('export-button').click();
  67  |   const dialog = page.getByRole('dialog');
  68  |   await expect(dialog).toBeVisible();
  69  |   await dialog.getByTestId('export-tab-project').click();
  70  |   await dialog.getByRole('button', { name: 'Download project backup' }).click();
  71  |   await expect(dialog).toHaveCount(0);
  72  |   const writes = await page.evaluate(() => (window as typeof window & { __backupWrites: string[] }).__backupWrites);
  73  |   expect(writes).toHaveLength(1);
  74  |   expect(JSON.parse(writes[0]).name).toBe('Untitled Sprite');
  75  |   await expect(page.getByText('Saved on this device', { exact: true })).toHaveCount(0);
  76  | });
  77  | 
  78  | test('project and drawing controls stay grouped, visible and usable at desktop widths', async ({ page }) => {
  79  |   await page.goto('/studio');
  80  |   const header = page.getByRole('banner');
  81  |   const project = header.getByRole('group', { name: 'Project controls', exact: true });
  82  |   const drawing = header.getByRole('group', { name: 'Drawing controls', exact: true });
  83  |   const canvasControls = header.getByRole('group', { name: 'Canvas controls', exact: true });
  84  |   await expect(page.getByTestId('import-button')).toHaveCount(0);
  85  |   const fileButton = project.getByTestId('file-menu-button');
  86  |   await fileButton.focus();
  87  |   await fileButton.press('ArrowDown');
  88  |   const file = page.getByRole('menu', { name: 'File', exact: true });
  89  |   await expect(file.getByRole('menuitem')).toHaveText(['Projects', 'New drawing', 'Import…', 'Canvas size…']);
  90  |   await expect(file.getByRole('menuitem', { name: 'Projects', exact: true })).toBeFocused();
  91  |   await page.keyboard.press('ArrowDown');
  92  |   await expect(file.getByTestId('new-drawing-button')).toBeFocused();
  93  |   await page.keyboard.press('End');
  94  |   await expect(file.getByTestId('resize-canvas-button')).toBeFocused();
  95  |   await page.keyboard.press('Home');
  96  |   await expect(file.getByTestId('gallery-button')).toBeFocused();
  97  |   await page.keyboard.press('Escape');
  98  |   await expect(fileButton).toBeFocused();
  99  |   await expect(file).toHaveCount(0);
  100 |   await fileButton.press('ArrowUp');
  101 |   await expect(file.getByTestId('resize-canvas-button')).toBeFocused();
  102 |   await page.keyboard.press('Tab');
  103 |   await expect(project.getByRole('button', { name: /^Rename project/ })).toBeFocused();
  104 |   await expect(file).toHaveCount(0);
  105 |   await expect(drawing.getByTestId('toggle-symmetry-h')).toHaveCount(0);
  106 |   await expect(canvasControls.getByTestId('toggle-symmetry-h')).toHaveAttribute('aria-pressed', 'false');
  107 |   await canvasControls.getByTestId('toggle-symmetry-h').hover();
  108 |   await canvasControls.getByTestId('toggle-symmetry-h').click();
  109 |   await expect(canvasControls.getByTestId('toggle-symmetry-h')).toHaveAttribute('aria-pressed', 'true');
  110 |   await canvasControls.getByTestId('toggle-symmetry-h').click();
  111 |   await page.getByTestId('save-button').focus();
  112 |   await page.mouse.move(0, 200);
  113 |   // Let both hover/focus delays elapse: neither may reopen a departed tooltip.
  114 |   await page.waitForTimeout(500);
  115 |   await expect(header.getByRole('tooltip')).toHaveCount(0);
  116 |   await expect(header.getByTestId('appearance-button')).toContainText('Studio');
  117 |   await expect(page.getByTestId('shortcuts-guide-button')).toHaveCount(0);
  118 |   expect(await header.locator('button').count()).toBe(20);
  119 | 
  120 |   // Rename through the real control; a long title must not push actions out of reach.
  121 |   await project.getByRole('button', { name: /^Rename project/ }).click();
  122 |   await project.getByRole('textbox').fill('A long sprite project name for header placement checks');
  123 |   await project.getByRole('textbox').press('Enter');
  124 |   for (const width of [1920, 1536, 1280, 1024]) {
  125 |     await page.setViewportSize({ width, height: 900 });
  126 |     for (const tool of ['pen', 'eraser', 'bucket', 'erase-color', 'color-replace', 'curve', 'dither', 'line', 'isometric-line', 'rectangle', 'ellipse']) {
  127 |       await page.evaluate((activeTool) => {
  128 |         const store = (window as Window & { __studioStore?: { getState: () => { setActiveTool: (tool: string) => void } } }).__studioStore!;
  129 |         store.getState().setActiveTool(activeTool);
  130 |       }, tool);
  131 |       await expect(drawing.getByTestId('tool-options-rail')).toContainText(tool === 'erase-color' ? 'Erase-color:' : `${tool.charAt(0).toUpperCase()}${tool.slice(1)}:`);
  132 |       await page.mouse.move(0, 200);
  133 |       await expect.poll(() => header.evaluate((element) => {
  134 |         const bounds = element.getBoundingClientRect();
  135 |         const controls = Array.from(element.querySelectorAll<HTMLElement>('button, input:not([type="file"]), select, a'))
  136 |           .filter((control) => control.getClientRects().length > 0)
  137 |           .map((control) => control.getBoundingClientRect());
  138 |         return bounds.height === 48 && controls.every((box) => box.left >= bounds.left && box.right <= bounds.right && box.top >= bounds.top && box.bottom <= bounds.bottom && box.width >= 24 && box.height >= 24 && Math.abs((box.top + box.bottom) / 2 - (bounds.top + bounds.bottom) / 2) <= 1)
  139 |           && controls.every((box, index) => controls.slice(index + 1).every((other) => Math.min(box.right, other.right) - Math.max(box.left, other.left) <= 1 || Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) <= 1));
> 140 |       }), `header control bounds and overlap at ${width}px with ${tool}`).toBe(true);
      |                                                                           ^ Error: header control bounds and overlap at 1280px with pen
  141 |       expect(await canvasControls.evaluate((element) => {
  142 |         const mirror = element.querySelector('[aria-label="Mirror drawing"]')!.getBoundingClientRect();
  143 |         const zoom = element.querySelector('[aria-label="Zoom Out"]')!.getBoundingClientRect();
  144 |         const fit = element.querySelector('[data-testid="fit-canvas-button"]')!.getBoundingClientRect();
  145 |         const view = element.querySelector('[aria-label="View options menu"]')!.getBoundingClientRect();
  146 |         return [zoom, fit, view].every((box) => Math.abs(box.top - mirror.top) <= 1 && box.height === mirror.height)
  147 |           && zoom.left >= mirror.right && zoom.left - mirror.right <= 5
  148 |           && view.left >= fit.right && view.left - fit.right <= 5;
  149 |       }), `Mirror, Fit and View remain adjacent at ${width}px with ${tool}`).toBe(true);
  150 |     }
  151 |   }
  152 | 
  153 |   // Menus must remain clickable below wrapped rows, rather than being clipped.
  154 |   await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveTool: (tool: string) => void } } }).__studioStore!.getState().setActiveTool('pen'));
  155 |   await header.getByRole('button', { name: /Brush size .* pixels/ }).click();
  156 |   const brushControls = page.getByRole('group', { name: 'Brush size controls' });
  157 |   await expect(brushControls).toBeInViewport();
  158 |   await brushControls.getByRole('button', { name: '4 pixel brush preset', exact: true }).click();
  159 |   await expect(header.getByRole('button', { name: 'Brush size 4 pixels' })).toBeVisible();
  160 |   await page.keyboard.press('Escape');
  161 |   await header.getByRole('button', { name: /Choose zoom level/ }).click();
  162 |   await page.getByRole('group', { name: 'Zoom levels' }).getByRole('button', { name: '200%', exact: true }).click();
  163 |   await expect(header.getByRole('button', { name: 'Zoom 200 percent. Choose zoom level' })).toBeVisible();
  164 |   await header.getByTestId('appearance-button').click();
  165 |   const studio = page.getByRole('dialog', { name: 'Studio options' });
  166 |   await expect(studio).toBeInViewport();
  167 |   await expect(studio.getByRole('button', { name: 'Co-Draw session' })).toBeFocused();
  168 |   await expect(studio.getByTestId('shortcuts-guide-button')).toHaveText('Help');
  169 |   const actions = await studio.getByRole('button', { name: 'Co-Draw session' }).boundingBox();
  170 |   const help = await studio.getByTestId('shortcuts-guide-button').boundingBox();
  171 |   expect(actions!.width).toBe(help!.width);
  172 |   expect(actions!.height).toBe(help!.height);
  173 |   await studio.getByRole('radio', { name: /Cozy Classic/ }).click();
  174 |   await expect(studio.getByRole('radio', { name: /Cozy Classic/ })).toBeFocused();
  175 |   await page.keyboard.press('ArrowDown');
  176 |   await expect(studio.getByRole('radio', { name: /Atelier/ })).toHaveAttribute('aria-checked', 'true');
  177 |   await expect(studio.getByRole('radio', { name: /Atelier/ })).toBeFocused();
  178 |   await page.keyboard.press('Escape');
  179 |   await expect(header.getByTestId('appearance-button')).toBeFocused();
  180 |   await header.getByRole('button', { name: 'View options menu', exact: true }).click();
  181 |   await expect(page.getByRole('region', { name: 'View options menu' })).toBeInViewport();
  182 |   await page.keyboard.press('Escape');
  183 |   await page.getByTestId('save-button').click();
  184 |   await expect(page.getByText('Saved on this device', { exact: true })).toHaveCount(0);
  185 |   await page.setViewportSize({ width: 1920, height: 900 });
  186 |   await page.mouse.move(0, 200);
  187 |   await header.screenshot({ path: test.info().outputPath('captures', 'header-one-row-1920.png') });
  188 |   await page.setViewportSize({ width: 1024, height: 900 });
  189 |   await header.screenshot({ path: test.info().outputPath('captures', 'header-one-row-1024.png') });
  190 |   await fileButton.click();
  191 |   await file.screenshot({ path: test.info().outputPath('captures', 'header-file-menu.png') });
  192 |   await file.getByTestId('resize-canvas-button').click();
  193 |   const resizeDialog = page.getByRole('dialog', { name: /Resize/ });
  194 |   await expect(resizeDialog).toBeVisible();
  195 |   await expect.poll(() => resizeDialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  196 |   await page.keyboard.press('Escape');
  197 |   await expect(resizeDialog).toBeHidden();
  198 |   await header.getByTestId('appearance-button').click();
  199 |   await studio.screenshot({ path: test.info().outputPath('captures', 'header-studio-options.png') });
  200 |   await studio.getByRole('button', { name: 'Co-Draw session' }).click();
  201 |   await expect(page.getByRole('dialog', { name: 'Peer-to-Peer Co-Draw' })).toBeVisible();
  202 |   await expect(studio).toHaveCount(0);
  203 |   await page.keyboard.press('Escape');
  204 |   await header.getByTestId('appearance-button').click();
  205 |   await studio.getByTestId('shortcuts-guide-button').click();
  206 |   await expect(page.getByRole('dialog')).toBeVisible();
  207 |   await expect(studio).toHaveCount(0);
  208 |   await page.keyboard.press('Escape');
  209 |   await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveTool: (tool: string) => void } } }).__studioStore!.getState().setActiveTool('erase-color'));
  210 |   await expect(drawing.getByTestId('tool-options-rail')).toContainText('Erase-color:');
  211 |   await header.screenshot({ path: test.info().outputPath('captures', 'header-one-row-erase-color-1024.png') });
  212 |   await page.getByTestId('tool-options-button').click();
  213 |   await expect(page.getByRole('slider', { name: 'Erase Color tolerance' })).toBeInViewport();
  214 |   await page.keyboard.press('Escape');
  215 |   await expect(page.getByTestId('tool-options-button')).toBeFocused();
  216 |   await page.context().setOffline(true);
  217 |   await expect(header.getByRole('status')).toHaveText('Offline');
  218 |   expect(await header.evaluate((element) => {
  219 |     const bounds = element.getBoundingClientRect();
  220 |     return Array.from(element.querySelectorAll('button')).filter((button) => button.getClientRects().length > 0).every((button) => {
  221 |       const box = button.getBoundingClientRect();
  222 |       return box.left >= bounds.left && box.right <= bounds.right && Math.abs((box.top + box.bottom) / 2 - (bounds.top + bounds.bottom) / 2) <= 1;
  223 |     });
  224 |   })).toBe(true);
  225 |   await page.context().setOffline(false);
  226 | });
  227 | 
  228 | test('onion skin explains why no ghost is visible', async ({ page }) => {
  229 |   await page.goto('/studio');
  230 |   const onion = page.getByRole('button', { name: 'Onion Skin', exact: true });
  231 |   await expect(onion).toHaveAttribute('aria-pressed', 'false');
  232 |   await onion.click();
  233 |   await expect(onion).toHaveAttribute('aria-pressed', 'true');
  234 |   await expect(page.getByText('Add another frame to see neighboring drawings.')).toBeVisible();
  235 |   await page.getByTestId('add-frame-button').click();
  236 |   await expect(page.getByText('Add another frame to see neighboring drawings.')).toHaveCount(0);
  237 |   await page.getByRole('button', { name: 'Play', exact: true }).last().click();
  238 |   await expect(page.getByText('Pause to see onion skin while editing.')).toBeVisible();
  239 | });
  240 | 
```