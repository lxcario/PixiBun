# Observe the complete artist workflow

For the tested revision and remaining accessibility, device and host checks, see the [current status](../current-status.md).

Use a named, frozen candidate and isolated study projects. This is an executable study kit; it contains no participant results. Automated browser journeys check pixels and persistence, while this session checks whether artists can discover and use the workflow.

## Prepare a round

Invite a small initial round of artists with different experience: someone new to pixel art, a regular sprite artist and an animator. Record experience, browser, device, screen size and candidate identity. Five participants is a practical qualitative starting point, not a statistically representative sample or a guarantee of finding every problem. Ask permission before recording; use participant codes and study artwork rather than private commissions.

Explain that the product is being tested. Start with the goal below without reading the click instructions. Let participants speak naturally; record hesitation and recovery without coaching. Give a hint only when they request one or cannot progress, and record it. A second attempt can assess practice effects, but do not combine first-time discovery with learned execution time.

## Task and observable completion

“Make a small character detail move. Keep an editable definition, reopen it, turn it into three cels, and export a usable image.”

| Task | Completion evidence | Record |
| --- | --- | --- |
| Open the Mochi starter and add a visible mark | Starter and authored mark are visible | How the starter was found; accidental blank drawings |
| Create a motion part and move the End pose two pixels | End pose and preview show the offset | Selection versus whole-layer discovery; field/range/gizmo choice |
| Undo, Redo and reset a pose | Artwork remains intact; parameter values change as intended | Which Undo control was expected; surprise or accidental document actions |
| Name and save the rig, Cancel, save the project and reload | Original artwork and the named rig return | Confusion between rig Save, project Save and Bake |
| Reopen the rig, choose three frames and Bake | Three editable cels appear | Timing/pivot expectations; notice of cancellation or refusal |
| Save, reload and export a 1× PNG | Export opens at the expected size with the selected cel | Export discoverability; file correctness in another image viewer |
| Change the source and try to reopen the saved rig | The refusal explains the mismatch without losing the changed artwork | Whether the recovery instruction is understood |

The compiled `motionArtistJourney.spec.ts` checks the first complete path with independently translated pixels and a native-decoded PNG. It is automation evidence, not an artist observation.

## Moderator recovery instructions

The starter card's **Give it a try** opens its artwork. In Studio, **Tools → Animate artwork → Create Motion Part** captures the active layer when there is no selection, or captures the selected area. Set **Position X pixels**, **Motion frames** and **Motion easing**. **Save motion rig** stores its definition; use workspace **Save** to persist the project. **Cancel** exits temporary pose editing. Reopen with **Open** in the saved-rig library. **Bake to timeline** creates cels in one document Undo step. Motion Undo/Redo owns pose parameters while its session is open; exit the session to undo library/document changes. See [the artist guide](artist-workspace.md#save-a-motion-rig).

## Physical device and long-session checks

Repeat drawing, motion dragging and cancellation with an actual mouse, pen and landscape touch device when available. Record device/OS/browser versions and any pressure/tilt support actually delivered by the tool. Check pen up outside the canvas, lost focus, Escape, pointer cancellation and Undo grouping; a second finger must not become a drawing stroke. Test opening/saving/exporting after a realistic session with the artist's layer/frame counts. Preserve a portable backup before offline or update checks. Browser emulation cannot establish physical pen latency, palm rejection or touch comfort.

For each task record: participant code, candidate, device, attempt, start/end time, unassisted success, hints, errors, recovery, quoted observation, visual artifact and proposed fix. Separate system wait time from thinking/discovery time. Record a request for help as a result, rather than quietly fixing the outcome. Keep the raw notes private and publish a de-identified dated synthesis with the tested candidate.

Prioritize observed artwork loss or incorrect output first, then repeated inability to complete a task, misleading expectations and avoidable effort. Recheck the changed task with another round. Ask whether the artist would use the feature in their actual work, what they would still repair by hand, and which tool they would otherwise use. Foot locking and multi-part animation are outside the present rigid-part workflow.

## Method and limits

[Card, Moran and Newell (1980)](https://iihm.imag.fr/blanch/ens/2010-2011/M1/EIHM/cours/1980-Card-KLM.pdf) model expert routine execution from low-level operations and system response; their model does not substitute for novice discovery, errors or artistic usefulness. Here it motivates separating command effort from system wait, without importing their historical operator times as a PixiBun benchmark. [Nielsen Norman Group's qualitative/quantitative distinction](https://www.nngroup.com/articles/5-test-users-qual-quant/) supports iterative qualitative rounds; a small round cannot justify a population success rate.

Publish observed results through [current status](../current-status.md). Until participants and devices are available, mark those rows pending.
