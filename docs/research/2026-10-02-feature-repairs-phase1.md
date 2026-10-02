# Phase 1: safer practice actions

Executed 2 October 2026 on a dirty local checkout based on revision 1b13922cdd264d43d97b8b4fae16fca2b3ac0770. These changes follow the [repair plan](../plans/2026-10-02-feature-repairs.md). Earlier documentation edits are still present; this record does not claim a commit, push, deployment or release sign-off.

## What changed

- Trace Stencil and Clear Frame capture the active layer's pre-edit pixels and metadata in the viewport's existing history, invalidate a generated effect after a successful manual edit, mark the workspace dirty and request a redraw.
- Missing history, missing/locked layers and playback refuse the action. Snapshot allocation and the history entry limit are checked before drawing. A drawing callback failure restores the captured pixels without dropping the prior undo/redo branch.
- The responsive route mounts only Pocket below 1024 px and only desktop lessons at or above that width. A matching server/hydration snapshot avoids running desktop lesson effects while merely hiding their DOM on mobile. Resizing changes the mounted surface; Pocket remains temporary and must be downloaded before switching.
- The learning guide, feature limitations, learning contract and issue registry distinguish these repairs from complete workspace isolation. The guide uses a new inspected [Undo-restoration screenshot](../assets/screenshots/2026-10-02-feature-repairs-phase1/lesson-trace-restored.png) with [provenance](../assets/screenshots/2026-10-02-feature-repairs-phase1/run.json).

## Executed checks

Runtime: Node 22.23.3; npm from the bundled Node runtime; Next.js 16.3.4. Browser: local Chromium 151.0.7922.34, isolated test profiles, localhost:3000. No real artist's browser storage was used.

| Check | Result | Scope |
| --- | --- | --- |
| Five-stage quality gate with production build | Passed, 90.95 s | Documentation/source sync; TypeScript; full lint; 1,532 Vitest tests / 155 suites; Next production compilation |
| Targeted Chromium workflows | 3 passed, 6.2 s | Trace/Clear exact pixel Undo/Redo and locked-layer refusal; mobile metadata stays at initial values; existing Pocket drawing/PNG/Clear journey |
| Responsive regression | Passed in the full unit suite | Mobile Strict Mode never mounts desktop; breakpoint switching and subscription cleanup |
| Failure/admission regression | Passed in the full unit suite | Locked/playback/no-history refusal; failed draw restores pixels and prior redo; oversized entry refuses drawing |

Initial browser launch was blocked by the restricted process boundary, then succeeded with approved local launch permission. Early diagnostic tests also exposed a stale composite after Clear; the final browser run verifies the explicit redraw correction. Source metadata names and default FPS in the new fixtures were corrected to match actual types/defaults before the passing gate.

The full 160-test editor inventory and 42-scenario production-browser suite were **not** rerun here. Enumeration is not execution. The [recorded local-only preference](testsprite-plan-registry.md) remains in effect: no external TestSprite upload, tunnel or verdict was requested. The [TestSprite verification skill](../../.agents/skills/testsprite-verify/SKILL.md) normally requires an external terminal verdict; that requirement is superseded here by the existing local-only user preference, not silently counted as a pass.

## What remains

Phase 2 is pending. Desktop lesson entry/switching and Teaching Board injection still modify shared Studio state. Session Undo does not guarantee original-project restoration after route remount, refresh or failure. Save and export a Project Backup before entering desktop lessons. No full lesson sandbox, learning-gain study, physical-device qualification or cloud backup is claimed.

Research used the official [React external-store contract](https://react.dev/reference/react/useSyncExternalStore) and [Strict Mode lifecycle guidance](https://react.dev/reference/react/StrictMode), plus the installed Next.js server/client-component guide before implementation. These sources guide the mounting design; the local tests establish only the recorded behavior.

## Subsequent work

The later [phase 2 execution record](2026-10-02-feature-repairs-phase2.md) supersedes the pending isolation status above. This phase 1 record retains its original executed scope and limitations.
