# PixiBun code and documentation audit — 2 October 2026

## Verdict

**The codebase and the Markdown are not 1:1.** The application has substantial, freshly verified functionality. The documentation contains correct descriptions and unusually useful dated evidence, but also obsolete features, contradictory current-status statements, inaccurate implementation details, incorrect research material, and guarantees that the evidence does not establish.

**Are the documents honest?** Many recent research and session records are careful: they disclose failed runs, distinguish enumeration from execution, preserve earlier results, identify synthetic fixtures, and leave participant evaluation open. Several older reference sections are misleading when read as descriptions of the current product. A truthful checkpoint appended to a file does not make its earlier false statements true. This audit establishes those mismatches; it does not establish anyone's intent to mislead.

The most urgent changes are to the current README, architecture, technical deep dive, project agent contract, privacy wording, and documentation verification script. Preserve dated release and execution history. Correct current statements at their original location, and label historical material there instead of relying on a footer.

No application fixes, documentation rewrites, deletions, commits, pushes, deployments, external test uploads, or tunnels were performed for this audit. The additions are this report and its supporting audit evidence.

## Scope, revision, and method

Main application revision: `277dc0b` (`277dc0b` is the palette authoring / cycle export publication), package version `1.14.1`. The main checkout was clean at intake. A separate clean checkout exists at `.kilo/worktrees/quirky-library`, revision `9a360f7fcfd080a8bab3fc9508e2a9984d047135`; it is not the current application revision.

The complete non-dependency, non-build-output Markdown census found **79 files**:

| Class | Files | Treatment |
| --- | ---: | --- |
| Main-project Markdown, including project skills | 52 | Per-file assessment below; 49 tracked and three ignored local files |
| Markdown in the separate `.kilo` checkout | 26 | Per-copy inventory and comparison with the main revision; do not treat these as current docs |
| Generated local TestSprite report | 1 | Historical, one-test execution artifact |

The initial ignore-respecting code inventory contained 498 files. A second scan included ignored developer scripts, root configuration, external testing code, and historical probes: **567 code/configuration files, 138,272 newline-split lines**. Of these, the application itself is **286 `src` files, 77,557 newline-split lines**. Counts include terminal empty lines; they are inventory measurements, not statements of executable complexity. Dependencies, Git internals, `.next`, generated HTML reports, screenshots, and test-output directories are excluded. Two generated TestSprite Python files and `next-env.d.ts` remain explicitly identifiable in the inventory rather than silently becoming production code.

All primary Markdown content was collected and searched. The review compared each document's purpose and current claims with the source, configuration, tests, publication history, and retained evidence. Application imports, exports, worker references, allocations, and explicit `any` keywords were scanned with the TypeScript parser. Critical state, storage, import, history, recovery, worker, rendering, collaboration, export, diagnostic, and research paths received semantic tracing. Decorative art datasets and ignored capture scripts received inventory/static examination rather than an assertion of line-by-line correctness. The separate checkout received version/difference review, not a second full application regression campaign.

This is a broad engineering and documentation audit. It is not a proof that every line is correct, a security certification, a device qualification, or a participant study. A missing literal filename mention is not automatically missing documentation; documenting every private function would create more maintenance debt.

Supporting evidence and reproducible inventories are in the [evidence index](evidence/2026-10-02/README.md). The per-file code inventory records hashes and line counts. The source map records imports, exports, allocation sites, and documentation mentions. A graph path to an application root includes type-only dependencies and does not prove every export is used at runtime.

## Fresh validation

Runs used the existing local Node **22.23.3** runtime, within `package.json`'s Node 22 requirement. The installed default Node 26 was not used for the canonical gate. These are local Windows results, not new release sign-off.

| Check | Result | Scope |
| --- | --- | --- |
| `npm run gate:full` | Passed in **68.78 seconds** | Documentation rules, TypeScript, lint, **1,502 unit/integration tests in 149 suites**, and production build |
| Production browser suite | **39/39 passed in 7.4 minutes** | 13 scenarios each in Chromium, Firefox, and WebKit; compiled production server on port 3301 |
| Unmodified full editor browser suite | **148 passed, seven failed in 10.0 minutes** | All 155 Chromium editor tests in 37 files; obsolete UI locators caused the seven failures |
| Seven selector diagnostic copies | **7/7 passed in 26.1 seconds** | Same affected workflow assertions with current UI entry/label locators; tracked tests were not changed |
| Tracked Markdown local-file links | **906 destinations checked; no missing file targets** | Fenced examples excluded; heading targets examined separately |
| Heading links | Four confirmed errors | One architecture link and three UX report links; findings below |

The first production-browser attempt was blocked before browser startup by sandbox `spawn EPERM`. The permitted rerun passed. The launch failure is retained as environment evidence and is not counted as a product defect. The blocked run's owned process was interrupted after its launch failures.

The editor suite's seven failures are real current **test-suite failures**, not seven demonstrated product defects. Failure artifacts and source showed obsolete controls; isolated diagnostic copies using the current controls completed all seven workflows. This does not turn the unmodified 148/155 run into a clean 155/155 run. The existing tests also overwrote 30 tracked historical screenshots; their new captures were preserved locally and the original HEAD bytes restored. D38–D40 explain the resulting test, evidence, and live-copy findings.

The fresh gate validates the suite, not every narrative statement. No fresh Lighthouse run, dependency-advisory query, coverage run, live deployed-site audit, Godot execution, physical pen/device test, long-duration memory profile, real two-machine collaboration test, or artist study is claimed here. Prior results keep their original date and scope.

## Findings and exact corrections

Priorities describe documentation and product risk, not CVSS. **P1** means correct before relying on the affected current guide or publishing the claim; **P2** means schedule a concrete correction; **P3** means maintenance or navigation cleanup. A code concern is labeled separately from a documentation mismatch.

### D01 — P1: the current README still advertises the removed audio engine

`README.md:308` lists a Web Audio synthesizer, vinyl rain, and tape-flutter chords. `CHANGELOG.md` explicitly records removal of the Studio music widget and synthesis engine. `src/lib/audio` no longer ships. The removal is already correctly represented in other recent records.

**Update:** delete the Audio Engine row from the current stack table. Keep the dated implementation and removal history. Mark old landing-page plans and audio benchmarks as historical wherever a reader could confuse them with present behavior. Do not rebuild audio merely to satisfy the obsolete table.

### D02 — P1: the project agent contract directs agents to support retired or incorrect shortcuts

`SKILL.md:27` lists `N` for Rivet, Space+Drag for Pan, and `Z/Ctrl+Z` for Undo. Rivet is retired. `src/hooks/studio/useStudioKeyboard.ts` maps Space to playback and requires Ctrl/Cmd+Z for Undo. Pointer panning uses the implemented pointer/modifier path, not the advertised Space gesture. The current tool registry and shortcuts should be the authority.

**Update:** generate or verify a shortcut table against `src/config/shortcuts.ts`, `useStudioKeyboard.ts`, and pointer handlers. Include platform modifiers, focus/input exclusions, and Space behavior. Remove Rivet from the operational contract. Treat the root `SKILL.md` as current engineering instructions; a historical footer cannot neutralize a wrong imperative.

### D03 — P1: “zero telemetry” conflicts with enabled local diagnostic capture and optional transmission

`README.md:311` and `:327` promise zero telemetry/no telemetry. The same README later or elsewhere acknowledges diagnostics. `src/lib/diagnostics/capture.ts:12` enables local capture by default. It captures diagnostic/vitals events, pathname, message/detail information, and can forward events when relay opt-in is enabled. `SECURITY.md` is more candid about free-text data and the lack of a zero-PII guarantee.

**Update:** use one consistent statement: “No third-party tracking. Diagnostics are recorded locally by default; sending them through a configured relay requires opt-in.” Explain how to disable capture, clear/export reports, and what transmission includes. Describe the relay as a diagnostics relay rather than suggesting only crashes can be sent. Keep the warning that truncation is not redaction.

**Code concern:** persisted `enabled` and `relayOptIn` are read using `??` without validating booleans (`capture.ts:26–35`). A malformed truthy string can behave as enabled opt-in. This is not evidence that normal UI consent fails, nor an external attack reproduction. A strict boolean check with default-false transmission would make the persisted consent boundary match the contract.

### D04 — P1: the physical IndexedDB raster representation is outdated

`ARCHITECTURE.md` §5 describes Blob storage as though it were the on-disk representation. `src/lib/storage/db.ts:37–46` converts a logical `StoredLayerBlob` to a record containing binary `ArrayBuffer` data plus MIME/type metadata. The reading hook reconstructs the Blob abstraction and supports older Blob-backed records. The newer representation addressed actual WebKit persistence problems and is described in the phase report, but not consistently in the canonical architecture.

**Update:** distinguish the logical Blob API, physical binary record, Dexie schema version, legacy reads, and write behavior. State rollback/older-reader compatibility explicitly. Do not change storage back to Blob to match the old description.

### D05 — P1: autosave's documented result contract omits conflict

The architecture's `AutosaveOutcome` description lists invariant/abort/quota/error outcomes but omits the `conflict` branch present in `db.ts:265` and returned at `:408`. Multi-tab conflict copies are real product behavior, covered by the fresh production run.

**Add:** an autosave transition table: clean, dirty, encoding, saving, saved, failed, stale revision, deleted project, conflict, and copy success/failure. Explain that “saved locally” and a portable file backup are different states. Document the `Save a copy` recovery path near normal usage, not only in forensic engineering reports.

### D06 — P1: pool documentation falsely describes global bounds, preallocation, and clearing on release

`ARCHITECTURE.md` §11 says the pool preallocates/bounds buffers and clears them on release. `src/lib/engine/bufferPool.ts` allocates on a miss, groups buffers by exact length, caps each bucket at 16, and clears reused buffers on **acquire**. Distinct bucket count and total retained bytes have no global bound or eviction policy. Pool retention is not registered with `src/lib/safety/memoryBudget.ts`.

**Update:** describe exact-size reuse and its actual local bucket cap. Remove “Zero-GC” and “eliminate garbage collection pauses.” Reuse reduces some allocation; it does not prove zero garbage collection.

**Code concern:** add a byte budget, eviction/clear policy, and explicit integration or exclusion from the admission ledger. Exercise changing photo dimensions and repeated work, recording retained bytes. This source-level unbounded-retention finding is not a measured long-session leak or demonstrated OOM.

### D07 — P2: the compositor is not universally a pooled singleton or a DOM-free pure function

`ARCHITECTURE.md` §11 generalizes canvas reuse. `compositor.ts:35` defaults `freshCanvas` to true, allocating a new HTML canvas unless a target or explicit reuse option is supplied. It reads the buffer registry and `document`. Its useful guarantee is overlay-free frame composition, not mathematical purity or universal allocation avoidance. Its opening comment also still describes viewport migration as a future milestone.

**Update:** document ownership and lifetime for target canvases, shared reuse, and fresh output. Explain why exporters may need independent canvases. Correct source comments when their milestone is already complete. Profile actual call sites before changing the default, because reusing a singleton could corrupt retained frame arrays.

### D08 — P2: the memory ledger is an admission estimate, not a cap on total browser RAM

The combined 512 MiB ledger is useful and real. It tracks selected retained rasters/history/collaboration and reservations. It does not measure every JS object, pooled scratch buffer, browser decoder, backing surface, GPU allocation, image cache, or implementation copy. The phase report explicitly admits this; “memory-bounded”/OOM-prevention claims elsewhere are broader.

**Update:** give one canonical table of tracked owners, reservations, excluded memory, workspace envelope, history limits, operation limits, and browser-dependent overhead. Distinguish admission refusal from a guarantee that the browser cannot exhaust memory. Add a peak-memory experiment before any stronger claim.

### D09 — P1: the technical deep dive misdescribes WebM and transparency

`PIXIBUN_DEEP_DIVE.md:300` describes WebM `VideoEncoder` encoding and alpha preservation. `src/lib/export/webmEncoder.ts` calls the Canvas `captureStream` / `MediaRecorder` implementation in `videoRecorder.ts`. This is distinct from the MP4 WebCodecs path. The current code/evidence does not establish general WebM alpha preservation.

**Update:** name each actual encoder and fallback. Promise exact RGBA preservation for the verified formats and workflows that support it, particularly APNG; do not generalize to WebM. Explain real-time recording and scheduling limits for video timing. Add decoder tests before promoting a codec/alpha claim.

### D10 — P2: APNG is valid store-block DEFLATE, not compressed streaming output

`PIXIBUN_DEEP_DIVE.md:297` says streaming APNG with lossless deflate compression. `apngEncoder.ts:1–20` correctly explains uncompressed DEFLATE store blocks. `encodeZlibDeflate` writes BTYPE 00; the encoder accumulates output chunks into a Blob. This is valid zlib/DEFLATE framing, but “compressed” implies a size reduction it does not perform, and “streaming” implies a sink contract it does not expose.

**Update:** “APNG encoder with uncompressed DEFLATE store blocks, exact admitted RGBA and rational frame timing; output can be large.” Keep the recovery ZIP sink's genuinely different streaming contract separate. Compression or streaming support would be future performance work, not a required correctness repair.

### D11 — P2: MP4 padding is even-dimension padding, not 16×16 macroblock alignment

`PIXIBUN_DEEP_DIVE.md:301` gives an expression that rounds dimensions to even values and calls it 16×16 alignment. The implementation and existing tests pad odd dimensions to even dimensions without scaling the artwork.

**Update:** document even dimension admission/padding and how metadata reports the result. Do not describe the expression as rounding to multiples of 16. State codec availability and fallback separately.

### D12 — P1: replay is bounded session history, not an unlimited recording from blank

The deep dive's process replay section suggests complete fine-grained reconstruction from a blank canvas and names `processReplayExport.ts`. The file is `src/lib/export/processReplay.ts`. It reconstructs retained steps plus an eviction baseline (`:122–187`). Undo/history is bounded and not serialized as a complete permanent process recording.

**Update:** disclose retained-history scope, baseline/truncation behavior, unsupported step fidelity, and session-only availability. A baseline after eviction is a valid starting image; it is not evidence of every earlier stroke. Use the real filename. If complete long-session replay is a product goal, design a separate durable operation recorder rather than treating Undo as one.

### D13 — P2: the deep dive uses the wrong image-quantization names

The source tree and §7 call `pixelizeEngine.ts` a Sobel/K-Means++ pipeline. The current architecture §9 is more accurate: 2×2 forward-difference gradient salience, OKLab median-cut initialization, and Lloyd refinement. `MAIN.md`'s stack row also calls it a Sobel pipeline.

**Update:** reuse the actual algorithm names and initialization description. Distinguish this photo converter from `compactPalette.ts`'s at-most-six source-color summary; the scan summary does not promise the image contains six exact colors and does not recolor it.

### D14 — P2: the viewport lens description contradicts the current implementation

`PIXIBUN_DEEP_DIVE.md` §14 describes luminance-thresholded black/white squint and Brettel–Viénot CVD. `src/lib/color/cvdLens.ts` makes every nontransparent pixel `#140C1E`, preserving alpha over a white display background. The CVD constants identify Machado–Oliveira–Fernandes 2009 matrices. Squint takes precedence over the CVD filter. `ViewportLensFilters.tsx` applies the matrices in an SVG filter and leaves source rasters/exports untouched.

**Update:** describe silhouette/squint rather than thresholded value binarization, correct attribution, and explain precedence. Preserve the display-only/source-preservation distinction.

**Validation question:** the JS matrix path and SVG path use encoded sRGB; the source comment calls this “linear-light-independent sRGB … as published.” The author's implementation page was not retrievable during this audit. Verify the intended transfer-function domain against the primary implementation before calling the lens scientifically faithful. Existing self-consistency/grayscale tests do not settle that question. The [2009 publication record](https://pubmed.ncbi.nlm.nih.gov/19834201/) confirms the authors and paper, not the correctness of this repository's color-domain choice.

### D15 — P2: live glints and legacy photometric formulas need explicit separation

`DESIGN.md` §17 and `specular-glint-2026-10-01.md` correctly distinguish the current pixel highlight from a full physical BRDF and legacy behavior. `ARCHITECTURE.md`, the deep dive, and benchmark tables still emphasize the continuous Blinn–Phong pill without consistently marking that path legacy. `src/lib/ai/math/pixelGlint.ts` implements the Off/Soft/Crisp finite, two-level, GGX-shaped adaptation, with painted normals, ink protection, and alpha handling.

**Update:** document the active workflow, compatibility calls without a chosen style, separate research lighting, and renderer-specific formulas. Do not call the current glint a complete GGX microfacet BRDF. Keep older timing tables dated and renderer-scoped.

### D16 — P2: several numerical/mathematical claims disagree even within the references

Examples needing localized correction:

| Location | Problem | Correction |
| --- | --- | --- |
| Architecture history overview | “O(1)” restoration language conflicts with later region-size accounting | State O(changed pixel area), plus metadata/lookup overhead |
| Architecture older cel-ramp section versus current math | Older `0.78/0.60` factors differ from the current factors | Derive the displayed formula from the actual ramp function and its clamps |
| Deep dive Minecraft detector | Void pollution is described as `<20%` | Current detector rejects at 25%; distinguish the separate scoring threshold from the rejection threshold |
| Deep dive normal encoding | Simplified floor expression omits current rounding/coordinate handling | Specify channel encoding, normal convention, and Y inversion for each consumer |
| Architecture §27 | `<0.01ms`, guaranteed 60 FPS, parity at any azimuth | Keep the tested parity vectors; remove global timing/fidelity guarantees without measured scope |
| Architecture geometry independence | Universal light-independent wording conflicts with dynamic appendage stabilization | Identify cached base geometry and light-dependent stabilization separately |

An equation that matches a simplified model can still be useful, but must be labeled illustrative. Floors, clamps, low-lightness values, feature shielding, and degenerate geometry matter. Do not infer full-domain mathematical proof from a finite fixture suite.

### D17 — P1: deployment is dynamic Next.js hosting, not a static export/Edge-only application

`ARCHITECTURE.md` §14 mentions Vercel Edge and static optimization; `MAIN.md` has static-PWA wording. The current production build reports dynamic `ƒ` routes. `src/app/layout.tsx` obtains request headers for CSP nonces; `src/proxy.ts` emits per-request policy. The installed Next.js nonce guide requires dynamic rendering, and the installed Proxy guide describes Node runtime and lack of static-export support.

**Update:** drawing is client-side and local after load; initial deployment still needs the configured Next.js server/platform runtime. Document warm-cache offline behavior separately from first-load access. Add proxy/header assumptions and service-worker cache identity. Do not promise a plain static host can deploy this build unchanged.

The relevant installed guides were read from `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md` and `03-api-reference/03-file-conventions/proxy.md`; future implementation changes must use the guides shipped with the installed package.

### D18 — P2: relay Origin and security-boundary documentation is stale

The current handler's `isValidOrigin` compares an explicit Origin with the request URL's exact scheme/host/port (`route.ts:53–60`). Missing Origin is accepted. Older host/header-based descriptions should be replaced. This is browser-origin checking, not authentication or cryptographic proof of consent. The optional endpoint has bounded request bodies and event counts, server-owned target configuration, timeout, and process-local rate limiting.

**Update:** describe exact matching, absent-Origin behavior, trusted proxy/IP assumptions, per-process rate limits, client opt-in versus endpoint admission, and target configuration. Say generic event envelopes are bounded; do not imply every event is runtime-validated against `DiagnosticEntry`. A configured HTTPS URL is not a proof that arbitrary upstream redirects or operator configuration can never create a problem. No relay exploit was reproduced here.

### D19 — P2: “all 32 actions validated by schemas” confuses static types with runtime admission

`ARCHITECTURE.md` §13 makes a numbered schema-validation claim. `src/lib/events/studioEvents.ts` defines a TypeScript map and typed emit/on methods. DOM event details are cast to that shape; the bus does not itself run a runtime schema for every action. Validation may occur in individual handlers, worker boundaries, or project admission, but that is a different contract.

**Update:** describe compile-time event typing, handler-side validation, DOM event exposure, and protocol-specific runtime validators. Generate an event inventory if a count is useful. Prefer named contracts to a fragile bare action count.

### D20 — P2: effect descriptors are not the same as executable, strictly validated recipes

`ARCHITECTURE.md` §30 generalizes structured recipe behavior to all procedural/AI features. `schema.ts:62–94` validates recognized effect kinds and bounded parameter containers; it accepts syntactically valid parameter keys without a per-kind semantic key/range schema. The deep dive's stronger rejection language is inaccurate. The newer research recipe contract in `src/lib/research/recipes.ts` is more specific and includes bounded settings/fingerprints.

**Update:** distinguish legacy effect provenance, destructive-but-undoable raster actions, editable supported effects, and canonical research recipes. Specify which tools can reload/recompute a recipe and which merely retain provenance. State when transforms/merges detach metadata. Document older-reader optional-field loss and saved-source freshness.

**Code option:** if strict per-effect executable recipes are intended, introduce versioned parameter validators per kind and define migrations. Until then, change the claim rather than silently tightening accepted legacy files.

### D21 — P1: guest structure policy is described inconsistently

Architecture's earlier collaboration text allows guest structural changes to remain local, while §23 describes locked guest structure controls. The bridge and receiving-boundary hardening now enforce host-owned structure. The phase report is clearer about limitations and unverified real collaboration behavior.

**Update:** one policy table for host/guest painting, locks, structure, initialization, metadata, disconnect, local project restoration, and queue acknowledgement. Separate per-pixel CRDT convergence tests from full application convergence and real WebRTC connectivity. Preserve the recorded A7 security fix; do not imply broader two-machine validation occurred in this audit.

### D22 — P2: strong performance, accessibility, and completeness language exceeds evidence

Examples remain in README/MAIN/DESIGN/architecture/deep dive: zero client bundle bloat, zero-lag theme switching, zero perceptible latency, guaranteed 60 FPS, comprehensive/full mathematical verification, and unqualified WCAG compliance. Scheduling with `requestAnimationFrame` does not ensure 60 FPS. TypeScript compilation is not 100% runtime safety. A bounded allocation is not a proof of no leaks.

**Update:** use “target,” “reduces,” “tested under …,” or a dated measurement with hardware, browser, fixture, sample size, build, warm/cold state, and p50/p95/max. Separate automated Axe scope from keyboard/manual assistive-technology review. WCAG conformance has explicit scope and requirements; a clean automated scan does not establish them all. [WCAG 2.2 conformance requirements](https://www.w3.org/TR/WCAG22/#conformance-reqs) support that distinction.

Keep measurable algorithm statements where warranted, including bounded resource admission, exact fixture comparisons, and the linear separable transform. Do not strip useful engineering precision merely because some surrounding rhetoric is excessive.

### D23 — P1: the future SIMD palette example is wrong for general 256-register input

`V2_VISION.md` §3.3 describes a 256-color palette and shows a single 16-byte `i8x16_swizzle` lookup. That instruction selects from 16 byte lanes; indices outside 0–15 yield zero. A register value of 255 cannot select the 255th entry from this vector. The [WebAssembly execution specification](https://webassembly.github.io/spec/core/exec/instructions.html) defines this operation; its semantics do not provide a 256-entry gather.

**Update:** restrict the example to explicitly normalized 0–15 inputs or design a correct multibank/table path. Remove unsupported single-cycle throughput guarantees. §3.2 also says 128 pixels are tested while its RGBA comparison handles four 32-bit pixels; distinguish occupancy-bit operations from RGBA equality. The alpha-compositing snippet contains omitted math/undefined output and must be labeled pseudocode, not runnable implementation.

### D24 — P1: the tree-CRDT paper citation is incorrect

The v2 vision gives “A Highly-Available Move Operation for Replicated Trees and Its Implementation in JSON CRDTs,” TPDS 33(5), 1411–1424, DOI `10.1109/TPDS.2021.3119561`. The author's [publication record](https://martin.kleppmann.com/2021/10/07/crdt-tree-move-operation.html) identifies **A highly-available move operation for replicated trees**, authors Kleppmann, Mulligan, Gomes, Beresford, TPDS **33(7):1711–1724**, DOI **10.1109/TPDS.2021.3118603**.

**Update:** correct the title, author ordering, issue/pages, and DOI. Keep the useful cycle/move motivation. A citation to formally verified research does not mean this future repository implementation or its integration is formally verified.

### D25 — P2: JFA approximation and GPU pass count are overstated

The v2 vision treats JFA as an exact Euclidean distance replacement and says an extra pass eliminates error. The [authors' JFA research page](https://www.comp.nus.edu.sg/~tants/jfa.html) explicitly describes an approximation. Extra-pass variants reduce error; this is not a full-domain exactness proof. `O(log N)` passes for an N×N grid is not `O(log N)` total work: each pass visits the grid.

**Update:** state approximation/error tradeoffs and separate pass count, work, traffic, transfer costs, and measured latency. Validate JFA/variants against the CPU EDT before claiming parity. Hardware necessity at a particular resolution requires profiling, not a categorical assertion.

### D26 — P2: future roadmap numbers and examples need evidence labels

The v2 vision still states unverified 4.8 GB/s “benchmarked” throughput, sub-1.5ms total 4K composition with zero frame drops, installer/startup/RAM sizes, sub-3ms SSD undo paging, “L1 RAM” undo states, and constant RAM regardless of depth. Some other timings have already been correctly labeled modeled or aspirational, but the correction is incomplete.

**Update:** mark every future numerical claim as target/estimate with assumptions, or remove it. State that WGSL/Rust snippets are incomplete design examples. Label P3 area/volume comparisons carefully and verify browser/PNG compatibility against primary specifications before implementation. Require an artifact and training/data/license definition for the proposed FSRCNN-Pixel model; no repository model or measured inference should be implied. Replace date-based Gantt promises with decision gates if work has not started.

### D27 — P1: the documentation checker can pass while current documentation is wrong

`scripts/verifyDocIntegrity.mjs` checks phase numbering, architecture numbering, selected changelog paths, a specific obsolete line-count phrase, selected count patterns in three documents, and package/changelog version equality. It does not validate all Markdown, anchors, retired features, privacy claims, actual execution, architectural semantics, or performance evidence.

Its “280/280 verified on disk” success includes an allowlist of deliberately removed historical files. That allowance is appropriate for history; the message should say “existing or approved historical paths.” Its source comment claims line-count verification more broadly than the implementation's obsolete-phrase check. Its regex does not match the repeated comma-separated `1,502 unit/integration` checkpoint wording. The fresh passing result therefore does not establish whole-repository honesty.

**Update code and docs:** split live contracts from dated evidence, normalize numeric formats, check all owned Markdown local links/anchors, and use machine-readable current inventory. Report what was checked accurately. Add narrowly defined source-backed contracts for tool shortcuts, format capabilities, runtime/version, and published status. Keep historical exceptions explicit. Do not build a regex system that pretends to judge every prose claim.

### D28 — P2: current-status drift persists inside the same documents

Concrete examples:

- `PIXIBUN_UX_CHANGELOG.md:3` calls 1,482/144 and 149/33 the inventory as of 1 October; the footer says 1,502/149 and 155/37.
- `PHASE6_UX_HARDENING.md:5` says the current editor inventory is 146/32.
- `docs/research/evidence/2026-09-30/README.md:3` says live inventory is 146/32.
- `docs/research/evidence/2026-10-01/README.md` repeats successive “latest/current” 149, 152, 153, 154, and 155 counts in different passages.
- `LOGS.md` near the top calls 1,472/146 current, before a later palette record/footer.
- `phase-implementation-status.md` still says phase work is local and uncommitted, despite the main revision's publication.

**Update:** label each historical inventory with the exact checkpoint. Replace floating “current/latest” prose with a link to one canonical current-status record. Add a short publication erratum to the phase report. Do not rewrite an old 134-test run as a new 155-test run.

### D29 — P2: universal checkpoint duplication creates a second maintenance problem

The same session checkpoint is copied into 50 primary Markdown files, including archived plans, historical release sign-off, an ignored transcript, and a large ignored design specification. This adds unrelated palette/glint status to documents with different purposes and does not reconcile their original paragraphs.

**Delete from current maintenance:** redundant checkpoint blocks after preserving one canonical dated record. Use a short related/current-status link where helpful. Keep `AGENTS.md` focused on operating instructions and the required Next.js block. Do not remove original failed-run evidence, dated validation, source citations, or release decisions. Avoid another all-files footer campaign.

### D30 — P2: archival audit findings and active work are not consistently separable

The root older audit reports preserve resolved/unresolved statements from several phases; the deeper report has local resolution notes that still say M2+/M12 remain open after later fixes. These are legitimate snapshots but easy to mistake for the present backlog. `TASKS.md` and `LOGS.md` say the historical records document “mathematical proofs”; many entries are test assertions and engineering observations.

**Update:** a resolved-finding registry keyed by audit ID, original revision, fix revision, regression, remaining limit, and closure evidence. Add localized “as of this phase” labels and a prominent link to that registry. Change the umbrella proof wording to match the evidence. Archive old reports without erasing their original observations.

### D31 — P2: UX “observed artist experience” is stronger than the study evidence

The hardening implementation/visual reports use phrases such as “systematically evaluated,” “observed experience,” “instantaneous,” and “with total confidence.” Top-level reconciliation correctly says automated journeys are not participant evaluation, and the actual study protocols leave results pending. Those qualifiers should apply locally as well.

**Update:** call those sections engineering walkthroughs or automated task checks. Identify screenshots/builds and distinguish visible state from actual interaction. The palette locator creates a selection bounding box; do not call it a per-pixel pulsing highlight without code/evidence. Historical selectors that changed from combobox to tabs should be tied to their original UI revision. A screenshot alone cannot prove keyboard focus restoration, precise timing, or cross-browser behavior.

### D32 — P2: contributor guidance calls encoders decoders and overstates type safety

`CONTRIBUTING.md:13` says APNG/GIF decoders were authored as core algorithms; the application implementations are encoders, with independent/native decoding in verification. The gate table says “100% strict TypeScript typing.” Strict compiler settings and clean compilation are valuable but do not cover unvalidated runtime inputs, JS dependencies, every cast, or omitted library checking.

**Update:** encoder/muxer terminology, strict compilation scope, meaningful runtime boundary tests, and explicit separate coverage/browser/Lighthouse commands. Keep its existing candid note about the documentation check's narrow scope.

### D33 — P2: the Git hook's source guarantee is false and its installer assumes a directory

`scripts/installGitHooks.mjs` promises no push can leave without the gate, writes `.git/hooks/pre-push` directly, and overwrites the hook. Git hooks can be bypassed; the test runs against the working directory, which can differ from pushed commits. Worktrees commonly have a `.git` file and can use `core.hooksPath`. The current separate checkout makes this more than an abstract repository layout.

**Update docs/source comment:** describe convenience enforcement, not an unbypassable security boundary. **Code improvement:** resolve the hook path through Git, respect configured hooks, and preserve/chain existing hooks or make replacement explicit. Verify behavior in a throwaway worktree, never by overwriting a user's unrelated hook during audit.

### D34 — P2: CI coverage and platform scope need a truthful matrix

GitHub CI runs the full gate, Chromium development tests, the three-engine production suite, and Lighthouse. `.gitlab-ci.yml` runs the standard gate and a main-branch build; it does not provide the same browser/Lighthouse matrix. `vitest.config.mjs` defines coverage thresholds, but `npm test`/the canonical gate do not enable coverage and GitHub CI does not invoke `test:coverage`.

**Add:** exact local/CI command matrix, Node versions, retries, development debug handles versus compiled checks, artifact locations, and whether coverage is advisory or mandatory. Do not imply configured thresholds are enforced on every commit. The production output changes when `PIXIBUN_PRODUCTION_PORT` changes; record the chosen port and output path in evidence.

### D35 — P2: operational configuration examples are not published reliably

An on-disk `.env.example` exists, but `.gitignore`'s `.env*` rule excludes it. Do not claim the file is absent; the issue is publishability/discoverability. The deployment guide should document `DIAGNOSTICS_RELAY_URL`, `SW_CACHE_VERSION`, and the production-test port without exposing `.env.local` or keys. `SW_CACHE_VERSION` is build-time cache identity, not a runtime migration mechanism.

**Add:** a safe tracked template with an explicit `.gitignore` exception, plus an operator guide for disabled relay, trusted proxies, cache versions, update/warm-offline checks, rollback, and IndexedDB format compatibility. Actual local secret files were not inspected or reproduced in this report.

### D36 — P3: four confirmed heading links are wrong

The architecture TOC's in-between link contains `pixilaienginets`, while the heading derives from `pixelAiEngine.ts`. The UX hardening report links to `#final-ux-integration-pass`, `#end-to-end-artist-journeys-evaluation`, and `#visual-qa-interaction-qa--final-verification-matrix`, while the actual section headings include numbers 6, 7, and 8.

**Update:** correct those anchors and validate them in the target Markdown renderer. The initial heuristic also flagged the v2 swizzle link because of underscore handling; that is a scanner false positive, not an additional confirmed broken link. File-target checks are clean for tracked Markdown; ignored `chat.md` contains app-specific absolute links/transcript examples that should not be promoted as portable repository links.

### D37 — P2: TestSprite plans and generated artifacts must not look like current verification

The repository has 58 plan files, Python test scaffolding, local runs, and one generated Markdown report from 9 September containing one passed studio-entry test. Several older plans mention retired radio/Rivet/optics workflows. The generated report's 100% is one of one, not full product coverage. Recent changelog wording correctly says plans are not executed verdicts.

**Update:** add a plan registry with active/retired/superseded status, target revision/environment, and last actual verdict. Keep generated local runs ignored and preserve historical reports when useful. Refresh stale plans before execution, not by silently counting them as coverage. Old “CLI unavailable” statements are valid dated environment observations; the later discovery of authentication should have a linked correction where they read as current. Do not upload or tunnel just to satisfy a historical claim.

### D38 — P1: the current full editor suite is not green after the header/label changes

The fresh unmodified run passed 148 and failed seven. All seven failed on obsolete UI lookups rather than their underlying pixel or persistence assertion:

| Tracked test | First failing lookup | Current contract verified in diagnostic copy |
| --- | --- | --- |
| `tests/e2e/importImageAndSheet.spec.ts:66` | Visible button named `64×64` | Canvas-size state reflected in the actual 64px raster; fit/original-size import and preview/confirmation passed |
| `tests/e2e/importImageAndSheet.spec.ts:100` | Same removed size button | Current raster dimensions; sheet suggestion, retained blank timing cell and distinct red/transparent/blue frame pixels passed |
| `tests/e2e/offline.spec.ts:51` | Old expanded offline text | Compact exact `Offline` indicator; warm offline reload/edit/save/restoration assertions passed |
| `tests/e2e/recoveryUIFlow.spec.ts:331` | Direct Gallery button | File → Projects; damaged-project recovery and original active-workspace preservation assertions passed |
| `tests/e2e/studio.spec.ts:83` | Direct Guide button | Studio → Help; dialog open/close and `?` shortcut passed |
| `tests/e2e/studio.spec.ts:391` | Panel named `2.5D Photometric Studio` | Current `Light your sprite` panel; expanded-panel Axe checks passed |
| `tests/e2e/uxVisualQa.spec.ts:30` | Old expanded offline text | Compact exact `Offline` indicator; default/dirty/saved/offline captures completed |

Only diagnostic copies under the ignored audit scratch directory were adapted. The import tests replaced an obsolete size-button visibility assertion with a real canvas-width assertion; other changes follow the new menu/label controls. No underlying pixel, Undo, frame, recovery, offline, modal or accessibility assertion was removed. Screenshots from diagnostic copies were redirected to a current-run directory.

**Update tests and docs:** follow the canonical current controls, wait for actual restoration/readiness, and run the unchanged full inventory after those tracked fixes. Make the current validation status explicitly failed until that occurs. The source-map/header changes should have triggered these affected tests before a full-regression claim. Existing dated 98/134/145-test passes remain legitimate older evidence; they are not a current 155-test pass.

### D39 — P1: regression tests can silently rewrite historical evidence

The unmodified run changed 30 tracked PNGs under `docs/research/evidence/ux-qa/` and `docs/research/evidence/2026-10-01/`. Test constants such as `SCREENSHOT_DIR = 'docs/research/evidence/ux-qa'` make an ordinary rerun overwrite screenshots linked as dated evidence. A future Git publication could accidentally relabel today's images as an earlier verification run.

**Update code/process:** routine tests should write under ignored per-run artifact directories. A deliberate evidence-publication command can copy approved captures into a new dated directory, with commit, test name, viewport, browser, runtime and hash manifest. Never refresh historical screenshots in place as a side effect of regression tests. This audit copied today's captures separately and restored every affected tracked PNG to its exact original bytes; restoration paths are recorded in evidence.

This is an evidence-integrity concern, not a claim that the current archived images were fabricated. It explains why source/evidence provenance must be mechanically preserved, not merely stated in prose.

### D40 — P2: the live Export tooltip advertises an incorrect E shortcut

`AtelierRail.tsx` still titles Export `Export PNG, GIF, or Spritesheet (E)`. `useStudioKeyboard.ts` maps `E` to Eraser; it has no matching Export action. Some UX workflow descriptions also say press E to export. This mismatch is in both live product copy and Markdown, not just an old document.

**Update:** remove the wrong Export shortcut hint and correct the relevant current guide, or deliberately introduce a distinct non-conflicting shortcut with focus/input policy and regression coverage. Keep E for Eraser unless the user intentionally changes the drawing-tool convention. Include live titles in the source-backed shortcut check proposed in D02/D27.

## Codebase review: subsystem contracts and documentation coverage

The code inventory is provided file by file. This matrix states the semantic review's conclusions and missing canonical contracts. It does not inflate an AST inventory into a claim that every decorative component was manually proven.

| Area and concrete source | What holds | What should be updated or added |
| --- | --- | --- |
| Routes, layout, `src/proxy.ts`, `next.config.ts` | Current per-request CSP, dynamic hosting, service-worker response headers; fresh build passes | Node deployment/warm-offline contract; remove static/Edge shorthand; document cache identity and server relay |
| `studioStore.ts`, slice actions, `workspaceEnvelopeGuard.ts`, metadata admission | Central workspace and input limits; regression coverage for rejected operations and metadata/history | Command/transition ownership table covering pixels, metadata, selection, history, revision, and sync as one operation |
| Buffer registry, structural history, save revisions | Detached raster ownership and revised asynchronous snapshots; native save/reload/clip/history checks pass | Logical versus physical storage; lifecycle ownership; history eviction baseline and refusal outcomes |
| `bufferPool.ts`, `memoryBudget.ts`, `resourceBudget.ts` | Admission estimates and per-bucket reuse are implemented | Global pool retention accounting; exclusions from estimates; peak-memory qualification |
| Viewport drawing/pointer/selection/transform hooks | Separate drawing and UI state; extensive native mask/transform/isolation tests | Canonical pointer interruption policy, supported pan gestures, native alpha round-trip behavior, exact shortcut/focus exclusions |
| Compositor/onion/lenses | Overlay-free exports, display-only lenses, separate onion rendering | Canvas ownership defaults; silhouette/CVD behavior; color-domain verification |
| `pixelizeEngine.ts`, `compactPalette.ts`, ramp/color functions | Deterministic repository algorithms; scan selects source representatives, not invented averages | Correct quantizer names; converter-versus-summary distinction; color-space assumptions and any palette constraints |
| EDT/photometric/glint/normal sculptor | Existing bounded geometry and stylized lighting; current glint has honest source comments and fixture evidence | Renderer-specific coordinate/formula glossary; legacy versus active paths; benchmark actual end-to-end drag latency |
| RotSprite, morphology, dither, autotile, tile stamp | In-repository algorithms with focused preservation/constraint tests | Inspired-versus-canonical attribution; authored options/edge cases; UI availability versus retained internal compatibility |
| Worker dispatcher and four worker families | Deadlines, cancellation/owned transfer, failure handling and generation/freshness checks | Per-operation table of limit, worker, fallback, reservation, retained result, cancellation, stale rejection; don't generalize one worker policy |
| `db.ts`, serialization, decoding, import execution | Exact binary/metadata persistence, stale-save refusal/copy, supported limits; fresh native tests pass | Database physical format, rollback boundaries, autosave debounce window, storage eviction/private-mode behavior |
| Recovery diagnosis/plan/orchestration/ZIP | Preserves source records and makes separately admitted copies; strong adversarial tests | User recovery guide; raw untouched ZIP versus normal portable `.pixibun`; streaming/file fallback limits and restore expectations |
| P2P sync, co-draw bridge, CRDT pixels | Host authority and bounded acknowledged message handling have regression evidence | Real connectivity qualification, LAN/internet expectations, structure/lock policy, metadata not synchronized, disconnect preservation |
| Shared animation model, GIF/APNG/MP4/WebM, sheets, shaders, Godot kit | Fresh compiled animation/export tests pass; GIF LZW correction has retained independent/native evidence | Fidelity/capability matrix for alpha, holds, looping, pose order, palette identity, scope, actual implementation, and engine verification |
| Animation stability/review metadata/scan worker | Bounded diagnostic review, exceptions, protected cleanup, source freshness | Metric meaning and false positives; participant results remain pending; no aesthetic-quality certification |
| Research recipes/algorithms/workbench/worker | Canonical bounded recipes, fingerprints, original-preserving previews, structural publication; three-engine tests pass | First-class architecture section rather than session-only explanation; constraints, normal estimate limitations, recomputation and compatibility |
| UI primitives/rail/panels/modals/themes | Scoped accessibility and keyboard checks; responsive desktop tests; later corrections have real evidence | Manual assistive-technology scope, desktop gate, source-backed control contract, and visual QA revision metadata |
| Playground, onboarding, teaching/starter datasets | Substantial learning content and existing tests | Separate visited/skipped/verified progress; sample isolation and project restoration before new in-Studio lessons; the existing plan correctly treats these as hypotheses |
| Diagnostics/vitals/relay/token bucket | Local storage, explicit UI opt-in, bounded relay, process-local limiter | One privacy description; runtime boolean settings; byte bounds if whole-report size is to be guaranteed |
| Quality/hook/CI/TestSprite/ignored scripts | Working local gate and real browser suites | Registry of test plans versus runs; coverage enforcement decision; portable hook installer; ignored script purpose/dependencies/output |

Large modules deserve targeted maintenance: `photometricLighting.ts` (1,632 newline-split lines), `playgroundLessons.ts` (1,617), `AtelierDeskScene.tsx` (1,446), `recoveryOrchestrator.ts` (1,281), `waveFunctionCollapse.ts` (1,120), `globals.css` (1,102), `schema.ts` (1,076), `ExportModal.tsx` (1,019), and `AtelierRail.tsx` (1,009). Length alone is not a defect. Extract contracts and pure helpers around real responsibilities while retaining transaction/publication boundaries and fidelity tests. Avoid a sweeping rewrite merely to make file sizes smaller.

The source-map scan found no explicit TypeScript `any` keywords in the application inventory. That supports a narrow style claim; it does not prove runtime safety, exhaustive schemas, or absence of unused behavior. Retained compatibility functions, type-only imports, dormant renderer modes, and internal stamp code should not automatically be deleted because they are not visible drawing tools.

## Every primary Markdown file: disposition

All rows refer to the main checkout. **Keep history** means preserve the original dated observation, add a local correction or status link where needed, and stop presenting it as current. Removing duplicated checkpoint blocks is recommended across rows, but is not repeated in every cell.

| File | Assessment | Exact disposition |
| --- | --- | --- |
| `AGENTS.md` | Current operational instructions plus unrelated session footer | Keep Next.js-generated rules; replace repeated product checkpoint with one current-status link |
| `README.md` | Useful scope/limits/evidence, with materially misleading current rows | Fix audio, privacy, performance/conformance, deployment and capability claims; surface desktop/browser and backup guidance; reduce repeated implementation prose |
| `MAIN.md` | Useful product brief; older stack terminology/guarantees drift | Correct Sobel converter label, static-PWA shorthand, zero-bloat/latency wording; keep goals explicitly goals and pending evaluation visible |
| `ARCHITECTURE.md` | Valuable but layered historical chapters contradict newer chapters | Correct D04–D08, D16–D21; separate present contracts from historical upgrades; add research/animation/game-delivery architecture and ownership tables; fix TOC |
| `DESIGN.md` | Recent glint/contrast scope is good; aspirational motion/control language remains | Replace guaranteed zero-lag/60fps statements with targets; align native control semantics and current internal stamp versus toolbar behavior; preserve legacy renderer label |
| `BENCHMARKS.md` | Better historical scoping and honest unverified current timings | Keep reference hardware/timings; label legacy pill tables; remove smooth-60fps/total-memory implications; add measured current workload distributions only after profiling |
| `CONTRIBUTING.md` | Mostly candid about checks and scope | Correct decoders→encoders, 100% typing, hook assumptions; add CI/local coverage matrix and validation evidence format |
| `SECURITY.md` | Stronger than marketing copy on privacy and limitations | Correct relay Origin description; centralize real threat boundaries, consent/data scope and admission exclusions; retain no-certification disclaimer |
| `SKILL.md` | Active instructions contain obsolete shortcut obligations | Correct Rivet/pan/Undo; derive tool/shortcut contract; separate requirements from verified conformance; keep operational instructions concise |
| `FullStackGuide.md` | Generic reusable guide, not actual PixiBun architecture | Mark optional general reference; remove implied mandatory Sentry/cloud backup/Supabase/Zod for this local app; cite or remove unverified breach statistics/CVE examples; label compiler/tool assumptions and preservation claims |
| `V2_VISION.md` | Clearly future in principle, but technically wrong examples/citation and unsupported promises | Correct SIMD and paper citation; scope JFA approximation; label all numeric estimates/snippets; define decision gates and model artifact; retain deferred status |
| `TASKS.md` | Strong current open-study items; huge mixed historical ledger | Keep old acceptance records dated; replace proof umbrella; centralize active backlog and resolved audit IDs; avoid counting old phase checks as current runs |
| `LOGS.md` | Valuable development/failure history; current summaries drift | Keep chronology; date 1,472/146 and local-only/unpublished statements; link later publication and fixes; change mathematical-proof umbrella to evidence-specific language |
| `CHANGELOG.md` | Correctly records feature retirement and unreleased work | Preserve historical removed files; distinguish version from commit/build; link current release evidence; don't treat equality with package version as deployed freshness |
| `PIXIBUN_DEEP_DIVE.md` | Highest density of current technical mismatches | Rewrite affected storage/encoder/replay/quantizer/lens/formula/legacy-glint sections from current source; use supported claims and real filenames |
| `PIXIBUN_AUDIT_RESULTS.md` | Earlier snapshot with appropriately scoped unverified observations | Keep history; give reviewed revision/date and resolution-registry link prominent placement; do not reclassify old no-E2E evidence as current absence |
| `PIXIBUN_AUDIT_RESULTS+DEEP.md` | Detailed useful finding IDs, but local open/resolved notes span incompatible checkpoints | Keep 66-finding universe and original evidence; add ID→fix/evidence matrix; qualify stale “still OPEN” statements locally; avoid saying all findings closed without remaining limits |
| `PIXIBUN_UX_AUDIT.md` | Honest hypotheses and supplied-research limitations | Keep dated snapshot; link implemented/retired decisions; distinguish 43 historical preview scenes from current tool count and avoid using old locations as live contracts |
| `PIXIBUN_UX_IMPLEMENTATION_PLAN.md` | Historical header/backup iteration superseded by feedback | Mark superseded choices beside their specification; keep safety/acceptance reasoning; point to current actual workflow |
| `PIXIBUN_UX_CHANGELOG.md` | Good local-only scope and correction narrative; top inventory is stale | Change top current count to a dated glint checkpoint or canonical link; retain per-step counts and TestSprite correction |
| `AUDIT_REMEDIATION_2026-09-19.md` | Ignored local historical checklist | Keep as local history or deliberately publish into a dated archive; no automatic deletion; avoid active-plan presentation |
| `PIXIMOTION_ENGINE_MASTER_SPEC.md` | Ignored, very large design/research specification with explicit proposal/evidence labels | Keep local proposal status; reconcile which bounded subsets shipped; add scope/evidence map and citations/version ownership before publication; never present it as the shipped engine |
| `chat.md` | Ignored conversation transcript; not a portable technical guide | Keep private/local if wanted; do not publish by bulk reconciliation; remove live-maintenance footer and use the canonical report for decisions |
| `.agents/skills/testsprite-onboard/SKILL.md` | Versioned vendor-style workflow, not product documentation | Keep vendor revision/hash and upstream provenance; document project verification preference elsewhere; don't count onboarding instructions as tests executed |
| `.agents/skills/testsprite-verify/SKILL.md` | Detailed actual-run discipline and narrow skip rules | Keep and update via upstream mechanism; preserve user instruction precedence; a local-only user choice overrides a generalized upload workflow; docs audit does not require a behavior-change TestSprite run |
| `docs/plans/README.md` | Archive title mixed with current plans | Split archive and active proposal lists; label September checklist historical and name current roadmap/status sources |
| `docs/plans/implementation_plan.md` | Old PWA/diagnostics/CI implementation design | Keep history; mark old Playwright production-server description superseded by development config plus separate production suite; update only status links |
| `docs/plans/implementation_plan_v2.md` | Landing-page redesign snapshot, not v2 engine implementation | Rename/archive for discoverability; label radio/audio and asset plans superseded; avoid current instructions to wire retired audio |
| `docs/plans/audit_remediation_plan.md` | Historical safety/version proposal with obsolete counts and limits | Keep as original plan; link implemented canonical envelope and migration behavior; do not apply old probe area/timing numbers to current code |
| `docs/plans/audit_remediation_walkthrough.md` | Historical resolution/certification report overstates global timing/parity | Keep exact tested fixes; scope `<0.01ms`/60fps/any-azimuth assertions; label “certification” as local verification rather than proof |
| `docs/plans/audit-remediation-2026-09-26.md` | Good explicitly historical checklist with later correction | Keep; link history-budget rejection superseding oversized-edit acceptance; provide ID closure mapping rather than another merged current checklist |
| `docs/plans/research_grounded_product_roadmap.md` | Useful A–H proposal, some subsets delivered | Add per-capability implemented/partial/deferred/evaluation status and source links; separate A–H numbering from six audit phases; define worker fallback per operation |
| `docs/plans/learn-by-making-2026.md` | Honest experiment/hypotheses and artwork-safety gate | Keep active experiment label; record whether Week 1 recruitment occurred; don't infer funnel measurements without instrumentation/consent; date any changed-code observations |
| `docs/releases/v1.14.1-signoff.md` | Good commit-pinned historical release and accepted gaps | Preserve September decision exactly; local fresh tests do not rewrite release sign-off or prove current live deployment; replace unrelated copied checkpoint with a later-work link |
| `docs/research/2026-09-30-codebase-and-pixel-art-audit.md` | Strong transparent pre-fix audit and limitations | Preserve probes/findings at original commit; add closure links; do not execute old bad-behavior probes as desired contracts on current code |
| `docs/research/phase-implementation-status.md` | Best detailed engineering/evidence/compatibility account | Correct current uncommitted status with publication erratum; keep phase-specific failures/reruns; extract stable contracts into architecture/user/operator guides |
| `docs/research/PIXIBUN_UX_HARDENING_AUDIT.md` | Useful dated baseline, claims “authoritative current” over time | Date all “Current” workflow observations; map findings to implementation and remaining artist questions; make superseded baseline status prominent |
| `docs/research/PIXIBUN_UX_HARDENING_REPORT.md` | Useful implementation detail but inflated evaluation/conformance vocabulary | Correct three TOC links; scope automated journeys and old selectors; distinguish badges/bounding boxes from pixel overlays; tie each verification matrix to its revision |
| `docs/research/PIXIBUN_UX_VISUAL_QA.md` | Useful screenshot matrix; broader behavior claims than images alone prove | Tie captures and browser results to commits; correct locator/pulse and update-policy descriptions; keep 134/33 historical; link later CLI availability rather than erase historical absence |
| `docs/research/PHASE4_ARTIST_UX_STUDY.md` | Protocol, not outcome; good pending evidence treatment | Keep pending label; record consent, recruitment, build, task order, actual observations and limits when run; don't close with an automated dry-run |
| `docs/research/PHASE6_UX_HARDENING.md` | Honest dry-run qualification added, but stale current count/selector contract | Date 146/32 inventory; tie combobox labels and three dry-runs to earlier UI; change “Verified & Hardened” to scoped workflow verification where needed |
| `docs/research/phase6-artist-evaluation.md` | Good counterbalancing/baseline/subjective-evidence separation | Keep; update current entry labels/eligible artwork and results only from real participant sessions; no numeric benefit claim yet |
| `docs/research/pixitools-baseline-study.md` | Good no-participant-yet protocol | Keep; add actual recruitment/run status when available; link current first-time task paths without coaching the study |
| `docs/research/session-ui-ux-2026-10-01.md` | Detailed correction sequence with scoped evidence | Keep dated narrative and failures; make final superseding state/commit easy to find; move lasting workflow contracts into canonical guides |
| `docs/research/specular-glint-2026-10-01.md` | Strong honest stylized-rendering, fixture and visibility evidence | Keep; centralize final constants/current renderer links; preserve initial visibility failure and exact scope; no arbitrary-sprite/physical-quality guarantee |
| `docs/research/palette-creator-2026-10-01.md` | Clear metadata-only scan, summary and indexed-export limits | Keep; replace “publication requested” floating status with published commit reference; link as implementation evidence from stable palette guide |
| `docs/research/palette-cycle-scope-2026-10-01.md` | Clear off-range byte preservation and shared-color limits | Keep; clarify CPU versus indexed shader paths in canonical feature matrix; preserve focused-run scope |
| `docs/research/palette-cycle-export-2026-10-01.md` | Strong APNG exact/GIF rounded timing and scope distinctions | Keep; retain ordinary timeline versus Cycle Loop distinction; use as format evidence, not global frame-scheduling promise |
| `docs/research/gif-8x-corruption-2026-10-01.md` | Strong reproduced cause and decoded native-pixel correction | Keep failure/decoder evidence and re-export guidance; do not rewrite it as proof of every GIF viewer/input |
| `docs/research/session-completion-2026-10-01.md` | Best high-level honesty: delivered subsets, pending studies, no deployment | Keep dated record; clarify “all 50 / 49 publishable” census versus tracked/published files; use commit-based publication evidence; avoid becoming a constantly rewritten global current status |
| `docs/research/evidence/2026-09-30/README.md` | Valuable artifact registry and careful bad-probe meaning | Keep; date stale live 146/32 intro; preserve Node 26 original run caveat and later Node 22 correction; distinguish 32/33+rerun from one clean 33/33 run |
| `docs/research/evidence/2026-10-01/README.md` | Useful chronological artifacts, several competing “latest” counts | Date each checkpoint; single canonical current link; preserve failure/superseding logs and fixture scope; no full-inventory run implied by focused downloads |

### Separate checkout: all 26 Markdown copies

All 26 copies differ in hash from their main-checkout counterpart. Their older revision predates current session material; the differences are expected repository history, not 26 independent active-document defects. Each copied path below is under `.kilo/worktrees/quirky-library/`.

| Copy | Disposition |
| --- | --- |
| `AGENTS.md` | Keep with that checkout; preserve generated Next.js rules; never use its absent current-session footer as current status |
| `README.md` | Old-revision reference; do not publish as the main README |
| `MAIN.md` | Old product scope; compare only at its own commit |
| `ARCHITECTURE.md` | Old architecture; current fixes must target the main file |
| `DESIGN.md` | Old design specification; current glint behavior is in main revision |
| `BENCHMARKS.md` | Old inventories/timings; retain as revision-specific history |
| `CONTRIBUTING.md` | Old workflow; use current root guide for this audit |
| `SECURITY.md` | Old threat/privacy text; don't merge without reconciliation |
| `SKILL.md` | Old operational contract; can steer an agent working there differently; synchronize deliberately if that checkout resumes |
| `TASKS.md` | Old backlog/history; not a second current tracker |
| `LOGS.md` | Old development log; no current-publication inference |
| `CHANGELOG.md` | Old release history; not deployed freshness evidence |
| `FullStackGuide.md` | Same generic-guide concerns; archive/reference scope |
| `V2_VISION.md` | Older proposal; correct main scientific examples first |
| `PIXIBUN_DEEP_DIVE.md` | Older reference with additional drift; do not bulk-copy into main |
| `PIXIBUN_AUDIT_RESULTS.md` | Older audit snapshot; retain only at its revision |
| `PIXIBUN_AUDIT_RESULTS+DEEP.md` | Older finding state; use audit IDs and revision mapping |
| `docs/plans/README.md` | Old plan index; not active plan authority |
| `docs/plans/implementation_plan.md` | Historical plan copy |
| `docs/plans/implementation_plan_v2.md` | Historical landing plan copy |
| `docs/plans/audit_remediation_plan.md` | Historical remediation proposal copy |
| `docs/plans/audit_remediation_walkthrough.md` | Historical verification narrative copy |
| `docs/plans/audit-remediation-2026-09-26.md` | Earlier checklist state |
| `docs/plans/research_grounded_product_roadmap.md` | Earlier proposal state |
| `.agents/skills/testsprite-onboard/SKILL.md` | Older installed instructions; don't overwrite main vendor skills by copying |
| `.agents/skills/testsprite-verify/SKILL.md` | Older installed instructions; refresh deliberately if work resumes there |

Do not recursively delete this checkout as “duplicate documentation.” It contains a complete older working environment and may have separate ownership. Worktree cleanup is a separate request, using its actual Git/worktree lifecycle.

### Generated report

`testsprite_tests/tmp/raw_report.md` reports one passed studio-entry test on 9 September 2026. Keep it as a local dated artifact if useful; archive/remove through normal artifact-retention policy if no longer needed. Do not promote its one-of-one 100% to a current testing claim. The test's external dashboard was not re-executed or independently fetched here.

## What the Markdown is missing

These are proposed canonical additions, not claims that every detail is absent from every historical record. Much of the necessary information exists, but is scattered and contradictory.

| Proposed document/section | Required content | Source of truth |
| --- | --- | --- |
| `docs/README.md` | Current docs map, audience, owner, status labels, canonical versus dated evidence, supersession policy | The per-file classification above |
| `docs/current-status.md` plus generated inventory | Commit/package/build identity; implemented/partial/deferred/evaluation statuses; discovered inventory versus actual runs; published versus deployed | Git, package, runners and immutable evidence manifests |
| User guide: artwork safety and backup | Local saves, debounce/close risks, two-tab conflicts, portable backup, raw recovery ZIP, browser eviction, recovery copy limits | Autosave, storage, recovery and native workflow tests |
| Export capability matrix | Actual encoder, transparency, palette limit, native dimensions/padding, pose order/holds, looping, active-frame/clip scope, browser support, verified engines | Animation model, encoder paths and actual decoder/engine tests |
| Stable project/storage contract | Format v3 versus Dexie version; logical Blob/physical binary records; optional metadata compatibility; normal-map convention; schema ceilings; migrations and rollback | Types, schema, db/decode/serialize/research recipes |
| Rendering/research contract | Source pixels versus provenance/recipes; shader coordinate conventions; glints versus legacy lighting; summary versus conversion; source freshness, Apply/Cancel/Undo | Actual renderers and worker/publication lifecycle |
| Operator/deployment guide | Next server requirements, request nonces, trusted proxy, relay configuration, cache version, warming/update, rollback and deployed-build identification | Local Next docs, routes, proxy, build config and operation suite |
| Testing/evidence guide | Local/CI matrix, coverage scope, development handles, production independence, test plans versus verdicts, repeated-run/failed-run policy | Config/scripts and retained manifests |
| Active issue/research registry | Audit ID→fix/test/evidence; pending participant/device/collaboration qualification; dated assumptions and scientific verification questions | Existing reports without rewriting their past |
| Learning contract | Throwaway sample isolation, Exit/refresh restoration, visited/skipped/verified progress, accepted measurement and consent | Existing Learn-by-Making plan and onboarding/Playground source |

A useful feature matrix should have **feature → actual UI entry → source boundary → test/evidence → limits → doc owner**, not a marketing checkbox. A code-to-doc relationship is often many-to-one. “1:1” should mean every shipped user-visible contract is accurately represented and every current claim has a source/evidence path, not one Markdown paragraph per private helper.

## What to delete, what to archive, and what to retain

**Delete from present-tense descriptions:** the Audio Engine row, Rivet shortcut obligation, wrong pan/Undo gestures, unsupported zero-GC/zero-telemetry/guaranteed-FPS/blank-to-final-replay/WebM-alpha promises, wrong algorithm/paper details, misleading current counters, duplicate checkpoint blocks, and unused TOC targets. Replace substantive claims with the actual contract where appropriate.

**Archive or clearly scope:** older audit reports, retired landing/audio plans, resolved remediation plans, generic FullStackGuide requirements unrelated to PixiBun, old TestSprite plans, and v2 design examples. Keep the future vision as a proposal with correct mathematics and evidence labels. Archive is a discoverability/status operation, not evidence erasure.

**Retain:** original passing and failing logs, the original release decision, reproduced before-fix defects, native pixel/decoder comparisons, source hashes, compatibility caveats, negative study results when collected, and explicit unverified questions. In particular, keep the GIF dictionary-reset failures and correction proof, real Godot evidence with its exact version/backend/tolerance, and study protocols' pending rows.

**Do not delete solely for count reduction:** old worktrees, transcripts, local specs, compatibility recipe paths, legacy file readers, internal tile helpers, or dormant algorithms. Determine ownership, compatibility, actual reachability, and user need first. A bulk Markdown sweep should never silently remove operating instructions or change historical evidence.

## Recommended correction order and acceptance criteria

1. **Correct high-risk current text and validation contracts:** README audio/privacy; SKILL shortcuts; architecture storage/conflicts/pool/deployment; deep dive encoder/replay/lens/algorithm errors; seven stale editor-test locators; historical capture destinations. Acceptance: every affected sentence has a source path and accurately scoped behavior; the tracked full editor suite passes; routine tests do not change archived evidence; no retired feature is reintroduced just to satisfy documentation.
2. **Correct research material:** v2 SIMD lookup, four-versus-128 pixels, tree citation, JFA approximation, incomplete snippets and unmeasured numbers. Acceptance: primary source checked, executable examples tested if advertised as executable, projections labeled with assumptions.
3. **Create canonical contracts:** docs index/current-status, export matrix, persistence/backup and operator guides. Acceptance: a newcomer can answer which build is deployed, what a save preserves, which export preserves alpha/timing, and how to recover a conflict without reading a session transcript.
4. **Reconcile per-file status:** dated counts, publication errata, old selectors, resolved audit-ID registry, localized participant/conformance scope. Acceptance: historical runs stay historical and no document has competing unlabeled “current” inventories.
5. **Improve verification and code where warranted:** all-document links/anchors and generated inventory; truthful checker messages; globally bounded pool; strict persisted diagnostic booleans; portable non-destructive hook installation; decide coverage enforcement. Acceptance: targeted boundary tests plus meaningful native/working-environment checks; no test added merely to mirror prose.
6. **Qualify what is still unknown:** artist sessions, real collaboration, low-memory/long-session behavior, physical pen and assistive technologies, current end-to-end latency, additional engines and actual release update/rollback. Acceptance: dated artifacts with build/hardware/participant scope. Until then, preserve “pending/unverified,” rather than upgrading it to “proved.”

The fresh passing gate and production scenarios show that documentation repair should be grounded in a working application. They do not justify retaining contradictory prose. The repository needs fewer competing current summaries and more explicit contracts, with the excellent recent evidence preserved.

## Subsequent remediation and audit erratum

This report preserves the pre-fix assessment. The [remediation record](2026-10-02-audit-remediation.md) and [finding registry](issue-registry.md) describe later corrections. D35’s publishability inference was too broad: .env.example was already tracked at the base revision despite the broad ignore rule. The later patch refreshes its safe content and adds an explicit ignore exception; it does not claim to create an absent template.
