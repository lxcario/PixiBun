# Deep audit — final local hardening

5 October 2026. Uncommitted work on the five audit repair phases. Base Git revision `f18f4e47d299685d7fdf23de158ae082a883483d`, package `1.14.1`, Node `22.23.3`. The user explicitly selected **“Keep this phase local.”** This record concerns the local checkout, not publication, remote CI or a deployed release.

## Confirmed gaps and repairs

| Gap | Resulting behavior | Verification boundary |
| --- | --- | --- |
| Closing a pending backup/export allowed late publication or discarded its operation ownership | Close aborts preparation/encoding; completed results recheck cancellation before download. Studio loads the dialog on first use and retains it afterward, so reopening waits for started native work to drain | Controlled pending callbacks/encoders; actual compiled backup cancellation and retry |
| Native Save As adopted a handle before permissions/write/close succeeded; late completion could replace a newer workspace association | Previous association survives failed saves. Successful close adopts the handle only if its association generation still matches. Concurrent file writes are refused; failed and pre-commit-cancelled streams attempt abort | Controlled native-file adapters; physical OS picker/disk qualification remains separate |
| A successful native write/download could acknowledge a failed browser-storage save | Only the autosave coordinator clears browser dirty/saved state. File saves preserve that state and report write failures visibly; filename and project ownership use the captured document | Hook tests distinguish native/download success from browser-storage acknowledgement |
| Palette-loop/APNG preparation had separate cancellation and cleanup paths | Timeline APNG uses the shared revision-checked preparation. Palette loops admit source/frame/scratch estimates before allocation, propagate cancellation to both image encoders, and release surfaces on all outcomes. A failed frame context rejects instead of silently dropping a pose | Canvas/ledger tests, component cancellation and separately scoped decoded loop downloads |
| Current Arrange menu removes its transient opener | Closing Arrange returns focus to the persistent View options button | Current compiled workspace keyboard journey |
| Timeline thumbnail visibility depended on browser API availability during initial rendering | Server and first client render share a placeholder; observation/fallback begins after mounting | Recorded hydration trace and observer-independent server-markup regression |
| A queued native dialog-close event could reach a removed or reopened dialog | Close acknowledgement checks the current dialog element and its closed state; busy export reopen retains its operation's tab | Current/queued-close component regression and repeated compiled loop downloads |

Owners: [export dialog](../../src/components/modals/ExportModal.tsx), [Studio lifecycle](../../src/components/layout/StudioLayout.tsx), [native file writer](../../src/lib/storage/desktopFileSystem.ts), [file-save feedback](../../src/hooks/studio/useStudioFileSystem.ts), [portable preparation](../../src/lib/project/serialize.ts), [palette unrolling](../../src/lib/export/shaderExporter.ts), [workspace menu](../../src/components/layout/AtelierRail.tsx), [timeline thumbnails](../../src/components/layout/BottomTimeline.tsx), [dialog lifecycle](../../src/components/ui/ModalWrapper.tsx). Operating behavior is in the [storage](../contracts/storage.md), [export](../contracts/exports.md), [rendering](../contracts/rendering.md) and [artwork-safety](../guides/artwork-safety.md) contracts/guides.

The repeated-gradient diagnostic was a fixture issue: **Draw on new layer** was enabled by default. Native canvas records showed unchanged repeated pixels; debugger records showed `newLayer: true` and `changed: false`, so creating another layer/history step was intentional. The current journey explicitly selects same-layer mode before asserting that repeating an identical fill adds no history. An investigated pointer-capture change did not resolve this result and was fully reverted; the pointer source matches the Phase 5 hash. This phase does not claim a gradient implementation repair.

## Commit and cancellation boundaries

File System Access stages stream changes until close; abort is the cleanup opportunity before that commit boundary. Cancellation after close cannot retract a committed file, and browser-download acknowledgement establishes initiation rather than completion on disk. The implementation therefore retains save ownership until the active operation settles instead of claiming an immediate rollback. [MDN createWritable](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable), [WritableStream abort](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream/abort).

Abort signals require explicit checks at asynchronous boundaries. Native PNG snapshots already started are allowed to drain; cancelled work does not start queued snapshots or publish their late result. Encoder completion is checked before constructing the download. [MDN throwIfAborted](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/throwIfAborted).

Palette unrolling remains synchronous after its initial task yield. The ledger estimates admitted CPU allocations; it does not measure or cap browser/GPU/codec RAM, all retained caller JSON or worst-case input latency. The save exclusion is local to one page/module, not a cross-tab filesystem lock. No disk durability or universal browser capability claim follows from controlled adapters.

## Local verification

Final local execution is complete. Terminal logs, compiled build identity and hashes are recorded in the [hardening evidence folder](evidence/2026-10-05-audit-hardening/).

| Check | Terminal result | Scope |
| --- | --- | --- |
| Five-stage gate and production build | **1,862 tests /181 suites passed; 95.28 seconds** | Documentation, types, lint, unit tests and compilation |
| Full compiled browser suite | **206 passed /seven capability skips; 28.1 minutes** | All 213 enumerated cases, Chromium/Firefox/WebKit, one worker, zero retries |
| Compiled palette-loop downloads | **12/12 passed; 4.5 minutes** | Four rates × three engines; 12 APNGs decoded for pixels/timing and 12 GIFs parsed for timing |
| Development palette-loop downloads | **12/12 passed; 3.8 minutes** | Same rate/format assertions through the development fixture |
| Closing checks and evidence integrity | **Passed** | Final documentation, types/lint, 437 source/build hashes and 108 earlier artifacts |

The compiled build is `5wtPM03wdeRhH7jxdFPMK`; **437 source/build inputs** match their post-build fingerprints. Nine application files change from Phase 5. The separate browser scenarios leave test timeouts and retries unchanged. Generated inventory enumerates **1,862 unit tests /181 suites, 196 editor cases /45 files and 213 compiled cases /20 files**; the 12-case development follow-up is a selected subset of that editor inventory.

The seven compiled skips comprise two no-WebRTC refusal cases in engines that have WebRTC, one Firefox touch-emulation case, and four Windows WebKit cases requiring live WebRTC (pairing, two protocol checks and the invite-dependent clipboard scenario). WebKit's separate safe-refusal case passes; real local pairing/protocol/clipboard scenarios pass in Chromium and Firefox. The oversized-archive WebKit fixture retains its existing 240-second setup budget and separate 15-second export-action bound.

All **108 artifact hashes from Phases 2–5** remain unchanged. The manifest also checks the historical report hashes available in those manifests (Phases 3–5); Phase 1 has no artifact list and Phase 2 has no sealed report hash, so this is not an invented hash qualification for those missing entries. Initial failing runs, interrupted runs, screenshots and traces remain diagnostics alongside the terminal passing runs.

The current 64-frame timeline/backup fixture reconfirms **34,560 bytes of retained thumbnail backing, one thumbnail redraw for a stroke and two peak concurrent PNG encodes** in each of Chromium, Firefox and WebKit. Small rectangular previews also match native composites with alpha, blends and hidden layers. These are scoped backing/work counts; elapsed/input observations remain raw evidence rather than universal latency or total-RAM claims.

The initial probes reproduced six failures across native-write ownership/error and late-export behavior (**22 passes /six failures**). Three additional hook probes reproduced false browser-save acknowledgement and missing file-error feedback (**three failures**). These are pre-repair results, not current failures.

The first repaired full gate passed **1,860 tests /181 suites** and production compilation. Further integration inspection found Studio's close-time unmount bypassed dialog-level ownership; its lifecycle was repaired before final qualification. The first broad compiled run was interrupted after **one pass /one failure**: an older workspace journey still used the former Arrange button location. Its context, screenshot and trace are retained. The journey now uses View options → Arrange and checks return to that persistent opener without reducing its artwork/reload assertions.

A subsequent gate stopped at **1,859 passes /one clipboard fixture failure**. The fixture observed the guest-answer field before its asynchronous join setup had fully flushed React effects; it now awaits that setup inside `act` before starting Copy. Earlier focused attempts also retain two canvas/mock-isolation fixture failures and the passing explicit-canvas follow-up. These diagnostics are not relabeled as successful runs.

Production measurements and screenshots now use per-test output folders rather than writing into earlier dated evidence. Previous phase evidence must retain its recorded hashes. Inventory remains enumeration, distinct from execution; the entire development-editor inventory is not claimed as rerun.

Later compiled diagnostics exposed outdated Canvas Only/inspector selectors and the gradient fixture's new-layer default. The last gradient selector timeout included the checkbox's help text in its accessible name; the corrected fixture selects its full role/name and retains all original pixel/history assertions. Eight sequential palette downloads exceeded the shared 60-second test deadline in WebKit after six compiled or seven development downloads. Four independent rate cases now each check APNG/GIF bytes, two-second timing, unchanged outside-range pixels and unchanged source artwork; timeouts and retries remain unchanged. The first split development run also exhausted its Firefox 3-FPS deadline during setup: the retained trace records **51.22 seconds in initial navigation**, before any palette download. The cause of that slow navigation is not established by its later passing follow-up.

## Scope at completion

This finishes implementation of the five repair phases plus final local hardening. Earlier reports retain their at-run findings and results. External TestSprite drafts remain unchanged: no service case registration/update/run or temporary connection is part of this phase, following the user's local-only selection. Remote CI/deployment ordering, native OS file-pickers, physical-device memory/latency, assistive technology and artist studies remain separately qualified work. Product proposals in the original deep audit remain proposals.
