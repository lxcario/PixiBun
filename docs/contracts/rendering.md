# Rendering, recipes and resource ownership

## Source, display and generated output

Raster canvases live in [bufferRegistry.ts](../../src/lib/engine/bufferRegistry.ts). Store metadata, history and raster ownership must move together on supported structural actions. [compositor.ts](../../src/lib/render/compositor.ts) reads DOM canvases and registry state; it excludes grid, onion skin and selection chrome. It is overlay-free, not DOM-free or mathematically pure.

Fresh output is the default. `targetCanvas` takes precedence; `freshCanvas: false` reuses a shared mutable canvas. Callers retaining multiple frames must use independent outputs. Copying `ImageData` with `putImageData` scales with pixel area; only selecting a stored snapshot/reference is constant-time.

Raster artwork supports fractional alpha. The legacy Clean Jaggies operation fills eligible staircase gaps with alpha 160 and averaged color; it is not a binary-alpha cleanup algorithm. The current inspector previews those changes before Apply. Alpha preservation in lighting/lenses is operation-specific and must not be generalized to every artwork-changing tool.

## Memory ownership

| Owner/boundary | Policy and exclusions |
| --- | --- |
| Raster registry | Tracks selected detached raster backing estimates |
| Undo/Redo | Independent 50-step caps; combined 64 MiB retained-step budget; replay baseline accounted separately |
| Collaboration | Tracks application-owned retained sync state/queues |
| Idle scratch pool | Exact-size Float32/Int32 reuse, up to 16 per bucket and 32 MiB globally; oldest idle buffers evicted on pressure; empty buckets removed; registered in combined ledger |
| Operations | Reserve before allocation and release on completion/failure/cancellation/deadline in supported paths |
| Excluded/estimated | Checked-out scratch arrays outside separately reserved operations, JS object overhead, GPU/browser surfaces, codecs, decoder copies and caches are not a complete measured heap |

The combined ledger has a 512 MiB admission limit for estimated registered owners/reservations. Pool misses allocate; acquire clears reused buffers; release retains without clearing. Duplicate releases, partial backing views, empty and oversized buffers are refused; `clearBufferPool()` drops idle references and does not invalidate active callers. Reuse reduces allocation, not all garbage collection. Pool budgets are per JavaScript realm; a worker's ledger is not a global cross-worker heap measurement.

## Lighting and normals

Current bulb **Off/Soft/Crisp** glints use a stylized GGX-shaped response quantized into a core and shoulder. It is not a full physically based BRDF. Legacy Blinn–Phong pill code and the small shared-light research renderer are separate modes. Preserve ink, alpha and painted-normal priority; qualify on actual artwork rather than only changed bytes.

The content-aware base combines macro-form and material-scale height; appendage boosts/cache inference can depend on light direction. Do not promise all geometry is invariant with azimuth. Dome profiles have a nonzero apex slope; blend weights and normal rounding follow the implementation. The current cel ramp uses shadow/deep factors 0.86/0.72 with lightness floors/minimum drops. Geometry heuristics, material presets and anatomical labels are estimates, not recovered physical shape/material.

The chisel encodes normalized tangent vectors using `round((N+1)*127.5)`. OpenGL convention is +Y up; light direction math uses screen +Y down where appropriate. See [normalSculptor.ts](../../src/lib/art/normalSculptor.ts) and [photometricLighting.ts](../../src/lib/ai/math/photometricLighting.ts). Minecraft topology rejects void pollution at 25%; this is PixiBun's heuristic, not a Mojang validity rule.

## Color, lenses and conversion

Image conversion uses 2×2 forward-difference gradient salience, linear-light area downsampling, OKLab median-cut centroids and Lloyd refinement. The at-most-six canvas palette scan selects representative source shades; it neither recolors artwork nor establishes exactly six source colors. Canvas dither tools and image-converter color matching have different distance metrics.

The CVD lens uses Machado–Oliveira–Fernandes severity-1 matrices on **linear RGB**: decode sRGB, multiply/clamp, encode sRGB. SVG uses `color-interpolation-filters="linearRGB"` for the same display transform. The [colorspace authors' implementation documentation](https://zeileis.codeberg.page/colorspace/reference/simulate_cvd.html) explains the linear-domain correction to earlier gamma-encoded illustrations. Matrix simulation is a design aid, not a clinical prediction or accessibility certification. Monochromacy is a Rec.709 linear-luminance grayscale aid.

Squint maps every nontransparent pixel to `#140C1E`, preserves alpha and displays it over white. It is a silhouette aid, not thresholded black/white luminance. Squint takes precedence over CVD. Both leave source/export pixels unchanged. See [cvdLens.ts](../../src/lib/color/cvdLens.ts), [SVG definitions](../../src/components/studio/ViewportLensFilters.tsx).

## Recipes, workers and publication

Legacy `LayerEffectRecipe` describes provenance with generic bounded parameters; only supported tools reopen/recompute it. Research recipes have their own parser, bounds and source/normal SHA-256 fingerprints. Loading, transforming or merging can detach provenance when it no longer describes one source. Older readers can omit optional fields.

Try a new look supports bounded protected simplification, shared light and small scenes: at most 256 px/axis, 16 frames, 262,144 source pixels; at most 16 tiles / 20,000 search states for scenes. Original remains unchanged before Apply. Worker result publication checks ownership/generation/source freshness, publishes ready buffers, then records one structural history step. Cancel, stale results and refusal must not replace artwork.

| Operation family | Worker and fallback contract |
| --- | --- |
| GIF | Worker transfer owns cloned frame buffers; supported fallback rebuilds from owned input after worker failure |
| Heavy math (EDT/normal/rotation/morph/WFC) | Dispatcher deadlines/cancellation; supported synchronous fallbacks can block the UI and are not equivalent to continuous cancellation |
| Animation review | Bounded scan worker, source freshness and intentional exceptions; metrics can flag deliberate changes |
| Research | Owned bounded worker and deadline; stale/cancelled output refused; recipes retain source fingerprints |

See [worker dispatcher](../../src/lib/engine/workerDispatcher.ts), [recipes](../../src/lib/research/recipes.ts), [phase evidence](../research/phase-implementation-status.md). Fallback availability and cancellation differ by operation; one worker policy must not be generalized to all families.
