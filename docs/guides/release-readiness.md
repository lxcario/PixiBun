# Preparing a PixiBun release

A local passing build is a candidate for release. Publish a separate dated decision only after checking the actual candidate and host. Use [current status](../current-status.md) for executed local evidence and [deployment](deployment.md) for server configuration.

## Freeze and identify the candidate

Record the full commit, package version, lockfile, Node/npm versions, build time, source fingerprints and service-worker cache identity. A dirty checkout needs its own file hashes; its base commit or package number cannot identify all its changes. Build once from the frozen candidate before compiled-browser checks. Rebuild and qualify again after a meaningful source, dependency or build-configuration change.

Use a deliberate cache identity for the candidate. The default derives from package version and the full deployment SHA or Git HEAD, so two different uncommitted builds on the same base can share that identity. Changing `SW_CACHE_VERSION` produces a different worker/cache name; it does not identify every application asset, migrate artwork or prove deployment compatibility. Source archives without Git or deployment metadata require a unique override. See [identity precedence](deployment.md#offline-updates-and-rollback).

Record documentation, type, lint, unit/build and full browser results separately. Preserve failures and interrupted runs with their original commands. Review a fresh production-dependency advisory result and whether each reported path is used. A clean advisory result is a dated registry observation, not a security certification. [Testing and evidence](testing.md).

## Verify the host and update path

Record the intended hostname and final URL, TLS/redirect behavior, deployment identity, worker MIME/scope/cache headers and a clean-browser Studio smoke check. HTTP 200 and a worker's short revision label do not attest the full deployed build. If the intended domain cannot be reached, record that observation and investigate DNS/TLS/host configuration before calling it verified.

Check two distinct application builds on the same staging origin. Save portable fixture backups first. Keep one tab dirty and another saved; observe the new worker waiting, update instructions and dismissal without forced refresh. Verify the artwork and selected project identity in each tab. Save explicitly, close all PixiBun tabs, reopen, then verify activation, current assets, saved pixels, editing and a warm offline reopen. Include a failure to install/cache the new shell and a return to the previous build.

The existing proxy test with two worker scripts exercises a real worker lifecycle over one application build. It is useful regression evidence but cannot replace that deployment transition. Next.js and the host also need a strategy for requests from old tabs to assets/routes of the new build. The repository's worker protection does not prove that every lazy chunk is cached or retained by the host. Inspect actual hosting settings; do not infer platform skew protection from a local configuration file.

The separate `playwright.release.config.ts` runs two actual compatible compiled applications. Set `PIXIBUN_ROLLBACK_DIRECTORY` to a preserved directory containing the previous `.next`, `public` and package metadata, retain its build hashes, and run `npx playwright test --config playwright.release.config.ts --workers=1 --retries=0`. Ports 3162 and 3163 must be free. Its isolated local origin checks refused shell installation, dirty/saved tabs, waiting activation, native storage, update, rollback, save-back and offline artwork. The fixture observes native activation before reopening; it does not force takeover. An exact native WebKit legacy-Blob fixture error permits a capability skip only after unchanged identity, document fields, raster bytes and pixels are verified. Current-format rollback still executes. Final bounded results and excluded longer-session checks are in the [11 October handoff](../research/2026-10-11-validation-handoff.md). It runs ArrayBuffer and legacy Blob fixtures in all three engines. The proxy retains both builds' static assets; this does not qualify a production host's asset retention or skew protection. Keep its results separate from the complete production-suite verdict.

## Qualify rollback before using it

A server rollback leaves browser IndexedDB and portable project formats as they are. Test the exact rollback candidate against copies of records written by the new build, including physical ArrayBuffer rasters, legacy Blob rasters and optional project metadata. Check read, render and save-back behavior, metadata preservation, conflicts and source custody. Use isolated fixtures and compare exact bytes/identities before and after.

An old reader that cannot admit current records is an incompatible rollback target. Keep the original stored records; do not clear storage or silently rewrite artwork to make the old build open. Prefer a compatible forward repair, or prepare and independently qualify a compatible rollback candidate. A module-level reader diagnostic can identify a concrete incompatibility; it does not approve a full historical production build.

The current format-v4 candidate needs a rollback reader that admits v4 and preserves motion definitions. The former `dcf9f5c` schema rejects a real current-written backup in the [7 October diagnostic](../research/2026-10-07-editing-quality-release-hardening.md); returning to that reader after v4 saves is not a qualified recovery path. Qualify a compatible forward repair or rollback candidate against copied data before choosing it.

## Record the decision

Check publication triggers before pushing the candidate. The checked-in [deployment workflow](../../.github/workflows/deploy.yml) follows successful main CI and can publish production when credentials exist; an independently configured hosting integration may deploy on push too. A review-branch push and a main push have different release consequences. See [deployment configuration](deployment.md#published-configuration).

The release record should state candidate/deployed identities, host/runtime/cache settings, executed commands and results, remaining qualification, selected rollback candidate and decision owner. Keep the historical September sign-off unchanged. A draft assessment, local screenshots or a completed repair plan does not approve production publication.

Physical pen/touch devices, manual keyboard/screen-reader testing, low-memory/long-session profiles, participant usefulness and real two-machine collaboration remain their own qualification rows in [the research registry](../research/issue-registry.md). Close them only with actual observations.
