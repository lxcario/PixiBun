# Phase 5: final reconciliation

Completed locally on 2 October 2026, based on `1b13922cdd264d43d97b8b4fae16fca2b3ac0770` plus earlier uncommitted repairs. [Plan](../plans/2026-10-02-feature-repairs.md). This record does not approve a release or identify a newly deployed build.

## What changed

| Area | Reconciliation |
| --- | --- |
| README and handbook | Kept the warm introduction and supplied logo; replaced affected current pictures with ten new, directly captured UI states in two capture batches. The README shows Cozy Classic dark/light and an actual Bun lighting preview. |
| Practice and controls | MAIN, the deep dive and learning references describe save-before-entry, separate practice, Return/Keep, session-only history, Iso ON/FREE and one floating preview. Earlier failed observations remain dated history with supersession links. |
| Exports | Current references describe the native tile PNG/map ZIP, stale-result refusal, exactly-one eligible normal source and preservation of stored normal channels. SVG remains approximate; welcome animation downloads remain text notes. APNG and MP4 guides use fresh pictures. |
| Welcome wording | A Godot kit and Unity shader code have distinct scopes. Offline editing needs an initial online load/cache. The image converter describes bounded averaging, forward-difference edge weighting and color grouping; it no longer claims Sobel or guaranteed contour preservation. |
| Animation wording | APNG describes full RGBA frames and potentially large uncompressed output. MP4 describes browser encoding and destination playback limits rather than universal support. Export algorithms were not changed by this phase. |
| Other public copy | Page descriptions and four feature cards now distinguish local saves, optional network features, bounded Godot/shader delivery and output review. Rotation/lighting explanations no longer promise zero pixel loss or perfect edges/colors. |
| Reduced-motion startup | Fixed the welcome lighting's server/client auto-orbit mismatch, reveal wrappers that left content transparent and hero initial-style mismatches. Initial markup matches; reduced-motion reveals complete without timed movement, and orbit starts stopped. |
| Plans and status | The original learning implementation observations are labeled historical. Design invariants are targets rather than universal compliance claims. The current limitations table identifies concrete follow-up work; future native/model/GPU features remain proposals. |

Ten application files have copy or welcome-startup changes; four existing test/helper files check those statements, controls and an explicit history-workflow readiness precondition. These are the 14 differences from the phase 4 source snapshot. No practice isolation, pixel-rendering, history or export algorithm was changed in phase 5. The final source snapshot covers 539 source/test/config files. Earlier seven-file and 13-file snapshots are retained separately rather than silently relabeled as the final source.

## How far the Markdown reconciliation goes

The intake classified 91 owned Markdown files, including 34 operating references. The final inventory classifies 93 owned Markdown files, including the new phase record and evidence index. The image-reference review checks 103 local embedded references in the operating files, their destinations and hashes. Current feature coverage is mapped from six source lists: 16 drawing tools, 12 lessons, four starter templates, four welcome tabs, 12 export types and five PixiTools tasks. The check requires the selected labels and guide destinations; it does not prove every narrative sentence or every possible workflow.

The per-file review distinguishes operating contracts, dated records, plans and vendor instructions. They should **not** all describe the latest application: a September release decision must retain its own revision, a failed October run must stay failed, and a proposal must remain a proposal. The current index and illustrated guides describe the available menus and bounded behavior. This is selected claim reconciliation, not a literal line-by-line certification of every Markdown sentence against source.

Removed or replaced current claims include native Unity-kit implications, Sobel/pixel-perfect image conversion, unconditional offline operation, universal video playback and the affected old screenshot embeds. No dated failure, old release record or sealed image was deleted to make the latest results look better. The original maintenance-map intake is retained and links the expanded review.

## Pictures and provenance

[Seven current captures](../assets/screenshots/2026-10-02-feature-repairs-phase5/run.json) show Cozy Classic dark, Cozy Classic light, Bun lighting preview, welcome overview, image conversion, APNG and MP4. [Three additional captures](../assets/screenshots/2026-10-02-feature-repairs-phase5-welcome/run.json) show the corrected lighting, rotation and four feature cards in reduced-motion mode. Fresh Chromium contexts used the actual project importer, theme controls, preview controls, export tabs and welcome tabs. The artwork comes from the repository's starter templates and Bun poses. The captures were visually reviewed, with no page errors; the final additional batch also checks console errors. They are UI illustrations, not generated mockups or standalone download verdicts.

Unchanged feature pictures remain useful where the UI has not changed. Practice, control and tile/normal pictures already updated in phases 2–4 retain their own provenance. Older captures remain in historical records. Integrity checks compare all 97 tracked PNGs with HEAD, the 127 files in five previous sealed evidence sets, and nine screenshot checkpoints. This prevents a refreshed handbook from rewriting earlier evidence.

## Execution and diagnostics

The [local evidence index](evidence/2026-10-02-feature-repairs-phase5/README.md) retains final verdicts and the separate failed/partial runs. Source was frozen throughout the final gate, editor and compiled-browser sequence.

| Final check | Executed result | Scope |
| --- | --- | --- |
| [Gate/build](evidence/2026-10-02-feature-repairs-phase5/gate-final.log) | All five stages passed; 1569 tests / 159 suites; 122.46s | Docs, types, lint, all unit/integration tests, build; Vitest two workers, original timeouts |
| [Full editor](evidence/2026-10-02-feature-repairs-phase5/editor-final.log) | 181 passed (11.8m) | Chromium development server; one worker, zero retries |
| [Full compiled browsers](evidence/2026-10-02-feature-repairs-phase5/production-final.log) | 78 passed (11.6m); Chromium/Firefox/WebKit, one worker, zero retries | Rebuilt source on owned port 3113; no rebuild or source changes during execution |

Final documentation verification and source/image/history integrity have their own logs. The full browser runs include the strengthened reduced-motion/text-note workflow. A final pass does not erase the intermittent failures below or identify their cause.

The complete initial editor baseline passed 181 workflows before the final public-copy refinements. The initial gate also passed before the last pill/RGBA/helper changes; neither is presented as the final-source verdict.

An overlapping intermediate-source editor run passed 178 and failed three practice cases at the same Home-to-Playground navigation assertion. It did not reach their later Keep/Return assertions. Two cases passed an initial traced replay; all three then passed a separate traced replay in 20.7 seconds. The recovery bulk fixture also exceeded its existing five-second timeout during an overlapping gate run, with 1,568 other tests passing. No timeout was enlarged. Contention was present, but these artifacts do not establish the cause of the intermittent navigation failures. Final checks run sequentially with no parallel build/browser suite.

After the final welcome repair, a default-worker gate repeated the same recovery timeout while the other 1,568 tests passed. The large fixture seeds 10,001 real fake-IndexedDB records; it was not replaced by a mock, reduced or given more time. Final gate execution limits the installed Vitest runner to two workers through `VITEST_MAX_WORKERS=2`. The earlier default-worker pass/fail runs remain separate; this concurrency choice is an execution setting, not proof of the timeout's cause or a change to the recovery algorithm.

The initial compiled run passed 77 and failed one WebKit welcome assertion. That run used a build made before the final pill wording, while its helper expected the new wording. Its failure artifacts remain diagnostic evidence; the final compiled suite must use the rebuilt, frozen source. Editor runs stopped after 55 and 72 passes are explicitly partial, not completed verdicts. The latter and its preceding 202.17-second passing gate/build predate the last public wording and reduced-motion repairs.

Reduced-motion capture attempts exposed a genuine hydration error at the auto-orbit label, then transparent panels and hero attribute mismatches. The first orbit-only replay passed but did not establish visible panels or absence of console hydration errors. Visual review prevented those blank images from being published. The final regression checks reduced-motion startup, every panel ancestor's opacity, manual orbit start/stop, ordinary startup after reload, page/console errors and real text-note downloads. Its targeted Chromium replay passed in 11.2 seconds. The full final suites repeat this strengthened workflow; their verdicts are separate from the targeted result.

A later complete editor run passed 180 and failed the layer-property/frame-duration history case: the third Undo was disabled while opacity remained 95%. Its three traced replays passed in 9.6 seconds. The original setup waited for the workspace container, not active restoration. The final setup explicitly waits for active restoration and checks that the first opacity edit enables Undo; all three Undo and all three Redo value assertions remain. The failed run and successful diagnostic traces are retained. This is a test precondition correction, not an established cause or a claimed history-engine repair. The final complete editor verdict must be a separate run after this correction.

## Research boundaries and remaining work

Primary references informed the qualifications rather than supplying app verdicts:

- The [WHATWG storage standard](https://storage.spec.whatwg.org/) distinguishes best-effort and persistent storage. Browser persistence is not an off-device backup, and this phase does not claim cloud recovery.
- [Playwright's browser documentation](https://playwright.dev/docs/browsers) describes its patched browser builds and platform differences. A Windows WebKit fixture is not an Apple-device/Safari qualification.
- [W3C accessibility evaluation guidance](https://www.w3.org/WAI/test-evaluate/) requires evaluation beyond automated tools. Existing checks do not replace keyboard/screen-reader or participant work.
- React's [Effect reference](https://react.dev/reference/react/useEffect) explains client-only synchronization. The welcome repair keeps server/client initial markup consistent, then applies the browser motion preference; this narrow fix is not full accessibility qualification.

The [remaining-work table](../features.md#what-the-remaining-work-would-involve) and [research registry](issue-registry.md#outstanding-research-and-qualification) describe concrete closure evidence: named consumer imports/decoders, physical pen/device and assistive-technology checks, real two-machine collaboration, long-session memory/latency profiles, consented artist/learning studies and deployed update/rollback checks. These can be pursued in later work; a prose change or local browser pass cannot produce their evidence.

No new Godot/Tiled rendered-lighting study, coverage instrumentation, Lighthouse run, physical-device test, participant result, external TestSprite verdict, Git push or deployment is claimed. Phase 4's Godot resource/native-pixel checks remain separately scoped. Verification follows the recorded [local-only preference](testsprite-plan-registry.md) alongside the installed [verification skill](../../.agents/skills/testsprite-verify/SKILL.md).
