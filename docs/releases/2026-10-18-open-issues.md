# Documented open issues — 18 October 2026

Branch `testsprite-s4`, after the [final integration](2026-10-17-final-integration.md) (`d9065d51`) and the tool-preview rebuild (`b17513df`). This round works through the issues the documentation still listed as open, fixes those that are code defects, and records why the rest stay open. Earlier records keep their own verdicts.

## Fixed

### Playback skipped poses after a stall (M3)

The [M3 milestone](../plans/nibbli.md) has stayed open since 11 October: in WebKit the Nibbli Motion journey intermittently skipped a pose. The 11 October clock diagnosis showed the cause: after a long gap between animation frames, `usePlaybackClock` caught up by advancing several poses within one frame, so the intermediate pose was consumed without ever being shown. The diagnosis did not itself authorize a clock repair; the 18 October request to fix the documented issues did.

The clock now advances at most one pose per animation frame. Time owed beyond the next pose's hold is dropped, so after a stall every pose is shown in order rather than fast-forwarded through ([usePlaybackClock.ts](../../src/hooks/studio/usePlaybackClock.ts)). At a steady frame rate with holds longer than a display frame, nothing changes: fractional time still carries into the next hold. One deliberate trade-off: holds shorter than a display frame (the minimum is 1 ms) now play at the display rate, one pose per frame, where they were previously dropped to keep wall-clock tempo. Exports keep their stored durations.

`tests/playbackClock.test.ts` drives the clock frame by frame: a 250 ms stall over 100 ms holds, and playing once, both skipped a pose with the previous clock. `BottomTimeline.test.tsx` "keeps fractional elapsed time" asserted the old skip (three 10 ms frames at 16 ms ticks expected frame 2 never to appear). It is split into a fractional-carry case at 20 ms holds, which both clocks pass, and an every-frame case at 10 ms holds, which only the new clock passes.

#### Checking it in the browser

The Nibbli Motion journey, M3's original check, could not reach playback in any browser: its controller still looked for the timeline's `Loop Mode: repeat` title, which the 16 October timeline (`8b8cb1f6`) renamed to "Loop mode: Repeat". With the selector updated to the button's current name (same assertion), the journey passed in Chromium and Firefox. In WebKit it ran out of its unchanged 12-minute budget before playback in five runs, the old clock included: each of its 128 evidence captures takes a full-page screenshot at 3200 × 2200, which costs WebKit here about 2.7 s, so the journey spends its budget before the preview page. The budget was not raised; the failed runs are kept under `artifacts/nibbli` with their original verdicts.

So that WebKit is still checked, `tests/production/playbackStall.spec.ts` plays a four-pose replay (one red pixel per pose), records the pose the canvas shows on every animation frame, and blocks the main thread for 300 ms mid-playback. With the previous clock it failed in all three browsers: Chromium showed `…3,1,2…` and Firefox `…3,2,3…` after the stall, and WebKit skipped poses even without it (`0,1,3,0,2,0,2…`), which is the M3 condition itself. With the new clock it passed 3 of 3, then 9 of 9 with three repeats.

### MP4 colours depended on the machine's hardware encoder

`animatedExportIntegrity` "actual MP4…" failed in Chromium on this machine from 17 October (red decoded as `233,0,2`), also on the earlier commit that had passed on 16 October; the [final integration record](2026-10-17-final-integration.md) filed it as environmental. A drop to about 235 is the signature of limited-range video read as full range. Requesting Chromium's software H.264 encoder (`hardwareAcceleration: 'prefer-software'`) made the same test pass on the same machine. The probe, the one-frame trial encode and the export now share one configuration, so support is only claimed for the encoder actually used ([mp4Encoder.ts](../../src/lib/export/mp4Encoder.ts)). Pixel-art videos are small, so software encoding costs little. Which component changed on this machine was not established.

### Preview deployments exposed the deploy token to pull-request code

[preview.yml](../../.github/workflows/preview.yml) set `VERCEL_TOKEN` for the whole job, including `vercel build`, which runs the pull request's own install and build scripts. Any branch pushed to this repository could read it. The token now reaches only the settings pull and the deploy step. The build runs in a throwaway `node:22.23.3` container that sees the checkout and nothing else, so it can neither read the token nor alter the tools the deploy step runs afterwards. `tests/previewDeployTrust.test.ts` fails on the previous workflow. Not exercised on GitHub: previews stay off until `PREVIEW_DEPLOY=vercel-cli` is set.

### "AI" names left in the source

The Phase 0.5 brand change removed user-facing "AI" in `6737a78f`, but the source kept `src/lib/ai`, `pixelAiEngine`, `AiToolsPanel` and `PixiBudAssistanceSection` — names that contradict the no-generative-AI pledge at `/pledge` once the source is public. They are now `src/lib/graphics` (the name TASKS.md planned), `pixelRasterEngine` (its header already called it the deterministic pixel raster engine), `PixiToolsPanel` (its name in the interface) and `RasterActionsSection` (smoothing, dithers and palette actions). Two test files and their suite titles followed. Paths in the changelog, architecture notes and dated records were updated so their links resolve; historical narrative that names "PixiBud AI" is unchanged.

### Coverage thresholds far below coverage

The configured floor was 60 / 50 / 55 / 60 % (statements, branches, functions, lines) against measured coverage of 62.1 / 57.3 / 57.4 / 63.6 %, so coverage could fall several points unnoticed — it had already dropped from about 65 % when the agent branches merged. The floor is now 61 / 56 / 56 / 62 % ([vitest.config.mjs](../../vitest.config.mjs), [testing guide](../guides/testing.md)).

### Theme gallery missing four themes

The [theme gallery](../guides/themes.md) said its 15 October pictures predated the 16 October themes and showed only eight of twelve. All twelve styles are retaken, Night and Day, from a local production build with the Mochi starter open ([capture details](../assets/screenshots/2026-10-18-themes/run.json)). The README and the feature index now name all twelve. The 15 October pictures stay where other pages still use them.

## Left open, and why

| Item | Why it stays open |
| --- | --- |
| Stroke loop out of React | A Phase 1 performance architecture item, not a defect: the [roadmap](../plans/2026-10-14-strategy-roadmap.md) asks for a measurement with the existing response probe before pointer sampling changes, and the 16 October pan and stroke-cache work has not been measured against it. |
| Typed-array pixel store and straight-alpha compositor (defect 5) | Phase 3, scheduled after launch together with format v5, linked cels, groups and a store split. Pixels live in canvases, which store premultiplied alpha; removing that rounding means replacing the pixel store, not a local fix. |
| Dependency updates | Minor Next, React and Playwright releases have no advisories. Dependabot (added 16 October) proposes them weekly, each with its own CI run. |
| `docs/audits/` findings (17 October) | Triaged and fixed on branch `fix/audit-2026-10-17-triage`, browser-verified on `claude/awesome-raman-f4078d`; not merged into this branch when this record was written. Merged on 18 October: see [the audit triage record](2026-10-18-audit-triage.md) and the merge note below. |
| Physical devices, actual Safari, screen readers, participant studies, real collaboration networks, host update and rollback, long sessions on low-memory devices | Need people, hardware, networks or a deployed host ([issue registry](../research/issue-registry.md)). Local source and tests cannot close them. |

## Verification

Windows, production builds of this working tree served under Node **22.23.3**, browsers from the repository's Playwright (1.62.1). One worker, zero retries throughout.

- **Unit tests with coverage:** 2,861 tests in 265 files passed; 62.1 % statements, 57.28 % branches, 57.43 % functions, 63.55 % lines. A first run failed one case, `BottomTimeline.test.tsx` "keeps fractional elapsed time", which asserted the old skipping clock (above). Each new test was also run against the previous code: `playbackClock`, the timeline's every-frame case and `previewDeployTrust` fail there.
- **Complete Chromium production suite:** 172 passed, 1 capability skip, 0 failed. This includes `animatedExportIntegrity` "actual MP4…", which had failed since 17 October.
- **Firefox and WebKit:** `animatedExportIntegrity`, `exportCompleteness` and `playbackStall`, 20 of 20.
- **Nibbli:** the first full run (9 cases, three browsers) passed the 6 core and correction cases and failed Motion in all three at the stale loop selector. After the selector fix, Motion passed in Chromium and Firefox; WebKit Motion ran out of its time budget, as described above.
- **Lint and types** passed. Full gate (`npm run gate:full`): all six stages passed in 388 s, with 2,861 tests / 265 files, the raised coverage thresholds, the warmed performance budgets (largest p90 0.62 ms) and a production build.

Not counted: several Nibbli and build attempts that failed instantly, with no output, because the portable Node 22 copy used for these checks had lost files from its temporary folder. It was re-extracted from the archive, which matched nodejs.org's SHA-256 list, and every result above comes from the fresh copy. Those attempts are kept under `artifacts/nibbli`.

Not run: actual Safari, physical devices, a deployed host, a GitHub run of the preview workflow, the Firefox and WebKit halves of the production specs this round did not touch, and the 17 October audit branch together with these changes.

## Merged with the audit triage

On the user's request, `claude/awesome-raman-f4078d` (the [audit triage](2026-10-18-audit-triage.md) fixes and their browser record, on top of `fix/audit-2026-10-17-triage`) was merged after these commits. Git followed the graphics rename, so the Bézier fix landed in `src/lib/graphics/math/curvesAndLines.ts`; one new test still imported the old path and was updated. Only dated documentation and the generated inventory conflicted; both sides' entries are kept.

On the merged tree: `npm run gate:full` passed all six stages with **2,889 tests / 267 files** (62.25 % statements, 57.5 % branches, 57.56 % functions, 63.72 % lines; largest p90 0.53 ms). In production builds, `drawingConsistency`, `playbackStall` and `animatedExportIntegrity` passed **24 of 24** across Chromium, Firefox and WebKit; in the development server, the triage's `replayLink`, `selectionSubtraction`, `artworkProtection` and `toolMotionPreview` specs passed **19 of 19** in Chromium.

## Documentation sweep

Asked whether the documentation matches the code, a check of the guides, contracts, ARCHITECTURE and DESIGN found it did not in several places. What was checked, and what changed:

- **Mechanically, for every living page:** each cited source path exists; each code identifier in backticks exists in the source (10 candidates, 3 real errors); each bold UI label in the guides appears in the source (56 candidates, mostly shortcuts and emphasis; 5 renamed labels); every number with a unit in the contracts (about 50 limits, sizes and timings) matches its constant; every keyboard shortcut matches `src/config/shortcuts.ts` or its handler; DESIGN's CSS tokens, classes, springs, radii and spacing exist with the stated values.
- **Fixed in prose:** the playback contract still said catch-up could skip a pose; ARCHITECTURE and DESIGN described the 15 October tool preview (a removed `ToolPreviewCanvas`, 96 × 54 scenes, a 304 px card); DESIGN gave 72 px frame cards (76 px, with 24 px Duplicate and Delete); two pages still explained the renamed `ai` folder; the feature index described "3-step storyboards"; the drawing guide omitted the shelf's last 36 px stage; the lighting guide gave the light bar one line; the cleanup guide did not say what Smooth Jaggies does; DESIGN listed a `.texture-wood-grain` class that never existed; ARCHITECTURE named a recovery fingerprint `sourceContentFingerprint` (the code's is `resolvedSourceFingerprint`); and guides used old labels (**2:1 Iso Grid**, **+ OKLCH Ramp**, **+ Lospec**, **Browse all tools**) for **Iso grid**, **Shade ramp**, **Import file** and **Show every tool on one page**.
- **Engine defect fixed:** Smooth Dithering (`applyRiemersmaDither`) summed its 16 error weights to about 5.6, so a black-to-white ramp came out solid black. The weights are normalised; the new ramp test failed before the fix (0.5 % white) and passes after. Smooth Jaggies matches its contract and is unchanged.

Not checked line by line: ARCHITECTURE's long per-phase sections (about 900 lines) were checked for paths, identifiers and the claims above, not sentence by sentence; dated records, plans and research pages keep their original wording by policy. Screenshots older than 18 October other than the theme gallery were not retaken.
