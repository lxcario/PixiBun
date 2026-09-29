# PixiBun UX changelog — 2026-09-29

Test counts below are the observations made at each step. The latest verified unit inventory is 1,314 tests in 130 suites; the Chromium inventory is 91 tests in 23 suites. These are local checkout results, not a new production sign-off.

## Tool preview follow-up

- Enlarged tool preview cards from 196px to 304px. Titles are now 14px, descriptions 13px, and the dismiss action 11px; the close target is 24px.
- Rebuilt the drawing and PixiTools animations as distinct before/action/result demonstrations. Lasso traces a freeform loop, Magic Wand selects one connected color region, and effects show their specific operation.
- Replaced the generic heart with a PixiBun sprite and moved step labels out of the pixel canvas into sharp, readable UI text. Reduced-motion users see the result frame.
- Verified 43 distinct scenes with 44 unit checks and inspected browser screenshots for Lasso, Wand, lighting, chisel, and other tools. The targeted Chromium suite passed 3 checks. Full unit suite passed 1,314 checks in 130 suites; typecheck and documentation integrity passed. Lint has the pre-existing `ImportModal.tsx` warning. TestSprite could not run because its CLI is not installed.

## PixiTools follow-up

- Replaced the first-open technical `All` view with three plain-language task choices: light and depth, tiles and patterns, and cleanup. Experienced users can still browse every tool.
- Added a short purpose and suggested first step for each task. The chosen task is remembered within the browser tab; `Choose another task` always returns to the chooser. Switching tasks resets the inspector scroll position.
- Simplified the default lighting view with visible Auto/Manual explanations. Shading style and less common normal-map, glint and outline actions now sit behind named disclosures; the main Place Light Bulb action stays prominent.
- Preserved all existing effect controls and preview behavior. Updated browser flows to select the task they need, and added a focused navigation test covering discovery, no artwork edits, return navigation and the 1024px layout.
- Saved a current task-picker screenshot at `docs/assets/screenshots/pixitools-task-picker.png` for review.
- Verification: 1,270 unit tests passed; typecheck, documentation checks, lint and production build passed. Lint retains the pre-existing `ImportModal.tsx` effect-dependency warning. The two-worker browser run passed 81 checks before its local development server stopped; the interrupted 27-check group passed on a fresh single-worker server, covering all 91 browser checks across the runs. TestSprite remains unavailable because its CLI is not installed.

## Audit and plan

- Read the complete supplied research report and inspected the current editor hierarchy, persistence, export, timeline, onboarding, advanced tools, keyboard surfaces and relevant project guides.
- Recorded verified implementation status, code locations and unresolved hypotheses in `PIXIBUN_UX_AUDIT.md`.
- Specified a limited P0 save/backup and onion-visibility slice in `PIXIBUN_UX_IMPLEMENTATION_PLAN.md` before implementation.

## Implemented changes

- Top rail now distinguishes `Not saved yet`, `Unsaved changes`, `Saving locally…`, `Local save failed`, and `Saved on this device`. The confirmed saved state stays visible until the next edit or save attempt. A fresh or imported project does not inherit the prior project's saved claim.
- Added a direct `Back up` control to the top rail. It opens the existing export dialog on `Project Backup`, with plain-language `.pixibun` copy. The regular Export action still opens PNG.
- Project backup waits for the file-system result. Cancellation, denied access, serialization failure and write errors keep the dialog open with an inline alert; a successful write closes it. Repeated clicks while writing are guarded.
- The timeline explains why enabled onion skin has no visible ghosts when only one frame exists or playback is running; its toggle now exposes its pressed state to assistive technology.
- At desktop widths down to 1024px, the top rail uses two rows with compact labels so save, backup, import and export remain reachable. Brush preset buttons grew to 24×24px after automated accessibility checks flagged the prior 20×16px targets.
- Updated older browser tests that relied on obsolete native toolbar titles to use the current controls' stable test IDs. Updated README and guide test counts to reflect the new tests.

## Tests and limitations

- TypeScript typecheck passed. ESLint passed with one pre-existing warning in the user's uncommitted `ImportModal.tsx` edit (missing `payload` effect dependency).
- Unit tests passed: 1,270 tests in 129 suites. Documentation verification passed.
- The complete Chromium browser suite passed: 90 of 90 checks, including the new backup and onion cases, recovery, drawing, offline operation and four-theme axe accessibility scans.
- The optimized production build passed. `git diff --check` found no whitespace errors.
- The in-app browser loaded `/studio` but its viewport displayed the deliberate `Desk Too Small` gate; desktop screenshots and browser checks were used at 1024px and 1280px.
- TestSprite verification could not run because the `testsprite` CLI is not installed in this environment. No new TestSprite project was created.
