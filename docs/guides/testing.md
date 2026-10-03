# Testing and evidence

Use Node 22. Runner enumeration is in [generated inventory](../generated/test-inventory.json); actual verdicts belong in dated run records. The [current status](../current-status.md) links the latest scoped correction work.

| Check | Local command | Enforced scope |
| --- | --- | --- |
| Documentation | `npm run verify:docs` | Owned links/headings, live inventory, selected source contracts, sections/version; not prose truth certification |
| Static types | `npm run typecheck` | Strict project compilation with `skipLibCheck`; not all runtime inputs/dependencies |
| Lint | `npm run lint` | Configured code/accessibility rules; not assistive-technology qualification |
| Unit/integration | `npm test` | Existing Vitest assertions; no coverage instrumentation by default |
| Full gate | `npm run gate:full` | Docs, types, lint, units and production build; browser/coverage/Lighthouse separate |
| Editor workflows | `npm run test:e2e` | Chromium development server on 3000; some tests use development-only store/database handles. CI retries twice |
| Production workflows | `npm run test:e2e:production` | Separate compiled server in Chromium/Firefox/WebKit; counts in generated inventory; one worker, zero retries |
| Coverage | `npm run test:coverage` | Configured thresholds 60% statements/lines, 50% branches, 55% functions; optional, not part of gate/CI |
| Lighthouse | `npx @lhci/cli@0.15.1 autorun` | Separate configured budgets and fixture/routes; dated environment evidence |

GitHub CI runs gate/build, Chromium editor checks, three-engine production checks and Lighthouse. GitLab runs the standard gate plus its main-branch build; it does not provide the same browser/Lighthouse matrix. Do not equate configured thresholds with executed coverage. The pre-push hook is a bypassable convenience check of the working tree, which can differ from the commits pushed.

For a final local reconciliation, freeze the source and finish the gate/build before starting the compiled-browser suite. Avoid changing test expectations or rebuilding while that suite is running: it must exercise the same source as its build. Run resource-heavy gate/editor/production suites sequentially on one machine; preserve any earlier failed or interrupted runs with their actual scope. The [phase 5 record](../research/2026-10-02-feature-repairs-phase5.md) separates these diagnostics from final verdicts.

When verifying a dependency change, a still-running development process may retain the old framework/compiler. Qualify a fresh owned instance or an explicitly restarted server. The [phase 7 record](../research/2026-10-02-feature-repairs-phase7.md) documents a hash-checked application copy on a separate local port, with the original server left running. The four practice home assertions compare the configured origin; the default repository command still uses port 3000. The [release-readiness guide](release-readiness.md) separates local regression, public HTTP observations, worker-script fixtures and actual application-build transitions.

When a local machine cannot sustain the default unit-worker concurrency, the installed Vitest runner accepts `VITEST_MAX_WORKERS`. Record any override with the verdict. It changes concurrency, not assertion coverage or timeouts, and does not establish that CI's default-worker run passed.

## Preserve evidence

Routine screenshots use `test.info().outputPath('captures', filename)` beneath ignored Playwright output. They must not write into `docs/research/evidence/`. Retries and test/browser names have separate paths.

To deliberately publish an approved capture set, use `npm run evidence:publish -- --source <run-output> --destination docs/research/evidence/<new-run-id> --run <run.json>`. The run metadata must name command, runtime, browser, viewport, revision and verdict. Publication creates a new directory and a SHA-256 manifest; it refuses existing destinations. Record working-tree changes/dirty status and test names. A source revision plus dirty status is not an immutable hash of all uncommitted code; commit before release evidence when possible.

Keep first failed runs and successful reruns with their scope. A screenshot proves visible state at capture, not complete interaction, timing, focus restoration, artist usefulness or cross-browser behavior. Automated Axe checks establish scanned rules/states; WCAG conformance also needs defined scope and manual work. Current participant/device/assistive-technology/long-memory qualification remains pending in [the registry](../research/issue-registry.md).

## TestSprite

The [session publication record](../research/2026-10-03-audit-session-publication.md) links all repair phases and separates the 1,746-test application gate, targeted compiled runs and the 12-case executable challenge. The configured pre-push gate checks the current working tree; record its actual result separately from earlier sealed runs. Source publication does not qualify remote CI or a deployed build.

The installed project skills distinguish plans from executed terminal verdicts. [Plan registry](../research/testsprite-plan-registry.md) labels old workflows before execution. Historical generated one-of-one results are not full coverage. The user explicitly authorized CLI installation and external TestSprite testing for the [3 October challenge](../research/2026-10-03-testsprite-challenge.md), superseding the earlier local-only preference for that pass. The [full execution follow-up](../research/2026-10-03-testsprite-full-run.md) records all 12 cases executed remotely, incomplete cloud artwork coverage and 12 passing executable local workflows. Direct public replay awaits explicit sharing approval after automatic review rejected uploading test code and a temporary URL. The [challenge instructions](../../testsprite-plans/challenge-2026-10-03/README.md) map 12 registered cases to their local target and record the current canvas/pointer and deterministic-tunnel limitations.

Inspect run-scoped assertions before accepting a service pass. A title/readiness assertion does not prove drawing, Undo or saved-project integrity. Deterministic local Python comparisons establish their own browser scope and must remain separate from remote TestSprite verdicts. Failed prerequisites, inaccessible native/file/tab interactions and refused replay are missing coverage, not passes or reproduced product bugs.
