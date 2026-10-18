# Tool previews: real tool output, smaller card — 18 October 2026

Branch `testsprite-s4`, working tree after `d9065d51`. This replaces the hover card that drawing tools and PixiTools actions show (the [16 October surfaces record](2026-10-16-studio-surfaces.md) gave popovers their shared motion; this card now uses it too).

## What changed

- **Clips run the studio's own code.** The old canvas drew hand-made stand-ins: a vector heart, a fake gradient, a wipe from one style to another. Each clip in [`src/components/ui/toolPreview/clips.ts`](../../src/components/ui/toolPreview/clips.ts) now runs the function the tool calls, on Bun from `bunSprite.ts`:
  - drawing tools use the Bresenham, Pixel Perfect, ellipse, rectangle, Bézier and 2:1 rasterizers. The brush handler's stamp offset and dither-matrix filter are copied into the clip.
  - Flood Fill, Color Replace, Erase Sampled Color and Pixel Gradient run `performFloodFill`, `replaceLayerColor`, `eraseMatchingColor` and `pixelGradient`.
  - selections draw marching ants from `extractSelectionBoundarySegments` and `createBoxMask`. The wand repeats the 4-connected exact-color flood in `useSelectionPointerHandler`.
  - Lighting maps the bulb with the player's `lampFromPointer`/`snapLamp`, then calls `renderParametric2p5DLighting`. Normal views use the EDT → inflated height → tangent normal → RGB bake.
  - RotSprite goes through `planLayerRotation` and `rotSprite` (pixel-perfect, as `useGeometricEvents` calls it). Cleanup, Sel-Out, jaggies, thinning, strays, 47-blob contours, ground shadow, grades, palette snap, harmonize, OKLCH ramp, both error-diffusion dithers and the in-between morph call their engine functions.
  - Normal Chisel builds a 2 px bevel height map from the same EDT and Sobel normal field, then lights it from the top left. It shows the relief a chisel stroke creates; it does not replay `ChiselStrokeSession`.
- **A pocket copy of the canvas.** The stage is the 32×24 canvas at 7× (224×168). It uses the studio's transparency checker rule, its wooden frame tokens (`--frame-wood`, `--frame-light`, `--frame-dark`), the brush ghost square, the crosshair and the gold press ring. Under the stage, a status strip shows the step caption and a live `x·y` readout. A three-part progress rule (before 16%, action 56%, result 28%) replaces the storyboard row.
- **Hover the clip to scrub.** Moving the mouse across the stage pauses the loop and scrubs it; leaving resumes from there.
- **Smaller card.** 246 px wide instead of 304, with a 24 px icon, a 13 px title, 12 px description and an 11 px tip line instead of the dashed tip box. Keycaps use ⇧/⌃/⌥ glyphs, so long names such as Erase Sampled Color fit.
- **Shared motion.** The card blooms through `SpringSurface` from the caret's point and exits through `AnimatePresence`. Gliding between tools uses `cssSpring(MORPH_W)`. Once rendered, the card measures its real height and moves up if it would run off the bottom of the window.
- **Loading.** The clip engine (lighting, RotSprite and so on) is a lazy chunk. It starts loading on the first hover intent, during the 260 ms open delay.

## Findings recorded while building the clips

- `planLayerRotation` refuses any turn that would clip the layer. The first RotSprite clip put the carrot on a 14 px canvas, so every step stayed at 0°. The clip now uses a 20 px canvas, and a unit test asserts every step changes pixels.
- `morphInBetweenFrameAtFraction` stays crisp for a 2 px vertical hop. From about 3 px, and on any diagonal jump, it blends ink into fur and the frame turns grey. The clip uses a 2 px bob: the two keyframes flip (1 · 2), frame ½ develops, then 1 · ½ · 2 plays back.
- `applyRiemersmaDither` (Smooth Dithering) collapses a black-to-white ramp to all black with a black/white palette; Atkinson spreads the same ramp correctly. Its error history weights sum to about 5.6 instead of 1. The existing mid-gray unit test passes because alternating errors cancel. The preview calls the engine unchanged, so it shows the faulty output until the engine is fixed.
- `cleanJaggiesOnCanvas` fills L-corners with blended pixels rather than removing them; the clip shows that output as is.
- Sprite cleanup removes only neutral (grey) specks, so the cleanup clips use grey scanner dust.

## Verification

Run on 18 October against the development server on Windows, Playwright Chromium.

- `tsc --noEmit` and ESLint on the changed files passed.
- `tests/toolPreviewScenes.test.ts`: 44 passed. Every scene a preview can name has a clip with three distinct captions and a visible change. Pen leaves no 2×2 blocks, Erase Sampled Color touches only the sketch blue, RotSprite changes at every step, and the in-between frame sits halfway up the hop. The four lighting clips need a real canvas, so they are skipped in Node and covered in the browser.
- `tests/e2e/toolMotionPreview.spec.ts`: 3 passed (card is 246 px, stage 224 px, lasso caption and phase, PixiTools previews, Don't show again).
- A scratch Playwright gallery (not committed) captured every drawing tool and 18 PixiTools cards at three scrub points. It also captured three cards under the light scheme. Each clip was reviewed by eye.
