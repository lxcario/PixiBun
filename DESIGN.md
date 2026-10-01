#  Design System & Spatial Architecture — PixiBun Atelier

> **Audit-session interaction update — 2026-10-01:** PixiTools includes animation review and Try a new look (previously Explore variations), with native before/after previews, protected rectangles, common light settings and tile border/path diagnostics. Later interface refinements are described in the [Phase 6 UX report](docs/research/PHASE6_UX_HARDENING.md). Automated accessibility/layout checks establish their tested scope; artist usefulness remains unmeasured. See the [session record](docs/research/session-completion-2026-10-01.md).

```text
  /\_/\   *  .  *  .  *  *  .  *  *  .  *  *
 ( o.o )   D E S I G N   S Y S T E M
  > ^ <    The Lamplit Drafting Desk Specification
```

> **A tactile, disciplined design system for creative workbenches.**  
> Grounded in physical materials (dark plum-wood, warm tactile paper, incandescent lamplight, and soft wisteria petals).

---

## 1. Core Visual Metaphor: The Lamplit Drafting Desk

PixiBun is structured around the physical sensation of sitting at a solid wooden drafting desk late at night.

```mermaid
graph TD
    Desk[" Deep Plum-Wood Desk (`--desk-surface`)<br/>#140C1E to #201431"] --> Chassis[" Thistle Lavender Studio Chassis (`--desk-surface-raised`)<br/>#281B3D"]
    Chassis --> Viewport[" Recessed Paper Canvas Surround<br/>#120A1C"]
    Viewport --> Lamp[" Incandescent Lamp Glow Overlay (`.lamp-pool`)<br/>#F0BE7C (Single radial overlay)"]
```

### Material Invariants
* **The Single Lamp Pool:** There is at most **one** warm amber illumination pool per scene (`.lamp-pool`). It is rendered as a soft, non-interactive radial gradient overlay (`pointer-events: none`) that batches over the viewport without altering pixel export data.
* **Wood Grain & Dither Inset Textures:**
  * `.texture-dither`: 4px static checkerboard pattern at $\le 6\%$ opacity for inset wells and recessed slider tracks.
  * `.texture-wood-grain`: Static linear gradient streaks representing brushed timber grain.
* **Anti-Slop Discipline:**
  * **Zero ambient floating or bobbing animations.** Elements stay anchored to their physical surfaces.
  * **Zero generic AI sparkles () as feature markers.**
  * **Zero template purple/cyan gradients.** All tones are derived strictly from our semantic OKLCH palette tokens.

---

## 2. Semantic Color Tokens

Our color system is authored in **OKLCH** color space to maintain perceptual uniformity, target WCAG AA contrast ratios (4.5:1 for body copy, 3:1 for large controls); actual compliance requires testing rendered states, and natural directional hue-shifting.

```mermaid
graph LR
    Highlight["Warm Sunlight Highlight<br/>(H ≈ 80° - 105° Lamp Amber #F0BE7C)"] --- Base[" Core Wisteria Lavender<br/>(H ≈ 305° - 315° #C792DF)"]
    Base --- Shadow[" Cool Plum Shadow<br/>(H ≈ 285° - 295° #3A2E4C)"]
```

### 1. Atelier Theme Tokens (Modern Workstation Baseline)

#### Atelier Dark (Default Midnight Studio)
| Token Variable | Hex Code | Role & Context |
|---|---|---|
| `--desk-bg` | `#16141a` | Neutral dark slate room backdrop |
| `--desk-surface` | `#201d26` | Master chassis, toolbar docks, and inspector panels |
| `--desk-surface-raised` | `#282530` | Raised tool buttons and panel cards |
| `--desk-border` | `#35313d` | Fine tactile bezel divider |
| `--text-heading` | `#ede8f4` | Crisp light headings and active icons |
| `--text-body` | `#cfc7d8` | Body text, tool parameters, coordinates |
| `--text-muted` | `#968ca2` | Inactive tools, helper hints, unit tags |
| `--accent-gold` | `#e5a962` | Warm amber focus rings, key light, primary buttons |
| `--accent-wisteria` | `#b596d9` | Active tool indicator, navigation accents |
| `--accent-plum` | `#9d7ec4` | Secondary guides, curve knots |
| `--accent-sage` | `#7d9d7f` | Positive feedback, success states |

#### Atelier Light (Warm Alabaster Morning)
| Token Variable | Hex Code | Role & Context |
|---|---|---|
| `--desk-bg` | `#ece5d8` | Warm alabaster room base |
| `--desk-surface` | `#f7f1e6` | Tactile parchment panels |
| `--desk-surface-raised` | `#ffffff` | Elevated cards and inputs |
| `--desk-border` | `#442a5c` | High-contrast structural framing |
| `--text-heading` | `#221233` | Deep violet headings |
| `--text-body` | `#4a3559` | Legible dark body text |
| `--text-muted` | `#685179` | High-contrast muted metadata |
| `--accent-gold` | `#8a4500` | Golden sunlit accent buttons |
| `--accent-wisteria` | `#9940b5` | Active tool state and focus rings |

---

### 2. Cozy Classic Theme Tokens (Original Historical Identity)

#### Cozy Classic Dark (Cozy Midnight)
| Token Variable | Hex Code | Role & Context |
|---|---|---|
| `--desk-bg` | `#140c1e` | Deep plum-wood desk surface |
| `--desk-surface` | `#201431` | Thistle lavender studio chassis |
| `--desk-surface-raised` | `#281b3d` | Raised button plates |
| `--desk-border` | `#3a2e4c` | Rich plum-wood structural bezels |
| `--text-heading` | `#ede8f4` | Crisp cream headings |
| `--text-body` | `#d0c4df` | Legible dark-mode body text |
| `--text-muted` | `#a496b8` | Subdued metadata & secondary text |
| `--accent-gold` | `#f0be7c` | Lamp amber focus rings & key light |
| `--accent-wisteria` | `#c792df` | Signature wisteria lavender brand accent |
| `--accent-plum` | `#dcabdf` | Highlight blooms & secondary guides |

#### Cozy Classic Light (Morning Atelier)
| Token Variable | Hex Code | Role & Context |
|---|---|---|
| `--desk-bg` | `#fbf8f3` | Clean morning desk base |
| `--desk-surface` | `#f3ebe0` | Warm tactile paper panels |
| `--desk-surface-raised` | `#fffdf9` | Elevated cards and inputs |
| `--desk-border` | `#3c2254` | High-contrast velvet border |
| `--text-heading` | `#221233` | Crisp legible ink headings |
| `--text-body` | `#4a3559` | Legible morning body text |
| `--text-muted` | `#685179` | High-contrast muted metadata |
| `--accent-gold` | `#d97818` | Morning sunlight buttons |
| `--accent-wisteria` | `#9940b5` | Active tool indicator & wisteria accents |
| `--accent-plum` | `#7e2b96` | Deep plum active tool accents |

---

## 3. Dual-Axis Theme Switching & Zero-Lag Transition Engine

The studio supports two independent theme dimensions:
1. **Studio Theme:** `Atelier` (modern slate workstation) vs. `Cozy Classic` (historical plum & wisteria desk).
2. **Color Scheme:** `Dark` vs. `Light`.

Both axes are selectable through the **Appearance Popover** (`src/components/ui/AppearancePopover.tsx`) in the top rail, while the quick **ThemeToggle** provides 1-click toggling between Dark and Light color schemes.

```mermaid
stateDiagram-v2
    [*] --> SuppressTransitions: Trigger Appearance Switch
    SuppressTransitions --> MutateDOM: Inject Temporary Style Sheet (transition: none !important)
    MutateDOM --> SetAttributes: Apply data-studio-theme & data-color-scheme
    SetAttributes --> ForceReflow: window.getComputedStyle(css).opacity
    ForceReflow --> RestoreTransitions: Cleanly Remove Override on Next rAF Frame
    RestoreTransitions --> [*]: Normal Fluid Interactions Restored
```

* **Zero-Lag Transition Suppression:** During theme swaps, a temporary `<style>` block disables all CSS transitions across the DOM (`transition: none !important`), sets `data-studio-theme` and `data-color-scheme`, forces a synchronous reflow, and removes itself on the next `requestAnimationFrame` tick. This eliminates layout thrashing and repaint stutter across thousands of UI nodes.
* **Appearance Popover Swatches:** Interactive flyout provides real-time swatch palettes representing each theme's core colors before selection, with accessible keyboard navigation and Escape dismissal.

---

## 4. Tactile Physics & Button Mechanical Standard

All interactive buttons and tool wells in PixiBun adhere to a strict 4-state physical mechanics protocol:

```mermaid
stateDiagram-v2
    [*] --> Resting: Initial Load
    Resting --> Hover: Mouse Enter (scale 1.025 + Specular Sweep)
    Hover --> Resting: Mouse Leave (Smooth Reverse Sweep)
    Hover --> Active: Mouse Down (scale 0.97 + Inset Depression)
    Active --> Hover: Mouse Up (Spring Release)
```

1. **Resting State:**
   * 2px rounded corners (`rounded-[2px]`).
   * 2px solid border (`border-2 border-[var(--desk-border)]`).
   * Subtle bottom shadow (`box-shadow: 0 2px 0 var(--btn-shadow)`).
2. **Hover State (Light Sweep):**
   * Micro-scale lift: `transform: scale(1.025)`.
   * Amethyst Wisteria background tint (`#603B82`) providing a 4.6:1 contrast ratio against gold and 6.2:1 against cream text (WCAG 2.2 AA compliant).
   * Dual-band specular reflection light-sweep with wisteria flanking wings gliding from left (`-160%`) to right (`+160%`).
3. **Hover Leave (Unhover):**
   * Controlled transition back to `scale(1.0)` with the specular sweep gliding back to the left (`-160%`).
4. **Active / Depression State (Click):**
   * Mechanical depression bounce: `transform: scale(0.97) translateY(1px)`.
   * Inset shadow replacement: `box-shadow: inset 0 2px 4px rgba(0,0,0,0.4)`.
5. **Focus Visible State:**
   * 2px solid amber ring (`outline: 2px solid #F0BE7C; outline-offset: 2px`).

---

## 5. 16-Bit Pixel Cursor & Interactive Atmosphere

On fine-pointer devices (mouse / trackpad), the landing hero uses custom pixel cursors and click sparks:
* **Custom SVG Cursors:** Sharp pixel-art quill/arrow for resting state and an illuminated golden wand for clickable elements.
* **Click Sparks (`ClickSpark.tsx`):** Short amber and wisteria particles on pointer activation.

---

## 6. Typography Scale & Hierarchies

PixiBun pairs a retro pixel display typeface with a crisp, geometric sans-serif:

```mermaid
graph TD
    Display["<b>Silkscreen</b><br/>Brand Mark, Headers, Modal Titles, Frame Counters"]
    Body["<b>Plus Jakarta Sans</b><br/>Tooltips, Coordinates, Layer Names, Dialog Prose"]
    Mono["<b>JetBrains Mono</b><br/>Hex Codes, Angles, Dimensions, Keyboard Badges"]
```

| Role | Font Family | Size | Weight | Line Height | Usage |
|---|---|---|---|---|---|
| **Display Title** | `Silkscreen` | `18px - 22px` | `700 Bold` | `1.2` | Brand headers, modal banners |
| **Section Label** | `Silkscreen` / `JetBrains Mono` | `10px - 11px` | `700 Bold` | `1.0` | Uppercase module titles, pill badges |
| **UI Body** | `Plus Jakarta Sans` | `12px - 13px` | `500 Medium` | `1.4` | Layer names, dialog descriptions |
| **Numeric Value** | `JetBrains Mono` | `10px - 11px` | `700 Bold` | `1.0` | Coordinate HUD, degree sliders, zoom % |

Tool motion preview cards use a 304px frame with a 14px title, 13px description, and 11px dismiss action. The 96×54 artwork stays pixelated; action/result labels are regular HTML text at 11px so they remain readable at card scale. The close target is 24×24px. Under reduced motion, the preview displays its result frame.

---

## 7. Anti-Slop Voice & Copywriting Guidelines

* **Voice:** Written from one craftsperson to another — humble, warm, precise, and practical.
* **Banned Buzzwords:** Never use *"Transform your workflow"*, *"The ultimate all-in-one platform"*, *"supercharge"*, *"Unlock next-gen capabilities"*, or fake robotic status codes (*"Payload initialized"*).
* **Positive Framing:** Explain the tangible physical utility clearly: *"Bakes a 3D tangent normal map into a new layer for Godot/Unity"* instead of *"AI-powered magic normal generator"*.

---

## 8. Viewport Ergonomics & HUD Precision Guidance

### Brush Bounding Box (HUD Cursor Overlay)
At high zoom factors ($\ge 400\%$), navigating multi-pixel brush sizes ($2\text{px}$ to $16\text{px}$) requires direct spatial feedback:
* **Geometry:** A crisp CSS bounding box matching the square `tools.brushSize` footprint centered on the cursor's artwork coordinate.
* **Color & Contrast:** 1px stroke in warm studio amber (`#F0BE7C` at 60% opacity) layered over a 1px dark shadow stroke (`#140C1E` at 50% opacity) ensuring visibility over both light and dark pixels.
* **Performance Invariant:** The cursor is a CSS element with no canvas backing store; pointer movement updates its position and size without touching Zustand state or triggering React re-renders.

### Artwork Grid Alignment
The stage border is a CSS outline, outside the layout box. The main artwork canvas, selection/grid overlay, and stage share an identical screen origin and size at every zoom. CSS grid pitch is `zoom / 100` screen pixels per artwork pixel. A visible grid line must never drift across an artwork pixel as zoom increases.

### Imported-Art Bucket Controls
The Bucket toolbar exposes Connected/Global, a separately labeled tolerance slider (default 24), and an optional **Enclosed specks** switch for tiny visible color islands. The switch starts off because artists may intend small contrasting details. Transparent holes remain transparent. Color Replace keeps its own exact-match tolerance setting.

### Viewport Fit & Scale Navigation Standards
Keyboard conventions for rapid drafting ergonomics:
* **`Ctrl + 0` (Fit to Screen):** Recomputes zoom and offsets so the entire canvas fills the viewport with at least 32px padding on all sides, aligned to integer zoom steps ($100\%, 200\%, \dots$).
* **`Ctrl + 1` (100% Real Scale):** Resets viewport zoom to exactly 100% with the canvas centered in the drafting desk.

### Accessible Form Controls & Screen Reader Semantics
* **Native Range Sliders:** Native `<input type="range">` elements natively communicate `min`, `max`, and `value` to assistive technologies. Custom `aria-valuemin/max/now` attributes MUST NOT be added redundantly.
* **Mandatory Label Association:** Every slider must be programmatically associated with its text label via `<label htmlFor="...">` or an explicit `aria-label` (e.g. `aria-label="Brush size"`).

---

## 9. Animation Spacing & Variable Timing Visualizer

### Classical Timing vs. Spacing Principles
Grounded in Richard Williams (*The Animator's Survival Kit*) and Disney's 12 Principles of Animation:
* **Proportional Timeline Frame Cards:** Rather than uniform-width cards, timeline frame cards scale their horizontal width proportionally when `durationMs` deviates from the baseline frame duration ($T_{\text{base}} = 1000 / \text{fps}$):
  $$W_{\text{card}} = \text{clamp}\left(48\text{px}, \; 48\text{px} \times \frac{\text{durationMs}}{T_{\text{base}}}, \; 160\text{px}\right)$$
* **Timing Hold Badge:** Frames with $\text{durationMs} \ge 2 \times T_{\text{base}}$ display an understated amber duration pill (`+125ms`) on the top-right corner of the card.
* **Ghost Frame Spacing Falloff:** Onion skin ghost opacity scales down progressively with frame distance ($1 - 0.25 \times (\text{dist} - 1)$) so distant poses do not overwhelm adjacent in-betweens.

---

## 10. Direct Manipulation Lighting Gizmo (`PixelLightBulbGizmo.tsx`)

Grounded in Ben Shneiderman's 1983 direct-manipulation paradigm:
* **Interactive Light Bulb Token:** A tactile incandescent pixel light bulb handle rendered on the canvas viewport representing the directional light vector ($\theta$ azimuth, $\phi$ elevation, and light distance radius).
* **Decoupled Focal Reticle Anchor:** An independent central focal reticle handle (`lightCenterX`, `lightCenterY` / `stageCentroid`). Artists can reposition the focal anchor without perturbing the light direction angle, or orbit the bulb token around the anchor with zero drift.
* **Azimuth Sweep Arc & Distance Line:** A subtle dashed indicator connecting the focal point to the orbiting bulb, visualizing the directional ray in real-time.
* **Tactile Physics & 60fps rAF Updates:** Dragging either handle recalculates azimuth ($\theta = (\text{atan2}(dx, -dy) \times \frac{180}{\pi} + 360) \pmod{360}$) and elevation, rendering in-place preview frames via throttled `requestAnimationFrame` with zero perceptible UI latency.
* **HUD Hotkeys & Micro-Steppers:** Embedded HUD pill with tactile `[-]` / `[+]` brightness steppers, mouse wheel scroll intensity adjustment, quick commit (<kbd>Enter</kbd>), cancel (<kbd>Esc</kbd>), and focal anchor reset (<kbd>R</kbd>).

---

## 11. Tileset Palette & Stamping Workflow

### Grid Partitioning & Slicing Viewport
* **Tile Grid Geometry:** Strict integer grid overlay supporting $16\times16$, $24\times24$, and $32\times32$ pixel tiles.
* **Active Tile Selection:** Double-line brass bezel (`#F0BE7C` outer, `#140C1E` inner) highlighting currently active stamp tile.
* **Stamp Tool Preview:** When the stamp tool is active, the cursor renders a 50% translucent ghost preview of the selected tile snapped to the canvas pixel grid.

---

## 12. Perceptual Accessibility: CVD (Colorblindness) Lens

Grounded in Machado, Oliveira & Fernandes (2009, IEEE TVCG):
* **Non-Destructive Lens Simulation:** A post-composite SVG filter / matrix multiplication pass simulating:
  1. **Protanopia:** L-cone deficiency (red-weakness).
  2. **Deuteranopia:** M-cone deficiency (green-weakness).
  3. **Tritanopia:** S-cone deficiency (blue-weakness).
  4. **Monochromacy:** Pure luminance contrast validation.
* **Lens Invariant:** Operates strictly on viewport display output; project data and exported files remain untouched.

---

## 13. Silhouette & Value Contrast Testing (Squint Mode)

* **Game Art Silhouette Discipline:** A 1-key HUD toggle rendering all non-transparent sprite pixels as solid silhouette black (`#140C1E`) over white background.
* **Utility:** Allows character animators and game artists to immediately evaluate readability, weight distribution, and negative space without color distractions.



When squint preview and a CVD lens are both selected, squint takes precedence.

---

## 14. Studio Design System Primitives

Phase 62 introduces a standardized component library for all studio controls, replacing ad-hoc inline HTML with tactile, accessible primitives that inherit from the Lamplit Desk design language.

### Control Inventory

| Primitive | Visual Behavior | Accessibility |
|---|---|---|
| **StudioSlider** | Real-time percentage fill gradient track with numeric badge and golden accent thumb | `role="slider"`, `aria-valuemin/max/now`, keyboard arrow control |
| **StudioSelect** | Native `<select>` wrapper matching studio surface and border tokens | `role="listbox"` via native element, `focus-visible` highlight |
| **StudioToggle** | Sliding pill switch with hidden checkbox input and gold indicator thumb | `role="switch"`, `aria-checked`, keyboard `Space` toggle |
| **StudioNumberInput** | Labeled numeric input with min/max bounds, step increments, and unit suffix | `role="spinbutton"`, `aria-valuemin/max`, blur/Enter commit |
| **StudioTooltip** | Delay-activated (300ms) tooltip with position anchors (top/bottom/left/right) | Keyboard focus trigger, shortcut badge display |
| **IconButton** | 24–32px square tactile button with ghost/surface/danger variants and translation depression | `focus-visible:ring-2`, `aria-label` required, disabled state |
| **PanelSection** | Collapsible accordion with chevron indicator and action header slot | `aria-expanded`, persistent `localStorage` open/closed state |

### Token Integration
All primitives consume the v2 design token scale defined in `globals.css`:
* **Spacing:** `--space-0` (0px) through `--space-8` (32px) in 4px increments.
* **Radii:** `--radius-sm` (2px) through `--radius-pill` (9999px).
* **Motion:** `--motion-press` (40ms) to `--motion-timeline` (180ms) for mechanical interactions.
* **Surfaces:** `--surface-0` through `--surface-3` for layered elevation.

### Appearance Popover
The `AppearancePopover` (`src/components/ui/AppearancePopover.tsx`) consolidates theme management into a single flyout, superseding the standalone `ThemeToggle` as the primary entry point. It exposes two orthogonal axes:
1. **Studio Theme:** Atelier (modern midnight) or Cozy Classic (historical plum/wisteria).
2. **Color Scheme:** Dark or Light.

Live preview swatches show the target theme's accent/surface colors. Selection triggers `applyThemeToDOM()` in `themeStore.ts` with transition suppression, ensuring zero-lag visual switching.

---

## 15. PixiBunLogo Brand Geometry & Scale System (`PixiBunLogo.tsx`)

Phase 63 standardizes brand mark geometry into a single responsive component (`src/components/ui/PixiBunLogo.tsx`) unifying identity across the studio header rail, playground, landing navigation, hero showcase, mobile gates, and error boundaries:

### Scale Hierarchy

| Scale | Mascot Tile Size | Mascot Graphic | Title Typography | Subtitle Typography | Container Gap |
|---|---|---|---|---|---|
| `'sm'` | `w-7 h-7` (28px) | 18px | `text-xs font-display` | `text-[9px] font-mono` | `gap-2` (8px) |
| `'md'` | `w-8 h-8` (32px) | 22px | `text-sm font-display` | `text-[10px] font-mono` | `gap-2.5` (10px) |
| `'lg'` | `w-10 h-10` (40px) | 28px | `text-base font-display` | `text-xs font-mono` | `gap-3` (12px) |

### Design Invariants
* **Tactile Mascot Tile:** Housed in a raised bezel (`bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] shadow-sm`) with Bun mascot micro-animation.
* **Dual Typography Lockup:** Crisp uppercase heading (`font-display font-bold tracking-wider text-[var(--text-heading)]`) stacked over a tracked amber sub-brand (`font-mono text-[var(--accent-gold)] tracking-tight ATELIER`).
* **Subtle Elevation:** Renders with `drop-shadow-sm` on studio bars and `drop-shadow-md` on hero and footer surfaces.

---

## 16. Smart-Effect Recipe Provenance & FX Inspector Semantics

Grounded in non-destructive digital art workflows (such as Blender geometry nodes and Photoshop smart filters):

### 1. Layers Panel FX Provenance
Layers generated by PixiBud smart features (photometric lighting, bounded 2.5D cast shadows, volumetric optics, normal maps, autotile contours, WFC synthesis) display a distinct golden `FX` indicator badge in `LayersPanel.tsx` when they carry a saved effect recipe:
* Visual tag signaling that the layer was generated parametrically rather than painted by hand.
* Hover tooltip displays the recipe generation kind (`Generated from a saved photometric recipe`).

### 2. Live Recipe Reopening (`Edit FX`)
Photometric lighting layers include a tactile `Edit FX` button:
* Clicking `Edit FX` loads the saved `LayerEffectRecipe.params` into the studio store.
* Mounts the `PixelLightBulbGizmo` directly in place on the canvas with the exact azimuth, elevation, brightness, and material previously applied.
* Artists can adjust the light angle or intensity in real-time and commit changes non-destructively, preserving the underlying hand-drawn artwork untouched.

### 3. Real-Time Analysis Readout Card
`PhotometricLightingSection.tsx` mounts a live heuristic analysis readout card listening to `pixibun:photometric-analysis`:
* **Detected Form:** Upper-case badge indicating detected geometry (`CHARACTER`, `PROP`, `ORB`).
* **Material & Source Light:** Reports inferred material preset and existing light coordinates ($\theta^\circ / \phi^\circ$).
* **Directional Shading Cue:** Continuous heuristic strength rating (`Weak` $< 0.25$, `Medium` $< 0.65$, `Strong` $\ge 0.65$) describing the confidence of directional shading already present in the artwork.
* **Surface Interpretation Overrides:** Tactical segmented buttons (`[ Auto | Character | Prop | Orb ]`) allowing the artist to override morphology heuristics when working on stylized or ambiguous subjects.

---

## 17. Discrete Shading Tones & 3D Specular Highlight System

In retro arcade and pixel art styles, surfaces are shaded using controlled, discrete tonal ramps rather than continuous 24-bit gradients. Phase 63 formalizes pixel-art cel-shading band modes and specular highlights:

### 1. Shading Tones Modes
* **1 Single (2 Total Colors):** Classic 2-tone arcade shading (base color + single directional shadow tone). Ideal for clean game sprites and low-color retro palettes (e.g. Capcom CPS2).
* **2 Dual (3 Total Colors):** Core shadow + deep boundary shadow. The studio default, providing depth and form definition without visual clutter.
* **3 Trio (4 Total Colors):** Soft penumbra ($L \approx 0.93 \cdot L_{\text{base}}$) + core mid-shadow + deep umbra crescent. Emulates rich hand-drawn anime and 16-bit RPG boss sprites.
* **Studio Controls:** Available via the `Shading Tones` button group in the inspector and on the on-canvas `PixelLightBulbGizmo` bottom HUD (`SHADE: 1 | 2 | 3`).

### 2. Continuous 3D Specular Highlight Pill
* **Natural Volumetric Pill:** Instead of artificial 1-pixel speck clusters or broad flat washes, highlights render as a continuous 3D Blinn-Phong highlight pill with smooth alpha falloff.
* **Macro-Silhouette Normal Field:** Normals are sampled from the smooth inflated dome (`specularNormalField`), guaranteeing that interior eye depressions and color boundaries never produce reflective scars or cliff cuts.
* **Physical Visibility Gating:** Strict line-of-sight gate ($N_{3D} \cdot L_{3D} > 0$) ensures specular highlights only appear on lit surfaces facing the light source.
* **Feature Shielding:** Facial features (eyes, mouth) and dark outlines are masked out, ensuring highlights land only on organic surface curves.

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

The six bounded audit phases and later interface fixes are implemented. Current UI groups project/drawing/view actions, keeps save status at the bottom right and offers Light your sprite, Shape the surface and Add a shadow with short descriptions. [Current UI/UX behavior and evidence](docs/research/session-ui-ux-2026-10-01.md) includes the latest 1,472-test gate/build and focused menu/theme checks. The [completion record](docs/research/session-completion-2026-10-01.md) separates delivered work from pending artist evaluation and release approval.
<!-- /session-publication-2026-10-01 -->
