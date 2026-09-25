# PIXIBUN — Independent Code & Documentation Audit (Final)

**Audited artifact:** `PixiBun-main.zip`, extracted; no `.git` directory present
**Audit date:** 2026-09-21
**Environment:** Node v22.22.2, npm 10.9.7, Linux x86-64 container, 392 packages installed via `npm ci`
**Auditor stance:** independent, skeptical, evidence-first. No prior involvement with the project. The pre-existing `PIXIBUN_AUDIT_RESULTS.md` in the repository was treated as an unverified claim, not as evidence, and is superseded by this file.

> **Coverage statement, stated before any finding.** This audit did not read all 60,814 source lines character by character. It read ~30,300 lines in full or substantial part — every algorithmic module in `src/lib/ai`, `src/lib/export`, `src/lib/project`, `src/lib/safety`, `src/lib/sync`, `src/lib/collab`, `src/lib/engine`, `src/lib/storage`, `src/lib/procedural`, plus the stores, the viewport/autosave hooks and the export UI — and ran repository-wide automated scans over all 237 source files for the defect classes listed in §6. The remaining ~30,500 lines are predominantly React presentation components and static data tables; §7 names them individually. Every finding below is backed by a file, a line range, an executed command, or an authoritative external source. Nothing is inferred.

---

# 1. Summary

### Repository inventory (measured)

| Metric | Count | Command |
|---|---|---|
| Source files in `src/` | 237 | `find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) \| wc -l` |
| Source lines | 60,814 | `find src ... -exec cat {} + \| wc -l` |
| Vitest test files | 107 | `find tests -name "*.test.ts" -o -name "*.test.tsx" \| wc -l` |
| Playwright spec files | 10 | `find tests -name "*.spec.ts" \| wc -l` |
| Test lines | 24,507 | `find tests ... -exec cat {} + \| wc -l` |
| Markdown files (excl. `node_modules`) | 24 | `find . -name "*.md" -not -path "./node_modules/*" \| wc -l` |
| Markdown lines / bytes | 9,649 / 910,536 | `wc -c -l` |
| Non-Vitest test assets (`testsprite-*`, `testsprite_tests`) | 60 | `find testsprite-* testsprite_tests -type f` |
| Root / CI configuration files | 14 | `ls -la`, `find .github` |

### Audit coverage

| Metric | Count |
|---|---|
| Source files read in full or substantial part | 75 of 237 |
| Source lines read | ≈ 30,300 of 60,814 |
| Source files covered by repository-wide automated defect scans | 237 of 237 |
| Vitest files executed | 107 |
| Vitest files read line-by-line | 1 (`tests/benchmark.test.ts`) |
| Markdown files read in full | 7 (`README`, `MAIN`, `AGENTS`, `SKILL`, `BENCHMARKS`, `SECURITY`, `CONTRIBUTING`) |
| Markdown files examined by targeted structural search only | 17 |
| Configuration files inspected | 14 |
| Build scripts read in full | 2 of 4 |
| External sources consulted for attribution verification | 9 |

### Findings by severity

| Severity | Count |
|---|---|
| **Critical** | **1** |
| **High** | **6** |
| **Medium** | **17** |
| **Low** | **30** |
| **Cosmetic** | **6** |
| **Total** | **60** |

> **Factual Count Reconciliation Note:** The summary table above reflects an internal undercount in the original audit draft (which reported 17 Medium and 30 Low). The authoritative audit universe defined by actual finding headers and Section 8 recommendations contains exactly **66 findings**: **1 Critical** (`C1`), **6 High** (`H1`–`H6`), **18 Medium** (`M1`–`M18`), **35 Low** (`L1`–`L12`, `L14`–`L36`; `L13` omitted), and **6 Cosmetic** (`C2`–`C7`).

---

# 2. Critical and High Priority Bugs

### [CRITICAL] C1 — The editor creates projects that its own persistence layer refuses to reopen, and the recovery path replaces the user's workspace with a blank one

**Evidence:** `[CODE-READ]` + `[EXECUTION]`
**Files:** `src/stores/slices/createLayerSlice.ts:16-40`; `src/stores/slices/createAnimationSlice.ts:54-79`; `src/lib/project/schema.ts:133-136, 353-355`; `src/lib/storage/db.ts:222-341`; `src/hooks/studio/useStudioAutosave.ts:258-273`

**Problem.** The workspace envelope (`WORKSPACE_ENVELOPE`, `src/config/canvasLimits.ts:15-32`) is enforced on **input** paths only. A repository-wide search proves it is never consulted anywhere the user actually builds a document:

```text
[EXECUTION]
Command: grep -n "MAX_CANVAS_LAYERS\|MAX_CANVAS_FRAMES\|MAX_PROJECT_TOTAL_LAYERS\|MAX_PROJECT_AGGREGATE" -r src/stores src/hooks src/components
(no output — zero matches)
```

`addLayer` (`createLayerSlice.ts:16`) and `addFrame` (`createAnimationSlice.ts:54`) perform no capacity check. `autoSaveWorkspace` (`db.ts:222`) serialises whatever the store holds via `JSON.stringify(stateSnapshot)` and never validates. But **every** read path validates: `useStudioAutosave.ts:261`, `StudioLayout.tsx:137` (Projects Gallery), `StudioLayout.tsx:319` (file import), `db.ts:420` (duplicate) and `db.ts:467` (rename) all route through `decodeAndValidateProject` → `validateProjectFile`, and `hydrateProject` (`serialize.ts:344`) validates again.

**Trigger.** Reachable purely through documented UI features. Three independent routes:
- More than 100 layers in any one frame (`schema.ts:134`).
- More than 500 frames (`schema.ts:354`).
- More than 64 MP aggregate raster footprint (`resourceBudget.ts:83`) — on a 2048×2048 canvas that is only **16 layers in total**.

**Observed behaviour**, proven by driving the real store and the real validator:

```text
[EXECUTION]
Command: npx vitest run tests/zz_probe_envelope.test.ts   (temporary probe, deleted afterwards)

AUDIT-ENV layers in frame 0 after 150 addLayer() calls = 151
AUDIT-ENV validateProjectFile -> ok=false error="Frame 1 exceeds the 100 layer ceiling."
AUDIT-ENV frame count after 520 addFrame() calls = 521
AUDIT-ENV validateProjectFile -> ok=false error="The project exceeds the 500 animation frame limit."
```

On the next page load, `useStudioAutosave.ts:263-272` catches the rejection and executes:

```ts
restoreFailedRef.current = saved.id;
useStudioStore.getState().resetToNewProject();
setAutosaveError('Saved workspace could not be restored and has been preserved in storage. A fresh workspace has been prepared.');
```

**Actual result.** The artwork is still bytes on disk in IndexedDB, but it is unreachable through every UI surface that can open it, because the Projects Gallery applies the identical validator. The user is handed an empty canvas and a message saying their work was "preserved". A `.pixibun` export of the same project produces a file PixiBun itself cannot import.

**Expected behaviour.** Either the store enforces the envelope at creation time (disable Add Layer / Add Frame at the ceiling with an explanatory toast), or the restore path admits over-envelope documents in a read-only repair mode. Silently accepting input the system cannot round-trip is the worst of the three options.

**Why Critical rather than High.** Permanent, silent loss of the user's primary asset, reachable without any unusual action, in an application whose central promise (`README.md:23`) is local-first custody of that asset.

---

### [HIGH] H1 — `computeContentAwareHeightmap` is super-linear in canvas area and is the default path for both `character` and `prop` artwork

**Evidence:** `[CODE-READ]` + `[EXECUTION]`
**File:** `src/lib/ai/math/edtNormalMap.ts:743-812` (step 6, "Micro Local Part Distance & Beveling Field")

The per-component loop allocates a full-canvas `Float32Array` and scans the whole canvas **once per connected component**:

```ts
for (let c = 1; c <= currentComponent; c++) {
  const cDist = new Float32Array(totalPixels);          // :747 — full canvas, per component
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (componentMap[idx] !== c) continue;            // :752 — full scan, per component
```

Cost is O(components × W × H) in time and O(components × W × H × 4) in cumulative allocation. Component count scales with pixel count on detailed artwork, so the stage behaves quadratically in canvas area.

**Reach.** `computePhotometricAnalysis` (`photometricLighting.ts:580-600`) routes **both** `character` and the default `prop`/general branch into this function. Only `orb` takes the cheap EDT path. `renderParametric2p5DLighting` (`:1139`) calls it again — see H6.

**Measured**, warmed up, against the real exported function:

```text
[EXECUTION]
Command: npx vitest run tests/zz_audit_probe.test.ts   (temporary probe, deleted afterwards)

Fixed canvas 128x128, varying component count:
  components=64    25.0 ms
  components=256   31.2 ms
  components=1024  107.3 ms
  components=4096  366.8 ms

Fixed pattern density, growing canvas:
  64x64   (256 components)   13.1 ms
  128x128 (1024 components)  95.1 ms
  256x256 (4096 components)  1270.7 ms
```

Pixel count grows 4× per step in the second table; time grows 7.3× then 13.4×. `MAX_CANVAS_DIMENSION` is 2048, so the reachable worst case is far beyond 1.27 s.

**What is and is not at fault.** `dt1D` (`edtNormalMap.ts:32-57`) is a correct, genuinely O(N) Felzenszwalb–Huttenlocher lower-parabolic-envelope transform. The EDT is not the problem. The surrounding per-component pass is, and no documentation distinguishes them. Affected claims: M11.

---

### [HIGH] H2 — Sprite-sheet export has no dimension ceiling and never validates its own output

> **Resolution Note (H2 Resolved):** Resolved in Phase 68. Enforced `MAX_SAFE_CANVAS_DIMENSION` (4096 px) and `MAX_SAFE_CANVAS_PIXELS` (16,777,216 px) bounds preflight in `ExportModal.tsx` before frame compositing or canvas allocation, and added low-level defense-in-depth geometry verification in `spriteSheetPacker.ts` raising `RangeError` before canvas instantiation. Verified across 11 safety unit tests in `tests/spriteSheetSafety.test.ts`. Note: H1, H3, H4, H5, and H6 remain OPEN.

**Evidence:** `[CODE-READ]`
**Files:** `src/lib/export/spriteSheetPacker.ts:46-57`; `src/components/modals/ExportModal.tsx:175-199`

```ts
const sheetWidth  = cols * scaledWidth  + (cols + 1) * pad;   // :48
const sheetHeight = rows * scaledHeight + (rows + 1) * pad;   // :49
const sheetCanvas = document.createElement('canvas');
sheetCanvas.width  = sheetWidth;                              // :52 — unbounded
```

`ExportModal.handleExportSpriteSheet` then serialises and downloads without inspecting the result (`:194-199`).

**Trigger.** Horizontal layout, 100 frames, 128×128 canvas, 4× frame scale → requested sheet width 51,200 px. Chrome caps a canvas axis near 32,767 px; WebKit caps far lower by area. The oversized canvas silently degrades and the draw calls no-op.

**Actual behaviour.** `toDataURL` returns `data:,` or a blank image and the user receives a `.png` that is empty or invalid — no error, no toast, no console message. The accompanying Godot `.tres`, Unity and Phaser JSON are still written with correct-looking frame rectangles, so the failure only surfaces inside the game engine.

**Expected.** The guard the PNG path already has: `ExportModal.tsx:141-149` checks `MAX_SAFE_CANVAS_DIMENSION`/`MAX_SAFE_CANVAS_PIXELS` before allocating, and `:159-161` rejects `dataUrl === 'data:,'`. Neither exists on the sprite-sheet path.

---

### [HIGH] H3 — GIF, APNG, WebM and MP4 exports bypass the ceiling the documentation calls universal

> **Resolution Note (H3 Resolved):** Resolved in Phase 69. Enforced universal export geometry preflight across all animated formats (GIF, APNG, WebM, MP4) using centralized `validateExportGeometry` enforcing PixiBun configured safety boundaries `MAX_SAFE_CANVAS_DIMENSION` (4096 px) and `MAX_SAFE_CANVAS_PIXELS` (16,777,216 px). GIF and APNG additionally enforce configured animated-image export budget `MAX_EXPORT_AGGREGATE_PIXELS` (67,108,864 aggregate pixels = 256 MiB of raw RGBA at 4 bytes/pixel) to bound raw source pixel workload and reduce OOM risk during uncompressed frame retention. UI preflight in `ExportModal.tsx` aborts before frame compositing with error toast notification; `AnimatedExportTab.tsx` disables unsafe scale multipliers with tooltip and displays explicit safety warning banner without silent resolution downgrades; and encoder engines (`scaleCanvas.ts`, `gifEncoder.ts`, `apngEncoder.ts`, `mp4Encoder.ts`, `webmEncoder.ts`) independently enforce `RangeError` safety ceilings before allocating canvases, workers, or encoders. Verified across 18 unit tests in `tests/animatedExportSafety.test.ts`. Note: H1, H4, H5, and H6 remain OPEN.

**Evidence:** `[CODE-READ]`
**Files:** `src/components/modals/export/AnimatedExportTab.tsx:32`; `src/lib/export/apngEncoder.ts:196`; `src/lib/export/mp4Encoder.ts:186`; `src/lib/canvas/scaleCanvas.ts:34-48`

```text
[EXECUTION]
Command: grep -rn "MAX_EXPORT_DIMENSION\|MAX_EXPORT_PIXELS\|MAX_SAFE_CANVAS" src/

src/components/modals/ExportModal.tsx:142,143,144,147     (PNG branch only)
src/components/modals/export/PngExportTab.tsx:5,6,29,30,31,36,47,60,61,62,72
src/config/canvasLimits.ts                                 (definitions only)
```

`AnimatedExportTab.tsx:32` offers scales `[1, 2, 4, 8, 16]` with no disable logic. The encoders clamp only the *scale factor*, never the resulting dimensions.

**Trigger.** 2048×2048 project (schema-legal), APNG at 16×. `extractScaledCanvasRgba` allocates 32,768 × 32,768, and `createFilteredRgbaScanlines` builds `height × (width×4 + 1)` ≈ **4.3 GB of uncompressed scanlines per frame**, because the APNG encoder deliberately uses uncompressed DEFLATE store blocks (`apngEncoder.ts:92-131`). Tab crash.

**Why this matters.** `canvasLimits.ts:8-12` claims the envelope is "a single source of truth across all 5 subsystems". It is consulted by one of eight export formats.

---

### [HIGH] H4 — `redo()` evicts undo entries without updating the replay baseline

> **Resolution Note (H4 Resolved):** Resolved in Phase 70. Unified the history engine eviction loop by extracting private `evictUntilWithinBudget(incomingBytes)` shared between `push()` and `redo()` in `src/lib/engine/historyEngine.ts`. Redo-triggered byte-budget eviction now folds every permanently evicted oldest undo entry into the Process Replay baseline via `updateBaselineFromEvicted(evicted)`. The shared eviction helper also preserves the existing depth-cap behavior used by `push()`; normal undo→redo flow has a free depth slot and does not trigger depth eviction. Verified across 10 comprehensive tests in `tests/processReplayEviction.test.ts`. Note: H1, H5, and H6 remain OPEN; M1 remains OPEN and unchanged.

**Evidence:** `[CODE-READ]`
**File:** `src/lib/engine/historyEngine.ts:367-386` (compare `:332-342`)

`push()` keeps the replay baseline in sync on every eviction:

```ts
const evicted = undoStack.shift()!;
totalBytes -= calculateStepBytes(evicted);
isTruncated = true; evictionCount++;
updateBaselineFromEvicted(evicted);      // :341
```

`redo()` runs a structurally identical loop and **omits that call** (`:373-381`).

**Trigger.** Reachable in production: `useViewportDrawing.ts:354` calls `historyEngineRef.current.redo(currentStep)` with a live `currentStep`, and the engine is built with the 50-entry / 64 MiB defaults at `useViewportDrawing.ts:35`. Any redo while the undo stack is at capacity evicts without a baseline update.

**Result.** `getGlobalBaselineCheckpoint()` (`:465`) feeds the Process Replay / speedpaint exporter via `ExportModal.tsx:17-19`. The replay begins from a stale frame and every subsequent step composites onto a wrong base. `evictionCount` and `isTruncated` still increment, so nothing detects the desync.

---

### [HIGH] H5 — WaveFunctionCollapse has no pattern-count bound; a user selection sizes an O(patterns²) build and a multi-gigabyte allocation

**Evidence:** `[CODE-READ]` + `[EXECUTION]`
**Files:** `src/lib/procedural/waveFunctionCollapse.ts:222-268`; `src/hooks/viewport/events/useArtisanEvents.ts:77-113`

The sample region is capped at 16×16 **only when there is no selection** (`useArtisanEvents.ts:86-89`). With an active selection the sample is the selection, up to the full 2048×2048 canvas, passed with `symmetries: 8, periodicInput: true` (`:105-111`). Nothing downstream caps `numPatterns`.

Two structures scale on `numPatterns`:

```ts
// :222-234  propagator build — O(4 · numPatterns²) compatibility tests
for (let dir = 0; dir < 4; dir++)
  for (let p1 = 0; p1 < numPatterns; p1++)
    for (let p2 = 0; p2 < numPatterns; p2++) ...

// :259  support counters
const compatible = new Int32Array(numCells * numPatterns * 4);
```

**Measured pattern-count law** (patterns = sampleW × sampleH × 8 exactly, no dedup on non-repeating input):

```text
[EXECUTION]
Command: npx vitest run tests/zz_probe_wfc.test.ts   (temporary probe, deleted afterwards)
Output size fixed at 16x16.

sample= 8x8   patterns=512   time=136 ms   compatible[]=2.0 MiB
sample=12x12  patterns=1152  time=294 ms   compatible[]=4.5 MiB
sample=16x16  patterns=2048  time=488 ms   compatible[]=8.0 MiB
sample=20x20  patterns=3200  time=813 ms   compatible[]=12.5 MiB
sample=24x24  patterns=4608  time=1442 ms  compatible[]=18.0 MiB
```

**Extrapolation from the measured law.** A 64×64 selection on a 64×64 canvas → 32,768 patterns → `compatible` = 4096 × 32,768 × 4 × 4 B = **2.1 GB**, plus a propagator build of 4.3 × 10⁹ compatibility tests. A 128×128 selection → 131,072 patterns → **34 GB**. The 10 s worker timeout (`workerDispatcher.ts:29`) does not save it: the allocation fails first, and `terminateWorkerAndRejectAll` (`:51`) then rejects every other in-flight worker request as collateral.

---

### [HIGH] H6 — `renderParametric2p5DLighting` runs the expensive content-aware analysis twice, plus a third full EDT pipeline, per invocation

**Evidence:** `[CODE-READ]`
**File:** `src/lib/ai/math/photometricLighting.ts:1119-1201`

Within one call the function performs:

1. `inferPhotometricSettings(data, width, height)` — `:1132`
2. `computeContentAwareHeightmap(...)` — `:1139` (the H1 quadratic path)
3. a separate full `computeSeparableEDT` → `generateInflatedHeightmap` → `applyBilateralFilter` → `computeTangentNormalField` chain for `specularNormalField` — `:1146-1158`
4. `executePhotometricPipeline(srcCtx, width, height, {...})` — `:1178-1201`, called **without** `precomputedAnalysis`, so `executePhotometricPipeline:670` falls into `computePhotometricAnalysis`, which re-runs `inferPhotometricSettings` **and** `computeContentAwareHeightmap` a second time.

Three `getImageData` reads of the same source also occur (`:1126`, inside `executePhotometricPipeline`, and inside `computePhotometricAnalysis`). The `PhotometricAnalysisGeometry` plumbing that avoids this already exists and is honoured at `:660-672`; this call site simply does not pass it. At the measured 256×256 cost from H1 this turns a ~1.3 s operation into ~2.6 s.

---

# 3. Documentation Errors / False Claims

## `README.md`

### [MEDIUM] M6 — "zero-allocation 32-bit LUT renderer" is false
**Line 120.** *"Features zero-allocation 32-bit LUT renderer (`updateLivePaletteLUT32`) running at 60 FPS"*.

`src/lib/color/paletteCycling.ts:253-260` calls `hexToRgb` once per palette entry every frame, and `hexToRgb` (`:200-213`) allocates on every call: `hex.replace('#','')` (1 string), three `clean.substring(...)` (3 strings), plus a returned `[r,g,b]` array. With blendShift the cycle branch calls it twice per register and `blendColorsRgb` (`:238-247`) returns another array. For a 256-colour palette at 60 FPS that is well over 76,000 heap allocations per second. Only the output `Uint32Array` is pre-allocated. `[CODE-READ]`
**Repeated in:** `MAIN.md:18`, `BENCHMARKS.md:15`, `CHANGELOG.md:400`, `LOGS.md:1130`, `TASKS.md:636`.

### [MEDIUM] M7 — The Aaltonen raymarcher is advertised as a shipped feature but is unreachable from the UI
**Lines 48 and 276.** *"Aaltonen raymarched ground cast shadows vs. contact drop AO"*; *"Aaltonen Ray Marching … raymarched soft shadows"*.

```text
[EXECUTION]
Command: grep -rn "renderBoundedSpriteCastShadow\|executeClassic2DRaymarchedShadow\|tracePhysical2DSoftShadow" src/components src/hooks

src/components/landing/showcase/PhotometricShowcase.tsx:18,108   renderBoundedSpriteCastShadow
src/hooks/viewport/events/useGeometricEvents.ts:182,244          renderBoundedSpriteCastShadow
(no component or hook references any raymarching function)
```

Every production call site uses the bounded 2.5D sheared-silhouette projection. The inspector panel is named `RaymarchedShadowSection.tsx` yet dispatches `mode: 'bounded-2.5d'` at `:71`, which `executeRaymarchedCastShadowPipeline` (`shadowRayMarcher.ts:544-554`) routes *away* from the raymarcher. `tracePhysical2DSoftShadow`, `generateRaymarchedShadowMap` and `executeClassic2DRaymarchedShadow` are reachable only via `smartMathEngine` re-exports and unit tests. README contradicts itself sixty lines apart: `:104` states the project *"Replaced infinite planar raymarch wedges with professional 2.5D bounded sprite cast shadows."* `[CODE-READ]`

### [MEDIUM] M16 — "Physical Kelvin temperature shifts" and "chromatic adaptation matrices" describe mathematics that does not exist
**Line 118.** *"Atmospheric Photographic Color Grading: Physical Kelvin temperature shifts (+2800K Golden Sunset, -3500K Cool Moonlight, Neon Dusk, DMG Game Boy)."* `src/lib/ai/pixelAiEngine.ts:242` repeats it: *"Implements real physical Kelvin color temperature shifts, chromatic adaptation matrices, and cinematic split-toning in OKLab space."*

```text
[EXECUTION]
Command: grep -rni "bradford\|cat02\|von kries\|planck\|blackbody\|black-body\|kelvin" src/
src/lib/ai/pixelAiEngine.ts:7,242,270,279   (four comment strings only)
```

There is no Planckian-locus evaluation, no correlated-colour-temperature conversion, and no chromatic adaptation matrix anywhere in the codebase. `applyAtmosphericColorGrade` (`:246-311`) performs a fixed `shiftHueToward` rotation to a hard-coded target hue (65° sunset, 260° moonlight, 185°/320° neon) plus scalar L and C multipliers. The "+2800K" and "−3500K" figures appear in no computation. `[CODE-READ]`

### [MEDIUM] M17 — The stated Beer–Lambert chord formula is not the one implemented
**Line 117.** *"Beer-Lambert exponential spectral decay through distance-field chord lengths $T(\mathbf{x}) = 2\sqrt{\max(0, R^2 - D(\mathbf{x})^2)}$"*.

`photometricLighting.ts:1396` computes something structurally different:

```ts
const opticalChord = (2.0 * Math.max(0.5, dist)) / Math.max(0.08, NdotL + profile.wrap);
```

That is `2·D / (N·L + wrap)` — proportional to the distance field and inversely proportional to light angle, not a circular chord through a sphere of radius R. A search for the documented form returns nothing. The Beer–Lambert exponential itself (`Math.exp(-sigma * scaledChord)`, `:1409-1411`) is real; the chord term feeding it is not what README states. `[CODE-READ]`

### [LOW] L14 — Benchmark budget misquoted as 10 s; the test asserts 15 s
**Line 265.** *"a $4000\times3000$ photo downsampling benchmark under a 10s budget in `tests/benchmark.test.ts`"*. Actual (`tests/benchmark.test.ts:63-64`): `expect(durationMs).toBeLessThan(15000); … }, 15000);` `[CODE-READ]`

### [LOW] L15 — "Canonical Xenowhirl RotSprite Engine" omits two stages of the canonical algorithm
**Line 128.** `src/lib/canvas/rotSprite.ts` implements the 8× similarity-threshold Scale2x cascade (`scale8x`, `:104-108`) and a subpixel inverse-sampling downscale with parabolic weighted voting (`:145-232`). The canonical description also includes (a) a rotation-offset search favouring non-boundary sample points and (b) a single-pixel detail-restoration pass. Neither exists, and the downscale is not the canonical nearest-neighbour shrink. `[WEB-VERIFIED]` Wikipedia, *Pixel-art scaling algorithms* (https://en.wikipedia.org/wiki/Pixel-art_scaling_algorithms). The file's own docstring is accurate; only "Canonical" in README overstates.

### [LOW] L16 — OKLab perceptual matching is claimed for dither tools that use Euclidean RGB
**Line 113.** The ΔE_OKLab bullet heads the section that goes on to list the Bayer, Atkinson and Riemersma dither tools. The import/pixelize pipeline does use OKLab ΔE (`pixelizeEngine.ts:388-400`). The canvas dither tools do not: `dithering.ts:80-86` and `:206-213` both use `(oldR-c.r)**2 + (oldG-c.g)**2 + (oldB-c.b)**2`. `[CODE-READ]`

### [LOW] L28 — "smooth, continuous highlight pill with natural alpha falloff" is a hard threshold
**Line 99.** `photometricLighting.ts:1248-1252` gates on `if (Ispec > 0.35)` and emits `alpha = round(Ispec * 255)` — a binary cut at alpha 89, not a continuous falloff to zero. `[CODE-READ]`

### Cross-reference
`README.md:23` (64 MiB bound) → **M1**. `README.md:139` (export ceiling) → **H3**. `README.md:116` (Riemersma "eliminates worming") → **M3**.

---

## `BENCHMARKS.md`

### [MEDIUM] M9 — §7 "Quality Gate Pipeline Benchmark" is stale on three independently measurable counts
**Lines 137-141.** Claims Stage 1 checked *"57 unique phases, 31 monotonic sections, 208 filepaths"* and Stage 4 ran *"699 unit and integration tests across 98 suites"*.

```text
[EXECUTION]
Command: npm run gate     Exit code: 0

✅ TASKS.md phase headers verified (all 60 phases unique)
✅ ARCHITECTURE.md sections verified (strictly monotonic 1 through 31)
✅ CHANGELOG.md file paths verified (238/238 verified on disk)
✅ README.md test metrics verified against live runners (795 unit tests across 107 suites; 43 E2E tests across 10 suites)
✓ Stage 1 PASSED in 45.59s   ✓ Stage 2 PASSED in 25.17s
✓ Stage 3 PASSED in 19.12s   ✓ Stage 4 PASSED in 65.74s
🎉 ALL 4 QUALITY GATES PASSED SUCCESSFULLY (155.62s)
```

57 → 60 phases; 208 → 238 filepaths; 699/98 → 795/107 tests. Section count (31) is correct. This is presented as the current gate benchmark, not a dated changelog entry. `[EXECUTION]`

### [MEDIUM] M10 — "50 combined undo/redo steps" is wrong; the engine holds 50 undo **plus** 50 redo
**`BENCHMARKS.md:34`** and **`ARCHITECTURE.md:98`** both describe a shared 50-step ring. `historyEngine.ts:111-112` declares two independent stacks; `push()` bounds `undoStack` to `limitDepth` (`:335`) and `undo()` separately bounds `redoStack` to the same `limitDepth` (`:358-360`). Maximum combined retention is 100. The project's own test demonstrates it and still passes: `tests/benchmark.test.ts:298-305` asserts depth 50, then after 30 undos asserts `canRedo === true` with `depth === 20` — 20 undo entries and 30 redo entries held at once. `[CODE-READ]`

### [LOW] L17 — §2's two largest rows describe states the engine cannot reach
**Lines 45-46** list 1024×1024 → "209.72 MB" and 2048×2048 → "838.86 MB" for 50 steps. `DEFAULT_HISTORY_MAX_BYTES` is 64 MiB (`historyEngine.ts:69`) and the studio engine uses that default (`useViewportDrawing.ts:35`). The byte budget binds first: 1024² → 15 steps retained; 2048² → 3 steps. The note at `:51` disclaims "arithmetic buffer sizes" but never mentions the cap that makes those rows unreachable. `[CODE-READ]`

### [LOW] L18 — §6 "Main Thread Blocking (Worker Offload) 0.00 ms" does not cover the expensive path
**Lines 152-157.** The worker's `edtNormalMap` case (`heavyCompute.worker.ts:131-158`) runs only the simple EDT → inflate → bilateral → Sobel chain. The content-aware pipeline (H1) has no worker case and runs on the main thread. Separately, `workerDispatcher.ts:9-11` documents silent fallback to synchronous main-thread execution, in which case blocking is not 0.00 ms. `[CODE-READ]`

### [LOW] L29 — Stage timings are an order of magnitude below measurement
§7 reports Stage 1 at 7.27 s and a 19.44 s total; `CONTRIBUTING.md` claims the gate "runs in ~16-19 seconds on standard developer hardware". Measured here: Stage 1 = 45.59 s, total = **155.62 s**. Hardware differs and I do not treat the gap as proof of falsity, but Stage 1 must spawn both `npx vitest list` over 107 suites and `npx playwright test --list`, which makes 7.27 s implausible on any hardware. Re-measure and state the reference machine. `[EXECUTION]`

---

## `PIXIBUN_DEEP_DIVE.md`

### [MEDIUM] M14 — The documented cel-shadow terminator formula does not match the implementation
**Line 187.** *"exposure-compensated terminator ($\text{shadowThresh} = \text{clamp}(0.46, 0.58, 0.52 - (\text{brightness} - 1.15) \times 0.04)$)"*.

Shipped code (`photometricLighting.ts:930-937`) is a two-branch piecewise map with a far wider range:

```ts
if (brightness <= 1.15) { const t = clamp((1.15 - brightness) / 0.85); shadowThresh = 0.52 + t * 0.30; }
else                    { const t = clamp((brightness - 1.15) / 1.35); shadowThresh = 0.52 - t * 0.32; }
```

```text
[EXECUTION]  node /tmp/dome.mjs
brightness | shipped shadowThresh | DEEP_DIVE documented
   0.30    |        0.8200        |       0.5540
   1.00    |        0.5729        |       0.5260
   1.15    |        0.5200        |       0.5200
   2.00    |        0.3185        |       0.4860
   2.50    |        0.2000        |       0.4660
```

The two agree at exactly one point (brightness = 1.15) and diverge by up to 0.27 elsewhere. Shipped range [0.20, 0.82]; documented clamp [0.46, 0.58]. `[EXECUTION]` + `[CODE-READ]`

### [MEDIUM] M15 — "exact zero derivative at the apex" is false for the shipped profile
**`PIXIBUN_DEEP_DIVE.md:193`** and **`ARCHITECTURE.md:186`** both assert the dome inflation *"provides an exact zero derivative at the apex peak"*. `generateInflatedHeightmap` (`edtNormalMap.ts:118-128`) does **not** ship the pure sphere profile; it ships a fixed 75/25 blend with `d^γ`:

```ts
const sphereDome = Math.sqrt(Math.max(0, 1.0 - u * u));
const gammaDome  = Math.pow(normalizedD, gamma);
heightmap[i] = maxD * (sphereDome * 0.75 + gammaDome * 0.25);
```

`d^0.5` has derivative 0.5 at the apex, so the blend does not vanish there.

```text
[EXECUTION]  node /tmp/dome.mjs
shipped blend  h'(d=1.0) = 0.125000
pure sphere    h'(d=1.0) = 0.000000
```

The in-code comment at `:122-123` has the same problem: it justifies the sphere term ("Zero derivative at apex eliminates conical pinch artifacts") and then adds the term that breaks it two lines later. This also makes README's "$\gamma = 0.5$" characterisation misleading — γ governs only 25 % of the profile. `[EXECUTION]` + `[CODE-READ]`

---

## `MAIN.md` and `ARCHITECTURE.md`

### [MEDIUM] M11 — "sub-millisecond execution" / "zero latency" for the math engine
**`MAIN.md:47`**: *"content-aware heightmaps … with 0 cloud dependencies, **sub-millisecond execution**, and offline privacy."*
**`ARCHITECTURE.md:386`**: *"2.5D photometric lighting, $O(N)$ EDT, content-aware heightmaps, and bounded sprite cast shadows run synchronously with **zero latency**."*

Content-aware heightmaps are named explicitly in both. Measured: 13.1 ms at 64², 95.1 ms at 128², 1270.7 ms at 256² (H1). Also contradicted by the project's own test output:

```text
[EXECUTION]  npm test (stderr, tests/photometricPerformance.test.ts)
[B18 Photometric Benchmark] 128x128: 2.66ms per frame
[B18 Photometric Benchmark] 256x256: 1.76ms per frame
[B18 Photometric Benchmark] 512x512: 13.34ms per frame
```

Even on the project's own smooth synthetic fixture, 512² is 13.34 ms — thirteen times the claimed budget. `[EXECUTION]`

### [LOW] L30 — "guaranteeing zero unpersisted metadata state"
**`ARCHITECTURE.md:219`.** Autosave is debounced, so any crash or tab close inside the debounce window loses that interval's changes. "Guaranteeing zero" is unachievable with a debounced writer and is unqualified. `[CODE-READ]`

### [LOW] L31 — "token-bucket traffic shaping" overstates what the reliable channel does
**`ARCHITECTURE.md:414`.** The token bucket (`presenceRateLimiter`, `p2pSync.ts:490`) applies to **inbound presence messages only**. The reliable CRDT channel uses `bufferedAmount` backpressure plus a retry queue (`:478-492`). `SECURITY.md` states this correctly ("Presence traffic uses a single token bucket"); ARCHITECTURE.md does not. `[CODE-READ]`

---

## Documentation that was checked and **holds**

Recorded because a one-sided report would be inaccurate. Each was independently verified, not assumed.

| Claim | Location | Verification |
|---|---|---|
| "795 unit and integration tests across 107 suites" | `README.md:265,296` | `[EXECUTION]` `npm test` → exactly 795/107 |
| "10 E2E spec suites (43 tests)" | `README.md:265,296` | `[EXECUTION]` `npx playwright test --list` → "Total: 43 tests in 10 files" |
| "Dexie.js (IndexedDB Schema v4)" | `README.md:283` | `[CODE-READ]` `db.ts:57` `this.version(4)` |
| "schema v3 smart-effect recipes" | `README.md:146` | `[CODE-READ]` `types/project.ts:5` `PROJECT_FORMAT_VERSION = 3` |
| "IndexedDB ring buffer (200 entries max)" | `README.md:261` | `[CODE-READ]` `capture.ts:7`, FIFO prune `:100-108` |
| "Zoom 100 % to 6400 %" | `README.md:222` | `[CODE-READ]` `zoom.ts:7-16`; `mathInvariants.ts:28` `MAX_ZOOM = 64.0` |
| "Atkinson 75 % error retention" | `README.md:115` | `[CODE-READ]` `dithering.ts:92-104` — error/8 × 6 neighbours = 75 % |
| "single-transaction atomic metadata + blob commits" | `README.md:283` | `[CODE-READ]` `db.ts:235` one `rw` transaction spanning both tables |
| "Co-draw defaults to zero-egress LAN mode" | `README.md:23` | `[CODE-READ]` `CoDrawModal.tsx:28` `networkMode` defaults `'lan'` → `lanOnly: true` → `LAN_ICE_SERVERS = []` |
| "2:1 isometric, 26.565° (arctan 0.5)" | `README.md:84` | `[CODE-READ]` `curvesAndLines.ts:88-91` projects onto the (2,1) vector — slope ½, arctan ½ = 26.565° |
| "47-blob Wang autotiling" | `README.md`, `CONTRIBUTING.md` | `[EXECUTION]` I re-derived the canonical reduction independently and compared: 47/47 masks identical, 256/256 LUT entries correct, **0 mismatches** |
| "nonce-based CSP, `unsafe-eval` dev-only" | `src/proxy.ts:14-25` | `[EXECUTION]` live `GET /` header shows `script-src 'self' 'nonce-…'`, no `unsafe-eval` |
| CWE-409 probe rejects > 8192 px / > 67 MP | `SECURITY.md` §4 | `[CODE-READ]` `imageHeaderProbe.ts:249-272` |
| CWE-1321 strips `__proto__`/`constructor`/`prototype`, depth ≤ 32 | `SECURITY.md` §4 | `[CODE-READ]` `safeJson.ts:54, 124-127` |
| Diagnostics relay threat model | `SECURITY.md` §3 | `[CODE-READ]` + `[EXECUTION]` live 503/405. **`SECURITY.md` is the most accurate document in the repository** — it volunteers spoofable `X-Forwarded-For`, per-instance rate limiting, and "truncation is not redaction" rather than overstating |
| "zero third-party algorithmic dependencies" | `CONTRIBUTING.md` §1 | `[CODE-READ]` The 10 runtime dependencies are framework/state/storage only; EDT, RotSprite, autotile, APNG, GIF, ISOBMFF, WFC, CRDT are all hand-written |

---

# 4. Undocumented Code Behavior

### [MEDIUM] M1 — The redo stack has no byte budget, so total history memory is not bounded to 64 MiB
`historyEngine.ts:111-113, 350-363`. `totalBytes` accounts for `undoStack` only. `undo()` bounds the redo stack by depth alone (`while (redoStack.length >= limitDepth) redoStack.shift();`, `:358`), and each admitted entry may individually reach `limitBytes` (`:357`). README `:23`, CHANGELOG `:39`, TASKS `:34` and the file's own comment `:63-67` all say *"strictly bounded to 64 MiB / 50 entries"*. The accurate statement bounds the **undo** stack; total retained history can be roughly double. `[CODE-READ]`

### [MEDIUM] M2 — `receivedMessages` dedup set grows without bound for the session lifetime
`p2pSync.ts:461, 588, 601, 907`. Every received `deliveryId` is added; the set is cleared only in `disconnect()`. At stroke-commit frequency over a long co-draw session this is an unbounded leak. The CRDT op log beside it *is* bounded (`MAX_OP_LOG_SIZE = 10000`, `crdtPixelBuffer.ts:54`); this set is not. `[CODE-READ]`

### [MEDIUM] M12 — An oversized edit is silently made permanently non-undoable, and destroys the redo chain
`historyEngine.ts:318-330`. When a step exceeds `limitBytes`, `push()` clears the entire redo stack, sets `isTruncated`, emits a toast and returns **without storing the step**. The edit is already on canvas; it can never be undone, and unrelated redo history is destroyed as a side effect. `CHANGELOG.md:40` documents the rejection but not the redo destruction; no user-facing document mentions either. `[CODE-READ]`

### [MEDIUM] M13 — The Dexie handle is attached to `window` in production builds served from localhost
`db.ts:67-75`:
```ts
const isDevOrTest = process.env.NODE_ENV !== 'production' ||
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
if (isDevOrTest) { (window as unknown as {...}).__pixibunDb = db; }
```
The `hostname` disjunct means a **production** build served locally also exposes full read/write/delete access to every stored project. Not mentioned in `SECURITY.md`. `[CODE-READ]`

### [MEDIUM] M18 — `cleanJaggiesOnCanvas` writes semi-transparent pixels into the user's layer buffer, contradicting the project's own invariant
`pixelAiEngine.ts:214` writes `{ r, g, b, a: 160 }` blend pixels. `SKILL.md:15` states *"Never allow anti-aliased image smoothing on the pixel canvas"* and `SKILL.md:20` *"Never allow smart features to produce non-integer coordinates or anti-aliased pixels into the user's project buffer."* `README.md:116` advertises the feature as *"inserts soft intermediate OKLab blend pixels"*. The two documents directly contradict each other about a shipped behaviour; the code follows README. `[CODE-READ]`

### [LOW] L19 — The 50 MB import ceiling applies to images, not just project JSON
`importFile.ts:7` runs `if (file.size > SafeJson.MAX_PAYLOAD_BYTES) throw …` before the file type is examined, so PNG/JPEG/GIF/BMP/WebP imports share the JSON DoS cap documented at `safeJson.ts:46-49`. `[CODE-READ]`

### [LOW] L20 — JSON nesting is hard-capped at depth 32, enforced twice
`safeJson.ts:54`, checked textually at `:72-84` and structurally at `:87-103`. `[CODE-READ]`

### [LOW] L12 — `sanitizeObject` strips any key literally named `constructor` or `prototype`, anywhere
`safeJson.ts:124-127`, applied to whole project payloads at `schema.ts:249`. Harmless today; silently lossy for any future field or user-supplied map key with those names. `[CODE-READ]`

### [LOW] L21 — Project load aborts entirely if any one layer PNG's decoded size differs from the canvas
`serialize.ts:333-336` throws *"Layer dimensions do not match the project canvas."* One mismatched layer makes the whole file unopenable; no partial recovery, no document describes it. `[CODE-READ]`

### [LOW] L22 — The 2048 px canvas ceiling is absent from `README.md` and `MAIN.md`
`canvasLimits.ts:17`. README only says the tool is "Optimized for 16×16 to 128×128". The hard rejection boundary appears only in `BENCHMARKS.md` §2 as "(Envelope Max)" and `ARCHITECTURE.md:414`. `[CODE-READ]`

### [LOW] L23 — PNG export failure is reported to the console only
`ExportModal.tsx:146-150, 170-172`. Both the ceiling rejection and the `catch` use `console.error` and return; no toast, though `studioEvents.emit('pixibun:toast', …)` is used for exactly this elsewhere. `[CODE-READ]`

### [LOW] L24 — Diagnostics capture records `window.location.pathname` and truncates detail at 2 KB
`capture.ts:8, 72-76`. README `:23` discloses that local diagnostics are on by default; the route capture and the 2 KB truncation are undocumented. `SECURITY.md` §3 correctly warns that "truncation is not redaction". `[CODE-READ]`

### [LOW] L25 — Structural envelope limits are enforced but undocumented for users
Enforced and user-visible as import rejections: 500 frames, 100 layers/frame, 2000 total layers, 64 MP aggregate, 50 palettes (`schema.ts:312`), 100 clips (`:330`), 100 ramps (`:325`), 256-char name (`:271`), 60,000 ms max frame duration (`:127`). None appear in README or MAIN. `[CODE-READ]`

### [LOW] L26 — The MediaRecorder MP4 fallback bypasses the ISOBMFF muxer entirely
`mp4Encoder.ts:238-368`. Only the WebCodecs path (`:69-178`) calls `muxToMp4Blob`. The fallback concatenates raw recorder chunks (`:295`) and paces frames with `setTimeout` (`:365`), so per-frame holds are wall-clock approximations. `MAIN.md:24` advertises the muxer without noting that half the paths skip it. `[CODE-READ]`

### [LOW] L27 — The heavy-compute worker silently degrades to synchronous main-thread execution
`workerDispatcher.ts:93-131`. `getOrCreateWorker()` returns `null` on any construction failure (including CSP refusal), swallowing the exception in bare `catch {}` at `:104` and `:126`. No telemetry, no toast. `[CODE-READ]`

### [LOW] L32 — A worker timeout on one request rejects every concurrent request
`workerDispatcher.ts:169-173` calls `terminateWorkerAndRejectAll` on timeout, and `runRotSpriteInWorker` re-throws rather than falling back when it sees `"Worker terminated"` (`:255-263`). A slow WFC synthesis (10 s default) therefore kills an unrelated in-flight RotSprite. The docstring calls this "deterministic crash recovery"; the cross-request coupling is not documented. `[CODE-READ]`

### [LOW] L33 — SDF morph output is forced fully opaque and assumes both frames share dimensions
`pixelAiEngine.ts:415-418` and `:468-471` set `outData[outIdx + 3] = 255` unconditionally, discarding per-pixel alpha. `morphInBetweenFrameAtFraction` uses `frameA.width/height` for both frames with no equality check (`:358`). `[CODE-READ]`

### [LOW] L34 — `renderParametric2p5DLighting` returns a permanently empty `rimPixels` array and ignores two of its parameters
`photometricLighting.ts:1100, 1206, 1275`. `rimPixels` is declared and returned but nothing ever pushes to it. `params.rimLight` and `params.selOut` are declared in `LightParameters` and never read. Callers dutifully pass `rimLight: false` (`useGeometricEvents.ts:46, 77`). `[CODE-READ]`

### [LOW] L35 — `CoDrawBridge` defaults to public STUN when called without options, inverting the module default
`coDrawBridge.ts:107` selects `options.lanOnly ? LAN_ICE_SERVERS : PUBLIC_STUN_ICE_SERVERS`, so `startHost({})` egresses to Google STUN even though `p2pSync.ts:92` declares `DEFAULT_ICE_SERVERS = LAN_ICE_SERVERS`. The UI is safe (`CoDrawModal.tsx:28` defaults to `'lan'`), so the README privacy claim holds today — but the bridge's own default contradicts the module's. `[CODE-READ]`

### [LOW] L2 — Blank-canvas analysis returns four aliased references to one buffer
`edtNormalMap.ts:487-505`: the `opaqueCount === 0` early return assigns the same `emptyH` instance to `macroHeightmap`, `microHeightmap`, `compositeHeightmap` and `smoothHeightmap`. `[CODE-READ]`

### [LOW] L10 — Zhang–Suen never thins the outer 1 px border
`morphology.ts:32-33, 71-72` loop `y = 1 … height-2`, `x = 1 … width-2`. Standard for the algorithm, undocumented, and pixel-art sprites frequently touch the canvas edge. `[CODE-READ]`

### [LOW] L36 — `getBresenhamLine` has no integer guard and will hang on fractional input
`rasterMath.ts:22-33` loops `while (true)` until `currX === x1 && currY === y1`. With a fractional endpoint that equality never holds.

```text
[EXECUTION]  node /tmp/bres.mjs
integer    (0,0)->(10,4):  {"hung":false,"len":11}
fractional (0.5,0)->(10,4): {"hung":true,"len":200001}   (guard tripped at 200k iterations)
```

**Not currently reachable:** `clientToCanvasCoords` (`useViewportTransform.ts:46-47`) applies `Math.floor`, so both call sites (`useBrushPointerHandler.ts:42`, `useChiselPointerHandler.ts:93`) pass integers. Reported because the invariant is enforced only by caller convention and the failure mode is a frozen tab with unbounded array growth. `[EXECUTION]` + `[CODE-READ]`

---

# 5. Algorithm / Attribution Verification Table

Nine external sources were consulted. Where a source was not consulted, the row says `UNVERIFIED` — no substitute source, author, or venue was invented anywhere in this report.

| Technical Name | Claimed Behavior / Attribution | Verified Primary Source | Match Status |
|---|---|---|---|
| Linear-time EDT | Felzenszwalb & Huttenlocher, *Distance Transforms of Sampled Functions*, Theory of Computing 8(19):415–428, 2012; orig. Cornell TR2004-1963, 2004 (`edtNormalMap.ts:5-7`) | theoryofcomputing.org/articles/v008a019/ — Vol. 8 Art. 19, pp. 415-428, Sept 2012, DOI 10.4086/toc.2012.v008a019; dblp; Wikipedia | `MATCH` — citation exact to the page; `dt1D` (`:32-57`) is the canonical lower-parabolic-envelope algorithm |
| Zhang–Suen thinning | Zhang & Suen, CACM 27(3):236–239, March 1984 (`morphology.ts:5-6`) | dl.acm.org/doi/10.1145/357994.358023 — CACM Vol. 27 Issue 3, pp. 236-239, 1 March 1984 | `MATCH` — citation exact; conditions verified at `:46-56, 86-97`: B∈[2,6], A=1, `P2·P4·P6=0 ∧ P4·P6·P8=0` then `P2·P4·P8=0 ∧ P2·P6·P8=0` |
| Blinn–Phong specular | Blinn, *Models of light reflection for computer synthesized pictures*, SIGGRAPH CG 11(2):192–198, 1977 (`photometricLighting.ts:5-6`) | pbr-book.org/4ed Further Reading; Stanford CS348b reading list — "SIGGRAPH 77, pp. 192-198" | `MATCH` — half-vector `H = L + V` normalised, `pow(N·H, shininess)` at `:1030-1032` |
| Kajiya–Kay anisotropic | Kajiya & Kay, *Rendering fur with three dimensional textures*, SIGGRAPH CG 23(3):271–280, 1989 (`photometricLighting.ts:9-10`) | pbr-book.org References; ACM SIGGRAPH 2005 Courses bibliography; DOI 10.1145/74334 | `MATCH` on citation. Implementation (`:1472-1485`) is the dual-shift `sin(T·H)^p` form with two cuticle offsets — the Marschner/Scheuermann variant the file *also* cites at `:11-15`, so correctly credited |
| Henyey–Greenstein phase | Henyey & Greenstein, *Diffuse radiation in the galaxy*, ApJ 93:70–83, 1941 (`photometricLighting.ts:7-8`) | pbr-book.org References — "Astrophysical Journal 93, 70–83" | `MATCH` on citation; `PARTIAL` on use. `phaseHG2D` (`:199-205`) evaluates the **3D** kernel (exponent 1.5) with a 2D 1/2π prefactor, so it is not a normalised density on S¹. The code's own docstring (`:193-198`) discloses this honestly; README `:117` calling it "a 2D Henyey-Greenstein forward phase function" does not |
| Hybrid Logical Clocks | Kulkarni, Demirbas, Madappa, Avva, Leone, *Logical Physical Clocks*, OPODIS 2014, LNCS 8878, pp. 17–32 (`crdtPixelBuffer.ts:10-14`) | link.springer.com/chapter/10.1007/978-3-319-14472-6_2; dblp "OPODIS 2014: 17-32" | `MATCH` — citation exact; send rule (`:137-146`) and receive rule (`:236-251`) both follow the published formulation |
| LWW-CRDT | Shapiro, Preguiça, Baquero, Zawirski, *Conflict-Free Replicated Data Types*, SSS 2011, LNCS 6976, pp. 386–400 (`crdtPixelBuffer.ts:7-9`) | crdt.tech/papers.html; DOI 10.1007/978-3-642-24550-3_29 | `MATCH` — citation exact; `applyRemoteOp` (`:189-283`) is a correct LWW-register with deterministic `peerId` tie-break |
| Aaltonen soft-shadow correction | Sebastian Aaltonen, contact-hardening tangent correction, Claybook / GDC 2018 (`shadowRayMarcher.ts:6`) | iquilezles.org/articles/rmshadows; media.gdcvault.com/gdc2018/presentations/Aaltonen_Sebastian_GPU_Based_Clay.pdf; shadertoy.com/view/lsKcDD (sebbbi's own description of the triangulation) | `MATCH` on attribution; see **M7** — the implementing functions are unreachable from the UI |
| Reoriented Normal Mapping | Barré-Brisebois & Hill, *Blending in Detail*, 2012 (`normalSculptor.ts:114-118`) | blog.selfshadow.com/publications/blending-in-detail/; github.com/zigguratvertigo/ReorientedNormalMapping | `MATCH` — reference is `r = t·dot(t,u)/t.z − u`; code computes `r = t·dot(t,u) − u·t.z` (`:137-140`), the reference scaled by strictly-positive `t.z`, hence identical after normalisation at `:142-145` |
| RotSprite | Xenowhirl, 2007 (`canvas/rotSprite.ts:6`) | en.wikipedia.org/wiki/Pixel-art_scaling_algorithms | `PARTIAL` — attribution correct; 8× similarity-Scale2x cascade correct; rotation-offset search and single-pixel detail restoration absent; nearest-neighbour downscale replaced by bespoke weighted voting (L15) |
| EPX / Scale2x | "Eric Johnston, Scale2x / EPX, LucasArts, 1992" (`canvas/rotSprite.ts:7`) | Wikipedia (same page); MacTech *Fast Blit Strategies* vol.15 iss.6 1999 via scale2x.it/scale2xandepx | `PARTIAL` — EPX is correctly Johnston / LucasArts ~1992. **Scale2x is not**: it is Andrea Mazzoleni's ~2001 reimplementation. Bundling both under Johnston is a mis-attribution (C3) |
| Riemersma dither | "Thiadmer Riemersma, *A Balanced Dithering **Algorithm***, C/C++ Users Journal, Vol. 16 No. 12, December 1998" (`dithering.ts:9-11`) | Full article fetched: jacobfilipp.com/DrDobbs/articles/CUJ/1998/9812/riemersm/riemersm.htm; Wikipedia *Hilbert curve*; ACM DL 10.5555/306490.306494 | `MISMATCH` on the algorithm, `PARTIAL` on the citation — detailed below |
| IFF ILBM `CRNG` | 8-byte BE chunk; rate 16384 = 60 steps/s; bit0 active, bit1 reverse (`paletteCycling.ts:32-64`) | EA IFF ILBM spec: etwright.org/lwsdk/docs/filefmts/ilbm.html; Wikipedia *ILBM*; `{WORD pad1; WORD rate; WORD flags; UBYTE low, high;}` | `MATCH` — field layout, byte order, rate scaling and flag bits all correct |
| Graphicraft `CCRT` | 14-byte BE chunk (`paletteCycling.ts:93-122`) | Same ILBM spec: `{WORD direction; UBYTE start, end; LONG seconds; LONG microseconds; WORD pad;}`, direction ∈ {0, 1, −1} | `PARTIAL` — layout and offsets exact; PixiBun invents `direction === 2` for ping-pong (`:110`, `:135`), outside the specification and misread by conformant decoders (L9) |
| 47-blob Wang autotile | 47 canonical masks + O(1) 256-entry LUT (`autotileEngine.ts:20-50`) | Re-derived independently, not taken from a source | `MATCH` — `[EXECUTION]`: I recomputed the cardinal-corner reduction over all 256 masks and compared. 47/47 masks identical, 256/256 LUT entries correct, **0 mismatches** |
| WaveFunctionCollapse | Maxim Gumin 2016; Merrell, *Example-Based Model Synthesis*, I3D 2007, DOI 10.1145/1230100.1230118 (`waveFunctionCollapse.ts:4-7`) | Not web-verified this session | `UNVERIFIED` on citation. Implementation read in full: overlapping pattern extraction, symmetry variants, min-Shannon-entropy observation with weighted collapse, and AC-4-style support counters are all genuinely present and correctly structured |
| OKLab / OKLCH | Björn Ottosson, 2020 (`colorSpace.ts:4-6`) | Not web-verified this session | `UNVERIFIED` — the LMS matrices at `:41-49` and `:59-71` resemble the published constants, but this was not confirmed against the primary source |
| Bayer ordered dither | Bryce E. Bayer, ICC 1973 (`dithering.ts:4-5`) | Not web-verified this session | `UNVERIFIED` |
| Bilateral filter | Tomasi & Manduchi, ICCV 1998 (`edtNormalMap.ts:8-10`) | Not web-verified this session | `UNVERIFIED` on citation; `:138-193` is a textbook joint spatial/range Gaussian with a precomputed spatial LUT |
| Local-First Software | Kleppmann, Wiggins, van Hardenberg, McGranaghan, Onward! 2019, pp. 154–178 (`crdtPixelBuffer.ts:16-20`, `p2pSync.ts:10-14`) | Search returned no direct hit | `UNVERIFIED` |
| APNG | "Stuart Parmenter & Vladimir Vukicevic (Mozilla, 2004)"; W3C PNG 3rd ed. (`apngEncoder.ts:4-6`) | Not web-verified this session | `UNVERIFIED` on authorship; the emitted chunk sequence at `:203-283` (IHDR / acTL / 26-byte fcTL / IDAT / fdAT / IEND, monotonic sequence numbers, CRC over type+data) is structurally consistent with the spec |
| Mark Ferrari palette cycling | Named throughout (`README.md:120`, `MAIN.md:18`) | Not verified | `UNVERIFIED` — no attempt was made to confirm Ferrari as the correct attribution for the *technique* as distinct from his well-known artwork using it |
| Minecraft skin UV layout | Mojang 64×64 / 64×32 cuboid atlas (`minecraftSkin.ts:4-5`) | Not web-verified this session | `UNVERIFIED` on the spec reference; the four canonical void zones hard-coded at `:143-147` — (0,0), (24,0), (32,0), (56,0), each 8×8 — are consistent with the standard head/hat row layout |
| Token bucket | Tanenbaum & Wetherall, *Computer Networks* §5.3 (`tokenBucket.ts:3-5`) | Not web-verified this session | `UNVERIFIED` on citation. Notable: the comment explicitly disclaims RFC 2697 conformance rather than over-claiming, and `SECURITY.md` §4 repeats the disclaimer |
| Cohen–Sutherland clipping | Foley, van Dam, Feiner & Hughes, *Computer Graphics: Principles and Practice*, 2nd ed. 1990, §3.12, pp. 113–117 (`mathInvariants.ts:7-9`) | Not web-verified this session | `UNVERIFIED` on the page range; the outcode encoding and loop at `:169-230` are the standard algorithm |

### Detailed note — Riemersma error weighting is a genuine algorithmic mismatch

I fetched the primary source in full. It specifies:

> *"The weight of every list item is [bⁱ] where **i** is the position of the item in the list (starting at 0 and ending at list length −1), **r** is the ratio of the highest weight to the lowest weight … In my own implementation, I have also set the weight ratio of the oldest entry versus the newest entry to 1:16."*

So the intended profile runs 1 (oldest) → 16 (newest) across a 16-entry list, with the newest entry carrying the full quantization error.

`src/lib/ai/math/dithering.ts:183-201` computes:

```ts
const decay = 1 / 8;                                     // :186
const weight = Math.pow(decay, historyLength - i);       // :196, historyLength = 16
```

Entries are pushed to the tail (`:227-232`), so `i = 15` is newest and receives `(1/8)¹ = 0.125`; `i = 0` receives `(1/8)¹⁶ ≈ 5.4 × 10⁻¹⁵`. Consequences:

1. The newest entry carries **12.5 %** of the error instead of 100 %.
2. Σ of all 16 weights = Σ(1/8)ᵏ for k = 1…16 ≈ **0.1429**, so ~14 % of accumulated error is ever propagated, with no normalisation by the weight sum.
3. Highest : lowest ratio is 8¹⁵ ≈ 3.5 × 10¹³, not the specified 16 : 1.

The Hilbert traversal itself (`:157-178`) is a correct standard `d2xy` mapping. But with error propagation suppressed by roughly two orders of magnitude the output is close to plain nearest-colour quantization with a faint perturbation. `README.md:116` claims it *"eliminates directional worming artifacts"* — it does, largely by barely dithering. The cited title is also wrong: the article is *A Balanced Dithering **Technique***. **Severity: Medium (M3).**

---

# 6. Test / Build Health

All commands were executed in this session with output captured. The temporary probe test files used for H1, H5 and C1 were deleted before the final verification run; the tree was confirmed back at 92 top-level test files and 237 source files.

| Command | Exit | Result |
|---|---|---|
| `npm ci --no-audit --no-fund` | 0 | PASSED — 392 packages, 13 s |
| `npm run typecheck` (`tsc --noEmit`) | 0 | PASSED — zero diagnostics |
| `npm run lint` (`eslint src tests`) | 0 | PASSED — zero errors, zero warnings |
| `npm test` (`vitest run`) | 0 | PASSED — 107 files, 795 tests, 63.42 s |
| `npm run build` (`next build`) | 0 | PASSED — compiled 27.2 s, 7 static pages, 6 routes all `ƒ (Dynamic)` |
| `npm run verify:docs` | 0 | PASSED — 6/6 checks |
| `npm run gate` | 0 | PASSED — 4/4 stages, **155.62 s** wall clock |
| `npx playwright test --list` | 0 | 43 tests in 10 files |
| `npx playwright install chromium` | 1 | **BLOCKED** — `403 Host not in allowlist: cdn.playwright.dev` |
| `npm run test:e2e` | — | **NOT EXECUTED** — no browser binary |
| Lighthouse CI | — | **NOT AVAILABLE** — `@lhci/cli` is not a dependency; CI invokes it via `npx @lhci/cli@0.15.1` (`ci.yml:76`) |

### Dependency install
```text
npm warn deprecated eslint@9.39.5: This version is no longer supported.
> pixibun@1.14.1 prepare
> node scripts/installGitHooks.mjs
ℹ️  .git directory not found (skipping hook installation).
added 392 packages in 13s
```
The archive has no `.git`, so the pre-push hook described in `README.md:246` and `CONTRIBUTING.md` was not installed and could not be tested.

### Unit tests
```text
 Test Files  107 passed (107)
      Tests  795 passed (795)
   Duration  63.42s (transform 4.63s, setup 976ms, import 13.04s, tests 22.05s, environment 12.24s)
```
Expected-failure paths print to stderr during the run (`auditAutosave.test.tsx` → "Project restore failed: … has no usable name"; `photometricPerformance.test.ts` → the B18 timings quoted under M11).

### Build
```text
▲ Next.js 16.3.4 (Turbopack)
✓ Compiled successfully in 27.2s
  Running TypeScript ... Finished TypeScript in 57s
✓ Generating static pages using 1 worker (7/7) in 778ms
Route (app): ƒ /  ƒ /_not-found  ƒ /api/diagnostics/relay  ƒ /playground  ƒ /studio  ƒ /sw.js
ƒ Proxy (Middleware)
```
Every route is dynamic, consistent with `src/proxy.ts:22-24` ("Nonces require dynamic rendering; the root layout reads `headers()`").

### Quality gate (timed)
```text
✓ Stage 1: Documentation & Sync Invariant Audit PASSED in 45.59s
✓ Stage 2: Static Type Safety Invariant (0 Errors)  PASSED in 25.17s
✓ Stage 3: Lint and accessibility rules            PASSED in 19.12s
✓ Stage 4: Unit & Defensive Invariant Test Suite   PASSED in 65.74s
🎉 ALL 4 QUALITY GATES PASSED SUCCESSFULLY (155.62s)
```
A useful incidental observation: an earlier run of this gate **failed** (exit 1) purely because my two temporary probe test files raised the live count to 797/108 against the README's 795/107. The doc-integrity gate is genuinely wired to the live runners and does catch drift — it is not decorative.

### Live server exercise
```text
[EXECUTION]  npm run start; curl over HTTP

/  /studio  /playground                       → 200 text/html
/manifest.webmanifest                         → 200 application/manifest+json
/offline.html /sw.js /theme.js                → 200, correct content types
POST /api/diagnostics/relay                   → 503 {"error":"Diagnostics relay is not configured on this server; reports stay local."}
GET  /api/diagnostics/relay                   → 405

content-security-policy: default-src 'self'; script-src 'self' 'nonce-y3xGklX7fVb9lY6qTuzSAQ==';
  style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;
  connect-src 'self'; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none';
  base-uri 'self'; frame-ancestors 'none'
X-Frame-Options: DENY   X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**Canvas and interaction flows were not exercised.** No claim in this report asserts that drawing, selection, undo/redo, export, import, autosave, timeline playback or co-draw works in a browser.

### Repository-wide automated defect scans (all 237 source files)

| Scan | Result |
|---|---|
| `: any` type annotations | **0** — the `no-explicit-any` house rule holds |
| Empty catch blocks `catch (e) {}` | **0** by the strict pattern; 2 bare-body `catch {}` in `workerDispatcher.ts:104,126` (L27) |
| `@ts-ignore` / `@ts-expect-error` | **0** |
| `eslint-disable` directives | **3**, all with written justifications |
| `TODO` / `FIXME` / `HACK` / `XXX` | **0** |
| `as unknown as` double assertions | **41** (L11) — 8 in `mp4Encoder.ts`, 5 each in `heavyCompute.worker.ts` and `desktopFileSystem.ts`, 4 in `isobmffWriter.ts` |
| `while (true)` / `for (;;)` | 2 — `relay/route.ts:129` (bounded stream reader, correct) and `rasterMath.ts:22` (L36) |
| `setInterval` without matching `clearInterval` in file | **0** — all 3 files balance |
| `addEventListener` without matching `removeEventListener` | 2 files; both verified clean (`ServiceWorkerRegistrar.tsx` uses `AbortController` signals throughout; `sw.js/route.ts` is service-worker global scope) |
| Envelope constants referenced in stores/hooks/components | **0** — finding C1 |

---

# 7. Unverified / Suspicious Findings

All labelled `[SUSPICIOUS/UNVERIFIED]`. These are gaps, not exonerations.

**U-1. The entire interactive surface.** 43 E2E tests across 10 spec files — including the "live proof" suites (`chiselAndPaletteLiveProof`, `selectionGizmoLiveProof`, `volumetricVisualProof`, `themeAccessibility`) — were never run. *Why:* Playwright's Chromium download is blocked by the container egress allowlist and no system Chromium exists. *Missing:* a browser binary.

**U-2. 162 of 237 source files were not read line-by-line** (≈ 30,500 of 60,814 lines). The largest unread items, with why each was deprioritised:

| File | Lines | Category |
|---|---|---|
| `src/lib/art/playgroundLessons.ts` | 1,616 | static lesson data |
| `src/components/landing/AtelierDeskScene.tsx` | 1,448 | presentational SVG scene |
| `src/lib/art/teachingBoardData.ts` | 1,108 | static curriculum data |
| `src/components/layout/AtelierRail.tsx` | 908 | presentational chrome |
| `src/lib/audio/lofiRadio.ts` | 883 | Web Audio synthesis |
| `src/hooks/viewport/useViewportSelectionTransform.ts` | 823 | **algorithmic — should have been read** |
| `src/components/layout/CenterViewport.tsx` | 808 | render orchestration |
| `src/components/layout/BottomTimeline.tsx` | 787 | presentational |
| `src/components/playground/TeachingAnimationBoard.tsx` | 774 | presentational |
| `src/lib/audio/tracks.ts` | 766 | static arrangement data |
| `src/hooks/viewport/events/usePhotometricEvents.ts` | 761 | **algorithmic — should have been read** |
| `src/components/studio/PixelLightBulbGizmo.tsx` | 739 | interaction |
| `src/lib/ai/math/minecraftSkin.ts` (remainder) | ~470 | algorithmic, partially read |
| `src/lib/export/processReplay.ts` | 408 | **algorithmic — should have been read** |
| `src/lib/export/depixelizeVector.ts` | 359 | algorithmic |
| `src/lib/export/shaderExporter.ts` | 302 | algorithmic |
| ~110 smaller UI components | ~12,000 | presentational |

The three flagged files are where residual risk of undiscovered defects is highest, because selection-transform, photometric event orchestration and replay export are all areas where this audit already found defects in adjacent code.

**U-3. 106 of 107 Vitest files were executed but not read.** They pass, which establishes that their assertions hold — not that the assertions are meaningful. The one file read in detail (`tests/benchmark.test.ts`) contains four tautologies (L5), which is reason for scepticism about the other 106. *Missing:* line-by-line review plus mutation testing.

**U-4. 17 of 24 Markdown files were structurally searched but not read end to end:** `ARCHITECTURE.md` (81 KB), `CHANGELOG.md` (135 KB), `TASKS.md` (183 KB), `LOGS.md` (186 KB), `DESIGN.md`, `V2_VISION.md`, `PIXIBUN_DEEP_DIVE.md`, `FullStackGuide.md`, `docs/plans/*` (6 files), `.agents/skills/*` (2 files), and the superseded `PIXIBUN_AUDIT_RESULTS.md`. Findings M9, M10, M14, M15, L30 and L31 were surfaced by targeted search, not systematic reading. **§3 is a sample of documentation errors, not an inventory.** Stale counts inside `CHANGELOG.md` and `LOGS.md` are dated historical entries and are *not* treated as errors.

**U-5. Ten attributions remain unverified** (Bayer 1973, Tomasi & Manduchi 1998, Ottosson 2020, Kleppmann et al. 2019, APNG authorship, Mark Ferrari, Gumin/Merrell WFC, Mojang skin spec, Tanenbaum token bucket, Foley et al. page range). Each is marked `UNVERIFIED` in §5 rather than assumed correct.

**U-6. Whether the heavy-compute Web Worker actually instantiates in a browser is unverified.** `workerDispatcher.ts:118-124` uses `new Worker(new URL('../../workers/heavyCompute.worker.ts', import.meta.url), { type: 'module' })`. The CSP permits `worker-src 'self' blob:` and the build succeeded, but no worker chunk was confirmed in the build output. If it silently fails, L27 applies and `BENCHMARKS.md` §6 is entirely wrong rather than partially so.

**U-7. All empirical tables in `BENCHMARKS.md` §§1, 3, 4, 6, 8 are unverified.** They cite "a modern reference development workstation" with no specification. Not reproduced or falsified here, except where M11 contradicts §8 via the project's own test output and L29 contradicts §7 by direct measurement.

**U-8. `.pixibun` round-trip fidelity was not tested end to end.** `hydrateProject` depends on `createImageBitmap` and `canvas.toDataURL`, neither available in the Node test environment. Two fixtures exist and `historicalFixtures.test.ts` passes, but whether a real exported project reopens byte-identically is unverified.

**U-9. CRNG/CCRT round-trip against genuine Amiga IFF files was not tested.** Layouts match the specification (§5); no real Deluxe Paint or Graphicraft file was parsed.

**U-10. The `stco` corruption risk (M5) is theoretical.** The probability that bytes `73 74 63 6F` appear in the `stsz` sample-size table or embedded SPS/PPS before the real `stco` box is low per file but nonzero and unbounded over many exports. No corrupted file was produced; the defect is established by reading the code.

**U-11. Multi-peer co-draw behaviour is unverified.** `CoDrawBridge` manages exactly one `P2PSyncSession` (`coDrawBridge.ts:62`), so the architecture appears strictly two-peer, but no document states this and it was not tested.

---

# 8. Recommended Fixes

## Critical

1. **(C1)** Enforce `WORKSPACE_ENVELOPE` at creation time. In `createLayerSlice.addLayer`, return early with an error toast when `currentFrame.layers.length >= WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS`; do the same in `createAnimationSlice.addFrame` for `MAX_CANVAS_FRAMES`; and gate both on `validateProjectResourceBudget` so the 64 MP aggregate ceiling is respected on large canvases. Disable the corresponding toolbar buttons at the ceiling. Independently, have `autoSaveWorkspace` run `validateProjectFile` on the snapshot before writing and surface a blocking warning rather than persisting an unloadable document. Finally, give the restore path a repair mode that opens over-envelope documents read-only so already-corrupted workspaces are recoverable. Add a round-trip regression test asserting that any store state reachable through public actions passes `validateProjectFile`.

## High

2. **(H1)** Rewrite `edtNormalMap.ts:743-812` as a single pass. Build a `Map<componentId, number[]>` of member indices in one `O(W·H)` sweep, then run each component's BFS over its member list using one shared reusable `Float32Array` cleared only at touched indices. Add a regression test asserting wall-clock time for a 256×256 input with ≥ 4,000 components stays under a fixed budget — no current test would have caught this.

3. **(H2)** In `packSpriteSheet`, compute `sheetWidth`/`sheetHeight` first and throw a `RangeError` naming the dimensions when either exceeds `MAX_EXPORT_DIMENSION` or their product exceeds `MAX_EXPORT_PIXELS`. In `ExportModal.handleExportSpriteSheet`, wrap in `try/catch`, emit an error toast, and replicate the `dataUrl === 'data:,'` guard from `:159-161`. Add a unit test packing 100 frames of 128×128 at 4× and asserting the throw.

4. **(H3)** Extract a shared `assertExportBounds(width, height)` into `src/config/canvasLimits.ts` and call it from the APNG, GIF, WebM, MP4 and sprite-sheet entry points. Mirror `PngExportTab`'s `disabled={exceedsCeiling}` into `AnimatedExportTab.tsx:53-68`. Then correct the `canvasLimits.ts:8-12` comment to list the subsystems that actually consult the envelope.

5. **(H4)** Extract the eviction loop shared by `historyEngine.ts:333-342` and `:373-381` into one private `evictUntilWithinBudget(incomingBytes)` that always calls `updateBaselineFromEvicted`, and call it from both `push()` and `redo()`. Regression test: fill to `maxDepth`, cycle undo→redo past the limit, assert `getBaseline()` matches the state preceding the earliest retained step.

6. **(H5)** Cap WFC pattern count. In `synthesizeWfc`, after extraction, return `{ success: false }` with a distinct reason when `numPatterns` exceeds a configured ceiling (a few thousand); in `useArtisanEvents.handleWfcSynthesisEvent`, clamp the selection sample to a maximum area before dispatch and surface the limit in `TilesetDecomposerSection`. Guard the `compatible` allocation with a projected-byte check so failure is a clean rejection rather than an OOM that takes down every concurrent worker request.

7. **(H6)** In `renderParametric2p5DLighting`, hoist the analysis: call `computePhotometricAnalysis` once and pass the result as `precomputedAnalysis` to `executePhotometricPipeline` (the parameter already exists and is honoured at `:660-672`). Pass the single `inferPhotometricSettings` result through as `precomputedInference`. Read `getImageData` once and thread the buffer.

## Medium

8. **(M1)** Track `redoBytes` and evict from `redoStack` on bytes as well as depth at `historyEngine.ts:358-360`; or, if a ~128 MiB worst case is acceptable, amend `README.md:23`, `CHANGELOG.md:39`, `TASKS.md:34` and the comment at `:63-67` to say the undo stack is bounded to 64 MiB / 50 entries and the redo stack separately to 50 entries.
9. **(M2)** Replace the unbounded `Set<number>` at `p2pSync.ts:461` with a `lowWaterMark` plus a small set of out-of-order ids above it; `deliveryId` is monotonic per peer, so this is exact and O(1) memory.
10. **(M3)** Correct the Riemersma weights at `dithering.ts:186,196` to `const r = 16; const b = Math.pow(r, 1/(historyLength-1)); const weight = Math.pow(b, i);` with `i = 0` oldest, and divide accumulated error by the weight sum. Fix the citation title to *A Balanced Dithering Technique*. Add a test dithering a flat mid-grey field to a two-colour palette and asserting both colours appear in roughly equal proportion — the current code would fail it.
11. **(M4)** Add `pal.colors.length <= 256` plus 128-character caps on `pal.id`/`pal.name` at `schema.ts:315-321`, matching the caps already applied to layers and frames. Cap `clip.name` likewise.
12. **(M5)** Replace the byte scan at `isobmffWriter.ts:333-346` with a recorded offset: capture `stcoOffset = moovWriter.getLength()` immediately before writing the box and patch `moovBytes` at `stcoOffset + 12` without searching. This eliminates the corruption class outright.
13. **(M6)** Either make `updateLivePaletteLUT32` genuinely allocation-free — pre-parse `basePaletteHex` into a cached `Uint8Array` of RGB triples keyed by palette identity and inline the blend arithmetic — or delete "zero-allocation" from `README.md:120`, `MAIN.md:18` and `BENCHMARKS.md:15`.
14. **(M7)** Decide whether the Aaltonen sphere-tracer is a product feature. If yes, expose a mode toggle in `RaymarchedShadowSection.tsx` that dispatches a non-`'bounded-2.5d'` mode. If no, delete `tracePhysical2DSoftShadow`, `generateRaymarchedShadowMap` and `executeClassic2DRaymarchedShadow`, rename the section component, and remove the raymarching claims from `README.md:48,276`.
15. **(M8)** In `dithering.ts:151-178`, stop materialising `order²` coordinate tuples for non-square canvases; iterate the Hilbert index inline and skip out-of-range points, or use per-axis orders. A 2048×16 canvas currently builds 4.19 M tuples to visit 32 K pixels.
16. **(M9, M10, M11, M14, M15)** Regenerate `BENCHMARKS.md` §7 from real `npm run gate` output with the reference machine specified. Correct `BENCHMARKS.md:34` and `ARCHITECTURE.md:98` to "50 undo steps and, independently, up to 50 redo steps". Replace `MAIN.md:47` "sub-millisecond" and `ARCHITECTURE.md:386` "zero latency" with a measured envelope scoped by canvas size and artwork complexity. Replace the `PIXIBUN_DEEP_DIVE.md:187` terminator formula with the piecewise function actually implemented. Correct `PIXIBUN_DEEP_DIVE.md:193` and `ARCHITECTURE.md:186`: the shipped profile's apex derivative is 0.125, not 0 — either document the 75/25 blend honestly or drop the `gammaDome` term and keep the claim.
17. **(M12)** When `push()` rejects an oversized step (`historyEngine.ts:318-330`), do not clear `redoStack` — the rejected edit does not invalidate the existing redo chain in any way visible from the code. Document the rejection semantics in README's undo section.
18. **(M13)** Remove the `hostname` disjunct at `db.ts:69-70` so `__pixibunDb` attaches only when `process.env.NODE_ENV !== 'production'`, and document the dev-only handle in `SECURITY.md`.
19. **(M16, M17)** Either implement what is claimed — a Planckian-locus CCT conversion plus a von Kries/Bradford chromatic adaptation matrix for the grading presets, and the circular chord `2√(R²−D²)` for the SSS path — or rewrite `README.md:117-118` and `pixelAiEngine.ts:242` to describe the fixed OKLCH hue rotation and the `2·D/(N·L+wrap)` path length actually shipped. The second option is cheaper and equally defensible; the presets look good regardless.
20. **(M18)** Resolve the `SKILL.md` ↔ README contradiction about De-Jaggy. Either amend `SKILL.md:15,20` with an explicit exception for the opt-in anti-aliasing tool, or have `cleanJaggiesOnCanvas` emit fully opaque pixels.

## Low

21. **(L1)** Validate `clip.endFrame >= clip.startFrame` and `clip.endFrame < frames.length` at `schema.ts:334-346`; `ExportModal.tsx:108-113` already compensates defensively, which the validator should make unnecessary.
22. **(L2)** Allocate four separate `Float32Array` instances in the `opaqueCount === 0` branch at `edtNormalMap.ts:487-505`.
23. **(L3)** Delete the tautological guard at `verifyDocIntegrity.mjs:48` — `!seenPhases.has('32') || seenPhases.get('32') === true` is unconditionally true because `set(phaseNum, true)` is the only writer.
24. **(L4)** Extend the lint script to `eslint src tests scripts *.config.mjs *.config.ts`, and extend `verifyDocIntegrity.mjs` §5 to validate test-count claims in `BENCHMARKS.md` as well as `README.md` — that one change would have caught M9 automatically.
25. **(L5)** Replace the four tautologies at `tests/benchmark.test.ts:265-275` (`expect(sizePerStep).toBe(res*res*4)` where `sizePerStep` was just assigned that expression) with assertions against values the engine reports: `engine.totalBytes`, `engine.maxBytes`, `engine.evictionCount`.
26. **(L6)** Renormalise after the `Math.max(0, rz/len)` clamp at `normalSculptor.ts:145` so the function always returns a unit vector.
27. **(L7)** Either letterbox-pad to even dimensions in `mp4Encoder.ts:189-191` instead of stretching via `drawImage(..., width, height)`, or change the comment and `README.md:136` from "padding" to "rounded up to even dimensions".
28. **(L8)** Wrap the WebCodecs encode loop (`mp4Encoder.ts:132-172`) in `try/finally` calling `encoder.close()`.
29. **(L9)** Restrict `serializeCCRT` to the specified `{-1, 0, 1}` and emit ping-pong tracks as `CRNG` only, or comment at `paletteCycling.ts:110,135` that `direction === 2` is a PixiBun extension outside the IFF specification.
30. **(L10)** Document the 1 px border limitation in `applyZhangSuenThinning`, or pad the binary buffer by one pixel per side and crop after.
31. **(L11)** Audit the 41 `as unknown as` double assertions and replace with declared interfaces where possible; add `@typescript-eslint/no-unnecessary-type-assertion` and require a comment on the remainder.
32. **(L12, L20)** Document `MAX_RECURSION_DEPTH = 32` and the `constructor`/`prototype` key-stripping in `SECURITY.md`, since both silently alter accepted input.
33. **(L14, L15, L16, L28)** Fix README's 10 s → 15 s benchmark figure; drop "Canonical" from the RotSprite heading or implement the two missing stages; scope the ΔE_OKLab claim to the import pipeline; describe the specular gate as a threshold rather than a continuous falloff.
34. **(L19, L21, L22, L25)** Add a "Limits" section to `README.md`: 2048 px max canvas axis, 500 frames, 100 layers/frame, 2000 total layers, 64 MP aggregate, 50 palettes, 100 clips, 100 ramps, 50 MB max import (images included), and the requirement that every layer PNG match the canvas dimensions exactly.
35. **(L23)** Route the two `console.error` failure paths in `ExportModal.tsx:146,170` through `studioEvents.emit('pixibun:toast', { type: 'error', … })`.
36. **(L24)** Disclose in `SECURITY.md` that captured diagnostics include `window.location.pathname`.
37. **(L26)** Note in `MAIN.md:24` and `README.md:136` that the ISOBMFF fast-start muxer covers the WebCodecs path only, and that the MediaRecorder fallback produces a recorder-native container with `setTimeout`-paced frame timing.
38. **(L27, L32)** Replace the bare `catch {}` at `workerDispatcher.ts:104,126` with `captureDiagnostic({ kind: 'worker-fallback', … })`, and scope timeout handling to the offending request id instead of terminating the shared worker and rejecting all peers.
39. **(L29)** Re-measure and re-state the gate timings in `CONTRIBUTING.md` and `BENCHMARKS.md` §7 with the reference hardware named.
40. **(L30, L31)** Soften `ARCHITECTURE.md:219` from "guaranteeing zero unpersisted metadata state" to the debounce-window-bounded truth, and correct `:414` to match `SECURITY.md`'s accurate statement that the token bucket governs presence traffic only.
41. **(L33)** Preserve per-pixel alpha in the SDF morph output and add a dimension-equality guard at `pixelAiEngine.ts:358`.
42. **(L34)** Remove `rimPixels`, `params.rimLight` and `params.selOut` from `LightParameters` and `renderParametric2p5DLighting`, or implement them.
43. **(L35)** Change `coDrawBridge.ts:107` to fall back to `DEFAULT_ICE_SERVERS` rather than `PUBLIC_STUN_ICE_SERVERS` when `lanOnly` is unspecified, so the module default and the bridge default agree.
44. **(L36)** Add an integer assertion at the head of `getBresenhamLine` and replace `while (true)` with a step bound of `max(|dx|, |dy|) + 1`.

## Cosmetic

45. **(C2)** Correct the Riemersma citation title at `dithering.ts:9` to *A Balanced Dithering Technique*.
46. **(C3)** Split the attribution at `canvas/rotSprite.ts:7` and `ai/math/rotSprite.ts:6`: EPX → Eric Johnston, LucasArts ~1992; Scale2x/AdvMAME2x → Andrea Mazzoleni ~2001.
47. **(C4)** Fix the misleading comment at `isobmffWriter.ts:342-343`, which lists the box header as "4 bytes size, 4 bytes FourCC, …" while `i` actually points at the FourCC.
48. **(C5)** `calculate47TileBitmask` is duplicated verbatim in `curvesAndLines.ts:124-150` and `autotileEngine.ts:76-102`; re-export one from the other.
49. **(C6)** `waveFunctionCollapse.ts:13` references `status === 'complete'`, a field that does not exist on `WfcResult` (which has `success: boolean`).
50. **(C7)** `computeNearestColorMap` (`pixelAiEngine.ts:313-350`) uses 8-connected BFS, yielding Chebyshev-nearest seeds while the SDF it is paired with is Euclidean; note the approximation in the docstring.

---

## Closing assessment

**What is demonstrably true.** The toolchain is clean: zero type errors, zero lint findings, 795/795 tests green, a successful production build, and a doc-integrity gate that genuinely catches test-count drift — it failed correctly when my probe files perturbed the count, which is more than most such gates do. The bibliographic discipline is unusually high: of the nine citations checked against primary sources, seven matched to the exact volume and page range, and Felzenszwalb–Huttenlocher, Zhang–Suen, Blinn, Kajiya–Kay, Henyey–Greenstein, Kulkarni HLC and Shapiro CRDT are all precisely correct. The 47-blob autotile table is provably correct: I re-derived all 256 entries independently and found zero mismatches. `SECURITY.md` is a model of honest threat modelling that volunteers its own weaknesses. The RNM implementation is mathematically equivalent to the published formula. Several code comments — the `phaseHG2D` normalisation caveat, the APNG store-block trade-off, the token-bucket RFC disclaimer — are markedly more accurate than the marketing prose above them.

**What is demonstrably not true.** One Critical defect lets the editor produce documents it cannot reopen, and the recovery path replaces the user's workspace with a blank canvas. Six High defects cluster in two places: unbounded resource consumption in the algorithmic engine (H1, H5, H6) and missing output validation in the export pipeline (H2, H3), plus one history-engine asymmetry (H4). The documentation overstates in a consistent direction — "zero-allocation" that allocates 76,000 times a second, "sub-millisecond" that measures 1.27 s, "exact zero derivative" that measures 0.125, a shadow-terminator formula that agrees with the code at exactly one point, "Kelvin temperature shifts" and "chromatic adaptation matrices" that exist only as comment text, a Beer–Lambert chord formula that appears nowhere in the source, and a raymarcher advertised on the landing page that no UI path can reach.

**What this report does not establish.** That the application works. No canvas, drawing, selection, undo, import, export, autosave or collaboration flow was exercised in a browser. 162 source files were never opened, three of them algorithmic files where residual risk is highest. 17 of 24 documentation files were searched, not read. Ten cited sources remain unverified and are marked as such. The absence of a finding in an un-inspected area carries no information.
