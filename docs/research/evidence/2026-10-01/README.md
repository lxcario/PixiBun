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
