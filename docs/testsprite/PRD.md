# PixiBun — product requirements for TestSprite

Upload this file as the **PRD source** when creating the TestSprite 3.0 Frontend UI project. It describes what a real artist does in PixiBun and what must be observably true afterwards. Live app: <https://pixibun.vercel.app>.

## Product in one paragraph

PixiBun is a browser studio for hand-made pixel art and animation. There is no account, no sign-in and no server-side project storage: projects live in the browser (IndexedDB) and leave as files (PNG, GIF, APNG, sprite sheets, `.pixibun` project files). Every test starts from a fresh browser, so every test must create the state it checks. No generative AI is used anywhere; `/pledge` states this.

## Ground rules for tests

- **No sign-in.** Choose "No sign-in required".
- **Fresh-browser defaults.** Automated browsers (`navigator.webdriver`) skip the first-run welcome and start with the classic studio (Studio Labs off). Use `?welcome=1` to test the welcome journey on purpose.
- **Deep links create known state.** `/studio?width=32&height=32` opens a blank 32×32 drawing. `/studio?template=bun` (also `mochi`, `sprout`, `teacup-frog`) opens a starter sprite. `/studio?replay=…` opens a new drawing and redraws a recipe step by step, so its pixels are known exactly ([replay links](#replay-links-exact-drawings-to-assert)).
- **Prefer stable hooks.** Interactive parts carry `data-testid` attributes (listed per area below). Assert on them and on visible text, not on CSS classes or pixel positions of decorations.
- **The canvas is a `<canvas>`.** Assert what was drawn through the [canvas readout](#canvas-readout-assert-what-was-drawn) below, and the rest through visible state: Undo/Redo availability, layer and frame counts, the save badge, status bar text, export results. Do not assert on decorative animation or on screenshot pixels.
- **Downloads are real files.** An export test passes when a download with the right extension starts, and fails on an error toast.

## Canvas readout: assert what was drawn

The Studio describes the active frame as text in a region named **Canvas readout** (`data-testid="canvas-readout"`). It is visually hidden but present in the DOM and the accessibility tree, so read its text; do not require it to be visible. Use it to assert the outcome of every drawing, erasing, layer, frame and Undo/Redo step.

| Hook | Meaning | Fresh `/studio?width=32&height=32` |
| --- | --- | --- |
| `canvas-readout-size` | Canvas width×height | `32×32` |
| `canvas-readout-frame` | Active frame of frame count | `1 of 1` |
| `canvas-readout-frames` | Frame count | `1` |
| `canvas-readout-layer` | Active layer name | `Base Layer` |
| `canvas-readout-layers` | Layers in the active frame | `1` |
| `canvas-readout-pixels` | Painted (non-transparent) pixels in the active frame's visible layers | `0` |
| `canvas-readout-colors` | Distinct painted colors | `0` |
| `canvas-readout-top-colors` | Up to four `#rrggbb count` pairs, most used first | `none` |
| `canvas-readout-digest` | 8-character fingerprint of the frame's pixels | `8c00b365` |
| `canvas-readout-summary` | One sentence announced to screen readers | `32×32 canvas, frame 1 of 1, layer Base Layer: 0 painted pixels in 0 colors.` |

How to use it:

- **Wait for `data-state="ready"`** on `canvas-readout` before reading values. It changes to `pending` on an edit and back to `ready` about 0.1 s after the mouse is released, Undo or Redo. During a drag it still shows the previous step; that is intended.
- **Record, then compare.** Read `canvas-readout-pixels` and `canvas-readout-digest` before an action and compare after it. Where the pointer lands decides exact counts, so assert relationships (greater, smaller, equal to a recorded value, back to blank) rather than a fixed count, unless the case starts from a known template.
- **Drawing a stroke** with Pen raises `canvas-readout-pixels` above its previous value, makes `canvas-readout-colors` at least `1` and changes the digest. The default Pen color is `#3a2e4c`, so `canvas-readout-top-colors` contains `#3a2e4c`.
- **Undo** after one stroke on a blank canvas returns `canvas-readout-pixels` to `0` and the digest to exactly `8c00b365`. **Redo** returns both to exactly the values recorded after the stroke.
- **Erasing** part of a stroke lowers `canvas-readout-pixels` without reaching `0`.
- **Hiding** the only painted layer shows `0` pixels and digest `8c00b365`; showing it again restores the recorded digest.
- **A locked layer** refuses a stroke: pixels and digest stay exactly as before.
- **Adding a layer** raises `canvas-readout-layers` by one and names it in `canvas-readout-layer` (`Layer 2`). **Adding a frame** raises `canvas-readout-frames` and shows `2 of 2` in `canvas-readout-frame`.
- **Starter template:** `/studio?template=bun` opens at `16×16` with `192` painted pixels and digest `6af29269` on every fresh load.

PixiBun's own browser suite checks each statement above (`tests/e2e/canvasReadout.spec.ts`).

## Replay links: exact drawings to assert

A replay link draws a known picture through the Studio: `/studio?replay=<recipe>` saves the current drawing, opens a new one and applies each recipe step (Pen, Eraser, Line, Rectangle, Ellipse, Fill, add layer, add frame) as its own Undo step. Pair it with the canvas readout to assert **exact** values instead of relationships. The recipe format, and every golden below with all its readout values, is in [replays.md](replays.md).

- **Wait for `data-testid="replay-status"` to have `data-state="applied"`** (its `data-steps` is the step count), then for `canvas-readout` to have `data-state="ready"`. Then assert.
- After the link is drawn, the address bar no longer contains `replay=`; reloading restores the saved drawing rather than drawing it again.
- A link that cannot be read never changes the drawing: `replay-error` appears with the first problem in `replay-error-message` and `replay-status` shows `data-state="error"`.

PixiBun's own suites check each golden twice: a reference model in `tests/replayLink.test.ts` and the real Studio in `tests/e2e/replayLink.spec.ts`.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Welcome page: animated scene, starter shelf (four starter friends), "the bench" mini-editor, links into the Studio |
| `/studio` | The full editor |
| `/playground` | Coached drawing lessons with a practice sheet separate from the Studio drawing |
| `/pledge` | Dated no-generative-AI pledge |
| `/open` | Opens a shared postcard / project link |

## User journeys and acceptance criteria

### 1. Arrive and start drawing

- The welcome page loads with the PixiBun name and a way into the Studio.
- Choosing a starter friend opens the Studio with that sprite on the canvas (`main-composite-canvas` visible, status bar `status-bar` visible).
- Choosing a blank size opens an empty canvas of that size.
- `/pledge` shows the no-generative-AI pledge text.

### 2. Draw, erase and undo

- Pressing **B** selects Pen, **E** Eraser, **G** Flood Fill, **L** Line, **U** Rectangle, **O** Ellipse, **M** Marquee Box. The active tool's control shows as selected.
- Drawing a stroke on the canvas enables **Undo** (`undo-button`). Undo disables or rewinds it and enables **Redo** (`redo-button`). **Ctrl+Z** / **Ctrl+Shift+Z** / **Ctrl+Y** do the same.
- Erasing after drawing is itself one undoable step.
- Tool options (`tool-options-button`, `tool-options-rail`) change brush size; the shortcut for a size-stepping tool steps 1 → 2 → 3 → 4 px.
- Symmetry toggles (`toggle-symmetry-h`, `toggle-symmetry-v`) turn on and off and show their state.

### 3. Layers

- The layers panel shows a count (`layers-stack-count`). Adding a layer increases it by one; deleting decreases it; Undo restores it.
- Hiding a layer keeps the count but marks the layer hidden.
- A locked layer refuses drawing: a stroke on it does not create an Undo step and the Studio explains why.

### 4. Frames and animation

- The timeline (`bottom-timeline`) shows frames. **Add frame** (`add-frame-button`) adds one; the new frame becomes active.
- Onion skin (`onion-skin-settings`) can be switched on; a faded guide canvas (`onion-skin-canvas`) appears when there is a neighbouring frame.
- Play loops the frames; Stop returns to an editable frame.

### 5. Colors and palettes

- The color dock (`toolbar-color-dock`) shows primary and secondary colors; choosing a swatch changes the primary color.
- A named palette can be created and a color added to it.
- An OKLCH ramp (`oklch-ramp-button`) produces a row of related shades.

### 6. Save, reload and recover

- **Save** (`save-button`) changes the save badge (`save-status-badge` / `status-bar-save-indicator`) to a saved state.
- After saving, reloading `/studio` brings back the same drawing: same layer count, same frame count, Undo history starts fresh.
- Unsaved work after a reload offers recovery (`pending-recovery-banner`) rather than silently discarding it.

### 7. Export

- **Export** (`export-button`) opens the export dialog with tabs for single sprite and sprite sheet (`tab-single-sprite`, `tab-sprite-sheet-slicer`).
- PNG export downloads a `.png`. A multi-frame drawing can export a `.gif`. Cancel (`export-cancel-button`) closes without downloading.
- Asking for an unsafe scale shows a warning (`unsafe-scale-warning`) instead of freezing the tab.

### 8. Make the desk your own

- The appearance control (`appearance-button`) lists eight themes, each with Night and Day (`scheme-option-dark`, `scheme-option-light`).
- A chosen theme survives a reload.
- **Studio → Labs** (`labs-switchboard`) switches the five experiments on and off individually, and **Classic studio** switches them all off. Graphite and Plum always use classic controls.

### 9. Find anything

- **Ctrl+K** opens a searchable list of tools and actions; typing "pen" and pressing Enter selects Pen; Escape closes it.
- Every modal and popover closes with Escape and returns focus to the control that opened it.

### 10. First-run welcome

- `/studio?welcome=1` opens the welcome journey (`welcome-journey`). **Next** (`welcome-next`) moves through hello → skill → look → tour → start; **Skip** (`welcome-skip`) closes it and lands on the Desk.
- Replay welcome (`replay-welcome`) in the Studio menu reopens it.

### 11. Learn in the Playground

- `/playground` shows a lesson with a practice sheet and a filmstrip (`playground-filmstrip`).
- **Return to drawing** leaves the Studio drawing unchanged; **Keep practice in Studio** saves the practice as a new project.

### 12. Light and motion (PixiTools)

- The lighting preview (`light-bulb-button`) shows a movable bulb (`pixel-light-bulb-gizmo`). **Apply** (`pixel-light-apply`) changes the artwork and is undoable; **Cancel** (`pixel-light-cancel`) leaves it unchanged.
- Strength controls (`pixel-light-strength-inc` / `-dec`) change the shown value (`pixel-light-strength-val`).
- Rigid-part motion (`piximotion-panel`): select a detail, set Start/End poses (`pose-btn-start`, `pose-btn-end`), bake (`piximotion-hud-bake-btn`) adds frames to the timeline; Cancel adds none.

### 13. Replay a known drawing and check its exact pixels

Each case opens one path from a fresh browser, waits as described in [replay links](#replay-links-exact-drawings-to-assert), and asserts the canvas readout exactly. Then it presses **Undo** once (`undo-button`), waits for `canvas-readout` `data-state="ready"`, asserts the after-Undo values, presses **Redo** (`redo-button`) and gets the first values back.

**13.1 Heart.** A red heart drawn row by row with Line, the background filled pale pink, and a three-pixel white highlight drawn with Pen.

```text
/studio?replay=1_16x16_e83a5c.ffd6e0.ffffff_l0.3.3.5.3~l0.10.3.12.3~l0.2.4.6.4~l0.9.4.13.4~l0.1.5.14.5~l0.1.6.14.6~l0.1.7.14.7~l0.2.8.13.8~l0.3.9.12.9~l0.4.10.11.10~l0.5.11.10.11~l0.6.12.9.12~l0.7.13.8.13~f1.0.0~p2.4.4.3.5.3.6
```

- `replay-status` `data-steps` is `15`; `canvas-readout-size` `16×16`, `canvas-readout-frame` `1 of 1`, `canvas-readout-layer` `Base Layer`, `canvas-readout-layers` `1`.
- `canvas-readout-pixels` is `256`, `canvas-readout-colors` `3`, `canvas-readout-digest` `57feec3e`.
- After one Undo: pixels `256`, colors `2`, digest `ddfeef45`. After Redo: digest `57feec3e` again.

**13.2 Three-frame bun hop.** A bun crouching, in the air and landing squashed: filled ellipses, Line ears and Pen eyes over three frames. The readout shows the last frame.

```text
/studio?replay=1_16x16_f4e6d0.3a2e4c_E0.2.9.12.15~l0.5.6.5.10~l0.9.6.9.10~p1.5.11~p1.9.11~F~E0.2.3.12.9~l0.5.0.5.4~l0.9.0.9.4~p1.5.5~p1.9.5~F~E0.1.9.13.15~l0.5.7.5.10~l0.9.7.9.10~p1.5.12~p1.9.12
```

- `replay-status` `data-steps` is `17`; `canvas-readout-size` `16×16`, `canvas-readout-frame` `3 of 3`, `canvas-readout-layer` `Base Layer`, `canvas-readout-layers` `1`.
- `canvas-readout-pixels` is `61`, `canvas-readout-colors` `2`, `canvas-readout-digest` `6a67b496`.
- After one Undo: pixels `61`, colors `2`, digest `b64dfb9c`. After Redo: digest `6a67b496` again.

**13.3 Sunset on two layers.** Sky filled orange and a filled sea rectangle on the base layer; a sun on Layer 2, then the Eraser cuts the horizon row out of the sun so the sea shows through.

```text
/studio?replay=1_16x16_ffb36b.2b4c7e.ffe66d_f0.0.0~R1.0.10.15.15~L~E2.4.5.11.12~x.3.10.12.10
```

- `replay-status` `data-steps` is `5`; `canvas-readout-size` `16×16`, `canvas-readout-frame` `1 of 1`, `canvas-readout-layer` `Layer 2`, `canvas-readout-layers` `2`.
- `canvas-readout-pixels` is `256`, `canvas-readout-colors` `3`, `canvas-readout-digest` `9511f3a5`.
- After one Undo: pixels `256`, colors `3`, digest `5e3f3ca4`. After Redo: digest `9511f3a5` again.

**13.4 Outlined shapes on a wide canvas.** A 32×20 canvas: a rectangle outline filled light blue, an ellipse outline filled yellow (the fill must stay inside), then a diagonal Line across both.

```text
/studio?replay=1_32x20_3a2e4c.7ec8e3.ffd166_r0.1.1.12.10~f1.5.5~e0.15.2.30.17~f2.22.9~l0.0.19.31.0
```

- `replay-status` `data-steps` is `5`; `canvas-readout-size` `32×20`, `canvas-readout-frame` `1 of 1`, `canvas-readout-layer` `Base Layer`, `canvas-readout-layers` `1`.
- `canvas-readout-pixels` is `317`, `canvas-readout-colors` `3`, `canvas-readout-digest` `04609d7e`.
- After one Undo: pixels `297`, colors `3`, digest `4af21a4e`. After Redo: digest `04609d7e` again.

**13.5 Winking face.** An ellipse outline filled yellow, Pen eyes and smile, the Eraser removes one eye, Pen draws the wink and a fill closes the erased pixel.

```text
/studio?replay=1_16x16_ffd23f.3a2e4c_e1.1.1.14.14~f0.7.7~p1.5.5.5.6~p1.9.5.9.6~p1.4.9.5.10.9.10.10.9~x.9.5.9.6~p1.8.6.10.6~f0.9.5
```

- `replay-status` `data-steps` is `8`; `canvas-readout-size` `16×16`, `canvas-readout-frame` `1 of 1`, `canvas-readout-layer` `Base Layer`, `canvas-readout-layers` `1`.
- `canvas-readout-pixels` is `129`, `canvas-readout-colors` `2`, `canvas-readout-digest` `c2a9a132`.
- After one Undo: pixels `128`, colors `2`, digest `e514c2d1`. After Redo: digest `c2a9a132` again.

**13.6 A broken link explains itself.** Open `/studio?replay=1_16x16_ff0000_p5.1.1` in a fresh browser: `replay-error-message` says step 1 uses color 5 but the palette only has color 0, `replay-status` shows `data-state="error"`, and the readout still shows the untouched fresh canvas (`32×32`, `0` pixels, digest `8c00b365`). The dismiss button (`replay-error-dismiss`) removes the message.

## Negative and edge cases worth testing

- Undo with nothing to undo does nothing and shows no error.
- `/studio?width=0` or an absurd size does not crash the page; it falls back to a valid canvas or explains the limit.
- Exporting from an empty canvas still produces a valid (transparent) file or a clear message.
- Deleting the last layer is refused.
- A replay link with a coordinate outside its canvas, an unknown step letter or a newer format version shows `replay-error` and leaves the drawing unchanged.
- Pressing tool shortcuts while typing in a text field types the letter instead of switching tools.

## Out of scope

Native OS file pickers, video (MP4/WebM) export in every browser, touch-only gestures, multi-user collaboration and offline service-worker behaviour are not reliably testable from a cloud browser and should not be generated.
