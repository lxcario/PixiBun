# PixiBun UX Hardening Audit: Engineering Maturity to Artist Flow

> **Follow-up — 2026-10-01:** Implemented UX changes are recorded in the [UX report](PIXIBUN_UX_HARDENING_REPORT.md) and [Phase 6 UX report](PHASE6_UX_HARDENING.md). The [session completion record](session-completion-2026-10-01.md) distinguishes verified behavior from artist hypotheses that still require participant evaluation.

Updated: September 2026  
Status: Authoritative Baseline UX Audit across Phases 1–5  
Target: Make advanced technology feel simple, obvious, forgiving, contextual, and pleasant without removing power from expert users.

---

## 1. Executive Summary & Design Principles

PixiBun has developed robust, verified engineering infrastructure across Phases 1–5:
- Deterministic canvas buffer synchronization and atomic IndexedDB saves with conflict prevention.
- Bounded worker thread concurrency, WebCodecs/MediaRecorder video pipelines, and P2P collaboration.
- 512 MiB combined CPU memory admission and safe service-worker update protocols.
- Animation stability analysis, topological cluster detection, and protected region cleanup.
- Canonical playback models, semantic palette roles, and Godot 4.7 game delivery.

However, the user experience currently exposes internal engineering abstractions, algorithms, worker lifecycles, and database mechanics directly to the artist.

### Guiding Principles Applied in this Audit
1. **Low threshold, high ceiling**: Immediate obvious actions for novices; depth preserved for masters.
2. **Maximum two meaningful disclosure levels**: Primary workflow → Advanced/details. Eliminate nested accordion rabbit holes.
3. **Recognition instead of recall**: State must be visually contextual, visible, or retrievable without memorization.
4. **Prefer artist language over implementation language**: Eradicate internal system jargon (e.g. LWW, IndexedDB, WebCodecs, SEC, generation mismatch).
5. **Errors must include recovery**: Answer *What happened?*, *Is my artwork safe?*, and *What can I do next?*
6. **Preserve flow**: The canvas is sacred; minimize modal interruptions and prefer non-blocking contextual UI.
7. **Build confidence through feedback**: Subtle, reassuring acknowledgments after structural operations.
8. **Advanced analysis should explain, not judge**: Concrete spatial observations over aesthetic scores.

---

## 2. Comprehensive Workflow Audits (Phases 1–5)

### Workflow 1: Save State & Autosave Feedback (Phase 1 & Phase 3)
- **Current Entry Point**: `AtelierRail.tsx` (Save button) / `Ctrl+S` / debounced autosave.
- **Current Steps**:
  1. Artist paints on canvas. Store marks `isDirty = true`.
  2. Debounced timer triggers `runAutosave()` in `useStudioAutosave.ts`.
  3. Only the browser tab title (`● ProjectName`) and a hidden `sr-only` live region receive status.
  4. The Save button remains completely static. The artist cannot tell whether the file is saved, saving, dirty, or failed.
  5. On error, a fixed red toast (`Autosave Error`) appears bottom-left with dense technical text.
- **Current Terminology**: "Autosave Error", "IndexedDB Active", `sr-only` "Changes saved".
- **Visible State**: Window tab title `●`, red error banner on failure.
- **Hidden State**: `saveStatus` ('idle' | 'saving' | 'saved' | 'error'), `isDirty` status on canvas.
- **Failure States**: Storage quota exceeded, multi-tab conflict, memory admission ceiling.
- **Recovery Path**: "Save a copy" button or "Export Drawing" in the error toast.
- **Number of Clicks**: 0 (autosave) or 1 (explicit save).
- **Context Switches**: Shifting gaze to browser title or bottom-left corner.
- **Places Where User Must Remember Information**: Remembering whether recent strokes were actually committed before closing or navigating away.

---

### Workflow 2: Layer Merge Safety & Feedback (Phase 1)
- **Current Entry Point**: `LayersPanel.tsx` (Merge Down icon button on active layer or header).
- **Current Steps**:
  1. Artist selects a layer and clicks "Merge Down".
  2. If an unsupported blend mode (e.g. Multiply, Screen) is active on visible layers, a toast triggers: *"Merge down requires Normal blending on both visible layers to preserve their appearance."*
  3. If valid, the button enters a 2.5-second confirmation state.
  4. Second click merges layers. The operation finishes silently without confirmation or visible undo prompt.
- **Current Terminology**: "Merge Down (flattens the lower effect recipe)", "Normal blending", "source-over".
- **Visible State**: Layer list, flashing merge button state.
- **Hidden State**: Identity of which specific layer blocks the merge; whether the operation was recorded in undo history.
- **Failure States**: Blocked by locked layer or non-normal blend mode.
- **Recovery Path**: Artist must manually inspect each layer's blend mode, change it to Normal, and retry.
- **Number of Clicks**: 2 clicks.
- **Context Switches**: Reading toast, inspecting layer settings.
- **Places Where User Must Remember Information**: Remembering that two clicks within 2.5 seconds are required; remembering which layer had the conflicting blend mode.

---

### Workflow 3: In-Between Frame Generation & Insertion (Phase 1)
- **Current Entry Point**: `PixiTools → Clean and refine / All PixiTools → PixiBud Assistance → + Generate In-Between Frame`.
- **Current Steps**:
  1. Artist opens PixiTools tab in right inspector.
  2. Selects task domain, scrolls to bottom, clicks "+ Generate In-Between Frame".
  3. Background worker executes morphing. No visual spinner or progress is rendered in the UI.
  4. If project frame limits (500 frames) or memory limits are exceeded, error toast fires: *"Cannot insert an in-between frame."*
  5. If the user draws or navigates frames while the worker computes, the result is silently discarded or toasted as *"In-between result was discarded because the animation changed while it was processing."*
  6. If insertion succeeds, the frame appears without a toast or clear undo hint.
- **Current Terminology**: "+ Generate In-Between Frame (Morph)", "In-between result was discarded".
- **Visible State**: Single button in assistant panel.
- **Hidden State**: Computation phase (Generating, Ready, Inserting), failure reason when capacity check fails.
- **Failure States**: Capacity limit, worker mismatch, frame/layer mutation race condition.
- **Recovery Path**: None provided in the error toast.
- **Number of Clicks**: 3–4 clicks.
- **Context Switches**: Navigating away from canvas into deeply nested inspector panel.
- **Places Where User Must Remember Information**: Remembering which adjacent keyframes were being morphed.

---

### Workflow 4: Export Format Selection & Unsupported Codecs (Phase 2)
- **Current Entry Point**: `AtelierRail.tsx` (Export button) or shortcut `E`.
- **Current Steps**:
  1. Press `E` to open `ExportModal`.
  2. Modal renders 12 separate format tabs simultaneously: PNG, GIF, APNG, WebM, MP4, Sprite Sheet, Godot Kit, Timelapse, Vector SVG, Shaders, Cycle Loop, Project Backup.
  3. If MP4 or WebM is unsupported by the browser, the Download button is simply disabled. No inline helper explains why or suggests a working alternative.
  4. Canceling an active export does not indicate whether resources were safely cleaned up.
  5. Failure shows a dead-end toast: *"This animation would be too large to export safely."*
- **Current Terminology**: "WebM Video", "MP4 Video", "Shader", "Cycle Loop", "Project Backup".
- **Visible State**: 12 format tabs, scope selector, resolution scale.
- **Hidden State**: Browser codec capabilities, memory reservation status, multi-stage export pipeline (Preparing → Rendering → Encoding).
- **Failure States**: Unsupported browser codec, memory reservation refusal, geometry overflow.
- **Recovery Path**: None inline; artist must guess which other format works.
- **Number of Clicks**: 2–3 clicks.
- **Context Switches**: Full-screen modal overlay blocks the drawing canvas.
- **Places Where User Must Remember Information**: Remembering which video formats work in their current browser.

---

### Workflow 5: Peer-to-Peer Co-Draw Collaboration (Phase 2)
- **Current Entry Point**: `AtelierRail.tsx` (Co-Draw button).
- **Current Steps**:
  1. Click Co-Draw button in header.
  2. Modal provides Host/Join tabs with token exchange.
  3. Once connected, displays engineering architecture: *"Direct P2P Connection Established! Strokes and cursors now sync in real time over dual WebRTC data channels with Strong Eventual Consistency (SEC). Remote strokes are merged per-pixel via a Last-Write-Wins CRDT."*
  4. Explains host authority: *"the host owns the layer structure while connected — layer/frame changes made by the guest stay local."*
- **Current Terminology**: "WebRTC data channels", "Strong Eventual Consistency (SEC)", "Last-Write-Wins CRDT", "Peer ID".
- **Visible State**: Connection dot, status text, raw alphanumeric tokens.
- **Hidden State**: Whether sync is pending, why a guest layer operation does not broadcast.
- **Failure States**: WebRTC connection drop, signaling mismatch, guest structural edit refusal.
- **Recovery Path**: Disconnect and manual reconnect.
- **Number of Clicks**: 2–4 clicks.
- **Context Switches**: Modal blocks canvas view.
- **Places Where User Must Remember Information**: Remembering who is Host and who is Guest; remembering that guest cannot add layers.

---

### Workflow 6: Multi-Tab Save Conflict & Offline Mode (Phase 3)
- **Current Entry Point**: Background autosave conflict detection or network offline event.
- **Current Steps**:
  1. Two tabs open the same project. Tab B saves a revision.
  2. Tab A edits artwork; autosave triggers.
  3. `db.ts` rejects with conflict error.
  4. Red toast appears bottom-left: *"Autosave Error: This project changed in another tab or was deleted. Your work is still here. Save a copy to keep both versions."*
  5. Primary buttons: "Save a copy" and "Export Drawing".
  6. When offline, `OfflineIndicator` displays an animated pulsing badge: *"Offline Mode (IndexedDB Active)"*.
- **Current Terminology**: "Autosave Error", "IndexedDB Active", "Save a copy".
- **Visible State**: Red bottom-left toast, pulsing header badge.
- **Hidden State**: Exact timestamp or version delta between tabs.
- **Failure States**: Conflict cannot save to the same project ID without creating a copy.
- **Recovery Path**: Click "Save a copy" commits local artwork under a new project ID.
- **Number of Clicks**: 1 click.
- **Context Switches**: Attention interrupted by jarring red alert.
- **Places Where User Must Remember Information**: Remembering which tab contains the latest work.

---

### Workflow 7: Safe Application Updates (Phase 3)
- **Current Entry Point**: Service worker update detection in `ServiceWorkerRegistrar.tsx`.
- **Current Steps**:
  1. Service worker finds an update.
  2. A toast bounces continuously in the bottom-right corner: *"A fresh atelier build is ready."*
  3. Clicking "Update instructions" displays: *"Save your work, then close all PixiBun tabs. The update will apply when you reopen."*
- **Current Terminology**: "fresh atelier build", "Update instructions".
- **Visible State**: Bouncing bottom-right toast.
- **Hidden State**: Worker waiting state, whether open tabs are dirty.
- **Failure States**: User reloads while having unsaved strokes.
- **Recovery Path**: Dismiss or close all tabs.
- **Number of Clicks**: 1 click.
- **Context Switches**: Distracting bouncing animation during active drawing.
- **Places Where User Must Remember Information**: Remembering to save before exiting.

---

### Workflow 8: Combined Memory Admission Refusals (Phase 3)
- **Current Entry Point**: Executing high-memory operation (e.g. large GIF export, RotSprite 8x, hydration).
- **Current Steps**:
  1. Operation triggers `reserveMemory(bytes, operation)`.
  2. If current usage + requested bytes > 512 MiB, throws `RangeError`: *"[Operation] exceeds the combined artwork memory budget. Close exports or reduce project size before retrying."*
  3. UI catches and displays dead-end toast without contextual alternatives.
- **Current Terminology**: "combined artwork memory budget", "reserveMemory", "512 MiB admission".
- **Visible State**: Error toast.
- **Hidden State**: Memory breakdown (resident rasters, history depth, reserved export work).
- **Failure States**: Immediate operation abort.
- **Recovery Path**: None actionable in UI (no direct options to trim frames, lower scale, or clear history).
- **Number of Clicks**: 0 (dead end).
- **Context Switches**: Confusion regarding machine RAM vs application safety quota.
- **Places Where User Must Remember Information**: Remembering how many frames or layers exist in the project.

---

### Workflow 9: Animation Review & Stability Analysis (Phase 4)
- **Current Entry Point**: `PixiTools → Review animation` (`AnimationReviewSection.tsx`).
- **Current Steps**:
  1. Open PixiTools, select "Review animation" task.
  2. Pick clip or click "Create clip from all frames".
  3. Toggle "Align whole-sprite motion" and "Compare last frame to first".
  4. Click "Scan animation".
  5. Displays a frame pair selector followed by raw numerical counters:
     - *Outline changes: 12; silhouette changes: 8 pixels.*
     - *One-frame reversals: 3 pixels in the following pose...*
     - *Color / alpha changes: 5 pixels. Palette colors: +1, -2.*
     - *Connected clusters: 4 → 5 (diagonal neighbors connect).*
     - *Protected region changes: 0 pixels before motion alignment.*
  6. Three stacked canvases render Before, Aligned, and Changed pixels.
  7. Button: "Mark this change intentional".
  8. Accordion: "Regions and protection" requiring manual selection, purpose dropdown, and saving.
- **Current Terminology**: "Animation stability", "Whole-sprite motion", "One-frame reversals", "Connected clusters", "Saved exceptions".
- **Visible State**: Numbers, three preview canvases, regions accordion.
- **Hidden State**: Where the findings exist on the actual drawing canvas; timeline has no visual indicator of reviewed intervals.
- **Failure States**: Artwork change invalidates scan; too many exceptions (>512).
- **Recovery Path**: Rescan animation; clear exceptions.
- **Number of Clicks**: 5–8 clicks.
- **Context Switches**: Disconnected from canvas and timeline; artist must mentally translate three separate views.
- **Places Where User Must Remember Information**: Remembering which frame interval had which artifact.

---

### Workflow 10: Protected Regions & Pixel Cleanup (Phase 4)
- **Current Entry Point**: `AnimationReviewSection` (Regions) → `PixiBudAssistanceSection` (Pixel Cleanup).
- **Current Steps**:
  1. Artist draws a marquee selection on the canvas.
  2. Opens PixiTools → Review animation → expands "Regions and protection".
  3. Enters name, selects "Protect during Pixel Cleanup", clicks "Save selected region".
  4. Navigates back to task chooser, selects "Clean and refine".
  5. Clicks "Scan Artwork".
  6. Reads textual report: *"Found X pixels in Y frames... Kept Z protected pixels. Category counts describe proposals before protection."*
  7. Before / Preview thumbnails shown. Protected pixels are preserved, but not visually demarcated on the canvas.
  8. Clicks "Apply Cleanup".
- **Current Terminology**: "Regions and protection", "Category counts describe proposals before protection", "Apply Cleanup".
- **Visible State**: Region list in review accordion, cleanup summary in polish panel.
- **Hidden State**: No canvas overlay shows protected zones; user cannot verify on canvas what remains untouched.
- **Failure States**: Missing selection, exceeding 32 regions.
- **Recovery Path**: Reselect and retry.
- **Number of Clicks**: 8–10 clicks across multiple panel navigations.
- **Context Switches**: Constant switching between Animation Review and Polish tasks.
- **Places Where User Must Remember Information**: Remembering that a region saved in one task modifies behavior in a different task.

---

### Workflow 11: Palette Semantic Roles & Duplicate Colors (Phase 5)
- **Current Entry Point**: `PalettePanel → Roles and index bindings` (`PaletteRolesSection.tsx`).
- **Current Steps**:
  1. Switch to Palette tab in Right Inspector.
  2. Expand "Roles and index bindings" details element.
  3. Select register index from dropdown (#0, #1, ...).
  4. Type a role name (e.g. "Outline").
  5. Click "Save palette role".
  6. Make a selection on canvas, click "Bind selection to register".
  7. During Godot Kit export: if duplicate RGB colors exist without explicit bindings, export abruptly aborts with: *"X pixels match duplicate palette registers. Assign their selection to a register in Palette → Roles and index bindings."*
- **Current Terminology**: "Roles and index bindings", "Semantic palette register", "unresolved duplicate pixels".
- **Visible State**: Plain dropdown, text input, list of numeric bounding boxes.
- **Hidden State**: No pixel highlighting on canvas for assigned roles; no locator for duplicate color pixels.
- **Failure States**: Aborted export due to unmapped or duplicate colors.
- **Recovery Path**: Artist must manually search for pixels, select them with lasso/marquee, open palette details, select register, and bind.
- **Number of Clicks**: 7–12 clicks.
- **Context Switches**: Between canvas, palette inspector, export modal, and back.
- **Places Where User Must Remember Information**: Remembering which register number maps to which visual element.

---

### Workflow 12: Godot Kit Game Export & Preflight (Phase 5)
- **Current Entry Point**: `ExportModal` → Godot Kit tab (`GodotKitExportTab.tsx`).
- **Current Steps**:
  1. Open Export modal (`E`).
  2. Select "Godot Kit" tab among 12 tabs.
  3. Options: Pivot ("Center" / "Feet"), "Include indexed palette and runtime cycling", "Include normal-map atlas".
  4. Click "Download Godot kit".
  5. If indexed fails (unmapped or duplicate colors) or normal maps fail (missing normal-map layer or non-normal blend), an error string displays below the options.
  6. Artist must close modal, fix the issue in the canvas/inspector, reopen export modal, and retry.
- **Current Terminology**: "Godot 4.7 game kit", "neutral normal-map layer", "SpriteFrames relative duration in milliseconds at speed 1000".
- **Visible State**: Form options, red error string after failed export.
- **Hidden State**: Pre-export validation state (no warning *before* clicking Download).
- **Failure States**: Duplicate colors, unmapped pixels, missing normal layers, memory quota overflow.
- **Recovery Path**: Close modal, diagnose issue, fix in studio, reopen modal.
- **Number of Clicks**: 3 clicks per attempt + fixing steps.
- **Context Switches**: Multiple cycles of opening and closing the export modal.
- **Places Where User Must Remember Information**: Remembering the exact error message after dismissing the modal.

---

## 3. Systematic Action Plan Across UX Passes 1–5

1. **UX Pass 1 (Phase 1: Artwork Safety without Anxiety)**:
   - Provide persistent, calm save state in `AtelierRail` (Saved, Saving, Unsaved changes, Save failed).
   - Add lightweight affirmative feedback for structural actions: `Merged 2 layers · Undo`, frame duplication, etc.
   - Refactor layer merge refusal to identify the exact blocking layer and offer a direct solution.
   - Clarify in-between generation lifecycle with clear states: Generating, Ready, Inserted, and descriptive recovery.

2. **UX Pass 2 (Phase 2: Export & Collaboration That Explains Itself)**:
   - Reorganize export modal around artist intent: Primary categories (Image / Animation, Sprite Sheet, Game Kit, Backup).
   - Provide inline explanations for unsupported codecs (e.g. MP4 unavailable in browser → recommend WebM).
   - Clarify export lifecycle: Preparing → Rendering → Encoding → Done with safe cancellation.
   - Translate Co-Draw status from CRDT/WebRTC jargon into clear artist language (Host/Guest permissions, live sync status).

3. **UX Pass 3 (Phase 3: Production Confidence)**:
   - Redesign multi-tab conflict banner from "Autosave Error" to a protective, calm notice: *"This project was changed in another PixiBun tab. Your local work is safe."* with clear actions: "Save a copy" / "Export backup".
   - Quiet, non-distracting offline indicator: *"Offline · Local saves working"* (no pulsing, no "IndexedDB" jargon).
   - Calm, non-bouncing update toast with clear instructions.
   - Human-centered memory refusal with concrete recommendations (reduce clip range, export smaller scale).

4. **UX Pass 4 (Phase 4: Animation Review Rework)**:
   - Human-first default result view: answer *Where should I look?*, *What changed?*, *Between which frames?*
   - Collapse raw metrics (clusters, reversals, alpha counts) under a collapsible "Analysis Details" section.
   - Canvas-linked inspection: selecting or hovering a finding focuses the frame and highlights the affected bounding box.
   - Streamline region creation starting directly from canvas selection with human intents: Protect from Cleanup, Ignore Motion, Watch Contact Drift.
   - Make protected areas visibly clear in Pixel Cleanup preview.

5. **UX Pass 5 (Phase 5: Game Export for Artists)**:
   - Add preflight inspection in Godot Kit export to identify duplicate colors or missing normal maps *before* export.
   - Palette roles: display role names (Skin, Outline, Metal, Glow) prominently; highlight pixels matching the role on canvas.
   - Duplicate color resolution: offer direct "Locate & Resolve" actions instead of raw validation rejection.
   - Provide visual palette cycling preview with speed and direction controls.
   - Human-centered completion summary after Godot Kit download.

6. **Final Integration Pass**:
   - Unify design tokens, accessibility (Axe, ARIA live announcements, keyboard focus), and tactile pixel-art motion.
   - Update `PHASE4_ARTIST_UX_STUDY.md` and `PIXIBUN_UX_HARDENING_REPORT.md`.
   - Add comprehensive human workflow tests.

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

This document retains its dated findings and verification scope. The latest studio follow-up keeps File, drawing controls, adjacent Mirror/Zoom/Fit/View, Studio and Export on one desktop header row. The live bulb offers Off/Soft/Crisp glints with a brighter pixel core and stepped edge, preserves outlines and alpha, and supports Cancel, Apply and exact Undo/Redo. See the [UI/UX record](session-ui-ux-2026-10-01.md) and [glint research, screenshots and evidence](specular-glint-2026-10-01.md).

The latest full gate passed documentation, types, lint, **1,482 unit/integration tests across 144 suites**, and the production build. Three focused Chromium glint scenarios passed; the current discovered editor inventory is **149 tests in 33 files**, plus 39 separate compiled-production scenarios. Earlier full-run results retain their dates and scope. The user requested Git publication of this checkpoint; it does not authorize deployment or replace the existing release sign-off. [Delivered work and open validation](session-completion-2026-10-01.md).
<!-- /session-publication-2026-10-01 -->
