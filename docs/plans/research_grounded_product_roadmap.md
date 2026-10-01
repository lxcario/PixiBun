# PixiBun research-grounded product roadmap

> **Implementation reconciliation — 2026-10-01:** The separate six-phase codebase audit implemented protected previews and source-change detection, animation review, semantic palette/game delivery and small shared-light/tile research workflows. This is partial progress toward the roadmap below, not completion of its broader Effect Inspector, depth inference, collaboration or world-generation requirements. See the [phase report](../research/phase-implementation-status.md) and [session completion record](../research/session-completion-2026-10-01.md).

This plan treats PixiBun as a pixel-art workstation, not a collection of one-click filters. Every generated result should be understandable, editable, repeatable, and portable with the project.

## Design principles

1. **Separate source, interpretation, and result.** A tool must not quietly feed its own baked output back into the next analysis pass. Source pixels, inferred geometry/material, user overrides, and the generated raster cache are distinct pieces of state.
2. **Keep authored intent visible.** Automatic analysis must report what it detected, the strength of the evidence, and which values the artist can override. Heuristics must not be presented as calibrated confidence.
3. **Make generation reversible.** Generated layers carry a versioned recipe. Reopening a supported recipe restores its controls; undo/redo and save/load move the recipe with its raster output.
4. **Prefer pixel-stable algorithms.** Nearest-neighbour sampling, integer-aligned masks, bounded palettes, deterministic seeds, and explicit alpha semantics are defaults rather than cleanup steps.
5. **Stay local-first.** The complete project remains usable offline and user-owned. Collaboration synchronizes structured intent as well as pixels.
6. **Measure the visible result.** Performance counters and mathematical invariants matter, but acceptance also requires artist-visible checks such as light-following shadows, stable silhouettes, palette preservation, and animation coherence.

## Research basis

- Richard Szeliski's [Computer Vision: Algorithms and Applications, 2nd ed.](https://szeliski.org/Book/) provides the core model for image formation, filtering, segmentation, feature measurement, and separating reflectance from illumination. PixiBun should use these ideas conservatively at pixel-art scale: reliable local estimates and explicit uncertainty, not invented semantic anatomy.
- Liu et al., [Unsupervised Learning for Intrinsic Image Decomposition From a Single Image (CVPR 2020)](https://openaccess.thecvf.com/content_CVPR_2020/html/Liu_Unsupervised_Learning_for_Intrinsic_Image_Decomposition_From_a_Single_Image_CVPR_2020_paper.html), and Laffont et al., [Intrinsic Decomposition of Image Sequences From Local Temporal Variations (ICCV 2015)](https://openaccess.thecvf.com/content_iccv_2015/papers/Laffont_Intrinsic_Decomposition_of_ICCV_2015_paper.pdf), reinforce that separating reflectance from illumination is underconstrained. PixiBun therefore labels its estimate a directional cue, uses a smooth evidence score rather than a probability, and makes removal of painted shading an explicit adjustable control.
- Akers et al., [Conveying Shape and Features with Image-Based Relighting](https://graphics.stanford.edu/papers/ib-relighting/), motivates independent lighting controls and spatial light mattes. For PixiBun this maps to separate lighting, shadow, rim, and material layers whose recipes can be edited independently.
- Stanford's [Digital Compositing](https://graphics.stanford.edu/courses/cs248-01/comp/comp.html) notes and Porter–Duff compositing model ground predictable alpha handling. All preview, merge, export, and worker paths should agree on straight versus premultiplied alpha and blend order.
- Akenine-Möller et al., [Real-Time Rendering, 4th ed. resources and bibliography](https://www.realtimerendering.com/) guide material response, sampling, temporal coherence, and performance trade-offs. PixiBun should adapt these models into deliberately quantized, artist-controlled pixel ramps rather than chase photorealism.
- Kleppmann et al., [Local-first software](https://www.inkandswitch.com/essay/local-first/) supports offline ownership, instant local interaction, and collaboration as replication rather than a server dependency.
- Kleppmann et al., [A highly-available move operation for replicated trees](https://martin.kleppmann.com/2021/10/07/crdt-tree-move-operation.html), is the reference for eventually making concurrent frame/layer reordering converge without corrupting the tree.
- The browser platform's [OffscreenCanvas 2D worker API](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvasRenderingContext2D) supports moving bounded image work away from the interaction thread, with deterministic synchronous fallbacks where unavailable.

## Phase A — trustworthy generated layers

Status: foundation implemented.

- Add versioned smart-effect recipes to generated layers.
- Persist recipes in `.pixibun` schema v3, autosave, duplicate, undo/redo, and co-draw structure synchronization.
- Show recipe provenance and key parameters in the Layers panel.
- Reopen photometric recipes with their saved bulb, material, form interpretation, cavity, and dither settings.
- Expose automatic photometric detection: form, material, inferred source light, directional-cue strength, and rationale.
- Remove fixed head/neck/torso shading priors. Use neutral silhouette geometry and palette/material evidence so light-dependent tones move with the bulb.

Artist-visible acceptance:

- Moving the bulb changes every light-dependent shade; no fixed purple band remains in place.
- Cancel restores the exact prior raster and recipe.
- Undo/redo restores pixels and recipe together.
- Save, reopen, duplicate, and co-draw retain recipe metadata.
- Generated layers are visibly identified without pretending every recipe is already interactively editable.

## Phase B — unified effect editing

- Add a compact Effect Inspector shared by lighting, cast/ground shadows, specular, selective outline, optics, autotile contours, and WFC.
- Standardize every generator around `analyze → preview → commit/cancel`.
- Add per-effect source selection: active layer, visible composite excluding self, or selection.
- Display dependencies and stale state. When a source layer changes, mark the result “needs refresh” instead of silently regenerating or using stale pixels.
- Add “Bake and detach” as an explicit action that removes the recipe but keeps the raster.
- Add deterministic seeds and recorded sample bounds for stochastic tools.

Artist-visible acceptance:

- No one-click generator irreversibly hides its settings.
- Preview never mutates source pixels.
- Refreshing an unchanged deterministic recipe is byte-stable.
- Missing/changed sources produce a clear stale-state message rather than a misleading output.

## Phase C — lighting, depth, and materials

- Replace single inferred height with a confidence-weighted stack: alpha-distance bevel, internal-line evidence, optional artist normal map, and manual depth strokes.
- Separate albedo estimation from source illumination using bounded ratio-image normalization. Preserve hue families and authored clusters while removing directional value bias.
- Add local light masks inspired by image-based relighting: artists can paint where key, fill, rim, or highlight contributions apply.
- Make cast shadows depend on a shared light object so bulb movement updates lighting, specular, and shadow previews consistently.
- Add material response visualization showing diffuse, specular, Fresnel/rim, cavity, and transmission contributions before palette quantization.
- Apply cel-tone hysteresis during bulb drag to prevent pixels flickering between adjacent bands.

Artist-visible acceptance:

- A four-direction light sweep moves the terminator continuously around the silhouette.
- Flat art remains flat unless the artist or evidence supplies depth.
- Manual normals/depth always override inference locally.
- Dark palettes stay monotonic: shadow is never lighter than base unless explicitly chosen.
- Shadow, highlight, rim, and cast shadow agree on light direction.

## Phase D — pixel geometry and cleanup

- Give rotation, scaling, pixelization, outline, stray removal, and jaggie cleanup preview/commit sessions with a protected-original comparison.
- Add structure-preserving resampling choices: nearest, RotSprite-style upscale/rotate/downsample, and palette-constrained area reduction.
- Make cleanup topology-aware: report connected components, holes, one-pixel bridges, and pixels to be removed before commit.
- Add symmetry diagnostics that distinguish exact pixel symmetry from perceptual/shape symmetry.

Artist-visible acceptance:

- Repeated rotations do not compound damage unless the user explicitly bakes between operations.
- Cleanup cannot remove a one-pixel bridge without showing it in preview.
- Palette-constrained transforms introduce no unapproved colors.

## Phase E — palettes, dithering, and color

- Treat palette extraction, ramps, grading, quantization, and dithering as one color pipeline with explicit working color space and alpha policy.
- Preserve indexed palette identity when possible; distinguish duplicate RGB entries with different semantic roles.
- Add perceptual ramp diagnostics in OKLab/OKLCH: luminance monotonicity, hue drift, chroma clipping, and contrast against common backgrounds.
- Make ordered/error-diffusion dithers selection-aware, edge-aware, and deterministic.
- Preview common color-vision deficiencies without modifying art.

Artist-visible acceptance:

- Quantization reports added/removed colors and per-color pixel counts.
- Dithering never leaks through transparent pixels or across selection boundaries.
- Ramp editing warns about non-monotonic values but never rewrites them without consent.

## Phase F — animation and temporal coherence

- Store tool recipes per frame or as clip-level effects with explicit propagation rules.
- Add temporal onion comparisons: changed-pixel heatmap, silhouette centroid, contact point, and palette drift.
- Stabilize procedural effects across frames using shared seeds, tracked masks, and tone hysteresis.
- Add timing curves and exposure sheets while keeping frame timing exact in exports.

Artist-visible acceptance:

- Applying an effect across a clip does not shimmer on unchanged regions.
- Frame propagation is previewed and undoable as one operation.
- Exported durations match the timeline after round-trip import where the target format supports them.

## Phase G — tiles, synthesis, and game export

- Validate tile seams on all wrapped edges and corners, with a heatmap pointing to violations.
- Preserve WFC sample bounds, pattern size, symmetry group, periodicity, seed, and contradiction diagnostics in the recipe.
- Add autotile rule previews for common engine conventions before export.
- Generate engine metadata from one canonical internal model, then validate Godot/Unity outputs against it.

Artist-visible acceptance:

- Seam checks are exact and identify the failing pixels.
- The same WFC recipe and source produce the same result.
- Export previews show atlas coordinates, pivots, tags, and collision metadata before files are written.

## Phase H — collaboration, performance, and accessibility

- Move from host-authoritative structural replacement toward convergent frame/layer tree operations based on the replicated-tree literature.
- Synchronize effect recipe edits as structured operations; raster previews remain caches that peers may recompute.
- Move EDT, relighting, palette analysis, WFC, and large transforms to bounded workers with cancellation and stale-result rejection.
- Add progressive previews: coarse immediate feedback, exact result on pause/commit.
- Provide keyboard equivalents and textual values for every draggable or visual control, including light position and mask painting.

Artist-visible acceptance:

- Local edits remain instant offline.
- Concurrent layer moves converge without cycles or lost layers.
- Old worker results can never overwrite a newer edit.
- Long tasks can be cancelled and never freeze basic drawing/navigation.
- Every effect is operable without pointer-only gestures.

## Delivery rule

Implement one vertical slice at a time across recipe, preview, persistence, undo, collaboration, export, accessibility, and visual acceptance. Do not call a feature complete when only its mathematical kernel is correct; the artist must be able to understand, control, reverse, save, and reliably reproduce the result.

## Reliability pass applied on 2026-09-20

- Photometric preview now commits or cancels as one history action, including layer name, tag, raster, and provenance. Cancelling a newly previewed layer does not create a hidden undo entry.
- Generator updates no longer reorder or delete layers through extra history commands. Shadow output records its insertion position so redo restores the same stack order.
- RotSprite snapshots every affected layer structurally and detaches provenance from transformed rasters rather than leaving a recipe that no longer describes the pixels.
- WFC, normal-map baking, and morph workers reject results when the project, active frame, or source revision changes while work is in flight.
- All persisted layer and animation metadata increments the document revision; autosave subscribes to that revision rather than relying only on drawing-history commits.
- Photometric source-light evidence is a continuous directional-cue score. Auto relighting preserves authored colors and never attempts ambiguous single-image albedo recovery. Optional painted-shading normalization is Manual-only, defaults to 0%, and reuses cached analysis/ramp data during live dragging.
- Light strength now scales direct diffuse/specular energy only. It no longer multiplies ambient and final exposure a second time, and it cannot erase the directional terminator at 250%. Auto cavity shading is capped and deep crevice tones are restricted to genuinely occluded pixels on the unlit side.
- The draggable light center is a true spatial focus. Moving it translates the virtual point light, recomputes the per-pixel light and half vectors, and applies a soft inverse-quadratic focus falloff without creating a hard circular edge.
- Generated-layer provenance records palette inputs where palette-constrained output depends on them. Dead recipe kinds and unused UI modules/assets were removed.

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

The studio retains its single-row header and live pixel glints. Palette tools now support named creation, scans of at most six main artwork colors, and direct swatch removal. First/Last cycle swatches can animate fire while preserving wood and outlines. Cycle Loop exports APNG or GIF at 3/5/8/10/12/15/24/30 FPS, initially 8 FPS. The shared GIF encoder now restarts its compression dictionary correctly, fixing corrupted larger exports. Existing damaged GIFs need re-export. [Interface record](../research/session-ui-ux-2026-10-01.md), [palette tools](../research/palette-creator-2026-10-01.md), [cycle scope](../research/palette-cycle-scope-2026-10-01.md), [export timing](../research/palette-cycle-export-2026-10-01.md) and [GIF correction](../research/gif-8x-corruption-2026-10-01.md).

The latest full project gate passed documentation, types, lint, **1,502 unit/integration tests across 149 suites**, and the production build in 65.39s. A real 512×512 8x GIF passed native Chromium decoding of all 16 frames with zero pixel mismatches. The current discovered editor inventory is **155 tests in 37 files**, plus 39 separate compiled-production scenarios; the new work has scoped browser verification, not a full inventory rerun. Earlier results retain their dates and scope. The user requested documentation reconciliation and Git publication of this checkpoint; Git history records publication. [Delivered work, evidence and open validation](../research/session-completion-2026-10-01.md).
<!-- /session-publication-2026-10-01 -->
