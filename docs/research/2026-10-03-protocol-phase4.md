# Protocol phase 4: safe ordering and bounded co-draw delivery

Maintenance update — 11 October 2026: see the [11 October validation handoff](2026-10-11-validation-handoff.md) for the current engineering milestone. Earlier measurements, failures and decisions below retain their original revision and scope.

Date: 3 October 2026. Base: `32c6a940ff4b652afadf93e177ccee46ec708cf7`; package `1.14.1`, Next.js `16.3.8`. This continues the validated pasted-audit repairs after [input phase 3](2026-10-03-input-phase3.md), with phases 1–3 still present and uncommitted. No remote CI, deployment or release is attested.

## Confirmed problems and repairs

| Finding | Before | Resulting behavior |
| --- | --- | --- |
| Unsafe clock counters | The wire validator and replica accepted `2 ** 53`; incrementing could stop producing distinct timestamps | Both boundaries require safe integer timestamps/counters. Counter exhaustion carries into the next millisecond for receive, local writes and merge, preserving tuple ordering |
| Shared names could fail project admission | Co-draw admitted 256-character layer names, while project files allowed 128 | Both validators now use the project format's shared 128-character limit; longer incoming structure is rejected before adoption |
| Retained retry work | Disconnected/failed connections retained their retry interval and pending bytes until explicit disconnect | Transient interruptions pause retries and retain pending deliveries within a scheduled 30-second recovery window. Terminal transport/channel failures clear delivery timers, pending messages and byte accounting |
| Invalid artwork retried silently | New invalid packets produced a console warning without ACK or a session error | Invalid artwork ends the session with one error, releases the queue and closes transport. It is never acknowledged as accepted artwork, including packets reusing an old delivery ID |

`Number.MAX_SAFE_INTEGER` is `2 ** 53 - 1`; larger integers can share a JavaScript Number representation. This is the reason for safe integer admission and carrying before increment, rather than just checking finiteness. [ECMAScript Number specification](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.max_safe_integer).

The WebRTC specification describes ICE disconnection as potentially transient and failure as terminal until ICE is restarted. PixiBun does not implement automatic ICE restart here: it preserves brief recovery and asks the user to reconnect after terminal failure. [W3C WebRTC transport states](https://www.w3.org/TR/webrtc/#dom-rtcicetransportstate).

The existing 32 MiB queue and 256 KiB packet ceilings remain. A pending delivery without ACK for 30 seconds of active delivery time now fails instead of retrying indefinitely. Paused time does not consume that delivery budget; writes queued during recovery are retained and resume under the same IDs. ACK completion clears the retry timer immediately. Recovery resends pending messages, and valid duplicate packets are not dispatched twice. The ordered channel still uses a constant-size receive high-water mark. These 30-second budgets are application policy, not limits prescribed by WebRTC; suspended browser execution can delay timer callbacks.

Valid incoming legacy packets without delivery IDs remain accepted. A peer that does not acknowledge this version's outgoing deliveries can hit the delivery timeout; this is not a claim of compatibility with every old build. No NACK message or protocol version change was added. Invalid presence traffic retains its existing lossy admission policy. The guest workspace identity and host authority behavior from phase 1 are unchanged.

## Local verification and retained diagnostics

The final compiled run passed **10 cases with five capability skips**, one worker and zero retries. Chromium and Firefox each passed real pairing plus both invalid-packet scenarios. Windows WebKit lacks WebRTC, so its three live-transport cases skipped while safe refusal and invalid-invite handling passed. The two no-WebRTC refusal scenarios skipped in Chromium/Firefox because those runtimes provide WebRTC. The complete editor and complete compiled-browser suites were not rerun for this phase.

The original 21 new protocol checks reproduced **19 failures and two passes** before application repair. The expanded final focused run passed **128 tests across eight files**, including 24 new protocol cases, existing replica/transport/schema checks, guest project isolation and deployment/cache tests. The complete five-stage local gate/build passed **1,703 tests /165 suites**, with the ordinary unit-worker configuration and unchanged test deadlines. Node `22.23.3` was used, within the project's Node 22 engine range.

The first full gate passed documentation checks and then stopped on three type assertions in the new browser observer. Those assertions now explicitly cast the test-owned window properties through `unknown`; application behavior did not change for this fixture correction. The failed gate log remains retained. The later gate passed all five stages. Generated counts enumerate 1,703 unit cases, 188 editor workflows and 120 compiled cases; enumeration alone does not imply those complete browser suites were executed.

Compiled verification covers the existing guest-original isolation scenarios plus two invalid-peer scenarios. Each new scenario establishes real local host/guest connections, injects an unsafe clock or overlong layer name through the actual host RTCDataChannel, checks the receiver's visible error and unchanged pixels, observes that the offending delivery receives no ACK, and saves/reloads the shared drawing. The fixture captures host-created channels in browser initialization; no transport/debug handle was added to production application source. This is a same-machine connection test, not a physical two-machine or real outage study. Retry/interruption lifecycle checks use controlled transport fixtures and timers.

Final browser results and source/build identities are recorded in the [execution manifest](evidence/2026-10-03-protocol-phase4/run.json). Evidence includes [before-repair failures](evidence/2026-10-03-protocol-phase4/baseline-results.json), [final focused checks](evidence/2026-10-03-protocol-phase4/focused-final-results.json), [initial gate failure](evidence/2026-10-03-protocol-phase4/full-gate-initial.log), [passing gate/build](evidence/2026-10-03-protocol-phase4/full-gate-final.log), and [compiled browser run](evidence/2026-10-03-protocol-phase4/browser-final.log). The earlier phase 3 source manifest is compared with the current inputs; only the three intended application files change. Earlier recorded evidence remains separate from this phase.

The [TestSprite verification skill](../../.agents/skills/testsprite-verify/SKILL.md) requires a terminal runner verdict and instructs: “`--version` fails → the CLI isn't installed. Tell the user to install the TestSprite CLI (see the TestSprite docs) and stop; don't install it for them.” The CLI remains unavailable on preflight, so that workflow stopped without installation or a verdict. Independent local checks do not replace it.

## Remaining scope

This phase does not complete import-preview memory admission, APNG responsiveness/error mapping, diagnostics work, or typed SDP/ICE signaling admission and candidate-workload limits. The current encoded signaling-token size limit remains unchanged; no arbitrary 32-candidate limit is presented as a WebRTC requirement. Varied-network, background-session, physical-device and long-session qualification remain open. Keep each peer's local backup before resynchronizing divergent drawings.
