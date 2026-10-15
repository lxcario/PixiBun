# Documentation map

Start with [current status](current-status.md) for scoped engineering results and remaining release work. Use the [artist handbook](guides/README.md) and [feature index](features.md) for practical workflows.

## Maintained documentation

| Purpose | Documents |
| --- | --- |
| Get started and contribute | [Project README](../README.md), [Contributing](../CONTRIBUTING.md), [agent rules](../AGENTS.md) |
| Product and architecture | [Scope](../MAIN.md), [architecture](../ARCHITECTURE.md), [design](../DESIGN.md), [benchmarks](../BENCHMARKS.md) |
| Artwork and behavior contracts | [Storage](contracts/storage.md), [rendering](contracts/rendering.md), [exports](contracts/exports.md), [shortcuts](contracts/shortcuts.md), [learning](contracts/learning.md), [carts](contracts/carts.md) and [where carts survive](guides/cart-survival.md) |
| Security and operations | [Security](../SECURITY.md), [security boundaries](contracts/security-boundaries.md), [deployment](guides/deployment.md), [testing](guides/testing.md), [Nibbli](guides/nibbli.md), [Nibbli agent contract](guides/nibbli-agent.md), [release readiness](guides/release-readiness.md) |
| Active work and research | [Tasks](../TASKS.md), [plans](plans/README.md), [issue registry](research/issue-registry.md), [artist study](guides/artist-study.md), [v2 proposals](../V2_VISION.md) |
| Discovery and receipts | [Test inventory](generated/test-inventory.json), [source contracts](generated/source-contracts.json), [CI witness](verification/README.md) |
| Versioned changes | [Changelog](../CHANGELOG.md), [Studio/Nibbli source change record](releases/2026-10-13-studio-and-nibbli.md), [v1.14.1 sign-off](releases/v1.14.1-signoff.md) |

## Latest reconciliation

[15 October source and documentation review](releases/2026-10-15-codebase-and-documentation.md) records recent code changes, per-file Markdown dispositions and current checks. Current guidance follows the integrated source; archived audits, release receipts and original screenshots retain their dated scope.

## Maintenance contract

Keep present operating instructions separate from historical results and proposals. Source/build identities, capability skips, original failed verdicts and incomplete assertions retain their scope. Generated inventories describe discovery rather than execution. Run `npm run docs:inventory` after changing relevant source/test contracts and `npm run verify:docs` before publication. Local links must resolve in a clean checkout; ignored files on one machine do not satisfy that contract.

Completed audit reports and raw verification payloads are kept locally under the [archive policy and catalog](archives.md). Historical links on maintained pages resolve to that catalog and explicitly identify local records. They do not imply that raw evidence ships with a new checkout. Original archived reports are preserved byte for byte.

Keep approved lightweight handbook illustrations in `docs/assets/`. Routine captures, logs, ZIPs, coverage and browser traces stay in ignored output directories or separately verified CI artifacts. The documentation gate enforces a 40 MiB source-checkout budget and rejects raw archive paths. An intentional asset-budget change requires review.
