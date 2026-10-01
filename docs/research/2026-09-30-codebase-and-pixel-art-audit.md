# PixiBun: codebase audit and pixel art research

> **Implementation follow-up — 2026-10-01:** The eleven reproduced findings were addressed in the subsequent six-phase local implementation. Its verification, research extensions and remaining artist/device/collaboration questions are recorded in the [phase report](phase-implementation-status.md) and [session completion record](session-completion-2026-10-01.md). The pre-fix observations below are preserved.

Date: 30 September 2026. Reviewed commit: `23eaa10e662db349b20ae9c7f6a2e93a2f328cbb`. Package version: 1.14.1.

This document records the pre-fix audit. See [phase implementation status](phase-implementation-status.md) for subsequent changes and verification.

## Assessment

PixiBun has a substantial working foundation: a local canvas editor, animation, recovery, bounded project admission, procedural tools, editable effect metadata, exports, teaching material, and peer drawing. The existing checks pass. The most important remaining problems are **inconsistent state transitions across pixels, metadata, history, persistence, and collaboration**. Adding more algorithms before correcting these boundaries would compound the risk of losing or changing artists' work.

I recommend a reliability release first, followed by an animation stability workbench. A distinctive longer-term direction is an artist-controlled pixel art studio where transformations preserve important shapes, animation holds remain editable, palette identity survives export, and lighting recipes are reusable.

This is a broad engineering audit, not a proof that every line is correct or a penetration-test certification. All 260 TypeScript/TSX/CSS source files were inventoried and hashed: 73,587 physical lines. Review concentrated on critical paths and their callers, with repository-wide searches and review of tests, configuration, public assets, documentation, and delivery workflows. Decorative components and lesson datasets received less detailed semantic examination than persistence, history, import, drawing, collaboration, and export. [Source inventory](evidence/2026-09-30/source-inventory.csv).

Application source was not changed. The only additions are this report and audit evidence. The probes deliberately assert current defective behavior; they belong outside the normal test suite and must be rewritten to assert desired behavior when fixes are implemented.

## Verification and limitations

| Check | Result | Meaning |
| --- | --- | --- |
| Canonical full gate | Passed | Documentation checks, TypeScript, lint, 1,315 tests in 131 files, production build |
| Existing browser suite | 98 passed | Chromium, against the configured development server |
| Additional diagnostic probes | 11 passed | Reproduce the eleven behaviors described below |
| Coverage run | Passed | Statements 70.17%, branches 60.83%, functions 63.86%, lines 71.22% |
| Production dependency advisory check | Zero reported vulnerabilities | npm audit of installed production dependencies on this date; not a guarantee against undisclosed flaws |

Evidence: [full gate](evidence/2026-09-30/audit-gate.log), [browser tests](evidence/2026-09-30/audit-e2e-rerun.log), [coverage](evidence/2026-09-30/audit-coverage.log), [dependency advisory response](evidence/2026-09-30/audit-dependencies.json), [diagnostic probes](evidence/2026-09-30/integrity.probes.ts).

Run the probes from the repository root with:

```powershell
npx vitest run --config docs/research/evidence/2026-09-30/audit.config.mjs
```

The first browser attempt could not launch Chromium because of sandbox process restrictions (`spawn EPERM`); the authorized rerun passed. The failed launch log is retained as environmental evidence, not counted as an application defect. Tests ran with the available Node v26.5.1, although package engines and CI target Node 22. A supported-runtime run remains necessary for release signoff. Firefox, WebKit, actual engine imports, physical pen hardware, and long-duration memory profiling were not exercised. No Lighthouse run was performed during this audit.

Coverage currently includes 206 instrumented files, including two test support files. It is not an explicit census of all production source. Coverage percentages and the number of passing tests should not be treated as pixel-fidelity or data-safety guarantees.

## What already works well

- The separation of canvas pixels from React state avoids copying whole rasters through UI updates. Zustand/Immer metadata and a buffer registry are appropriate foundations if transitions remain synchronized.
- Project schema validation, image-header inspection, geometry preflight, workspace limits, transactional storage, and recovery inspection address real malicious-input and corruption risks. Preserve these controls during refactoring.
- Worker dispatch already has timeouts and crash recovery. WFC has explicit resource budgeting. These are valuable controls, although fallback and cancellation policies need completion.
- History captures affected buffers rather than indiscriminately copying the entire project for every structural operation.
- CSP nonces, same-origin diagnostics checks, HTTPS-only server-configured relay targets, body ceilings, and opt-in transmission reduce exposed surface. The relay's proxy and multi-instance assumptions are explicitly documented.
- Browser accessibility tests cover multiple themes and meaningful editor surfaces. Offline, persistence, pointer interruption, and import tests are stronger than a typical early graphics editor's suite.
- Generated layers carry effect descriptors, and existing teaching/preview tools provide a useful base for explanations and reversible experiments. New proposals below extend these capabilities rather than counting them as missing.

## Reproduced defects

Priority convention: P1 should be resolved before expanding or promoting the affected workflow; P2 is a correctness/reliability fix to schedule promptly. These are product-risk priorities, not CVSS scores. No confirmed P0 or unauthenticated remote-code-execution finding emerged.

### A1 — P1: autosave can mark newer pixels saved without encoding them

Source: [serialize.ts](../../src/lib/project/serialize.ts#L144), [autosave commit](../../src/hooks/studio/useStudioAutosave.ts#L211).

The serializer reads a layer revision before asynchronous PNG encoding, then records `getBufferRevision(layer.id)` after the encoding callback. A stroke can occur between those points. The PNG contains the older snapshot, but the payload labels it with the newer revision. After that revision is committed, the follow-up save can decide that the edited layer is already persisted and skip encoding it.

The delayed-callback probe reproduces a newer revision being captured and a subsequent payload containing zero dirty layers and zero layer blobs. This establishes the revision bookkeeping failure; a real-browser save/reload test should establish the final pixel outcome.

**Fix:** capture the revision and generation of the exact buffer being encoded, after ensuring that entry exists and immediately before snapshotting. Commit only that version. Any newer mutation must remain dirty. Project replacement, buffer replacement, and geometry changes must invalidate stale completion work.

**Acceptance:** draw while encoding is delayed, wait for saves, reload, and compare exact RGBA bytes. Include edits during a project switch and geometry change.

### A9 — P1: a refused in-between insertion changes the original artwork

Source: [useArtisanEvents.ts](../../src/hooks/viewport/events/useArtisanEvents.ts#L216), [duplicateFrame admission](../../src/stores/slices/createAnimationSlice.ts#L131).

The morph handler calls `duplicateFrame`, then assumes the active frame is the new duplicate. That action returns `void` and can refuse insertion because of workspace or undo limits. The handler nevertheless overwrites the active base layer and clears its other untagged layers. At the 500-frame limit, the probe verifies that frame count and frame identity remain unchanged while painted pixels in the existing upper layer are cleared.

**Fix:** make insertion return an explicit result containing the new frame/layer IDs, or stage and apply insertion plus pixel changes in one command. Preflight before expensive work and revalidate when results return. Failure must cause zero pixel, metadata, history, revision, or sync mutations.

**Acceptance:** test frame, aggregate-memory, and history refusal; worker failure; stale completion; and cancellation. Hash all original buffers before and after rejected operations.

### A7 — P1: host-only structure ownership is not enforced on receipt

Source: [session callbacks](../../src/lib/sync/coDrawBridge.ts#L131), [adoptStructure](../../src/lib/sync/coDrawBridge.ts#L388), [channel dispatch](../../src/lib/sync/p2pSync.ts#L612).

The bridge describes the host as the owner of frames and layers, but `onStructureSync` invokes `adoptStructure` for either role. Adoption clears canvas buffers, installs incoming frames/dimensions, and clears history. The probe invokes the real adoption boundary while the bridge role is host and confirms that remote structure replaces its workspace.

This is a receiving-boundary reproduction and source trace, not a complete malicious WebRTC session test. Exploitation would require a connected peer capable of sending an otherwise valid structure message. UI restrictions on guest buttons do not enforce the protocol boundary.

**Fix:** bind permissions to the established session and sender role; reject guest-origin structural and host-only initialization messages at the receiver. Stage admissible adoption atomically. Define whether layer locks are local editing affordances or shared permissions. Preserve the guest's previous project before adopting a session workspace.

**Acceptance:** malicious connected guest, role spoofing, stale session generation, oversized payload, and failed adoption must leave the host's original project intact.

### A2 — P1: deleting and undoing a frame does not restore its clips

Source: [structural history capture](../../src/lib/engine/structuralHistory.ts#L93), [history type](../../src/types/canvas.ts#L129), [animation slice](../../src/stores/slices/createAnimationSlice.ts).

Deleting a frame remaps or removes clips. Structural snapshots contain frames and buffers but no clip state. Undo restores the frames without restoring the removed clip or original ranges. The probe creates a clip belonging only to the deleted second frame and verifies that the frame returns while its clip does not.

**Fix:** record the dependent animation metadata affected by structural operations, including clips and active clip identity. Construct the redo snapshot with the same complete contract. Avoid capturing unrelated transient UI state.

**Acceptance:** delete inside, before, and at the end of overlapping clips; undo, redo, save, and reload. Verify names, ranges, modes, IDs, and active selection.

### A4 — P1: selecting a clip can leave the active layer in another frame

Source: [setActiveClipId](../../src/stores/slices/createAnimationSlice.ts#L391), [drawing](../../src/hooks/viewport/useViewportDrawing.ts).

Clip selection directly changes `activeFrameIndex` without changing `activeLayerId`. The probe confirms that the resulting active layer is absent from the selected frame. Drawing resolves buffers by active layer ID, so this mismatch creates a path to modifying another frame's buffer while displaying the selected frame. The mismatch is reproduced; the complete wrong-frame pointer interaction still deserves a browser test.

**Fix:** use one canonical frame-switch transition that always chooses a valid layer and applies the selection/floating-transform policy. Route clip selection, playback, reordering, deletion, and keyboard navigation through that contract. Reject drawing when layer/frame membership is invalid.

**Acceptance:** select a clip from another frame, draw, and verify that exactly the intended frame changes. Assert membership after every frame-selection path.

### A5 — P1: merge-down can change the visible result

Source: [mergeLayerDown](../../src/stores/slices/createLayerSlice.ts#L281).

Merge draws the upper layer into the raw lower buffer and retains the lower layer's visibility, opacity, and blend mode. A visible upper layer merged into a hidden lower layer disappears; the probe confirms that the remaining layer stays hidden. Lower-layer opacity also applies again to the newly merged upper pixels, so the previous visible composition is not preserved in general.

**Fix:** specify merge semantics explicitly. Bake the pair's applicable opacity/visibility into a neutral result where that preserves the composite. Arbitrary backdrop-dependent blend modes cannot always be represented by one neutral layer: use a supported flatten/group operation or clearly refuse an unsupported exact merge. Keep undo pixels and metadata together.

**Acceptance:** compare real Canvas RGBA output before and after merging across opacity, visibility, transparency, and supported blend combinations. The shared unit-test canvas is insufficient for this comparison.

### A3 — P2: undo leaves removed canvas buffers resident

Source: [restoreStructuralWorkspace](../../src/lib/engine/structuralHistory.ts#L126).

Structural restoration installs the target frame tree but does not prune registry buffers absent from it. The probe restores a tree without a temporary layer and verifies that its buffer still exists. Repeated duplicate/add, undo, then branch sequences can accumulate canvases outside the current project's frame-based memory accounting. Eventual out-of-memory failure was not measured; orphan retention itself is reproduced.

**Fix:** reconcile live buffer IDs with the restored tree after staging the transition. Redo owns its required snapshots separately. Include resident registry bytes in diagnostics and aggregate operation budgets.

**Acceptance:** repeat undo/branch sequences and require registry count and bytes to return to the expected live-tree baseline.

### A6 — P2: palette index 255 collides with transparency

Source: [index-map builder](../../src/lib/export/shaderExporter.ts#L203), [loop frame generation](../../src/lib/export/shaderExporter.ts#L256).

The index map is an eight-bit array using 255 as the transparent sentinel. A supported 256-entry palette can also assign an opaque pixel to entry 255. Loop export interprets that real color as transparent; the probe exports the last color of a 256-color grayscale palette and confirms alpha becomes zero. The conversion also thresholds source alpha and emits opaque palette colors, which needs an explicit alpha policy.

**Fix:** separate alpha from color index, use a representation with an unambiguous sentinel, or impose a validated 255-color limitation with an explanation before export. Shared CPU and shader representations should have the same identity and alpha semantics.

**Acceptance:** every index in palettes of 1, 255, and 256 entries, duplicate RGB entries, and transparent/partially transparent pixels must round-trip according to the documented policy.

### A11 — P2: GIF worker failure reuses detached pixel buffers

Source: [GIF transfer and fallback](../../src/lib/export/gifEncoder.ts#L160).

Raw frame buffers are transferred into the worker, detaching them from the caller. If the worker fails after receiving the message, the catch path calls the synchronous encoder with those same arrays. The probe uses actual structured-clone transfer semantics, verifies zero remaining buffer bytes, and obtains output different from the correctly encoded red input.

**Fix:** on post-transfer failure, re-extract pixels from retained source canvases after rechecking their generation, or preserve an intentional fallback copy within the resource budget. If a faithful retry is unavailable, return an explicit error. Add a bounded worker deadline.

**Acceptance:** worker initialization failure, post-transfer crash, error response, timeout, and cancellation. Decode successful GIF output and compare the expected quantized pixels and durations.

### A10 — P2: missing video support returns a fake successful WebM

Source: [WebM capability fallback](../../src/lib/export/webmEncoder.ts#L70), [export UI](../../src/components/modals/ExportModal.tsx).

Shipping code returns a four-byte EBML header as a mock video when MediaRecorder is unavailable. That branch is described as test support but is reachable in a browser without the API. The probe confirms a successful `video/webm` blob of only four bytes.

**Fix:** production code must reject unsupported recording, and the UI should disable or explain unsupported formats. Keep test doubles in test files. Probe codec/configuration support, not just constructor existence, including MP4's WebCodecs path.

**Acceptance:** unavailable API, unsupported MIME type/configuration, zero chunks, recorder failure, and cancellation must not download invalid files as successes. A media decoder must open every successful result.

### A8 — P2: synchronous worker fallback ignores pre-existing cancellation

Source: [workerDispatcher.ts](../../src/lib/engine/workerDispatcher.ts#L242).

The no-worker branches run synchronous RotSprite, WFC, morph, or normal generation before the dispatcher's abort checks. The probe supplies an already-aborted RotSprite operation and a failed worker factory and still receives computed image data. Larger fallback work also occupies the main thread, where timers and UI cancellation cannot run until the computation yields.

**Fix:** check the signal before allocating or choosing any execution path. Bound fallback sizes and the job queue. Use cooperative chunks or cancellable dedicated workers for heavy work. Aborting a response should not leave an unnecessary expensive job occupying the worker indefinitely.

**Acceptance:** abort before dispatch, in the queue, while running, and after completion; verify no stale application and bounded recovery latency.

## Hardening recommendations requiring further scenario tests

These are distinct from the eleven reproductions. They are supported by architecture/source review, but their complete user-visible failures were not all demonstrated during this audit.

### Persistence and project ownership

There is no project-scoped multi-tab writer lease or optimistic storage revision check in the inspected persistence path. Module-local revision maps and an atomic database transaction do not prevent two tabs from successively replacing the same project's metadata with stale copies. Add an expected base revision checked inside the storage transaction, project ownership coordination, and an explicit conflict copy. Do not silently resolve an artistic conflict by last writer wins.

Preserve the good transactional import/recovery design. Extend fault injection to quota failures, interrupted saves, decoding after project switches, partial image failures, browser termination, and two concurrent tabs. A browser refusing persistent storage was observed in the tests; local IndexedDB should be presented as local storage with backup options, not an unconditional long-term guarantee.

### Collaboration convergence

Stroke commits notify the bridge. Pixel undo/redo restores canvases through separate paths without the equivalent notification, and structure pushes send raster snapshots only for unsynced layer IDs. A merge can change a retained layer's pixels without regenerating its CRDT state. Those paths require two-peer convergence tests; passing CRDT primitive tests does not establish convergence of the whole editor.

Define shared undo semantics: a fresh compensating edit must not erase a collaborator's later changes indiscriminately. Route all raster-changing commands through a common commit/sync boundary. Add backpressure, bounded message queues, session generation IDs, and state digests for mismatch detection. Test reconnection, late operations for deleted layers, resize, merge, undo, and saturation. Keep existing message and initial-paint ceilings.

### Memory and computation

Workspace, export, history, WFC, and co-draw have useful individual limits. The browser pays for their combined allocations: live canvases, staged hydration, undo/redo, replay baseline, scratch images, extracted export frames, worker copies, and encoded blobs. History's exposed `totalBytes` accounts for undo plus redo, not the separately retained replay baseline. A nominal project ceiling is not a process-memory ceiling.

Build an operation budget covering simultaneously resident data. Bound asynchronous PNG encoding concurrency instead of starting every dirty layer through nested `Promise.all`. Stream or batch large animation exports where feasible. Measure ordinary 32/64-pixel sprites, medium scenes, and worst-admitted projects on at least one modest machine; publish measured input-to-paint latency and peak resident data rather than guessing performance from algorithm names.

Photometric rendering, image pixelization, and several pixel loops remain synchronous. Profile light dragging and bulk operations before adding GPU paths. Coalesce previews, cancel superseded work, and commit only final intent. CPU fallback should remain an explicit capability with a safe work limit.

### Offline updates

The service worker precaches navigation and small shell assets, while hashed Next bundles are cached as encountered. Lazy modal bundles are not guaranteed available just because `/studio` was visited. The runtime cache has a 50-entry eviction budget; a warmed editor is not evidence that every offline workflow is ready.

Test offline first use of Export, Import, Recovery, and teaching surfaces. Use an explicit build asset manifest/offline readiness contract. `/playground` is not in the precache list and unmatched offline navigation falls back to the studio, which deserves a route-specific policy.

Activation deletes older cache generations and claims clients. The registrar reloads on controller change without awaiting a save acknowledgment. Coordinate an update with all open editor tabs, pending saves, worker jobs, and exports. Retain old build assets while old clients need them. A two-build, two-tab update test is more meaningful than a single warmed-page offline test.

### Export compatibility

The sprite-sheet packer accepts FPS but no per-frame duration or clip metadata, and its Godot resource emits a default animation with every relative duration set to 1.0. Variable holds created in the timeline therefore have no representation in that output. Add an animation model shared by all exporters. Godot defines absolute frame duration from relative duration and animation speed, so this can be represented correctly. [Godot SpriteFrames reference](https://docs.godotengine.org/en/4.7/classes/class_spriteframes.html).

Distinguish a JSON sidecar from a verified engine importer. Test tiny exported projects inside supported Godot, Unity, and Phaser versions before calling the path game-ready. Verify clips, playback direction, filenames, transparency, pivots, nearest filtering, scaled coordinates, and normal-map orientation. Decoder tests should supplement byte-header tests for APNG, GIF, WebM, and MP4.

### Security and diagnostics

Keep the existing CSP, input ceilings, schema admission, and opt-in relay. For a configured diagnostics relay, add a body-read deadline, bounded field/event schemas, and linear-time chunk assembly. The upstream fetch timeout does not bound time spent receiving the request body. Use an edge-enforced or shared rate limit only where deployment scale requires it; the current per-process limitation is already documented.

Diagnostic free text and error paths can contain personal data. Truncation is not redaction. Provide a readable preview and an allowlisted export schema. Align absolute local-only marketing language with optional STUN, peer sharing, and diagnostics transmission. This is transparency hardening, not evidence of covert uploads.

The advisory check found no published production dependency vulnerabilities. Retain lockfile-based installs and scheduled dependency/advisory review. Verify that every production deployment route, including provider-integrated automatic deploys, honors the intended quality gate. No deployment settings were inspected remotely.

### Command contracts and maintainability

Zustand slices, viewport hooks, the canvas registry, history, persistence, the event bus, and co-draw all participate in edits. The defects above show what happens when one path updates only some of them. Introduce a small command service with admission, staging, apply, history, revision, dirty marking, and sync responsibilities. Commands should return typed success/failure results and created IDs.

Start with duplicate/morph, merge, frame switching, undo/redo, and project adoption. Avoid a wholesale rewrite. Preserve tested raster routines. Make asynchronous event handlers report rejected promises: the event bus's synchronous `try/catch` does not catch a rejection after `await`.

Large files such as photometric lighting, WFC, recovery orchestration, scene decoration, import, and export deserve cohesion-based extraction when touched. File size alone is not a defect. Separate immutable lesson/art data from behavior and shared orchestration from algorithm implementations. Delete stale duplication only after checking callers and visual fixtures.

### Test and delivery fidelity

The common canvas mock overwrites pixels in `drawImage`, does not model blend/alpha correctly, and makes `save`/`restore` no-ops. Use it for simple indexing/control-flow tests, not compositing claims. Add real-browser pixel comparisons and independent decoder/engine round trips. Maintain small golden fixtures with documented artistic intent; intentional isolated pixels must not automatically count as defects.

The full gate does not invoke coverage. The separate coverage run passed, but thresholds do not protect a release unless CI runs them. Set explicit production inclusion and test/helper exclusion before using coverage as a release metric. Raise coverage in critical boundaries rather than chasing a global number.

Playwright is configured for Chromium and `npm run dev`, even after CI builds production, because tests use development inspection handles. Keep these useful tests and add a production-server smoke/fidelity suite with a supported browser matrix. Test the actual Next CSP/service-worker/worker behavior in the production build. Review focused pen/tablet, keyboard-only, reduced-motion, high-zoom, and constrained-screen workflows; automated accessibility passes do not cover every interaction.

## Research: what the sources support

Sources below were checked on the audit date. Academic proposals, studio practice, and product recommendations are kept separate. Publisher descriptions and available samples were consulted for books; this audit does not claim to have read entire purchased books. No copyrighted game artwork was imported into the repository.

### Academic work

| Source | Established contribution | Application and limitation for PixiBun |
| --- | --- | --- |
| Gerstner et al., **Pixelated Image Abstraction**, NPAR 2012 | Jointly optimizes reduced palettes and feature mapping; compares with naive methods and artist work | Stronger basis for pixelization than resize-plus-quantization. [Author paper](https://gfx.cs.princeton.edu/gfx/pubs/Gerstner_2012_PIA/Gerstner_2012_PIA_full.pdf) |
| Gerstner et al., **Pixelated Image Abstraction with Integrated User Constraints**, Computers & Graphics 37(5), 2013, DOI 10.1016/j.cag.2012.12.007 | Adds user constraints to the abstraction process | Motivate protected features and palette controls. Approximation is assistance, not a claim to match every artist's intent. [University publication](https://collaborate.princeton.edu/en/publications/pixelated-image-abstraction-with-integrated-user-constraints/) |
| Kuo, Yang, Chu, **Feature-Aware Pixel Art Animation**, Computer Graphics Forum 35(7), 2016, DOI 10.1111/cgf.13038 | Optimizes feature-line shape, pixel quality, and temporal coherence across frames | Motivate motion-aware diagnostics and constrained transforms. Extraction, symmetry, nearby lines, and topology changes are explicit limitations; the reported optimization is not automatically real-time. [Paper and limitations](https://purehost.bath.ac.uk/ws/files/148567276/paper1228_CRC_nocopyright.pdf) |
| Inglis, Vogel, Kaplan, **Rasterizing and Antialiasing Vector Line Art in the Pixel Art Style**, NPAR 2013, DOI 10.1145/2486042.2486044 | Preserves properties including symmetry, aspect ratio, and angles in pixel-style rasterization | Improve shape tools and optional cleanup; preserve intentional asymmetry and manual antialiasing. [Author's publication entry](https://cs.uwaterloo.ca/~csk/publications/) |
| Kopf, Lischinski, **Depixelizing Pixel Art**, SIGGRAPH 2011 | Converts pixel art into resolution-independent representations | Useful for optional vector export and shape reasoning. It changes the representation and should not be confused with retaining original pixels. The current exporter is a heuristic, not a verified full implementation of the paper. [Author project and paper](https://johanneskopf.de/publications/pixelart/) |
| Felzenszwalb, Huttenlocher, **Distance Transforms of Sampled Functions**, Theory of Computing 8, 2012 | Efficient distance transforms, with linear-time algorithms | Support reproducible distance/height/normal tooling. A distance field alone cannot recover true object geometry or materials from a painted sprite. [Journal paper](https://theoryofcomputing.org/articles/v008a019/) |
| Kleppmann et al., **Local-first Software**, Onward! 2019, DOI 10.1145/3359591.3359737 | Connects collaboration, offline operation, ownership, and durable data | Supports portable backups and explicit conflict handling. Local storage and a pixel CRDT alone do not provide durable backups or complete collaborative editor semantics. [Authors' essay](https://www.inkandswitch.com/essay/local-first/) |

These papers favor constrained, explainable operations and artist control. They do not justify advertising arbitrary automatic cleanup, automatic geometry inference, or flawless morphing as solved problems.

### Books and practical study

| Book | Why study it | Product implication |
| --- | --- | --- |
| Michael Azzi, **Pixel Logic — A Guide to Pixel Art** | Visual instruction and pixel-level examples | Original interactive exercises for clusters, lines, shading, and 1× readability. [Author site](https://pixellogicbook.com/) |
| Jennifer Dawe and Matthew Humphries, **Make Your Own Pixel Art** (2019) | Shapes, colors, shading, and animation | A progressive learning path tied to real editor actions. [Publisher and samples](https://nostarch.com/pixelart/) |
| Daniel Silber, **Pixel Art for Game Developers** (2015) | Pixel art in game production | Consistent asset families, animation, and practical engine delivery. [Publisher](https://www.routledge.com/Pixel-Art-for-Game-Developers/Silber/p/book/9781482252309) |
| Klas Benjaminsson, **The Masters of Pixel Art**, volumes 1–3 | Curated professional work and varied traditions | A licensed visual reference corpus spanning scenes, characters, palettes, and styles. [Publisher background](https://nicepixel.se/about-nicepixel/) |
| Akenine-Möller et al., **Real-Time Rendering**, fourth edition (2018) | Materials, lighting, and rendering foundations | A common coordinate/material/light contract for normals and shading. [Authors' resources](https://www.realtimerendering.com/) |
| Richard Szeliski, **Computer Vision: Algorithms and Applications**, second edition (2022) | Image formation and estimation foundations | Explain ambiguity and uncertainty in inferred normals, segmentation, and motion. [Author book site](https://szeliski.org/Book/) |

Use original or licensed lesson art. A public preview, book purchase, or studio screenshot is not a reusable lesson-asset license. Evaluate algorithms on opt-in artist work and commissioned fixtures representing multiple styles.

### Studio and practitioner lessons

**Motion Twin / Dead Cells.** Artist Thomas Vasseur describes low-resolution rendering of simple 3D rigs, key-pose timing, PNG and normal-map output, and cheap retakes. He also reports unresolved flickering pixels. The actionable lesson is editable timing and coordinated outputs; automatically filling every gap between attack poses is not universally desirable. [Firsthand production account](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-).

**Motion Twin / environment art.** Gwenaël Massé describes the color and environmental art direction of Dead Cells. My product inference is that palette tools should be judged in scene context, where characters, backgrounds, and accents interact. [Artist's account](https://www.gamedeveloper.com/production/art-design-deep-dive-giving-back-colors-to-cryptic-worlds-in-i-dead-cells-i-).

**Yacht Club Games / Shovel Knight.** Their official account describes preserving an NES-inspired aesthetic while deliberately relaxing original hardware restrictions. Offer editable style/constraint profiles instead of presenting historical limits as universal artistic rules. [Breaking the NES](https://www.yachtclubgames.com/blog/breaking-the-nes/).

**Sabotage / Sea of Stars.** The official game page describes dynamic lighting, world recoloring, and shadows across day/night and weather. This supports evaluating pixel art under multiple lighting contexts. It does not disclose enough to claim a specific internal normal-map or shadow algorithm. [Official lighting description](https://seaofstarsgame.co/).

**Mark Ferrari / palette animation.** His GDC presentation describes complex background animation using color cycling and palette shifting. PixiBun already has cycling; the extension should be reliable indexed assets, palette groups, local scope, and complete runtime exports. [GDC talk](https://www.gdcvault.com/play/1023586/8-Bit-8-Bitish-Graphics).

### Competitive baseline

Aseprite already supports substantial structured export, including tag/slice operations through its CLI. Pixelorama includes broad drawing, animation, and tilemap tools. Generic additional filters, tags, palette cycling, or tilemap support should not be described as globally unique features. [Aseprite CLI](https://www.aseprite.org/docs/cli/), [Pixelorama's official product page](https://orama-interactive.itch.io/pixelorama).

The proposals below are potentially distinctive combinations for PixiBun, not claims of worldwide novelty. Their value must be validated with working pixel artists.

## Feature opportunities

### 1. Animation stability workbench — recommended first differentiating feature

**Artist problem:** a rotated or morphed sprite looks acceptable in separate frames but shimmers, loses a bridge, or drifts when played.

**MVP:** a motion-compensated comparison view showing outline flicker, disconnected clusters, contact-point drift, and palette changes at 1× and zoomed scale. Users mark intentional smears, sparkles, and topology changes as exceptions. Save accepted marks with the clip. Add protected eye/hand/foot anchors only after diagnostics are useful.

**Extension:** transformations and lighting reuse temporal constraints, seeds, and palette identities. Offer alternatives for an individual interval and preserve original poses. Kuo et al. establish the importance of temporal feature coherence, with restrictions that make a diagnostic-first implementation more realistic than promising automatic flawless animation. [Research](https://purehost.bath.ac.uk/ws/files/148567276/paper1228_CRC_nocopyright.pdf).

**Existing base:** morphing, RotSprite, onion skin, clips, timing, and frame buffers. **Dependencies:** A2/A4/A9, complete animation export timing, common commands. **Effort:** medium for diagnostics; large/research-heavy for optimization. **Success:** artists find and resolve meaningful artifacts faster without flagging intentional animation as wrong.

### 2. Pixel integrity inspector with protected regions

**Artist problem:** a cleanup operation improves a contour but destroys an eye highlight or a one-pixel connection.

**MVP:** preview changed pixels, cluster joins/splits, silhouette differences, holes, and palette violations. Artists can protect regions or color roles and accept only selected changes. Show original and proposed results at native resolution. Explain the local reason for a suggestion rather than assigning a universal beauty score.

**Existing base:** cleanup routines, stencils, shape tools, and visual previews. Inglis et al. motivate preservation of shape properties; Pixel Logic motivates visual instruction. This is an extension of existing cleanup, not another destructive one-click filter. [Research](https://cs.uwaterloo.ca/~csk/publications/), [practical reference](https://pixellogicbook.com/).

**Dependencies:** reliable history and transaction boundaries, artistic fixture corpus. **Effort:** medium. **Success:** zero accepted changes outside protected regions; all edits reversible; artist-rated usefulness across outlined and outline-free styles.

### 3. Semantic indexed palettes and complete palette-animation kits

**Artist problem:** recoloring and animation confuse colors with identical RGB values or lose transparency and runtime behavior during export.

**MVP:** stable palette entry IDs and roles such as cloth-shadow, skin-light, or water-phase. Preserve index identity separately from alpha. Let cycling operate on named groups and masks. Export indexed texture, palette/LUT, shader, timing, and a working sample scene together.

**Existing base:** ramps, palette admission, cycling, and shader generation. Ferrari's talk supports the palette-animation approach; the proposal is to make the existing path complete and reliable. [Practitioner source](https://www.gdcvault.com/play/1023586/8-Bit-8-Bitish-Graphics).

**Dependencies:** A6, format migration and compatibility rules, engine import verification. **Effort:** medium to large. **Success:** exact palette identity/alpha round trips and CPU/editor/runtime animation agreement, including duplicate RGB entries and 256 colors.

### 4. Shared material and light rigs for pixel art

**Artist problem:** separately tuned normal, photometric, and shadow tools look inconsistent or become stale after the source changes.

**MVP:** one named light rig drives photometric, cast-shadow, and specular previews. Material roles distinguish cloth, metal, skin, and emissive regions. Artists override inferred normals or heights. Derived layers visibly report their source generation and whether they need recomputation; recipes remain editable.

**Existing base:** effect descriptors, normal sculpting, photometric tools, and shadows. Parts of this direction already appear in the repository roadmap; consolidate them into one dependable workflow. Sea of Stars offers a scene-level lighting reference, while rendering texts supply the technical basis. [Studio reference](https://seaofstarsgame.co/), [rendering reference](https://www.realtimerendering.com/).

**Dependencies:** source dependency tracking, worker budgeting, common coordinates, A1/A3/A8, palette constraints. **Effort:** large. **Success:** stable lighting across an animation and a matching engine preview. Describe inferred geometry as an editable estimate, not recovered ground truth.

### 5. Constraint-directed pixelization

**Artist problem:** converting a larger image preserves broad color but loses the face, lettering, or a thin structural detail.

**MVP:** mark must-preserve regions/landmarks, choose allowed palette roles, and compare a few deterministic candidates at 1×. Keep the source and user constraints as an editable recipe. Allow local manual correction before committing.

Gerstner's user-constrained abstraction supplies the closest research foundation. Implement a bounded, understandable subset first; do not claim an exact paper implementation without matching its method and evaluation. [Study](https://collaborate.princeton.edu/en/publications/pixelated-image-abstraction-with-integrated-user-constraints/).

**Existing base:** pixelization and quantization. **Dependencies:** preview transactions, protected-region representation, worker execution. **Effort:** large for a full optimizer; medium for useful manual constraints. **Success:** artist assessments of feature readability, correction effort, and palette compliance, compared with the current pipeline.

### 6. Engine export verifier and asset-family contracts

**Artist problem:** exported sprites import into a game with changed timing, filtering, anchors, or lighting.

**MVP:** a supported Godot sample project with named clips, holds, nearest filtering, pivots, and synchronized diffuse/normal atlases. Show the actual runtime preview next to the editor. Add Unity/Phaser only when their adapters have real round-trip tests.

**Extension:** a project profile checks palette, scale, naming, clip names, attachment points, and light conventions across a whole asset family. This makes an export a usable game asset, not merely a sheet and guessed metadata. [Engine duration contract](https://docs.godotengine.org/en/4.7/classes/class_spriteframes.html), [production-oriented book](https://www.routledge.com/Pixel-Art-for-Game-Developers/Silber/p/book/9781482252309).

**Dependencies:** common animation/export model and A6/A10/A11. **Effort:** medium per engine adapter. **Success:** the sample project plays exactly the editor's clips and passes visual/timing checks.

### 7. Tiles and scenes judged in context

**Artist problem:** an individually attractive tile repeats badly, produces seams, or reduces character readability in a scene.

**MVP:** assemble a small navigable preview map; show seam and repetition overlays, palette context, parallax, and optional lighting. Let the artist pin a path and label edges as ground, water, wall, or entrance. Show why a constraint contradicts another rather than silently failing generation.

**Existing base:** WFC, stamping, symmetry, and autotile tools. This adds semantic and scene feedback around them. The original WFC repository is an implementation reference; do not frame every WFC feature as new. [Author implementation](https://github.com/mxgmn/WaveFunctionCollapse).

**Dependencies:** bounded procedural jobs, explicit seed/constraint recipes, tile metadata. **Effort:** medium to large. **Success:** reproducible maps satisfying labels and paths, with zero unexplained seams in the chosen adjacency contract.

### 8. Pose/exposure editing and project time machine

These are two complementary workflow extensions rather than one algorithm.

**Exposure editing:** mark anticipation, impact, recovery, and holds; retime without duplicating pixels or degrading pose order. Optional generated frames should target selected intervals. Motion Twin's emphasis on cheap timing retakes supports this workflow. [Firsthand account](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-).

**Time machine:** save named/local checkpoints across reloads, show a visual before/after, branch a project, and export portable backups. Existing undo/replay and corruption recovery are not the same as durable version history. Use bounded retention and content-addressed raster storage; never imply that browser storage alone is a backup. [Local-first principles](https://www.inkandswitch.com/essay/local-first/).

**Dependencies:** A1/A2/A3/A4/A9, storage conflict handling, versioned schema. **Effort:** medium for exposure annotations; large for durable checkpoints. **Success:** retiming survives engine export, and a project can be restored after reload from a chosen checkpoint without ambiguity.

## Suggested implementation order

| Stage | Work | Exit criterion |
| --- | --- | --- |
| 1. Protect artwork | A1, A9, A7, A2, A4, A5 | Real-browser pixel/metadata preservation on rejected, concurrent, and undoable edits |
| 2. Make boundaries trustworthy | A3, A6, A8, A10, A11; shared command results; co-draw undo/merge tests | No orphan growth, fake success, stale completion, or pixel/CRDT disagreement in covered workflows |
| 3. Validate production operation | Supported Node run; production-browser smoke; offline update/multi-tab tests; combined memory budgets | Save/reload/update/import/export tested under the actual supported runtime contract |
| 4. Deliver one distinctive slice | Animation stability diagnostics plus protected regions | A small group of pixel artists finds the workflow useful on real animations |
| 5. Make game delivery dependable | Timing/clip-preserving engine adapter; semantic palette kit | Editor and game runtime agree on pixels, timing, roles, and lighting conventions |
| 6. Expand research features | Constrained pixelization, shared light rigs, context-aware tiles | Measured artist benefit, reversible operations, documented limitations |

Do not assign calendar estimates until the command/persistence fixes are scoped. The effort sizes above compare complexity and uncertainty, not promised delivery dates. Keep each stage independently reviewable; shipping a small reliable workflow is more useful than combining every research idea into one release.

## Release acceptance scenarios

1. A delayed PNG save followed by a new stroke retains both strokes after reload.
2. A refused operation at every resource ceiling changes no original buffer, metadata, or history.
3. Undo/redo restores the entire affected frame/clip/layer contract and does not leak registry canvases.
4. Merge preserves the defined composite under real browser rendering, or explicitly refuses an unsupported exact flatten.
5. A connected guest cannot replace host structure; legitimate edits converge after undo, merge, reconnect, and resize.
6. Two tabs editing one project produce an explicit conflict policy, not a silent stale overwrite.
7. Offline first-use dialogs and updates across two open tabs preserve artwork and build assets.
8. Exported animation opens in an independent decoder and a real target engine, preserving documented pixels, alpha, clips, and holds.
9. Aborted or timed-out heavy operations leave the editor responsive and cannot later apply stale results.
10. Measured memory returns to baseline after repeated edit/undo/branch/export sequences within the supported envelope.

The principal engineering goal is to make every edit complete across the systems that represent it. The principal product opportunity is to preserve an artist's intent while making timing, palettes, light, and game delivery easier to inspect and revise.

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

This document retains its dated findings and verification scope. The studio retains its single-row header and live pixel glints. Palette tools now support named creation, scans of at most six main artwork colors, and direct swatch removal. First/Last cycle swatches can animate fire while preserving wood and outlines. Cycle Loop exports APNG or GIF at 3/5/8/10/12/15/24/30 FPS, initially 8 FPS. The shared GIF encoder now restarts its compression dictionary correctly, fixing corrupted larger exports. Existing damaged GIFs need re-export. [Interface record](session-ui-ux-2026-10-01.md), [palette tools](palette-creator-2026-10-01.md), [cycle scope](palette-cycle-scope-2026-10-01.md), [export timing](palette-cycle-export-2026-10-01.md) and [GIF correction](gif-8x-corruption-2026-10-01.md).

The latest full project gate passed documentation, types, lint, **1,502 unit/integration tests across 149 suites**, and the production build in 65.39s. A real 512×512 8x GIF passed native Chromium decoding of all 16 frames with zero pixel mismatches. The current discovered editor inventory is **155 tests in 37 files**, plus 39 separate compiled-production scenarios; the new work has scoped browser verification, not a full inventory rerun. Earlier results retain their dates and scope. The user requested documentation reconciliation and Git publication of this checkpoint; Git history records publication. [Delivered work, evidence and open validation](session-completion-2026-10-01.md).
<!-- /session-publication-2026-10-01 -->
