# Phase 6 artist evaluation guide

Status: **Prepared; no participants or results recorded.** This is a small formative evaluation plan, not a claim that the tools improve pixel art. The [implementation report](phase-implementation-status.md) records the engineering evidence and limits.

**Session reconciliation — 2026-10-01:** Three automated workflow dry-runs and later controls are described in the [Phase 6 UX report](PHASE6_UX_HARDENING.md). They help prepare the interface; they do not replace the counterbalanced participant study, collect artist ratings or establish measured benefit. The [session completion record](session-completion-2026-10-01.md) retains this evaluation as open.

## Participants and projects

Invite 5–8 pixel artists with a mix of sprite, animation and environment experience. Record experience and familiar tools. Use their own local projects or original artwork whose license permits evaluation; do not upload projects to a service. Keep files within the supported limits: at most 256 pixels per axis, 16 poses, 262,144 total source pixels; tile atlases divide evenly into at most 16 tiles. Include thin details, partial alpha, pose-specific normal maps, intentional rough tile edges and several material regions.

The existing test fixtures are original technical patterns. They establish deterministic behavior, rather than representing the range of artists' real work. Ask artists to identify important features and permissible changes before trying an automated candidate. Preserve a portable backup of every starting project and keep original layers available throughout each task.

## Tasks and comparisons

| Task | Baseline | Phase 6 workflow | Observe |
| --- | --- | --- | --- |
| Simplify a sprite while preserving two named details and a palette role | Artist's familiar manual block/nearest-neighbor workflow with subsequent pixel edits; record the exact workflow | Try the three candidates, protect named rectangles, restrict allowed colors and choose/apply a result | Time, repair strokes, preserved feature readability at 1×, allowed-color compliance outside protected rectangles, alpha changes and candidate preference |
| Apply a common light to three distinct poses | Use the new lighting algorithm on each pose separately with identical settings | Apply the same rig across the clip, inspect combined/specular/shadow views and adjust material regions | Time, repeated setup, normal-map orientation problems, whether the artist can explain differences between poses, and unwanted changes |
| Find and repair a problematic tile combination | Assemble the same small grid manually using existing tile/stamp tools | Set edge labels, a center path and two pins; inspect the seeded scene, border differences and repeated placements | Time to locate a border problem, missed issues, understandable contradiction messages, path completion and visual repetition |

Using the same lighting algorithm for both conditions isolates batch workflow effects. The simplification baseline may use a different algorithm; report that difference and do not attribute every visual difference to the interface. For scenes, equal labels and walkability are separate from visual edge continuity. Confirm which criterion the artist is judging.

Give a short practice project first. Alternate which condition comes first across artists and use two comparable projects per task to reduce practice effects. View art at 1× and an enlarged integer scale. Keep display/theme settings recorded. Include a deliberate undo, save/reload, source edit and saved-recipe recomputation so recovery confidence is observable.

## Record evidence

For each attempt, record participant code, project code, dimensions, condition order, task start/end, completion or abandonment, help requests, corrective edits, undo/redo use, errors encountered and outcome. Capture before/after images only with the artist's permission. Record the selected seed, candidate, colors, regions and light settings from the saved recipe, plus any later edits to the generated raster.

Ask the artist to rate usefulness, control, predictability and recovery confidence on a 1–7 scale, with a brief explanation. Ask what the tool missed, what it changed against their intent, and whether they would use it on a real project. These ratings are subjective observations; passing an algorithmic constraint does not establish visual quality.

| Participant / project | Workflow / condition | Order | Time | Completed? | Repairs / errors | Intent preserved? | Usefulness / control / confidence | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | No observations yet |

## Interpretation and next decisions

Report individual results and paired medians/ranges, including abandoned tasks and explanations. A small convenience sample supports interface iteration; it does not establish population-wide benefit or superiority over a published algorithm. Separate objective constraints, artist judgments and inferred causes.

Continue each workflow only when artists can complete it, understand its limits and recover changes reliably. Prioritize repeated problems: lost detail intent, misleading normal-map orientation, opaque constraint failures, excessive setup or unhelpful repetition feedback. Investigate any source-pixel loss or failed undo/reload immediately as an engineering defect. State remaining uncertainties before expanding canvas sizes, physically based lighting, parallax, world generation or engine adapters.

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

The latest studio follow-up keeps File, drawing controls, adjacent Mirror/Zoom/Fit/View, Studio and Export on one desktop header row. The live bulb offers Off/Soft/Crisp glints with a brighter pixel core and stepped edge, preserves outlines and alpha, and supports Cancel, Apply and exact Undo/Redo. See the [UI/UX record](session-ui-ux-2026-10-01.md) and [glint research, screenshots and evidence](specular-glint-2026-10-01.md).

The latest full gate passed documentation, types, lint, **1,482 unit/integration tests across 144 suites**, and the production build. Three focused Chromium glint scenarios passed; the current discovered editor inventory is **149 tests in 33 files**, plus 39 separate compiled-production scenarios. Earlier full-run results retain their dates and scope. The user requested Git publication of this checkpoint; it does not authorize deployment or replace the existing release sign-off. [Delivered work and open validation](session-completion-2026-10-01.md).
<!-- /session-publication-2026-10-01 -->
