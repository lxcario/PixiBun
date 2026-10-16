# Studio follow-up: tool icons, Colors flyout, timeline actions, Live Preview and press — 16 October 2026

Branch `testsprite-s4`, after the [studio surfaces](2026-10-16-studio-surfaces.md) merge at `aae1c6cd`. Five commits: `6da38209`, `fedaca52`, `8b8cb1f6`, `2b455715` and `22ab81af`, then the performance branch `2e1cad67` merged as `1a74c26a`. The surfaces record keeps its own measurements; this record describes only what these commits changed. Main and the production deployment were still at `1a4b96b7` when it was written.

## Tool icons, Colors flyout and painting (`6da38209`, `fedaca52`)

- **Tool icons.** One hand-pixeled 16×16 family ([`pixelToolIcons.ts`](../../src/components/ui/pixelToolIcons.ts)) covers the drawing tools plus the eyedropper and swatches. Each bitmap compiles to three SVG paths (ink, shade and an accent "paint" tone), so it stays crisp at 1:1 and is inked on active buttons. Small inline labels keep the line glyphs.
- **Colors flyout** ([`ColorAccessFlyout`](../../src/components/layout/ColorAccessFlyout.tsx), `data-testid="color-access-flyout"`). It replaces the quick-swatch popover opened from the color wells:
  - Primary and Secondary chips that say which click paints with each, following the keymap (left/right click, or Paint/⇧ Paint in classic). The chip being edited is pressed and carries an **Editing** badge pinned to its corner.
  - An editable hex field (Enter applies, Escape restores), an eyedropper and a **Picker…** button for the full picker.
  - A hue-shifted **Shades** strip ([`generateShadeStrip`](../../src/lib/color/rampGenerator.ts)): shadows lean cool and highlights warm.
  - The current palette in an 8-column grid with primary/secondary notches, an **Edit ▸** link to the Palette panel, and **Recent** colors.
  - Click sets the edited color; Shift+click or right-click sets the other. Arrow keys, Home and End rove through each grid. Touch screens get 44 px targets.
  - It is a non-modal dialog on the shared `SpringSurface`: focus moves in when it opens, Escape closes it and returns focus to the dock if focus was inside, and it plays the real exit animation.
- **Recent colors** record only the color a picker drag settles on, so one drag no longer fills the list. Storage writes are guarded.
- **Painting.** A stroke commits one store update per frame (`commitBufferEdit`) instead of a dirty mark per pointer move. The viewport no longer re-renders on raster edits outside motion sessions. The navigator and Live Preview redraw at most every 120 ms during a stroke, timeline thumbnails every 150 ms ([`useThrottledValue`](../../src/hooks/useThrottledValue.ts)). `StudioLayout` no longer re-renders the whole Studio when the dirty flag, save status or Undo availability changes; heavy panels and overlays are memoized.
- **Zoom.** Touchpad and pinch zoom accumulate wheel deltas, so a mouse notch is still one step. The seamless tile preview draws in an effect instead of resizing eight canvases every render.
- **Clarity.** The Play tooltip names the keymap's key (Enter in Standard). Tool buttons drop the native `title` that stacked over the hover card, and folded tool slots explain how to reach their other tools.

## Timeline frame actions (`8b8cb1f6`)

- The selected frame's **Duplicate**, **Delete** and **Move frame earlier / later** sit in the timeline toolbar instead of the hidden **Frame actions** menu. On windows at least 1536 px wide a readout shows the selected frame, the count and the total length, for example "Frame 2 / 6 · 0.6 s".
- Every frame card shows Duplicate and Delete beside its thumbnail: always on the selected frame, on hover or focus elsewhere. The reel ends in a dashed **New frame** slot ("Animate" while there is one frame).
- Right-click, the Context Menu key or Shift+F10 opens a frame menu on the shared spring surface, with Duplicate (Ctrl+D), Move earlier (Alt+←), Move later (Alt+→) and Delete (Del). Up/Down move through it; Escape or Tab returns focus to the frame.
- On a focused frame: Left/Right/Home/End select, Alt+Left/Right move, Ctrl/Cmd+D duplicates (the copy lands right after and becomes active), and Delete or Backspace removes it. Deleting shows a toast with **Undo**. An animation keeps at least one frame; guests in Co-Draw cannot change frames; the Playground keeps its own frame rules.
- Previous/Next frame buttons have accessible names. The loop button keeps its name while its label hides below 1280 px, so the toolbar fits at 1024 px.
- Four production specs click the toolbar buttons directly instead of opening the removed menu.

## Live Preview, top bar and unfolding surfaces (`2b455715`)

- **Live Preview** ([`FloatingPreviewWindow`](../../src/components/studio/FloatingPreviewWindow.tsx)) is rebuilt on the shared `pb-panel` surface with its soft shadow; the old heavy black shadow smeared against the tool rail. It opens in the canvas area's top-right corner and stays inside the canvas area while dragging, resizing or when panels resize it. Released within 20 px of an edge, it settles against it. Header, stage, play/readout, the 1x/2x/4x segmented control and the backdrop chips share one 10 px rhythm, and folding the window springs.
- **Top bar.** Mirror, zoom, Fit and View, the Drawing layout picker, Studio and Export share one shape (Export's height, radius, ink edge and drop). Secondary controls are light; Export keeps the accent fill.
- **Unfolding.** Every `SpringSurface` and `ModalWrapper` unfolds: a clip opens away from the trigger (from the middle for modals) on the bloom spring, and the content arrives one item at a time, rising 7 px out of a light blur, 42 ms apart after a 70 ms lead. The stagger is lifted after about 1.1 s so inner animations run normally. Reduced motion keeps the plain cross-fade.

## Pan and stroke performance (`2e1cad67`, merged as `1a74c26a`)

- **Imperative pan.** A pan gesture moves `#center-canvas-area` through a ref ([`livePan.ts`](../../src/lib/viewport/livePan.ts)) and writes `panX`/`panY` to the store once, on release. Shift and horizontal wheel pans commit after the wheel goes quiet. The Navigator's view box follows the live pan, and dragging the Navigator previews the same way.
- **Cached canvas bounds.** The canvas rectangle is read once per pointer-down, zoom, resize or store pan and shifted in place during a live pan, instead of on every pointer move.
- **Stroke layer cache** ([`strokeCompositeCache.ts`](../../src/lib/render/strokeCompositeCache.ts)). While a stroke is active, the layers below the active one are flattened into one canvas, which is always pixel exact. The layers above are flattened only when all of them are Normal (source-over) at full opacity with opaque-or-clear pixels; grouping semi-transparent layers rounds differently by up to 3/255 in Chrome, so those stay live. The cache keys on layer ids, opacity, blend mode, buffer revision, frame, active layer and size, and is dropped when the stroke ends.
- New tests: `tests/livePan.test.ts`, `tests/strokeCompositeCache.test.ts`, and additions to `tests/viewportTransform.test.ts` and `tests/selectionCancellation.test.tsx`.
- The merging session reported, from a development-server check in the built-in browser: no store writes during a 20-move middle-button pan (the canvas moved 160 px) and one on release; a stroke after the pan, a zoom or a programmatic pan landed on the aimed pixels; and strokes under a Multiply 60% layer and a Normal 100% layer matched a forced full re-composite pixel for pixel, mid-stroke and after release. Its earlier attempts ran stale code from the service worker cache and a 0×0 hidden window; those results were discarded, not counted.

## One elastic press (`22ab81af`)

- [`pressMotion.ts`](../../src/lib/motion/pressMotion.ts), mounted once in the root layout through [`PressMotion`](../../src/components/system/PressMotion.tsx), handles buttons, summaries and the button, tab, menu item, radio, option and switch roles. A held control eases down by about 3.5 px on its longer side (scale clamped to 0.95–0.988) over 170 ms, then springs back on `RELEASE` (320/17/0.8 in [`springs.ts`](../../src/lib/motion/springs.ts)) with one soft overshoot.
- Pointer, Space and Enter press; leaving, dragging, cancelling or blurring releases. It animates the CSS `scale` property, which composes with existing transforms and Motion styles.
- Removed so one motion governs every press: the `moon-ui` `translateY(1px)` rule, the top bar's active shift and hover lift, Tailwind `active:translate-y` / `active:scale` classes, the 80 ms `scale(0.97)` presses on tiles, buttons, swatches, sizes and pills, and two `whileTap` overrides.
- The canvas (`#center-canvas-area`), inputs, textareas, selects, editable content, disabled controls and `[data-no-press]` stay still. Reduced motion turns it off.

## Tests in these commits

- New: `tests/pressMotion.test.ts` (press scale by size and the opt-outs); additions to `tests/rampGenerator.test.ts` (shade strip), `tests/recentColors.test.ts` (settled picker colors) and `tests/viewportTransform.test.ts` (accumulated wheel zoom).
- Adjusted: selectors in `selectionGizmoLiveProof`, `studioChrome`, `recoveryAccessibility` and `stableStudioGeometry` for the new tool buttons; `artworkIdentity`, `motionRigPersistence` and `pixiMotionBindings` use the toolbar frame buttons; the Live Preview helper reads the new title.

## Verification

All checks ran on 16 October on Windows with Node 26 and Playwright Chromium.

**Branch head `22ab81af`, before the performance merge:** strict types and lint passed; Vitest passed 2,592 tests in 248 files. On the development server, `studioChrome`, `studioSurfaces` and `selectionGizmoLiveProof` passed (8 tests). A production build passed.

<a id="browser-result"></a>

**Production build of `22ab81af`, five adjusted production specs** (`artworkIdentity`, `motionRigPersistence`, `pixiMotionBindings`, `stableStudioGeometry`, `recoveryAccessibility`): 14 passed, 4 failed. These verdicts stand:

- `recoveryAccessibility` "visible Home and Studio labels…": axe `label-content-name-mismatch` on the reel's **New frame** slot, whose name ("Add a new frame at the end") did not contain its visible text. Product defect from `8b8cb1f6`.
- `recoveryAccessibility` "large flyout color controls…": a flyout button measured 43.997 px against the 44 px touch minimum, because the test measured while the flyout was still blooming and unfolding. Test timing; the at-rest size was not in question. The test's `/^Sec /` locator also predated the new chip names.
- `stableStudioGeometry` (Atelier and Cozy Classic): at exactly 1280 px, **Collapse Timeline** sat 52 px past the timeline's right edge. The new frame readout and Duplicate/Delete labels appeared from `xl` (1280 px) and did not fit. Product defect from `8b8cb1f6`.

**Fixes:** the readout and the Duplicate/Delete labels now appear from 1536 px (`2xl`), and the slot's name leads with its visible word ("New frame: add a blank frame at the end", or "Animate: …"). The flyout test waits for the surface's finite animations to finish before measuring, then asserts the same 44 px minimum, and finds the Secondary chip by its new name.

**After the fixes, on `1a74c26a` (with the performance merge) plus this documentation:** the shared checkout then also held another session's unfinished `src/lib/theme/scenes.ts` edit, which failed type checking. To keep it out, these ran in a separate worktree containing only the changes above, with its own `npm ci`:

- Strict types, lint and documentation checks passed; Vitest passed 2,615 tests in 250 files.
- A production build passed, and the same five production specs passed 18 of 18 in Chromium, one worker, no retries.

Not run: Firefox, WebKit, the remaining production and development specs, the pre-push gate's Node 22 performance stage, and physical touch devices. The handbook pictures of the timeline (`animation-timeline.png`), color dock (`compact-color-dock.png`) and Live Preview (`single-live-preview.png`) show the 15 October build; the guides say so instead of replacing them.
