# PixiBun — product requirements for TestSprite

Upload this file as the **PRD source** when creating the TestSprite 3.0 Frontend UI project. It describes what a real artist does in PixiBun and what must be observably true afterwards. Live app: <https://pixibun.vercel.app>.

## Product in one paragraph

PixiBun is a browser studio for hand-made pixel art and animation. There is no account, no sign-in and no server-side project storage: projects live in the browser (IndexedDB) and leave as files (PNG, GIF, APNG, sprite sheets, `.pixibun` project files). Every test starts from a fresh browser, so every test must create the state it checks. No generative AI is used anywhere; `/pledge` states this.

## Ground rules for tests

- **No sign-in.** Choose "No sign-in required".
- **Fresh-browser defaults.** Automated browsers (`navigator.webdriver`) skip the first-run welcome and start with the classic studio (Studio Labs off). Use `?welcome=1` to test the welcome journey on purpose.
- **Deep links create known state.** `/studio?width=32&height=32` opens a blank 32×32 drawing. `/studio?template=bun` (also `mochi`, `sprout`, `teacup-frog`) opens a starter sprite.
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

## Negative and edge cases worth testing

- Undo with nothing to undo does nothing and shows no error.
- `/studio?width=0` or an absurd size does not crash the page; it falls back to a valid canvas or explains the limit.
- Exporting from an empty canvas still produces a valid (transparent) file or a clear message.
- Deleting the last layer is refused.
- Pressing tool shortcuts while typing in a text field types the letter instead of switching tools.

## Out of scope

Native OS file pickers, video (MP4/WebM) export in every browser, touch-only gestures, multi-user collaboration and offline service-worker behaviour are not reliably testable from a cloud browser and should not be generated.
