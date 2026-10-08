# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: backupTrust.spec.ts >> onion skin explains why no ghost is visible
- Location: tests\e2e\backupTrust.spec.ts:228:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByRole('button', { name: 'Onion Skin' })
Expected: "false"
Error: strict mode violation: getByRole('button', { name: 'Onion Skin' }) resolved to 2 elements:
    1) <button tabindex="0" aria-pressed="false" title="Toggle Onion Skinning" class="group relative select-none rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--desk-surface)] border transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden py-0.5 pixel-tactile-btn tactile-motion-btn border-[var(--desk-border)] h-7 px-2 text-xs font-sans font-medium flex item…>…</button> aka getByRole('button', { name: 'Onion Skin', exact: true })
    2) <button type="button" data-testid="onion-settings" title="Configure onion skin" aria-label="Onion skin settings" class="h-7 w-7 border border-[var(--desk-border)] rounded-sm text-sm">⚙</button> aka getByTestId('onion-settings')

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Onion Skin' })

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
        - button "Rename project Untitled Sprite" [ref=e180] [cursor=pointer]: Untitled Sprite
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
        - group "Studio settings and help" [ref=e230]
        - button "Export drawing" [ref=e233]:
          - generic [ref=e234]: Export
    - status [ref=e236]: Not saved yet
    - generic [ref=e237]:
      - complementary [ref=e239]:
        - generic [ref=e241]:
          - group "Drawing" [ref=e242]:
            - button "Pen" [pressed] [ref=e244] [cursor=pointer]
            - button "Bézier Curve" [ref=e246] [cursor=pointer]
            - button "Eraser" [ref=e248] [cursor=pointer]
            - button "Flood Fill" [ref=e250] [cursor=pointer]
            - button "Pixel Gradient" [ref=e252] [cursor=pointer]
            - button "Dither Brush" [ref=e254] [cursor=pointer]
            - button "Color Replace" [ref=e256] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e258] [cursor=pointer]
          - group "Selection" [ref=e259]:
            - button "Marquee Box" [ref=e262] [cursor=pointer]
            - button "Lasso Select" [ref=e264] [cursor=pointer]
            - button "Magic Wand" [ref=e266] [cursor=pointer]
          - group "Geometry" [ref=e267]:
            - button "Line" [ref=e270] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e272] [cursor=pointer]
            - button "Rectangle" [ref=e274] [cursor=pointer]
            - button "Ellipse" [ref=e276] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e277]:
            - button "Normal Chisel" [ref=e280] [cursor=pointer]
          - group "Utility" [ref=e281]:
            - button "Eyedropper" [ref=e284] [cursor=pointer]
        - generic [ref=e285]:
          - generic [ref=e286]:
            - button "Swap colors (X)" [ref=e287] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e288] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e289] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e290] [cursor=pointer]'
          - generic [ref=e291]:
            - generic [ref=e292]:
              - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)" [ref=e293] [cursor=pointer]'
              - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)" [ref=e294] [cursor=pointer]'
              - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)" [ref=e295] [cursor=pointer]'
              - 'button "#DCABDF (Click: Primary | Right-click: Secondary)" [ref=e296] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e297] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e301]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e302]
      - complementary [ref=e305]:
        - generic [ref=e306]:
          - button "Tools" [ref=e307]
          - button "Layers" [pressed] [ref=e309]
          - button "Palette" [ref=e311]
          - button "PixiTools" [ref=e313]:
            - generic [ref=e314]: FX
        - generic [ref=e316]:
          - generic [ref=e317]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e318]:
              - text: Frame 1 · Layers
              - generic [ref=e319]: (1)
            - generic [ref=e320]:
              - button "Add New Layer" [ref=e321]
              - button "Duplicate Layer" [ref=e323]
              - button "Merge Down" [disabled] [ref=e325]
              - button "Delete Layer" [disabled] [ref=e327]
          - generic [ref=e329]:
            - generic [ref=e330]:
              - generic [ref=e331]: Opacity
              - slider "Layer opacity" [ref=e332] [cursor=pointer]: "100"
              - generic [ref=e333]: 100%
            - generic [ref=e334]:
              - generic [ref=e335]: Blend
              - combobox "Layer blend mode" [ref=e336] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e338]:
            - generic [ref=e339]:
              - button "Reorder layer Base Layer" [disabled] [ref=e340]:
                - generic [ref=e341]: ⠿
              - generic [ref=e342]:
                - button "Select layer Base Layer. Double click to rename" [ref=e343] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e344] [cursor=pointer]
            - generic [ref=e345]:
              - button "Lock layer Base Layer" [ref=e346]
              - button "Hide layer Base Layer" [ref=e347]
    - contentinfo [ref=e349]:
      - generic [ref=e350]:
        - generic [ref=e351]:
          - generic [ref=e352]:
            - button "Play" [ref=e353]
            - button "Previous Frame (,)" [ref=e356]
            - button "Next Frame (.)" [ref=e358]
            - button "Repeat" [ref=e360]
          - generic [ref=e364]:
            - button "Preview speed" [ref=e366]:
              - generic [ref=e367]: Preview
              - generic [ref=e368]: 1×
              - generic [ref=e369]: ▾
            - generic [ref=e370]:
              - generic [ref=e371]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e372]: "100"
              - generic [ref=e373]: ms
            - button "Onion Skin" [ref=e374]
            - button "Onion skin settings" [ref=e377]: ⚙
        - generic [ref=e378]:
          - button "+ Frame" [ref=e379]:
            - generic [ref=e380]: Frame
          - group [ref=e382]:
            - generic "Frame actions" [ref=e383] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e384]: ▾
          - button "Collapse Timeline" [ref=e386]:
            - generic [ref=e387]:
              - generic [ref=e388]: ▼
              - generic [ref=e389]: Collapse
      - generic [ref=e390]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e392]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e393]
    - generic [ref=e395]:
      - generic [ref=e396]: "X: — Y: —"
      - generic [ref=e399]: 32×32
      - generic [ref=e402]: 1600%
      - generic [ref=e404]: Frame 1/1
      - generic [ref=e406]: Base Layer
      - generic [ref=e407]: pen
      - status "All changes saved to local storage" [ref=e412]:
        - generic [ref=e414]: Saved
  - button "Open Next.js Dev Tools" [ref=e420] [cursor=pointer]
```

# Test source

```ts
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
  224 |   })).toBe(true);
  225 |   await page.context().setOffline(false);
  226 | });
  227 | 
  228 | test('onion skin explains why no ghost is visible', async ({ page }) => {
  229 |   await page.goto('/studio');
  230 |   const onion = page.getByRole('button', { name: 'Onion Skin' });
> 231 |   await expect(onion).toHaveAttribute('aria-pressed', 'false');
      |                       ^ Error: expect(locator).toHaveAttribute(expected) failed
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