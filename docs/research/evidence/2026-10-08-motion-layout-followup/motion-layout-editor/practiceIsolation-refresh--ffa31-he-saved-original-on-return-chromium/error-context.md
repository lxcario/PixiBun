# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: practiceIsolation.spec.ts >> refresh discards temporary practice and restores the saved original on return
- Location: tests\e2e\practiceIsolation.spec.ts:96:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/playground$/
Received string:  "http://localhost:3000/"
Timeout: 15000ms

Call log:
  - Expect "toHaveURL" with timeout 15000ms
    31 × locator resolved to <html lang="en" data-theme="dark" data-color-scheme="dark" data-studio-theme="atelier" data-scroll-behavior="smooth" class="jakarta_61040398-module__nfleNG__variable jetbrainsmono_768635d8-module__D5ICbW__variable silkscreen_cb7ce504-module__-5enzq__variable dark">…</html>
       - unexpected value "http://localhost:3000/"

```

```yaml
- link "Skip to content":
  - /url: "#top"
- alert: PixiBun Atelier — 2.5D Photometric Pixel Art Studio & Animation Engine
- main:
  - link "PixiBun Home":
    - /url: /
    - img "Bun, the PixiBun bunny"
    - text: PIXIBUN ATELIER
  - navigation "Main Navigation":
    - link "Playground":
      - /url: /playground
    - link "Studio":
      - /url: /studio
    - link "Engine":
      - /url: "#engine-showcase"
    - link "Pillars":
      - /url: "#features"
    - link "Shelf":
      - /url: "#gallery"
    - link "Story":
      - /url: "#story"
  - button "Toggle Theme"
  - link "START DRAWING ✦":
    - /url: /studio
  - text: ✦ ✧ ✦ ✧ ✦ ✧ ✦ 2.5D PIXEL ART STUDIO & ANIMATION SUITE ✦
  - heading "THE OFFLINE-FIRST PIXEL ART ATELIER & 2.5D GAME STUDIO." [level=1]
  - paragraph: Draw a little sprite, try a different light, or bring a few frames to life. Share an image or animation, and take a Godot kit into your game. An honest, quiet desk in your browser.
  - text: ✦ 2.5D PHOTOMETRIC LIGHT ✦ ROTSPRITE 8X ✦ GODOT KIT & UNITY SHADERS
  - link "OPEN THE ATELIER →":
    - /url: /studio
  - link "EXPLORE THE ENGINE ↓":
    - /url: "#engine-showcase"
  - text: ✦ MADE WITH TEA & LATE NIGHTS ✦ STAY A WHILE
  - 'img "Interactive cozy pixel art desk: toggle the lamp, pet the cat, and draw on the sketchpad"'
  - text: Lamplit Desk · warm glow
  - 'button "Lamp: ON"':
    - text: "Lamp:"
    - strong: "ON"
  - button "Pet Bun"
  - text: Draw
  - link "Scroll down to engine showcase":
    - /url: "#engine-showcase"
    - text: SCROLL A LITTLE ✦ ▼
  - text: ✦ INTERACTIVE GRAPHICS BENCHMARK ✦
  - heading "A REAL COMPUTER GRAPHICS ATELIER IN YOUR BROWSER" [level=2]
  - paragraph: PixiBun is not a simplistic 16-color doodle pad. It is an offline-first pixel art studio powered by mathematically rigorous 2.5D photometric lighting, subpixel RotSprite rotation, physical shadow cone-tracing, and game-engine exports. Click below to test every system live.
  - tablist "Atelier Engine Features":
    - tab "2.5D Lighting & Shadows 01" [selected]
    - tab "RotSprite Precision 02"
    - tab "Image Synthesis 03"
    - tab "Game Engine Exports 04"
  - tabpanel "2.5D Lighting & Shadows 01":
    - text: 01 / 2.5D Lighting & Shadows Blinn-Phong & Cast Ray
    - button "Previous feature": Prev
    - text: 1 / 4
    - button "Next feature": Next
    - img: 0° N 90° E 180° S 270° W
    - text: ✦ Drag bulb or use Arrow keys to orbit light
    - slider "Interactive 2.5D Light Direction Gizmo. Use arrow keys to adjust azimuth and elevation.":
      - img
    - text: "✦ Azimuth: 89° Elev: 45°"
    - button "⏸ Orbit"
    - text: Sprite Model
    - button "Ghost"
    - button "Shroom"
    - button "Bun"
    - button "Lantern"
    - text: View Mode
    - button "✦ OKLCH Cel Shaded"
    - button "✦ Normal Field (RGB)"
    - 'button "✦ Tone: Stepped Cel"'
    - text: Surface Material Profile (Blinn-Phong)
    - button "matte"
    - button "gold"
    - button "glass"
    - button "fabric"
    - text: 2.5D Ground Shadow
    - button "Cast Ray"
    - button "Drop AO"
    - button "None"
    - text: 01 / 2.5D LIGHTING & SHADOWS
    - heading "2.5D Photometric Studio & Bounded Cast Shadows" [level=3]
    - paragraph: Move the little bulb and watch the sample's highlights and shadows change. The surface is estimated from the sprite's silhouette; compare the materials and shadow choices to find a look you like.
    - text: ✦
    - strong: Exact Euclidean Distance Field (EDT)
    - text: Linear-time O(N) Felzenszwalb & Huttenlocher transform inflates flat silhouettes into dome heightmaps. ✦
    - strong: Sobel Tangent Normals & Bilateral Smoothing
    - text: Estimates surface directions from the height field and smooths them locally. Fine details need a look of their own. ✦
    - strong: Stepped OKLCH Cel-Shading
    - text: Uses perceptual color coordinates for warm highlights, cool shadows and stepped tones. The final colors depend on your settings.
    - link "TRY PHOTOMETRIC LIGHTING IN STUDIO →":
      - /url: /studio
  - text: ✦ Offline after your first online load • ✦ Creative tools run on your device • ✦ Zero Generative Hallucinations ✦ FOUR CORE STUDIO PILLARS ✦
  - heading "CRAFTED FOR ARTISTS & GAME MAKERS" [level=2]
  - paragraph: Draw, preview and export on your device, with no account needed.
  - article:
    - text: 01 / LIGHTING REAL-TIME NORMALS
    - heading "2.5D PHOTOMETRIC STUDIO" [level=3]
    - paragraph: Try a light on a small sprite, compare smooth or stepped shading, then decide what to keep. Estimated surfaces are a starting point for your own adjustments.
    - link "Open studio for 2.5D PHOTOMETRIC STUDIO":
      - /url: /studio
      - text: OPEN LIGHTING STUDIO → ✦
  - article:
    - text: 02 / GEOMETRY COMPARE THE EDGES
    - heading "ROTSPRITE PRECISION" [level=3]
    - paragraph: Compare RotSprite with nearest-neighbor rotation. It uses an 8x working image and keeps source colors; tiny details can still change.
    - link "Open studio for ROTSPRITE PRECISION":
      - /url: /studio
      - text: TEST ROTSPRITE → ✦
  - article:
    - text: 03 / TIMELINE SDF TWEENING
    - heading "ANIMATION & SDF MORPH" [level=3]
    - paragraph: Give each pose its own hold, use faded onion-skin guides and organize clips. Try generated in-betweens, then review the result before keeping it.
    - link "Open studio for ANIMATION & SDF MORPH":
      - /url: /studio
      - text: OPEN TIMELINE → ✦
  - article:
    - text: 04 / PIPELINES SPRITES & ANIMATION
    - heading "GAME ENGINE EXPORTS" [level=3]
    - paragraph: Share a PNG, GIF or full-RGBA APNG. Export a sprite sheet, a bounded Godot kit or Unity shader code; check the files in your destination.
    - link "Open studio for GAME ENGINE EXPORTS":
      - /url: /studio
      - text: EXPORT PIPELINES → ✦
  - text: ✦ ATELIER STARTER COLLECTION
  - heading "TAKE A SPRITE FROM THE SHELF" [level=2]
  - paragraph: Pick one, change a few colours, and make it yours.
  - text: SHELF 01 / PICK A FRIEND 4 LITTLE STARTERS • 16×16
  - figure "Hearth Ghost A tiny ghost keeping an ember warm. GIVE IT A TRY✦":
    - text: "#01 / GHOST 16×16 PALETTE: Hearth Ghost A tiny ghost keeping an ember warm."
    - link "GIVE IT A TRY✦":
      - /url: /studio?template=hearth-ghost
  - figure "Little Shroom A spotted mushroom with a face you can't say no to. GIVE IT A TRY✦":
    - text: "#02 / SHROOM 16×16 PALETTE: Little Shroom A spotted mushroom with a face you can't say no to."
    - link "GIVE IT A TRY✦":
      - /url: /studio?template=mushroom
  - figure "Bun Our little studio rabbit. Usually found sitting somewhere nearby. GIVE IT A TRY✦":
    - text: "#03 / BUN 16×16 PALETTE: Bun Our little studio rabbit. Usually found sitting somewhere nearby."
    - link "GIVE IT A TRY✦":
      - /url: /studio?template=bun
  - figure "Little Lantern A little brass lantern for late-night drawing. GIVE IT A TRY✦":
    - text: "#04 / LANTERN 16×16 PALETTE: Little Lantern A little brass lantern for late-night drawing."
    - link "GIVE IT A TRY✦":
      - /url: /studio?template=lantern
  - text: ✦ A NOTE FROM THE DESK A NOTE FROM THE DESK EST. 2026 • MADE WITH CARE
  - heading "WHY WE MADE THIS" [level=2]
  - paragraph: A lot of drawing apps start to feel like work. Too many buttons, too many accounts, too much getting in the way. We wanted something simpler — a little desk you can open whenever you feel like drawing.
  - paragraph: No account to make, no setup to get through. Just pull up a chair and draw.
  - text: HAPPY SKETCHING ✦ NO ACCOUNT • SAVES TO YOUR DEVICE WARM HEARTH THE DESK IS ALWAYS OPEN NO ACCOUNT • JUST START DRAWING THE DESK
  - heading "PULL UP A CHAIR. STAY A WHILE." [level=2]
  - paragraph: The desk is ready. Come draw something.
  - link "✦16×16 MINI":
    - /url: /studio?width=16&height=16
  - link "✦24×24 SMALL":
    - /url: /studio?width=24&height=24
  - link "✦32×32 ICON":
    - /url: /studio?width=32&height=32
  - link "✦48×48 SPRITE":
    - /url: /studio?width=48&height=48
  - link "START A NEW DRAWING →":
    - /url: /studio
  - text: CRAFT BENCH ON YOUR DEVICE SAVES LOCALLY NO SETUP OPEN & DRAW SAVE YOUR WORK PNG, GIF, Spritesheets NO TRACKING YOUR DRAWINGS STAY YOURS
  - img "Bun, the PixiBun bunny"
  - text: PIXIBUN ATELIER
  - paragraph: A little pixel art studio for drawing, animating, and taking your time.
  - text: v1.0 • THE DESK IS OPEN
  - heading "STUDIO TOOLS" [level=3]
  - list:
    - listitem:
      - link "✦ Pixel Canvas":
        - /url: /studio
    - listitem:
      - link "✦ Frame Timeline":
        - /url: /studio
    - listitem:
      - link "✦ Onion Skinning":
        - /url: /studio
    - listitem:
      - link "✦ Homestyle Palettes":
        - /url: /studio
  - heading "STARTER SHELF" [level=3]
  - list:
    - listitem:
      - link "✦ Bun (16×16)":
        - /url: /studio?template=bun
    - listitem:
      - link "✦ Hearth Ghost (16×16)":
        - /url: /studio?template=hearth-ghost
    - listitem:
      - link "✦ Little Shroom (16×16)":
        - /url: /studio?template=mushroom
    - listitem:
      - link "✦ Little Lantern (16×16)":
        - /url: /studio?template=lantern
  - heading "GOOD THINGS TO KNOW" [level=3]
  - paragraph: No trackers, no uploads. Your drawings stay on your device.
  - link "Studio":
    - /url: "#features"
  - link "Shelf":
    - /url: "#gallery"
  - link "Story":
    - /url: "#story"
  - paragraph: © 2026 PixiBun Atelier. Made with pixels & late nights.
  - paragraph: Made for anyone who likes making little things. ✦
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import type { StudioState } from '../../src/stores/studioStore';
  3   | type StudioWindow = Window & {
  4   |   __studioStore: { getState(): StudioState };
  5   |   __pixibunDb: {
  6   |     transaction: (...args: unknown[]) => Promise<unknown>;
  7   |     projects: { delete(id: string): Promise<void>; toArray(): Promise<Array<{ id: string; name: string; dataJson: string; storageVersion: string }>> };
  8   |   };
  9   | };
  10  | test.describe.configure({ timeout: 60000 });
  11  | function homeUrl() {
  12  |   const baseURL = test.info().project.use.baseURL;
  13  |   if (!baseURL) throw new Error('Practice navigation checks require a configured baseURL.');
  14  |   return new URL('/', baseURL).href;
  15  | }
  16  | const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  17  |   Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
  18  | const metadata = (page: Page) => page.evaluate(() => {
  19  |   const state = (window as unknown as StudioWindow).__studioStore.getState();
  20  |   return {
  21  |     id: state.currentProjectId, name: state.projectName, width: state.canvasWidth, height: state.canvasHeight,
  22  |     fps: state.fps, frames: state.frames, clips: state.clips, palettes: state.palettes,
  23  |     currentPaletteId: state.currentPaletteId, onionSkin: state.onionSkin,
  24  |     activeLayerId: state.activeLayerId, activeFrameIndex: state.activeFrameIndex,
  25  |   };
  26  | });
  27  | async function originalDrawing(page: Page) {
  28  |   await page.setViewportSize({ width: 1600, height: 1000 });
  29  |   await page.goto('/studio');
  30  |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  31  |   const canvas = page.getByTestId('main-composite-canvas');
  32  |   const box = (await canvas.boundingBox())!;
  33  |   await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
  34  |   await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
  35  |   await page.getByTestId('undo-button').click();
  36  |   await page.evaluate(() => {
  37  |     const state = (window as unknown as StudioWindow).__studioStore.getState();
  38  |     state.setProjectName('Original cozy drawing');
  39  |     state.setFps(17);
  40  |     state.setFrameDuration(0, 213, true);
  41  |     state.setOnionSkin({ enabled: false, opacity: 0.3 });
  42  |   });
  43  |   await expect(page.getByTestId('undo-button')).toBeEnabled();
  44  |   await expect(page.getByTestId('redo-button')).toBeEnabled();
  45  |   return { artwork: await pixels(page), metadata: await metadata(page) };
  46  | }
  47  | async function enterPractice(page: Page) {
  48  |   await page.getByTitle('Return to PixiBun Home', { exact: true }).click();
  49  |   await expect(page).toHaveURL(homeUrl());
  50  |   await page.getByRole('link', { name: 'Playground', exact: true }).click();
> 51  |   await expect(page).toHaveURL(/\/playground$/, { timeout: 15000 });
      |                      ^ Error: expect(page).toHaveURL(expected) failed
  52  |   await expect(page.getByRole('button', { name: 'Return to drawing', exact: true })).toBeVisible();
  53  | }
  54  | async function trace(page: Page) {
  55  |   await page.getByRole('button', { name: 'Trace Stencil', exact: true }).click();
  56  |   await expect.poll(async () => (await pixels(page)).some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
  57  | }
  58  | 
  59  | test('lesson changes and Teaching Board edits preserve the original pixels, timing and undo/redo', async ({ page }, testInfo) => {
  60  |   const original = await originalDrawing(page);
  61  |   await enterPractice(page);
  62  |   expect((await metadata(page)).id).not.toBe(original.metadata.id);
  63  |   await trace(page);
  64  |   await page.getByRole('combobox', { name: 'Choose animation lesson' }).selectOption('potion-bubble');
  65  |   await trace(page);
  66  |   await page.getByTitle('Open 10-Frame Jump Anatomy Teaching Board', { exact: true }).first().click();
  67  |   await page.getByRole('button', { name: 'Load into Playground Timeline', exact: true }).click();
  68  |   await page.keyboard.press('Escape');
  69  |   await expect.poll(async () => (await metadata(page)).frames.length).toBe(10);
  70  |   await page.screenshot({ path: testInfo.outputPath('isolated-practice.png'), fullPage: true });
  71  |   await page.getByRole('button', { name: 'Return to drawing', exact: true }).click();
  72  |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  73  |   await expect.poll(() => pixels(page)).toEqual(original.artwork);
  74  |   expect(await metadata(page)).toEqual(original.metadata);
  75  |   await expect(page.getByTestId('undo-button')).toBeEnabled();
  76  |   await expect(page.getByTestId('redo-button')).toBeEnabled();
  77  |   await page.getByTestId('redo-button').click();
  78  |   await expect.poll(() => pixels(page)).not.toEqual(original.artwork);
  79  |   await page.getByTestId('undo-button').click();
  80  |   await expect.poll(() => pixels(page)).toEqual(original.artwork);
  81  |   await expect(page.getByTestId('redo-button')).toBeEnabled();
  82  | });
  83  | 
  84  | test('Home exit restores the original when Studio is opened again', async ({ page }) => {
  85  |   const original = await originalDrawing(page);
  86  |   await enterPractice(page); await trace(page);
  87  |   await page.getByTitle('Return to PixiBun Home', { exact: true }).click();
  88  |   await page.getByRole('navigation').getByRole('link', { name: 'Studio', exact: true }).click();
  89  |   await expect(page).toHaveURL(/\/studio$/, { timeout: 15000 });
  90  |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  91  |   await expect.poll(() => pixels(page)).toEqual(original.artwork);
  92  |   expect(await metadata(page)).toEqual(original.metadata);
  93  |   await expect(page.getByTestId('redo-button')).toBeEnabled();
  94  | });
  95  | 
  96  | test('refresh discards temporary practice and restores the saved original on return', async ({ page }) => {
  97  |   const original = await originalDrawing(page);
  98  |   await enterPractice(page); await trace(page);
  99  |   page.on('dialog', dialog => { void dialog.accept(); });
  100 |   await page.reload();
  101 |   await expect(page.getByRole('button', { name: 'Return to drawing', exact: true })).toBeVisible();
  102 |   await page.getByRole('button', { name: 'Return to drawing', exact: true }).click();
  103 |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  104 |   await expect.poll(() => pixels(page)).toEqual(original.artwork);
  105 |   expect(await metadata(page)).toEqual(original.metadata);
  106 | });
  107 | 
  108 | test('Keep saves a new project and leaves the stored original unchanged', async ({ page }, testInfo) => {
  109 |   const original = await originalDrawing(page);
  110 |   await enterPractice(page); await trace(page);
  111 |   const practice = { artwork: await pixels(page), metadata: await metadata(page) };
  112 |   const before = await page.evaluate(async originalId => {
  113 |     const rows = await (window as unknown as StudioWindow).__pixibunDb.projects.toArray();
  114 |     return rows.find(row => row.id === originalId);
  115 |   }, original.metadata.id);
  116 |   await page.getByRole('button', { name: 'Keep practice in Studio', exact: true }).click();
  117 |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  118 |   await expect.poll(() => pixels(page)).toEqual(practice.artwork);
  119 |   expect((await metadata(page)).id).toBe(practice.metadata.id);
  120 |   const originalStored = await page.evaluate(async originalId => {
  121 |     const rows = await (window as unknown as StudioWindow).__pixibunDb.projects.toArray();
  122 |     return rows.find(row => row.id === originalId);
  123 |   }, original.metadata.id);
  124 |   expect(originalStored).toEqual(before);
  125 |   await expect(page.getByTestId('undo-button')).toBeEnabled();
  126 |   await page.screenshot({ path: testInfo.outputPath('kept-practice-new-project.png'), fullPage: true });
  127 |   await page.reload();
  128 |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  129 |   await expect.poll(() => pixels(page)).toEqual(practice.artwork);
  130 |   expect((await metadata(page)).id).toBe(practice.metadata.id);
  131 | });
  132 | 
  133 | test('checkpoint failure refuses practice and keeps unsaved original pixels on return', async ({ page }, testInfo) => {
  134 |   const original = await originalDrawing(page);
  135 |   await page.evaluate(() => {
  136 |     (window as unknown as StudioWindow).__pixibunDb.transaction = async () => { throw new Error('Simulated checkpoint failure'); };
  137 |     (window as unknown as StudioWindow).__studioStore.getState().setDirty(true);
  138 |   });
  139 |   await page.getByTitle('Return to PixiBun Home', { exact: true }).click();
  140 |   await page.getByRole('link', { name: 'Playground', exact: true }).click();
  141 |   await expect(page).toHaveURL(/\/playground$/, { timeout: 15000 });
  142 |   await expect(page.getByRole('status')).toContainText(/checkpoint failure|could not be saved/i);
  143 |   await expect(page.getByTestId('main-composite-canvas')).toHaveCount(0);
  144 |   await page.screenshot({ path: testInfo.outputPath('checkpoint-refused.png'), fullPage: true });
  145 |   await page.getByRole('link', { name: 'Return to drawing', exact: true }).click();
  146 |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  147 |   await expect.poll(() => pixels(page)).toEqual(original.artwork);
  148 |   expect(await metadata(page)).toEqual(original.metadata);
  149 |   await expect(page.getByTestId('redo-button')).toBeEnabled();
  150 | });
  151 | 
```