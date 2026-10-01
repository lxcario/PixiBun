# Documentation map

Current contracts describe the main checkout. Dated release, audit, study, and execution records describe their stated revision and environment. A passing runner inventory or automated accessibility scan is not release approval or participant evaluation.

| Reader | Canonical reference | Maintainer responsibility |
| --- | --- | --- |
| Everyone | [Current status](current-status.md), [generated inventory](generated/test-inventory.json) | Update execution evidence when the checkout changes; regenerate inventory after adding tests |
| Artists | [Safety and backup](guides/artwork-safety.md), [exports](contracts/exports.md), [shortcuts](contracts/shortcuts.md) | Keep menus, defaults, failures, and format limits aligned with actual workflows |
| Engineers | [Architecture](../ARCHITECTURE.md), [storage](contracts/storage.md), [rendering](contracts/rendering.md) | Change the affected contract alongside implementation and regression checks |
| Operators | [Deployment](guides/deployment.md), [security](../SECURITY.md) | Record deployed revision, cache identity, proxy trust, and rollback compatibility |
| Contributors | [Testing and evidence](guides/testing.md), [contributing](../CONTRIBUTING.md) | Separate discovery, execution, publication, and deployment; preserve failure artifacts |
| Product/research | [Issue and research registry](research/issue-registry.md), [learning contract](contracts/learning.md), [plans](plans/README.md) | Label shipped subsets, proposals, and studies awaiting participants |

The implementation owner for each subsystem owns its contract; there is no separate prose authority overriding source. Update claims where they occur instead of appending a universal status block to every file. Put stable behavior here; link dated measurements rather than copying counters.

Historical material retains original results, failures, fixtures, and release decisions. Add a dated erratum or supersession link; do not change an old failed run into a pass. Separate worktrees and ignored transcripts remain local revision-specific material. Vendor skill instructions are maintained through their upstream mechanism.

The [2 October audit](research/2026-10-02-documentation-codebase-audit.md) remains the pre-fix assessment. Its findings are tracked in the [remediation registry](research/issue-registry.md). Automated documentation checks validate owned local links, headings, generated inventories, selected source contracts and version/section rules; they do not certify every narrative sentence.
