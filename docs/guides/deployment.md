# Deployment and operator contract

Use the declared **Node 22** runtime and the lockfile. `npm ci`, `npm run gate:full`, then `npm start` provide the repository's build/server path. Initial loading needs a Next.js-capable Node/platform runtime: per-request CSP nonces and dynamic routes mean this build is not a plain static-site export. Read the guides shipped in `node_modules/next/dist/docs/` before framework changes.

The root, Studio, Playground, service-worker route and optional relay have server/platform responsibilities; artwork drawing and most creative operations run client-side after loading. Hosting on a CDN edge does not mean all application code is an Edge-runtime function.

## Published configuration

The repository's [GitHub deploy workflow](../../.github/workflows/deploy.yml) can publish main to Vercel after CI succeeds when its deployment credentials are configured. Its missing-credentials notice also describes a possible independent Vercel GitHub App deployment on push; the actual integration settings are not established by this checkout. Pushing main can therefore initiate production publication. Use a review branch when publishing source without a production decision, and verify host settings before an intended release.

Copy the safe [environment template](../../.env.example) into local/operator configuration. Do not commit secrets or real upstream credentials.

| Variable | Scope |
| --- | --- |
| `DIAGNOSTICS_RELAY_URL` | Optional server-owned HTTPS diagnostic upstream. Leave unset to disable forwarding on the endpoint. Client relay opt-in is separate |
| `SW_CACHE_VERSION` | Build-time service-worker cache identity. Change deliberately for a new shell; not a database migration or runtime rollback mechanism |
| `PIXIBUN_PRODUCTION_PORT` | Local production-test server, default 3100; integer 1024–65535. Non-default output is `artifacts/playwright-production-PORT` |

Preserve request-origin/header behavior through the proxy. A provided Origin must equal the request URL's exact scheme/host/port; absent Origin is accepted. This is browser-origin admission, not authentication. Sanitize forwarded client-IP headers at a trusted proxy; direct clients can otherwise spoof process-local rate-limit keys. The relay limits 64 KiB bodies, 100 events, 12 requests/minute per process/client key, and a five-second upstream deadline. It forwards bounded generic envelopes, not full runtime `DiagnosticEntry` schemas. HTTPS configuration alone is not a universal guarantee against operator error or upstream redirect risk.

## Offline, updates and rollback

Follow the [release-readiness guide](release-readiness.md) for candidate identity, two-build transitions, host checks and rollback qualification. Dated local checks belong in their execution records, not in the historical release sign-off.

Warm-cache offline editing depends on a previous successful online load, service-worker install/cache and stored project. First visits offline cannot fetch the editor. Browser storage/cache can be evicted. API calls remain network-dependent.

Verify installation, a warm offline reload/edit/save/reopen, update availability, dirty-work protection and the selected refresh path against the deployed build. Cache version changes do not convert stored records. Qualify an old build against new ArrayBuffer-backed raster records and optional metadata before rollback; use portable backups and never clear local artwork automatically.

Record the intended canonical hostname, deployment revision, package, build date, cache identity, host/runtime and verification results in a release record. [Phase 7](../research/2026-10-02-feature-repairs-phase7.md) separates observations of the existing Vercel site from the failed lookup of the `pixibun.art` hostname previously mentioned here. Those observations do not attest the full deployed source, update the historical September sign-off or authorize an automatic deployment.
