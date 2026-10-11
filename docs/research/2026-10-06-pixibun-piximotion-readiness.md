# PixiBun readiness for PixiMotion

Maintenance update — 11 October 2026: see the [11 October validation handoff](2026-10-11-validation-handoff.md) for the current engineering milestone. Earlier measurements, failures and decisions below retain their original revision and scope.

6 October 2026. Assessment of the main checkout at `dcf9f5c303cdbaa6a533e3315de947c261c1e3ac`, package `1.14.1`, with the authorized documentation amendments still uncommitted. This is a local engineering assessment, not a deployed release or artist-study verdict.

## Decision

**Start PixiMotion Slice 0 now, followed by a small, complete Slice 1. PixiBun is sufficiently developed to host that work. It is not ready to absorb the entire proposed engine as one feature.**

Its raster editing, frame timing, preservation, generated-output workflows and export infrastructure provide substantial reusable foundations. The missing persistent rig, binding, pose-history and preview machinery are concentrated integration work. They do not justify rebuilding the editor or waiting for every unrelated qualification issue to close.

Maturity is uneven: the editor has meaningful local correctness evidence; its live animation document model does not exist yet; physical-device performance and artist usefulness remain unqualified. Starting development is justified. Promising that the full engine will work well on arbitrary tiny sprites is not.

A subsequent preflight reproduced publication-error inconsistencies under injected subscriber exceptions, documented below. Harden those paths before integrated motion edits real documents; this does not prevent isolated numerical prototyping.

Subsequent local repair: [foundation Phase 1](2026-10-06-piximotion-foundation-phase1.md) implements the scoped publication boundary; [Phases 2–3](2026-10-06-piximotion-foundation-phases2-3.md) implement source-owned jobs and reproducible fixtures. Their changed-source verification is separate from this assessment's unchanged-source baseline. The new fixtures also expose arbitrary-angle tiny-detail losses, so host hardening does not establish final motion output quality.

## Scope and evidence

The source inventory contains **316 TS/TSX/CSS files and 80,409 lines**, using `split('\n').length` per file. Inventory is enumeration, not a claim to have reviewed every line. Source review concentrated on the store/slices, raster registry, structural history, frame/clip mutations, serialization/schema/database, autosave, workers, research preview/application, export preparation, playback, practice custody and collaboration boundaries. Current operating contracts and earlier audit/repair evidence were cross-checked against those implementations.

All **716 inputs** recorded in the [5 October hardening manifest](evidence/2026-10-05-audit-hardening/manifest.json) were compared with current bytes. Only `docs/current-status.md` and `docs/README.md` differ. Application source, recorded tests, package/build configuration and recorded compiled artifacts match. The reused local build ID is `5wtPM03wdeRhH7jxdFPMK`; compilation was not rerun for this documentation assessment. The current source inventory digest is `8f1fad806166f108effb0d4146b521dc5cce5d122008aae2b1cb48ad7c672f4e`.

Fresh verification uses **Node 22.23.3**, within the package's supported 22.x range:

- The four-stage gate passed: documentation integrity, strict TypeScript, lint and **1,862 tests in 181 suites**. Unit concurrency was `VITEST_MAX_WORKERS=2`; this does not establish a default-concurrency CI result. The gate took 130.47 seconds; the unit runner reported 52.35 seconds. These are local runner times, not editor latency measurements.
- **All 27 selected compiled cases passed**: nine workflows in each of Chromium, Firefox and WebKit, with one worker, zero retries and no skips. The terminal runner reported 5.1 minutes. This exercised the byte-matched existing build on a fresh owned local server, not a new production compilation.
- The initial sandboxed browser attempt failed at launch with `spawn EPERM`, before any artwork workflow ran. It is environment diagnostics, not 27 demonstrated application defects. The subsequent browser-enabled run was interrupted after 18 recorded Chromium/Firefox passes without a terminal verdict. Both logs remain distinct from the final complete passing run.

The selected workflows cover distinct-frame onion overlays through reload; duplication/clip/palette identity through Undo/Redo/save/reload; refusal to split clip membership; matching layers across reordered stacks; 64-frame thumbnail/backup ownership; small native composites with alpha/blends/hidden layers; drawing/save/reload/Undo/Redo; shared generated lighting in one Undo; and stale-preview/keyboard recovery. They exercise useful integration precedents, not a PixiMotion implementation.

The 64-frame fixture reconfirmed 34,560 bytes of retained thumbnail backing, one thumbnail redraw for a stroke and two peak concurrent PNG encodes in each browser. These are bounded-work/backing observations, not total RAM or input-latency guarantees.

The [evidence manifest](evidence/2026-10-06-piximotion-readiness/manifest.json) records commands, source fingerprints, raw measurements, terminal logs and the preserved diagnostic attempts. No application implementation or test expectations were changed. No fresh coverage, full browser inventory, deployed system, actual pen, low-memory device, long-session profile or participant study is claimed.

## What the current editor can contribute

| Foundation | Actual implementation | Readiness for initial motion |
| --- | --- | --- |
| Pixel artwork ownership | [Buffer registry](../../src/lib/engine/bufferRegistry.ts) owns layer canvases, generations and content revisions independently of component mounting | Reuse snapshots and revision checks; motion core must not take ownership of live canvases |
| Metadata organization | [Studio store](../../src/stores/studioStore.ts) combines five Zustand/Immer slices | A new motion document can integrate here, with transient playback/preview kept separate from persistent edits |
| Frames, holds and clips | [Animation slice](../../src/stores/slices/createAnimationSlice.ts), [clip mutations](../../src/lib/animation/clipFrameMutations.ts), [playback clock](../../src/components/layout/BottomTimeline.tsx) | Good destination for baked animation; not a skeletal keyframe timeline |
| Preservation | [Serialization](../../src/lib/project/serialize.ts), [autosave coordinator](../../src/hooks/studio/useStudioAutosave.ts), [database](../../src/lib/storage/db.ts) validate and save metadata/raster revisions with transactional conflict checks | Strong infrastructure; live rig fields still need end-to-end support |
| Undo | [History engine](../../src/lib/engine/historyEngine.ts), [structural staging/restoration](../../src/lib/engine/structuralHistory.ts) | Reuse for admitted raster bake; add small pose/key commands rather than raster snapshots for every joint drag |
| Generated work | [Research workbench](../../src/lib/research/workbench.ts) retains source pixels, fingerprints sources, refuses stale previews and stages output before publishing one edit | Closest existing integration pattern for PixiMotion |
| Heavy work | [Worker dispatcher](../../src/lib/engine/workerDispatcher.ts) and dedicated research/review workers have admission/cancellation/deadline paths | Useful mechanisms; motion needs independent job ownership and scheduling |
| Rendering | [Frame compositor](../../src/lib/render/compositor.ts) excludes onion/grid/selection overlays while applying layer settings | Appropriate for ordinary cels and export; not a DOM-free deterministic motion renderer |
| Pixel transforms | [RotSprite-inspired implementation](../../src/lib/canvas/rotSprite.ts) offers numerical raster operations and integer rotation paths | Baseline/comparison only; its header explicitly excludes canonical offset-search and detail-restoration stages |
| Output | [Export frame preparation](../../src/lib/export/prepareFrames.ts) reserves composites, checks freshness and cancels; [animation export model](../../src/lib/export/animationModel.ts) carries holds/clip sequences | Bake to existing frames first and reuse qualified output paths |
| Lifecycle | [Load/reset](../../src/stores/slices/createHistorySlice.ts), [practice custody](../../src/lib/project/practiceSession.ts), [co-draw bridge](../../src/lib/sync/coDrawBridge.ts) already define document transitions | New persistent and transient motion state must join these transitions explicitly |

There is evidence of designed protections, not just a collection of drawing demos. Passing tests alone would not establish this: the important observation is that meaningful preservation and failure paths already exist, and compiled workflows assert artwork bytes and relationships.

## Five integration gates

The five integration gates below describe missing capabilities and implementation constraints. The supplemental preflight separately records reproduced exception-path findings in existing helpers.

### Supplemental preflight: publication failure handling

The subsequent request about pre-PixiMotion hardening prompted two isolated failure-injection diagnostics on the unchanged application source, using Node 22.23.3, the real store/helpers and the existing mocked-canvas helper. They are outside the normal test inventory. Both desired rollback assertions failed in the terminal diagnostic log (local-only file: `../../artifacts/piximotion-preflight-2026-10-06/publication-final.log`; unavailable in a tracked checkout); the probe source (local-only file: `../../artifacts/piximotion-preflight-2026-10-06/publication.test.ts`; unavailable in a tracked checkout) identifies the injected exception. This supplements the earlier readiness scope; it does not turn its 1,862 passing regression assertions into failed assertions.

- **Structural restore:** a one-shot subscriber exception when frames are published leaves replacement frame/layer metadata in the store, while `restoreStructuralWorkspace` restores the previous buffer registry. The resulting layer reference and buffer ownership disagree.
- **Generated output:** the same publication exception leaves the new generated layer, source visibility change, two buffers and one Undo entry committed while `applyResearchPreview` throws. Its preview disposer is not called on that path. The mocked disposer observation is not a measurement of leaked browser memory.

The earlier status-notification diagnostic (local-only file: `../../artifacts/piximotion-preflight-2026-10-06/publication-history-status.log`; unavailable in a tracked checkout) injected an exception on the first store notification instead: it recorded one pushed Undo entry without the generated edit being applied. Its original probe (local-only file: `../../artifacts/piximotion-preflight-2026-10-06/publication-history-status.test.txt`; unavailable in a tracked checkout) is preserved separately. The refined diagnostic targets frame publication specifically; it does not relax the desired rollback assertions. Neither attempt is ordinary artist/browser reproduction or a repaired result.

**Required hardening before integrated motion edits:** establish one coherent prepare/commit/notification contract for metadata, buffers and history. Preparation/refusal must leave the document unchanged. Failure rollback must restore all owned state. Post-commit observer faults need an explicit containment/reporting policy so an operation cannot ambiguously report failure after partially committing. Apply this to structural restoration and generated-output publication, then use the same bounded path for multi-frame bake. Add desired-behavior regression coverage for both failure locations without increasing memory limits or swallowing failures indiscriminately.

This is a concrete additional foundation task. Isolated numerical research can still begin; using real documents should wait for that publication contract and the relevant integration gates below.

### 1. Stable parts and source bindings

`AnimationFrame` contains independent `Layer[]` stacks. Duplicating a frame creates new layer IDs. [Cross-frame targeting](../../src/lib/project/frameLayerTargets.ts) conservatively uses a unique matching name/tag and refuses ambiguity. A name such as `Left arm` is not a persistent semantic identity.

PixiMotion needs stable `rigId`, `partId`/region IDs and explicit bindings to authored pixels. Renaming, reordering, duplicating or deleting a source must have defined consequences. Source hashes/revisions alone detect change; they do not express correspondence or artist intent.

**Initial boundary:** take parts from one explicitly selected authored pose, using layers or masks; give those parts their own IDs. Maintain explicit source/output mappings. A project-wide layer-track/cel migration is useful future work but is not necessary to begin this bounded workflow. Do not make automatic correspondence across arbitrary existing frames a prerequisite or infer it from stack position.

Aseprite's official [sprite structure](https://www.aseprite.org/docs/sprite/) distinguishes document layers, frames and their cels; [linked cels](https://www.aseprite.org/docs/linked-cels/) explicitly share artwork. This supports the need to distinguish identity from raster instances, but does not require copying its entire model into PixiBun.

### 2. A real persistent motion document

The current [portable project type](../../src/types/project.ts) has raster frames, palettes and clips, with no live rig, key channels, constraints or output bindings. [Schema construction](../../src/lib/project/schema.ts) reconstructs a known `ProjectFile`; the database validates before writing. Adding an arbitrary `motion` property to the store or abusing generic generated-layer provenance would not establish preservation.

The implementation must extend validation, portable export/import, autosave, load/reset, gallery duplication, recovery, practice checkpoint/return, and relevant ownership/remapping paths. Admit finite values, bounded key/part counts, valid references and acyclic parent relationships before allocation. Define source deletion and dimension-change behavior. Unsupported live data must be preserved or the file refused with a clear message; use an appropriate format-version change so older readers cannot silently discard it.

The database schema number and portable project format number are separate. Adding a motion document does not automatically imply a new IndexedDB table or version; decide that from the actual storage representation and rollback readers.

**Exit:** save, close, reopen, duplicate and recover one rig with authored keys without losing its editable meaning. Raster-only projects remain readable under the declared migration policy.

### 3. Pose Undo and one atomic bake

Current history represents pixel snapshots or structural frame-tree snapshots. Structural steps have a 64 MiB combined Undo/Redo budget and separately handled baseline costs. This is a useful protection for raster edits, not an efficient continuous pose-edit representation.

Use small reversible parameter/key commands, one committed edit per gesture, and a defined cancellation path. A bake should preflight the entire output and Undo costs, stage all buffers and metadata, then publish one reversible operation. Repeated calls to `duplicateFrame` are not that operation: each call independently records history and publishes a new frame, so a later refusal can leave earlier frames committed.

The research workbench demonstrates staging before publication and preserving hidden authored sources. Extend that pattern with explicit rollback and output ownership for bake. Define whether rebaking replaces generated output, creates a new take, or retains pixel corrections; never silently erase the artist's repair work.

**Exit:** Undo returns pixels, source visibility, frames, clip membership and live parameters together; failed or cancelled preparation publishes nothing.

### 4. Live preview and worker ownership

The main raster compositor reads DOM canvases. Existing playback advances `activeFrameIndex` through stored cels, with visibility suspension and a bounded catch-up clock. That is suitable for frame playback, not continuously evaluating a skeletal pose or simulating physics.

Use a pure numerical motion core taking owned pixel arrays and typed rig/pose data. A PixiBun adapter captures sources, reserves memory, schedules work, validates returned data and publishes a temporary preview. Preview should not touch authored buffers, increment document revisions, autosave each tick, or create history while merely playing. A committed key/parameter edit is a document mutation and must follow the save coordinator.

Prefer latest-request ownership for interactive previews and a separate bounded bake queue. Existing heavy jobs share a worker: cancelling/timing out one explicitly interrupts its peers. Its small synchronous fallback can still block the main thread. Copying those policies without a motion-specific scheduling decision would make scrubbing and other tools compete unpredictably.

Cancel/reject stale results when the project, source, pose version, selection context or dimensions change. Account for retained sources, masks, output, transfer copies, caches and Undo; the existing 512 MiB ledger estimates tracked CPU ownership and is not total browser/GPU RAM.

**Exit:** stale work cannot publish into another document; gesture response and playback meet measured budgets on named supported hardware.

### 5. Pixel quality, alpha and lighting contracts

PixiBun permits fractional alpha, opacity and blend modes. Its canvas compositor can introduce blended colors. Strict indexed/binary-alpha PixiMotion output therefore needs explicit source admission/conversion and its own raster rules. Existing rotation machinery does not prove preservation of eyes, one-pixel limbs, cluster shapes or temporal stability across arbitrary angles.

[Feature-Aware Pixel Art Animation](https://cgv.cs.nthu.edu.tw/projects/Recreational_Graphics/PixelLineAnim), published in *Computer Graphics Forum* (2016), supports treating pixel features as constraints during animation. It does not certify PixiBun's transforms or the proposed engine. The [academic amendment review](2026-10-06-piximotion-amendment-review.md) records the publication and other kinematics/simulation evidence with their applicability limits.

Start with rigid, artist-separated parts and authored hidden overlap artwork. Establish exact source preservation, palette/alpha invariants, motion fidelity and frame-order determinism on native-size fixtures. Tiny eyes/mouths and acute-angle limbs may need authored angle variants or pixel cleanup. A normal map represents a surface direction; translating/rotating its color bytes like ordinary artwork is not sufficient for correct relighting. The first workflow can bake color artwork and treat lighting as a subsequent explicit operation; coupled live lighting needs its own qualified rule.

**Exit:** movement is faithful and recognizable at native size, artists can repair it, and the saved/exported result matches the accepted bake. Lower flicker obtained by freezing features is not success.

## Maintainability and product maturity

PixiBun is not a reusable animation-engine SDK. Several helpers import the global store, and raster/metadata publication order is part of correctness. The inspected large integration files include a 996-line autosave hook, 1,078-line project schema and 1,028-line export dialog. File size is a maintenance signal, not a demonstrated failure. Avoid adding motion logic directly to all those files: introduce a typed core and narrow document/preview/bake adapters, and extend current contracts where the adapter crosses them. A blanket rewrite would put existing preservation behavior at unnecessary risk.

The interface already has drawing, palette, lighting, research and animation controls. A motion workspace should expose a small artist sequence—select parts, place pivots, pose/key, compare, bake, repair—rather than exposing all numerical subsystems at once. Product maturity requires observing whether that sequence is understandable, not merely adding another inspector tab.

**Release gaps that can proceed alongside initial research:** physical pen/accessibility qualification, real two-machine collaboration, deployed update/rollback qualification, broad game/video consumer tests and general long-session profiling. Those remain important for their promises. They do not all block a solo desktop motion prototype.

**Gaps that cannot be deferred before an integrated artist release:** motion save/reopen, source custody, reversible bake, stale-result refusal, bounded resource admission, pixel-quality review, and a measured responsiveness envelope for the declared workflow. Co-draw should initially refuse live motion editing unless its protocol supports it; the current host-owned frame/pixel protocol is not a rig/key collaboration protocol.

## Recommended first deliverable

Use the amended master (local-only file: `../../PIXIMOTION_ENGINE_MASTER_SPEC.md`; unavailable in a tracked checkout), sections 75 and 77, as the delivery contract. The following is a proposed starting fixture envelope to calibrate in Slice 0, not a measured capacity claim:

1. A 32×32 or 64×64 authored sprite with two to six rigid parts, one rig and a short eight-to-sixteen-frame animation.
2. Artist-defined layers/masks, pivots and draw order; basic forward posing with Step/Hold and linear keys. No inferred anatomy or mesh solver required.
3. Temporary preview/onion comparison with unchanged original pixels. Save/reopen the live rig and keys.
4. Bake into ordinary editable frames as one admitted Undo operation. Correct a few output pixels, save/reload, then export a sheet or APNG with matching holds.
5. Compare the complete workflow against drawing/duplicating the same poses manually, including setup and cleanup time. A lantern, waving arm and small creature head/tail provide distinct useful fixtures; a tiny face/one-pixel limb is an adversarial fixture.

Spine's official [export guide](https://esotericsoftware.com/spine-export) distinguishes skeletal data for matching runtimes from rendered image sequences. That makes a bake-first PixiBun product a credible route: existing raster consumers can use the output without waiting for a new game-engine motion runtime. This is an architectural inference, not proof that our bake implementation exists.

Begin with fixtures, source binding, versioned document shape and preview ownership; implement the smallest numerical renderer alongside those boundaries. Do not spend the opening phase on auto-rigging, learned recognition, cloth, complex secondary motion, mesh deformation, generalized retargeting or a large motion library. They are later research, and they do not repair missing document custody.

The go/no-go after the first slice should come from a completed artist workflow, exact preservation/reload checks, measured latency/memory, and observed cleanup effort. The appropriate conclusion today is **ready to build and test the first slice; full-engine readiness and artist benefit still need evidence**.
