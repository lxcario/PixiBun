# Evidence: 5 October 2026 deep audit

Revision: `f18f4e47d299685d7fdf23de158ae082a883483d`, package 1.14.1. Read the [dated audit](../../2026-10-05-deep-product-code-audit.md) for interpretation. This folder records an audit, not implementation repairs or release approval.

## Executed checks

| Check | Outcome | Scope |
| --- | --- | --- |
| `npm run gate:full` | Passed: documentation integrity, TypeScript, lint, 173 test files / 1,766 tests, production build | Before adding these audit artifacts; local Node 26.5.1, not declared Node 22.x |
| `npm audit --json` | Exit 0; zero registry-reported vulnerabilities | Installed dependency graph; [captured result](dependency-audit.json); first restricted-network attempt failed, permitted retry succeeded |
| `npx vitest run --config docs/research/evidence/2026-10-05-deep-audit/probe.config.mjs --reporter=verbose --disableConsoleIntercept` | 7 diagnostic probes passed | Assertions demonstrate current problematic behavior, not repaired behavior; [log](probe-run.log) |
| `node docs/research/evidence/2026-10-05-deep-audit/browser-probes.mjs` | Completed, collected observations, browser page-error array empty | Compiled Next production server at localhost:3107, isolated Chromium context; [results](browser-results.json), [runner output](browser-run.log) |
| `node docs/research/evidence/2026-10-05-deep-audit/inventory.mjs` | 310 source files / 80,097 newline-counted lines catalogued | Static approximate import edges, hashes and sizes; [inventory](source-inventory.json), not proof every line was manually reviewed |
| Final artifact checks | TypeScript and documentation checks passed; probe lint exited 0 with seven intentional diagnostic-output warnings and zero errors | [Final log](artifact-checks.log); source lint from the full gate is separate from these added evidence probes |

The full gate's output was observed in the audit session; this table is a summary, not a sealed complete raw gate transcript. The probe and browser files contain the final diagnostic runs. Runner setup was iterated during the audit; notably the focus probe was corrected to focus the search field explicitly before tabbing. The reported focus escape is from that corrected run. Initial fixture iterations are not represented as final release evidence.

## Artifacts

- [Diagnostic probe source](probes.test.ts) and [configuration](probe.config.mjs): actual store/hook/database probes except the cross-frame layer selector, which is a minimal reproduction of the inspected selector expression.
- [Compiled browser probe source](browser-probes.mjs) and [JSON observations](browser-results.json): focus escape, shortcut hint, navigator dimensions, small button dimensions, gallery rename and stored title.
- [Studio](studio.png), [Lighting workspace](lighting-workspace.png), [post-rename state](self-rename.png): actual compiled interface captures; not a full visual conformance assessment.
- [Dependency audit](dependency-audit.json) and [source catalogue](source-inventory.json).
- [Final artifact checks](artifact-checks.log): later documentation/type checks for the added artifacts, separate from the original full gate.

The rename browser probe demonstrated that clicking Save title closes the gallery without changing the stored title. The separate database probe demonstrated a version conflict after direct rename; it does not establish that the unsuccessful pointer workflow reached that conflict.

No application source was edited, no tests in the normal inventory were replaced, no existing project data was used, and no remote deployment was claimed. The probes live outside normal runner discovery. They must be converted to desired-behavior regression assertions when the defects are repaired; adding these current-bad-behavior assertions to CI would be misleading.

Re-running the browser probe requires a compiled app at port 3107 and the installed Playwright Chromium runtime. It creates a fresh isolated context; it does not use an artist's existing browser profile. Source hashes describe the audited application files; this folder was added after the audited commit.
