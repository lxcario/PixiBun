# Deep audit phase 1: artwork identities

5 October 2026. Working-tree repairs for A01–A03 from [the deep audit](2026-10-05-deep-product-code-audit.md), base revision `f18f4e47d299685d7fdf23de158ae082a883483d`, package 1.14.1. No publication/deployment is claimed. Local verification passed; new TestSprite cases and the temporary external connection await the confirmation required by the repository skill.

## Resulting behavior

- Frame duplication includes the copy in clips containing its source and shifts later ranges to preserve their artwork. Reordering follows original clip members and refuses moves that would split a contiguous clip before recording history or changing frames. The portable interval model remains intact.
- All-frame cleanup and sampled-color erase find one uniquely named counterpart with the same generated tag in every frame, independent of stack order. Missing/ambiguous counterparts refuse the batch; matching locked layers remain skipped. This is conservative name-based correspondence, not a persistent-track/file-format migration.
- Duplication gives copied semantic palette regions fresh binding IDs on the new frame. Growth is checked against the existing 128-binding limit before raster cloning. Undo/Redo includes palettes; deletion prunes frame bindings undoably.
- Copied research recipes fork source/normal references within the duplicated frame, retaining hashes; external references retain original provenance. Generated replacement pixels drop the base layer's obsolete research descriptor.

[Animation](../guides/animation-and-review.md), [drawing](../guides/drawing-tools.md), [cleanup](../guides/pixitools-cleanup-and-tiles.md), and [rendering](../contracts/rendering.md) now describe these policies. Earlier dated records retain their original scope.

## Executed local verification

The existing Node **22.23.3** runtime was selected explicitly, including PATH for child processes; nothing was installed. Next is 16.3.8.

| Check | Result | Scope |
| --- | --- | --- |
| Identity regressions | 11 passed | Actual store/history/cleanup, binding cap/pruning, recipe forks, locks/ambiguity, exhaustive small contiguous-range reorder cases |
| Five-stage quality gate | All passed, 130.23 seconds; 1,777 tests /174 suites | Docs, TypeScript, lint, full unit suite, production build |
| Compiled application | 9 passed, 1.1 minutes, one worker, zero retries | Three workflows across Chromium, Firefox and WebKit at port 3112 |
| TestSprite offline plan lint | 2/2 valid, zero problems | Schema validation only; no service execution |

Build ID: `B1ySogjTB8KMzKG55e9JD`. The passing build's application inputs did not change during final browser checks. Later fixture/gesture and documentation changes receive [separate final checks](evidence/2026-10-05-audit-phase1/final-checks.log). The [manifest](evidence/2026-10-05-audit-phase1/manifest.json) records input/build hashes and verdict scope; generated runner inventory is discovery rather than execution evidence.

The browser suite imports original synthetic projects through the visible file picker, uses editor actions, downloads real `.pixibun` backups, inspects clip/binding metadata, decodes PNG pixels, and verifies Undo/Redo plus save/reload. It does not access a private compiled store or add a test API. Each browser has isolated storage.

### Retained initial failures

The first unit duplicate-pixel assertion saw `[0,0,0,0]` instead of `[255,0,0,255]`: its DOM canvas mock lacked the `_imageData` backing surface expected by the shared mock's `drawImage`. Exposing that backing corrected the fixture without changing application cloning or weakening pixel assertions. The corrected four-suite run passed 32 tests; the expanded identity suite passed 11 and was included in the full gate.

The initial compiled run at port 3111 reported one Chromium timeout and two Chromium passes before interruption while the next browser was active. Pen Drawing controls **overlap mouse Undo at the default 1280px width**. Preserve this as an open product issue, not a discarded fixture failure: [screenshot](evidence/2026-10-05-audit-phase1/header-overlap.png), [error context](evidence/2026-10-05-audit-phase1/header-overlap-context.md), [trace](evidence/2026-10-05-audit-phase1/header-overlap-trace.zip). The interrupted run is not nine executed cases.

The final duplication case uses supported canvas-focused Ctrl+Z/Ctrl+Y with unchanged metadata/pixel/reload assertions. The color-erase case still uses mouse Undo and passed in all three engines. The Pen header overlap remains for the workspace phase; the keyboard gesture is not presented as its repair.

## TestSprite confirmation boundary

The existing CLI 0.13.0 and authentication were found/read; seventeen existing scenarios were inspected. They do not assert the repaired clip/binding and reordered-stack combinations. Two focused plans were drafted locally with [an original synthetic project](evidence/2026-10-05-audit-phase1/original-identity-fixture.pixibun) embedded in their setup:

1. [Clip/palette preservation](evidence/2026-10-05-audit-phase1/testsprite-clip-palette.plan.json): refused split, duplication, downloaded members/bindings/pixels, Undo, Redo and reload.
2. [Batch layer targeting](evidence/2026-10-05-audit-phase1/testsprite-batch-layer.plan.json): correct Body layers, untouched hidden Lighting, exact Undo and saved reload.

The [verification skill](../../.agents/skills/testsprite-verify/SKILL.md) requires: “Show the user the drafted plan / code before creating it” and “One short confirmation”. Registration writes to the external project; local execution also requires a temporary connection making the compiled test app reachable by TestSprite. Existing personal browser profiles are excluded. Neither new plan has been registered/run and no tunnel was opened in this repair. Offline schema lint and local checks do not replace a terminal TestSprite verdict.

## Remaining sequence

Finish approved external verification and inspect run-scoped assertions/artifacts before declaring Phase 1 fully verified. Phase 2 covers pen/dither event consistency and gallery rename/save coordination (A04–A06). Phase 3 covers commands/modals, navigator/task layouts and the new header-overlap issue (A07–A09 plus follow-up). Phase 4 addresses measured preview/save/export resources (A10–A11). Phase 5 covers timestamps, clipboard feedback, deployment ordering and release evidence (A12–A14). Product experiments follow the audit's ordering and artist evaluation.
