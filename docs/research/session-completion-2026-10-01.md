# Audit session completion — 2026-10-01

Status: **The six bounded audit implementation phases are delivered and locally verified within the recorded scope. Artist evaluation and broader validation remain open.** Repository publication is authorized by the user; Git history records the committed state. No deployment or release sign-off was performed.

This record reconciles the 2026-09-30 engineering session with later shared interface work and the documentation update on 2026-10-01. The [phase report](phase-implementation-status.md) contains implementation details, academic/book/studio sources and limitations. The [original audit](2026-09-30-codebase-and-pixel-art-audit.md) remains a pre-fix record.

## Delivered work

| Audit phase | Result |
| --- | --- |
| 1. Protect artwork | Revision/generation-safe asynchronous saves, refused insertion safety, structural clip history and co-draw host authority |
| 2. Trustworthy boundaries | Merge/publication hardening, alpha and palette-index separation, bounded export/worker failures and history/input admission |
| 3. Production operation | Supported Node 22 runtime, stale-save conflict copies, warm offline/update behavior and shared estimated memory reservations |
| 4. First distinctive feature | Animation stability review, intentional exceptions, clip regions and protected pixel cleanup |
| 5. Dependable game delivery | Shared clip order/holds, semantic palette roles/registers and a locally verified Godot kit |
| 6. Research extensions | Protected native-size block simplification, shared stylized light/material rigs and bounded seeded tile scenes |

Use **PixiTools → Review animation** and **PixiTools → Try a new look**. Research previews retain source pixels; applying generated layers creates one structural undo step and stores canonical recipes with source fingerprints. Missing or changed inputs require recomputation. Scenes distinguish label compatibility, visible border differences and required walkability.

These six audit phases are separate from the historical product-roadmap phase numbers. Their implementation does not complete the whole v2 or PixiMotion specification.

## Verification and current inventory

The earlier [toolbar simplification](session-ui-ux-2026-10-01.md#toolbar-simplification-follow-up) groups document actions under File and appearance/Co-Draw/Help under Studio, reducing the closed pen header from 20 to 15 buttons. It followed the earlier session push and is included in this requested publication. Seventeen distinct scoped browser scenarios passed, including menu accessibility across four themes and affected import/recovery paths; five final focus/theme scenarios also passed. Final documentation/type/lint/unit checks passed and the production build passed after a cache-permission retry. The table distinguishes those earlier runs from the current inventory and latest glint follow-up.

| Evidence | Recorded result and scope |
| --- | --- |
| [Repository gate](evidence/2026-09-30/phase6-gate-final.log) | Documentation, TypeScript, ESLint, 1,466 unit/integration tests in 143 files and production build passed in 45.50 seconds |
| [Focused research tests](evidence/2026-09-30/phase6-unit-focused-final.log) | 36 algorithm/integration tests in two files passed |
| [Full editor run](evidence/2026-09-30/phase6-browser-final.log) | 134 Chromium checks in 31 files passed in 2.1 minutes |
| [Focused editor run](evidence/2026-09-30/phase6-browser-focused-final.log) | Four workflow/layout/accessibility checks passed in 18.3 seconds; right-inspector scope |
| [Compiled three-engine run](evidence/2026-09-30/phase6-production-final.log) | 32/33 scenarios passed in 15.5 minutes; all nine new research scenarios passed |
| [Targeted Firefox rerun](evidence/2026-09-30/phase6-production-firefox-rerun.log) | The remaining animation-review timeout passed unchanged in 12.0 seconds |
| Phase 5 engine evidence | 850 Godot 4.7.2 assertions passed, as recorded in the [phase report](phase-implementation-status.md); this does not establish engine parity for new research lighting |
| Current discovered inventory | 1,482 unit/integration tests in 144 files; 149 editor tests in 33 files; 39 separate compiled-production scenarios |
| [UI repository gate before outlined-artwork follow-up](evidence/2026-10-01/ui-ux-gate-final-rerun.log) | All five checks passed in 81.46 seconds, including 1,469 unit tests and the production build |
| [Full editor run before outlined-artwork follow-up](evidence/2026-10-01/ui-ux-editor-final.log) | 145 Chromium checks passed in 2.8 minutes |
| [Compiled three-engine run before outlined-artwork follow-up](evidence/2026-10-01/ui-ux-production-final.log) | All 36 scenarios passed in 5.9 minutes |
| [Outlined-artwork final repository gate](evidence/2026-10-01/outlined-art-gate-stable.log) | All five checks passed in 48.78 seconds, including 1,472 unit tests and the production build |
| [Outlined-artwork focused editor run](evidence/2026-10-01/outlined-art-editor-stable.log) | 15 checks passed in 24.6 seconds, including four themes, a delayed real-worker cancellation regression and changing settings during a pending job |
| [Outlined-artwork compiled research run](evidence/2026-10-01/outlined-art-production-stable.log) | All 15 targeted scenarios passed across Chromium, Firefox and WebKit in 2.8 minutes; this does not rerun the full 39-scenario inventory |

The Firefox timeout coincided with a prolonged automatic approval-review delay; no root cause is established. Failed and passing evidence is retained.

The later [Phase 6 UX pass](PHASE6_UX_HARDENING.md) changed the workbench interface and added three automated walkthroughs, bringing its inventory to 137 tests. The subsequent [session UI/UX pass](session-ui-ux-2026-10-01.md) corrects reproduced keyboard, preview-scrolling, freshness and live-readiness problems and adds eight editor tests, three color-preservation unit regressions and one production scenario per engine. Its new verification is recorded separately; the 2026-09-30 evidence above retains its original build and scope. Automated dry-runs are not participant evaluations.

The workbench now defaults to an exact Original result, preserves source colors unless palette replacement is explicitly chosen, and fits the selected artwork in equal Before/After panes. The final action-row alignment adjustment followed the broad runs; two focused editor checks, a fresh build and three compiled keyboard/alignment checks passed, as linked in the [UI/UX report](session-ui-ux-2026-10-01.md). An initial full-gate palette benchmark exceeded its timing ceiling; the unchanged isolated check and full-gate rerun passed. Both outcomes are retained in that report.

The next screenshot follow-up adds default outline protection to prevent dark-border colors entering the fill, and estimated rounded lighting when no Normal layer exists. Three further unit regressions, one editor scenario and one compiled scenario per engine cover those behaviors. Their current verification is recorded in the [outlined-artwork follow-up](session-ui-ux-2026-10-01.md#outlined-artwork-screenshot-follow-up); earlier full-suite totals above retain their original scope.

The follow-up also fixes automatic-preview interaction races: settings stay usable during jobs, cancellation retains the earlier comparison, and the Cancel action occupies a separate slot from refresh. Current documentation integrity passed with the updated 1,472/146 inventories. [Final documentation check](evidence/2026-10-01/outlined-art-docs-final.log).

The original report's TestSprite-absence conclusion was corrected during Phase 4: CLI and authentication were available. Automatic approval review blocked its proposed workflow upload, and the user selected **local verification only**. No TestSprite verdict, tunnel or external artwork processing is claimed.

## Open work

- Run the [Phase 4 artist study](PHASE4_ARTIST_UX_STUDY.md) and [Phase 6 artist evaluation](phase6-artist-evaluation.md). No recruited participants, comparative artist metrics or measured benefit are recorded.
- Verify broader device/input coverage, sustained memory behavior and measured peak memory. Estimated admission and canvas/search limits do not guarantee 60 fps.
- Complete the wider command-service refactor and collaboration policy, including structured intent/recipe synchronization guarantees.
- Treat physically accurate lighting, new-lighting engine parity, cross-asset profiles, collision-map export, parallax, large-world generation and other engine adapters as future scope.
- Obtain separate release approval before any future deployment; the current interface changes have fresh local verification.

The historical v1.14.1 [release sign-off](../releases/v1.14.1-signoff.md) still applies only to its recorded deployed commit.

## Markdown reconciliation

Documentation verification passed on 2026-10-01: phase uniqueness, architecture numbering, changelog file references, live test inventories and package/release version consistency. The session record's linked local targets exist, and whitespace checks passed. These documentation checks do not rerun application behavior. [Verification log](evidence/2026-10-01/markdown-integrity.log).

All repository-authored Markdown was inventoried for relevance. Session-facing product, architecture, safety, contributor, planning, changelog, build-log, benchmark, vision, audit, evaluation and evidence documents now link to this reconciliation or record the session directly. Historical measurements, pre-fix findings, existing release evidence and archived conversation text retain their dates and scope.

Updated files:

- [MAIN.md](../../MAIN.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [TASKS.md](../../TASKS.md)
- [LOGS.md](../../LOGS.md)
- [DESIGN.md](../../DESIGN.md)
- [SECURITY.md](../../SECURITY.md)
- [CONTRIBUTING.md](../../CONTRIBUTING.md)
- [PIXIBUN_DEEP_DIVE.md](../../PIXIBUN_DEEP_DIVE.md)
- [PIXIBUN_AUDIT_RESULTS.md](../../PIXIBUN_AUDIT_RESULTS.md)
- [PIXIBUN_AUDIT_RESULTS+DEEP.md](../../PIXIBUN_AUDIT_RESULTS+DEEP.md)
- [docs/plans/README.md](../../docs/plans/README.md)
- [docs/plans/research_grounded_product_roadmap.md](../../docs/plans/research_grounded_product_roadmap.md)
- [docs/research/2026-09-30-codebase-and-pixel-art-audit.md](2026-09-30-codebase-and-pixel-art-audit.md)
- [docs/research/PIXIBUN_UX_HARDENING_REPORT.md](PIXIBUN_UX_HARDENING_REPORT.md)
- [docs/research/PIXIBUN_UX_VISUAL_QA.md](PIXIBUN_UX_VISUAL_QA.md)
- [docs/research/PIXIBUN_UX_HARDENING_AUDIT.md](PIXIBUN_UX_HARDENING_AUDIT.md)
- [CHANGELOG.md](../../CHANGELOG.md)
- [README.md](../../README.md)
- [BENCHMARKS.md](../../BENCHMARKS.md)
- [V2_VISION.md](../../V2_VISION.md)
- [PIXIBUN_UX_CHANGELOG.md](../../PIXIBUN_UX_CHANGELOG.md)
- [docs/releases/v1.14.1-signoff.md](../../docs/releases/v1.14.1-signoff.md)
- [docs/research/phase-implementation-status.md](phase-implementation-status.md)
- [docs/research/phase6-artist-evaluation.md](phase6-artist-evaluation.md)
- [docs/research/PHASE4_ARTIST_UX_STUDY.md](PHASE4_ARTIST_UX_STUDY.md)
- [docs/research/PHASE6_UX_HARDENING.md](PHASE6_UX_HARDENING.md)
- [docs/research/evidence/2026-09-30/README.md](evidence/2026-09-30/README.md)

The new completion record itself is part of this update. Generic operating guides (`AGENTS.md`, `SKILL.md`, `FullStackGuide.md`), older dated remediation/planning records and unrelated study/content plans retain their original core text. Local ignored transcripts/specifications and bundled agent skills are not publication deliverables. Their historical or operating content is preserved; their status checkpoints now link to the latest header/glint verification.

## Header placement follow-up

The later screenshot-driven header review groups project actions, places Mirror beside active-tool settings, gives Theme and Help visible labels and preserves Export at the right edge. Responsive wrapping is checked at four desktop widths with long titles and three tools; the visible save badge remains in the requested bottom-right footer. The tooltip hover/focus timer correction prevents a departed tooltip reopening over other controls. Research, screenshots, scoped verification and limits are recorded in the [header placement review](session-ui-ux-2026-10-01.md#header-placement-review). Test inventories are unchanged; earlier phase evidence above retains its original scope.

## Lighting-menu follow-up

The later Add light and depth review replaces technical headings with matching outcome cards, starts the new task view with lighting open, simplifies preview/apply and shadow choices, and makes surface-layer setup explicit. New disclosure preferences persist separately from legacy expert-panel state. The menu paint action requires an unlocked Normal layer; Enter and Space operate disclosures without triggering animation playback. Research, current screenshots, local verification and the scope of that layer check are recorded in the [lighting-menu review](session-ui-ux-2026-10-01.md#lighting-menu-follow-up). Inventories are unchanged.

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

The latest studio follow-up keeps File, drawing controls, adjacent Mirror/Zoom/Fit/View, Studio and Export on one desktop header row. The live bulb offers Off/Soft/Crisp glints with a brighter pixel core and stepped edge, preserves outlines and alpha, and supports Cancel, Apply and exact Undo/Redo. See the [UI/UX record](session-ui-ux-2026-10-01.md) and [glint research, screenshots and evidence](specular-glint-2026-10-01.md).

The latest full gate passed documentation, types, lint, **1,482 unit/integration tests across 144 suites**, and the production build. Three focused Chromium glint scenarios passed; the current discovered editor inventory is **149 tests in 33 files**, plus 39 separate compiled-production scenarios. Earlier full-run results retain their dates and scope. The user requested Git publication of this checkpoint; it does not authorize deployment or replace the existing release sign-off. [Delivered work and open validation](session-completion-2026-10-01.md).
<!-- /session-publication-2026-10-01 -->


### Live glint follow-up

The specular review replaces broad white/gold-biased overlays in the studio workflow with bounded, hue-preserving Soft/Crisp pixel highlights and adds Off/Soft/Crisp beside Shade in the bulb HUD. Specular Glint now opens a cancellable live preview, supports painted surface normals, and commits one editable, alpha-masked layer. Pixel history now preserves the effect blending mode so Redo restores the same composite. [Research, implementation decisions, local verification and limits](specular-glint-2026-10-01.md) distinguish this change from legacy renderer compatibility and unrelated optics. This work is included in the user-requested Git publication; deployment and release sign-off remain separate.

### Glint visibility correction

The subsequent screenshot complaint is addressed with brighter two-tone pixel clusters and reduced bulb/guide obstruction. A matte purple-character fixture now verifies a visible contrast floor in the combined lighting preview. All five quality gates passed in 59.18s, including 1,482 unit/integration tests across 144 suites and the production build; three focused Chromium scenarios passed in 12.8s. The discovered editor inventory is 149 tests in 33 files; it was not all rerun for this correction. [Research, screenshots and evidence](specular-glint-2026-10-01.md#visibility-correction). The user requested Git publication of these changes; deployment remains separate.

Publication reconciliation: 43 project Markdown documents were reviewed and updated, with 463 local links resolving. The [publication documentation check](evidence/2026-10-01/publication-markdown-check.log) passed the current inventories and structural rules. Bundled skill instructions and ignored local scratch artifacts remain outside this publication.
