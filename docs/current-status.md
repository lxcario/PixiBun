# Current checkout status

Updated 2 October 2026. Package `1.14.1`; base revision `277dc0b02680a3afc56a6860cbb14cbc7f5fd53f`. The remediation was verified locally against the working tree described in the evidence below. Git publication does not imply a new deployment or release sign-off. The [September release decision](releases/v1.14.1-signoff.md) applies to its own deployed build.

## Capabilities and limits

| Capability | Status | Source/evidence and limit |
| --- | --- | --- |
| Drawing, layers, history, animation, normal sculpting | Implemented | [Architecture](../ARCHITECTURE.md); admitted workspace/history limits apply |
| Local saves, revision conflicts, recovery copies, untouched archives | Implemented | [Safety](guides/artwork-safety.md), [storage](contracts/storage.md); browser storage is not a portable backup |
| Palette authoring and bounded color-cycle export | Implemented | [Exports](contracts/exports.md); scan summarizes at most six source colors; GIF quantizes |
| Animation review, protected cleanup and game kit | Implemented bounded subsets | [Phase record](research/phase-implementation-status.md); artist benefit and broader engine qualification remain pending |
| Protected simplification, shared light and small tile scenes | Implemented bounded subsets | [Rendering](contracts/rendering.md); not general depth reconstruction or world generation |
| Two-peer pixel collaboration | Implemented protocol and integration | Host owns structure; real two-machine/stress qualification remains pending |
| Warm-cache offline editing | Tested workflows | Requires a prior online load/cache; no guarantee of browser storage permanence |
| v2 GPU/SIMD/tree CRDT/P3/native/neural roadmap | Proposal | [v2 vision](../V2_VISION.md); no shipped model/native package implied |
| Artist, pen, assistive technology and long-session studies | Pending | [Research registry](research/issue-registry.md); automated journeys are not participant studies |

## Inventory versus executed evidence

Counts are maintained once in [generated/test-inventory.json](generated/test-inventory.json). Generate with `npm run docs:inventory`; check with `npm run verify:docs`. Inventory enumerates tests and does not claim they passed.

Before remediation, the [2 October audit](research/2026-10-02-documentation-codebase-audit.md) recorded a passing full gate (1,502 tests / 149 suites), 39 passing production scenarios, and an editor run with 148 passes / seven stale-locator failures. Seven adapted diagnostic copies passed; the tracked suite was still failing. Those records remain unchanged.

Remediation runs and final results are recorded in [the correction record](research/2026-10-02-audit-remediation.md), with logs, runtime, revision and working-tree scope. Do not substitute a new inventory for an executed verdict. Lighthouse, coverage, real device tests and participant work are separate checks.

The completed remediation passed **1,524 unit/integration tests across 153 suites**, the five-stage gate/build, **158 Chromium editor workflows**, and **42 compiled-production scenarios across Chromium/Firefox/WebKit**. Historical screenshots and original audit artifacts retain their original bytes. These are local working-tree results, outside the September deployment sign-off.
