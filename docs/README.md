# Documentation map

Start with [current status](current-status.md) for scoped engineering results and remaining release work. Use the [artist handbook](guides/README.md), [Studio theme gallery](guides/themes.md) and [feature index](features.md) for practical workflows.

## Maintained documentation

| Purpose | Documents |
| --- | --- |
| Get started and contribute | [Project README](../README.md), [Contributing](../CONTRIBUTING.md), [agent rules](../AGENTS.md) |
| Product and architecture | [Scope](../MAIN.md), [architecture](../ARCHITECTURE.md), [design](../DESIGN.md), [benchmarks](../BENCHMARKS.md) |
| Artwork and behavior contracts | [Storage](contracts/storage.md), [rendering](contracts/rendering.md), [exports](contracts/exports.md), [shortcuts](contracts/shortcuts.md), [learning](contracts/learning.md), [carts](contracts/carts.md) and [where carts survive](guides/cart-survival.md) |
| Security and operations | [Security](../SECURITY.md), [security boundaries](contracts/security-boundaries.md), [deployment](guides/deployment.md), [testing](guides/testing.md), [Nibbli](guides/nibbli.md), [Nibbli agent contract](guides/nibbli-agent.md), [release readiness](guides/release-readiness.md) |
| Active work and research | [Tasks](../TASKS.md), [plans](plans/README.md), [issue registry](research/issue-registry.md), [artist study](guides/artist-study.md), [v2 proposals](../V2_VISION.md) |
| Discovery and receipts | [Test inventory](generated/test-inventory.json), [source contracts](generated/source-contracts.json), [CI witness](verification/README.md), [TestSprite evidence guide](testsprite/evidence-guide.md), [blocked-case register](testsprite/blocked-triage-2026-10-18.md), [TestSprite findings](testsprite/findings.md), [build diary](testsprite/build-diary.md), [TestSprite loop ledger](testsprite/loop-ledger.md) (shown at `/verified`) |
| Versioned changes | [Changelog](../CHANGELOG.md), [Studio/Nibbli source change record](releases/2026-10-13-studio-and-nibbli.md), [v1.14.1 sign-off](releases/v1.14.1-signoff.md), [P0 hardening](releases/2026-10-16-p0-hardening.md), [P1 hardening](releases/2026-10-17-p1-hardening.md), [final integration](releases/2026-10-17-final-integration.md), [open issues](releases/2026-10-18-open-issues.md), [tool previews](releases/2026-10-18-tool-previews.md), [17 October audit triage](releases/2026-10-18-audit-triage.md), [Colors return](releases/2026-10-18-color-focus-return.md), [artwork evidence](releases/2026-10-18-artwork-safety-and-evidence.md), [cleanup and Day/Night switch](releases/2026-10-18-cleanup-and-day-switch.md) |

## Latest reconciliation

The [22 October App-plan record](releases/2026-10-22-app-plan-reliability.md) classifies all 88 non-passing cases of the `b78fffb1` App run, fixes the one PixiBun defect it found (inert error toasts inside dialogs) and redesigns 28 plans the App agent can finish, emulated 27/28 on the PR preview and 28/28 with the fix. The automatic App run on `48f9b999` then reached 55/7/59, up from 33/7/81.

The [21 October verification and PR story](releases/2026-10-21-testsprite-verification-and-pr-story.md) is the latest observation: actual portal 91/0/30, 38 additional manual cloud passes and 114 source-pinned browser checks; exact-head E2E/Lighthouse/native-codec success; a genuine palette-rate App failure, its code fix and controlled cloud follow-up; and the still-failed required App check actually preventing merge. Historical reports below retain their original sources and verdicts.

The [20 October visible-failure follow-up](releases/2026-10-20-visible-failures-followup.md) separates actual current-head reproduction, runner prerequisites and historical results: thirty independent targeted executions, one honestly Blocked fresh portal replay, all original 72 Blocked cases classified, a passing Lighthouse retry and the minimal unpublished E2E job-budget repair. Its [receipt](testsprite/visible-five-followup-2026-10-20.json) retains source/run/environment identities and limits.

The [20 October remaining-hardening record](releases/2026-10-20-remaining-hardening.md) preserves five strict controlled cloud passes, fifteen independent browser qualifications and the corrected Pocket viewport, with the retained UI-agent limitation and 46 remaining default Blocked cases explicit.

The [20 October integrated follow-up](releases/2026-10-20-integrated-followup.md) records the actual Linux result, verified artifact transport, combined local 3,038-test candidate and fresh manual TestSprite passes, with the remaining automatic App/release gates explicit.

The [20 October targeted repairs](releases/2026-10-20-targeted-repairs.md) preserve the palette-rate product discovery, MP4 color/memory fixes, nine targeted browser passes, fifty affected unit passes and the separate terminal 37/9/75 automatic App cohort. Local proof and unresolved Linux/cloud gates remain explicitly separated.

The [19 October PR triage](releases/2026-10-19-pr-verification-triage.md) and [complete TestSprite register](testsprite/pr6-triage-2026-10-19.md) preserve the first executed App cohort and distinguish actual product findings, corrected plans/scripts, independent checks and unsupported assertions.

[15 October source and documentation review](releases/2026-10-15-codebase-and-documentation.md) records the corpus review and per-file Markdown dispositions. The subsequent [four-phase audit follow-up](plans/2026-10-15-audit-follow-up.md) records the latest corrections, integrated checks and complete handbook-picture refresh. Current guidance follows the integrated source; archived audits, release receipts and original capture manifests retain their dated scope.

The latest [Studio Labs motion update](releases/2026-10-15-studio-labs-motion.md) covers the integrated Labs behavior, the inspector merge, the final text-scale tuning and a disposition for every tracked Markdown file. The follow-up [island refinement and Liquid controls record](releases/2026-10-15-labs-liquid-controls.md) covers name-and-▾ tool triggers, the reworked hover droplet and the new slider/tool-rail lab. The [studio surfaces record](releases/2026-10-16-studio-surfaces.md) adds shared spring motion and styling for every modal, popover, menu, select, disclosure and toast. The [Studio follow-up](releases/2026-10-16-studio-follow-up.md) adds pixel tool icons, the Colors flyout, timeline frame actions, the rebuilt Live Preview and one elastic press for every control. The [TestSprite Season 4 plan](plans/2026-10-16-testsprite-s4.md) and [PRD](testsprite/PRD.md) describe how pull requests are tested. User-facing instructions are in [Studio Labs](guides/studio-workspace.md#studio-labs) and [menus, dialogs and panels](guides/studio-workspace.md#menus-dialogs-and-panels), with implementation/removal details in [the Labs source guide](../src/experimental/README.md).

## Maintenance contract

Keep present operating instructions separate from historical results and proposals. Source/build identities, capability skips, original failed verdicts and incomplete assertions retain their scope. Generated inventories describe discovery rather than execution. Run `npm run docs:inventory` after changing relevant source/test contracts and `npm run verify:docs` before publication. Local links must resolve in a clean checkout; ignored files on one machine do not satisfy that contract.

Completed audit reports and raw verification payloads are kept locally under the [archive policy and catalog](archives.md). Historical links on maintained pages resolve to that catalog and explicitly identify local records. They do not imply that raw evidence ships with a new checkout. Original archived reports are preserved byte for byte.

Keep approved lightweight handbook illustrations in `docs/assets/`. Routine captures, logs, ZIPs, coverage and browser traces stay in ignored output directories or separately verified CI artifacts. The documentation gate enforces a 40 MiB source-checkout budget and rejects raw archive paths. An intentional asset-budget change requires review.
