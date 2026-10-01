# PixiBun UX implementation plan — 2026-09-29

> **Status update (2026-09-30):** This document records the original 2026-09-29 plan and its then-current acceptance wording. Direct user feedback changed the header: portable project backup is reached through Export, while the duplicate Back up button and visible “Saved on this device” text were removed. New sits beside the project name and Save. The tool cleanup, preview-first PixiTools actions, layer drag reordering, and timeline refinements are implemented. See [the session changelog](PIXIBUN_UX_CHANGELOG.md) for the current behavior. Artist task studies and larger responsive-workspace work remain proposals.

## Goal and boundaries

For first-time pixel artists, returning sprite makers and experienced frame animators, make saving, backup and animation controls understandable while preserving the canvas-first handcrafted studio. Success for this slice: artists can distinguish local save from a portable project backup; a failed backup leaves the dialog open with an actionable error; onion skin explains why no ghosts appear. No renderer, project schema, undo transaction, animation model, AI feature or visual-language rewrite is in scope.

The supplied report reviewed established creative-tool patterns; it did not test PixiBun. Its numeric task targets are proposed study thresholds. `MAIN.md`, `DESIGN.md`, `ARCHITECTURE.md`, `FullStackGuide.md` and the existing quality scripts define the repository context. The Eight Gates demand concrete scope, existing tokens, real microcopy, compilation and tests before release. Security/database provisions for server products are not applicable to these client-only UI edits. A separate adversarial review is a release gate; this assignment records self-review and automated checks only.

## Milestones and dependencies

Milestones 1 and 2 were implemented and verified in the first audit. Later feedback superseded the direct header Backup control and visible saved label from milestone 1 while keeping the underlying Export backup and autosave error handling. Milestone 3 has a task-based PixiTools entry screen, with study and label refinement still open. The tool-preview readability slice, timeline control cleanup, layer drag reorder, and preview-first effect flow are implemented. Larger storage architecture, workspace presets, and responsive/touch work remain proposals requiring the stated study or design work.

| Milestone | Priority | Work and dependency | Estimated effort | Acceptance / validation |
|---|---|---|---:|---|
| 1. Trust wording and backup path — complete | P0 | Reuse current autosave status and existing native project export. Keep pre-existing header edits. | 1–2d | `Saving`, `Unsaved`, `Error`, `Saved on this device` are truthful; direct Backup opens Project export; cancelled/failed save does not close; success does. Focused tests and desktop browser passed. |
| 2. Onion no-effect explanation — complete | P0 | Use existing frame count and playback state; preserve toggle settings. | <1d | One frame and playback give a clear reason; two paused frames show normal control; keyboard toggle exposes pressed state. Browser test passed. |
| 3. PixiTools task study and taxonomy — interface slice complete | P1 | Direct user feedback prompted a task-based entry screen with a Browse all path. Study discovery speed and labels with artists next. | 3–5d study | ≥80% of test participants find lighting from outcome-only prompt is a proposed threshold, not a measured result. No tool engine or history change. |
| Tool preview readability and accuracy — interface slice complete | P1 | Direct feedback prompted a 304px card, readable labels, and 43 scene-specific action/result animations. Observe comprehension with artists next. | 2–3d study | Lasso selection stays freeform; Wand shows a connected region; targeted Chromium and scene checks pass. Artist comprehension is not yet measured. |
| 4. Timeline density and keyboard pass | P1 | Depends on study of frame operations and long timelines. | 3–6d | First-animation path, reorder alternative, FPS/onion/clip controls, focus order and rapid playback tested. |
| 5. Save/recovery architecture | P1 | Separate storage design, quota budget and migration plan. | 8–12d | Interrupted and corrupted saves preserve original artwork; recovered copy explicitly chosen; portable backup still available. |
| 6. Workspace presets and contextual inspector | P1 | Prototype after baseline interaction study; preserve stable rail and common commands. | 7–12d | No feature disabling, panel jumping or lost state; preset choice visible and reversible. |
| 7. Visual interaction polish | P2 | Reproduce reported picker/panel/button issues on desktop first. | 1–3d per verified issue | Smooth symmetric transitions, stable layout, reduced-motion check. |
| 8. Responsive/touch editor and direct lighting expansion | V2 | Requires input and layout design; existing light gizmo is already functional. | Separate estimate | Tablet task study and performance profile before implementation. |

## Historical interaction specification A — local save and portable backup

**Intention/entry:** An artist wants confidence that current work is stored and a file they control. The top bar is visible throughout drawing. A direct `Back up…` control opens the existing Export dialog with `.pixibun` selected; ordinary Export still opens its usual image tab.

**Current friction:** The bar says `Saved` after IndexedDB success, and the screen-reader status says `All changes saved`. The native project tab is late in a multi-format export selector. Its handler closes on `{success:false}` and provides no error when serialization throws.

**Transitions:** Keep the existing `idle/saving/saved/error` store and `isDirty` flag. Derive display from `saveStatus` first, then `isDirty`; initial/clean state after restore must only claim local save when the restore or write has supplied that guarantee. The new backup action changes only modal presentation state. The project-export handler serializes the current project, waits for the file system result, closes only on success, and renders an inline error on failure; retry remains available. It does not change IndexedDB cleanliness or file format.

**States and copy:** clean `Saved on this device`; dirty `Unsaved changes`; pending `Saving locally…`; failure `Local save failed`. Backup intro: `Keep a .pixibun copy outside this browser. It includes your frames, layers, palettes and timing.` Backup button: `Download project backup`. Cancellation: `No backup was created. Your project is still open here.` Permission/write error: `Couldn’t create the project backup. Try again or choose another location.` Success closes; do not claim the OS completed an anchor download beyond the existing API's returned success. Hover and focus follow current tactile tokens; button placement stays stable.

**Keyboard/screen reader:** Backup is a normal focusable button with a descriptive name. Existing `ModalWrapper` manages focus and Escape. The inline error uses `role=alert`; save status uses its existing live region and mentions device storage. No new automatic focus jump during autosave.

**Motion/data safety/edges:** No new animation; reduced-motion behavior is inherited. Failed serialization, denied picker, cancelled picker and thrown write leave the editor and modal intact. Rapidly repeated backup clicks must not start concurrent writes. Current unsaved changes are included through `buildProjectFileAsync`; backup does not mark local storage clean. A full or blocked IndexedDB write still permits a portable backup attempt.

**Acceptance/regression:** Unit tests for save copy and success/failure/cancellation, desktop browser check for direct backup entry and file tab, existing autosave and export tests, typecheck, lint, test suite, build. Test a storage failure separately; it must never display a saved claim.

## Interaction specification B — onion visibility explanation

**Intention/entry:** An artist toggles Onion Skin in the expanded timeline to compare neighboring frames.

**Current friction:** The toggle can be on while the pure onion renderer returns no ghosts for `frames.length <= 1` or playback. The app does not explain that state.

**Transitions/states:** Keep the boolean in `createAnimationSlice.ts`. In the timeline, `aria-pressed` reflects it. When on with one frame, show `Add another frame to see neighboring drawings.` When on during playback, show `Pause to see onion skin while editing.` When on with neighbors while paused, normal rendering applies; when off, no note. The renderer, FPS and frame data stay unchanged.

**Keyboard/screen reader/motion:** Button remains keyboard activatable. The note is text near the control, associated by `aria-describedby` when shown. No motion. At the first or last frame, only existing neighbors render, which is expected. A transparent neighboring frame can also yield no visible ghost; this is a content state to explain in help, not a disabled control.

**Acceptance/regression:** One-frame toggle makes the reason visible; adding a frame while paused removes it; playback swaps to pause guidance; `aria-pressed` remains accurate. Existing onion-renderer tests keep passing.

## Deferred work and research protocol

Do not implement a second export modal, mandatory tutorial, semantic AI, new checkpoint format, fully non-destructive effect stack, panel preset state or renderer workers inside this slice. For later prioritization, run consented first-sprite, first-animation, outcome-based PixiTools and backup-comprehension sessions. Record task completion and errors locally; do not collect artwork pixels or claim population-level findings. Measure latency only with representative projects and hardware before citing the report's proposed budgets.

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

This document retains its dated findings and verification scope. The studio retains its single-row header and live pixel glints. Palette tools now support named creation, scans of at most six main artwork colors, and direct swatch removal. First/Last cycle swatches can animate fire while preserving wood and outlines. Cycle Loop exports APNG or GIF at 3/5/8/10/12/15/24/30 FPS, initially 8 FPS. The shared GIF encoder now restarts its compression dictionary correctly, fixing corrupted larger exports. Existing damaged GIFs need re-export. [Interface record](docs/research/session-ui-ux-2026-10-01.md), [palette tools](docs/research/palette-creator-2026-10-01.md), [cycle scope](docs/research/palette-cycle-scope-2026-10-01.md), [export timing](docs/research/palette-cycle-export-2026-10-01.md) and [GIF correction](docs/research/gif-8x-corruption-2026-10-01.md).

The latest full project gate passed documentation, types, lint, **1,502 unit/integration tests across 149 suites**, and the production build in 65.39s. A real 512×512 8x GIF passed native Chromium decoding of all 16 frames with zero pixel mismatches. The current discovered editor inventory is **155 tests in 37 files**, plus 39 separate compiled-production scenarios; the new work has scoped browser verification, not a full inventory rerun. Earlier results retain their dates and scope. The user requested documentation reconciliation and Git publication of this checkpoint; Git history records publication. [Delivered work, evidence and open validation](docs/research/session-completion-2026-10-01.md).
<!-- /session-publication-2026-10-01 -->
