# Phase 3: Iso drawing and one floating preview

Implemented 2 October 2026 on an uncommitted checkout based on 1b13922cdd264d43d97b8b4fae16fca2b3ac0770. Earlier documentation remediation and phase 1/2 changes remain in the tree. [Repair plan](../plans/2026-10-02-feature-repairs.md). This is local implementation and execution evidence, not a push, deployment or release approval.

## Behavior

- Iso Line now reads isoAngleSnap in preview and commit. ON retains the existing projected 2:1 stepping and straight cardinal lines; FREE uses the ordinary clipped line path. The default stays ON. FREE follows chosen endpoints; ON projects the diagonal endpoint.
- The switch exposes its current pressed state. Existing brush size, symmetry, pixel history, locked-layer and playback paths remain shared.
- CenterViewport retains one floating preview outside the transformed drawing stage. The redundant stage-level instance is removed.
- A real UI test reproduced preview drag/controls painting pixels underneath. The preview now stops pointer-down propagation into the parent drawing handler. Re-expansion also recomposites its newly mounted canvas; minimize state is an explicit effect dependency.
- Current drawing/workspace guides, feature rows, architecture/rendering contracts and issue H01/H02 describe the corrected behavior. Three new UI screenshots replace affected illustrations in current guides; the original captures remain unchanged. [Capture hashes and scope](../assets/screenshots/2026-10-02-feature-repairs-phase3/run.json).

## Executed checks

Node 22.23.3, Next.js 16.3.4 and Chromium 151.0.7922.34 on Windows; temporary test browser contexts. Compiled checks ran across Chromium, Firefox and WebKit with the new phase 3 production build. No existing artist browser profile is used.

| Check | Result | Scope |
| --- | --- | --- |
| Drawing/viewport Chromium | 10 passed, 44.8 s | Three new control workflows plus existing tool-motion and overlay-bound regressions |
| Final capture/control run | Three passed, 11.7 s | Adds preview-area resize assertions and current ON/FREE screenshots; FREE covers seven steep/shallow/reversed/cardinal/edge drags, exact preview/commit/Undo/Redo, three-pixel brush and horizontal mirror; ON checks established projected endpoint; single preview covers move/scale/backdrop/resize/minimize/expand/close/reopen and Undo/Redo without painting |
| Full gate/build | Passed, 63.49 s | Documentation/source inventory, TypeScript, clean lint, 1,545 tests / 156 suites and production compilation |
| Compiled browsers | 15 passed, 2.1m | Nine phase 3 cases plus six phase 2 practice lifecycle cases across Chromium, Firefox and WebKit; one worker, zero retries |
| Evidence integrity | Passed | All 97 tracked PNGs unchanged; 32 audit, 12 remediation and 19 phase 2 evidence files retain their manifest hashes; current screenshot sets match their hashes |

The first local run had one pass and two failures: the FREE test did not open its tool-options menu, and the preview test genuinely changed original pixels. The test navigation and source event boundary were corrected. A later resize assertion measured the whole window, whose controls impose a wider minimum; its screenshot showed the preview area had resized. The assertion now measures that area's width/height. The final capture run passed. These initial logs remain diagnostics, not passing verdicts. The screenshot callbacks were then given explicit void returns for the project's TypeScript signature; this changes no UI action.

[Sealed local evidence](evidence/2026-10-02-feature-repairs-phase3/README.md) preserves passing logs, initial failed diagnostics/screenshots, exact environment, current source fingerprints and historical-integrity checks. Source/test/config fingerprints were checked unchanged after the final gate and browser runs. Only documentation/evidence finalization followed.

## Research and remaining qualification

The installed Next.js use-client guide was read before editing. Official [React effect dependencies](https://react.dev/reference/react/useEffect) and [DOM refs](https://react.dev/learn/manipulating-the-dom-with-refs) inform repainting after a conditional canvas mounts. The event-boundary and pixel assertions establish the recorded local behavior; research alone is not a test verdict.

The recorded [local-only preference](testsprite-plan-registry.md) supersedes the external runner requirement in the [TestSprite verification skill](../../.agents/skills/testsprite-verify/SKILL.md). No external upload, tunnel or new TestSprite verdict was performed. The complete editor/production suites, coverage and Lighthouse are not rerun for this scoped phase unless later recorded. Physical pen, device, assistive-technology, long-session and artist studies remain separate. Export repairs are phase 4; final reconciliation is phase 5. Browser storage and session-history limits from phase 2 still apply.
