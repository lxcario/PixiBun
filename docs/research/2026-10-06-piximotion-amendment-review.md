# PixiMotion amendment review — 6 October 2026

This is dated research and design advice, not an implementation contract or an executed engine test. The user requested a deep web review of the supplied improvement plan against the existing master specification. No engine code or master-spec content was changed during this review.

## Verdict and scope

**Yes, the supplied audit addresses this checkout's `PIXIMOTION_ENGINE_MASTER_SPEC.md`. Some amendments are necessary before production, but adopting the entire plan would introduce unnecessary work and several questionable constraints. Keep the core architecture; improve the delivery plan, integration boundaries and evidence. Prototype the proposed rendering methods before committing to them.**

The section references match the local specification: analytic IK in §9.2, raster rules in §16, temporal processing in §19, determinism in §§35/72, learned recognition in §48 and the 24-phase roadmap in §75. The master document explicitly describes an ignored local proposal, not a delivered PixiMotion engine. The current project schema has no live motion/rig block. Existing rotation, lighting, timeline and animation-review features are useful foundations, not evidence that the proposed engine is implemented.

Reviewed checkout: `dcf9f5c303cdbaa6a533e3315de947c261c1e3ac`.

Reviewed input fingerprints (SHA-256):

- Master specification: `B19443F65CD93765B88753437FD63B3DB4C1BFDD0E14781BE8796E7D37BC307C`.
- Pasted improvement plan: `90FE1FB7C8B2135BF1E20E2C082EFD859C0DEF009E2F243CBD90EE9C621E0C4E`.

Primary web sources were checked on 6 October 2026. “Verified” below refers to a specific source claim; it does not certify an entire paper, dataset license or algorithm. Proposed thresholds and engineering decisions remain recommendations. No renderer benchmarks, lab reproduction or browser-determinism tests were run.

## Decision on the audit's ten principal changes

| Audit proposal | Decision | What to adopt |
| --- | --- | --- |
| Replace determinism strategy | **Necessary clarification; narrower implementation** | Define canonical output and supported environments; control implementation-dependent math; test the actual pipeline. A complete handwritten math library is not automatically the first task. |
| Vertical slices and numeric gates | **Adopt** | Bring posing, keys, bake, pixel repair, save/reopen and export together early. Define testable invariants now and calibrate quality/performance thresholds. |
| Layers-as-parts for V1 | **Adopt as the easiest input path** | Map authored layers to independent rig regions. Preserve manual masks/selections for flattened artwork; do not make splitting every asset mandatory. |
| Resolve telemetry contradiction | **Rewrite the finding** | Define how rig-quality evidence is obtained and shared. The current product already permits local diagnostics and opt-in relay; an entire correction-ledger UI is optional. |
| Replace hysteresis with windowed optimization | **Experiment** | Short-window optimization already exists in §19.4. Compare specific algorithms, including lag and protected-feature fidelity, before promoting one. |
| Outline-aware rasterization | **Adopt feature preservation; experiment with regeneration** | Track artist-defined ink and internal details. Regenerating every outline from a silhouette must be optional and style-specific. |
| Lighting integration | **Adopt with a precise scope** | Transform source artwork and normals coherently; evaluate separate lighting after deformation; define strict-palette behavior and cache dependencies. |
| Spring bones before cloth | **Reasonable sequencing, not mandatory architecture** | Start with one simple secondary-motion solver. The existing PBD chain proposal is also defensible; avoid implementing three successive solvers without evidence. |
| License allowlist / clean-room rule | **Strengthen provenance; retain explicit review** | Do not port incompatible source. Record exact component/version/license and obligations. The current rule already permits deliberately reviewed exceptions. |
| Competitor positioning | **Useful, lower priority** | Compare workflows and demonstrate local editable output. Competitor existence does not establish PixiMotion's quality or uniqueness. |

## Findings that change the interpretation of the audit

### 1. Determinism is a real gap, but JavaScript is not inherently disqualified

The spec's quantization and fixed stepping do not establish bit-identical results across browsers. ECMAScript permits implementation-approximated trigonometric functions, and Rapier explicitly warns that using them to initialize its deterministic simulation can invalidate that guarantee. This supports tightening the export contract, not predicting that every existing export will differ. The 2026 standard specifies rounded `Math.sqrt`; it should not be treated identically to `sin`/`cos`. [ECMAScript 2026 math](https://tc39.es/ecma262/2026/multipage/numbers-and-dates.html#sec-math.sqrt), [Rapier determinism](https://rapier.rs/docs/user_guides/javascript/determinism/).

Stable sort is also specified; equal-key sorting is not inherently nondeterministic. Canonical input order and a consistent comparator still matter. [ECMAScript sorting requirements](https://tc39.es/ecma262/2026/multipage/indexed-collections.html#sec-array.prototype.sort).

**Recommended amendment:** define the bytes to hash: dimensions, palette ordering, raw indexed frames, durations and other relevant metadata. Browser PNG/GIF encodings are a separate contract. Define reset/initial state, rounding, iteration order, palette ties, engine version and temporal history. Then implement only the deterministic numerical functions actually needed in the canonical path. A checked-in lookup table or bounded approximation may suffice. Lookup tables generated independently with browser trigonometry would reintroduce the problem.

The test matrix should include Chromium, Firefox and WebKit with their versions recorded, plus representative processors/operating systems. Node and Chromium both use V8, so four runners are not four independent JavaScript engine families. Golden fixtures are regression evidence, not a proof over every possible input; add boundary and property checks.

WASM is already allowed by spec §3.1. It can support this design, but compilation alone is not a guarantee: WebAssembly specifies some nondeterministic numeric outcomes, and host inputs still matter. [WebAssembly numerical semantics](https://webassembly.github.io/spec/core/exec/numerics.html).

The audit's unnamed public repository with a math-ban CI rule has no supplied URL. That anecdote is unverified and unnecessary to justify the contract change.

### 2. The alleged telemetry prohibition is stale

The current [security policy](../../SECURITY.md) says local diagnostics are enabled by default, transmission requires opt-in, and co-draw/loading the app use the network. [Diagnostic capture](../../src/lib/diagnostics/capture.ts) initializes `enabled: true, relayOptIn: false` and rechecks consent before relaying. The earlier zero-telemetry wording was already identified in the [2 October audit](2026-10-02-documentation-codebase-audit.md).

Rig corrections may contain artwork-specific information and are not covered merely because crash diagnostics exist. Define them separately. Replace §48's vague “editor telemetry” with authored benchmarks, consented artist studies and, if needed, explicitly user-exported correction reports. §48.2 already conditions user examples on a future data policy. Metrics such as correction time can be measured in a supervised study without collecting general product usage.

**Necessary:** remove ambiguity about data use. **Optional:** an IndexedDB correction ledger, a rig-quality panel and new export UI. There is no reason to make those features prerequisites for the first renderer or for research using owned fixtures.

### 3. Several proposed additions already exist in the master spec

| Audit wording | Existing material | Actual gap |
| --- | --- | --- |
| Stronger temporal optimization is absent | §19.4 explicitly proposes short-window optimization; §75 phase 21 plans an advanced temporal rasterizer | Algorithm selection, measured benefit and cost |
| Outlines are never mentioned | §7.2 includes outline clusters; §§19.2/67 include contour thickness/stability; §21 includes outline repair | Explicit artist-controlled ink/features and evaluation |
| Pixel timing techniques are missing | §22.1 makes Step/Hold first-class; §23 includes timing, squash/stretch and follow-through | Concrete interaction and data mapping, plus optional smear tools |
| “No third-party code” is absolute | §3.2 already permits a specific use after deliberate licensing review | Versioned provenance and clearer restrictions |
| Palette invariants prevent optional modes | §16.1 explicitly starts with “By default” | Define any optional mode without weakening strict output |

The audit usefully makes some ideas concrete, but should not present every refinement as a newly discovered omission.

### 4. The delivery-order criticism is sound

The executive summary prioritizes animation controls early, but §75 schedules the full timeline at phase 8, after deformation and two renderer phases. That delays an end-to-end artist workflow. It does not prove a duration of “months”; the audit supplies no implementation estimates.

**Recommended first usable slice:** create one rigid part from a layer or mask; set a pivot; author two or more poses with holds; preview; bake to ordinary cels; repair a baked pixel; undo; save/reopen; export using existing tools. This validates the real value before general meshes, cloth, semantic recognition or motion libraries.

Layers and pivots are an established workflow: PixelOver's own tutorial splits artwork, fills hidden areas, parents images to bones, keys poses and exports sprites. Pixelmash's release notes explicitly describe rigged characters using custom pivots and parented layers. These validate the interaction pattern, not low-resolution feature fidelity. [PixelOver tutorial](https://docs.pixelover.io/tutorials/bones_animation/), [Pixelmash release notes](https://nevercenter.com/pixelmash/release_notes/).

Use **regions** as the internal abstraction, with layers as one input. A single layer may contain several regions; one region may require a hidden plate. “One layer equals one part” is a convenient default, not a universal representation.

### 5. Viterbi is a plausible experiment with important limitations

Independent per-pixel dynamic programming optimizes independent temporal choices. Connectivity, outline continuity and feature ownership depend on neighboring pixels, so adding “topology penalties” does not make that independent optimization solve the joint problem. A later local cleanup pass can also remove legitimate one-pixel details or undo temporal choices. This is an analysis of the proposed objective, not a claim that the method cannot help.

The candidate set must include transparency and appropriate persistent feature/source identities. A screen-coordinate pixel may change because an eye moves through it; holding its old color can create a ghost. Overlap windows and test boundaries, but also define what happens when scrubbing backwards, exporting a clip subset, starting from a checkpoint or changing window size. Otherwise output can depend on viewing history despite deterministic arithmetic.

Keep hysteresis as a baseline. Compare it with feature-aware optimization, angle variants and the proposed DP. Do not require an 8-frame window in V1. The “under a million operations” claim depends on candidate count: `64×64×8×C²` is 524,288 transitions for C=4 and 2,097,152 for C=8, before other costs.

### 6. Outline regeneration should not be a global rule

Selective outlines, colored internal seams, intentional gaps, highlights and one-pixel facial details cannot be reconstructed from an outer silhouette alone. A uniform one-pixel contour can change the style even if the geometry becomes tidier. Stroke rendering is appropriate for genuinely stroke-like tails or ribbons; it is not an adequate representation for every textured ear.

**Research missing from both documents:** Kuo, Yang and Chu's *Feature-Aware Pixel Art Animation* (Computer Graphics Forum, 2016) explicitly combines keyframes/deformation with joint optimization of feature lines for spatial quality and temporal coherence. That is more directly relevant to this problem than general meshing papers. [Authors' project page](https://cgv.cs.nthu.edu.tw/projects/Recreational_Graphics/PixelLineAnim), [University of Bath publication record](https://researchportal.bath.ac.uk/en/publications/feature-aware-pixel-art-animation/).

This establishes prior research for preserving feature structures over time. It does not validate the audit's per-pixel Viterbi or universal outline regeneration. The project page and publication metadata were accessible; full-manuscript download attempts failed, so detailed optimizer equations were not independently reviewed here.

### 7. Secondary motion is useful; two bake cycles are not a guarantee

Spine documents per-bone physics and an independent update rate. Live2D documents baking physics to keys and evaluating two animation rounds. These support controllable secondary motion and warm-up as product techniques. They do not prove that PixiMotion needs an angular-spring solver before its planned chain solver, or that two cycles always yield a seamless loop. [Spine physics](https://esotericsoftware.com/spine-physics-constraints), [Live2D bake](https://docs.live2d.com/en/cubism-editor-manual/physics-operation-bake/).

Choose one simple solver after testing ears/tails. For loops, compare simulation state at the same phase across cycles, including velocity. Use bounded warm-up with a convergence criterion and a visible failure state. Slowly damped motion may need more than two cycles; non-periodic seeded events need explicit loop behavior. Compare the final-to-first transition with normal frame transitions without forcing duplicate endpoint frames.

XPBD remains a credible later option. Its primary paper addresses timestep/iteration-dependent stiffness in conventional PBD, and confirms the spec's DOI `10.1145/2994258.2994272`. It does not promise perfect collisions after four iterations. [XPBD paper](https://matthias-research.github.io/pages/publications/XPBD.pdf).

### 8. Integration requires more than a `motion` property

The audit correctly identifies missing connections to existing save/history/export behavior. Important local constraints are:

- [Portable format](../../src/types/project.ts) is version 3; [storage](../contracts/storage.md) separately documents Dexie schema version 5. Browser blob persistence and portable file representation differ. A motion field must participate in validation, serialization, hydration, autosave, recovery and compatibility; adding a TypeScript field alone is insufficient.
- [Rendering contract](../contracts/rendering.md) explicitly says persistent layer tracks are not implemented. Safe batch operations match uniquely named counterparts, not a stable animation track. Rig part IDs must survive layer renames, frame duplication, reorder and source edits; layer names cannot be their identity.
- History has byte and step budgets. Parameter edits can be small, but destructive layer splits and raster overrides legitimately need raster undo state. “No raster buffer in history” cannot be a blanket invariant for the complete workflow.
- Worker memory admission, cancellation and stale-result ownership need actual implementation. A worker can still allocate too much memory or indirectly stall the UI; “never exhaust memory” is not supplied by using a worker.

Separate lighting after deformation is sensible for a **separate generated light effect**. Do not automatically remove an artist's painted shading or assume the original unlit colors can be recovered. Transform painted normal maps with their parts and define normal conventions.

The current [photometric event handler](../../src/hooks/viewport/events/usePhotometricEvents.ts) already refreshes some analysis during azimuth changes and recomputes character/appendage analysis on commit. Historical cache bugs motivate freshness checks; they do not establish that the current bug remains. Cache dependencies include source/normal revisions, parameters and algorithm version, rather than only geometry hash and azimuth.

The [rendering contract](../contracts/rendering.md) permits fractional-alpha artwork, and lighting can change colors. Therefore decide whether PixiMotion's strict invariants apply to the motion stage or also to final lit export. For strict final export, lighting needs explicit palette-constrained output. The audit misses this interaction.

### 9. License provenance matters, but the proposed replacement policy is unnecessary

Aseprite's current EULA restricts source modification to personal purposes or contributions. Its official license-change announcement says the change started **with** v1.1.8, correcting the audit's ambiguous “GPLv2 until v1.1.8” wording. Do not port the current implementation into the MIT PixiBun project under an assumption that a public repository grants permissive rights. [Aseprite EULA](https://github.com/aseprite/aseprite/blob/main/EULA.txt), [official license change](https://blog2.aseprite.org/new-source-code-license/).

cleanEdge is explicitly MIT-licensed. Shewchuk places the robust-predicate C implementation in the public domain, while explicitly distinguishing the separately copyrighted Triangle package. These are component-specific facts, not permission to copy every linked file or dataset. [cleanEdge author](https://torcado.com/blog/cleanEdge/), [Shewchuk software page](https://www.cs.cmu.edu/~quake/robust.html).

Keep the existing deliberate-review rule and add a provenance record for selected code. An approved license family does not remove notice, version, dependency or asset checks. A no-read rule for incompatible source can be a practical development guardrail, but is stricter than merely prohibiting unauthorized copying and is not a universal legal requirement established by the audit.

The audit's unspecified CC0 shader cannot be independently verified without identifying the actual source. A CI condition watching only `package.json` would miss copied code and some dependency changes. Check the relevant source/dependency changes, not just one file.

### 10. Evidence and thresholds need better definitions

The lab numbers were supplied in the pasted audit. No lab URL, source artifact, fixture hashes or executable measurement record was supplied, and no matching lab artifact was located in the checkout or attached visualization directory. The numbers were not reproduced. The stated 4-degree improvement is arithmetically about 84.8% (`1 − 0.16/1.05`), but its measurement validity and generality remain unverified.

Area drift does not measure lag. Fewer A→B→A flips do not establish better animation: a frozen frame scores well on that metric. Detail survival must be measured only when a tagged feature should be visible, accounting for intentional occlusion/blinks and identity. Include motion fidelity, seam quality and artist correction effort.

Accept zero violations for precisely scoped invariants: valid palette indices, finite values, bounded allocation, deterministic fixture output and preservation of unedited source. Calibrate 70% flicker reduction, 95% feature survival, 16 ms previews and 1 s export windows on specified fixtures and hardware; report percentiles and worst cases rather than an unspecified “mid-range laptop.”

Revise unconditional gates:

- **Zero foot slide:** define feasible reachable contacts and permitted contact failure; incompatible joint/contact constraints require an explicit priority.
- **Zero penetration:** specify collider model, tolerance and qualified fixture scope; finite collision iterations do not establish universal perfect cloth collision.
- **Exact fragment count:** constrain requests. With connectivity defined, requested fragments cannot exceed occupied pixels; disconnected source components can also make small counts impossible without policy changes.
- **Unchanged poses after retime:** preserve authored pose data. Velocity-dependent simulation and evaluated interpolation may legitimately change.
- **All rerolled channel outputs unchanged:** preserve other channels' random inputs/authored contributions; coupled constraints can legitimately affect final solved poses.

Human judgment remains necessary. URL-resolution CI cannot confirm that a source supports the claim, and access failures can be temporary. Numeric image gates cannot establish that artists prefer the result. Keep machine evidence and participant evidence distinct.

## Research-reference checks and limits

These entries supplement the claim-specific citations above. They are not an exhaustive certification of the master bibliography.

| Primary source | Checked result and practical relevance |
| --- | --- |
| [Animated Drawings paper](https://arxiv.org/abs/2303.12741) and [official repository](https://github.com/facebookresearch/AnimatedDrawings) | Real published work. Repository explicitly labels code, model weights and Amateur Drawings dataset MIT; ChildlikeSHAPES separately CC-BY 4.0. Repository archived September 2025. Recognition/retargeting reference, not a tiny-pixel quality guarantee. |
| [APES project](https://zhan-xu.github.io/parts/) and [author repository](https://github.com/zhan-xu/APES) | Multi-frame part decomposition reference. Repository publishes code/data links; no explicit repository license was visible in the reviewed root/README. Do not infer reuse permission from public accessibility. Dataset-specific rights remain unresolved. |
| [SpriteToMesh preprint](https://arxiv.org/html/2602.21153v1) | Real February 2026 preprint; supports its hybrid pipeline as a reported experiment. Dataset description explicitly includes pixel art among styles, so the audit's categorical “not pixel art” is inaccurate. Skeleton generation is future work; no validation of 16×16 temporal animation is established. Failed vertex heatmap training is a result for the tested setup, not proof that learned meshing is universally impossible. |
| [Pinocchio, MIT manuscript record](https://dspace.mit.edu/entities/publication/02216671-1424-4552-a2d3-74cec29e2062) | Confirms authors, 2007 publication and generic-skeleton fitting/attachment approach. A 3D architectural reference. |
| [Bounded Biharmonic Weights](https://igl.ethz.ch/projects/bbw/) | Author page confirms 2011 work, bind-time weights and 2D/3D deformation. Useful later; no evidence it is required for the initial rigid-part workflow. |
| [ARAP](https://igl.ethz.ch/projects/ARAP/) | Author page confirms 2007 surface-modeling work. Shape-preservation reference, not proof of pixel fidelity after rasterization. |
| [Depixelizing Pixel Art](https://johanneskopf.de/publications/pixelart/) | Author page confirms 2011 research. Pixel connectivity/vectorization is relevant; vectorization quality is distinct from animation quality. |
| [Distance Transforms of Sampled Functions](https://cs.brown.edu/people/pfelzens/dt/) | Author page confirms title/authors/2012 publication and offers code. Exact downloaded implementation license was not reviewed. |
| [Position Based Dynamics](https://matthias-research.github.io/pages/publications/posBasedDyn.pdf) | Author-hosted paper accessible; supports constrained position simulation. Does not establish PixiMotion performance budgets. |
| [Motion Graphs](https://graphics.cs.wisc.edu/Papers/2002/KGP02/) and [Footskate Cleanup](https://graphics.cs.wisc.edu/Papers/2002/KSG02/) | Institutional primary pages accessible. Reusable motion structure/contact cleanup references, not mandatory V1 mechanisms. |
| [Dead Cells production article](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-) | Original artist-authored article accessible. Confirms fast retakes and acknowledged pixel flicker. No need to rely on the audit's translated account. |
| [Aseprite rotation documentation](https://www.aseprite.org/docs/rotate/) | Confirms pivots, angle snapping and choice between Fast Rotation/RotSprite. Existing PixiBun implementation describes itself as RotSprite-inspired and lacks canonical offset-search/detail-restoration passes; compare that actual baseline. |
| [PixelOver](https://docs.pixelover.io/manual/introduction/), [Pixelmash](https://nevercenter.com/pixelmash/release_notes/), [PixelLab API](https://api.pixellab.ai/v1/docs) | Official sources support the competing bone/keyframe/parented-layer/generated-animation workflows. They do not establish comparative visual quality or rule out deterministic behavior in every generative system. |
| [Quadruped preprint](https://arxiv.org/abs/1404.2053) | Real source; terminology and example gait work are insufficient to qualify PixiMotion quadruped animation. |

FABRIK author-page/PDF requests failed; Zhang–Suen and the spec's Shewchuk conference DOI requests were blocked/failed. This review does not mark those exact citations freshly verified. Animator-book links, Unity/Spine weighting details and other unexamined bibliography entries remain outside this claim-focused review.

## Recommended amendment order

1. Clarify proposal status, canonical output, numerical scope, rig-quality data policy, strict palette/alpha modes, IK conventions and feasible constraint failures.
2. Add an integration contract for stable part IDs, persistence/recovery, small parameter history plus raster ownership, baked cels, timing/clips and lighting/normal composition.
3. Make the first delivery an end-to-end rigid-part workflow; accept layers and manual masks. Keep the existing core architecture and reviewed-license exception rule.
4. Recover a reproducible lab record before relying on its percentages. Add representative assets, single-pixel features, occlusions, clip boundaries and seeking checks.
5. Compare baseline rotation/hysteresis with feature-preserving temporal methods and optional angle variants. Keep Viterbi, outline regeneration and stroke chains experimental until they improve both fidelity and stability.
6. Add one secondary-motion solver and bounded loop qualification; defer cloth, advanced weights, broad auto-rig and learned recognition until there is demonstrated artist benefit.

Splitting the master document may help maintenance later, but replacing the repository's existing documentation map with new generic `MAIN.md`, `ARCHITECTURE.md`, `TASKS.md` and `DESIGN.md` authorities is not required. Keep dated measurements here and stable behavior in the existing contracts. Exposing replay hashes or license details in artist-facing controls is also optional; the important user outcome is that edits, saves, retakes and exports behave predictably.
