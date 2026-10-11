# Editing, responsiveness and release qualification — 7 October 2026

Planning status — 11 October 2026: the [11 October validation handoff](../research/2026-10-11-validation-handoff.md) records completed engineering validation and open release checks. Proposals below retain their own scope.

This is the user's authorized five-area follow-up to the [cross-phase hardening](../research/2026-10-07-piximotion-cross-phase-hardening.md). It applies to the local working tree; completed engineering checks and pending human/operator checks are separate.

| Area | Deliverable and acceptance | Status |
| --- | --- | --- |
| Motion editing | Bounded parameter Undo/Redo, one step per gesture, numeric pose/pivot/frame controls, Reset Pose and shared 2–30 frame limits; no source-pixel edits or underlying drawing Undo while a motion session owns commands | Implemented and locally checked. Final external case performed actions but omitted critical assertions: audited inconclusive. |
| Responsiveness | Representative drawing/rotation/motion/timeline/save/export profiles, identified bottleneck repair, owned/cancellable work and before/after evidence | Dedicated motion worker and asynchronous atomic bake implemented. Nine before/nine final scenarios recorded; measured main-thread stalls reduced, bake completion slower. |
| Visual quality | Independent feature-position, dither/alpha, preview/bake and temporal/contact measurements with original fixtures; preserve observed failures without inventing artist acceptance | Independent placement and feature/contact/temporal checks added. Complete artist exports pass all three engines; final full compiled suite passed. Foot locking and artist acceptance remain open. |
| Artist workflows | Executable draw → animate → save → reopen → export walkthrough, participant kit and repeated-friction fixes | All 18 welcome/artist cases pass. Starter/blank-size handoff repaired with source-preserving admission and reload semantics; whole-layer capture is discoverable. [Study kit](../guides/artist-study.md) prepared; participants/devices unavailable. |
| Release candidate | Freeze final inputs, full compiled suite, storage/update/rollback checks and read-only deployed comparison | Final gate/build passes; source frozen; full compiled suite has 263 passes/7 capability skips/zero failures. Supplied host has a different worker label. Exact earlier reader rejects current v4 backup unchanged. Real two-build host transition and compatible rollback qualification remain open. |

During motion, Undo/Redo operates on temporary parameters and never falls through to raster/document history. Cancel leaves saved rigs/artwork intact and returns command ownership to document history. Bake and library edits remain document actions; leave the motion session to undo library edits. Session parameter history is not saved into project files. Missing/stale sources refuse replay.

Performance targets will be assessed against recorded hardware/browser/project conditions, rather than inferred from renderer microbenchmarks. [Browser task guidance](https://web.dev/articles/optimize-long-tasks) explains why long main-thread tasks delay input; worker scheduling still needs source ownership and failure handling. [Qualitative-study guidance](https://www.nngroup.com/articles/5-test-users-qual-quant/) supports small iterative usability rounds, not population-wide ratings.

Physical artists/devices and a real two-build host transition cannot be supplied by automated browser emulation. Prepare concrete tasks and record actual observations when available. This work does not authorize a production deployment or changes to artist data on the supplied host.
