# Triage of the 17 October comprehensive audit — 18 October 2026

Branch `fix/audit-2026-10-17-triage`, cut from `testsprite-s4` at `d9065d51`. Main and production were not touched. This record gives a verdict on every engineering finding of the local 17 October audit (`ENGINEERING_AUDIT.md`, `AUDIT_VERIFICATION.md`, `EXECUTIVE_VERDICT.md`) and fixes the real defects. The audit folder and its proof suite stay local and untracked ([catalog entry](../archives.md#record-docs-audits-2026-10-17-comprehensive)); their original text and verdicts are unchanged.

The audit's proof suite (`auditVerification.test.ts.txt`) asserts that each defect *exists*, so it was never added to `tests/`. Regressions below assert the corrected behaviour instead. Each new case was also run against the unchanged source; how many failed is stated per fix.

## Verdicts

| Finding (audit severity) | Verdict | Change |
| --- | --- | --- |
| BLOCKER-01 / ENG-01: hidden layers take edits (P0) | **Defect**, wider than the proof shows. The proof only wrote to a buffer directly and showed the compositor skips hidden layers; both are intended. Through the real pointer and selection paths, the defect is confirmed and extends to *locked* layers. | Fixed |
| BLOCKER-02 / ENG-02: even-size ellipses impossible (P1) | **Defect**. | Fixed; four golden replays change |
| BLOCKER-03 / ENG-03: Bézier gaps (P1) | **Defect** for gaps: the existing test already promised 8-connectivity. **Intended** for diagonal steps, which the 4-connected Bucket and Wand cannot leak through. | Gaps fixed |
| BLOCKER-04 / ENG-04: duplicate rectangle points (P1/P2) | **Defect**. | Fixed |
| ENG-05: colour-match metrics differ (P2) | **Intended**. The tools have separate settings: Bucket reads *Fill tolerance*; Wand and Color Replace share *Color tolerance*; Erase Color has its own. Color Replace matches RGB only and keeps each pixel's alpha, which the guide documents and `tests/colorReplace.test.ts` pins. Region tools (Bucket, Wand) compare alpha too. | None; see follow-ups |
| ENG-06: `normalizeRect` half-open vs inclusive (P2) | **Not a defect**. `AUDIT_VERIFICATION.md` refutes it too: the only caller, `SafeCanvas.getImageData`, passes `(x, x + w)`, and Box Select does its own inclusive `+ 1`. | Doc comment and a round-trip test |
| ENG-07: per-instance relay rate limit (P2) | **Known limit**, already stated in [security boundaries](../contracts/security-boundaries.md). | None |
| ENG-08: "orphaned" compute engines (P2) | **Refuted** as stated: Smooth Jaggies, in-between morphing and the tileset decomposer are reachable from the inspector, as `AUDIT_VERIFICATION.md` also found. Where they belong is a product question, not a defect. | None |
| ENG-09: co-draw host owns structure (P3) | **Intended**, documented in `src/lib/sync/coDrawBridge.ts` as an MVP constraint. | None |
| ENG-10: 16 px colour-dock targets (P3) | **Intended** waiver, scoped to the dock in `tests/helpers/studioAccessibilityFindings.ts`; every other target finding still fails. | None |

The audit's claim that earlier verifications "fabricated" Node 22 runs rests on its own machine's default `node` being v26.5.1. The repository pins 22.23.3 (`.nvmrc`), and the gate stops on another major version. This record's runs used `artifacts/runtime/node-v22.23.3-win-x64` from the local checkout.

## BLOCKER-01: hidden and locked layers

**Before.** Pointer tools checked `locked` but not `visible`. A stroke, fill or curve on a hidden layer changed its pixels and pushed an Undo step, with nothing on screen. `useViewportSelection` checked neither flag. **Delete** and **Ctrl+X** cleared a locked layer's selected pixels, a move drag lifted them, and **Paste** floated onto a locked layer. The repository already treats hidden or locked layers as unpaintable elsewhere: `findPaintableLayerBelow`, Merge Down's refusal and the free-transform commit.

**After.** `src/lib/canvas/layerEditGuard.ts` holds one rule: canvas edits change only a visible, unlocked layer. A refusal shows a toast before any snapshot, so no pixels change and no history is added.

- The pointer path refuses hidden layers after its existing lock warning. `drawPointsOnActiveLayer` and `drawProvisionalPoint` check both flags as a backstop.
- Curve refuses both flags at pointer-down. Its commit was already cancelled by any change to the layer object.
- Selection lift, commit, Cut, Delete, Paste and the transform's lift refuse both. A floating selection whose layer becomes locked or hidden stays floating. **Esc** and **Ctrl+D** keep the selection until the layer is editable again.
- Eyedropper, Copy and making a selection (Box, Lasso, Wand) are unchanged.

**Evidence.** `tests/layerEditBoundary.test.tsx` mounts `CenterViewport` with the byte-copy canvas fixture and compares RGBA and Undo state. Against the unchanged hooks, 9 of 11 cases failed:

- Pen, Eraser and Bucket changed a hidden layer's pixels.
- Line and Rectangle each added an Undo step.
- Curve showed no refusal.
- Delete/Cut left a locked or hidden layer's selected pixels at alpha 0.
- Paste created a floating selection on a locked layer.

The two editable-layer controls passed then and now; the second checks that Delete is undone exactly.

## BLOCKER-02: ellipse parity

**Before.** The midpoint ellipse mirrored about an integer centre, so its span was always odd. An 8×8 drag drew 7×7 and a 16×16 drag 15×15; a two-pixel-wide box fell back to a diagonal Bresenham line. Its filled variant also disagreed with its own outline: an 11×7 fill had a one-pixel tip under a five-pixel outline edge.

**After.** `getEllipsePoints` follows A. Zingl's rectangle-bounded ellipse, an error-term rasterizer that accepts either parity. It spans the inclusive box, as the Rectangle tool does. Even spans mirror about a 2×2 hub, each pixel is listed once, and the fill is the outline plus each row's interior. A one-pixel-thick box is a straight run. Odd outlines such as 11×7, 21×21 and 5×5 are pixel-identical to before; 9×9 loses its L-shaped double pixels.

**Evidence.** In `tests/rasterGeometry.test.ts`, every box from 1×1 to 40×40 is checked for both outline and fill:

- the outline touches all four box edges, has no duplicates, is one 8-connected component and is mirror-symmetric;
- the fill contains the outline, with one unbroken span per row.

Seven of eight ellipse cases failed against the old rasterizer; the 2×2 span case passed by accident (a diagonal also spans 2×2).

**Golden replays.** Replay links use the same rasterizer, so four of five golden replays now read differently. Heart has no ellipse and is unchanged. `docs/testsprite/replays.json`, the [replay guide](../testsprite/replays.md) and the [TestSprite PRD](../testsprite/PRD.md) carry the regenerated values; `tests/replayLink.test.ts` pins them to the reference model.

| Replay | Pixels | Digest | After one Undo |
| --- | --- | --- | --- |
| hop | 61 → 79 | `6a67b496` → `1862d21e` | `b64dfb9c` → `4a1069cc` |
| sunset | 256 → 256 | `9511f3a5` → `ef9f655d` | `5e3f3ca4` → `a0c9eb4d` |
| shapes | 317 → 336 | `04609d7e` → `67a657a9` | `4af21a4e` → `ede47e99` |
| wink | 129 → 148 | `c2a9a132` → `44f5ccdd` | `e514c2d1` → `b9133882` |

TestSprite tests generated or stored outside this repository from the old PRD will fail against a build with this change until they take the new values. The live site keeps the old values until this branch is deployed.

## BLOCKER-03: Bézier gaps

**Before.** Uniform steps in *t* could outrun one pixel per step where the curve is fast. For example, (0,50)–(0,30)–(100,50) jumped from (92,49) to (94,49).

**After.** Consecutive raw samples more than one pixel apart are bridged with Bresenham pixels. The bridge runs between samples, not between deduplicated points, so a curve that doubles back gains no chord. Diagonal stair steps stay: a 4-connected flood fill cannot pass between diagonal neighbours. A new case shows the Bucket stays on its side of an edge-to-edge curve.

**Evidence.** The gap and the sweep of non-reversing control points failed against the old curve. The doubling-back and watertightness cases passed before and after, since they pin intended behaviour.

## BLOCKER-04: rectangle duplicates

A 1-pixel-high or 1-pixel-wide outline listed every pixel twice, and a single click listed one pixel twice. Without symmetry, `drawPointsOnActiveLayer` stamps each listed point, so a translucent colour would double. Each pixel is now listed once. Four cases, including every outline up to 12×12 against its perimeter count, failed against the old code.

## The audit's proof suite on this branch

A temporary copy of `auditVerification.test.ts.txt` run against this branch (and deleted afterwards):

- **5 assertions now fail, as expected.** The 8×8 and 16×16 ellipse widths, both rectangle duplicate counts and the Bézier gap.
- **4 still pass, because they describe intended behaviour.** A direct buffer write onto a hidden layer, diagonal Bézier steps, the separate colour metrics, and `normalizeRect`'s half-open width.

## Verification

- `npm run gate` passed all five stages on Node 22.23.3, with **2,883 unit tests across 266 files**: documentation, types, lint, the unit suite with coverage, and the warmed performance budget. It ran on the working tree before the documentation commit was created.
- **Retained failed runs.**
  - The first gate run stopped at Stage 1: `docs/generated/test-inventory.json` was stale until `npm run docs:inventory` listed the two new test files.
  - The second stopped at Stage 4: the 40×40 ellipse sweep timed out at 5 s under coverage, with one assertion per pixel. It now asserts once per box (about 0.3 s) and checks the same properties.
- **Not run in the first verification:** Playwright and production browser suites, including `tests/e2e/replayLink.spec.ts`, which reads the same `replays.json`. No TestSprite run is claimed. The production build (`gate:full`) was not run. The browser runs below were added afterwards; TestSprite and `gate:full` remain unrun.
- Unit evidence uses the repository's byte-copy canvas fixture, which does not model source-over alpha. The double-alpha effect of duplicate points is inferred from the stamping code, not measured in a browser.

### Browser suites, 18 October

Run on source `925faa3d` (this branch's tip before this section was added), Node 22.23.3 from `artifacts/runtime/node-v22.23.3-win-x64`, Chromium build 1234. The worktree's `node_modules` is a junction to the main checkout's, which Turbopack refuses ("points out of the filesystem root"). Each server below therefore ran with a temporary, uncommitted `turbopack: { root: "D:/PixiBun" }` in `next.config.ts`, reverted afterwards. The development port 3000 belonged to another checkout, so the e2e specs ran through a temporary copy of `playwright.config.ts` pointing its web server and `baseURL` at port 3210, with the list reporter only; tests, timeouts and browser project were unchanged.

| Suite | Server | Result |
| --- | --- | --- |
| `tests/e2e/replayLink.spec.ts` | `next dev --turbopack` | **6 passed**: heart, hop, sunset, shapes and wink with the regenerated digests, plus the broken-link case |
| `tests/e2e/selectionSubtraction.spec.ts` | same | **3 passed** (Box, Lasso, Wand) |
| `tests/e2e/artworkProtection.spec.ts` | same | **7 passed** |
| `tests/e2e/toolMotionPreview.spec.ts` | same | **3 passed** |
| `tests/production/drawingConsistency.spec.ts` | `next build` (with the precache manifest), then `next start -p 3211` | **15 passed**: 5 cases each in Chromium, Firefox and WebKit, including the thick Rectangle and Ellipse preview-equals-commit cases |

- **Retained failed run.** The first e2e attempt did not start: its dev server stopped on the Turbopack junction error before any test ran. The temporary `turbopack.root` above was the only change before the passing run.
- **Manual Studio checks** (development server on port 3212, 32×32 canvas, 1280×900 viewport; pixels read from `main-composite-canvas`):
  - An Ellipse drag from pixel (2,2) to (9,9) drew an 8×8 circle: 20 pixels spanning x 2–9 and y 2–9, rows `4–7 / 3,8 / 2,9 ×4 / 3,8 / 4–7`.
  - With the layer hidden, a Pen drag across row 15 showed the toast "The active layer is hidden. Show it in Layers before changing its pixels." After showing the layer again the composite matched its earlier pixels exactly, and Undo then held only the two visibility steps, not a stroke.
  - With the layer locked, a Box selection over the circle and **Delete** showed the toast "The active layer is locked. Unlock it in Layers before changing its pixels." The selection stayed and all 20 pixels remained.

## Follow-ups

- **Colour tolerance labels.** Wand (4-channel max difference) and Color Replace (RGB distance) share the *Color tolerance* slider with different metrics. That suits their jobs, but the panel could say what each tolerance compares.
- **Commit target.** A floating selection commits to whichever layer is active at commit time, not the layer it was lifted from. This behaviour is unchanged here.
- **Ignore rule.** `docs/audits/` has no `.gitignore` rule, so the local audit could be added by accident.
