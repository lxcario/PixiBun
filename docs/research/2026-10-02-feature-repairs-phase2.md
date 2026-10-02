# Phase 2: separate desktop practice from artwork

Implemented 2 October 2026 on a dirty local checkout based on revision 1b13922cdd264d43d97b8b4fae16fca2b3ac0770. Earlier audit and phase 1 changes remain in this tree. This record is local execution, not a commit, push, deployment or release decision. [Repair plan](../plans/2026-10-02-feature-repairs.md).

## Behavior and boundaries

- Entry awaits the existing Studio save coordinator, confirms original ownership/clean revision, and verifies a session-storage return pointer before detaching any original artwork. Active Co-Draw, failed/conflicted saves, changed ownership and blocked pointer storage refuse entry.
- The original full store snapshot, raster references, Undo/Redo engine and native-file association stay separate from a new practice identity, pixels, timing, palettes and tools. Suspended raster bytes and distinct retained histories/baselines enter the existing estimated memory ledger.
- Return, Home/unmount and responsive cleanup restore the original in memory. Returning during a pending checkpoint waits for its confirmed result without hydrating older pixels. Studio's Home logo now uses client navigation; it previously reloaded the entire app. The old debounce timer is cancelled on unmount; the Studio coordinator refuses writes during practice.
- Keep encodes and writes a separate practice project, checks ownership/edit revision around the write, then carries its confirmed storage version into Studio. Failed Keep stays open; cancellation cannot publish over the original. A write already committed before cancellation can leave an extra separate practice copy.
- After refresh, ordinary admission restores the saved original selected by the return pointer. Unkept practice, Undo/Redo history and native-file handles are not persisted. The old fromPlayground query parameter no longer bypasses startup restoration. If the original record is missing, Studio reports the loss and releases the stale pointer so new drawings can save/restore normally. An explicit successful project open also releases the pointer.
- Lesson initialization now occurs only in the session coordinator before viewport mount. Late timeline, keyboard, analysis and onion-skin effects check active practice ownership; the original disabled onion-skin setting is explicitly covered.
- Current guides, storage/learning/rendering contracts, architecture and feature limits describe these boundaries. All twelve lesson illustrations and the Teaching Board were retaken with current controls; three additional images come unchanged from passing tests. [Capture provenance and hashes](../assets/screenshots/2026-10-02-feature-repairs-phase2/run.json).

## Executed checks

Node 22.23.3, Next.js 16.3.4, Chromium 151.0.7922.34 on Windows. Browser profiles are temporary; no real artist's browser storage is used.

| Check | Result | Scope |
| --- | --- | --- |
| Focused session/overlay/responsive regressions | 17 passed, three suites | 12 session cases, three overlay cases and two responsive cases; exact store/raster/history/native-association restore; delayed checkpoint; failed initialization/entry/Keep; active Co-Draw; revision change during encoding/write; cancelled adoption; retry with confirmed version; separate explicit adoption |
| Targeted Chromium | 14 passed, 36.3 s | Eleven isolation workflows plus Trace/Clear Undo/Redo, mobile metadata and Pocket PNG regressions; includes delayed-checkpoint Return, browser Back, responsive exit and deleted-original pointer release/new-save restore |
| Broad quality gate/build | Passed, 147.37 s | Documentation/source sync, TypeScript, lint, 1,545 tests / 156 suites and Next production build; one redundant suppression warning was then removed, and full lint passed cleanly |
| Complete Chromium editor | 171 passed, 9.4 min | All 40 editor files; one worker; before the final test-helper timing correction |
| Complete compiled-production run | 47 passed / one failed, 8.1 min | All six files / 48 cases across Chromium, Firefox and WebKit; the Firefox simplification failure and its original log remain archived |
| Compiled research follow-up | 15 passed, 3.3m | All five research workflows across all three engines after the diagnosed helper correction; includes the previously failing Firefox case; one worker, zero retries |
| Final follow-up checks | TypeScript and changed-helper lint passed | Full lint had already passed after comment cleanup; the only subsequent code change is the browser-test helper |
| Evidence integrity | Passed | All 97 tracked PNGs unchanged; 32 audit and 12 remediation artifacts retain their sealed hashes; 91 handbook, one phase 1 and 16 phase 2 captures match their records |

Early local browser attempts failed. A fixture initially cleared Redo while changing frame duration; the corrected fixture skips that initialization history. A duplicate Studio locator was scoped to navigation. Client navigation needed explicit route-completion assertions before checking the new UI. The Studio Home anchor's full reload was corrected in source. No earlier failed diagnostic is represented as a pass. Ignored local logs retain these attempts. Intermediate broad runs were stopped to finish the last lifecycle guards; they are not final passing verdicts. An account usage limit temporarily prevented automatic approval review for an extra local launch; the later authorized retry proceeded.

The final compiled-production run initially timed out selecting a hidden simplification control in Firefox. Its trace shows the panel busy before the More options click, then the comparison inserted above the fieldset between the action's input snapshot and completion. The options remained closed. The shared browser-test helper now waits for the preview to finish and asserts that the native details element opened before selecting controls. It does not force hidden controls or change preview code. All 15 related compiled workflows passed in the follow-up. This is a qualified result across two runs, not a claimed single 48/48 rerun. Rapid pointer input during a changing preview layout was not separately qualified. [Playwright waiting/assertion guidance](https://playwright.dev/docs/actionability).

[Sealed local evidence](evidence/2026-10-02-feature-repairs-phase2/README.md) includes the original failure log, screenshot/context, subsequent passing logs, environment and before/after source hashes. The final production build's implementation differs from current source only by deletion of an unused lint-suppression comment. The test helper changed after the full editor run; its compiled follow-up, TypeScript and lint results are recorded separately.

## Remaining qualification

Browser storage can be cleared or evicted, and a completed transaction is not a universal power-loss guarantee. Practice is not cloud backup; session history and native handles do not survive hard reload. Large/low-memory/long-session and physical-device, pen, assistive-technology and participant learning studies remain pending. Later repair phases remain pending.

The recorded [local-only preference](testsprite-plan-registry.md) supersedes the external runner requirement in the [TestSprite verification skill](../../.agents/skills/testsprite-verify/SKILL.md). No external upload, tunnel or new TestSprite verdict was performed or counted as passing.

Research used official [React Strict Mode](https://react.dev/reference/react/StrictMode), [effect cleanup](https://react.dev/reference/react/useEffect) and [MDN IndexedDB transaction guidance](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB), plus the installed Next.js linking and client-component guides. These informed ownership, cleanup and durability wording; the executed tests establish the behavior within the recorded local scope.
