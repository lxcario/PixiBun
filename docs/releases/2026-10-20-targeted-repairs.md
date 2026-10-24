# Targeted repairs — 20 October 2026, Istanbul

## A default that the browser rejected

The automatic [PR #6 App execution](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/38207a10-bdfb-463a-99ea-10d3cd934d80) found a real product defect on source `2d27b262239fcf86aa1dc2ec9f13b42301319e4c`. Case `3de75df2-12d6-451d-99e8-23af772c3063`, **S4-PAL-04 — Cycle tracks keep their range**, failed in run `43dbf725-da8f-4777-b38a-24fadfdb7786`. Its recorded actions entered 6, 5.5 and 5.6 Hz. The first two remained invalid. The original Failed verdict is retained.

The cause is precise: [PalettePanel](../../src/components/layout/inspector/PalettePanel.tsx) combined `min=0.1` with native `step=0.5`. Valid native steps were therefore 0.1, 0.6, 1.1 and so on; even the new track's default 6 Hz was off that grid. Chromium and Firefox independently reproduced `valid=false, stepMismatch=true` for 6 and 5.5, while 5.6 was valid. The first WebKit attempt reached the same assertion in its retained error context, but stalled during reporting/teardown and its identified worker was terminated. Its terminal worker-exit verdict remains inconclusive, rather than being silently counted as a clean third red.

Repair commit `f2f13f3caa255228c0d6b89e8dd4e09f9fc9f845` separates typed-value validity from button increments in [StudioNumberInput](../../src/components/ui/StudioNumberInput.tsx). Only cycle rate uses `inputStep="any"`; its 0.1–60 Hz bounds and half-Hz buttons remain. Other number inputs keep their existing native steps. The [production regression](../../tests/production/testspriteBatchFollowup.spec.ts) uses real UI entry, checks native validity for all three rates, checks 6 → 6.5 with the button, verifies both clamps and compares every canvas RGBA value after deleting the track.

This is a TestSprite-led product finding, distinct from earlier plan/assertion corrections. The bounded rate regression does **not** establish PAL-04's remaining inclusive-range pixel behavior or history isolation. A local green must not replace its automatic cloud failure or increment the automatic pass count.

## The exported colors should come home unchanged

The separate [native Linux CI record](2026-10-19-native-codec-ci.md) retains the original four failures and the later **14 Passed /1 Failed** result. Explicit Linux WebKit identity repaired three platform/refusal expectations. Firefox still decoded red as `255,26,1,255`, outside the unchanged 12-channel tolerance. Container-only matrix changes did not fix it; the actual media payload was independently held constant during that diagnosis.

Color repair commit `4510bba62072c417ec9346b05e17f678f5953a15` constructs explicit limited-range BT.709 I420 planes with sRGB transfer, passes the same format through the trial and actual encoder, and records matching numeric `nclx` metadata. [Conversion](../../src/lib/export/i420Color.ts), [encoder](../../src/lib/export/mp4Encoder.ts) and [muxer](../../src/lib/export/isobmffWriter.ts) tests cover fixed color vectors, chroma planes, transparent input, bounds, actual encoder input and container bytes. No pixel tolerance, timeout, CSP or codec assertion was relaxed.

The first local candidate exposed a real Light Sweep regression: conversion scratch was incorrectly reserved once per cel. That **14 Passed /1 Failed** attempt remains retained. The correction reserves one active frame's scratch, preserving the 512 MiB limit. The regression checks a 60-frame 270×480 sweep at scale 2 reserves 406,425,600 bytes and releases its lease.

Before the palette repair, the corrected color working tree passed **50 focused unit tests**, a production build and **15/15 affected Windows production-browser checks**, without retries/skips or compiled-file changes. Chromium's actual MP4 decoded red `255,1,0,255`, blue `1,0,255,255`, gray `128,128,128,255` and green `0,255,1,255`. Windows Firefox/WebKit exercised explicit unsupported/refusal paths; those passes do not qualify successful Linux Firefox encoding. The original Linux failure stays open until the fixing source passes there.

## The skipped jobs have explicit conditions

`CI / browser-diagnostics` requires a manual dispatch with browser diagnostics enabled and evidence-only disabled. `CI / evidence-custody` requires a manual evidence-only dispatch. The fallback preview workflow requires `PREVIEW_DEPLOY=vercel-cli` and a same-repository PR. Vercel's Git integration already supplies previews. These are intentional conditional skips, not missing product-test passes. Their conditions remain unchanged in [CI](../../.github/workflows/ci.yml) and [preview deployment](../../.github/workflows/preview.yml).

## Targeted fixing-source qualification

The combined palette/color working tree over `4510bba6` is frozen under source manifest SHA-256 `56d215b0678b0c11992f8a6aa333fc4fe1a0b7be6b45f770477ef077bdd69795`, build `7qcEYZ86PHparloiquBkz`. The targeted rerun selected only palette-rate validity, actual MP4 color/refusal and Light Sweep: **9/9 Passed** across three Windows engines, one worker, zero retries/skips/flaky cases. All 432 compiled files stayed unchanged. Every engine now reports 6, 5.5 and 5.6 valid with no step mismatch; buttons, clamps and exact artwork preservation also pass. The four affected unit files passed **50/50** on this working tree.

The original automatic cohort completed before any preview replacement: **37 Passed /9 Failed /75 Blocked**, with all 121 run IDs preserved in the [terminal App receipt](../testsprite/automatic-followup-2026-10-20.json). This is a separate source-pinned cohort, not an update of the earlier 69/0/52 catalog or a successful full suite. The rate fix still needs its own fixing-preview cloud follow-up. The other eight App failures and 75 Blocked cases are not declared repaired by these nine local checks.

Raw logs, original failures, patches, source manifests, browser reports and downloaded media remain in ignored local artifacts under the archive policy. The lightweight [receipt](../testsprite/targeted-repairs-2026-10-20.json) records hashes and scope. Production `main` is unchanged. Neither this record nor a manual supporting run is an automatic TestSprite pass.
