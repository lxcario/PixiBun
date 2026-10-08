# PixiMotion cross-phase review and hardening

7 October 2026. Review baseline: `dcf9f5c303cdbaa6a533e3315de947c261c1e3ac`, with the existing uncommitted Phases 1–5, rigid-part slice and RotSprite v2 work. This review inspects the current source, integration boundaries, changed tests and prior evidence. It does not publish, deploy or qualify the complete engine proposal. Existing unrelated workspace edits are preserved.

## Decision and phase coverage

PixiBun can support continued development of a bounded rigid-part authoring tool. Its registry, timeline, structural history, project serialization and ordinary pixel repair are useful integration foundations. The current subset supports one captured color part, pivot/Start/End poses, interpolation, saved definitions and editable baked cels. The full proposal is still larger than the implementation.

| Phase | Current implemented scope | Cross-phase finding and action |
| --- | --- | --- |
| 1: publication/history | Staging and scoped synchronous publication, rollback before commit, contained observer errors after commit | Saved-rig Open bypassed this boundary. It now atomically activates source cel/End pose and stops playback; a throwing subscriber does not produce half-activation. |
| 2: source-owned jobs | Captured source generations/revisions, cancellation and refusal of late worker/research output | Free-transform Cancel could allocate a removed old layer after a project switch. Commit/Cancel now validate ownership captured after lifting, refuse stale writes and preserve newer artwork/selection. |
| 3: renderer evidence | Original synthetic fixtures and current renderer tests | Earlier measurements belong to an older renderer. Current RotSprite counted color regions as pixels and compared silhouette connectivity with color-region count. Both measurements are corrected, with independent fixtures and a new bounded baseline. |
| 4: bindings and bake | Independent part IDs, source versions, staged reversible cel baking and clip/reference copying | Bake dropped palette bindings on new cels. It now copies bindings with fresh IDs, refuses overflow before allocation and includes palettes in Undo/Redo. Normal-map/co-draw/floating sources are refused by this color-only workflow. |
| 5: portable rigs | Format v4 bounded single-part definitions, migration, fingerprint-checked explicit reopen, reversible library edits | Open now selects its actual source frame/layer and End pose. Floating artwork blocks Open. Retained raster/mask bytes are accounted for, including suspended practice ownership. |

The original proposed Phase 6 bake was implemented in the Phase 4 subset. The original compact parameter-history proposal was not delivered by the later phase called “Phase 5,” which implemented persistence. Pose/pivot adjustments still update temporary session state until Save or Bake; they do not create parameter Undo steps. Five completed foundation records do not mean every original engine phase is complete.

## Concrete repairs

The pre-repair probes reproduced six failures: three explicit fractional-pivot quarter-turn discrepancies, palette copy/overflow failures and old-transform Cancel resurrecting a removed source buffer. A separate renderer probe found three reported pixels for a ten-pixel fixture. These diagnostics remain evidence, rather than being replaced with passing follow-ups.

Free-transform ownership now spans the gesture's lifetime as well as its asynchronous commit. Project/dimension/source-frame identity and generation/revision changes invalidate the backup. Cancel restores only an existing, still-owned source entry; it does not create an old buffer or overwrite an intervening edit. Project replacement also clears floating UI ownership. A final regression reproduced same-project reopen resetting the store flag while retaining viewport-local floating artwork. The lifecycle subscription now honors that explicit reset as well as identity/size changes; ordinary drag updates keep ownership active, and unmount releases it after unsubscribing. The viewport exposes a transient floating-selection flag so motion capture, rig Open and bake cannot race against locally lifted artwork.

Capture checks memory admission before source reads and retained copies. The ledger now counts the active part's raster/mask and a distinct part suspended by practice. Preview reads existing registry entries without lazily creating blank canvases, and its composition and transformation run under the same error boundary. These are conservative allocation safeguards; they do not measure browser RAM or make synchronous rotation responsive on large canvases.

Normal-map tags/effects refuse color-only motion capture, Open and bake. Existing vector-aware layer rotation remains separate. Co-draw refuses motion capture/bake and library edits because the current synchronization protocol does not own motion metadata. These guards prevent the subset from implying capabilities it does not implement.

Bake copies existing source-frame palette region bindings to each new frame with fresh identities. A projected binding count beyond the existing limit refuses before raster generation; palettes and cels publish and undo together. Region coordinates remain fixed in canvas space. Automatically transforming semantic regions with a moving part remains unimplemented, so indexed export requires region review.

Paeth quarter turns now use pixel centers consistently, including explicit fractional pivots and rectangular output, and near-full-turn residuals normalize correctly. RotSprite now sums the pixels in color components and compares eight-connected alpha silhouettes with the same source metric. A compiled asymmetric-artwork check also reproduced rotated-preview reuse after a flip: the cache keyed geometry but not the replacement floating canvas. Rotation preview now checks canvas identity and exact unrounded settings. Derived normal display tracks source generations/revisions, layer metadata and floating ownership too. The rendering contract's universal binary-alpha and preview-parity claims were removed at their original locations. No quality or timing threshold was relaxed. These corrections also affect selection rotation outside the motion panel.

## Source review scope

Review covered publication/structural and pixel history; source-owned jobs and worker dispatch; viewport selection, transform and event adapters; motion capture, sampling, preview and bake; rig parsing, persistence and library controls; memory/practice ownership; serializers, migration/recovery paths; and the current RotSprite/Paeth/normal rotation implementations. The UI tests exercise real compiled controls. This is a subsystem and changed-path review, not a proof that every repository behavior is correct.

## Academic basis and limits

[Kung and Robinson, *On Optimistic Methods for Concurrency Control* (1981)](https://www.eecs.harvard.edu/~htk/publication/1981-tods-kung-robinson.pdf) motivates preparing private results, validating ownership and then publishing. This is an engineering analogy for editor work; PixiBun does not implement or prove the paper's database protocol.

[Paeth, *A Fast Algorithm for General Raster Rotation* (Graphics Interface 1986, pp. 77–81)](https://graphicsinterface.org/wp-content/uploads/gi1986-15.pdf) provides the three-shear rotation basis and discusses raster sampling. Its original antialiasing/blending treatment does not establish universal palette, topology, dither or identity preservation for tiny pixel art. The local integer-sampling variant needs its own tests; a paper citation cannot validate its pixel-center implementation.

[Curino, Moon and Zaniolo, *Graceful Database Schema Evolution: the PRISM Workbench* (PVLDB 2008)](https://www.vldb.org/pvldb/vol1/1453939.pdf) supports treating compatibility and migration as explicit work. Rig format validation, decoded-pixel fingerprints and legacy migration are concrete local mechanisms, not an implementation of PRISM or proof of deployed-reader rollback safety.

## Current renderer measurements

The retained current baseline uses four synthetic 17×17 sprites and eight arbitrary angles each, with padded 25×25 output. All 32 samples retain every visible source RGBA color. This is a color-presence measurement: it does not establish correct feature positions, alpha-over palette closure, stable temporal tracks, contact preservation or artist acceptance.

| Synthetic fixture | Rotation p50 | Rotation p95 |
| --- | --- | --- |
| Face with single-pixel eyes | 3.804 ms | 4.893 ms |
| Thin diagonal | 0.514 ms | 0.804 ms |
| Alpha detail | 0.729 ms | 1.158 ms |
| Contact-like shape | 0.690 ms | 3.934 ms |

These short synchronous Node 22 measurements are fixture observations, not comparative speedup evidence, UI latency promises or physical-device benchmarks. Source/fixture/output hashes accompany the samples. Earlier Phase 3 tiny-feature failures retain their historical scope and must not be presented as fresh failures of this renderer.

## Verification

The initial five-stage gate passed typecheck, lint, documentation checks, all **2,040 unit tests /194 suites** and a fresh production build. Its complete 234-case compiled run recorded **224 passes /seven capability skips /three failed new fixtures**, one worker and zero retries. The failed fixture pressed an arrow without actually lifting artwork; it was corrected to perform the real drag-to-lift gesture, while keeping the disabled Open, capture refusal and restored-pixel assertions. A separate one-case Chromium probe then reproduced the actual rotated-preview cache defect. These runs precede the final lifecycle/cache repairs.

After the final repairs, a fresh five-stage gate again passed **2,040 tests /194 suites**, static checks and build. Build `UJQHvlgbuEjzZMXnqAYvk` then passed **80 compiled cases /one WebKit touch-capability skip**, one worker and zero retries, across Chromium, Firefox and WebKit. This 81-case follow-up covers input ownership (including rotated flip/commit/Undo), saved rigs, motion bindings/bake, practice isolation, research/lighting and workspace controls. All nine new journeys pass across the three engines. It is a scoped final-build run; the earlier full suite is not relabeled as a complete pass on this later source.

Focused follow-ups passed 140 tests across seven suites, then 115 tests across seven renderer/motion suites after the measurement correction, and 65 related lifecycle/motion/practice checks after same-project reset repair. A new owning-hook Undo fixture replaced an incorrect event-dispatch fixture; its failed diagnostic is retained. An early sandbox file-rename failure and the corrected lint dependency warning are retained separately from product failures.

The existing authorized [TestSprite floating-selection case](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ad7cf58e-3c0f-41d6-96a8-a3a076faf639/test-cases/a8ee88ac-c79d-4204-8593-642a4dc3ef0e), `a8ee88ac-c79d-4204-8593-642a4dc3ef0e`, reached a terminal **blocked** verdict in run `f948b5a1-851d-416f-8ea9-67af55022485`, against the initial hardening build. The runner reported unavailable coordinate-based drawing/drag controls. Pinned steps record only navigation and a Studio-link click; the intended drawing, movement, commit and Undo/Redo assertions were not executed. The requested failure bundle was refused with exit 4: the service said its stored script was withheld because the environment had changed or been deleted. That refusal was preserved without bypassing it or spending another attempt on the same capability block. No new external case was created. The owned temporary connection and server are closed. This is no external qualification of either build.

The generated inventory enumerates 2,040 unit tests in 194 suites and 237 production cases in 22 files after adding the flip regression. Enumeration does not establish execution. Earlier dated Phases 1–5 results are unchanged and are not upgraded by this new verification round. All 123 recorded files in the earlier readiness/foundation/Phase 4/Phase 5 evidence archives retain their original hashes.

The [sealed evidence manifest](evidence/2026-10-07-piximotion-cross-phase-hardening/manifest.json) retains failures, final logs, renderer samples, sanitized TestSprite metadata and source/build fingerprints. All 682 recorded code/test/config inputs and four recorded build files match the final compiled checkpoint. The master specification remains a local ignored proposal; no forced addition, commit or push was performed.

## Remaining work before a broader engine

1. Implement compact pose/pivot parameter Undo with an explicit session/history policy and meaningful integrated tests.
2. Qualify responsiveness at supported canvas/part sizes; move or schedule expensive preview evaluation with source ownership and cancellation where measurements require it.
3. Expand artist/native-size, alpha/compositing, feature-position, angle and temporal/contact fixtures, plus manual artist studies. Keep authored angle/pose alternatives and ordinary pixel repair available.
4. Qualify format-v4 portable/recovery/deployed-reader rollback behavior across actual operator environments before a release.
5. Treat source rebinding, semantic-region motion, parent/skeleton constraints and multi-part evaluation as subsequent features with their own contracts.

These repairs strengthen the existing subset enough to continue bounded development. They do not warrant promising automatic faithful animation of every sprite or declaring the full master specification complete.
