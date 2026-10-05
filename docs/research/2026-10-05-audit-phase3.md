# Deep audit — Phase 3: command and workspace consistency

Date: 5 October 2026. Base checkout: `f18f4e47d299685d7fdf23de158ae082a883483d`, package `1.14.1`. This record covers local, uncommitted Phase 3 repairs layered on Phases 1 and 2. The original [audit](2026-10-05-deep-product-code-audit.md) and its diagnostic evidence retain their original scope. No commit, publication or deployment is implied.

## Repairs

| Finding | Result |
| --- | --- |
| A07: command/modal drift | Command search uses the shared native modal and a combobox with an active result, one search Tab stop, contained Tab navigation, opener restoration and safe dialog handoff. Empty results and IME composition cannot run a command. Unavailable Undo/Redo are disabled with a tooltip explanation. |
| A07: actions and shortcuts | Tools, Fit, actual pixels, grid and onion skin share registry actions with keyboard dispatch. Onion skin advertises F3; O remains Ellipse. Ctrl/Cmd+Quote now toggles the grid. All four Fit entry points measure the drawing region, center pan and use the canonical zoom calculation, including below 100% for large artwork. |
| A08: navigator coordinates | The 224×112 preview has a matching display surface and overlay origin. Artwork pixels retain their aspect ratio; mouse click/drag and outline calculations use the same coordinates. Slider range is 10–6400%. Its focusable overview supports arrows, Shift+arrows and Enter. Canceling default pointer behavior preserves explicitly assigned overview focus in WebKit. |
| A09: restored inspector task | Preset task routing belongs to the workspace store. Saved layouts preserve the inspector tab and PixiTools domain. Hydration admits recognized tasks, migrates legacy Lighting preferences and retains an in-memory domain when session storage denies writes. Deleting the active saved layout selects Drawing controls. |
| Phase 1 header obstruction | The header wraps whole control groups at compact desktop widths; Drawing controls cannot overflow the shrinking Project group and cover Undo. Mouse history is checked at 1024, 1280 and 1600 px. |
| Phase 2 preview obstruction | Activating a drawing/PixiTools tool cancels its pending/visible preview immediately. Hover previews and their close/disable controls remain available. The Dither regression activates the toolbar with the mouse, checks the real initial hit target and verifies the complete coarse stroke pattern. |

The registry covers the commands named above. Save/export/import/history callbacks retain their existing project/lifecycle owners; this phase does not claim every action in the application has moved into one registry. Workspace preferences remain outside artwork/project backups. View and layout checks compare actual artwork pixels; onion settings retain their existing project persistence policy.

## A09 correction to the original audit

The original audit overstated the header Lighting defect. At the audited base revision, AtelierRail already selected PixiTools, wrote the Lighting domain and dispatched its task event. ToolSettingsPanel does not hide its entire content for Lighting. The original browser probe waited for Navigator, then captured a screenshot without waiting for the dynamically loaded Lighting controls. That screenshot does not establish that the header selection permanently opens an empty Tools panel.

The supported finding is the store/restoration gap: chooseLayout/hydration saved geometry without an inspector task, and named layouts could not restore their task. Phase 3 centralizes that behavior and checks the actual **Add light and depth** heading after selection, reload, lost session preferences and denied session writes. Original screenshots and logs are preserved rather than relabeled as proof of the corrected claim.

## Research basis

The [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) describes contained keyboard focus and restoration. The [WAI combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) describes retaining input focus while exposing the selected list result through aria-activedescendant. These informed the shared modal/search behavior; implementation and compiled interaction checks establish PixiBun's actual scope.

[MDN's canvas reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas) explains that CSS display sizing can distort the canvas when its aspect ratio differs from the drawing buffer. The fixed, matching navigator surface removes that discrepancy without changing artwork dimensions. These are primary technical references, not participant evaluations.

## Verification and retained diagnostics

Supported runtime: Node 22.23.3. Final compiled build: `afaJiF9rFsfhgdIb1O4Gs`. [Evidence and input hashes](evidence/2026-10-05-audit-phase3/manifest.json) distinguish the builds and run scopes.

- First full gate/build: **1,807 tests /177 suites**, all five stages passed in 108.43 seconds.
- Initial Chromium browser pass: **two passed /four failed**. Failures were unscoped option selectors, exact floating-point CSS serialization comparisons and an outdated Arrange menu path. Corrected fixtures use the command listbox, 0.01 px coordinate tolerance and View → Arrange....
- Combined Phase 1–3 pass on the first build: **37 passed /two WebKit failures**. All 21 Phase 1/2 regressions passed. WebKit lost overview focus to its default mouse behavior; the immediate Dither assertion saw a blank result despite preview dismissal. The latter did not establish a new raster or preview defect.
- Hardened task-routing gate/build: **1,809 tests /177 suites**, all five stages passed in 143.97 seconds. Added denied-session-storage routing and active-layout deletion checks.
- Final build adds the WebKit pointer-default cancellation. The target-checked WebKit follow-up passed **two/two**, including the mouse-selected exact Dither pattern, in 24.4 seconds. Its raster/preview implementation was unchanged from the combined run.
- Final Phase 3 run: **21/21 passed** across Chromium, Firefox and WebKit, seven workflows per browser, one worker, zero retries. It includes task routing with rejected session-storage writes, focus/search/dialog handoff, gesture equivalence, Fit on 32×32 and 1024×1024 artwork, navigator geometry/keyboard/zoom, saved task layouts and real mouse access.
- The closing documentation/type/lint/full-unit gate passed all four stages in **82.19 seconds**, with **1,809 tests /177 suites** on the final source. Full editor/production inventories, mobile, physical stylus/touch, assistive-technology sessions and deployment are outside this execution scope. Existing artistWorkspace production cases include obsolete menu paths and were not claimed as executed by this phase.

Screenshots: [1280 px header](evidence/2026-10-05-audit-phase3/header-1280.png), [navigator](evidence/2026-10-05-audit-phase3/navigator.png), [loaded Lighting task](evidence/2026-10-05-audit-phase3/lighting-workspace.png). The two WebKit failures retain screenshot/context/trace files alongside their original run log. Passing screenshots illustrate the verified subset rather than qualifying the entire editor.

## External verification boundary

Two local review drafts cover [commands and modal behavior](evidence/2026-10-05-audit-phase3/testsprite-commands.plan.json) and [navigator, layouts and mouse tools](evidence/2026-10-05-audit-phase3/testsprite-workspace.plan.json). Installed CLI offline validation passed **2/2**. No Phase 3 case was registered, remote run started or temporary connection opened.

The installed [TestSprite verification skill](../../.agents/skills/testsprite-verify/SKILL.md) requires: “Show the user the drafted plan / code before creating it” and “One short confirmation.” That confirmation remains pending for new external cases and the temporary local-app connection. Local browser/unit results are separate evidence and do not satisfy the skill's external terminal-verdict requirement. Earlier phases' pending external plans remain pending.

## Next scope

Phase 4 addresses A10–A11: thumbnail invalidation/render cost and save/export memory pressure. Benchmark representative artwork first, preserve frame/layer pixels and then optimize the measured paths. Phase 3 does not claim to resolve those performance findings.
