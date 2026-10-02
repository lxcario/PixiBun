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

The installed project skills distinguish plans from executed terminal verdicts. [Plan registry](../research/testsprite-plan-registry.md) labels old workflows before execution. Historical generated one-of-one results are not full coverage. Earlier restricted CLI-absence checks were corrected by native preflight; the recorded user preference is local verification without external uploads/tunnels. Preserve that preference until explicitly changed; the present remediation uses local runners and claims no new TestSprite verdict.
