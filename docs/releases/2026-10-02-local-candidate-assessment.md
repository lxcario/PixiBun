# Local release-candidate assessment — 2 October 2026

**Decision: production release is not approved.** Phase 7 completed locally on 3 October 2026, Europe/Istanbul; machine timestamps are UTC. This is a local candidate assessment, separate from the [historical v1.14.1 sign-off](v1.14.1-signoff.md). No deployment, rollback, commit or push is implied.

The candidate contains the prior documentation remediation and phases 1–6, a Next.js security patch to 16.3.6, and four practice-test URL assertions made portable. Its package remains 1.14.1. Base commit `1b13922cdd264d43d97b8b4fae16fca2b3ac0770` plus uncommitted changes does not identify a published release. Final commands, hashes and results belong in the [phase 7 execution record](../research/2026-10-02-feature-repairs-phase7.md).

| Gate | Observation / decision |
| --- | --- |
| Patched local gate/build and browser suites | Passed all five stages with 1,575 tests /159 suites; unchanged full editor rerun passed 183 Chromium cases; compiled suite passed 84 cases across Chromium/Firefox/WebKit, one worker and zero retries. The first patched editor run's navigation timeout remains a diagnostic with unresolved cause |
| Production dependency advisories | One Next.js advisory before patch; zero production advisories after patch at this checkpoint; not a penetration test or development-dependency review |
| Hostname mentioned in the earlier operator guide | `pixibun.art` returned `ENOTFOUND` from this machine; the intended canonical hostname has not been established by this check |
| Existing Vercel site | Four named endpoints returned 200; fresh Chromium Studio/worker/warm-offline smoke passed. Worker cache label is `pixibun-v1.14.1-1b13922`; this does not attest local repairs or a full deployed source revision |
| Two distinct application builds | Pending staging/deployed transition with dirty/saved tabs, asset availability, failure handling and reopening; the existing worker-script proxy fixture uses one application build |
| September rollback target | Reader from exact commit `771218dd1471e0138b10bfb80a7f4e2894a3afa9` rejected current-written ArrayBuffer raster records in the isolated three-engine diagnostic; original records were preserved. Do not treat this as a compatible rollback candidate |
| Compatible rollback candidate | Pending exact candidate, physical/optional-metadata read/render/save-back and source-preservation qualification; server rollback does not roll back IndexedDB |
| Host rollout/settings | Actual host skew protection, asset retention, deployment revision and rollback procedure remain unverified |
| Device, accessibility and artist evidence | Existing scoped automated checks do not close physical pen/touch, manual screen-reader, long-session/low-memory, real collaboration or participant studies |

To progress toward a production decision, identify the actual candidate commit/build and intended host, qualify two distinct application builds and a compatible rollback target on isolated backups, then record the deployed identities and executed observations. Follow [the release-readiness guide](../guides/release-readiness.md). The [research registry](../research/issue-registry.md) keeps the separate device/study work open.
