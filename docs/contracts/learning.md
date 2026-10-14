# Learning workflow contract

The [current status](../current-status.md) records the qualifying revision and observed limits for this contract; production-host and device qualification remain separate.

The [illustrated learning guide](../guides/learning-and-playground.md) lists all current lessons, the Teaching Board and Pocket Doodle Pad, including separate practice custody, saving and session-memory limits.

The shipped `/playground` now provides twelve desktop lessons with per-pose coaching, ghost-pen demos, gap feedback, guide strength, previous-frame copy and a timing-aware filmstrip. The old OnboardingOverlay/ArtisanHandbookPanel are removed. The Teaching Animation Board remains available for jump-cycle construction and sample loading. Below 1024 px Pocket offers eight 16×16 lessons plus a temporary 32×32 free doodle. Desktop practice retains its separate route workspace; none of these features establishes measured learning gains.

[Phase 1 repairs (local archive)](../archives.md#record-docs-research-2026-10-02-feature-repairs-phase1-md) make desktop Trace/Clear pixel edits history-backed, dirty-tracked and explicitly redrawn, with locked-layer/playback/history admission. Mobile mounts only Pocket rather than a CSS-hidden desktop lesson.

[Phase 2 custody (local archive)](../archives.md#record-docs-research-2026-10-02-feature-repairs-phase2-md) checkpoints the original through its existing save coordinator, then detaches its store snapshot, raster references, file association and retained history. Lessons use a fresh identity and buffers. Return/unmount restores the original in memory; explicit Keep saves a separate project before adoption. Entry is refused on failed checkpoint, changed ownership, blocked return-pointer storage or active Co-Draw. A full reload returns through a session-storage project pointer and normal stored-project admission: it restores saved artwork, not session history or OS handles. Practice is not autosaved. Concurrent changes during encoding/writing and cancelled Keep cannot publish over the original.

Returning while the initial checkpoint is pending resumes the live original and awaits that save before restoring an active lifecycle; it never hydrates older pixels over unsaved RAM. A missing original record is reported, and its stale return pointer is released so a replacement can save and restore normally.

Studio resume carries exact confirmed storage versions and lifecycle/conflict state. An untrusted `fromPlayground` URL parameter cannot bypass restoration. Strict Mode cleanup must not discard a later session or consume a resume ticket before active registration. See [storage](storage.md) and [memory accounting](rendering.md).

The tracing match threshold is 85. It measures occupied target cells, not exact palette/artistic correctness; excessive off-target drawing caps the score below a match. Ghost demos draw only overlay pixels. Trace, Clear and copying the previous visible frame use history-backed edits on the active layer; Trace and Copy overlay rather than erase other existing pixels. Users can jump to later steps without matching every pose. Completion follows a playback timer (at least 1.8 seconds), not verified display of every frame or proven learning. Pocket keeps both lesson/free artwork only in current page memory and exports PNGs rather than project backups.

The [Learn by Making plan](../plans/learn-by-making-2026.md) remains a proposal/experiment. Before adding lessons that modify the current Studio, preserve and restore the active project on Exit, refresh, cancellation and failure; use throwaway samples with explicit adoption into a project. Qualify pixel and metadata restoration, not only a success badge.

Visited, skipped, attempted and verified progress are different states. Clicking Next or viewing content is not evidence that an artist completed the skill. Do not infer recruitment, conversion rates, completion improvements or retention without dated participant/instrumentation evidence and appropriate consent. No completed recruitment or participant outcome is established by the current records.

Study protocols: [PixiTools baseline](../research/pixitools-baseline-study.md), [animation review](../research/PHASE4_ARTIST_UX_STUDY.md), [research artist evaluation](../research/phase6-artist-evaluation.md). Owners must record build, task order, consent, participant observations, failures and study limitations when execution occurs.
