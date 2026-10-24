# Two persistent branches — 18 October 2026

The owner requested a simpler repository: `main` for production and `testsprite-s4` for integration. The four extra origin branches were `codex/s4-portal-verification`, `codex/s4-publication-readiness`, `codex/chisel-layer-safety` and `codex/s4-artwork-proof`.

## What the audit established

The first three branches have no unique non-merge patches against the latest integration. The artwork/evidence branch has four unique patches: selected-layer protection and evidence, Colors focus, pending-repair/automatic-count safeguards, and the five trust journeys with their register. Those changes are retained in this merge rather than dropped during branch cleanup.

The integration history had also been rewritten. Actual file identities establish the correspondence:

| Baseline | Original commit | Rewritten commit | Identical Git tree |
| --- | --- | --- | --- |
| Existing production | `92de6c74b259eafcf73cc986b1def6c69f5566aa` | `aeec3f91d13da4a83e578d3cb3eb39dd617b30f3` | `1d2ac560dd773ddbafeb25626292ad65a4b4cbe8` |
| Earlier integration | `26db4c5a07b1c405812a205b5a35eaff176e0632` | `3fc5c376824f398c2abd461f8bb9ae89f58b4baa` | `62b049e271d76893bd47eb61ddab31e77c6c2431` |

The rewritten production baseline is an ancestor of integration source `15de2da689085906265a6e2abe3da6793a7cf12b`. A history-only merge brings the original production parent into that history without changing a single file. The evidence merge uses the verified equivalent earlier-integration tree as its explicit three-way base; this avoids reapplying dozens of already-integrated patches under their old identities. Both original parents remain in history. No force-push to a shared branch or update of production is part of this consolidation.

## Conflict decisions

Five genuine overlaps were reviewed: ignore rules, the documentation map, current-status entries, generated test inventory and the selection hook. Both sets of ignore rules and status records are kept; the map links both cleanup and evidence records; inventory is regenerated from the actual combined source.

The current floating-selection commit still writes to its original, validated source layer through `floatingSelectionTarget` and `confirmLayerEditable`. It must not fall back to the active layer or record two history captures. The retained selection repair still refuses edits to hidden/locked or stale active targets and propagates a failed lift/commit without dropping floating content. Colors remembers its actual opener. Existing regression suites cover both sides of this integration.

The newer MP4/WebKit refusal, browser-settling fixes, Day/Night cleanup and retired-engine removals remain. An ordinary historical merge would have resurrected the retired volumetric test; the equivalent-base merge correctly keeps that removal.

## Preservation and publication

A verified complete Git bundle was saved locally before consolidation, including all origin branches and PR heads. It is private local evidence, not a source-checkout asset. Remote branches may be removed only if their exact recorded heads are still current and they are ancestors of the consolidated integration. The intended push is atomic: advance `testsprite-s4` and remove the four incorporated origin branches together, after the normal pre-push gate. Main remains unchanged and existing PR records stay available.

Other agents' shared checkout, local branches and checked-out worktrees are not deleted or reset. The two-branch policy concerns the persistent origin branches; local agent work needs a deliberate handoff before its checkout can be retired.

Earlier test/build/cloud results retain their original source commits. This combined tree needs its own qualification; follow the integration PR checks and the new merge's source-labelled record rather than attributing an older passing result to it. Billing and private-repository CI limitations are not bypassed by branch cleanup. The repository remains private at the owner's request; the supplied competition rules still require public submission access.
