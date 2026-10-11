# Audit session documentation and publication — 3 October 2026

Maintenance update — 11 October 2026: see the [11 October validation handoff](2026-10-11-validation-handoff.md) for the current engineering milestone. Earlier measurements, failures and decisions below retain their original revision and scope.

This session starts from `32c6a940ff4b652afadf93e177ccee46ec708cf7`. The user requested reconciliation of the session's Markdown and Git publication, then explicitly selected **main** after being told that its push can trigger production deployment. The publication includes the session's source, configuration, tests, plans, current documentation and sanitized dated evidence. Ignored runtime downloads, credentials, raw transcripts and temporary test endpoints are excluded.

## Repair and execution scope

| Work | Record |
| --- | --- |
| Guest original checkpoint and separate shared-project ownership | [Co-draw phase 1](2026-10-03-codraw-phase1.md) |
| Same-repository main-push deployment trust, tested SHA, credentials and Next.js patch | [Deployment phase 2](2026-10-03-deployment-phase2.md) |
| Dialog/editable/composition input, selection ownership and primary-touch drawing | [Input phase 3](2026-10-03-input-phase3.md) |
| Safe peer clocks, portable metadata, delivery retries and lifecycle cleanup | [Protocol phase 4](2026-10-03-protocol-phase4.md) |
| Bounded import previews, original-pixel slicing, APNG cancellation, diagnostics and typed signaling | [Remaining phases 5–7](2026-10-03-remaining-audit-phases5-7.md) |
| TestSprite CLI 0.13.0 and twelve registered workflows | [Initial challenge](2026-10-03-testsprite-challenge.md) |
| All cases executed; service limits and exact local checks | [Full execution follow-up](2026-10-03-testsprite-full-run.md) |

The final repair gate/build recorded **1,746 tests across 170 suites**. Its targeted compiled checks recorded **21 passes and three capability skips**, with one worker and zero retries across Chromium/Firefox/WebKit. The later complete executable challenge suite passed **12/12** locally: 11 Chromium paths and the Firefox backup download/re-import. These are different commands and scopes; their counts must not be combined into a single browser verdict.

TestSprite's latest service inventory is **2 reported passes, 7 blocked, 3 failed and zero planned**. Both passes omit the planned artwork/history assertions. The local runner reproduces the intended challenging workflows, including exact RGBA, shared-storage conflict copies, one-pixel selection movement and cancellation during actual APNG encoding. Eleven new service runs cost 5.5 credits. Direct public script replay was not performed after automatic review rejected sharing test code and a temporary URL; the requested explicit approval remains absent. That limit does not prevent the separately authorized Git publication.

## Documentation reconciliation

The README, changelog, architecture, contributing/security guidance, documentation map, current status, affected contracts and artist guides, issue/plan registries and challenge instructions describe this session's final behavior and actual verification. Resize dialog bounds of 4–512 pixels are distinguished from admitted project dimensions of up to 2,048 per axis. APNG guidance now describes native compression, its stored-block fallback and Escape/dialog-close cancellation. Backup guidance distinguishes a native Save dialog from browser downloads and explains selecting the named original after a conflict copy.

Current status treats each phase's missing TestSprite and uncommitted-source wording as the state **at that phase's verification**, and links subsequent execution/publication separately. Historical dated reports, photographs, failure traces and sealed evidence retain their original bytes and outcomes. Older release, benchmark and proposal documents are historical references rather than current session verdicts. The automated documentation check validates owned links/headings, inventory and selected contracts; it does not certify every narrative claim.

## Publication and remaining qualification

Publication target is `origin/main`, using an ordinary fast-forward push after the repository's configured pre-push documentation, type, lint and unit gate. No hook bypass or forced update is requested. The gate's actual outcome and Git commit are reported by the publication command, rather than inferred from this document.

The configured successful-main-push workflow may deploy through Vercel when its credentials exist, and a separately configured hosting integration may also react to the push. Source publication is not confirmation that CI, hosting or a release sign-off succeeded. Remote CI/deployment, varied-network and physical-device testing, assistive technology, artist studies and Chromium native Save-dialog qualification retain their separate open scopes. The temporary testing tunnel and owned local server were stopped after verification.
