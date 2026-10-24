# Nibbli milestones

Nibbli is PixiBun's atelier apprentice. This conversation supplies plans and critiques; the local runner validates them, uses the real UI and retains evidence. It is not a separately running model service or model training. See [current status](../current-status.md), the [agent operating contract](../guides/nibbli-agent.md) and [Tester guidance](../guides/nibbli.md) for implemented behavior and qualified results.

## M3 — Integration hardening

Keep this milestone's stability investigation open separately from the accepted bounded functional run. Following the user's 11 October decision, a timeboxed clock diagnosis precedes the first M4 editing capability; M4 does not imply M3 stability closure or release approval. Preserve the ongoing Curve/UI work and every original failed attempt.

- Close the Curve lint errors and effect-dependency warning without weakening tests.
- Identify the integrated WebKit 2× playback failure using timestamps, native pixels and rendering diagnostics. Diagnostic variants do not qualify the product.
- Keep frame durations, ordered visible transitions, pixel expectations, recording, browser profiles, timeouts and retry policy unchanged.
- Verify the configured quality gate and production compilation, then run the integrated Tester and Artist journeys in Chromium, Firefox and WebKit. Relevant existing browser regressions must pass on the same source and compiled build.
- Compare actual UI captures and artwork pixels for visual changes. Functional results and visual opinions remain separate.

A failed browser case leaves M3 open even if the unit gate passes. Commit, merge and publication require the user's approval. Local reports and captures remain ignored under the [archive policy](../archives.md).

Current bounded status: Curve lint and the effect warning are closed; the integrated full gate passed 2,255 unit tests /206 files. The first M3 compiled candidate passed six Artist and 36 existing browser cases, while Tester retained eight passes and one WebKit Motion failure. A later clean-source revalidation passed all nine Tester, six Artist and 36 existing browser cases with zero retries/skips and unchanged source/build guards, referencing the earlier full gate on identical inputs. Frame-card styling and capture-isolation diagnostics have not established a reliable closure of the intermittent WebKit condition. M3 remains open; consult [current status](../current-status.md) for original candidate/run identities.

## M4 — Artist hands and explainable actions

The bounded clock diagnosis used three independent WebKit processes and one tagged 220 ms stall. All 189 decisions matched an independent elapsed-hold oracle; native pixels always matched known poses. Two independent windows and the controlled window skipped the original visible-order expectation. Intermediate poses were consumed without publication by the current catch-up clock, rather than lost after publication. The source of long browser scheduling gaps remains unresolved. No further visual changes, clock repairs, expectation changes or additional repetitions are authorized by this diagnosis alone.

Update, 18 October: the user asked for the documented issues to be fixed, which authorized the clock repair. The playback clock now advances at most one pose per animation frame, so a stall no longer consumes poses unseen ([record](../releases/2026-10-18-open-issues.md#playback-skipped-poses-after-a-stall-m3)). Its browser results are in that record; earlier failed runs keep their verdicts.

Extend the bounded Artist protocol to layer selection, selection areas, moving, copying and transformations. Qualify each operation before allowing a planner to use it. Existing-layer selection, conservative rectangular translation, source-preserving disjoint Copy/Paste and bounded in-place Flip H/V are locally qualified. Copy uses actual workspace shortcuts and checked floating-paste placement; Flip uses actual HUD controls and an independent integer RGBA permutation. Per-edit reasons, expectations and protected-content checks apply to every operation. The final Flip source passed 2,325 unit tests /210 files, all 33 three-engine Hands cases, six existing selection regressions and one conversation Flip; earlier qualifications keep their own labels in current status. The v0.1 drawing envelope stays unchanged. Exact clockwise quarter turns with explicit bounded pivots are now locally qualified separately: 2,358 unit tests /211 files, 24 Rotation cases, six existing selection regressions and one conversation rotation on a frozen source/build. Earlier 33 Move/Copy/Flip browser passes retain their own labels and were not rerun. Only the separate R3 diagnostic grip fixture changed afterward; a fresh full gate, three R3 diagnostics and six existing selection cases qualify that candidate under separate labels. All quarter-turn/controller/application bytes stayed identical. Cross-layer copies, larger dimensions, free rotation and scaling remain unsupported in Hands.

The first slice passed its bounded three-engine Hands fixtures and one conversation-planned eye-alignment edit, including protected-content, Undo/Redo and saved reload/export checks. See current status for its distinct labels and preserved unanswered-plan deadline failure. That earlier result admitted translation only; subsequent Copy and Flip results qualify their own bounded operations without closing M3 stability.

Flip qualification covers asymmetric multicolor motifs with transparent holes, both axes, odd/even selections and 800%/1600% zoom. Cancel must preserve the complete artwork and preceding Undo history; invalid late batches, mismatched frame/layer identities, clipping and locked targets must fail before editing. All original Move/Copy fixtures and assertions remain. Symmetric no-op flips are refused so a passing mirror cannot conceal an unchanged motif. The conversation launcher's single-browser default is regression-tested independently of artistic quality.

Quarter-turn qualification covers asymmetric motifs, explicit centered/corner pivots, odd/even/mixed-parity bounds, two zooms, exact RGBA, protection against clipping/overwriting, Undo/Redo, Cancel and saved reload/export. A separate approximately 37° trusted RotSprite diagnostic records protection, palette/alpha, history/files and silhouette metrics; it does not enable free-angle Artist plans or qualify contour quality. Next expand canvas dimensions and layer/frame contexts conservatively before general transformations. Broader dimensions/zooms, multi-step edits and recovery need their own evidence. Keep M3 playback risk separate and follow the archive policy's proposed capacity review without deleting failed attempts.

Each proposed edit must record:

1. **Reason:** the observed problem and why this tool is appropriate, referencing the actual screenshot or pixel observation.
2. **Expected change:** target frame/layer, selection, destination and independently checkable pixel result.
3. **Protected content:** layers, frames and pixels that must remain unchanged.
4. **Outcome:** validation verdict, actual action, observed pixel differences, invariant checks and screenshot critique. A failed check stops the attempt and retains its evidence.

For example: "The right eye is two pixels lower than the left. Select it and move it upward by two pixels; the other eye, body and other layers must stay identical." The planner proposes this explanation and intent. The verifier establishes what actually changed; the planner cannot revise expectations after execution to excuse a failure.

Validate the complete proposed batch before UI changes. Reject unsupported tools, invalid coordinates, locked targets, ambiguous selections and exceeded budgets. Preserve existing action/time/correction limits, independent file checks and immutable attempt memory. Product, controller, planner and expectation defects require separate evidence and review; an agent cannot alter a test to approve its own result.

## M5 — Artist motion

Give the conversation a creative objective such as "Make this little ghost float nervously." The conversation chooses key poses, motion, spacing and frame durations; Nibbli executes them through the actual timeline, observes playback and critiques the result within bounded correction limits.

Do not supply four predefined Artist poses. Keep the existing scripted four-frame Tester journey and its independent expectations intact. Report tool/file correctness, planning compliance and artistic quality separately. Save/reload, frame ordering, exact RGBA, animation export and playback recordings remain independently verified; artistic scores are attributable opinions rather than release approval.

## Future model adapters

Keep the controller and protocol provider-neutral. Conversation and deterministic mock adapters allow development without API keys or paid services. Future configured provider or local-model adapters must obey the same validation, evidence and conservative call/token/cost bounds. Mock success proves orchestration, not artistic ability; no provider is selected automatically.
