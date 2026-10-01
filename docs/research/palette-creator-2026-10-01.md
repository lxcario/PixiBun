# Palette creation, compact scans and swatch removal

Date: 2026-10-01. These changes follow the published header/glint checkpoint; the user has requested Git publication of this follow-up. Verification follows the user's local-only instruction; no TestSprite upload or tunnel was used.

## Behavior

- Palette → Create palette opens a named draft. Pick colors, Copy palette and From artwork have matching widths. Picked colors support native color input and 3/6/8-digit hex input. Swatches can be reordered and removed. Repeated colors remain separate registers when explicitly authored.
- From artwork and Scan Canvas summarize **at most six** main colors from the visible frame. The old scan enumerated every RGB/alpha variation, so tiny edge variations could produce hundreds of swatches. Near-duplicate shades now share perceptual clusters. Returned colors are actual source samples rather than invented average colors.
- Blank frames show feedback rather than producing a fallback palette. The scan changes palette metadata only; it does not recolor the artwork.
- Create selects one new palette, marks it dirty and records one palette history step, including admission for added metadata. Refusal keeps the draft open. Cancel/Escape preserves palette and artwork state and restores opener focus. Palettes persist through project save/reload.
- Click a swatch and use **Remove color** directly beneath the palette grid. The last remaining swatch is protected. Removal preserves raster buffers and surviving semantic register IDs, removes bindings to the deleted register, shifts cycle ranges and drops a cycle made empty. Undo/Redo restores the palette and its metadata.

## Scope and limits

The six-color result is a summary, not a claim that the imported raster actually contains only six exact colors. The bins are bounded at 32,768, followed by eight weighted OKLab refinement passes and a near-duplicate cutoff. This is deterministic artist-facing grouping, not an artist study or learned segmentation model. A small source palette already within the limit keeps its exact RGB colors. Transparent background pixels do not create white swatches. Dominant color families and outline colors are covered by the noisy warm-color fixture.

The creator supports the existing limits of 50 project palettes, 512 colors and 128-character palette names. Canvas collection uses visible layers without grid/onion/selection overlays. Summary colors are RGB; alpha stays in the source artwork. Exact indexed exports still require the source pixels to match the chosen palette; summarizing a palette does not perform that remapping. Existing palettes can be copied into a new editable draft; in-place full palette management is outside this request.

## Verification

Seventeen focused unit/integration checks passed for draft validation, failed creation retaining a draft, isolated copying/Cancel, bounded and deterministic scan grouping, actual-source representatives, transparent background exclusion, stable semantic IDs, cycle-range removal, project validation and exact palette history. Three real Chromium scenarios passed in 9.6s: named creation/reordering and reload, compact scan and artwork-preserving removal Undo/Redo, and copy/artwork/Cancel behavior. The draft layout was checked at 1024 and 1440px.

The initial gate encountered invalid test matcher typing, which was corrected; the scan follow-up also corrected a toast enum and isolated test palette fixtures. Final gate results are recorded below. No full browser inventory or production-browser matrix run is claimed.

| Final evidence | Result |
| --- | --- |
| [Full quality gate](evidence/2026-10-01/palette-creator-gate-final.log) | All five gates passed in 68.62s: documentation inventory, TypeScript, lint, **1,490 tests in 146 suites** and production build. |
| [Focused browser proof](evidence/2026-10-01/palette-creator-browser-final.log) | Three Chromium workflows passed in 9.6s. No full 152-scenario editor rerun is claimed. |

Visually reviewed screenshots: [palette creator at 1024px](evidence/2026-10-01/palette-creator-1024.png), [draft from artwork](evidence/2026-10-01/palette-creator-artwork.png), and [five-color scan with visible Remove color](evidence/2026-10-01/palette-compact-scan-remove.png). The last screenshot uses a noisy warm-color fixture, not extracted pixels from the user's attachment. The initial failing gate is retained as [diagnostic history](evidence/2026-10-01/palette-creator-gate-initial.log). Whitespace checks passed.

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

The studio retains its single-row header and live pixel glints. Palette tools now support named creation, scans of at most six main artwork colors, and direct swatch removal. First/Last cycle swatches can animate fire while preserving wood and outlines. Cycle Loop exports APNG or GIF at 3/5/8/10/12/15/24/30 FPS, initially 8 FPS. The shared GIF encoder now restarts its compression dictionary correctly, fixing corrupted larger exports. Existing damaged GIFs need re-export. [Interface record](session-ui-ux-2026-10-01.md), [palette tools](palette-creator-2026-10-01.md), [cycle scope](palette-cycle-scope-2026-10-01.md), [export timing](palette-cycle-export-2026-10-01.md) and [GIF correction](gif-8x-corruption-2026-10-01.md).

The latest full project gate passed documentation, types, lint, **1,502 unit/integration tests across 149 suites**, and the production build in 65.39s. A real 512×512 8x GIF passed native Chromium decoding of all 16 frames with zero pixel mismatches. The current discovered editor inventory is **155 tests in 37 files**, plus 39 separate compiled-production scenarios; the new work has scoped browser verification, not a full inventory rerun. Earlier results retain their dates and scope. The user requested documentation reconciliation and Git publication of this checkpoint; Git history records publication. [Delivered work, evidence and open validation](session-completion-2026-10-01.md).
<!-- /session-publication-2026-10-01 -->
