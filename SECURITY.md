# Security Policy — PixiBun

Current engineering verification and remaining release checks are recorded in the [current status](docs/current-status.md).

## Report a vulnerability privately

Email [resquedzn05@gmail.com](mailto:resquedzn05@gmail.com) with the subject **PixiBun security report**. Do not put an exploitable vulnerability, secret or another person's artwork in a public issue.

Include the affected URL or commit/version, browser and operating system, a minimal reproduction, expected and observed behavior, and the possible impact. Use a small synthetic project instead of personal artwork where possible. Redact credentials, diagnostic text and identifying paths before sending attachments.

The maintainer will assess reproducibility, affected builds and impact, and coordinate a fix or explanation with the reporter. There is no guaranteed acknowledgement, remediation or disclosure deadline and no published bug-bounty program. Agree on disclosure timing privately; a passing test suite is not a security clearance.

## Versions and report scope

| Build | Report handling |
| --- | --- |
| Current `main` | Include the exact commit and reproduction; this is the current development target |
| Deployed studio | Include the URL, observation date and deployed revision if known; package `1.14.1` alone cannot distinguish later builds |
| Older releases/checkouts | Reports are welcome, but separate backports and long-term support windows are not promised; say whether the issue reproduces on current `main` |

Relevant reports include malicious import/recovery files, unintended artwork access or replacement, script injection, prototype pollution, secret exposure, diagnostics privacy or relay abuse, and peer-message validation failures. A UI bug without a security impact belongs in the normal issue process. Dependency reports should identify the affected installed version and a plausible PixiBun exposure; an advisory is useful evidence, not by itself proof of exploitability.

Reproduce against your own projects and local deployment. Do not access another person's data or disrupt the public service to demonstrate a problem.

## Dependency and build security

The 3 October session pins Next.js `16.3.8` and restricts privileged deployment to successful CI for a push to this repository's main, checking out that run's SHA. Credentials are supplied through step environments. [Deployment repair and verification (local archive)](docs/archives.md#record-docs-research-2026-10-03-deployment-phase2-md) and [current operator contract](docs/guides/deployment.md) distinguish source configuration from a verified remote deployment. Peer admission, import allocation and diagnostic-queue changes are documented in [the session record (local archive)](docs/archives.md#record-docs-research-2026-10-03-audit-session-publication-md); local regression results are not a security certification.

The repository commits `package-lock.json`; CI uses `npm ci` and the declared Node 22 runtime. Review dependency changes together with their lockfile diff, install scripts, package source, license and compatibility. Workflow actions currently use major-version tags rather than immutable commit pins.

For an explicit dependency review, run `npm audit --json` and record the date, npm version, affected packages and production/development exposure. This command sends dependency information to the configured registry. Review remediations before changing dependencies; the `fix` form can modify the installation and lockfile. [npm's audit documentation](https://docs.npmjs.com/cli/v10/commands/npm-audit/).

The configured project gate has no explicit dependency-advisory stage, and this checkout contains no Dependabot/Renovate configuration. Install-time npm audit output is not a recorded security verdict. Automated advisory scanning and immutable action pinning remain maintenance work; this policy does not claim they were enabled or that dependencies are vulnerability-free.

The [phase 7 dependency review (local archive)](docs/archives.md#record-docs-research-2026-10-02-feature-repairs-phase7-md) records the targeted Next.js patch and dated production-only advisory result. That result does not cover development dependencies, establish an exploitable PixiBun path for every advisory or identify the installed version on a public deployment.

## Privacy and technical safeguards

Artwork is stored locally in browser IndexedDB. Local diagnostics are enabled by default and can contain free-text errors or paths; transmission through the optional relay requires opt-in. Co-draw uses the network, and loading/updating the app makes same-origin requests. There is no browser-wide zero-egress or zero-PII guarantee.

Nibbli is opt-in repository developer tooling, separate from Studio's graphics engine. Plans and critiques pass strict schemas, observation/source checks and action/point/call/token/time/reported-cost limits before supported UI actions. The existing mock and conversation adapters do not call a provider API or require a new key. The surrounding conversation service has its own data handling; this does not make planning offline. These controls bound the supported protocol, not the permissions of the host Node process or every action an external coding agent can take.

Nibbli evidence can include screenshots, full artwork/project files, traces and local paths. Retain it in ignored local archives, review it before sharing and keep provider secrets out of plans, logs and Git. There is no automatic raw-evidence upload or deletion policy. Provider-reported usage is not a billing guarantee; a future provider adapter needs explicit configuration and bounded usage. See the [agent contract](docs/guides/nibbli-agent.md) and [security boundaries](docs/contracts/security-boundaries.md#nibbli-developer-tooling).

[Security boundaries](docs/contracts/security-boundaries.md) documents the relay threat model, import/workspace limits, recovery and peer defenses. [Artwork safety](docs/guides/artwork-safety.md) explains backups; [deployment](docs/guides/deployment.md) covers proxy trust and rollback. Local checks, scoped browser tests and dated evidence do not establish penetration-test certification or complete protection against resource exhaustion.
