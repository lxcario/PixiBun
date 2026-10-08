# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: backupTrust.spec.ts >> project and drawing controls stay grouped, visible and usable at desktop widths
- Location: tests\e2e\backupTrust.spec.ts:78:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
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
          - img "Bun, the PixiBun bunny" [ref=e11]
        - button "File" [ref=e175]:
          - text: File
          - generic [ref=e176]: ▼
        - button "Rename project A long sprite project name for header placement checks" [ref=e177] [cursor=pointer]: A long sprite project name for header placement checks
        - button "Save now" [ref=e178]:
          - generic [ref=e179]: Save
        - status "You are offline. Drawing works locally; check the save status and keep a project backup." [ref=e181]:
          - generic [ref=e185]: Offline
        - generic [ref=e186]:
          - generic [ref=e187]:
            - button "Undo last action" [disabled]
          - generic [ref=e188]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e189]:
        - button "Erase color tool options" [active] [ref=e190]:
          - generic [ref=e191]: Erase color
          - generic [ref=e192]: ▼
      - generic [ref=e193]:
        - group "Canvas controls" [ref=e194]:
          - group "Mirror drawing" [ref=e195]:
            - button "Horizontal symmetry" [ref=e197] [cursor=pointer]
            - button "Vertical symmetry" [ref=e199] [cursor=pointer]
          - generic [ref=e201]:
            - generic [ref=e202]:
              - button "Zoom Out" [ref=e203] [cursor=pointer]: −
              - button "Zoom 200 percent. Choose zoom level" [ref=e205]: 200%
              - button "Zoom In" [ref=e206] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e208] [cursor=pointer]: Fit
          - button "View options menu" [ref=e212] [cursor=pointer]:
            - generic [ref=e213]:
              - generic [ref=e214]: View
              - generic "1 active view options" [ref=e215]
            - generic [ref=e216]: ▼
        - group "Workspace presets" [ref=e217]:
          - combobox "Workspace layout" [ref=e218] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e219]:
          - button "Studio options" [ref=e220] [cursor=pointer]:
            - generic [ref=e221]: Studio
            - generic [ref=e222]: ▼
        - button "Export drawing" [ref=e224]:
          - generic [ref=e225]: Export
    - status [ref=e227]: Changes saved
    - generic [ref=e228]:
      - complementary [ref=e230]:
        - generic [ref=e232]:
          - group "Drawing" [ref=e233]:
            - button "Pen" [ref=e235] [cursor=pointer]
            - button "Bézier Curve" [ref=e237] [cursor=pointer]
            - button "Eraser" [ref=e239] [cursor=pointer]
            - button "Flood Fill" [ref=e241] [cursor=pointer]
            - button "Pixel Gradient" [ref=e243] [cursor=pointer]
            - button "Dither Brush" [ref=e245] [cursor=pointer]
            - button "Color Replace" [ref=e247] [cursor=pointer]
            - button "Erase Sampled Color" [pressed] [ref=e249] [cursor=pointer]
          - group "Selection" [ref=e250]:
            - button "Marquee Box" [ref=e253] [cursor=pointer]
            - button "Lasso Select" [ref=e255] [cursor=pointer]
            - button "Magic Wand" [ref=e257] [cursor=pointer]
          - group "Geometry" [ref=e258]:
            - button "Line" [ref=e261] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e263] [cursor=pointer]
            - button "Rectangle" [ref=e265] [cursor=pointer]
            - button "Ellipse" [ref=e267] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e268]:
            - button "Normal Chisel" [ref=e271] [cursor=pointer]
          - group "Utility" [ref=e272]:
            - button "Eyedropper" [ref=e275] [cursor=pointer]
        - generic [ref=e276]:
          - generic [ref=e277]:
            - button "Swap colors (X)" [ref=e278] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e279] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e280] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e281] [cursor=pointer]'
          - generic [ref=e282]:
            - generic [ref=e283]:
              - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)" [ref=e284] [cursor=pointer]'
              - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)" [ref=e285] [cursor=pointer]'
              - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)" [ref=e286] [cursor=pointer]'
              - 'button "#DCABDF (Click: Primary | Right-click: Secondary)" [ref=e287] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e288] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e292]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e293]
      - complementary [ref=e296]:
        - generic [ref=e297]:
          - button "Tools" [ref=e298]
          - button "Layers" [pressed] [ref=e300]
          - button "Palette" [ref=e302]
          - button "PixiTools" [ref=e304]:
            - generic [ref=e305]: FX
        - generic [ref=e307]:
          - generic [ref=e308]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e309]:
              - text: Frame 1 · Layers
              - generic [ref=e310]: (1)
            - generic [ref=e311]:
              - button "Add New Layer" [ref=e312]
              - button "Duplicate Layer" [ref=e314]
              - button "Merge Down" [disabled] [ref=e316]
              - button "Delete Layer" [disabled] [ref=e318]
          - generic [ref=e320]:
            - generic [ref=e321]:
              - generic [ref=e322]: Opacity
              - slider "Layer opacity" [ref=e323] [cursor=pointer]: "100"
              - generic [ref=e324]: 100%
            - generic [ref=e325]:
              - generic [ref=e326]: Blend
              - combobox "Layer blend mode" [ref=e327] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e329]:
            - generic [ref=e330]:
              - button "Reorder layer Base Layer" [disabled] [ref=e331]:
                - generic [ref=e332]: ⠿
              - generic [ref=e333]:
                - button "Select layer Base Layer. Double click to rename" [ref=e334] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e335] [cursor=pointer]
            - generic [ref=e336]:
              - button "Lock layer Base Layer" [ref=e337]
              - button "Hide layer Base Layer" [ref=e338]
    - contentinfo [ref=e340]:
      - generic [ref=e341]:
        - generic [ref=e342]:
          - generic [ref=e343]:
            - button "Play" [ref=e344]
            - button "Previous Frame (,)" [ref=e347]
            - button "Next Frame (.)" [ref=e349]
            - button "Repeat" [ref=e351]
          - generic [ref=e355]:
            - button "Preview speed" [ref=e357]:
              - generic [ref=e358]: Preview
              - generic [ref=e359]: 1×
              - generic [ref=e360]: ▾
            - generic [ref=e361]:
              - generic [ref=e362]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e363]: "100"
              - generic [ref=e364]: ms
            - button "Onion Skin" [ref=e365]
            - button "Onion skin settings" [ref=e368]: ⚙
        - generic [ref=e369]:
          - button "+ Frame" [ref=e370]:
            - generic [ref=e371]: Frame
          - group [ref=e373]:
            - generic "Frame actions" [ref=e374] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e375]: ▾
          - button "Collapse Timeline" [ref=e377]:
            - generic [ref=e378]:
              - generic [ref=e379]: ▼
              - generic [ref=e380]: Collapse
      - generic [ref=e381]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e383]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e384]
    - generic [ref=e386]:
      - generic [ref=e387]: "X: — Y: —"
      - generic [ref=e390]: 32×32
      - generic [ref=e393]: 200%
      - generic [ref=e395]: Frame 1/1
      - generic [ref=e397]: Base Layer
      - generic [ref=e398]: erase-color
      - status "All changes saved to local storage" [ref=e403]:
        - generic [ref=e405]: Saved
    - status:
      - generic: ✦ Saved "A long sprite project name for header placement checks" to browser storage
  - button "Open Next.js Dev Tools" [ref=e411] [cursor=pointer]
  - alert [ref=e415]
```

# Test source

```ts
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
  140 |       }), `header control bounds and overlap at ${width}px with ${tool}`).toBe(true);
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
> 224 |   })).toBe(true);
      |       ^ Error: expect(received).toBe(expected) // Object.is equality
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