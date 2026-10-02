# Documentation review follow-up — 2 October 2026

The user requested corrections to the confirmed findings of a nine-document, prose-only audit and fresh screenshots where current documentation still showed older UI. This follow-up changes documentation and image assets only, based on `1b13922`. It does not add a security scanner, change application code or dependencies, cut a release or establish a deployed revision.

## Corrections and scope

| Finding | Correction | Qualification |
| --- | --- | --- |
| Repository visibility versus clone instructions | MAIN now separates licensing from GitHub access; README setup explicitly requires repository access | Anonymous GitHub API returned 404 for this repository during the check. Authenticated Git history identifies the configured repository; no public-visibility promise is made |
| Unmeasured latency/render claims | Architecture and benchmarks describe ownership choices and design targets without zero-render or achieved sub-16ms promises | No new performance profile was run |
| Limits scattered across product and architecture prose | MAIN points to the existing storage, rendering and export contracts; peer per-frame limits are labeled as such | Distinct per-frame/total/aggregate ceilings remain distinct |
| Product description mixed with implementation/session log | MAIN is now a short workflow/stack/scope reference; its dated palette tail is replaced by current workflow links | Detailed history remains in CHANGELOG and original research records |
| Architecture/deep-dive navigation | Added a canonical reader map and a deep-dive contents list; retained numbered architecture anchors | No wholesale rewrite of historical algorithm material |
| Changelog difficult to scan | Added a short artist summary above detailed Unreleased entries | No new release/deployment claim or rewritten historical run |
| Security policy/reporting gaps | Added the user-provided private email, build/report scope, report contents and response/disclosure limits; moved technical defenses into a linked contract | No SLA, bounty or automated scanning verdict invented |
| Dependency policy missing | Documented the committed lockfile, CI `npm ci`, manual advisory-review procedure and current automation/action-pinning gaps | No dependency or CI/config changes; no new npm audit run claimed |
| Benchmark environment/extrapolation | Corrected the Windows 11 build label; retained actual historical Node 26 with explicit unsupported-runtime qualification; removed modeled ops/sec | Historical raw logs are unchanged |
| PixiMotion roadmap ambiguity | V2 now explicitly separates the ignored local proposal from shipped features and approved milestones | The ignored specification is not newly published or promoted to v2/v3 |
| Older screenshots in current reference | Replaced the three September architecture embeds; added current theme, palette, backup and export illustrations | Original files, dated research/release imagery and sealed manifests remain unchanged |

The public studio URL could not be verified from this environment, so no new live-demo availability claim was added. The README remains an artist introduction; a technical stack block and retired WFC action were not promoted into its feature list.

## Screenshots and validation

[Capture metadata and hashes](../assets/screenshots/2026-10-02-docs/run.json) identify the original artwork, base revision, Node 22.23.3, Chromium 151.0.7922.34 and 1440×960 viewport. Eight actual local UI states were captured with assertions and no page errors; six were selected for publication after visual review. The development badge was hidden through its own session preference. A first capture attempt found the local server stopped; starting the local server allowed capture. That connection refusal was not an application workflow failure.

The named-palette scan showed six draft colors; First/Last selection and the initial Cycle Loop 8 FPS / two-second / 16-frame summary were asserted. Project Backup was available. No backup/animation download or full browser-suite verdict is claimed by these screenshots.

The final `npm run verify:docs` passed, checking 903 local destinations across 70 owned Markdown files and the existing source/inventory contracts. Git reports no changes to source/test/script/package/CI files or historical evidence. All 93 previously tracked documentation PNGs match HEAD byte-for-byte; the 32 original audit artifacts and 12 remediation artifacts still match their sealed manifests. The six new published screenshots match their capture hashes. These checks do not certify every narrative sentence, all user inputs or a live deployment.
