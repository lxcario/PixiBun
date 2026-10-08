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
        - status "You are currently offline. All drawings and changes are saved locally to IndexedDB." [ref=e181]:
          - generic [ref=e183]: Offline
        - generic [ref=e184]:
          - generic [ref=e185]:
            - button "Undo last action" [disabled]
          - generic [ref=e186]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e187]:
        - button "Erase color tool options" [active] [ref=e188]:
          - generic [ref=e189]: Erase color
          - generic [ref=e190]: ▼
      - generic [ref=e191]:
        - group "Canvas controls" [ref=e192]:
          - group "Mirror drawing" [ref=e193]:
            - button "Horizontal symmetry" [ref=e195] [cursor=pointer]
            - button "Vertical symmetry" [ref=e197] [cursor=pointer]
          - generic [ref=e199]:
            - generic [ref=e200]:
              - button "Zoom Out" [ref=e201] [cursor=pointer]: −
              - button "Zoom 200 percent. Choose zoom level" [ref=e203]: 200%
              - button "Zoom In" [ref=e204] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e206] [cursor=pointer]: Fit
          - button "View options menu" [ref=e210] [cursor=pointer]:
            - generic [ref=e211]:
              - generic [ref=e212]: View
              - generic "1 active view options" [ref=e213]
            - generic [ref=e214]: ▼
        - group "Workspace presets" [ref=e215]:
          - combobox "Workspace layout" [ref=e216] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e217]:
          - button "Studio options" [ref=e218] [cursor=pointer]:
            - generic [ref=e219]: Studio
            - generic [ref=e220]: ▼
        - button "Export drawing" [ref=e222]:
          - generic [ref=e223]: Export
    - status [ref=e225]: Changes saved
    - generic [ref=e226]:
      - complementary [ref=e228]:
        - generic [ref=e230]:
          - group "Drawing" [ref=e231]:
            - button "Pen" [ref=e233] [cursor=pointer]
            - button "Bézier Curve" [ref=e235] [cursor=pointer]
            - button "Eraser" [ref=e237] [cursor=pointer]
            - button "Flood Fill" [ref=e239] [cursor=pointer]
            - button "Pixel Gradient" [ref=e241] [cursor=pointer]
            - button "Dither Brush" [ref=e243] [cursor=pointer]
            - button "Color Replace" [ref=e245] [cursor=pointer]
            - button "Erase Sampled Color" [pressed] [ref=e247] [cursor=pointer]
          - group "Selection" [ref=e248]:
            - button "Marquee Box" [ref=e251] [cursor=pointer]
            - button "Lasso Select" [ref=e253] [cursor=pointer]
            - button "Magic Wand" [ref=e255] [cursor=pointer]
          - group "Geometry" [ref=e256]:
            - button "Line" [ref=e259] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e261] [cursor=pointer]
            - button "Rectangle" [ref=e263] [cursor=pointer]
            - button "Ellipse" [ref=e265] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e266]:
            - button "Normal Chisel" [ref=e269] [cursor=pointer]
          - group "Utility" [ref=e270]:
            - button "Eyedropper" [ref=e273] [cursor=pointer]
        - generic [ref=e274]:
          - generic [ref=e275]:
            - button "Swap colors (X)" [ref=e276] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e277] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e278] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e279] [cursor=pointer]'
          - generic [ref=e280]:
            - generic [ref=e281]:
              - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)" [ref=e282] [cursor=pointer]'
              - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)" [ref=e283] [cursor=pointer]'
              - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)" [ref=e284] [cursor=pointer]'
              - 'button "#DCABDF (Click: Primary | Right-click: Secondary)" [ref=e285] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e286] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e290]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e291]
      - complementary [ref=e294]:
        - generic [ref=e295]:
          - button "Tools" [ref=e296]
          - button "Layers" [pressed] [ref=e298]
          - button "Palette" [ref=e300]
          - button "PixiTools" [ref=e302]:
            - generic [ref=e303]: FX
        - generic [ref=e305]:
          - generic [ref=e306]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e307]:
              - text: Frame 1 · Layers
              - generic [ref=e308]: (1)
            - generic [ref=e309]:
              - button "Add New Layer" [ref=e310]
              - button "Duplicate Layer" [ref=e312]
              - button "Merge Down" [disabled] [ref=e314]
              - button "Delete Layer" [disabled] [ref=e316]
          - generic [ref=e318]:
            - generic [ref=e319]:
              - generic [ref=e320]: Opacity
              - slider "Layer opacity" [ref=e321] [cursor=pointer]: "100"
              - generic [ref=e322]: 100%
            - generic [ref=e323]:
              - generic [ref=e324]: Blend
              - combobox "Layer blend mode" [ref=e325] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e327]:
            - generic [ref=e328]:
              - button "Reorder layer Base Layer" [disabled] [ref=e329]:
                - generic [ref=e330]: ⠿
              - generic [ref=e331]:
                - button "Select layer Base Layer. Double click to rename" [ref=e332] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e333] [cursor=pointer]
            - generic [ref=e334]:
              - button "Lock layer Base Layer" [ref=e335]
              - button "Hide layer Base Layer" [ref=e336]
    - contentinfo [ref=e338]:
      - generic [ref=e339]:
        - generic [ref=e340]:
          - generic [ref=e341]:
            - button "Play" [ref=e342]
            - button "Previous Frame (,)" [ref=e345]
            - button "Next Frame (.)" [ref=e347]
            - button "Repeat" [ref=e349]
          - generic [ref=e353]:
            - button "Preview speed" [ref=e355]:
              - generic [ref=e356]: Preview
              - generic [ref=e357]: 1×
              - generic [ref=e358]: ▾
            - generic [ref=e359]:
              - generic [ref=e360]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e361]: "100"
              - generic [ref=e362]: ms
            - button "Onion Skin" [ref=e363]
            - button "Onion skin settings" [ref=e366]: ⚙
        - generic [ref=e367]:
          - button "+ Frame" [ref=e368]:
            - generic [ref=e369]: Frame
          - group [ref=e371]:
            - generic "Frame actions" [ref=e372] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e373]: ▾
          - button "Collapse Timeline" [ref=e375]:
            - generic [ref=e376]:
              - generic [ref=e377]: ▼
              - generic [ref=e378]: Collapse
      - generic [ref=e379]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e381]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e382]
    - generic [ref=e384]:
      - generic [ref=e385]: "X: — Y: —"
      - generic [ref=e388]: 32×32
      - generic [ref=e391]: 200%
      - generic [ref=e393]: Frame 1/1
      - generic [ref=e395]: Base Layer
      - generic [ref=e396]: erase-color
      - status "All changes saved to local storage" [ref=e401]:
        - generic [ref=e403]: Saved
    - status:
      - generic: ✦ Saved "A long sprite project name for header placement checks" to browser storage
  - button "Open Next.js Dev Tools" [ref=e409] [cursor=pointer]
  - alert [ref=e413]
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