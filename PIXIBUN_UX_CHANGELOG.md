# PixiBun UX changelog — 2026-09-29–30

Test counts below are observations made at each step. At the glint checkpoint on 2026-10-01, the discovered inventory was 1,482 unit/integration tests in 144 suites and 149 Chromium tests in 33 spec files, plus 39 separate compiled-production scenarios across three engines. The [session completion record](docs/research/session-completion-2026-10-01.md) distinguishes executed results from later additions and documents the six audit phases. These are local checkout results, not a new production sign-off. The earlier TestSprite-absence conclusion below was corrected during Phase 4; the user chose local verification after a proposed upload was blocked.

## Single-row header and visible glints — 2026-10-01

File/Studio group secondary actions while Save/history/drawing/Export and adjacent Mirror/Zoom/Fit/View remain directly visible on one header row. Larger tool forms open on demand. The lighting bulb now previews Off/Soft/Crisp glints; a brighter core and stepped shoulder are visible on matte characters, while the smaller unglowing bulb and quiet guides reveal the artwork. Native effects preserve alpha, painted normals, ink, Cancel, Apply and exact Undo/Redo. The final full gate and three scoped Chromium checks passed; [glint evidence](docs/research/specular-glint-2026-10-01.md#visibility-correction) and [header evidence](docs/research/session-ui-ux-2026-10-01.md#single-row-correction) retain their exact scopes.

## Session UI/UX corrections — 2026-10-01

The subsequent outlined-artwork screenshots exposed dark outline colors bleeding through blocks and ineffective direction controls without normals. Keep outlines now starts on, keeps strong boundaries exact and excludes them from sampling. Normal-free lighting uses a labeled rounded estimate built with existing editor functions; authored normals take priority. Older saved recipes keep their prior behavior. The [follow-up evidence](docs/research/session-ui-ux-2026-10-01.md#outlined-artwork-screenshot-follow-up) records current verification separately from the preceding broad runs.

Corrected four browser-reproduced problems: inaccessible preview edges at 4×, incomplete keyboard tabs, stale readiness messages and light-theme game-kit contrast. The research task is now Try a new look, with real fitted Before/After previews, automatic choice updates, a square light compass, equal-size choices and closed advanced settings. Original is byte-exact by default; unrelated palettes are no longer imposed implicitly. Source-color coarsening preserves native transparency and silhouette, and explicit palette remapping remains available. Frame-count feedback and recovery copy match the implemented behavior. Live game-kit readiness refreshes while export remains open. See the [UI/UX report](docs/research/session-ui-ux-2026-10-01.md) for targeted and broader verification; automated checks do not establish measured artist benefit.

## Follow-up after direct UI feedback — 2026-09-30

- Moved New beside the project name and Save; aligned the main header actions. Removed the duplicate Back up header button and visible “Saved on this device” label. Project backup remains available through Export → Project Backup, and autosave failures still surface through the existing error feedback.
- Consolidated pen size and zoom options into compact controls. Removed the confusing Pixel Perfect toggle from the top tool options. Standardized compact playback controls, grouped frame operations, and placed the frame scrub preview above surrounding panels for readability.
- Changed layer ordering to drag and drop, removing the additional move icons. The expanded timeline still supports frame reordering and clip management.
- Retired Rivet Stamp, the separate one-click Material Shading / Glow & Translucent Materials panel, and the artwork-changing Generate Seamless Pattern action. Existing normal maps and legacy effect layers remain loadable; the photometric lighting pipeline remains available.
- Added exact 3×3 repeat inspection for a selected tile and PNG download. 47-blob contour generation now waits for a before/after preview and explicit Apply.
- Added before/after previews for jaggy cleanup, thinning, stray removal, color moods, dithering, and palette snap. Cleanup scans and previews cannot be applied after source pixels, layer, frame, or relevant settings change; Undo remains available after applying.
- Updated project gallery, import, Co-Draw, and related browser checks to match the new workflow. The full 98-case Chromium run passed after the cleanup, including photometric relighting and all four theme accessibility scans. The five-stage quality gate also passed: documentation, typecheck, lint, all 1,315 unit tests, and production build. TestSprite remains unavailable because its CLI is not installed.

The 2026-09-29 entries below record the earlier implementation stage. The direct Backup control and visible local-save label described there were later removed from the header.

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
