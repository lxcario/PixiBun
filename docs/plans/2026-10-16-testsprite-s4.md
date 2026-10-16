# TestSprite Hackathon Season 4 — plan

Build window: **16 October 00:00 PT (10:00 Türkiye) → 22 October 23:59 PT (23 October 09:59 Türkiye)**. CLI bonus runs to 29 October 23:59 PT. Sources: [hackathon page](https://www.testsprite.com/hackathon-s4), [GitHub integration docs](https://docs.testsprite.com/web-portal/integrations/github-integration) and the official rules posted in the TestSprite Discord.

## How we are scored, and our answer

| Criterion | Points | What judges read | Our play |
| --- | --- | --- | --- |
| Project quality | 40 | The live app | PixiBun is already deep and polished. Keep production green and fast all week; no half-finished features on main. |
| Tests that run themselves | 40 | PRs, the portal, commits | PRD-driven suite with negative cases; check on **every** PR; **Blocking PRs on**; push trigger on main; daily schedule against production; at least one visible red → fix → green PR. |
| Innovation | 20 | Project and how verification is wired | Canvas readout (below), two independent checkers (TestSprite cloud + our pixel-exact Playwright/Nibbli), deterministic per-PR preview URLs, a public loop ledger. |
| Engagement | bonus | Discord, X, write-ups | Daily X posts, a Discord build log, a long-form write-up and a 2–3 minute demo video. |

## Blockers — clear these first

1. **The repository stays private during the build and goes public by 21 October** (Türkiye time), well before the 23 October 09:59 deadline. Rules require a public repo at submission; confirm in Discord #hackathon-info that private-during-build is acceptable. While private:
   - **Blocking needs enforcement.** GitHub Free cannot enforce required status checks on private repositories (Pro can). TestSprite still posts its check; add the `main` branch rule the moment the repo goes public, or upgrade for the month.
   - **Actions minutes are capped** (about 2,000 a month on Free, unlimited once public). Watch usage; the full CI gate and browser suite run on every PR.
   - The GitHub personal access token that commits `80928d64` and `a6f198dc` added (prefix `ghp_1Va0`, removed again in `f0d5d48b` / `93019e47`) was revoked months ago. It stays in history; if secret scanning raises it after going public, close the alert as revoked.
   - `.env.local` was never committed (it is ignored), and ignored folders (`artifacts/`, raw evidence) are not in Git.
2. **PR checks need a per-PR preview deployment.** TestSprite listens for a "deployment finished" event and builds the URL from a pattern. Two options:
   - **Vercel Git integration** (preferred, zero code): connect the Vercel project to the GitHub repo. Vercel then comments on each PR and records a deployment. URL pattern: `https://pixibun-git-{branch-slug}-<vercel-team-slug>.vercel.app`.
   - **Fallback workflow** [`preview.yml`](../../.github/workflows/preview.yml): set repository variable `PREVIEW_DEPLOY=vercel-cli` (secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` already feed production). URL pattern: `https://pixibun-pr-{pr}.vercel.app`; trigger event: the **Preview Deploy** workflow run completing.
   - Either way, **turn off Vercel Deployment Protection for previews** (Project → Settings → Deployment Protection), or TestSprite's cloud browser hits a Vercel login page and every test fails.
3. **Accounts.** Follow @TestSprite on X; join the Discord and get the badge; sign up at TestSprite with the **same email used to submit**. The same account must generate the suite and install the GitHub App.

## Hour 0 (10:00 Türkiye) checklist

- [ ] Clear blockers 1–3.
- [ ] Portal → New Project → Frontend UI → URL `https://pixibun.vercel.app`, no sign-in, upload [`docs/testsprite/PRD.md`](../testsprite/PRD.md) as the PRD source.
- [ ] Run Behavior: **Always use planned steps = on**, default 1920×1080 viewport. Consider a second, smaller mobile project later (Pocket lessons).
- [ ] Review the Test Coverage map against the PRD's twelve journeys; Plan Tests → select all → prune decorative or flaky cases → generate and run.
- [ ] Fix or rewrite failing cases in Chats until the production baseline is honest. Record real product bugs it finds; they become loop PRs.
- [ ] Dashboard Settings → GitHub App → install on `lxcario/PixiBun` only. Project → GitHub Action → Add Trigger → Pull Request, paste the first PR, Detect Events, pick the deployment-finished event, set the URL pattern, Send Test Event, Create Trigger.
- [ ] Turn on **Blocking PRs**, then GitHub branch protection on `main` requiring the TestSprite status check (enforced once the repo is public, or now with GitHub Pro).
- [ ] Add a **Push** trigger on `main` against a `production` environment, and a **daily schedule** against production.
- [ ] Request a credit boost early with the hackathon form if the free credits look thin for a week of PR runs.

## Loop PRs for the week

Each PR is real work, opened inside the window, checked by TestSprite and merged only on green. Aim for 6–10, at least two showing red → fix → green.

| Day | PR | Why it scores |
| --- | --- | --- |
| 16 Oct | **Wire the loop**: this branch (PRD, PR template, preview workflow + trust test, README "Tested on every PR" section) | First PR carrying the check; shows setup in commits |
| 16 Oct | **Studio surfaces**: the finished `studio-surfaces-motion` branch | Large UI change passing the suite |
| 17 Oct | **Canvas readout**: an accessible, screen-reader-friendly summary of the drawing (size, active layer/frame, layer and frame counts, painted pixel count, a short color digest) exposed as text with stable test ids | Turns an opaque `<canvas>` into assertable state; deeper assertions; real accessibility value |
| 17 Oct | **`?labs=1` deep link** so cloud browsers can test Studio Labs (automated browsers default them off) | Coverage for the most distinctive UI |
| 18–19 Oct | Fixes for product bugs the suite found (PRD negative cases: absurd sizes, last-layer delete, empty export, shortcuts while typing) | The red → green story, from real failure bundles |
| 19–20 Oct | **Loop ledger**: `docs/testsprite/loop-ledger.md` listing every PR, its TestSprite run, what failed and the fixing commit | Judges read the whole loop in one page |
| 20–21 Oct | One more user-facing feature with its own new TestSprite cases added in the portal | Shows the suite growing with the product |
| 22 Oct | README final coverage table, demo video, submission | Required materials |

Agent loop per PR: Claude Code implements → PR opens → preview deploys → TestSprite comments/blocks → on failure, read the failure bundle (portal, or `testsprite test failure get <test-id> --out .testsprite/failure` from the CLI) → fix the root cause, never weaken a correct assertion → push → check reruns. Keep failed runs; they are evidence.

## README section (add once the suite exists)

> ## Tested on every pull request
>
> Live app: https://pixibun.vercel.app · TestSprite project: *(link)*
>
> Every pull request deploys a preview and TestSprite runs the full browser suite against it. The result is a blocking status check: nothing merges red. Main is re-tested after every merge and once a day in production.
>
> | Area | Cases | What is asserted |
> | --- | --- | --- |
> | *(fill from the coverage map)* | | |
>
> Our own Vitest (2,500+ unit tests) and Playwright suites run in CI alongside it; TestSprite is the independent black-box checker.

## Submission (post in #hackathon-submissions using the channel template)

- PR link with the TestSprite check (choose the best red → green PR)
- Live URL: https://pixibun.vercel.app
- TestSprite account email and name (same account as the suite and GitHub App)
- Team members
- Demo video link (optional, judges watch them)

## Engagement

- X: day-1 "wiring the loop" post; a short clip of the first blocked PR turning green; final thread with the video. Tag @TestSprite.
- Discord: a daily build-log message; vote in polls; answer others' setup questions.
- Long-form write-up (dev.to / Medium / Hashnode): "Testing a pixel-art canvas with a black-box agent".

## CLI Improvement Bonus (separate pool, to 29 October)

Note every rough edge hit while wiring PixiBun. If it is a real CLI bug: open an issue in the TestSprite CLI repo, assign yourself, fix it with tests, PR with `Closes #<issue>`, tick the entry box and add the Discord username. At most three eligible PRs and three open claims; one concern per PR.

## Risks

- **Free credits run out** mid-week → request the boost on day 1; keep the PR suite to the cases that matter and move exploratory ones to the daily schedule.
- **Flaky canvas assertions** → the canvas readout PR; "Always use planned steps"; Auto-Heal only for UI drift, never for real failures.
- **Preview builds are slow** (full production build) → the trigger waits for the deployment event; keep PRs small.
- **Production down** → every check fails. Do not merge to main without green CI; watch Vercel.
