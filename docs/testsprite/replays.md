# Replay links: exact drawings for black-box tests

A replay link opens the Studio on a new drawing and redraws it step by step: `/studio?replay=<recipe>`. Because the result is exact, a test that cannot see inside the `<canvas>` can open the link and compare the [Canvas readout](PRD.md#canvas-readout-assert-what-was-drawn) with the known values below. The links work on any PixiBun build that includes replay links (a local development server, or a deployment made from such a build); this page does not claim that the live site already serves them.

Source of truth: [replays.json](replays.json). [tests/replayLink.test.ts](../../tests/replayLink.test.ts) recomputes every value below with a plain-array model that shares no drawing code with the Studio, and checks this page and the [PRD](PRD.md) quote them. [tests/e2e/replayLink.spec.ts](../../tests/e2e/replayLink.spec.ts) opens each link in the Studio and asserts the readout, then one Undo.

## What happens when a link opens

1. The current drawing is saved, as for a starter link, and a new drawing named **Replay** opens at the link's size with the link's palette.
2. Each step is applied in order on the active layer of the active frame. Every step is its own Undo step: Undo walks back through the recipe one step at a time, and Redo forward again.
3. The `replay` parameter is removed from the address bar, so reloading restores the saved drawing instead of drawing it again.
4. The hidden status `data-testid="replay-status"` changes from `data-state="running"` to `data-state="applied"`, with the step count in `data-steps`, and a toast says how many steps were replayed.

A link that cannot be read never changes the drawing. The Studio shows a message (`data-testid="replay-error"`, text in `replay-error-message`) naming the first problem, for example `Step 1 (p5.1.1) uses color 5, but the palette only has color 0.`, and `replay-status` shows `data-state="error"`. If a step fails after the new drawing opened (for example, the browser is out of Undo memory), the steps before it stay drawn and undoable, and the message says how many were drawn.

## How a test should use a replay

1. Open the path from a fresh browser.
2. Wait for `replay-status` to have `data-state="applied"`, then for `canvas-readout` to have `data-state="ready"`.
3. Assert the readout values in the table for that replay. Exact equality is intended: the same link draws the same pixels on every load.
4. Optionally press **Undo** once (`undo-button` or Ctrl+Z), wait for `data-state="ready"` again and assert the *After one Undo* column; **Redo** returns to the first column.

## Golden replays

### Heart (`heart`)

A red heart drawn row by row with Line, the background filled pale pink, and a three-pixel white highlight drawn with Pen.

```text
/studio?replay=1_16x16_e83a5c.ffd6e0.ffffff_l0.3.3.5.3~l0.10.3.12.3~l0.2.4.6.4~l0.9.4.13.4~l0.1.5.14.5~l0.1.6.14.6~l0.1.7.14.7~l0.2.8.13.8~l0.3.9.12.9~l0.4.10.11.10~l0.5.11.10.11~l0.6.12.9.12~l0.7.13.8.13~f1.0.0~p2.4.4.3.5.3.6
```

| Hook | After the link (15 steps) | After one Undo |
| --- | --- | --- |
| `canvas-readout-size` | `16×16` | `16×16` |
| `canvas-readout-frame` | `1 of 1` | `1 of 1` |
| `canvas-readout-layer` | `Base Layer` | `Base Layer` |
| `canvas-readout-layers` | `1` | `1` |
| `canvas-readout-pixels` | `256` | `256` |
| `canvas-readout-colors` | `3` | `2` |
| `canvas-readout-top-colors` | `#ffd6e0 156, #e83a5c 97, #ffffff 3` | `#ffd6e0 156, #e83a5c 100` |
| `canvas-readout-digest` | `57feec3e` | `ddfeef45` |

### Three-frame bun hop (`hop`)

A bun crouching, in the air and landing squashed: filled ellipses, Line ears and Pen eyes over three frames. The readout shows the last frame.

```text
/studio?replay=1_16x16_f4e6d0.3a2e4c_E0.2.9.12.15~l0.5.6.5.10~l0.9.6.9.10~p1.5.11~p1.9.11~F~E0.2.3.12.9~l0.5.0.5.4~l0.9.0.9.4~p1.5.5~p1.9.5~F~E0.1.9.13.15~l0.5.7.5.10~l0.9.7.9.10~p1.5.12~p1.9.12
```

| Hook | After the link (17 steps) | After one Undo |
| --- | --- | --- |
| `canvas-readout-size` | `16×16` | `16×16` |
| `canvas-readout-frame` | `3 of 3` | `3 of 3` |
| `canvas-readout-layer` | `Base Layer` | `Base Layer` |
| `canvas-readout-layers` | `1` | `1` |
| `canvas-readout-pixels` | `61` | `61` |
| `canvas-readout-colors` | `2` | `2` |
| `canvas-readout-top-colors` | `#f4e6d0 59, #3a2e4c 2` | `#f4e6d0 60, #3a2e4c 1` |
| `canvas-readout-digest` | `6a67b496` | `b64dfb9c` |

### Sunset on two layers (`sunset`)

Sky filled orange and a filled sea rectangle on the base layer; a sun on Layer 2, then the Eraser cuts the horizon row out of the sun so the sea shows through.

```text
/studio?replay=1_16x16_ffb36b.2b4c7e.ffe66d_f0.0.0~R1.0.10.15.15~L~E2.4.5.11.12~x.3.10.12.10
```

| Hook | After the link (5 steps) | After one Undo |
| --- | --- | --- |
| `canvas-readout-size` | `16×16` | `16×16` |
| `canvas-readout-frame` | `1 of 1` | `1 of 1` |
| `canvas-readout-layer` | `Layer 2` | `Layer 2` |
| `canvas-readout-layers` | `2` | `2` |
| `canvas-readout-pixels` | `256` | `256` |
| `canvas-readout-colors` | `3` | `3` |
| `canvas-readout-top-colors` | `#ffb36b 137, #2b4c7e 95, #ffe66d 24` | `#ffb36b 137, #2b4c7e 90, #ffe66d 29` |
| `canvas-readout-digest` | `9511f3a5` | `5e3f3ca4` |

### Outlined shapes on a wide canvas (`shapes`)

A 32×20 canvas: a rectangle outline filled light blue, an ellipse outline filled yellow (the fill must stay inside), then a diagonal Line across both.

```text
/studio?replay=1_32x20_3a2e4c.7ec8e3.ffd166_r0.1.1.12.10~f1.5.5~e0.15.2.30.17~f2.22.9~l0.0.19.31.0
```

| Hook | After the link (5 steps) | After one Undo |
| --- | --- | --- |
| `canvas-readout-size` | `32×20` | `32×20` |
| `canvas-readout-frame` | `1 of 1` | `1 of 1` |
| `canvas-readout-layer` | `Base Layer` | `Base Layer` |
| `canvas-readout-layers` | `1` | `1` |
| `canvas-readout-pixels` | `317` | `297` |
| `canvas-readout-colors` | `3` | `3` |
| `canvas-readout-top-colors` | `#ffd166 127, #3a2e4c 110, #7ec8e3 80` | `#ffd166 137, #3a2e4c 80, #7ec8e3 80` |
| `canvas-readout-digest` | `04609d7e` | `4af21a4e` |

### Winking face (`wink`)

An ellipse outline filled yellow, Pen eyes and smile, the Eraser removes one eye, Pen draws the wink and a fill closes the erased pixel.

```text
/studio?replay=1_16x16_ffd23f.3a2e4c_e1.1.1.14.14~f0.7.7~p1.5.5.5.6~p1.9.5.9.6~p1.4.9.5.10.9.10.10.9~x.9.5.9.6~p1.8.6.10.6~f0.9.5
```

| Hook | After the link (8 steps) | After one Undo |
| --- | --- | --- |
| `canvas-readout-size` | `16×16` | `16×16` |
| `canvas-readout-frame` | `1 of 1` | `1 of 1` |
| `canvas-readout-layer` | `Base Layer` | `Base Layer` |
| `canvas-readout-layers` | `1` | `1` |
| `canvas-readout-pixels` | `129` | `128` |
| `canvas-readout-colors` | `2` | `2` |
| `canvas-readout-top-colors` | `#ffd23f 85, #3a2e4c 44` | `#ffd23f 84, #3a2e4c 44` |
| `canvas-readout-digest` | `c2a9a132` | `e514c2d1` |

## Format (version 1)

A recipe uses only letters, digits and `_ . ~`, so it needs no escaping in a URL:

```text
1_<width>x<height>_<palette>_<steps>
```

- `1` is the format version. A link with a newer version is refused with a message naming it.
- Width and height are whole pixels from 1 to 64.
- The palette is 1–16 different colors, each six hex digits, separated by `.` (`e83a5c.ffd6e0`). Steps refer to colors by position, from `0`.
- Steps are separated by `~`. Each is one letter, a palette index for steps that paint, then `.`-separated coordinates (`x.y`, counted from the top-left pixel, `0` up to size − 1):

| Step | Meaning | Points |
| --- | --- | --- |
| `p<c>.x.y…` | Pen through the points, joined by straight lines as a drag would | 1–64 |
| `x.x.y…` | Eraser through the points | 1–64 |
| `l<c>.x0.y0.x1.y1` | Line | 2 |
| `r<c>` / `R<c>` | Rectangle outline / filled, corner to corner | 2 |
| `e<c>` / `E<c>` | Ellipse outline / filled, inside the corners' box | 2 |
| `f<c>.x.y` | Flood fill of the touching area of exactly that color | 1 |
| `L` | Add a layer above; it becomes the active layer | 0 |
| `F` | Add a frame (empty, same layers); it becomes the active frame | 0 |

Every stamp is one pixel. The Studio's own brush size, symmetry, selection and fill settings do not apply, so a link draws the same pixels for everyone. Lines, rectangles, ellipses and Pen paths use the same rasterizers as the Studio's tools.

Limits: 2,048 characters, 200 steps, 7 added layers and 23 added frames. Numbers have no leading zeros; coordinates outside the canvas, unknown letters, a missing or out-of-range palette index, a repeated palette color and a wrong number of points are each refused with a message naming the step.

Sources: [format and validation](../../src/lib/project/replayLink.ts), [applying steps](../../src/lib/project/applyReplay.ts), [undoable edits](../../src/lib/engine/historyEdit.ts), [Studio wiring](../../src/components/layout/StudioLayout.tsx), [message](../../src/components/layout/ReplayNotice.tsx).
