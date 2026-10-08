# PixiBun: Technical, Mathematical & Architectural Reference

Reconciled 7 October 2026 against the local checkout. This reference describes implemented contracts, not universal performance or accessibility guarantees. [Current status](docs/current-status.md), [architecture](ARCHITECTURE.md) and [dated evidence](docs/research/phase-implementation-status.md) separate implemented behavior from verification and proposals.

## Contents

- [1. Directory & File Architecture](#1-directory--file-architecture)
- [2. Memory Architecture & Dual-Layer Drawing Pipeline](#2-memory-architecture--dual-layer-drawing-pipeline)
- [3. Raster, Geometry & Canvas Algorithms](#3-raster-geometry--canvas-algorithms)
- [4. PixiBud 2.5D Photometric Studio](#4-pixibud-25d-photometric-studio)
- [5. 3D Minecraft Skin Recognition & Dedicated Shading](#5-3d-minecraft-skin-recognition--dedicated-shading)
- [6. Signed Distance Field (SDF) In-Between Animation Morphing](#6-signed-distance-field-sdf-in-between-animation-morphing)
- [7. Image-to-Pixel Synthesis (`pixelizeEngine.ts`)](#7-image-to-pixel-synthesis-pixelizeenginets)
- [8. Storage, Serialization & Game Engine Exports](#8-storage-serialization--game-engine-exports)
- [9. Bounded 2.5D Sprite Cast Shadows & Ground Drop Shadows (`shadowRayMarcher.ts`)](#9-bounded-25d-sprite-cast-shadows--ground-drop-shadows-shadowraymarcherts)
- [10. 2.5D Normal Sculptor & Reoriented Normal Mapping (`normalSculptor.ts`)](#10-25d-normal-sculptor--reoriented-normal-mapping-normalsculptorts)
- [11. Mark Ferrari 8-Bit Dynamic Palette Cycling (`paletteCycling.ts`)](#11-mark-ferrari-8-bit-dynamic-palette-cycling-palettecyclingts)
- [12. Bitwise Buffer Normalization, Hot-Path Viewport Decoupling & Export Safety](#12-bitwise-buffer-normalization-hot-path-viewport-decoupling--export-safety)
- [13. RotSprite-Inspired Rotation & Vector Depixelization](#13-rotsprite-inspired-rotation--vector-depixelization)
- [14. Viewport Lenses, Accessibility & Direct Hotkeys](#14-viewport-lenses-accessibility--direct-hotkeys)
- [15. Modern Studio Shell & Design System Primitives Architecture](#15-modern-studio-shell--design-system-primitives-architecture)
- [16. Teaching Animation Board & Discrete Jump Physics Engine](#16-teaching-animation-board--discrete-jump-physics-engine)
- [17. Smart-Effect Recipe Architecture & Non-Destructive Workflow](#17-smart-effect-recipe-architecture--non-destructive-workflow)

# 1. Directory & File Architecture

Next.js 16 / React 19 provide the shell; Zustand + Immer own reactive metadata, Dexie local persistence, and detached canvas buffers own rasters. `src/app` holds routes and CSP-aware hosting; `src/components` the shell, panels, modals and primitives; `src/hooks/studio` lifecycle and keyboard hooks; `src/hooks/viewport` pointer and command handlers. `src/lib` separates canvas/math, color, rendering, history, storage, project admission, export, recovery, sync, diagnostics and research. `src/workers` and encoder workers own bounded background operations.

The photo converter is `pixelizeEngine.ts` (forward-difference salience, OKLab median-cut/Lloyd). Replay is `processReplay.ts`. The compositor reads DOM canvases/registry and excludes editor overlays. The relay is optional and bounded; local diagnostics are enabled by default, transmission opt-in. No audio synthesis engine ships.

# 2. Memory Architecture & Dual-Layer Drawing Pipeline

Pointer handlers map screen coordinates to integer artwork coordinates, mutate owned layer buffers and publish invalidation/history at the appropriate action boundary. Metadata updates and leaf subscriptions avoid putting per-pixel drawing into React state. This reduces unnecessary renders; it does not prove zero allocations or zero latency.

Undo and Redo have independent depth caps of 50 and a combined 64 MiB step-payload budget. Structural operations estimate prior/projected snapshots before mutation. Oversized edits are refused; eviction folds old supported pixel state into Replay's baseline. `putImageData` restoration scales with copied area.

The idle scratch pool allocates on misses, reuses exact-size arrays, clears on acquire and retains on release. It caps each bucket at 16 and all idle arrays at 32 MiB, evicts oldest idle references on pressure and participates in the estimated combined 512 MiB ledger. Checked-out arrays, browser/GPU/codec memory and all object overhead are not a total measured heap. [Ownership contract](docs/contracts/rendering.md).

# 3. Raster, Geometry & Canvas Algorithms

Bresenham stepping and the three-point pixel-perfect filter work on integer coordinates. Iso Line ON uses the projected 2:1 stepper; FREE uses the ordinary clipped line. Preview and commit read the same mode and brush/symmetry settings. Quadratic Bézier sampling rounds into artwork pixels. Flood fill uses unsigned RGBA words for exact matching and an independent RGBA-distance tolerance for connected fill; its stack is a JavaScript array. Optional enclosed-speck absorption keeps transparent holes and larger/open details.

Color Replace and Erase Sampled Color use their own matching/scope rules, respect supported selections and locks, and preserve one admitted history action. De-Jaggy deliberately introduces intermediate OKLab colors; it is an explicit smoothing exception. Canvas dithering uses RGB nearest-color comparisons; image conversion uses OKLab.

# 4. PixiBud 2.5D Photometric Studio

The separable Felzenszwalb–Huttenlocher transform is linear in raster pixel count. Heightmap inference, morphology, smoothing and lighting add their own work; the complete workflow is not established as sub-millisecond by that complexity bound.

The dome blends a spherical term and gamma term (0.75/0.25); it has a nonzero apex slope. Character base height combines macro-form and material detail. Appendage inference/boosts and caches can depend on light direction, so all geometry is not universally azimuth-independent. Anatomical/material classification is heuristic.

The screen-space light uses compass azimuth (0° top, 90° right). Tangent-map green convention is converted where needed. The chisel rounds normalized components to bytes; a flat normal maps to `(128,128,255)`.

Cel ramps preserve authored hue/chroma subject to conversion/gamut behavior and use lightness floors/minimum drops: mid shadow `max(0.04,min(0.86L,L-0.025))`, deep `max(0.02,min(0.72L,L-0.05))`, soft `max(0.05,min(0.93L,L-0.015))`. Thresholds depend on directional diffuse, exposure and cavity settings; no fixed percentage of every artwork is guaranteed lit.

The current bulb's Off/Soft/Crisp glints are a GGX-shaped, two-level stylized adaptation with a bright core and shoulder, light-facing mask, ink/alpha protection and painted-normal priority. Legacy Blinn–Phong pill code is separate. The bounded shared-light research renderer is another path. Bulb previews are scheduled with requestAnimationFrame, can cache analysis and commit a fresh final pass; scheduling is not a guaranteed frame rate. [Glint evidence](docs/research/specular-glint-2026-10-01.md), [rendering contract](docs/contracts/rendering.md).

# 5. 3D Minecraft Skin Recognition & Dedicated Shading

The detector admits 64×64 / 64×32 candidates and examines connected topology, limbs and void regions before selecting cuboid UV normals. Void pollution of at least 25% rejects PixiBun's classification; it is not a Mojang skin-validity requirement. Auto/On/Off controls let the artist override the heuristic. The UV path's half-Lambert/material shading differs from inferred 2.5D sprite shape.

# 6. Signed Distance Field (SDF) In-Between Animation Morphing

`pixelAiEngine.ts` interpolates distance fields using the requested fraction and maps colors through multi-source propagation. The color map's 8-connected nearest-seed choice is not a general exact Euclidean color-search guarantee. Generation works within operation bounds, accepts compatible frame geometry and publishes only admitted results. Refusal/cancellation must leave the original frame untouched. It is not learned optical flow or general semantic pose reconstruction.

# 7. Image-to-Pixel Synthesis (`pixelizeEngine.ts`)

The pipeline uses linear-light area box downsampling with 2×2 forward-difference gradient salience, OKLab median-cut initialization and four Lloyd refinement iterations, then supported ordered/error-diffusion dithering. It is not Sobel/K-Means++. Corner background-keying is a heuristic with artist-controlled tolerance.

This is different from palette authoring's at-most-six representative source-color summary and import swatch extraction. A summary is not exact color enumeration or automatic artwork recoloring. [Palette implementation](docs/research/palette-creator-2026-10-01.md).

# 8. Storage, Serialization & Game Engine Exports

Project format v4 and database schema v5 are distinct. Logical APIs expose Blob rasters; current physical IndexedDB records store ArrayBuffer bytes and `blobType`. Legacy Blob records remain readable. Saves atomically commit metadata/rasters with revision conflict checks. Optional metadata compatibility and rollback limits are in [storage](docs/contracts/storage.md).

The [export matrix](docs/contracts/exports.md) owns format promises. GIF uses palette quantization and centisecond delays. APNG uses native deflate compression where supported and falls back to uncompressed DEFLATE store blocks, with RGBA and rational delays. Preparation/encoding yield between frames and support cancellation; the result is accumulated into a Blob rather than exposed as a streaming sink. WebM uses captureStream/MediaRecorder; general alpha retention is not promised. MP4 uses H.264 WebCodecs/custom ISOBMFF where available, with a supported MediaRecorder fallback; odd dimensions are padded to even without scaling, not 16×16 alignment.

Replay reconstructs retained session history plus an eviction baseline; it is not a permanent command recording from blank. Sheets and engine resources use shared animation pose/hold metadata. Target consumer qualification is format/version specific; a named Godot fixture result does not establish every Unity/Phaser importer or shader. Previously damaged GIFs need re-export after the dictionary-reset correction.

Godot normal export shares `normalLayers.ts` admission for exactly one neutral manual Normal Facets or baked Normal Map/effect layer per frame. Hidden sources are accepted; visible normals are excluded from the diffuse atlas. Stored channels are preserved without an automatic convention flip. Ambiguous, faded or non-Normal blended sources refuse export.

`tilesetBundle.ts` snapshots the selected raw layer, deduplicates exact RGBA tiles after hash bucketing and packages a matching PNG/PixiBun JSON/Tiled map ZIP. Source dimensions must divide by 8/16/32 px, with at most four million pixels and 4096 source cells. Publication checks source revisions/generations; component ownership prevents returning to an earlier key from reviving a released bundle. Cancel, missing sources, PNG failure/timeout and stale work release reservations. These are bounded native-layer tiles, without composite baking, flip/rotation merging or a general engine tilemap adapter. [Contract and guide](docs/contracts/exports.md#unique-tile-bundle).

# 9. Bounded 2.5D Sprite Cast Shadows & Ground Drop Shadows (`shadowRayMarcher.ts`)

Cast shadows project occupied sprite pixels with bounded sheared ground coordinates; sub-step sampling avoids some gaps. Drop shadows render authored ellipse/contact styles. No-dither opacity is a uniform quantized value; optional Bayer stippling is separate. Internal cone/ray helpers are not all active UI features. Source/display bounds and transparent holes remain regression contracts rather than proof of physical shadow reconstruction.

# 10. 2.5D Normal Sculptor & Reoriented Normal Mapping (`normalSculptor.ts`)

Directional chisel normals use compass heading/slope and normalized vector encoding `round((N+1)*127.5)`, with selectable green-channel convention. RNM rotates detail into the base frame using the shortest-arc construction; degenerate vector handling is implemented. Existing normal layers remain usable. Rivet Stamp and its N shortcut are retired. A target engine can require +Y/−Y conversion.

# 11. Mark Ferrari 8-Bit Dynamic Palette Cycling (`paletteCycling.ts`)

CRNG and CCRT parsers retain classic binary formats; PixiBun's CCRT direction 2 ping-pong is a nonstandard extension. CPU packed LUT remapping avoids per-pixel allocations, but palette parsing/LUT recomputation still allocate. Ping-pong uses period `2(S-1)` with supported singleton handling. Rational retuning aligns supported cycles to selected loop length; source shades outside active tracks remain byte-exact in the CPU and generated-frame paths.

First/Last track bounds and sampling FPS are distinct from cycle speed. Indexed shader register identity has separate transparency/palette constraints. See [cycle scope](docs/research/palette-cycle-scope-2026-10-01.md) and [export timing](docs/research/palette-cycle-export-2026-10-01.md). 60 FPS is a target; old microbenchmarks lack complete reproducibility metadata.

# 12. Bitwise Buffer Normalization, Hot-Path Viewport Decoupling & Export Safety

Signed JavaScript packed RGBA words are converted with `>>> 0` for equality against unsigned array views; views honor byte offsets/alignment. Cursor HUD invalidation is isolated from the main viewport component. These are specific optimizations, not universal zero-render/allocation claims.

Export geometry admits at most 4096 per axis / 16,777,216 pixels, with additional aggregate raw-frame and combined memory reservations. Bounds reduce risk and do not guarantee absence of browser OOM. Downloads use owned object-URL lifetimes; inspect the individual export/backup path rather than assuming all revoke on the same timer. MP4 odd dimensions pad to even values.

# 13. RotSprite-Inspired Rotation & Vector Depixelization

Quarter turns use direct pixel-center mappings within requested output bounds. RotSprite v2 arbitrary turns combine an 8× Scale2x cascade, inverse sampling, weighted voting, bounded fractional-offset candidate search, structural scoring and small color-component/contour restoration heuristics. The source-size-dependent search evaluates nine, five or one candidate; its penalties are not proofs of semantic feature or topology preservation. Paeth is a separate integer-sampled three-shear variant. Fractional source alpha is supported; this is not a universal binary-alpha renderer. See the [current rotation contract](docs/contracts/rendering.md#pixel-art-rotation-rotsprite-v2) and [measured scope](docs/research/2026-10-07-piximotion-cross-phase-hardening.md).

Vector depixelization uses local graph/diagonal resolution, shifted contour points and Bézier output inspired by Kopf–Lischinski. It is not the full published algorithm or guaranteed pixel-identical export. Attribution distinguishes Johnston's EPX from Mazzoleni's Scale2x implementation.

One selected detail or whole color layer can retain Start/End/pivot settings, preview a rigid arc in a dedicated worker and asynchronously stage cels for one admitted structural Undo action. The engine, saved-rig format and panel share 2–30-pose limits; precise numeric controls and separate bounded session Undo/Redo edit parameters without copying raster data. Saved format-v4 rigs retain bounded settings/mask runs and a source fingerprint; Open validates the original source, selects its frame/layer and End pose, and stops playback atomically. Floating selection, normal-tagged or normal-map-effect sources and active Co-Draw are refused. Multi-part motion and source rebinding remain open. [Current rig contract](docs/contracts/storage.md), [phase review](docs/research/2026-10-07-piximotion-cross-phase-hardening.md).

# 14. Viewport Lenses, Accessibility & Direct Hotkeys

Squint makes every nontransparent pixel `#140C1E`, preserves alpha and displays it over white; it is not black/white luminance thresholding. It supersedes CVD when both are enabled. CVD uses Machado–Oliveira–Fernandes severity-1 matrices in linear RGB (decode/transform/encode) and a Rec.709 grayscale aid. Both are display-only and leave source/exports unchanged. [Color-domain reference and implementation](docs/contracts/rendering.md).

[Shortcuts](docs/contracts/shortcuts.md) is the current contract: E Eraser, Space playback, Ctrl/Cmd+Z Undo, middle/supported Alt-drag pan, Ctrl/Cmd+S local save, Shift save-as-file. Help opens through Studio or ?. Automated accessibility scans cover their scanned rules/states; manual assistive technology and full WCAG qualification remain pending.

# 15. Modern Studio Shell & Design System Primitives Architecture

AtelierRail keeps a single desktop header row at tested widths. File groups Projects/New/Import/Canvas size; Studio groups appearance/Co-Draw/Help. Save/history/drawing/Export remain direct. BottomTimeline, RightInspector, StatusBar and command palette have separate responsibilities; lifecycle hooks coordinate storage, clipboard, native file access and keyboard state.

StudioSlider/Select/Toggle/NumberInput/Tooltip/IconButton/PanelSection provide shared tokens, focus and semantics. Their use is not automatic WCAG conformance. Design tokens and interaction intent are in [DESIGN.md](DESIGN.md); observed layouts and automated workflow scope are dated evidence, not artist-study results.

# 16. Teaching Animation Board & Discrete Jump Physics Engine

Desktop Playground uses an isolated `PracticeWorkspace`: checkpoint the original through the save coordinator, detach its pixels/metadata/native association/history, then start practice under a fresh identity. Return restores the in-memory original; Keep confirms a separate save before adopting practice. Refresh restores the saved original through normal admission, without session history or OS handles. Practice has no autosave, and active Co-Draw or failed custody admission blocks entry. Below 1024 px only Pocket mounts.

The Teaching Animation Board provides Bun/Gel Slime construction, staged examples, jump timing and palette variants. In Playground, its timeline injection acts on practice; the Studio entry acts on the current project and uses ordinary admission/history. An outline score or a visited step is not measured learning. [Learning contract](docs/contracts/learning.md), [artist guide](docs/guides/learning-and-playground.md) and dated phase records separate implementation from participant outcomes.

# 17. Smart-Effect Recipe Architecture & Non-Destructive Workflow

Legacy `LayerEffectRecipe` carries recognized kinds and bounded generic parameter containers. It does not reject every per-kind semantic key/range or guarantee every feature is editable/recomputable. Supported Edit FX tools reload controls; baked output remains a raster. History and serialization retain supported provenance, while merges/transforms can detach it.

Canonical research recipes are separate versioned settings with source/normal SHA-256 fingerprints, owned worker results, bounded inputs and stale-source rejection. Preview retains original pixels; Apply publishes ready buffers and one admitted structural history step. Cancel/refusal leaves the project unchanged. Animation review regions/exceptions and palette registers are their own optional metadata contracts. [Rendering and ownership](docs/contracts/rendering.md), [issue/evaluation registry](docs/research/issue-registry.md).
