# Mutation proof: do our TestSprite plans catch real damage?

*23 October 2026, source `f8ca184b` (PR #6 head `c0d1009d` plus plan restorations). Local evidence, not a TestSprite cloud run.*

Passing tests only mean something if they fail when the app breaks. So we broke PixiBun on purpose, one artist-harming bug at a time, and ran the same App plans that the TestSprite GitHub App runs on every push.

**How it was run.** Each bug is a single small edit ([mutants.json](../../scripts/testsprite/mutation-proof/mutants.json)), applied to a local `next dev` build and never committed to a shared branch or deployed. Plans ran through our [plan emulator](../../scripts/testsprite/app-plans/emulate.py), which uses only the gestures the App agent performs (navigate, named click, fill, key) and reads the same Canvas readout. For each bug we ran every plan whose text touches the feature, stopping after three failures.

**What counts as caught.** A plan must fail with the bug in place **and pass on the clean build**. That way a flaky plan can't take credit. S4-HOME-01 failed on the clean development build as well, and S4-LEARN-05 crashed printing its results to a Windows console, so neither is counted anywhere below.

## Results

| # | Planted bug | Caught by (fails with the bug, passes clean) | What the plan saw |
| ---: | --- | --- | --- |
| 1 | Deleting a frame can't be undone | **S4-NEW-02** | After Undo, frame 3 (300 ms) never came back |
| 2 | A locked layer accepts paint | **S4-DRAW-03**, **S4-DRAW-06**, LOCK-f9fbb1e0 | The frame digest read `8e17ca1e` instead of the recorded `b5f36134` |
| 3 | Autosave forgets frame holds | **S4-SAVE-01** | After a full reload the 175 ms hold was gone |
| 4 | Loop mode never offers Once | **S4-ANIM-02** | "Loop mode: Once" never appeared |
| 5 | Typing 24 into Canvas size gives 44 | Not by an App plan in the emulator; **caught by** `tests/components/CanvasResizeModal.test.tsx` ("expected '44' to be '24'") | See note below |
| 6 | Eyedropper fills the wrong color slot | **S4-DRAW-13**, **S4-VIEW-03** | The primary color stayed unchanged after sampling |
| 7 | Pen strokes skip the Undo history | **ERASE-0aa9fcd9**, **EXP-003**, **LOCK-f9fbb1e0** | 0 painted pixels where 16 were expected |
| 8 | A single eraser click erases nothing | **ERASE-0aa9fcd9**, **S4-DRAW-01** | 4 painted pixels where 3 were expected |
| 9 | A gallery copy overwrites the original | **S4-SAVE-02** | The original project was gone from the gallery |
| 10 | Frame holds snap to 10 ms steps | **S4-SAVE-01** | A typed 175 ms hold never showed as 175 ms |

**9 of 10 caught by the App plans. The 10th is caught by its regression test.** Both run on every push: the App plans in TestSprite, the regression test in the required `validate` check.

## What the misses taught us

- **Typing digit by digit (bug 5).** Our emulator's `fill` sets a field's whole value at once, so the keystroke-by-keystroke clamp never happens there. The cloud agent types one character at a time, which is exactly how the real automatic run on `9c2197d2` found this bug in the first place. The component test that came with the fix types digit by digit and catches it. Lesson: the emulator is a pre-flight check for plans, not a replacement for the cloud agent.
- **A mutant that changed nothing.** A first attempt at "saving forgets holds" edited a helper that only computes the Cart preview's identity, so no saved data changed and no plan could fail. We dropped it rather than count it either way. Editable backups and autosave share the code that bug 3 breaks.

## Reproduce it

With `npm run dev` serving your working tree:

```bash
python scripts/testsprite/mutation-proof/run.py --url http://localhost:3000
```

The script applies each bug, runs the matching plans, restores the file even after an error, re-runs every catching plan on the clean source, and writes `out/results.json`. A full pass takes about two hours on a development build.
