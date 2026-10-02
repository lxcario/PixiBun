# Phase 2 local execution evidence — 2 October 2026

This new record preserves the completed practice-isolation implementation and the qualified browser results on an uncommitted checkout. It is not a new deployment or release approval. [Phase record](../../2026-10-02-feature-repairs-phase2.md), [run metadata](run.json), [environment](environment.json), [manifest](manifest.json).

The five-stage gate/build passed in 147.37 seconds with 1,545 tests in 156 suites. Focused session/overlay/responsive checks passed 17 tests in three suites. Targeted Chromium passed 14 workflows in 36.3 seconds. The complete editor run passed 171 workflows in 9.4 minutes.

The complete compiled-production run passed 47 cases and failed one Firefox simplification case in 8.1 minutes. [Original log](production-initial.log), [failure context](firefox-initial-failure-context.txt), [unchanged failure screenshot](firefox-initial-failure.png). Its trace identified a preview-layout change during the More options click. The helper now waits for the completed preview and verifies the options opened. The [research follow-up](production-research-followup.log) passed all 15 related cases across Chromium, Firefox and WebKit in 3.3m. No single final 48/48 rerun is claimed. The raw trace remains in ignored local artifacts at the path in run.json.

[Source delta](source-delta.json) explains the only two source/test changes after the full runs: an unused suppression comment was removed, and the test helper's timing was corrected. Full lint passed after comment removal; final helper lint and TypeScript passed after the helper correction. The [before](source-before-followup.json) and [final](source-final.json) hashes identify bytes; neither claims those bytes were committed.

[Integrity checks](evidence-integrity.json) preserve 97 tracked PNGs, 32 original audit artifacts and 12 remediation artifacts. All 91 handbook, one phase 1 and 16 phase 2 captures match their capture hashes. [Current practice capture record](../../../assets/screenshots/2026-10-02-feature-repairs-phase2/run.json).

Historical failures, original evidence and screenshots remain unchanged. No external TestSprite run, participant learning study, physical-device/pen/assistive-technology qualification, long-session study, new coverage/Lighthouse result, cloud backup, push or live release approval is claimed.
