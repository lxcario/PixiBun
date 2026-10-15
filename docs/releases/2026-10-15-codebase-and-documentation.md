# Source and Markdown reconciliation — 15 October 2026

This review covers PixiBun 1.14.1 on main through **e9b5e682b9cc0111358f3b91f41d98249001a7a5** and the integrated playground, homepage, inspector, theme and application-update changes. This is source publication and scoped local verification, not a production deployment/release approval.

The subsequent [four-phase audit follow-up](../plans/2026-10-15-audit-follow-up.md) integrates carts through Living Postcards, fixes confirmed instruction/interface/drawing issues and replaces the handbook pictures with the current build. The source and original test verdicts below retain their earlier scope; the follow-up owns current results and the complete Day/Night theme gallery.

## Changes checked against source

| Area | Current behavior and owner | Documentation corrections |
| --- | --- | --- |
| Selection | [selectionMask](../../src/lib/canvas/selectionMask.ts) restricts raster writes across tool switches, preserving actual irregular masks | Kept selection behavior separate from bounding rectangles used by other workflows |
| History | [historyEngine](../../src/lib/engine/historyEngine.ts) defaults to 4,096 entries per direction; [pixelPatch](../../src/lib/engine/pixelPatch.ts) retains before/after rectangles under a combined 64 MiB cap | Removed current 50-step drawing limits, corrected the diagram and benchmark arithmetic, retained separate 50-step motion history and full-layer replay/capture costs |
| Co-Draw | [selectiveRestore](../../src/lib/engine/selectiveRestore.ts) changes edited cells only while live RGBA equals the expected result | Added equal-color/structural/created-layer limitations; no per-pixel author identity claimed |
| Editing defaults | Exact default Fill tolerance, refusal to merge hidden layers, opt-in canvas resampling, Shift+H/V symmetry | Corrected default 24 and bare H/V mirror instructions; H/V remains selection flip |
| Input and shelf | [Standard/classic keymaps](../../src/lib/input/keymap.ts), folded [tool slots](../../src/config/shortcuts.ts), fit-to-view | Corrected default playback/pan/secondary-color guidance and left original classic keys available |
| Desktop lessons | [coach](../../src/components/playground/CoachPanel.tsx), [dock](../../src/components/playground/ToolDock.tsx), [filmstrip](../../src/components/playground/FilmStrip.tsx), [ghost](../../src/components/playground/GhostOverlay.tsx), regenerated [lesson art](../../src/lib/art/lessonArt.ts) | Documented twelve display names, per-pose help, previous-frame overlay, gap feedback, 85 match threshold and timer-based completion; old screenshots explicitly dated |
| Pocket | [PocketDoodlePad](../../src/components/playground/PocketDoodlePad.tsx) has eight 16×16 lessons and its separate 32×32 free pad | Kept page-memory/PNG-only limits explicit; no autosave/Undo/project gallery invented |
| Homepage | [NightHero](../../src/components/landing/night/NightHero.tsx), scroll-driven [NightStory](../../src/components/landing/night/NightStory.tsx), per-tab [tasks](../../src/components/landing/showcase/quests.tsx), expandable explanations | Replaced obsolete desk-lamp/pet/sketchpad instructions with Bun/sky interactions and the current tab names |
| Sample downloads | [showcaseExport](../../src/components/landing/showcase/showcaseExport.ts) produces four 20×22 frames with 125/125/250/125 ms holds, real GIF/APNG and sheet/metadata ZIPs | Removed text-only download claims; distinguished Unity atlas data from a ready Unity project and samples from Studio exports |
| Themes/inspector | [saved canvas choice](../../src/stores/themeStore.ts), [palette hook](../../src/lib/theme/useThemePalette.ts), optional [View Transition](../../src/lib/theme/themeTransition.ts), Effects (PixiTools) tab and shared [InspectorKit](../../src/components/layout/inspector/InspectorKit.tsx) | Corrected the stale two-theme list; described canvas/markup hydration boundaries and reduced-motion fallback |
| Playback | [usePlaybackClock](../../src/hooks/studio/usePlaybackClock.ts) is shared once per workspace with retained elapsed time, 250 ms contribution cap, speed/clip holds and hidden-tab suspension | Scoped earlier unchanged-clock claims to their original release; M3 scheduling stability remains open |
| Update restart | [registrar](../../src/components/system/ServiceWorkerRegistrar.tsx), [appRestart](../../src/lib/system/appRestart.ts), [autosave preparation](../../src/hooks/studio/useStudioAutosave.ts), [worker](../../src/app/sw.js/route.ts) | Documented save before activation and again before initiating-tab reload, refusal/error paths, other-tab retention and actual-host qualification |

The removed OnboardingOverlay/ArtisanHandbookPanel and their tests are historical paths, not missing current features. The service-worker retirement fixture now provides the real window-client API required by activation; its original cache-retirement assertions remain intact. Existing application-update tests separately assert unknown-source refusal, explicit activation, preservation of older caches for another page and removal when only one client remains.

## Markdown coverage and retention

All **60 tracked Markdown files at intake** were included in the corpus/source-reference review, with **61 publishable Markdown files** after adding this record. Review covered local link/anchor targets, code-path references, source/package commands, changed feature owners, present limits, old terminology and dated evidence boundaries. Current pages were corrected where semantics changed; unaffected guides remain readable without repeated maintenance banners. The per-file disposition follows.

Ignored archives, private transcripts, original screenshots/raw browser payloads, vendored dependency Markdown and generated reports are not current operating documentation. Their dates/verdicts and archive custody were preserved; they are not rewritten as present results or force-added to Git. FullStackGuide and v2/study plans retain their explicit generic/proposal status. Historical changelog/task entries retain removed paths, old limits and original failures as history.

| Markdown file | Disposition | Review scope |
| --- | --- | --- |
| [.agents/skills/nibbli/SKILL.md](../../.agents/skills/nibbli/SKILL.md) | Reviewed, retained | Real-UI/32×32 operation boundaries and evidence custody remain applicable. |
| [.agents/skills/testsprite-onboard/SKILL.md](../../.agents/skills/testsprite-onboard/SKILL.md) | Reviewed, retained | Vendor skill or dated plan/terminal-result registry; examples and original verdicts preserved. |
| [.agents/skills/testsprite-verify/SKILL.md](../../.agents/skills/testsprite-verify/SKILL.md) | Reviewed, retained | Vendor skill or dated plan/terminal-result registry; examples and original verdicts preserved. |
| [AGENTS.md](../../AGENTS.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [ARCHITECTURE.md](../../ARCHITECTURE.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [BENCHMARKS.md](../../BENCHMARKS.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [CHANGELOG.md](../../CHANGELOG.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | Reviewed, retained | Current guide/contracts/source links reviewed; latest changes do not alter the described workflow. |
| [DESIGN.md](../../DESIGN.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [FullStackGuide.md](../../FullStackGuide.md) | Reviewed, retained | Explicit generic/historical engineering reference; not the application operating contract. |
| [MAIN.md](../../MAIN.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [README.md](../../README.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [SECURITY.md](../../SECURITY.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [SKILL.md](../../SKILL.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [TASKS.md](../../TASKS.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [V2_VISION.md](../../V2_VISION.md) | Reviewed, retained | Proposal/milestone boundaries reviewed; no new delivery or participant result claimed. |
| [docs/README.md](../../docs/README.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/archives.md](../../docs/archives.md) | Reviewed, retained | Original archive custody/catalog and historical integrity receipts preserved. |
| [docs/contracts/exports.md](../../docs/contracts/exports.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/contracts/learning.md](../../docs/contracts/learning.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/contracts/rendering.md](../../docs/contracts/rendering.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/contracts/security-boundaries.md](../../docs/contracts/security-boundaries.md) | Reviewed, retained | Current guide/contracts/source links reviewed; latest changes do not alter the described workflow. |
| [docs/contracts/shortcuts.md](../../docs/contracts/shortcuts.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/contracts/storage.md](../../docs/contracts/storage.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/current-status.md](../../docs/current-status.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/features.md](../../docs/features.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/guides/README.md](../../docs/guides/README.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/guides/animation-and-review.md](../../docs/guides/animation-and-review.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/guides/artist-study.md](../../docs/guides/artist-study.md) | Reviewed, retained | Current guide/contracts/source links reviewed; latest changes do not alter the described workflow. |
| [docs/guides/artist-workspace.md](../../docs/guides/artist-workspace.md) | Reviewed, retained | Current guide/contracts/source links reviewed; latest changes do not alter the described workflow. |
| [docs/guides/artwork-safety.md](../../docs/guides/artwork-safety.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/guides/collaboration-and-privacy.md](../../docs/guides/collaboration-and-privacy.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/guides/deployment.md](../../docs/guides/deployment.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/guides/drawing-tools.md](../../docs/guides/drawing-tools.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/guides/exporting.md](../../docs/guides/exporting.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/guides/learning-and-playground.md](../../docs/guides/learning-and-playground.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/guides/lighting-and-surfaces.md](../../docs/guides/lighting-and-surfaces.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/guides/nibbli-agent.md](../../docs/guides/nibbli-agent.md) | Reviewed, retained | Real-UI/32×32 operation boundaries and evidence custody remain applicable. |
| [docs/guides/nibbli.md](../../docs/guides/nibbli.md) | Reviewed, retained | Real-UI/32×32 operation boundaries and evidence custody remain applicable. |
| [docs/guides/palettes-and-cycling.md](../../docs/guides/palettes-and-cycling.md) | Reviewed, retained | Current guide/contracts/source links reviewed; latest changes do not alter the described workflow. |
| [docs/guides/pixitools-cleanup-and-tiles.md](../../docs/guides/pixitools-cleanup-and-tiles.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/guides/release-readiness.md](../../docs/guides/release-readiness.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/guides/studio-workspace.md](../../docs/guides/studio-workspace.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/guides/testing.md](../../docs/guides/testing.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/guides/variations-and-scenes.md](../../docs/guides/variations-and-scenes.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/guides/welcome-and-demos.md](../../docs/guides/welcome-and-demos.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/plans/2026-10-14-strategy-roadmap.md](../../docs/plans/2026-10-14-strategy-roadmap.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/plans/README.md](../../docs/plans/README.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/plans/learn-by-making-2026.md](../../docs/plans/learn-by-making-2026.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/plans/nibbli.md](../../docs/plans/nibbli.md) | Reviewed, retained | Proposal/milestone boundaries reviewed; no new delivery or participant result claimed. |
| [docs/plans/research_grounded_product_roadmap.md](../../docs/plans/research_grounded_product_roadmap.md) | Reviewed, retained | Proposal/milestone boundaries reviewed; no new delivery or participant result claimed. |
| [docs/releases/2026-10-13-studio-and-nibbli.md](../../docs/releases/2026-10-13-studio-and-nibbli.md) | Updated | Historical receipt scoped to its original build; linked later source review. |
| [docs/releases/v1.14.1-signoff.md](../../docs/releases/v1.14.1-signoff.md) | Updated | Historical receipt scoped to its original build; linked later source review. |
| [docs/research/PHASE4_ARTIST_UX_STUDY.md](../../docs/research/PHASE4_ARTIST_UX_STUDY.md) | Reviewed, retained | Participant-study protocol; no completed study results; current owner links remain valid. |
| [docs/research/issue-registry.md](../../docs/research/issue-registry.md) | Updated | Corrected current behavior, limits, terminology or source/evidence scope. |
| [docs/research/phase6-artist-evaluation.md](../../docs/research/phase6-artist-evaluation.md) | Reviewed, retained | Participant-study protocol; no completed study results; current owner links remain valid. |
| [docs/research/pixitools-baseline-study.md](../../docs/research/pixitools-baseline-study.md) | Reviewed, retained | Participant-study protocol; no completed study results; current owner links remain valid. |
| [docs/research/testsprite-plan-registry.md](../../docs/research/testsprite-plan-registry.md) | Reviewed, retained | Vendor skill or dated plan/terminal-result registry; examples and original verdicts preserved. |
| [docs/verification/README.md](../../docs/verification/README.md) | Reviewed, retained | CI discovery/evidence policy reviewed against workflow ownership; no fabricated CI receipt. |
| [testsprite-plans/challenge-2026-10-03/README.md](../../testsprite-plans/challenge-2026-10-03/README.md) | Reviewed, retained | Vendor skill or dated plan/terminal-result registry; examples and original verdicts preserved. |
| [This review](2026-10-15-codebase-and-documentation.md) | Added | Latest source owners, full corpus dispositions, verification and remaining scope. |

## Verification

The supported-runtime full gate passed all **six stages** in **211.45 seconds** on Node **22.23.3**: documentation integrity, strict TypeScript, warning-free lint, **2,477 unit tests /232 files** with configured coverage thresholds, unchanged performance budgets and a fresh production build. Coverage reported 65.95% statements, 60.22% branches, 61.14% functions and 67.14% lines. Warmed RotSprite p90 was **0.292 ms** against the unchanged **10 ms** limit; this is the benchmark's batch-mean metric, not end-to-end input latency.

| Production-browser selection | Result and scope |
| --- | --- |
| operation.spec.ts, inputOwnership.spec.ts, practiceIsolation.spec.ts | **41 passed, 1 capability skip, zero failures**, Chromium/Firefox/WebKit, zero retries; compiled drawing/save/reload/history, conflicts, offline editing/GIF decoding, waiting-worker/cache retirement, dialog/input/selection ownership and practice Keep/Return/refresh |
| Firefox touch case | Skipped by the existing capability guard because Playwright Firefox lacks mobile/touch context emulation; desktop Firefox cases passed |
| Offline console observation | The stopped-origin Firefox probe logged a failed network/RSC prefetch while its pixel/save assertions passed; no console-error-free or universal offline-navigation claim is made |

The non-Markdown tracked-input fingerprint (914 files, excluding docs/) stayed **099937868d52991d6c4cbcefe71d40535365f0de96b88e8c00b4cd6abc838bd0**. Build ID stayed **1csuhogEFn0QcDi1eG2Zq**; the explicit dirty-candidate cache identity was **docs-sync-2026-10-15-e9b5e682**, with **83** static assets in the generated precache list. This fingerprint is an explicitly scoped local byte guard, not a hash of every artifact/Markdown file or an assertion of deployment. Final prose/receipt edits leave application/test/build inputs unchanged; the final documentation check and repository pre-push gate apply before publication.

The initial exploratory coverage run used system Node 26.5.1 rather than the supported runtime and retained three failed retirement-fixture cases (missing clients.matchAll). The fixture API repair keeps their original assertions. A first documentation attempt also caught the new heading's legacy alias placement; the alias was corrected without weakening link checks. Earlier failed logs remain local beside the passing gate/browser logs. Test discovery remains **2,477 unit tests /232 files, 256 editor cases /45 files and 450 production cases /44 files**; enumeration does not mean the complete browser corpus was executed. No test assertion, timeout, retry policy, coverage threshold or performance budget was relaxed.

## Remaining qualification

The broad production suite, actual Safari/physical pen/touch, real collaboration networks, participant learning/artwork judgments, M3 intermittent scheduling, free-angle artistic quality, long sessions/low-memory devices, engine importers and real host two-build update/rollback retain their existing open scope. Local source and tests cannot establish production deployment, physical display timing, backup durability or universal browser correctness. The out-of-React stroke-loop work and carts/data-model/interoperability roadmap remain planned rather than delivered by these UI/documentation changes.

## Follow-up corrections

The first corpus review missed residual contradictions in lower paragraphs and diagrams. This follow-up checks the supplied external review against application source at **0662de6bb680f95825485a794026e40dbcce5cf9** and independently searches the 61 tracked Markdown files for related current/historical conflicts, labels, shortcuts, formulas and component ownership. It changes Markdown only. Unchanged guides, vendor skills, research protocols, proposals and archive custody retain their applicable or dated scope; retained history is not rewritten to pretend older code or tests used current values.

| Supplied finding | Verified disposition |
| --- | --- |
| Verification receipt still awaiting results | Stale observation: the published receipt above already contains the six-stage gate, browser results and source/build/cache identities. Those results remain scoped to the original candidate. |
| Nibbli uncommitted/base-HEAD and Curve open-task claims | Residual status ambiguity corrected: the pilot records are explicitly historical; subsequent publication and Curve color closure are linked without erasing original failed verdicts or broad qualification work. |
| Homepage animation downloads still text notes | Real contradiction in the export contract and an older Unreleased entry. Current samples use encoders; the 2 October note behavior remains dated history. |
| Lighting math is all worker-based / WFC is a current control | Mixed: live photometric analysis/Apply is synchronous main-thread work; normal-map Bake uses the dispatcher. WFC is retained internal/legacy source, not an active synthesis control. Diagrams now name current pixel glints and ramp targets. |
| Logo subtitle should disappear / brand and FX prose is stale | Mixed: product copy is PixiBun, but the current logo still has optional STUDIO text. Retained the accurate scale table; corrected ATELIER, PixiBud, badge color and supported reopening kinds. |
| Gate has four/five stages | Real current-command mismatch: standard/full have five/six. The dated September timing table keeps its original five-stage layout and measurements. |
| Curve checkbox and empty decorative examples | Real residual mistakes corrected; Curve closure is attributed to a2260f7e and its separate checks. Empty examples/isolated variation characters were removed without altering historical result counts. |
| Story transitions should be described as ordered dither | Also stale for current code: storyShot follows continuous scroll; StoryLine glides, scales, fades and blurs. Earlier three timing/transition experiments are identified as superseded. |
| Playback clock/source and pledge/Redo entrypoints | Clock points to usePlaybackClock; README identifies pledge page source and includes both Redo shortcuts. |

Additional independent corrections cover **Alt+R** for the bulb's focal reset; the onion-skin **0.1 falloff floor**, configured-opacity clamp and paused-only rendering; the unmounted ClickSpark component; the Lighting preset's **Effects (PixiTools)** tab; optional PanelSection storage persistence; actual Shade/Shading style and Edit FX labels; default exact RGBA matching in Scale2x; input-copy and bounded worker fallback semantics; the distinction between OKLCH ramp targets and realized/output color; and shadow-band counts versus independent cavity tones and brightness-dependent boundaries. Historical 16 px transform hitboxes remain recorded as such, with the current 18 px size identified separately. Studio appearance buttons and the homepage reveal retain their distinct behavior.

Corrected files: ARCHITECTURE.md, DESIGN.md, BENCHMARKS.md, CHANGELOG.md, TASKS.md, README.md, SKILL.md, FullStackGuide.md, docs/current-status.md, docs/contracts/exports.md, docs/contracts/rendering.md, docs/guides/artist-workspace.md, docs/guides/lighting-and-surfaces.md and this receipt. This list supplements the original per-file dispositions above.

The review does not treat MIT licensing and conditional repository-access instructions as a contradiction, infer repository visibility from prose, or claim a new security/code repair. The original full-build/browser results above were not rerun for this prose pass. The standalone documentation check passed across **61 Markdown files /1,475 local destinations**, and the Markdown diff passed whitespace/error checks. No tracked non-Markdown file differs from 0662de6b. The original 914-file non-Markdown fingerprint above is unchanged. The repository's mandatory pre-push gate remains enabled and applies again at publication. Automated documentation checks cover selected contracts and links, not universal narrative truth or production qualification.
