# PixiBun: Technical, Mathematical & Architectural Reference

Updated 2 October 2026 against the main checkout. This reference describes implemented contracts, not universal performance or accessibility guarantees. [Current status](docs/current-status.md), [architecture](ARCHITECTURE.md) and [dated evidence](docs/research/phase-implementation-status.md) separate shipped behavior from verification and proposals.

# 1. Directory & File Architecture

Next.js 16 / React 19 provide the shell; Zustand + Immer own reactive metadata, Dexie local persistence, and detached canvas buffers own rasters. `src/app` holds routes and CSP-aware hosting; `src/components` the shell, panels, modals and primitives; `src/hooks/studio` lifecycle and keyboard hooks; `src/hooks/viewport` pointer and command handlers. `src/lib` separates canvas/math, color, rendering, history, storage, project admission, export, recovery, sync, diagnostics and research. `src/workers` and encoder workers own bounded background operations.

The photo converter is `pixelizeEngine.ts` (forward-difference salience, OKLab median-cut/Lloyd). Replay is `processReplay.ts`. The compositor reads DOM canvases/registry and excludes editor overlays. The relay is optional and bounded; local diagnostics are enabled by default, transmission opt-in. No audio synthesis engine ships.

# 2. Memory Architecture & Dual-Layer Drawing Pipeline

Pointer handlers map screen coordinates to integer artwork coordinates, mutate owned layer buffers and publish invalidation/history at the appropriate action boundary. Metadata updates and leaf subscriptions avoid putting per-pixel drawing into React state. This reduces unnecessary renders; it does not prove zero allocations or zero latency.

Undo and Redo have independent depth caps of 50 and a combined 64 MiB step-payload budget. Structural operations estimate prior/projected snapshots before mutation. Oversized edits are refused; eviction folds old supported pixel state into Replay's baseline. `putImageData` restoration scales with copied area.

The idle scratch pool allocates on misses, reuses exact-size arrays, clears on acquire and retains on release. It caps each bucket at 16 and all idle arrays at 32 MiB, evicts oldest idle references on pressure and participates in the estimated combined 512 MiB ledger. Checked-out arrays, browser/GPU/codec memory and all object overhead are not a total measured heap. [Ownership contract](docs/contracts/rendering.md).

# 3. Raster, Geometry & Canvas Algorithms

Bresenham stepping and the three-point pixel-perfect filter work on integer coordinates. The 2:1 isometric stepper quantizes dimetric lines. Quadratic Bézier sampling rounds into artwork pixels. Flood fill uses unsigned RGBA words for exact matching and an independent RGBA-distance tolerance for connected fill; its stack is a JavaScript array. Optional enclosed-speck absorption keeps transparent holes and larger/open details.

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

Project format v3 and database schema v5 are distinct. Logical APIs expose Blob rasters; current physical IndexedDB records store ArrayBuffer bytes and `blobType`. Legacy Blob records remain readable. Saves atomically commit metadata/rasters with revision conflict checks. Optional metadata compatibility and rollback limits are in [storage](docs/contracts/storage.md).

The [export matrix](docs/contracts/exports.md) owns format promises. GIF uses palette quantization and centisecond delays. APNG emits valid uncompressed DEFLATE store blocks with RGBA and rational delays, accumulating a Blob rather than exposing a streaming sink. WebM uses captureStream/MediaRecorder; general alpha retention is not promised. MP4 uses H.264 WebCodecs/custom ISOBMFF where available, with a supported MediaRecorder fallback; odd dimensions are padded to even without scaling, not 16×16 alignment.

Replay reconstructs retained session history plus an eviction baseline; it is not a permanent command recording from blank. Sheets and engine resources use shared animation pose/hold metadata. Target consumer qualification is format/version specific; a named Godot fixture result does not establish every Unity/Phaser importer or shader. Previously damaged GIFs need re-export after the dictionary-reset correction.

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

Exact quarter turns permute source RGBA. Arbitrary turns combine an 8× Scale2x cascade, inverse sampling and PixiBun's parabolic majority vote; the canonical offset-search/detail-restoration stages are not implemented. Arbitrary raster turns can lose details and are operation-bounded.

Vector depixelization uses local graph/diagonal resolution, shifted contour points and Bézier output inspired by Kopf–Lischinski. It is not the full published algorithm or guaranteed pixel-identical export. Attribution distinguishes Johnston's EPX from Mazzoleni's Scale2x implementation.

# 14. Viewport Lenses, Accessibility & Direct Hotkeys

Squint makes every nontransparent pixel `#140C1E`, preserves alpha and displays it over white; it is not black/white luminance thresholding. It supersedes CVD when both are enabled. CVD uses Machado–Oliveira–Fernandes severity-1 matrices in linear RGB (decode/transform/encode) and a Rec.709 grayscale aid. Both are display-only and leave source/exports unchanged. [Color-domain reference and implementation](docs/contracts/rendering.md).

[Shortcuts](docs/contracts/shortcuts.md) is the current contract: E Eraser, Space playback, Ctrl/Cmd+Z Undo, middle/supported Alt-drag pan, Ctrl/Cmd+S local save, Shift save-as-file. Help opens through Studio or ?. Automated accessibility scans cover their scanned rules/states; manual assistive technology and full WCAG qualification remain pending.

# 15. Modern Studio Shell & Design System Primitives Architecture

AtelierRail keeps a single desktop header row at tested widths. File groups Projects/New/Import/Canvas size; Studio groups appearance/Co-Draw/Help. Save/history/drawing/Export remain direct. BottomTimeline, RightInspector, StatusBar and command palette have separate responsibilities; lifecycle hooks coordinate storage, clipboard, native file access and keyboard state.

StudioSlider/Select/Toggle/NumberInput/Tooltip/IconButton/PanelSection provide shared tokens, focus and semantics. Their use is not automatic WCAG conformance. Design tokens and interaction intent are in [DESIGN.md](DESIGN.md); observed layouts and automated workflow scope are dated evidence, not artist-study results.

# 16. Teaching Animation Board & Discrete Jump Physics Engine

Playground/Teaching Animation Board provide Bun/Gel Slime construction, staged examples, jump timing and palette variants. Timeline injection is a project action whose safety must be verified; content existence does not establish an isolated lesson sandbox. [Learning contract](docs/contracts/learning.md) separates visited/skipped/verified progress and proposed measurement from completed participant work.

# 17. Smart-Effect Recipe Architecture & Non-Destructive Workflow

Legacy `LayerEffectRecipe` carries recognized kinds and bounded generic parameter containers. It does not reject every per-kind semantic key/range or guarantee every feature is editable/recomputable. Supported Edit FX tools reload controls; baked output remains a raster. History and serialization retain supported provenance, while merges/transforms can detach it.

Canonical research recipes are separate versioned settings with source/normal SHA-256 fingerprints, owned worker results, bounded inputs and stale-source rejection. Preview retains original pixels; Apply publishes ready buffers and one admitted structural history step. Cancel/refusal leaves the project unchanged. Animation review regions/exceptions and palette registers are their own optional metadata contracts. [Rendering and ownership](docs/contracts/rendering.md), [issue/evaluation registry](docs/research/issue-registry.md).
