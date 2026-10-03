# PixiBun safety challenge

Twelve independent TestSprite 0.13.0 plans target the compiled local application. The [registered test manifest](../../testsprite_tests/challenge-2026-10-03/manifest.json) maps every plan to its remote test ID. The [full execution report](../../docs/research/2026-10-03-testsprite-full-run.md) records every case executed and distinguishes service statuses from qualified local coverage. The initial registration record remains historical.

| Plan | Failure being challenged |
| --- | --- |
| 01 | A rejected co-draw invite overwrites the original project or consumes Undo |
| 02 | Help lets destructive keyboard commands leak into artwork or selection |
| 03 | Practice Return loses Redo, or Keep overwrites the original saved identity |
| 04 | Reloaded artwork changes when a later edit is undone, redone and saved |
| 05 | Locked Pen/Eraser/Fill attempts change pixels or add phantom history |
| 06 | Blank frames inherit pixels, or frame timing edits corrupt another frame |
| 07 | Extreme resize inputs escape bounds, or Cancel changes artwork/history |
| 08 | A stale second tab silently overwrites the newest save |
| 09 | APNG cancellation downloads a partial file or prevents the next export |
| 10 | A native backup loses project identity, isolated frames or frame holds |
| 11 | Selection arrows move twice, or committing a move cannot be undone once |
| 12 | Keyboard skip links navigate to a different route or fail to focus content |

Plans assert actual stroke locations, project names, frame counts, durations, conflicts and completed downloads. A visible canvas or download filename alone cannot satisfy the artwork/export checks. Case 08 requires two tabs sharing browser storage. Case 09 requires cancellation while encoding is actually in progress; completing before interruption is blocked coverage. Case 10 requires reusing a real downloaded file. These prerequisites are part of the tests, not reasons to silently mark them passed.

**Observed limitation:** this account's local V3 agent could not synthesize canvas drags or inspect pixels, and its deterministic Python replay was refused through a tunnel. The service now reports two passes, seven blocked and three failed, with zero unrun. Both passes omit the planned artwork/history assertions. All 12 executable local cases pass with actual pixels, history, multi-tab storage and completed downloads. Direct strict replay in the cloud awaits explicit sharing approval after automatic review rejected the script upload and temporary test URL.

## Run

Use Node 22 for PixiBun. TestSprite is installed globally; restart an existing terminal if its PATH predates npm's global tool directory. No API keys belong in these files. The existing authenticated profile supplies credentials.

Start the current production build in one terminal:

```powershell
npm run start -- -p 3150 -H 127.0.0.1
```

Validate the plans without spending credits:

```powershell
testsprite test lint --plan-from-dir testsprite-plans/challenge-2026-10-03
```

Run the initial three cases through one owned tunnel (about 1.5 credits):

```powershell
testsprite test run cb9f0a1f-bf2f-4ebe-af57-4b9fcc339c39 f47d2b54-d4ea-4bfb-88d8-29c4e63b3670 418746da-f794-41c7-82d7-b00746a2b1b9 --local 3150 --local-host 127.0.0.1 --max-concurrency 3 --timeout 1200
```

Re-run cases 04–12 using the manifest (about 4.5 credits):

```powershell
$suite = Get-Content testsprite_tests/challenge-2026-10-03/manifest.json -Raw | ConvertFrom-Json
$remainingIds = @($suite.tests | Where-Object { -not $_.smoke } | ForEach-Object { $_.testId })
testsprite test run @remainingIds --local 3150 --local-host 127.0.0.1 --max-concurrency 3 --timeout 1200
```

Running all 12 costs about 6 credits:

```powershell
testsprite test run --all --project ad7cf58e-3c0f-41d6-96a8-a3a076faf639 --local 3150 --local-host 127.0.0.1 --max-concurrency 3 --timeout 1200
```

Keep the server and owned run alive until terminal results arrive. The tunnel closes when the run ends. Inspect failed steps and artifacts before changing product behavior; retain the first failure when repairing a plan. Never substitute these plans or the old public site's statuses for a verdict on the current build.

## Deterministic local checks

The three initial Python scripts and nine cases in `safety_cases.py` run through the real production UI and read rendered pixels. Python Playwright needs Chromium for 11 cases and Firefox for the backup download/re-import; Chromium native OS picker handling remains unqualified. The wrapper runs all 12 cases against the server above:

On this machine the bundled interpreter, isolated Python dependency and existing Chromium/Firefox executables can be selected automatically:

```powershell
& ./testsprite_tests/challenge-2026-10-03/run-local.ps1
```

Use `-Case help_keyboard` to run one case, or `-Url http://127.0.0.1:3150` to select an explicitly chosen local server. The wrapper stops at the first failure and restores its temporary environment settings.

With Python Playwright already configured, the scripts also run directly:

```powershell
python testsprite_tests/challenge-2026-10-03/invalid_invite.py
python testsprite_tests/challenge-2026-10-03/help_keyboard.py
python testsprite_tests/challenge-2026-10-03/practice_identity.py
```

For this machine, Python and its isolated test dependency are available under the Codex runtime and `artifacts/runtime/testsprite-python`. Set `PYTHONPATH` to that dependency directory and `PIXIBUN_CHROMIUM_EXECUTABLE` to the existing Playwright Chromium path if using the bundled interpreter. `PIXIBUN_CHALLENGE_URL` selects an explicitly chosen local target; its default is `http://127.0.0.1:3150`. Use `PIXIBUN_CHALLENGE_CASE=apng_cancel` (or another case name) when invoking `safety_cases.py` directly. The wrapper supplies the browser paths and case selection. The backup test uses Firefox by default; `PIXIBUN_CHALLENGE_BROWSER` selects an explicit alternate engine. Fit the resized canvas before drawing in case 09, and retain the downloaded backup filename when importing in case 10. Local passes do not count as remote TestSprite passes.
