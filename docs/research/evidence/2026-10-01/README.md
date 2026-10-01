# Interface and glint evidence — 2026-10-01

This directory retains local screenshots and logs for screenshot-driven corrections. A failed intermediate run is diagnostic history, not passing evidence. Recorded tests cover their stated checkout and scope; the latest glint checks do not rerun every browser scenario.

| Latest proof | Scope |
| --- | --- |
| [Pixel glint full gate](pixel-glint-gate.log) | Documentation, TypeScript, lint, 1,482 unit/integration tests in 144 suites and production build passed in 59.18s. |
| [Pixel glint Chromium run](pixel-glint-browser.log) | Three scenarios passed in 12.8s: native-character visible contrast/Apply/Undo, glint lifecycle and compact-HUD controls. |
| [Soft live character](pixel-glint-character-live.png) | Actual browser preview on an imported native 32×32 purple-character fixture at 315°/45°, 115% strength. |
| [Crisp live character](pixel-glint-character-crisp.png) | Same fixture with tighter pixel reflection. |
| [Applied Soft character](pixel-glint-character-applied.png) | Exact applied preview, captured after removing the bulb controls. |
| [Single-row header gate](header-one-row-gate.log) | Earlier header checkpoint; keep its original test inventory. |
| [Single-row header browser proof](header-one-row-browser-final.log) | Scoped header/tool/theme/import checks; see the UI record for counts and limits. |

Detailed status, academic/book/studio sources and earlier rerun interpretation are in the [glint report](../../specular-glint-2026-10-01.md), [UI/UX record](../../session-ui-ux-2026-10-01.md) and [completion record](../../session-completion-2026-10-01.md). The latest discovered editor inventory is 149 scenarios in 33 files; 39 compiled-production scenarios are a separate inventory. No external TestSprite run, deployment or new release sign-off is claimed.

Publication reconciliation: 43 project Markdown documents were reviewed and updated, with 463 local links resolving. The [publication documentation check](publication-markdown-check.log) passed the current inventories and structural rules. Bundled skill instructions and ignored local scratch artifacts remain outside this publication.

## Palette authoring follow-up

[Final palette gate](palette-creator-gate-final.log): 1,490 tests/146 suites and all five stages passed in 68.62s. [Three browser workflows](palette-creator-browser-final.log) passed in 9.6s. [Initial failed gate](palette-creator-gate-initial.log) is diagnostic history. [Creator at 1024px](palette-creator-1024.png), [artwork draft](palette-creator-artwork.png), [compact scan and removal](palette-compact-scan-remove.png). Current discovered editor inventory is 152 scenarios/34 files; it was not all run for this change. [Details](../../palette-creator-2026-10-01.md).

## Fire-only cycling follow-up

[Full gate](palette-cycle-scope-gate.log): all five stages and 1,494 tests/148 suites passed in 77.69s. [Focused units](palette-cycle-scope-unit.log): 18 checks passed. [Focused Chromium proof](palette-cycle-scope-browser.log): one workflow passed in 7.6s. [Reviewed swatch controls](fire-only-cycle.png). The latest discovered editor inventory is 153 scenarios/35 files; a full browser rerun is not claimed. [Scope and pixel-preservation limits](../../palette-cycle-scope-2026-10-01.md).

## Cycle export at 15 FPS

[Final full gate](palette-cycle-export-gate-final.log): 1,495 tests/148 suites and all five stages passed in 64.47s. [Focused units](palette-cycle-export-unit.log): 26 checks passed. [Final browser download check](palette-cycle-export-browser-final.log): one APNG/GIF workflow passed in 6.3s. [Reviewed 15-FPS controls](cycle-export-15fps.png). [Timing, workflow and limits](../../palette-cycle-export-2026-10-01.md). Current discovered editor inventory is 154 scenarios/36 files; it was not all rerun for this change.

## Slow cycle frame rates

[Full gate](cycle-low-fps-gate.log): all five stages and 1,498 tests/148 suites passed in 54.22s. [Focused tests](cycle-low-fps-unit.log): 27 checks passed. [Browser download proof](cycle-low-fps-browser.log): eight APNG/GIF downloads at 3/5/8/15 FPS verified in one scenario, 11.1s. [Reviewed 8-FPS panel](cycle-export-low-fps.png). [Primary sources and timing guidance](../../palette-cycle-export-2026-10-01.md#slower-fps-choices). Current editor inventory remains 154 scenarios/36 files; no full browser rerun is claimed.

## Large GIF compression correction

[Final full gate](gif-8x-gate.log): all five stages and 1,502 tests/149 suites passed in 65.39s. [Focused tests](gif-8x-unit.log): 20 checks passed. [Before-fix regressions](gif-8x-before-fix.log): four failures reproduce invalid dictionary-reset codes; this is diagnostic evidence. [Native Chromium proof](gif-8x-browser.log): one 8x GIF download scenario passed in 8.5s, comparing all 4,194,304 pixels across 16 frames at 512×512 with zero mismatches. [Reviewed downloaded GIF rendering](decoded-8x-gif.png) uses a deliberately textured test fixture. Current editor inventory is 155 scenarios/37 files; no full browser rerun or Windows Photos automation is claimed. [Cause, correction and limits](../../gif-8x-corruption-2026-10-01.md).

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

The studio retains its single-row header and live pixel glints. Palette tools now support named creation, scans of at most six main artwork colors, and direct swatch removal. First/Last cycle swatches can animate fire while preserving wood and outlines. Cycle Loop exports APNG or GIF at 3/5/8/10/12/15/24/30 FPS, initially 8 FPS. The shared GIF encoder now restarts its compression dictionary correctly, fixing corrupted larger exports. Existing damaged GIFs need re-export. [Interface record](../../session-ui-ux-2026-10-01.md), [palette tools](../../palette-creator-2026-10-01.md), [cycle scope](../../palette-cycle-scope-2026-10-01.md), [export timing](../../palette-cycle-export-2026-10-01.md) and [GIF correction](../../gif-8x-corruption-2026-10-01.md).

The latest full project gate passed documentation, types, lint, **1,502 unit/integration tests across 149 suites**, and the production build in 65.39s. A real 512×512 8x GIF passed native Chromium decoding of all 16 frames with zero pixel mismatches. The current discovered editor inventory is **155 tests in 37 files**, plus 39 separate compiled-production scenarios; the new work has scoped browser verification, not a full inventory rerun. Earlier results retain their dates and scope. The user requested documentation reconciliation and Git publication of this checkpoint; Git history records publication. [Delivered work, evidence and open validation](../../session-completion-2026-10-01.md).
<!-- /session-publication-2026-10-01 -->

## Palette and GIF documentation publication

All 50 project Markdown files were updated, including 49 publishable documents and the locally ignored historical transcript. [Documentation verification](palette-publication-docs.log) checks live inventories and structure; [local link inventory](palette-publication-links.json) records checked publishable links. The user authorized pushing the completed palette and GIF follow-ups; Git history records that publication. Earlier evidence above keeps its recorded scope.
