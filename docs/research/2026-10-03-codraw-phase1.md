# Co-draw phase 1: protect the guest's original drawing

Date: 3 October 2026. Base: `32c6a940ff4b652afadf93e177ccee46ec708cf7`; package `1.14.1`. This is the first repair phase following validation of the pasted audit, separate from the earlier feature-repair phase numbering. Changes remain local and uncommitted. No deployment or production release is attested.

## Problem and resulting behavior

Previously, a guest accepted the host's frame/layer structure while keeping its original project identity. Remote-change autosave could therefore replace the original stored artwork. The guest now explicitly chooses **Save My Drawing & Join Separately**. Studio completes its existing save coordinator, including any in-flight save, before preparing the peer answer. A save failure refuses the join. A signaling failure or cancellation leaves the original pixels, history and native file association in place.

The bridge withholds incoming artwork until signaling succeeds and Studio publishes a fresh project identity named **Shared Drawing**. The answer is exposed only after that handoff. Publication rechecks the original identity, edit revision, dirty state, restore request and mounted Studio ownership; newer edits or project switches refuse the handoff. The shared project has an empty native Save association and cleared history/selection. It uses the normal autosave coordinator and keeps its own identity after disconnecting. The original remains available in Gallery.

Peer callbacks check both session generation and project ownership. Opening another project disconnects the session; callbacks retained from that session cannot change the new workspace. Local stroke/cursor broadcasts also require the session's active workspace. Closing a pending guest join aborts it; closing an established session's dialog keeps that session running. The host continues to own shared structure.

Implementation: [save coordinator](../../src/hooks/studio/useStudioAutosave.ts), [bridge](../../src/lib/sync/coDrawBridge.ts), [dialog](../../src/components/modals/CoDrawModal.tsx), [layout integration](../../src/components/layout/StudioLayout.tsx). Operating guidance: [collaboration and privacy](../guides/collaboration-and-privacy.md).

## Verification and scope

| Check | Observed result | Scope |
| --- | --- | --- |
| Focused regressions | 28 passed across 3 suites | New guest-ownership cases, existing P2P and autosave cases |
| Full local gate | Documentation, type checking, lint, 1,593 unit tests /160 suites and production build passed | Node 22.23.3; default unit workers; existing timeouts |
| Chromium editor browser checks | 3 passed | Real LAN pairing in separate browser contexts; stored original raster bytes unchanged; live edits, disconnect/reload; failed storage and invalid invite |
| Final compiled browser checks | 6 passed /3 capability skips; no retries | Chromium/Firefox real LAN pairing, shared reload and original restoration through Gallery; all three engines' invalid-invite checks; WebKit safe refusal where WebRTC is unavailable |
| TestSprite | Unavailable | The CLI's version/auth preflight could not run because `testsprite` is not installed/on PATH; no TestSprite verdict is claimed |

The [guest-ownership regressions](../../tests/coDrawGuestWorkspace.test.tsx) exercise save failure, signaling failure, in-flight saves, edits/project switches/cancel/unmount during setup, early artwork, late callbacks and superseded sessions. The [editor scenarios](../../tests/e2e/coDrawGuestIsolation.spec.ts) compare actual IndexedDB raster bytes and decoded original pixels. The [compiled scenarios](../../tests/production/coDrawGuestIsolation.spec.ts) use application controls without development-only store/database inspection handles. The full gate predates the added compiled fixtures; final fixture type/lint and documentation checks are separate, while application source and its compiled build remain the same.

Retained execution logs: [full gate](evidence/2026-10-03-codraw-phase1/full-gate.log), [editor run](evidence/2026-10-03-codraw-phase1/browser-run.log), [initial compiled run](evidence/2026-10-03-codraw-phase1/production-initial-run.log), [final compiled run](evidence/2026-10-03-codraw-phase1/production-final-run.log). [Source/build identity](evidence/2026-10-03-codraw-phase1/run.json) identifies this uncommitted candidate. Detailed local traces and images are in the ignored `artifacts/phase1-codraw-2026-10-03` directory.

The initial sandboxed browser run failed at browser launch with `spawn EPERM` and its runner could not finish teardown. Its process tree was identified and stopped; existing browsers ran successfully outside that sandbox. The first compiled run passed five cases and failed WebKit invite generation because `RTCPeerConnection` was unavailable, before a guest join occurred. That failure remains preserved. The live-pairing scenario now detects the missing capability and records a skip; a separate scenario submits a syntactically accepted invite and verifies that unsupported guest setup preserves artwork and Undo. Chromium/Firefox skip that unsupported-runtime-only scenario. This is not evidence of successful WebKit/Safari pairing.

Type checking also discovered an old candidate app copy under ignored historical artifacts: its imports resolved into current source and conflicted with the required safe join API. `tsconfig.json` now excludes `artifacts`, preserving that historical source while checking the current application and tests. No compiler errors were suppressed in current source.

The repository's [TestSprite verification skill](../../.agents/skills/testsprite-verify/SKILL.md) says: “`--version` fails → the CLI isn't installed. Tell the user to install the TestSprite CLI (see the TestSprite docs) and stop; don't install it for them.” That preflight ended the TestSprite workflow. Independent local implementation and regression work continued under the user's authorization. Phase 1 remains pending that required external-runner verification; the passing local checks do not substitute for it.

## Remaining boundaries

These local peers run on one Windows machine. No two-machine, cross-network, mobile Safari or long-session qualification is claimed. This repair does not address the separately confirmed protocol admission, metadata/history, keyboard/modal, memory, export or dependency findings. It preserves the existing Gallery return model: a successful guest handoff saves the original but does not retain its old in-memory Undo stack for later Gallery reopening.
