# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: compactControlAccessibility.spec.ts >> compiled cozy-classic dark keeps compact controls reachable and passes scoped accessibility checks
- Location: tests\production\compactControlAccessibility.spec.ts:6:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('region', { name: 'Pinned color panel', exact: true })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('region', { name: 'Pinned color panel', exact: true })

```

```yaml
- link "Skip to content":
  - /url: "#main-workspace"
- banner:
  - group "Project controls":
    - link "PixiBun Home":
      - /url: /
      - img "Bun, the PixiBun bunny"
    - button "File"
    - button "Rename project A long project title for compact controls": A long project title for compact controls
    - button "Save now":
      - img
      - text: Save
    - button "Undo last action" [disabled]:
      - img
    - tooltip "Undo Ctrl+Z"
    - button "Redo last action" [disabled]:
      - img
  - group "Drawing controls":
    - button "Brush size 1 pixels": 1 px
  - group "Canvas controls":
    - group "Mirror drawing":
      - button "Horizontal symmetry":
        - img
      - button "Vertical symmetry":
        - img
    - button "Zoom Out": −
    - button "Zoom 1600 percent. Choose zoom level": 1600%
    - button "Zoom In": +
    - button "Fit Canvas to Viewport (Ctrl+0)": Fit
    - button "View options menu":
      - img
      - text: View ▼
  - group "Workspace presets":
    - combobox "Workspace layout":
      - option "Drawing"
      - option "Animation"
      - option "Lighting" [selected]
  - group "Studio settings and help":
    - button "Studio options": Studio
  - button "Export drawing":
    - img
    - text: Export
- status: Changes saved
- complementary:
  - group "Drawing":
    - button "Pen" [pressed]:
      - img
    - button "Bézier Curve":
      - img
    - button "Eraser":
      - img
    - button "Flood Fill":
      - img
    - button "Pixel Gradient":
      - img
    - button "Dither Brush":
      - img
    - button "Color Replace":
      - img
    - button "Erase Sampled Color":
      - img
  - group "Selection":
    - button "Marquee Box":
      - img
    - button "Lasso Select":
      - img
    - button "Magic Wand":
      - img
  - group "Geometry":
    - button "Line":
      - img
    - button "2:1 Iso Line":
      - img
    - button "Rectangle":
      - img
    - button "Ellipse":
      - img
  - group "2.5D Sculpt":
    - button "Normal Chisel":
      - img
  - group "Utility":
    - button "Eyedropper":
      - img
  - button "Swap colors (X)": ⇄
  - button "Reset default black and white colors (Shift+D)"
  - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap"'
  - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap"'
  - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)"'
  - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)"'
  - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)"'
  - 'button "#DCABDF (Click: Primary | Right-click: Secondary)"'
  - button "Quick Swatches Flyout"
- main "Pixel art canvas workspace":
  - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan."
- complementary:
  - button "Tools":
    - img
    - text: Tools
  - button "Layers":
    - img
    - text: Layers
  - button "Palette":
    - img
    - text: Palette
  - button "PixiTools" [pressed]:
    - img
    - text: FX
  - button "← Choose another task"
  - heading "Add light and depth" [level=2]
  - paragraph: Light your sprite, shape its surface, or add a shadow.
  - heading "Light your sprite" [level=3]:
    - button "Light your sprite" [expanded]: Light your sprite Move a light to preview highlights and shading.
  - group "Lighting setup":
    - button "Auto setup" [pressed]:
      - img
      - text: Auto setup
    - button "Manual setup":
      - img
      - text: Manual setup
  - paragraph: Auto chooses settings from your sprite.
  - group: Shading style 2 shadow tones
  - button "Preview lighting":
    - img
    - text: Preview lighting
  - text: Drag the light on your artwork. Enter applies · Esc cancels.
  - group: More lighting actions
  - heading "Shape the surface" [level=3]:
    - button "Shape the surface": Shape the surface Paint raised edges that respond to lighting.
  - heading "Add a shadow" [level=3]:
    - button "Add a shadow": Add a shadow Place a shadow beneath or behind your sprite.
  - region "Canvas navigator":
    - img
    - text: Navigator 32 × 32 1600%
    - button "Canvas overview. Click or drag to pan; arrow keys pan, Shift moves eight pixels, Enter centers."
    - button "Zoom out": "-"
    - slider "Navigator zoom slider": "1600"
    - button "Zoom in": +
    - button "1:1"
    - button "Fit canvas"
    - button "Center"
    - checkbox "Grid"
    - text: Grid
- text: "X: — Y: — 32×32 1600% Frame 1/1 Base Layer pen"
- status "All changes saved to local storage": Saved
- alert
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | 
  4  | for (const studio of ['atelier', 'cozy-classic'] as const) {
  5  |   for (const scheme of ['dark', 'light'] as const) {
  6  |     test(`compiled ${studio} ${scheme} keeps compact controls reachable and passes scoped accessibility checks`, async ({ page }) => {
  7  |       await page.setViewportSize({ width: 1920, height: 900 });
  8  |       await page.goto('/studio');
  9  |       await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  10 |       await page.getByRole('button', { name: 'Studio options', exact: true }).click();
  11 |       await page.getByTestId(`theme-option-${studio}`).click();
  12 |       await page.getByTestId(`scheme-option-${scheme}`).click();
  13 |       await page.keyboard.press('Escape');
  14 |       await expect(page.locator('html')).toHaveAttribute('data-studio-theme', studio);
  15 |       await expect(page.locator('html')).toHaveAttribute('data-color-scheme', scheme);
  16 |       const header = page.getByRole('banner');
  17 |       await header.getByRole('button', { name: /^Rename project/ }).click();
  18 |       await header.getByRole('textbox').fill('A long project title for compact controls');
  19 |       await header.getByRole('textbox').press('Enter');
  20 | 
  21 |       for (const width of [1920, 1280, 1024]) {
  22 |         await page.setViewportSize({ width, height: 900 });
  23 |         await expect.poll(() => header.evaluate(element => {
  24 |           const bounds = element.getBoundingClientRect();
  25 |           const boxes = Array.from(element.querySelectorAll<HTMLElement>('button, input:not([type="file"]), select, a'))
  26 |             .filter(control => control.getClientRects().length > 0).map(control => control.getBoundingClientRect());
  27 |           return bounds.height === 48 && boxes.every(box => box.width >= 24 && box.height >= 24 && box.left >= bounds.left && box.right <= bounds.right && box.top >= bounds.top && box.bottom <= bounds.bottom)
  28 |             && boxes.every((box, index) => boxes.slice(index + 1).every(other => Math.min(box.right, other.right) - Math.max(box.left, other.left) <= 1 || Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) <= 1));
  29 |         }), `${studio}/${scheme} controls fit without overlap at ${width}px`).toBe(true);
  30 |       }
  31 | 
  32 |       await page.getByLabel('Workspace layout', { exact: true }).selectOption('lighting');
> 33 |       await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toBeVisible();
     |                                                                                           ^ Error: expect(locator).toBeVisible() failed
  34 |       const result = await new AxeBuilder({ page }).include('header').include('aside').include('[aria-label="Pinned color panel"]')
  35 |         .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  36 |       expect(result.violations.filter(issue => issue.impact === 'serious' || issue.impact === 'critical')).toEqual([]);
  37 |     });
  38 |   }
  39 | }
  40 | 
```