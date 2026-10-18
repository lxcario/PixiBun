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
| Discovery and receipts | [Test inventory](generated/test-inventory.json), [source contracts](generated/source-contracts.json), [CI witness](verification/README.md), [TestSprite findings](testsprite/findings.md), [build diary](testsprite/build-diary.md), [TestSprite loop ledger](testsprite/loop-ledger.md) (shown at `/verified`) |
| Versioned changes | [Changelog](../CHANGELOG.md), [Studio/Nibbli source change record](releases/2026-10-13-studio-and-nibbli.md), [v1.14.1 sign-off](releases/v1.14.1-signoff.md), [P0 hardening](releases/2026-10-16-p0-hardening.md), [P1 hardening](releases/2026-10-17-p1-hardening.md), [final integration](releases/2026-10-17-final-integration.md), [open issues](releases/2026-10-18-open-issues.md), [tool previews](releases/2026-10-18-tool-previews.md), [17 October audit triage](releases/2026-10-18-audit-triage.md), [Colors return](releases/2026-10-18-color-focus-return.md), [artwork evidence](releases/2026-10-18-artwork-safety-and-evidence.md) |

## Latest reconciliation

[15 October source and documentation review](releases/2026-10-15-codebase-and-documentation.md) records the corpus review and per-file Markdown dispositions. The subsequent [four-phase audit follow-up](plans/2026-10-15-audit-follow-up.md) records the latest corrections, integrated checks and complete handbook-picture refresh. Current guidance follows the integrated source; archived audits, release receipts and original capture manifests retain their dated scope.

The latest [Studio Labs motion update](releases/2026-10-15-studio-labs-motion.md) covers the integrated Labs behavior, the inspector merge, the final text-scale tuning and a disposition for every tracked Markdown file. The follow-up [island refinement and Liquid controls record](releases/2026-10-15-labs-liquid-controls.md) covers name-and-▾ tool triggers, the reworked hover droplet and the new slider/tool-rail lab. The [studio surfaces record](releases/2026-10-16-studio-surfaces.md) adds shared spring motion and styling for every modal, popover, menu, select, disclosure and toast. The [Studio follow-up](releases/2026-10-16-studio-follow-up.md) adds pixel tool icons, the Colors flyout, timeline frame actions, the rebuilt Live Preview and one elastic press for every control. The [TestSprite Season 4 plan](plans/2026-10-16-testsprite-s4.md) and [PRD](testsprite/PRD.md) describe how pull requests are tested. User-facing instructions are in [Studio Labs](guides/studio-workspace.md#studio-labs) and [menus, dialogs and panels](guides/studio-workspace.md#menus-dialogs-and-panels), with implementation/removal details in [the Labs source guide](../src/experimental/README.md).

## Maintenance contract

Keep present operating instructions separate from historical results and proposals. Source/build identities, capability skips, original failed verdicts and incomplete assertions retain their scope. Generated inventories describe discovery rather than execution. Run `npm run docs:inventory` after changing relevant source/test contracts and `npm run verify:docs` before publication. Local links must resolve in a clean checkout; ignored files on one machine do not satisfy that contract.

Completed audit reports and raw verification payloads are kept locally under the [archive policy and catalog](archives.md). Historical links on maintained pages resolve to that catalog and explicitly identify local records. They do not imply that raw evidence ships with a new checkout. Original archived reports are preserved byte for byte.

Keep approved lightweight handbook illustrations in `docs/assets/`. Routine captures, logs, ZIPs, coverage and browser traces stay in ignored output directories or separately verified CI artifacts. The documentation gate enforces a 40 MiB source-checkout budget and rejects raw archive paths. An intentional asset-budget change requires review.
