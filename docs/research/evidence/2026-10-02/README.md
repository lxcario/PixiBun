# Documentation audit evidence — 2 October 2026

Reviewed main application commit: `277dc0b`. Package `1.14.1`. Local timezone: Europe/Istanbul; packaging was recorded at `2026-10-01T21:54:49Z` (2 October locally).

[Complete report](../../2026-10-02-documentation-codebase-audit.md): 40 findings, every intake Markdown file's disposition, source-contract analysis, missing guides, and correction order.

## Actual results

| Artifact | Result and interpretation |
| --- | --- |
| [Full gate](gate-full.log) | All five checks passed in 68.78s under Node 22.23.3: documentation rules, types, lint, 1,502 tests/149 suites, production compilation |
| [Initial production run](production-browser.log) | Browser startup blocked by sandbox `spawn EPERM`; not an application failure; owned blocked run subsequently interrupted |
| [Permitted production run](production-browser-permitted.log) | All 39 scenarios passed in 7.4m across Chromium, Firefox and WebKit, compiled server port 3301 |
| [Unmodified full editor run](editor-browser.log) | **148 passed, seven failed**, 155 tests/37 files, one Chromium worker, 10.0m; stale controls/labels |
| [Selector diagnostics](selector-diagnostic.log) | Seven copies using current controls passed in 26.1s; tracked tests/application unchanged; not a clean unmodified 155/155 result |
| [Run summary](run-summary.json) | Revision, counts, exclusions and unrun qualifications |
| [Failure artifacts](failure-captures.json) | Seven original screenshots and corresponding context text, indexed in execution order |
| [Capture restoration](capture-restoration.json) | 30 historical tracked PNGs overwritten by existing tests were copied locally, then restored to exact HEAD bytes |

The seven first failures were two removed `64×64` button lookups, two expanded offline-label lookups, the old direct Gallery and Guide buttons, and the old lighting-panel title. Diagnostic copies followed File → Projects, Studio → Help, compact Offline, and Light your sprite. Import copies asserted actual canvas width instead of an obsolete header button. Remaining workflow assertions were retained.

No Lighthouse, fresh coverage, advisory query, live deployment, Godot, physical hardware/pen, long-session memory, real two-machine WebRTC, or participant study was run. No external testing upload or tunnel was used. The separate checkout was not run through its own regression campaign.

## Complete inventories

| Artifact | Scope |
| --- | --- |
| [Primary Markdown inventory](primary-markdown-inventory.json) | 52 intake files, line counts, headings, tracking status, hashes and checkpoint presence; 49 tracked, three ignored |
| [All Markdown inventory](full-markdown-inventory.json) | 79 intake files: 52 primary, 26 in the old separate checkout, one generated local TestSprite report |
| [Code inventory](code-inventory.csv) | 567 paths, tracking state, area, newline-split lines and SHA-256; includes ignored scripts and classified generated test code |
| [Structured code inventory](complete-code-inventory.json) | Same as JSON; 286 application files/77,557 newline-split lines; all included code/config 138,272 lines |
| [Application source map](source-map.json) | Per-file imports/exports, worker/type-only edges, allocation sites and doc mentions; not a semantic correctness proof |
| [Local link examination](links-reviewed.json) | 906 local destinations, no missing files, four confirmed heading errors, one identified underscore-scanner false positive |
| [Evidence manifest](manifest.json) | SHA-256 and byte sizes; excludes this index and the manifest itself |

Inventories are frozen at intake. Dependencies, Git internals, generated Next/browser/coverage/Lighthouse output and screenshot directories are excluded. The source inventory covers all `src`. Separate-checkout Markdown is a different revision, not part of main source counts. The new audit report and this index are additions after the 79-file census.

## Reproduction and diagnostic-copy provenance

From the repository root with supported Node 22:

```powershell
npm run gate:full
$env:PIXIBUN_PRODUCTION_PORT = '3301'
npm run test:e2e:production
npm run test:e2e -- --workers=1
```

Use an available port and record it. Browser launch must be permitted. Editor config may reuse a local development server; production config starts its own compiled server. Results apply to the recorded checkout/environment. The unmodified editor run writes into historical screenshot folders: preserve/restore those outputs, or fix capture destinations before routine reruns.

[Diagnostic creator](create-selector-diagnostics.mjs) builds scratch copies from tracked tests into `artifacts/doc-audit-2026-10-02/adapted`. It contains only copy creation, not historical-image restoration. Copy the [configuration source](diagnostic-config-source.txt) to `artifacts/doc-audit-2026-10-02/diagnostic.config.ts`, start the development server, then run:

```powershell
node docs/research/evidence/2026-10-02/create-selector-diagnostics.mjs
npx playwright test --config artifacts/doc-audit-2026-10-02/diagnostic.config.ts --grep 'image import keeps|suggested sprite sheet keeps|warm installed studio|opening damaged project from gallery|opens Guide and Shortcuts|RightInspector panels expanded|Capture Studio default'
```

This helper is a dated audit probe, not a tracked-test repair or production dependency. Preserve the original failing log with the diagnostic result. A tracked fix must run the complete original suite and produce new dated evidence.
