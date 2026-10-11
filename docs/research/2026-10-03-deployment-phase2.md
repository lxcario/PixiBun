# Deployment phase 2: trust and build identity

Maintenance update — 11 October 2026: see the [11 October validation handoff](2026-10-11-validation-handoff.md) for the current engineering milestone. Earlier measurements, failures and decisions below retain their original revision and scope.

Date: 3 October 2026. Base: `32c6a940ff4b652afadf93e177ccee46ec708cf7`; package `1.14.1`. This follows the [co-draw phase 1 repair](2026-10-03-codraw-phase1.md) after validation of the pasted audit, separate from the earlier feature-repair numbering. Both phases remain local and uncommitted. This record does not attest a GitHub Actions run, a Vercel deployment or a release.

## Confirmed problem and repair

The deployment job previously checked only successful CI. Its `workflow_run` branch filter was insufficient to establish that the originating run was a trusted push. The job now requires successful CI originating from a push to this repository's main branch. It rejects pull-request runs, fork runs, other branches, failed runs and missing event metadata. It checks out the triggering run's full SHA, removes persisted checkout credentials, grants only repository read access and has a 30-minute deadline. GitHub documents that a `workflow_run` successor can receive privileged tokens and secrets even when its predecessor cannot; untrusted predecessor code therefore needs an explicit trust boundary. [GitHub event documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run).

Vercel commands receive credentials in step environments rather than token arguments. Credential admission still skips all CLI commands when any required secret is absent. Current Vercel documentation supports `VERCEL_TOKEN`; the exact pinned `vercel@50.34.0` npm archive was also inspected and contains that environment fallback. The CLI pin is unchanged. Vercel installation uses `npm ci`. [Vercel token documentation](https://vercel.com/docs/cli/global-options#token).

Service-worker identity previously fell back to `v1.14.1-local` without Git, allowing unrelated source archives to reuse one cache bucket. The extracted configuration helper now prefers an explicit release override, then the provider's full deployment SHA, then full Git HEAD. Missing production identity or malformed provider metadata fails configuration with a readable error. Development without Git has a fresh session identity. Overrides are validated as bounded safe cache tags, and the environment template leaves the example override commented out. The workflow supplies its checked-out SHA to the build. Vercel documents its deployment commit variable as available at build/runtime when system variables are enabled. [Vercel commit metadata](https://vercel.com/docs/environment-variables/system-environment-variables#vercel_git_commit_sha).

Commit identities assume committed build inputs. Different local edits or build settings under the same commit need different explicit overrides. These checks do not prove a deployed two-build transition or rollback compatibility.

Next.js is pinned from `16.3.6` to `16.3.8`, the patched 16.3 line in the September security release. Framework advisories have configuration-dependent exposure; applying this patch does not establish that every listed issue was exploitable in PixiBun. Next's shipped configuration/deployment guides were read before editing. The lockfile changes only Next and its companion packages, plus the development-only official GitHub expression evaluator used by the new trust regressions. React, Dexie, application package version, Node policy and Vercel CLI pin are unchanged. [Next.js security release](https://nextjs.org/blog/september-2026-security-release).

Implementation: [workflow](../../.github/workflows/deploy.yml), [configuration helper](../../scripts/getBuildVersion.mjs), [Next config](../../next.config.ts), [operator contract](../guides/deployment.md).

## Verification

The [execution and source/build record](evidence/2026-10-03-deployment-phase2/run.json) hashes 570 source, test, public-asset and configuration inputs, plus the compiled build and retained evidence. All eight phase 1 repair/test/configuration input hashes still match their earlier record.

| Check | Result | Scope |
| --- | --- | --- |
| Focused regressions | 32 passed /3 files | Actual deployment expressions, build identity and existing service-worker route checks |
| Full local gate | Five stages passed; 1,620 unit tests /162 suites | Documentation, type checking, lint, unit/integration tests and Next.js 16.3.8 production build; Node 22.23.3; default unit workers |
| Compiled candidate build | Passed with a unique local override | Separate identity for this uncommitted candidate; source unchanged after the full gate |
| Compiled worker response | HTTP 200; expected unique cache name and headers | `/sw.js` from the running candidate at local port 3141, including `no-store` and root worker scope |
| Two targeted compiled browser suites | 21 passed /3 capability skips | Chromium/Firefox/WebKit; one worker, zero retries; existing timeouts |
| Full dependency advisory query | Zero reported advisories | Resolved production and development dependencies; not security certification |
| TestSprite | Unavailable | Missing CLI; no runner verdict |

Deployment cases parse the actual YAML and evaluate the actual job expression with GitHub's official expression library, including absent nested fields. Build cases generate two actual service-worker scripts for different Git-less provider commits and check their cache names. They do not execute a remote privileged job.

The compiled operation suite checks drawing/save/reload/history, two-tab conflict copies, warm offline editing/save/reopen, native GIF decoding and waiting-worker activation after all tabs close in all three engines. The co-draw suite checks original/shared isolation through real Chromium/Firefox pairing and invalid invites in all engines. WebKit has no WebRTC in this Windows runtime: its live-pairing case skips and its safe-refusal case passes; Chromium/Firefox skip that unsupported-runtime-only case. Firefox logged a failed background RSC network request while the offline test deliberately stopped its origin; exact artwork reload, edits and saving still passed. Waiting-update tests serve two worker versions over the same actual compiled app; they are not a qualification of two separately deployed application builds.

Retained evidence: [full gate](evidence/2026-10-03-deployment-phase2/full-gate.log), [candidate build](evidence/2026-10-03-deployment-phase2/candidate-build.log), [browser run](evidence/2026-10-03-deployment-phase2/production-run.log), [worker response](evidence/2026-10-03-deployment-phase2/compiled-worker-response.json), [pinned CLI source inspection](evidence/2026-10-03-deployment-phase2/pinned-cli-token-support.json), [dependency query](evidence/2026-10-03-deployment-phase2/dependency-audit.json). Detailed browser traces and GIF attachments remain in ignored `artifacts/playwright-production-3141`.

The fresh full dependency advisory query returned zero reported advisories. This is an observation of the resolved dependency tree and advisory endpoint, not a security certification. The initial focused run passed while type checking found an overly strict environment type on the helper's injected test inputs; the helper now accepts the optional string-valued environment it actually reads.

## Remaining boundaries

Live GitHub/Vercel behavior, independently configured Vercel GitHub App settings, remote Linux CI, physical devices and deployed update/rollback qualification remain separate. No deployment credentials were read or used. This phase does not repair the remaining collaboration protocol, keyboard/modal, memory or export findings.

The [TestSprite verification skill](../../.agents/skills/testsprite-verify/SKILL.md) requires a terminal runner result and says: “`--version` fails → the CLI isn't installed. Tell the user to install the TestSprite CLI (see the TestSprite docs) and stop; don't install it for them.” Its preflight remains unavailable because the CLI is missing. No TestSprite result is claimed; local checks do not substitute for that runner, and phase 1 retains the same gap.
