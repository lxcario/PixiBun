# PixiBun — v2 Architecture & Strategic Vision

Planning status — 13 October 2026: the [current status](docs/current-status.md) records completed engineering validation and open release checks. Proposals below retain their own scope.

Near-term work uses the existing engine and test infrastructure: Nibbli Tester, bounded Artist planning and Hands edits are now repository tooling, with plans/critique supplied by the conversation or local mocks. Provider-neutral adapters do not require a model API key for those workflows. Prioritize M3 playback stability, reliable M4 editing and later M5 creative motion planning under the [Nibbli milestone plan](docs/plans/nibbli.md). This progress does not implement WebGPU, WASM SIMD, a tree CRDT, native packaging, model training or an independently running model service. Those infrastructure proposals still need a measured workload and their own acceptance evidence.

**Proposal, reconciled 2 October 2026.** None of the GPU/SIMD/tree-CRDT/wide-gamut/native/neural systems below is established as shipped by this document. Current TypeScript/browser functionality is described in [architecture](ARCHITECTURE.md), [current status](docs/current-status.md) and [the export contract](docs/contracts/exports.md). Historical benchmark numbers without reproducible artifacts were removed from future acceptance claims.

## 1. Executive Summary & North Star

The goal is to support workloads that exceed the present bounded sprite workflows while preserving authored pixels, reversible operations, local ownership and clear source/result provenance. Build v2 only after profiling an actual limitation and testing a smaller improvement. GPU availability, transfer overhead, numerical differences and native packaging all add compatibility work.

Sub-16 ms interaction, small packages and bounded paging latency are design targets, not measured results. No throughput, 4K composition time, zero-frame-drop, installer-size, startup/RAM, SSD latency or neural-inference promise is established. Measure hardware, browser/driver, build, inputs, warm/cold state and p50/p95/max before publishing numbers.

## 2. Pillar 1: WebGPU Compute Shaders (WGSL) for 2D Grid Algorithms

### 2.1 Jump Flooding Algorithm (JFA) vs. CPU Felzenszwalb EDT

JFA propagates candidate nearest seeds through decreasing jump sizes. It is an **approximate** distance/Voronoi method. Extra-pass variants reduce error; they do not establish exact full-domain Euclidean parity. Compare against the exact CPU transform on adversarial thin/disconnected/boundary inputs before adopting it for pixel-sensitive decisions. [Authors' research page](https://www.comp.nus.edu.sg/~tants/jfa.html).

For an N×N grid, O(log N) refers to full-grid passes; total work is O(N² log N), with per-pass neighborhood reads and full-grid memory traffic. CPU EDT has O(N²) work in this notation. Actual latency includes texture upload/download, synchronization, compilation and compositing. A particular resolution does not alone prove GPU acceleration is necessary.

### 2.2 WGSL Compute Pipeline & Workgroup Shared Memory Tiling

A future implementation needs ping-pong storage, bounds checks, explicit seeds/sentinels, texture formats, workgroup limits and cancellation/publication ownership. Shared-memory tiling helps only when halo reads, synchronization and occupancy justify it. No WGSL snippet is provided as compiled/tested shipping code here.

### 2.3 Sobel Tangent Normal & Specular Lighting in WGSL

Match the current renderer's normal conventions, transfer functions, ink/alpha protection and quantized ramps before measuring acceleration. Lighting is a stylized artist tool; GPU math is not evidence of physically correct reconstruction. Test CPU/GPU fixture differences and define acceptable tolerance per operation.

### 2.4 Texture Compositing Architecture

Keeping intermediate textures on the GPU may avoid some CPU readbacks. Import, export, storage and history still need explicit transfer/lifetime policies. No universal zero-copy claim follows from a texture pipeline.

## 3. Pillar 2: WebAssembly 128-bit SIMD for Hot-Path 2D Pixel Operations

### 3.1 W3C WASM SIMD Specification Overview

A v128 value holds 16 bytes. Lane operations, scalar fallback, alignment, tails, traps and feature detection must be tested. Instruction availability does not establish a single CPU cycle or a specific end-to-end throughput. [WebAssembly execution specification](https://webassembly.github.io/spec/core/exec/instructions.html).

### 3.2 4-Way Parallel Scanline Flood Fill Bitmask Evaluation

An RGBA i32x4 equality compares **four pixels**, not 128 pixels. A separate 128-bit occupancy mask can represent 128 binary flags; producing those flags from RGBA requires additional work. Flood-fill connectivity, queueing, boundaries and tails remain part of the algorithm. Benchmark full fills, not only equality instructions.

### 3.3 16-Byte Palette Lookup via `i8x16_swizzle`

Swizzle selects one of **16 byte lanes**. Indices outside 0–15 yield zero. It cannot gather any of 256 palette entries from one vector; RGBA colors span multiple bytes. A normalized 0–15 index stream can use separate channel tables, but 256-register artwork needs a correct multi-bank/scalar/table strategy and transparency identity rules. This is a semantic design example, not a compiled implementation or single-cycle guarantee.

### 3.4 Vectorized Alpha Compositing (Porter-Duff Over)

Specify straight versus premultiplied alpha, channel widening, rounding, division, zero-alpha cases and saturation. Test against the canvas/reference contract on all boundary values and odd lengths. Incomplete pseudocode with omitted outputs is not an executable sample; no runnable Rust compositing implementation is claimed.

## 4. Pillar 3: Distributed Tree CRDTs for Multi-User Hierarchies

### 4.1 The Concurrent Tree Move Anomaly in Layer Stacks

Concurrent reparent/reorder can create cycles or disagree on ancestry. The present host/guest application intentionally gives the host structure authority; pixel LWW tests do not implement a multi-user move-tree CRDT.

### 4.2 Kleppmann-Beresford Cycle-Free Tree Move State Machine

The research reference is **Martin Kleppmann, Dominic P. Mulligan, Victor B. F. Gomes and Alastair R. Beresford, A highly-available move operation for replicated trees**, IEEE TPDS **33(7):1711–1724**, DOI **10.1109/TPDS.2021.3118603**. [Author publication record](https://martin.kleppmann.com/2021/10/07/crdt-tree-move-operation.html).

Adoption needs operation identity/order, ancestry/cycle policy, retained log, undo/replay, deletion and causality rules, integration with raster ownership/history/autosave and adversarial network tests. The paper's proof is not formal verification of repository code or its future integration.

### 4.3 1D Frame Sequence CRDT & Tombstone Compaction Horizons

Sequence order, clips and frame holds must converge with layer structure. Tombstone collection requires a defined acknowledgement/causal horizon, reconnect policy and offline-peer handling. No arbitrary-session constant memory claim is made.

## 5. Pillar 4: Wide Color Gamut (Display-P3) & CSS Color Level 4

### 5.1 Colorimetric Depth: Display-P3 vs. sRGB in Pixel Art

P3 offers different primaries/gamut; the relevant area comparison is not a volume ratio or a universal benefit to a finite authored palette. Current authored raster/export contracts are not a shipped end-to-end P3 pipeline. Preserve explicit color-space/profile identity and test gamut clipping.

### 5.2 HTML5 Canvas `colorSpace: 'display-p3'` Pipeline

Qualify browser feature detection, actual backing formats, blending, image decoding, offscreen surfaces and consumer output. P3 requests alone do not prove end-to-end color correctness or monitor reproduction.

### 5.3 Color Gamut Transformation Mathematics in OKLCH

Separate perceptual edits from gamut mapping. Define intent, transfer functions, out-of-gamut policy, alpha and intermediate precision before converting. Test known vectors plus round trips against an independent reference.

### 5.4 Binary Chunk Encoder (`iCCP`, `cHRM`, `gAMA`) & ISO Standards

PNG/APNG profile/chunk rules and consumer support require primary-spec review at implementation time. Do not treat a proposed chunk list as a conformant encoder. Keep current verified sRGB/alpha/timing behavior until a profile-aware format/version is qualified.

## 6. Pillar 5: Desktop DCC Native Packaging with Tauri 2.0

### 6.1 Tauri 2.0 Architecture & Multi-Platform Runtime (WRY/TAO)

No Tauri package is present or measured. A proposal must include OS/webview versions, permissions, updater/signing, sandbox, install/uninstall, crash recovery and browser parity. Installer/startup/RAM sizes are unknown until an artifact is built.

### 6.2 Binary IPC Buffer Streaming

Binary IPC can reduce serialization compared with JSON/base64 but does not guarantee zero copies across native/webview boundaries. Verify framing, backpressure, ownership, cancellation and privileged command admission. No Rust snippet is a tested native IPC interface.

### 6.3 OS File Associations, Named Pipe Handover & Crash Resilience

Qualify untrusted file admission and existing local project restoration before adding native association/single-instance handover. Desktop filesystem access does not justify silently replacing unsaved artwork.

### 6.4 Virtual Memory-Mapped Undo Paging (`memmap2`)

Paging can bound a designed resident cache; RAM is not constant regardless of depth because indexes, metadata, page cache and active snapshots still exist. Undo states are not automatically in CPU L1 cache. SSD latency depends on I/O, compression and workload; no sub-3ms guarantee is established. Define disk budgets, eviction, durability and recovery before implementation.

## 7. Pillar 6: On-Device Local Neural Pixel Art Inference

### 7.1 WebNN (DirectML/CoreML) vs. ONNX Runtime Web (`ort-web`)

These are candidate technologies, not dependencies or shipped inference. Compare current supported versions at implementation time and keep deterministic local fallback behavior explicit. Accelerator availability, model loading, working sets and offline distribution need qualification.

### 7.2 FSRCNN-Pixel INT8 Quantized Architecture

FSRCNN-Pixel is a proposed model concept. No model artifact, training/data/license definition, measured inference or quality study is established. Before adoption, define dataset permissions, provenance, quantization validation, alpha/palette/silhouette preservation and artist control. Do not infer a neural model from the current deterministic pixel tools.

## 8. Phased Implementation Roadmap (Milestones A–E)

| Gate | Required evidence before proceeding |
| --- | --- |
| A: GPU compute | Reproducible current bottleneck, exact/approximate contract and CPU fallback; adversarial parity/error tests and end-to-end measurements |
| B: SIMD | Correct lane/register/alpha semantics, compiled scalar/SIMD parity, browser feature detection and full-workflow benchmark |
| C: Tree collaboration | Defined causal/structure/metadata policy and integration tests plus real multi-machine/reconnect/concurrent-edit evaluation |
| D: P3 | Profile-aware storage/export, primary-spec conformance, browser/consumer/monitor matrix and independent color vectors |
| E: Native | Signed runnable packages, permission/security review, migration/update/rollback and recovery qualification on each OS |

Neural inference remains a separate decision gate after an attributable model and quality/safety evidence exist. Dates are planning choices; no elapsed calendar date proves milestone delivery.

## 9. Strategic Engineering Assessment: Is Developing v2 Necessary Right Now?

Prioritize actual user tasks, robust backups, current bounded workloads and missing artist/device qualification before replacing the engine. The present code has substantial local test evidence and explicit limits; neither its tests nor these proposals constitute full mathematical verification. Choose a pillar only when measured benefit exceeds implementation/compatibility cost. [Active issue and research registry](docs/research/issue-registry.md), [historical benchmarks](BENCHMARKS.md).

## 10. Relationship to the local PixiMotion proposal

`PIXIMOTION_ENGINE_MASTER_SPEC.md` is an ignored local research/design document, not a published engine, committed deliverable or approved v2 milestone. It is intentionally separate from the six infrastructure proposals above. Automatic rigging and secondary-motion ideas need their own small artist workflow, ownership/license review, reproducible prototype and correction-time comparison before roadmap promotion. Its presence does not promise v2/v3 delivery. Current frame tools remain documented in [current status](docs/current-status.md) and [rendering](docs/contracts/rendering.md).

As of 8 October, the local checkout implements a bounded one-rigid-part pose/preview/bake workflow and saved format-v4 rig definitions. This is progress toward PixiMotion, without requiring or completing any of the six v2 pillars. [Current subset and open work](docs/current-status.md), including later parameter Undo, worker/cancellation and rectangle rendering.
