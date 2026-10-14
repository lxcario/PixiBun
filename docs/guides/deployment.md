# Deployment and operator contract

Use the declared **Node 22** runtime and the lockfile. `npm ci`, `npm run gate:full`, then `npm start` provide the repository's build/server path. Initial loading needs a Next.js-capable Node/platform runtime: per-request CSP nonces and dynamic routes mean this build is not a plain static-site export. Read the guides shipped in `node_modules/next/dist/docs/` before framework changes.

The root, Studio, Playground, service-worker route and optional relay have server/platform responsibilities; artwork drawing and most creative operations run client-side after loading. Hosting on a CDN edge does not mean all application code is an Edge-runtime function.

## Published configuration

The user requested main publication on 11 October after the [current status](../current-status.md). That request publishes reviewed repairs and documentation through the existing main pipeline. The qualifying branch CI result is not the result of the new main build, and publication does not close physical-device, Safari, accessibility or host/asset-retention qualification.

For the [3 October audit session publication (local archive)](../archives.md#record-docs-research-2026-10-03-audit-session-publication-md), the user explicitly requested a push to main after its deployment implications were stated. That authorization applies to this publication; the workflow's actual CI/deployment outcome still requires its own verification.

The repository's [GitHub deploy workflow](../../.github/workflows/deploy.yml) can publish main to Vercel when CI succeeds for a **push to this repository's main branch** and deployment credentials are configured. Pull-request runs, fork runs, other branches, unsuccessful runs and incomplete event metadata are rejected by the job condition. Checkout and build metadata both use the successful run's full commit SHA. The job has read-only repository permissions, does not persist checkout credentials and has a 30-minute deadline. Its missing-credentials notice also describes a possible independent Vercel GitHub App deployment on push; the actual integration settings are not established by this checkout. Pushing main can therefore initiate production publication. Use a review branch when publishing source without a production decision, and verify host settings before an intended release.

Production jobs share one concurrency group, queue up to 100 waiting jobs and do not cancel an active deployment. Queueing prevents a later-arriving stale CI completion from evicting a newer waiting candidate; the platform can cancel arrivals beyond its queue limit. Queue order is not commit order: the [candidate check](../../scripts/checkDeploymentCandidate.mjs) reads the current main reference before preparing Vercel artifacts and again immediately before deployment. Only a SHA equal to current main proceeds. HTTP, network, timeout or malformed-reference failures block deployment. A newer main commit with pending or failed CI leaves the existing production release in place rather than deploying an older successful candidate.

These checks govern this workflow. The final branch read and Vercel command are separate operations; they do not provide an atomic cross-platform promotion lock. Independent Vercel Git deployments, manual deployments or remote work continuing after runner timeout require separate operator verification. Inspect the project's Git integration before relying on this workflow as the sole production gate.

The pinned Vercel CLI receives `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` through step environment variables. Tokens are not embedded in command arguments. All CLI steps are skipped when a required credential is absent or the candidate is stale/unverified. The configured Vercel install command is `npm ci`, preserving the checked-in dependency resolution. Do not add untrusted artifact downloads or pull-request code execution to this privileged workflow.

Copy the safe [environment template](../../.env.example) into local/operator configuration. Do not commit secrets or real upstream credentials.

| Variable | Scope |
| --- | --- |
| `DIAGNOSTICS_RELAY_URL` | Optional server-owned HTTPS diagnostic upstream. Leave unset to disable forwarding on the endpoint. Client relay opt-in is separate |
| `SW_CACHE_VERSION` | Optional build-time service-worker identity override. Use a unique tag for every distinct application build; not a database migration or runtime rollback mechanism |
| `VERCEL_GIT_COMMIT_SHA` | Full deployment commit used for cache identity when no explicit override is set. The deploy workflow supplies the tested commit |
| `PIXIBUN_PRODUCTION_PORT` | Local production-test server, default 3100; integer 1024–65535. Non-default output is `artifacts/playwright-production-PORT` |

Preserve request-origin/header behavior through the proxy. A provided Origin must equal the request URL's exact scheme/host/port; absent Origin is accepted. This is browser-origin admission, not authentication. Sanitize forwarded client-IP headers at a trusted proxy; direct clients can otherwise spoof process-local rate-limit keys. The relay limits 64 KiB bodies, 100 events, 12 requests/minute per process/client key, and a five-second upstream deadline. It forwards bounded generic envelopes, not full runtime `DiagnosticEntry` schemas. HTTPS configuration alone is not a universal guarantee against operator error or upstream redirect risk.

## Offline, updates and rollback

Follow the [release-readiness guide](release-readiness.md) for candidate identity, two-build transitions, host checks and rollback qualification. Dated local checks belong in their execution records, not in the historical release sign-off.

Warm-cache offline editing depends on a previous successful online load, service-worker install/cache and stored project. First visits offline cannot fetch the editor. Browser storage/cache can be evicted. API calls remain network-dependent.

Build identity resolves in this order: explicit `SW_CACHE_VERSION`, package version plus full `VERCEL_GIT_COMMIT_SHA`, then package version plus full Git HEAD. An explicit tag must start with a letter or number and contain at most 192 letters, numbers, dots, underscores, plus signs or hyphens. Malformed provider metadata fails configuration. A production source archive without Git or deployment metadata must supply a unique override; it cannot silently reuse a `local` identity. Development without Git receives a fresh session identity. Commit-based identities assume committed build inputs; rebuilds of changed local files or different build settings under the same commit need distinct overrides.

Updates wait naturally unless a real window requests **Restart to update**. The active Studio save coordinator must succeed before APPLY_UPDATE and again before that initiating page reloads on controller change. Other tabs do not automatically reload. The worker retains older PixiBun caches when more than one window client exists at activation, and missing assets can fall back to other caches. With at most one client it removes older namespaced buckets. This is a local policy, not proof that a host retains old server assets or that all possible tab races/rollbacks are qualified.

Verify installation, a warm offline reload/edit/save/reopen, update availability, dirty-work protection and the selected refresh path against the deployed build. Cache version changes do not convert stored records. Qualify an old build against new ArrayBuffer-backed raster records and optional metadata before rollback; use portable backups and never clear local artwork automatically.

Record the intended canonical hostname, deployment revision, package, build date, cache identity, host/runtime and verification results in a release record. [Phase 7 (local archive)](../archives.md#record-docs-research-2026-10-02-feature-repairs-phase7-md) separates observations of the existing Vercel site from the failed lookup of the `pixibun.art` hostname previously mentioned here. Those observations do not attest the full deployed source, update the historical September sign-off or authorize an automatic deployment.
