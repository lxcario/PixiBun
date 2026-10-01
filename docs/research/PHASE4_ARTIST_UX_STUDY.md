# Phase 4 Artist Usability Study: Animation Stability & Review Protocol

**Status:** Ready-to-run study protocol.  

**Session update — 2026-10-01:** No participant study results are recorded by this engineering session. Animation-review functionality has local test evidence, but artist usefulness remains pending. See the [session completion record](session-completion-2026-10-01.md) and [phase implementation report](phase-implementation-status.md).

**Focus:** Validating human-centered animation review, protected pixel cleanup, intentional motion triage, and loop seam verification in PixiBun Atelier.

---

## 1. Study Goals & Hypotheses

### Primary Goals
1. Verify whether pixel artists can identify and diagnose subtle animation defects (single-frame flickers, accidental color mutations, silhouette jitter) using the **Animation Stability** panel without being overwhelmed by technical metrics.
2. Determine whether the distinction between **review findings** (human-first) and **analysis details** (expandable engine numbers) accelerates inspection and reduces cognitive fatigue.
3. Validate that artists understand how to define **protected regions** on canvas and trust that automated sprite cleanup will preserve delicate highlights, eyes, and linework.
4. Assess whether loop seam checking provides clear confidence when creating continuous cycles (idle loops, run cycles).

### Hypotheses
- **H1 (Artifact Discovery):** Presenting categorized findings (Flicker, Silhouette change, Color shift) will reduce time-to-first-diagnosis by >40% compared to raw statistical metrics (RGB deltas, cluster connectivity counts).
- **H2 (Intentional Motion Acceptance):** Artists will readily mark expected smears and sparkles as intentional without fearing that their underlying pixels were destructively modified.
- **H3 (Protected Cleanup Trust):** Visible indicators of protected regions during cleanup scan/preview will give artists the confidence to apply automated cleanup without manual per-pixel verification.
- **H4 (Loop Seam Clarity):** Comparing frame $N \to 1$ via the seam check option will allow artists to eliminate jump-cuts without having to duplicate frames in the timeline.

---

## 2. Participants & Environment

### Recruitment (5 Participants)
- **Cohort 1 (2 participants):** Indie game animators with experience in Aseprite or Pyxel Edit.
- **Cohort 2 (2 participants):** Hobbyist pixel artists familiar with drawing static sprites but new to frame-by-frame animation.
- **Cohort 3 (1 participant):** Technical artist / game developer responsible for sprite production pipelines.

### Test Environment
- Standard desktop workspace (Chrome / Firefox / Edge on macOS or Windows).
- Minimum resolution: $1440 \times 900$.
- Preloaded benchmark project containing:
  - An 8-frame character run cycle with 1 single-frame foot artifact, 1 stray color mutation on the torso, and an intentional smear frame on the sword.
  - A 4-frame campfire flame loop with intentional spark particles and a 1-pixel seam jump.
- Throwaway local storage state for each session.

---

## 3. Study Tasks Protocol

### Task A — Finding Animation Artifacts (Flicker, Silhouette Breaks, Stray Colors)
- **Prompt:** *"We've loaded an 8-frame character run cycle into PixiBun. Scan the animation to check for unintentional glitches or flickers between frames, and locate the frame where the artifact occurs."*
- **Allowed Actions:**
  1. Select the run cycle clip in the Animation Stability panel.
  2. Click **Scan animation**.
  3. Browse frame intervals or click directly on listed findings.
  4. Use the comparison canvas zoom (1×, 4×, 8×) and difference canvas.
- **Observable Behaviors:**
  - Does the participant click directly on the finding card (`Single-frame flicker` or `Silhouette & outline change`) to jump to the frame?
  - Do they understand the color coding in the difference canvas (Red = disappeared, Blue = appeared, Purple = color/alpha changed)?
  - Do they expand `Analysis details` out of curiosity, or is the high-level finding sufficient to make an artistic decision?
- **Success Criteria:** Participant identifies the artifact frame within 60 seconds and correctly describes the nature of the issue.

---

### Task B — Marking Intentional Motion (Smears, Sparkles, FX)
- **Prompt:** *"On Frame 3 to Frame 4, the character swings their weapon with an intentional motion smear. Use the review panel to inspect this frame interval and mark the smear as intentional so it won't be flagged in future reviews."*
- **Allowed Actions:**
  1. Navigate to interval Frame 3 → Frame 4.
  2. Inspect the motion and silhouette change.
  3. Click **Mark this change intentional**.
  4. Verify the status message.
- **Observable Behaviors:**
  - Does the participant understand that marking a change intentional is non-destructive (pixels are untouched)?
  - Do they notice the button changes to `Reopen this interval` for full reversibility?
  - Does the reassurance copy (`Marked intentional for these exact frames and settings`) provide peace of mind?
- **Success Criteria:** Participant marks the interval intentional within 30 seconds and expresses confidence that their artwork remains unaltered.

---

### Task C — Protecting Details During Automated Cleanup
- **Prompt:** *"The character has a delicate 2-pixel eye highlight and fine weapon trim that you want to preserve. Define a protected region over the character's face, then run a Sprite Cleanup pass to remove stray background specks without disturbing the face."*
- **Allowed Actions:**
  1. Use the **Select Box tool [M]** on the canvas to draw a box around the face.
  2. Open **Regions and protection** in the Animation Stability section.
  3. Name the region `"Face Highlight"` and choose purpose `"Protect during Pixel Cleanup"`.
  4. Click **Save selected region**.
  5. Navigate to PixiBud / Sprite Cleanup, scan artwork, and inspect the preview.
  6. Apply cleanup and verify the eye highlight was preserved.
- **Observable Behaviors:**
  - Is the active selection coordinates badge helpful when creating the region?
  - Does the participant notice the amber badge in the cleanup preview stating `"Protected regions active · X pixels shielded from cleanup"`?
  - Do they inspect the before/after thumbnail comparison before clicking Apply?
- **Success Criteria:** Region saved correctly; cleanup applied; participant confirms the eye highlight was shielded.

---

### Task D — Checking Loop Seams
- **Prompt:** *"Switch to the campfire flame animation clip. Check whether the animation loops smoothly when repeating, or if there is an abrupt jump between the last frame and the first frame."*
- **Allowed Actions:**
  1. Select the flame animation clip.
  2. Check the box **Compare last frame to first**.
  3. Click **Scan animation**.
  4. Inspect the final interval (Frame $N \to$ Frame 1).
- **Observable Behaviors:**
  - Does the participant find the `Compare last frame to first` toggle easily?
  - Do they understand that the interval `Frame 4 → Frame 1` represents the loop seam?
  - Can they use the difference canvas to identify which flame embers fail to connect smoothly?
- **Success Criteria:** Participant identifies the loop seam discrepancy within 45 seconds.

---

## 4. Evaluation Rubric & Metrics

### Quantitative Metrics
1. **Time-on-Task (ToT):** Measured in seconds from prompt finish to task completion.
2. **Error Rate:** Number of incorrect frame selections, failed region creations, or accidental destructive strokes.
3. **Assistance Count:** Number of times the moderator had to provide guidance.

### Qualitative Scoring (1–5 Likert Scale)
| Question | 1 (Strongly Disagree) | 3 (Neutral) | 5 (Strongly Agree) |
|---|---|---|---|
| "The findings explained what was happening in artist terms without math jargon." | | | |
| "I felt confident that scanning my animation would not alter my pixels." | | | |
| "Creating a protected region from a canvas selection felt natural and tactile." | | | |
| "The cleanup preview made it obvious which pixels were safe from deletion." | | | |
| "The difference canvas (red/blue/purple) clearly showed where pixels changed." | | | |

---

## 5. Next Iteration Thresholds
- If $>1$ participant struggles to associate canvas selection with saving a region, introduce a 1-click **"Protect current selection"** quick button directly on the canvas floating context bar.
- If participants express confusion over difference canvas colors, add a visual legend swatch directly beneath the difference canvas.

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

The latest studio follow-up keeps File, drawing controls, adjacent Mirror/Zoom/Fit/View, Studio and Export on one desktop header row. The live bulb offers Off/Soft/Crisp glints with a brighter pixel core and stepped edge, preserves outlines and alpha, and supports Cancel, Apply and exact Undo/Redo. See the [UI/UX record](session-ui-ux-2026-10-01.md) and [glint research, screenshots and evidence](specular-glint-2026-10-01.md).

The latest full gate passed documentation, types, lint, **1,482 unit/integration tests across 144 suites**, and the production build. Three focused Chromium glint scenarios passed; the current discovered editor inventory is **149 tests in 33 files**, plus 39 separate compiled-production scenarios. Earlier full-run results retain their dates and scope. The user requested Git publication of this checkpoint; it does not authorize deployment or replace the existing release sign-off. [Delivered work and open validation](session-completion-2026-10-01.md).
<!-- /session-publication-2026-10-01 -->
