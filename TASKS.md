# Build Plan — PixiBun

## Phase 15 — Non-Destructive Photometric Output & Live Preview Signal
**Goal:** Fix the three regressions caused by the photometric pipeline writing destructively into the source layer (pixel loss on light-angle changes, incoherent re-renders, stale live preview) and replace fragile display-name matching with a stable per-layer `tag` identifier system.

**Root cause:** the photometric, auto-shade, specular, sel-out, ground-shadow, and bake-normals pipelines previously called `clearRect` + `drawImage` on the active drawing layer, so each render destroyed the artist's original pixels. There was also no `bufferVersion` signal for buffer-pixel mutations, so the live preview window did not re-render during strokes.

**Deliverables:**
- [x] `Layer.tag?: string` added to `src/types/canvas.ts` for stable machine identification of auto-generated output layers.
- [x] `useStudioStore.addLayer(name?, tag?)` extended; `addLayer` continues to `unshift` so the new layer is at `layers[0]`.
- [x] `useStudioStore.bufferVersion` + `bumpBufferVersion()` action added; bumped on every pixel-mutating path (pen/eraser/dither strokes, bucket fill, color replace, undo/redo, commit/lift/cut/delete selection, and all AI panel handlers).
- [x] `CenterViewport`: helpers `compositeSourceSnapshot(excludeTag)` and `replaceTaggedLayer(name, tag)`; `Render Photometric`, `Auto-Shade`, `Specular`, `Sel-Out`, `Ground Drop Shadow`, and `Bake Normals` now write to dedicated tagged layers and exclude prior outputs from their inputs.
- [x] `Bake Normals` fixed to write to the new `layers[0]` (was using `layers[length-1]` after a 50ms `setTimeout`).
- [x] `FloatingPreviewWindow` subscribes to `bufferVersion`; live preview now updates in real time during strokes and AI renders.
- [x] Dead duplicated `useEffect` block (legacy destructive pattern) removed from `CenterViewport`.
- [x] `applyRiemersmaDither()` Hilbert space-filling implementation in `smartMathEngine.ts`, wired to `pixibun:riemersma-dither`.
- [x] `RightInspector`: removed dead `Bezier Spline` panel button (Bézier is already a drawing tool — the toolbar's `curve` tool); `47-Blob` button disabled with explanatory tooltip (`"Requires tileset atlas (planned). 47-Tile Blob is currently a bitmask computation utility, not a one-click autotiler."`).
- [x] `LOGS.md` updated to clarify 47-Tile Blob is a bitmask utility, not a one-click autotiler.
- [x] Regression tests in `tests/photometricNonDestructive.test.ts`:
   1. Non-destructiveness — 10 photometric renders with varying angles leave the source `ImageData` byte-identical.
   2. Live sync — `bufferVersion` starts at 0 and increments on every `bumpBufferVersion()` call.
   3. Photometric correctness — `Az=0, El=90` produces a non-empty, silhouette-following, left/right-symmetric output with the top at least as bright as the bottom rim.
   4. Bake Normals layer index — `addLayer(name, tag)` inserts at `layers[0]`; `replaceTaggedLayer` keeps a single tagged output layer with base art at the bottom.

**Acceptance criteria:**
- `npx tsc --noEmit` → 0 errors.
- `npx vitest run` → 32/32 tests pass.
- Manually: draw a sprite, run Render Photometric 10× with varying angles — original layer remains byte-identical and the tagged output layer is replaced in place.
- Manually: drawing on the canvas updates the floating live preview in real time.
- Manually: click Riemersma dither with a palette — produces non-worming error-diffusion output.
- Manually: Bézier Spline button is gone; 47-Blob is disabled with the documented tooltip.

**Status:** Complete (2026-08-29)

---

## Phase 14 — 2.5D Photometric Studio, Normal Mapping, Geometry Engine & Mathematical Dithering Suite
**Goal:** Deliver a mathematically rigorous computer graphics and pixel intelligence suite built into the PixiBud inspector and canvas engine: linear-time $O(N)$ Euclidean Distance Transform (EDT), analytical tangent-space normal vector fields with standard blue texture baking $(128, 128, 255)$, Blinn-Phong specular half-vector glints, discrete Laplace cavity ambient occlusion, 5 physical material presets, OKLab perceptual color quantization, and recursive Bayer matrix dither modulation.

**Deliverables:**
- [x] Linear-Time $O(N)$ Separable Euclidean Distance Transform (Felzenszwalb-Huttenlocher algorithm).
- [x] Non-linear height dome inflation ($\gamma = 0.5$) with edge-preserving Bilateral filtering.
- [x] Discrete Sobel partial derivative kernels ($K_x, K_y$) and analytical unit normal vector derivation.
- [x] 1-Click Tangent Normal Map Baker writing standard $(128, 128, 255)$ normal maps directly to a new Layer for game engines (Godot, Unity, Unreal).
- [x] Discrete Laplace operator for Cavity Map / Ambient Occlusion (AO) in surface crevices.
- [x] Full Photometric Lighting equation with Lambert diffuse, Blinn-Phong specular, cavity AO, and inverse square distance attenuation.
- [x] 5 Material Presets: *Matte Clay*, *Polished Metal*, *Glossy Glass*, *Velvet Fabric*, *Gold / Brass*.
- [x] OKLab Perceptual Color Matching ($\Delta E_{\text{OKLab}}$) and recursive Bayer matrix dither offset modulation.
- [x] Rational Bézier curves, Wu's quantized 2:1 isometric lines, RotSprite 8x rotation, and Zhang-Suen 1px skeleton thinning.
- [x] Contextual Tool Options Strip (30px high dynamic toolbar beneath header) and categorized artisan Left Toolbar.
- [x] Live Viewport Normal Map Preview inspection toggle.

**Acceptance criteria:**
- Type-check (`tsc --noEmit`), build (`next build`), and tests pass with 0 errors.
- Normal maps bake cleanly to distinct layers with $(128, 128, 255)$ baseline flat normals.
- Photometric lighting applies physically accurate specular glints, diffuse shading, and clean OKLab Bayer dithering.

**Status:** Complete (2026-08-28)

---

## Phase 13 — Lamplit Identity: De-Slop, Cozy Studio & Hero Landing Page
**Goal:** Replace generic tool-panel feel with an authored identity per FullStackGuide: one signature element (the lamplit desk), a hand-pixelled brand mark, warm human copy everywhere, and a hero landing page that lets visitors draw before they enter.

**Deliverables:**
- [x] Token overhaul: desk/wood-grain surfaces, lamp amber accents, static CSS dither textures, scroll unlocked globally.
- [x] Route restructure: landing at `/`, editor moved to `/studio` with its own metadata; autosave hydration verified through the move.
- [x] Signature element shipped once per scene: `.lamp-pool` overlay on viewport and hero; canvas frame reads as paper under lamp light.
- [x] Bun mascot (`src/components/ui/BunMascot.tsx`): hand-plotted 16x16 SVG, idle/blink/happy poses, reduced-motion-safe blink; header brand plate rebuilt around it.
- [x] Copy de-slop: all eleven inspector feedback strings rewritten emoji-free in craftsperson voice; "1-Click Magic" replaced.
- [x] Landing page: hero + interactive 32x20 DoodlePad, narrative feature story (no bento grid), starter sprite gallery rendered via `paintTemplate`, quiet footer.
- [x] Starter art system: `src/types/landing.ts`, `src/lib/art/starterTemplates.ts` (four hand-authored 16x16 sprites), `src/lib/render/templateRenderer.ts`.
- [x] WCAG focus restored: amber focus-visible rings on TactileButton, doodle swatches, CTAs.
- [x] Tests: `starterTemplates.test.ts`, `templateRenderer.test.ts` (suite now 24 tests).
- [x] DESIGN.md locked: signature element, expanded tokens, texture rules, landing voice guide with banned phrases.

**Status:** Complete (2026-08-25)

---

## Phase 8 — Data Integrity, Truthful Exports & Verification Harness
**Status:** Complete (2026-08-25)
