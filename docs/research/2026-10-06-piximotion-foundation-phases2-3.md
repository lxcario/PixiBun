# PixiMotion foundation repairs — Phases 2–3

6 October 2026. Local uncommitted changes based on `dcf9f5c303cdbaa6a533e3315de947c261c1e3ac`, following [Phase 1](2026-10-06-piximotion-foundation-phase1.md).

## Phase 2: source ownership

[Workspace jobs](../../src/lib/engine/workspaceJob.ts) bind computation to its initiating project, canvas size, active frame/layer, edit revision and explicit source raster generation/revision plus metadata. Metadata changes cancel work through AbortSignal. A final source check also catches raw raster changes before a store notification. Switching away and back cannot revive an aborted job. Missing source IDs are refused. Completed/cancelled jobs remove watchers and caller-signal listeners; memory reservations remain held until asynchronous work settles.

Applied to research previews, layer/free-transform rotation, in-between generation and normal-map generation. Hook disposal cancels outstanding jobs. Free transforms admit one simultaneous commit and catch worker errors. Normal-map failures no longer leave an unhandled event-handler rejection. Shared-worker cancellation still explicitly interrupts peers; this is not independent worker isolation or immediate interruption of synchronous fallback/hash computation. Animation-review work already has its own cancellation lifecycle and is unchanged.

Thirteen new ownership tests cover project-switch ABA, direct raster revision changes, same-ID raster replacement, source metadata/missing-ID refusal, caller cancellation/listener cleanup, completed watcher cleanup, research-worker termination, late/unmounted/duplicate free transforms, second-frame in-between source changes, and unmounted in-between/normal-map work. The combined transaction/research/ownership run passed **38 tests**. The final five-stage gate/build passed **1,894 tests /184 suites** on Node 22.23.3; build ID `DvYUYwAyUodxjOOcHkdoP`. All 602 recorded source/test/script inputs still matched when qualification was checked. Final browser results are recorded below.

### Final external verification scope

The user explicitly authorized existing TestSprite cases and temporary local connections. The existing selection-commit/Undo case reached **blocked** against the final build. Its report says pointer/drag interaction primitives are unavailable, so drawing, selection, commit and Undo/Redo were not executed. Its failure bundle was withheld with `environment_changed`; the terminal report and sanitized step trail remain available. This run does not qualify source-change/unmount races. No new service test was created. The temporary connection closed and its local server was stopped. The initial Phase 1 service results and their narrower scope remain in that record.

## Phase 3: reproducible quality fixtures

Four original synthetic 17 × 17 fixtures live in [piximotion.ts](../../tests/fixtures/piximotion.ts): single-pixel facial details, a one-pixel diagonal with detached details, fractional alpha with close shades, and contact feet with a detached part. Eight [tests](../../tests/piximotionFixtures.test.ts) assert exact zero/quarter-turn pixels, unchanged source bytes, bounded output size and no new visible RGBA values at eight arbitrary angles. The first run incorrectly expected counterclockwise rotation and failed four quarter-turn tests; its diagnostic remains preserved. The corrected independent clockwise coordinate mapping passed all eight cases.

Repeat the measurement on the supported Node 22 runtime:

```powershell
$env:PIXIMOTION_BASELINE_OUTPUT='artifacts/piximotion-preflight-2026-10-06/phase3-baseline.json'
node node_modules/vitest/vitest.mjs run tests/piximotionFixtures.test.ts --maxWorkers=1
```

The baseline includes renderer/fixture/input/output hashes, eight timings per fixture, empirical P50/P95, visible-pixel counts, lost source colors and retained output bytes. Warmup is excluded. Each padded 25 × 25 output retains 2,500 RGBA bytes. Timings measure tiny synchronous Node rotations; they exclude intermediate allocations, browser/GPU memory, event-loop responsiveness, worker transport, saving, UI interaction and physical-device/artist evaluation. With eight samples P95 is the slowest sample, not a population estimate or speed guarantee.

**Observed quality gap:** the renderer loses the unique mouth color in six of eight arbitrary-angle face samples and the detached-part color in one contact sample. Palette membership is preserved, but small authored features are not always retained. Passing these tests establishes exact-turn/source/palette invariants, not arbitrary-angle facial quality. Protected semantic features and reviewable repairs are prerequisites for an automatic final bake. This phase records that limitation instead of silently changing the renderer or inventing artist-approved thresholds.

### Academic basis

[Kopf and Lischinski, *Depixelizing Pixel Art*, ACM TOG/SIGGRAPH 2011](https://johanneskopf.de/publications/pixelart/) address pixel-scale diagonal connectivity and preserving features during magnification. Their vector-contour method is not evidence that PixiBun's raster rotation is equivalent. Our thin/isolated-detail fixtures are an engineering inference from that problem.

[Wang, Bovik, Sheikh and Simoncelli, *Image Quality Assessment: From Error Visibility to Structural Similarity*, IEEE TIP 2004](https://ece.uwaterloo.ca/~z70wang/publications/ssim.pdf) evaluate full-reference quality, including JPEG/JPEG2000 comparisons, and discuss limits of simple error measures. This motivates reporting structure/detail diagnostics alongside exact pixel invariants. It does not validate SSIM as a pixel-animation acceptance gate; no photographic similarity score is used here.

## Remaining integrated-engine work

Final compiled validation passed **24/24 checks** across Chromium, Firefox and WebKit with one worker and zero retries, using port 3192 and build `DvYUYwAyUodxjOOcHkdoP`. The eight workflows cover animation review/protected cleanup, duplication with palette/clip Undo, all-frame color erase with hidden-layer Undo, floating-selection/gizmo commit, drawing/save/reload/Undo/Redo, protected simplification/provenance, multi-frame shared-light Undo and stale-preview keyboard recovery. Controlled late-result/observer failure injection is covered by unit integration tests rather than production-only test handles. Physical-device performance, artist usefulness and the live motion subsystem remain unqualified.

Execution logs, sanitized service trails, fixture baselines and source/build fingerprints are preserved in the [foundation evidence manifest](evidence/2026-10-06-piximotion-foundations/manifest.json). Initial failed diagnostics remain separate from their passing follow-ups.

Stable part/source bindings, persistent versioned motion data and compact pose history, and a reversible preflighted multi-frame bake are Phases 4–6 of the first proposed PixiMotion workflow. Host hardening above does not implement them. The isolated renderer still needs feature-preservation and temporal/contact evaluation before automatic production-quality baking can be claimed.
