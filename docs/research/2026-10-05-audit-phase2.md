# Deep audit phase 2: strokes and gallery saves

5 October 2026. Local working-tree implementation for A04–A06 from [the deep audit](2026-10-05-deep-product-code-audit.md), following [Phase 1](2026-10-05-audit-phase1.md). Base revision remains `f18f4e47d299685d7fdf23de158ae082a883483d`; package 1.14.1. The user requested Phase 2 without approving Phase 1's external test registration/connection. Both phases' TestSprite checks remain pending; no publication or deployment is claimed.

## Changes and their boundaries

**Clean corners is now stroke-based.** [The brush handler](../../src/hooks/viewport/useBrushPointerHandler.ts) retains the last sample, a retained predecessor and a provisional tail across React renders. Each interpolated raster point is tested against that tail; removing a corner restores the exact original brush footprint rather than erasing underlying artwork. [Drawing](../../src/hooks/viewport/useViewportDrawing.ts) captures all mirrored footprints before stamping, including overlapping copies, and paints the next point only after a removed tail has been restored. The state is bounded by the tail and brush footprints rather than accumulated stroke length. Completed stamps remain part of the stroke. Disabling Clean corners retains doubled corners.

Composite refresh is batched once per received segment; a meaningful unit assertion verifies a long segment causes one refresh. Existing requestAnimationFrame buffer invalidation, pre-stroke history and commit-time peer notification remain in the drawing pipeline. That assertion is a call-count guarantee, not an integrated latency/memory or two-device collaboration measurement. The real browser tests verify exact final pixels, Undo/Redo and saved reload.

**Dither traverses the path.** Every Bresenham brush center between received coordinates is evaluated against the selected pattern's canvas coordinates. Already painted segment endpoints are not stamped again. A one-pixel brush retains anchored pattern pixels; larger sizes keep the existing square stamp behavior. Horizontal and diagonal coarse/fine samples of the same rasterized path match, including secondary color. This cannot reconstruct an unobserved curved trajectory between samples. Release coordinates are processed when present; cancellation does not invent a release segment.

**Gallery rename has one active-project writer.** The gallery receives [the autosave coordinator's rename method](../../src/hooks/studio/useStudioAutosave.ts). For the current drawing it edits the title and awaits the queued artwork save using the coordinator's own expected version. It does not perform a separate database rename and then blindly acknowledge a refreshed version. A failed save retains the dirty in-memory title and exposes the failure in the form; actual external conflicts preserve the other saved version and keep the local artwork open. Inactive renames compare the gallery row's version inside [the database transaction](../../src/lib/storage/db.ts), refusing stale rows before changing data.

Input and Save-title clicks no longer trigger the parent card. Enter submits; Space stays input text. Card Enter/Space activation only belongs to the focused card itself. Escape is intercepted during capture in the rename input because the shared dialog has a native bubbling Escape listener; it cancels rename without closing the gallery. Pending title writes disable the input/submit control, and failures remain visible for review.

The [drawing guide](../guides/drawing-tools.md), [artwork-safety guide](../guides/artwork-safety.md), and [storage contract](../contracts/storage.md) now describe the implemented behavior. No dependencies, file-format migration or version bump were introduced.

## Research used for implementation

[Aseprite's context-bar documentation](https://www.aseprite.com/docs/context-bar/) presents pixel-perfect strokes as an optional drawing mode. PixiBun's existing whole-path raster filter defines this repair's actual algorithm; the retained-tail implementation is a project engineering decision, not a claim of Aseprite algorithm equivalence.

[React's event documentation](https://react.dev/learn/responding-to-events) distinguishes stopping parent handlers from preventing default browser behavior. It supports isolating card activation while retaining native input/form behavior. The shared native dialog listener required the additional capture-phase treatment demonstrated by the regression.

[Dexie's transaction documentation](https://dexie.org/docs/Dexie/Dexie.transaction()) states that its promise resolves after commit and warns against waiting on unrelated asynchronous APIs inside a transaction. The inactive rename performs only database operations plus synchronous validation in that transaction; active rename uses the existing serialized save path. Keeping the version comparison with the write is this project's conflict policy, exercised against a real second tab.

## Executed verification

Node **22.23.3** was explicitly selected, including the PATH used by child processes. Next is 16.3.8. Build ID: `E-RAZjjjdqI4SG5uPXxfZ`.

| Check | Result and scope |
| --- | --- |
| Added unit regressions | 15 stroke tests and five gallery/save tests, included in the full suite |
| Five-stage gate/build | All passed; **1,797 tests /176 suites**, 92.32 seconds |
| Initial compiled run, port 3113 | **20 passes /one Firefox failure**: nine Phase 1 cases passed; Phase 2 had eleven passes and one preview-obstructed stroke |
| Phase 2 follow-up, port 3114 | **12 passes**, Chromium/Firefox/WebKit; one worker, zero retries, unchanged 60-second case budget |
| TestSprite plan lint | **2/2 valid**, schema-only validation; zero registrations/runs/connections |

[Full gate log](evidence/2026-10-05-audit-phase2/quality-gate.log), [initial browser log](evidence/2026-10-05-audit-phase2/compiled-browser.log), [follow-up log](evidence/2026-10-05-audit-phase2/compiled-followup.log), [plan lint](evidence/2026-10-05-audit-phase2/plan-lint.log), [final checks](evidence/2026-10-05-audit-phase2/final-checks.log), and [input/build/evidence hashes](evidence/2026-10-05-audit-phase2/manifest.json).

The application's build inputs did not change after the passing gate/build. Fixture synchronization, the D keyboard gesture, new evidence and documentation receive separate final type/lint/document checks. The follow-up's twelve cases repeat Phase 2; the two runs are not added together as unique workflows. Runner enumeration is discovery, not an execution verdict. TestSprite is not replaced by these local results.

[Stroke unit tests](../../tests/strokeConsistency.test.tsx) use the actual drawing/history hooks and persistent canvas mock backing. They cover Pen/Eraser underlying RGBA restoration, alternating turns, overlapping mirrored footprints, locked artwork, new stroke state, release/cancel, disabled filtering, a bounded refresh count, and Bayer horizontal/diagonal equivalence with exact pixels and secondary color. [Gallery tests](../../tests/galleryRename.test.tsx) exercise real fake-indexedDB transactions and the actual save coordinator with serialization stubbed: active subsequent saves, contained keys, inactive stale snapshots, real expected-version refusal, and rename queued behind in-flight serialization. Their stub is not proof of raster encoding; the compiled browsers cover that separately.

[The compiled suite](../../tests/production/strokeAndGallery.spec.ts) uses file import, public controls, real pointer/keyboard gestures, displayed raster bytes, local saves/reload and two tabs sharing an isolated browser context. It verifies underlying semi-transparent green artwork after corner removal, exact Undo/Redo/reload, coarse/fine dither, pointer/keyboard active and inactive gallery renames, Space/Escape containment, and external conflict protection. It uses no private store handle or added test API.

### Initial diagnostics and the open preview obstruction

Initial unit development exposed leaked tool state because resetToNewProject intentionally does not reset tool settings, a mirrored sample that was already covered by an earlier stamp, and incomplete Motion mocks. Fixtures now establish explicit tool defaults, assert both separated and overlapping mirrored footprints, and replace animation only while retaining the real dialog event listeners. A genuine Escape-close failure required the capture-phase application repair. A form-level event handler also failed the accessibility lint rule; event isolation was moved to the interactive controls. Assertions were corrected where their expected geometry was wrong; the underlying-pixel/history assertions remain intact.

The first Firefox dither check received alpha 0 instead of 255 at the initial path. Its [screenshot](evidence/2026-10-05-audit-phase2/dither-preview-occlusion.png) shows the **Dither preview covering the starting canvas point**, and disabled Undo confirms no stroke was committed. [Failure context](evidence/2026-10-05-audit-phase2/dither-preview-context.md) and [trace](evidence/2026-10-05-audit-phase2/dither-preview-trace.zip) are retained. This is a real interface obstruction observed in automation; the exact timer/order dependency has not been independently isolated.

The follow-up selects Dither with supported canvas-focused **D**, then verifies the same exact pattern/Undo/Redo/save/reload assertions. No application code, assertions, retries or timeout was weakened to make that pass. This gesture does not repair the preview obstruction. Include it alongside the Phase 1 header overlap in Phase 3's interface work.

## External confirmation boundary and next phase

Seventeen existing TestSprite cases were inspected read-only. They do not cover these corner/interpolation/gallery-rename combinations. Two local plans are prepared with an [original corner fixture](evidence/2026-10-05-audit-phase2/original-corner-fixture.pixibun): [stroke consistency](evidence/2026-10-05-audit-phase2/testsprite-stroke-consistency.plan.json) and [gallery rename](evidence/2026-10-05-audit-phase2/testsprite-gallery-rename.plan.json).

The [repository verification skill](../../.agents/skills/testsprite-verify/SKILL.md) requires: “Show the user the drafted plan / code before creating it” and “One short confirmation”. Registering cases writes to the external project; local execution makes the compiled test app temporarily reachable by TestSprite. Neither new plan has been registered or run. The local browser servers stopped after their runs. Phase 2 is locally verified, with required external verification still outstanding.

Phase 3 covers A07–A09: command/dialog ownership, navigator/layout accuracy and the Lighting layout, plus the observed header and preview obstructions. Phase 1's two external plans remain pending with their original dated scope. Earlier audit failures/results retain their original records.
