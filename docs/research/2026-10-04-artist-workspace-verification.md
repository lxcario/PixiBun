# Artist workspace execution record

Maintenance update — 11 October 2026: see the [11 October validation handoff](2026-10-11-validation-handoff.md) for the current engineering milestone. Earlier measurements, failures and decisions below retain their original revision and scope.

4 October 2026. Local working tree, package 1.14.1, Next.js 16.3.8, Node.js 22.23.3, Windows. This record accompanies [the UX research decisions](2026-10-04-artist-workspace-feedback.md) and [artist guide](../guides/artist-workspace.md). No commit, push or deployment has been requested or performed.

## Implemented scope

Task-based workspace presets and saved arrangements, optional triangle/square color picker, credited palette library with previews/favorites, detailed tool inspector, whole-image navigator, composition guides, configurable onion skin and canvas-only mode. Pixel Gradient adds exact-color linear/radial ramp fills, Bayer dithering, selection-mask clipping, live preview and existing history/lock/cancellation protection.

Automatic body-part separation, automatic idle/attack generation, arbitrary docking, particles, liquify and free warp remain researched proposals. The reported Opera GIF incident has not been reproduced or fixed by this change.

## Checks

The final five-stage quality gate passed in **190.21 seconds** after the dialog-focus repair: documentation contracts, TypeScript, lint/accessibility rules, **1,759 unit tests across 171 suites**, and the production build. Node.js 22.23.3 was selected explicitly; unit tests used the repository's default workers and timeouts. The earlier 141.39-second gate belongs to the pre-repair inputs.

The pre-focus-repair targeted development browser run passed **seven Chromium cases** (five new artist-workspace journeys and two existing studio-chrome checks). Two subsequent screenshot captures passed after waiting for the palette dialog to open and capturing the gradient before the locked-layer subcase. That scoped axe scan reported zero violations within the new workspace navigation and inspector; it is not a whole-application or post-repair accessibility verdict. Post-repair keyboard behavior is checked in the compiled scenarios.

The initial final compiled run passed **24 cases across Chromium, Firefox and WebKit**, one worker and zero retries, in 3.5 minutes. Nine cases exercise the three new artist-workspace scenarios across those engines; fifteen retain existing drawing-slope and floating-preview coverage. Subsequent targeted checks and the post-repair run are distinguished below. The complete browser suites were not rerun.

After the application focus repair, the expanded compiled run on port 3170 recorded **29 passes /one WebKit fixture failure** in 3.8 minutes. It includes twelve artist-workspace cases, fifteen drawing/preview regressions and three Help keyboard-ownership cases. Complete typed names passed in all three engines. The failed assertion expected the mouse-clicked arrangement button to be the previous focused opener; WebKit had not focused that button. The fixture now establishes an explicit keyboard opener (focus, Enter), retains Escape and focus-return assertions, and passed **all three layout cases** on port 3171 in 29.5 seconds. This is evidence from two runs, not a claimed single 30/30 result. The original WebKit screenshot, trace and error context remain under `artifacts/playwright-production-3170/`; logs are `artifacts/artist-workspace-final-compiled-browser.log` and `artifacts/artist-workspace-final-layout-keyboard.log`. Final fixture type/lint checks follow these edits.

The scoped local checks already exercised palette delivery, timeline, onion specifications and interrupted drawing. The new browser checks compare actual canvas RGBA data for named-layout reload, nondestructive palette preview, onion ghosts versus artwork and masked gradients with Undo/Redo, zero-length input, pointer cancellation and locked layers. Development-only store handles set the irregular mask in that test; compiled checks use user controls and rendered canvas reads instead.

[Evidence manifest](2026-10-04-artist-workspace-evidence.json) records runtime, commands, verdict scope, hashes of the 34 changed application/test inputs, four build files and four current interface captures. Final fixture-only edits passed standalone TypeScript and scoped lint after the gate; application source is unchanged after that passing gate/build. These hashes identify this local work; they do not establish a published revision.

## Diagnostics retained

The first new gradient browser run found duplicate Shape/Colors controls in the tool inspector. A removal attempt also removed the intended section; the next run detected its absence. The corrected single section passed the gradient test. These failures occurred before gradient pixel assertions and are not counted as successful validation.

An ambient Window declaration in the new development browser fixture changed the inferred store type in existing tests. The fixture now uses a local interface and explicit test casts. A fresh standalone typecheck passed; the Next.js TypeScript incremental cache retained the original diagnostics, so only its generated `.next/cache/.tsbuildinfo` file was removed before rebuilding. Application type checks have not been bypassed.

The first compiled run passed 21 cases and failed the three onion-reload cases because the fixture assumed the active frame reopened on frame two. Projects reopen on their first frame. The fixture now explicitly selects frame two after reload, retaining the actual red-ghost RGBA, artwork equality and saved-setting assertions. The original traces, screenshots and error contexts are retained under `artifacts/artist-workspace-compiled-first-run/`; the final 24-case run passed without application changes for this correction.

TestSprite's palette report claimed loss of the original stroke after save/reload. Its recorded workflow closed the palette dialog before checking visibility, contained no reload, and provided no independently positioned stroke coordinates or original canvas bytes. A new compiled UI check creates separate purple and green strokes, compares the full rendered RGBA array through preview/application/save/reload and restores the favorite. It passed in all three engines (three cases, 1.3 minutes), without a palette implementation change.

TestSprite's layout report also found one-character names. Replacing whole-field fill with character-by-character typing reproduced this defect in **all three engines**: `Color desk` became `C`. These failures are retained under `artifacts/artist-workspace-layout-typing-first-run/`. `ModalWrapper` had included the changing close callback in its opening-focus effect dependencies, so parent state updates reset focus after the first letter. Native dialog listeners now call the current callback through a ref, while opening focus follows the dialog's open state. The regression keeps native typing, a complete-value assertion, layout/pixel reload checks, Escape after further typing and focus restoration to the opener. A compiled rerun also retains the existing Help keyboard-ownership scenario. This is an application repair, not a relaxed test or timeout.

## External TestSprite boundary

The installed CLI is 0.13.0; credentials and the linked project's twelve existing workflows were readable. An initial attempt to run existing Help-input and frame-isolation workflows through a temporary local-port-3000 tunnel was rejected before dispatch by automatic approval review. Its stated reason was possible exposure of local artwork/project state to TestSprite without explicit authorization for that destination. No tunnel workaround or upload followed that rejection.

The repository [TestSprite verification skill](../../.agents/skills/testsprite-verify/SKILL.md) requires showing new plans before creating tests in the user's project: “Show the user the drafted plan / code before creating it”. The user reviewed the five concrete plans below and replied **“Approve the five plans and temporary connection”**. All five were then registered and dispatched against the local editor through one approved temporary connection. Local checks are reported separately and do not substitute for a TestSprite verdict.

### Prepared external plans

These are the five reviewed plans registered in the linked TestSprite project:

| Plan | User behavior and final check |
| --- | --- |
| [Layout and navigator](2026-10-04-artist-workspace-plan-1.json) | Named left-side layout, navigator pan/Fit, canvas-only restoration and saved-artwork reload |
| [Triangle and palette library](2026-10-04-artist-workspace-plan-2.json) | Paint a distinct green stroke, preview/apply a palette without recoloring pixels, restore a favorite |
| [Onion settings](2026-10-04-artist-workspace-plan-3.json) | Distinct frame marks, red previous ghost, configured range/tint reload and F3 without artwork changes |
| [Masked gradient](2026-10-04-artist-workspace-plan-4.json) | Two-color Bayer ramp stays inside a selection; one Undo restores the original pixels |
| [Tool settings and guides](2026-10-04-artist-workspace-plan-5.json) | Four-pixel Pen setting agrees across controls; composition/focus controls preserve pixels |

The approved scope permits these five plain-language plans to be added to the linked TestSprite project and a temporary connection to the local editor to run them. The service receives the plans and served application content and interacts with test artwork in its browser session. This is separate from publishing the repository or deploying PixiBun.

Registration is retained in `artifacts/artist-workspace-testsprite-registration.json`. The first development-server attempt is retained in `artifacts/artist-workspace-testsprite-run.log`. It reported a blocked layout run and a palette pass with **zero recorded assertion steps**; that pass is treated as inconclusive. Onion/gradient subsequently returned blocked after the connection closed, and the fifth plan had not been dispatched by that invocation.

The blocked layout run suggested missing customization controls. Its returned HTML snapshots contained the Workspace row but remained at `data-restoration-phase="idle"`, with no arrangement dialog. A separate regular-browser check reproduced idle initialization at `127.0.0.1`, with development HMR WebSocket failures and no page exceptions. The installed Next.js guide documents that development assets accept localhost/the initialized hostname by default; these observations identify a development-environment problem, not proof of missing application controls. No broad origin exception or security-policy bypass was added.

After interruption closed the local server and tunnel, the already-tested production build was started on port 3000. A fresh regular browser at the same `127.0.0.1` origin reached **active** restoration and opened **Inspector position**, with zero page errors or failed requests. The same five approved plans were retried concurrently through one temporary connection. The production retry is retained in `artifacts/artist-workspace-testsprite-production-run.log`; it completed with **two reported passes, two failed and one blocked; zero timed out or unrun**. Its connection closed (`tunnel list` returned an empty list).

### Production retry review

| Test ID / reviewed plan | Service verdict | What the recorded execution establishes |
| --- | --- | --- |
| `0fb45c3c-1f07-46db-a26b-40ea2305730d` — layout | Failed in batch; **passed after repair** | The one-character-name observation was reproduced locally and repaired. The post-repair run verifies the full saved name, left-side inspector, navigator/timeline visibility and drawn mark after reload. Its visual mark-presence assertion is narrower than the local full-RGBA equality check; no external pixel-byte comparison is claimed. |
| `062c79af-3135-4f05-b76c-e668621285ec` — triangle/palettes | Failed | **Inconclusive for the full plan.** It closed the dialog before its visibility assertion and recorded no reload despite claiming loss after reload. It did use picker sliders and choose/favorite/apply Sweetie 16. Independent exact-pixel three-engine verification passed; the service failure does not prove palette recoloring or data loss. |
| `428b5b7c-9e50-438b-a8de-b2c9537af54c` — onion | Passed | **Inconclusive for the full plan.** Its final assertions verify saved counts and red tint only. The planned F3 ghost disappearance and preservation of independently painted frame marks were omitted. Local compiled checks verify the ghost RGBA and unchanged artwork. |
| `b866c4e8-9775-4025-a882-640cf7a66069` — masked gradient | Blocked | The runner could not observe gradient application or obtain a PNG for inspection. The action trail includes repeated selection clicks, then export attempts, and no recorded Undo. Its proposed export-path repair is not established by that trail. Local gradient checks retain masked pixel/Undo/cancel/lock coverage. |
| `2518c15a-345c-471c-a1da-6a432827e453` — tool settings/guides | Passed | **Inconclusive for the full plan.** The brush footprint and size agreement have specific passed assertions. The guide assertion checks explanatory copy instead of comparing artwork before/after the overlay and focus changes. |

Failure-bundle downloads were attempted for the three failed/blocked runs; each returned `NOT_FOUND` with reason `no_code`. The corresponding error responses, complete step responses and returned HTML snapshots are preserved under `artifacts/artist-workspace-testsprite-production-*`. No unavailable trace/video is claimed as inspected. Service hypotheses about persistence/export are distinguished from the independently reproduced dialog-focus bug.

After rebuilding the focus repair, the same approved layout plan passed as run `b2a76ff1-e7cc-4922-9b82-e7407e6a3c4d`: 29 recorded steps, including four specific final assertions. The final returned HTML also contains the full selected `Animation desk` option and active restoration. Output is retained in `artifacts/artist-workspace-testsprite-layout-repair-run.log`, with final steps/result responses alongside it. Its temporary connection closed (`tunnel list` again returned an empty list). This recheck follows an application repair; the other incomplete service plans are not repeatedly rerun to seek a green result. Latest service verdicts for these five cases are **three reported passes, one failed and one blocked**; the onion/tool passes still omit planned assertions and are assessed as inconclusive for their full plans.

Review the individual TestSprite dashboards: [layout](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ad7cf58e-3c0f-41d6-96a8-a3a076faf639/test-cases/0fb45c3c-1f07-46db-a26b-40ea2305730d), [triangle/palettes](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ad7cf58e-3c0f-41d6-96a8-a3a076faf639/test-cases/062c79af-3135-4f05-b76c-e668621285ec), [onion](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ad7cf58e-3c0f-41d6-96a8-a3a076faf639/test-cases/428b5b7c-9e50-438b-a8de-b2c9537af54c), [gradient](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ad7cf58e-3c0f-41d6-96a8-a3a076faf639/test-cases/b866c4e8-9775-4025-a882-640cf7a66069), [tool settings/guides](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ad7cf58e-3c0f-41d6-96a8-a3a076faf639/test-cases/2518c15a-345c-471c-a1da-6a432827e453).

## Evidence boundaries

Screenshots illustrate real local interface states; they do not constitute an artist study. Automated accessibility scanning has a stated element scope. Browser automation on Windows does not qualify physical Safari, pen pressure, real assistive-technology workflows or Opera's own download behavior. Full-browser, release and deployment claims require their own evidence.
