# PixiBun Phase 6 UX Hardening: Research Workbench

Maintenance update — 11 October 2026: see the [11 October validation handoff](2026-10-11-validation-handoff.md) for the current engineering milestone. Earlier measurements, failures and decisions below retain their original revision and scope.

> **Scope clarification — 2 October 2026:** The journeys/captures below are engineering walkthroughs and automated checks of the named historical UI. No participant confidence, measured benefit, full WCAG conformance or universal timing is established. Current File/Studio menus and compact Offline label supersede old selectors; palette location uses a selection bounding box, not a per-pixel pulsing overlay. [Current contracts and evidence](../current-status.md).

Status: **Scoped workflow verification**

**Evidence reconciliation — 2026-10-01:** This records the earlier shared interface pass. Its reported automated checks are separate from the 2026-09-30 full editor/compiled results. A subsequent [UI/UX correction pass](session-ui-ux-2026-10-01.md) addresses reproduced keyboard, scrolling, freshness and readiness issues with its own evidence. The inventory at that earlier interface checkpoint was 146 tests in 32 files; [current status](../current-status.md) records later discovery and runs. The three dry-runs below are not a participant study or measured artist benefit. See the [session completion record](session-completion-2026-10-01.md).

Scope: `PixiTools → Explore variations` (`src/components/layout/inspector/ResearchWorkbenchSection.tsx`)  
Principles: Low threshold, high ceiling · Artist intent first · Visual comparison above the fold · Tactile controls · Safe non-destructive undo  
Date: 2026-10-01

---

## 1. Executive Summary & Intent

PixiBun's Phase 6 introduced deterministic research algorithms for three bounded workflows:
1. **Detail-preserving simplification** (palette-constrained downscaling with protected pixel regions).
2. **Shared lighting & material rigs** (multi-pose directional lighting, normal map integration, material roles).
3. **Seeded tile-scene exploration** (modular atlas layouts, edge labels, pins, walkability paths, seam/repetition diagnostics).

While mathematically verified and memory-bounded, the initial interface suffered from an inverted hierarchy: it presented academic configuration forms before any artwork, forced visual comparisons below the fold, and exposed algorithmic jargon instead of artist intentions.

This UX hardening pass establishes the core product hierarchy:
$$\text{Artist Intent} \longrightarrow \text{Visual Result} \longrightarrow \text{Direct Adjustment} \longrightarrow \text{Advanced Explanation}$$

The artist creates and experiments with pixel art — not engineering algorithms.

---

## 2. Baseline Friction Audit

A rigorous inspection of the initial workbench implementation revealed critical friction points:

| Workflow | Component / Area | Severity | Friction Observed | Impact on Artist |
|---|---|---|---|---|
| **Global** | Layout order | **High** | Preview canvas rendered at the very bottom (lines 147–152) below a 20-row form. | At 1024×768 or 1280×720, the preview was pushed completely off-screen. Artists adjusted abstract numbers blindly without immediate visual feedback. |
| **Global** | Workflow selection | **Medium** | Single `<select>` dropdown buried inside form: `"Keep details when simplifying"`, `"Use one light across frames"`, `"Check tiles in a scene"`. | Looked like an academic study chooser rather than a creative studio suite. No visual indication of the 3 distinct creative workspaces. |
| **Global** | Provenance feedback | **Medium** | Raw string status text (`Source pixels are current.`) without visual status cues or prominent recompute triggers. | The engineering walkthrough identified possible difficulty understanding whether their current canvas matched the recipe or needed recomputation. |
| **Global** | Apply / Undo safety | **Medium** | "Apply research preview" added layers silently with basic text status. | Lack of prominent confirmation toast and one-click interactive Undo action reduced confidence to experiment freely. |
| **Simplification** | Candidate selection | **Medium** | Dropdown with technical labels: `"Average color"`, `"Strongest color contrast"`, `"Center sample"`. | Sounded like DSP filtering. Artists could not anticipate what each candidate would do visually. |
| **Simplification** | Block size | **Low** | Monolithic dropdown with numbers 2..16. | Lacked quick-touch presets for common pixel art downscaling ratios (2px, 3px, 4px, 8px). |
| **Simplification** | Protected regions | **High** | Required manual entry of detail name and failed with generic error if canvas selection was inactive. | Disconnected from the drawing canvas. Artists had no visible cue of whether a marquee selection was active or what area it covered. |
| **Lighting** | Direction & elevation | **High** | Raw numeric inputs for azimuth (0–359) and elevation (5–90). | Artists think in directional light (e.g. "top-left studio key light", "rim light from right"), not trigonometric angles. |
| **Lighting** | Material selection | **Medium** | Dropdown with raw tags (`cloth`, `metal`, `skin`, `emissive`). | Did not explain how the shader responds (diffuse vs specular power vs unshaded emission). |
| **Lighting** | Clip scope | **Medium** | Small checkbox buried at the bottom of the lighting fields. | Multi-pose propagation is a headline capability, but was visually treated as an obscure toggle. |
| **Tile scene** | Canvas interaction | **High** | No direct canvas interaction; pinning required picking numbers from dropdowns (`Cell 1..16` → `Tile 1..16`). | Counter-intuitive for visual tilemap layout. |
| **Tile scene** | D-pad navigation | **Medium** | Four flat text buttons in a row for cursor movement. | Awkward to navigate compared to a tactile compass/D-pad layout. |
| **Tile scene** | Solver failures | **Medium** | Technical exception text on contradiction (`Scene rules conflict near cell X...`). | Needed clear, reassuring artist guidance on how to resolve contradictions (e.g., relaxing edge labels or pins). |

---

## 3. Core Information Architecture & Design Principles

### 3.1 Two Meaningful Disclosure Levels
- **Primary Studio Workflow**:
  1. Creative Intention Tabs (Simplify, Relight, Tile Layout).
  2. Immediate Visual Comparison (Original vs Variation with 1× / 4× zoom).
  3. Direct Creative Adjustments (Tactile candidate cards, direction presets, block pills, interactive grid).
  4. Non-destructive Apply with immediate Undo toast.
- **Advanced Explanation**:
  - Collapsible details / subtle notes explaining edge rules, material shader formulas, and solver limits.

### 3.2 Visual Result First
- The Preview Area is elevated above the detailed parameter controls.
- When a preview is generated, it immediately sits at the top of the workbench.
- Before/After comparisons use pixel-sharp canvas rendering with 1× and 4× integer scales.
- When no preview exists yet, a calm, compact banner guides the artist to select an intention and generate a preview.

### 3.3 Authentic Cozy Pixel-Art Visual Language
- No generic SaaS cards, floating badges, gradients, or AI sparkles.
- Strict adherence to PixiBun's CSS variable palette: `--desk-surface`, `--surface-1`, `--surface-2`, `--surface-3`, `--accent-gold`, `--text-heading`, `--text-body`, `--text-muted`.
- Crisp 2px border radius, pixelated canvas rendering, tactile button presses.
- Full respect for `prefers-reduced-motion`.

---

## 4. Implementation Specification

### 4.1 Invariant Test Contracts & Selectors
All accessible roles, labels, and contracts in `tests/helpers/researchWorkflows.ts` and `tests/e2e/researchWorkbench.spec.ts` are strictly preserved:
- `page.getByRole('combobox', { name: 'Research workflow' })` (options: `pixelize`, `light`, `scene`)
- `page.getByRole('button', { name: 'Create research preview', exact: true })`
- `page.getByRole('button', { name: 'Cancel research preview' })`
- `page.getByRole('button', { name: 'Apply research preview' })`
- `page.getByRole('button', { name: 'Load saved recipe' })`
- `page.getByRole('img', { name: 'Research source', exact: true })`
- `page.getByRole('img', { name: 'Research result', exact: true })`
- `page.getByRole('combobox', { name: 'Research preview scale' })`
- `page.getByRole('combobox', { name: 'Research preview pose' })`
- `page.getByRole('combobox', { name: 'Shared light preview output' })`
- `page.getByRole('combobox', { name: 'Simplification block size' })`
- `page.getByRole('combobox', { name: 'Simplification candidate' })`
- `page.getByRole('combobox', { name: 'Allowed palette role' })`
- `page.getByRole('textbox', { name: 'Research detail name' })`
- `page.getByRole('button', { name: 'Protect selected rectangle' })`
- `page.getByRole('button', { name: /Remove research region \d+/ })`
- `page.getByRole('spinbutton', { name: 'Shared light azimuth' })`
- `page.getByRole('spinbutton', { name: 'Shared light elevation' })`
- `page.getByRole('spinbutton', { name: 'Shared light ambient' })`
- `page.getByRole('spinbutton', { name: 'Shared light intensity' })`
- `page.getByRole('spinbutton', { name: 'Shared light height' })`
- `page.getByRole('combobox', { name: 'Shared light material' })`
- `page.getByRole('checkbox', { name: /Use this rig across/ })`
- `page.getByRole('combobox', { name: 'Scene tile size' })`
- `page.getByRole('spinbutton', { name: 'Scene seed' })`
- `page.getByRole('combobox', { name: 'Scene walkable path' })`
- `page.getByRole('combobox', { name: 'Scene atlas tile' })`
- `page.getByRole('textbox', { name: 'Tile north edge' })` etc.
- `page.getByRole('checkbox', { name: 'Tile is walkable' })`
- `page.getByRole('combobox', { name: 'Pinned scene cell' })`
- `page.getByRole('button', { name: 'Pin chosen tile to cell' })`
- `page.getByRole('button', { name: 'Clear scene pins' })`
- `page.getByRole('checkbox', { name: 'Show border differences and scene cursor' })`
- `page.getByRole('button', { name: 'Move scene cursor North' })` (and East, South, West)
- Text strings: `'Source pixels are current.'`, `'Source changed: recompute this recipe.'`, `'That scene cell is blocked.'`, `'Scene cursor: column 2, row 1.'`, `/Scene rules conflict near cell/`, `'No path required; this scene may have blocked or disconnected cells.'`.

### 4.2 Interactive Enhancements
- **Direct Canvas Cell Selection**: Clicking on any cell in the Scene preview automatically selects that cell as the pinned cell and moves the cursor to it.
- **Direction Compass**: 8 tactile direction presets for instant lighting angle adjustment (Top-Left 315°, Top 0°, Top-Right 45°, Right 90°, Bottom-Right 135°, Bottom 180°, Bottom-Left 225°, Left 270°).
- **Tactile D-Pad**: Arranged in an intuitive cross pattern for North/East/South/West scene traversal.
- **Candidate Visual Cards**: Cards explaining Smooth (Average), Contrast, and Strict (Center sample).
- **Active Canvas Selection Helper**: Live detection of the active canvas marquee box displaying dimensions and guidance.
- **Interactive Undo Toast**: Emits `pixibun:toast` with direct `Undo` button upon applying any preview.

---

## 5. Visual QA & Verification Results

### 5.1 Captured Visual Evidence
The visual QA and dry-run execution captured high-resolution real Chromium evidence saved to `docs/research/evidence/ux-qa/`:

1. `22-phase6-research-workbench.png` (1024×768 Responsive Layout Verification):
   - Shows compact fit in right inspector with zero horizontal scrolling (`scrollWidth <= clientWidth + 1`).
   - Clean, centered D-pad controls, prominent golden Apply button, and legible diagnostic notes.
2. `23-simplification-preview.png` (Task 1: Detail-Preserving Simplification):
   - Active marquee selection on canvas (`Fabric Crest`).
   - Side-by-side Before/After comparison at 4× integer zoom.
   - Preserved native pixels within the crest rectangle while surrounding blocks are simplified to 3px contrast blocks.
   - Tactile candidate cards (Average, Contrast, Nearest) and block-size quick pills.
3. `24-lighting-passes.png` (Task 2: Shared Multi-Pose Lighting):
   - Direction compass presets and spinbuttons.
   - Material cards (Cloth, Metal, Skin, Emissive).
   - Multi-pose propagation toggle (`Use this rig across the active clip`).
   - Split passes inspection (Combined, Specular, Shadow).
4. `25-tile-scene-interactive.png` (Task 3: Seeded Tile Scene with Seams):
   - Interactive scene canvas with pink seam boundary highlights and white cell cursor.
   - Seam diagnostic counter ("1 differing borders; 1 repeated tile placements").
   - Compass D-pad navigation and Seed Randomizer.

### 5.2 Test Execution Metrics
The interface pass reported the following individual checks; these results do not establish zero regressions outside their scope or a fresh production build:

- **TypeScript Compilation:** `npm run typecheck` $\longrightarrow$ **0 errors, 0 warnings**.
- **ESLint Analysis:** `npm run lint` $\longrightarrow$ **0 errors, 0 warnings** (all JSX a11y labels properly associated).
- **Vitest Unit & Integration Suites:** `npx vitest run tests/researchAlgorithms.test.ts tests/researchIntegration.test.tsx` $\longrightarrow$ **36 passed across 2 test files (1.15s)**.
- **Full Vitest Suite:** `npm test` $\longrightarrow$ **1,466 passed across 143 test files**.
- **Playwright Research Suite:** `npx playwright test tests/e2e/researchWorkbench.spec.ts` $\longrightarrow$ **4 passed (15.1s)**.
  - Includes a right-inspector-scoped axe-core scan with **0 violations** in the tested workflows; this is not a full application WCAG conformance finding.
  - Includes 1024×768 responsive layout constraint verification.
- **Playwright Artist Study Dry-Run:** `npx playwright test tests/e2e/phase6ArtistStudyDryRun.spec.ts` $\longrightarrow$ **3 passed (6.2s)**.
- **Documentation Integrity:** `node scripts/verifyDocIntegrity.mjs` $\longrightarrow$ **Passed with 0 errors** (all 72 phase headers unique, 31 ARCHITECTURE sections monotonic, 280 CHANGELOG paths verified, live runner test claims synchronized).

---

## 6. Dry-Run Artist Study Walkthrough

Three automated workflow walkthroughs used generated fixtures to exercise parts of the tasks outlined in `docs/research/phase6-artist-evaluation.md`. They did not execute its participant recruitment, counterbalancing, timing comparisons or subjective rating protocol:

### Scenario 1: Simplification with Protected Details
1. **Starting Point:** Active sprite layer with fine 1px details.
2. **Intent:** Artist chooses `Simplify` tab.
3. **Protection:** Artist drags the Select Box tool (M) across the central insignia. The workbench immediately reports `Active: 5×4px`. Artist enters "Fabric Crest" and clicks "Protect selected rectangle".
4. **Candidate Selection:** Artist tests "Average" (soft blend) and "Contrast" (crisp silhouette).
5. **Result Comparison:** At 4× view, the insignia retains its 100% native RGBA values, while surrounding pixels snap to the active palette using 3px blocks.
6. **Reassurance:** Artist clicks "Apply research preview". A confirmation toast appears with a 1-click Undo button. Clicking Undo instantly restores the original layers.

### Scenario 2: Multi-Pose Lighting Rig
1. **Starting Point:** 3-frame animation clip with normal maps.
2. **Intent:** Artist selects `Relight` tab.
3. **Direction:** Artist clicks the `↖ Top-Left` compass button (315°), sets material to "Metal", and checks "Use this rig across the active clip".
4. **Pass Review:** Artist scrubs through Frame 1, Frame 2, and Frame 3, toggling between "Combined light and shadow" and "Specular only" to verify specular highlight continuity across poses.
5. **Publication:** Artist applies the rig. A single structural history step adds the lit layers across all 3 frames while hiding the originals, allowing a 1-click Undo to restore all poses atomically.

### Scenario 3: Seeded Tile-Scene Exploration
1. **Starting Point:** 16px tile atlas layer.
2. **Intent:** Artist selects `Tile Scene` tab and sets "Horizontal" center path.
3. **Contradiction Feedback:** When contradictory edge labels were supplied, the solver provided immediate, calm feedback: `Scene rules conflict near cell 2. No assignment matches the pinned tiles, walkable path and neighboring edge labels.`
4. **Resolution:** Setting consistent edges and clicking `Create research preview` generated a label-compatible tile layout. Equal edge labels do not guarantee identical border pixels; visible seam diagnostics remain separate.
5. **Interactive Navigation:** Clicking directly on cell 4 in the result canvas moved the white cursor and selected cell 4 for pinning. Seam counts ("1 differing borders; 1 repeated tile placements") provided clear feedback on visual repetition.

---

## 7. Artist-Study Readiness & Remaining Uncertainties

### 7.1 Readiness Assessment
Phase 6 is **Ready for Formative Artist Evaluation** with 5–8 participants:
- All three workflows prioritize creative intention and visual comparison over math and configuration.
- The interface does not require memorization of coordinates, algorithms, or worker lifecycles.
- Previews retain original source pixels, and application uses structural undo; this does not guarantee recovery from every browser, storage or device failure.

### 7.2 Catalog of Bounded Limits & Uncertainties
1. **Maximum Canvas Size:** The research worker bounds each axis to 256 pixels, each batch to 16 poses, and total source pixels to 262,144 (e.g. 16 poses of 128×128 or 4 poses of 256×256). These limits do not establish measured 60 fps, peak heap usage or larger-device behavior.
2. **Tile Count Limit:** The tile scene solver is bounded to at most 16 square tiles and a 20,000-step search limit. It is an exploration and seam diagnostic tool, not an open-world procedural map generator.
3. **Subjective Aesthetic Feedback:** While mathematically conforming to palette roles, normal-map dot products, and edge strings, artist preference between Average and Contrast candidates depends heavily on character style (e.g., chibi vs dark fantasy). The upcoming study will record subjective rating data (1–7 scale) across usefulness, control, and recovery confidence.
