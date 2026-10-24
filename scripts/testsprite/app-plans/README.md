# App plans the GitHub App agent can actually carry out

TestSprite has two ways to run a case. The **GitHub App** reads the case's plan steps and drives a browser with an AI agent. The **CLI** replays the case's stored Python script. These specs only change the first: the plan text. Stored Python, with its decoded files and native RGBA, is untouched.

## What the App agent can do

Every one of the 1,576 recorded actions in the 21 October App run (`b78fffb1`, 121 cases) was a navigate, a click on a named element (at its centre), a fill, a select, an upload, a scroll or a visible-text assertion. Key presses happen but are not logged. It never dragged, right-clicked by coordinates, held a modifier, changed the viewport, completed the native save picker or read a downloaded file. Plans that asked for those, or for "all 1,024 RGBA channels", ended Blocked even when PixiBun behaved correctly.

What it can read is the page, including the Studio's **Canvas readout**: size, frame, layer, painted pixels, colors with counts and a digest of the active frame's composite. The readout is computed from the real canvas, so digest equality is an exact artwork check, and **replay links** (`/studio?replay=…`, see [replays.md](../../../docs/testsprite/replays.md)) draw exact fixtures from a URL. Two more facts make canvas edits exact:

- A click on `Pixel art canvas workspace` lands on pixel (w/2, h/2): (8,8) on 16×16, (16,10) on 32×20.
- The 2 px brush stamps (7,7)–(8,8) around that point.

Expected digests are checked against a replay that paints the expected result directly, so a value in a spec is not just "whatever the app printed".

## Files

| File | Purpose |
| --- | --- |
| `specs/*.json` | One spec per case: TestSprite id, title, goal, steps, and which byte-level checks stay in the stored Python (`cliOnly`). |
| `render.mjs` | Writes `out/<key>.steps.json` (`{ planSteps }`, the shape `testsprite test plan put` takes) and `out/plans.json`. `--check` refuses wording that asks for drags, downloads, raw channels, uploads, viewport changes or pre-authorised Blocked verdicts. |
| `emulate.py` | Runs specs in Playwright with only the agent's gestures and reads the same readout. A spec that fails here will not pass in the cloud. |
| `apply.mjs` | Dry run by default. With `--apply`, saves each case's current plan to `out/before/`, replaces plan steps and description, and reads them back. Never touches stored code. |

## Use

```bash
node scripts/testsprite/app-plans/render.mjs --check
```

```bash
PIXIBUN_URL=http://localhost:3000 python scripts/testsprite/app-plans/emulate.py
LABS=1 PIXIBUN_URL=http://localhost:3000 python scripts/testsprite/app-plans/emulate.py
```

Run both. The App agent's browser is not flagged as automated, so it starts with Studio Labs on, as people do; Playwright starts on the classic desk. `LABS=1` seeds Labs on at the first load only, so a plan that turns them off stays off across reloads, as in a real browser. Pass spec paths to run only those plans.

```bash
node scripts/testsprite/app-plans/apply.mjs
```

`testsprite test lint --steps out/<key>.steps.json` validates each rendered file offline. Publishing (`apply.mjs --apply`) changes the shared TestSprite project and needs the owner's approval; it is a plan change, not a pass.

## Step vocabulary

`open`, `skip`, `classic` (Studio options → *Classic studio* when it is offered, so every plan starts on the same desk whether Labs were on or off), `click` (`role`, `within`, `nth`, `optional`, `shown` for the visible label when it differs from the accessible name), `canvas`, `fill`, `select`, `key`, `color`, `record`, and assertions `readout` (exact, `=REF`, `!=REF`, or `top~` for ±1 per color component), `selected` (with `option`; `startsWith` accepts a label that adds to it), `visible`, `absent`, `enabled`, `disabled`, `pressed`, `checked`, `unchecked`, `field`, `text`, `alert`. A name written `/…/` is a pattern; `/…/i` ignores case.

`alert` also fails when the message sits outside an open modal dialog: Chrome removes that inert content from the accessibility tree the agent reads.
