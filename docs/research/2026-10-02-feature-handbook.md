# Illustrated feature handbook — 2 October 2026

## Scope

Documentation and new screenshots for the main checkout at `1b13922cdd264d43d97b8b4fae16fca2b3ac0770`, package `1.14.1`. Application code, tests, dependencies and configuration were not changed. This builds on the [documentation follow-up](2026-10-02-documentation-followup.md); it is not a release/deployment decision or a new complete application test run.

The [artist handbook](../guides/README.md) connects twelve illustrated topic guides. The [feature index](../features.md) lists the current tools, workflows and limits with guide/screenshot/source links. README stays short and warm, with direct routes to the detailed material. Documentation map, product scope, current status and export/learning contracts link the new guides.

## Coverage and source review

Compared the canonical **16 drawing tools**, **12 export tabs**, **five PixiTools tasks**, **12 lessons**, **four starter sprites** and **four welcome showcase tabs** against their source definitions. Every tool/export/lesson has its own current illustration. Additional sections cover project gallery/name/save, import and sheet slicing, resize, layers/blending, colors, selections/transforms/clipboard, view/lenses/symmetry/PiP, command/help/theme controls, animation/clips/review, palette authoring/ramps/roles/cycling, lighting/normals/shadows, cleanup/tiles/variations, practice/Teaching Board/Pocket, collaboration, offline/diagnostics and recovery/backup.

Guide review distinguishes active frame from clip scope, layer position from matching name, selection masks from stored rectangles, temporary preview from committed pixels, ordinary history from direct practice writes, and sample engine text from actual project exports. It does not claim a screenshot for every internal function or certify every narrative sentence automatically.

## Capture and visual review

Published **91 unchanged PNG captures** from twelve successful local capture groups. [Capture provenance](../assets/screenshots/2026-10-02-feature-guide/run.json) includes revision, Node/Chromium versions, group times, image dimensions/hashes and source hashes. Desktop viewport was 1440×960; Pocket and the Studio gate used 390×844. Welcome showcase/gallery captures use their actual element bounds.

Separate temporary Playwright contexts imported PixiBun's own sample artwork through the real importer. Recovery screenshots use isolated sample storage with one unreadable layer and one surviving valid bitmap; no real artist records were touched, and the recovered-copy action was not committed. Lesson images clear the active practice layer with its real button before tracing the provided first template. All images were inspected in six temporary contact sheets, with selected complex dialogs also examined at full size. Published PNGs are direct copies, without redrawn controls or image edits.

Initial capture attempts were corrected for actual labels, duplicate Teaching Board entry buttons, fitting scene dimensions, duplicate PiP instances and a viable recovery fixture. An initial lesson series included residual artwork because Trace paints over existing pixels; the published series was retaken after Clear Frame. These are documentation-capture adjustments, not silently repaired application defects or evidence of participant performance. Failed attempts and helper transcripts remain ignored local artifacts.

## Findings kept visible

- Iso Line's ON/FREE control updates state/label, but the shape handler still calls the fixed 2:1 rasterizer without reading that state.
- CenterViewport mounts the same floating preview twice; two matching preview instances were present in the UI capture.
- Playground synchronizes shared Studio dimensions, frames, timing and active frame. Trace/Clear mutate practice buffers directly; it is not the proposed isolated Studio lesson sandbox.
- Normal Facets and baked Normal Map use different tags; the current Godot normal-map admission does not accept a manual Normal Facets tag alone.
- Welcome APNG/GIF “Download” actions save specification text. Studio offers the actual animation encoders.
- SVG's in-app lossless/full-algorithm wording exceeds the heuristic converter's established fidelity. Tile decomposition exposes a JSON map/summary, rather than a downloaded packed unique-tile atlas.

These are documented in [current feature limits](../features.md#current-limits-and-unfinished-work). No product fix was made. Real two-machine/varied-network Co-Draw, broader engine/device/accessibility qualification and human learning/artist studies remain scoped as pending in [current status](../current-status.md).

## Verification

The documentation check validates owned local destinations/headings and existing generated inventories/source contracts. A separate coverage check compares the above source lists to the feature index and guide illustrations and checks every new image hash. All 91 published image hashes passed; all 44 sealed audit/remediation artifacts and all 97 previously tracked PNGs matched their original hashes. Tracked changes were Markdown only, and the whitespace check passed. The local link/inventory check passed across 83 owned Markdown files; these checks are not a replacement for application or human evaluation.

## Subsequent phase 1 and 2 repairs

The later [phase 1 record](2026-10-02-feature-repairs-phase1.md) and [phase 2 record](2026-10-02-feature-repairs-phase2.md) supersede direct Trace/Clear writes and shared Studio/practice custody. Original capture observations and the no-product-fix statement above describe the handbook review before those repairs.

## Subsequent phase 3 repairs

The later [phase 3 record](2026-10-02-feature-repairs-phase3.md) supersedes the ON/FREE and duplicate-preview limitations above. This handbook-review record retains its original capture observations and executed scope.

## Subsequent phase 4 repairs

The later [phase 4 record](2026-10-02-feature-repairs-phase4.md) supersedes manual-normal admission, welcome text-download labels, SVG wording and the missing tile PNG/map bundle. Original screenshots and pre-fix observations remain historical.
