# 🎨 Design System & Spatial Architecture — PixiBun Atelier

```text
  /\_/\   ✦  .  *  .  ✦  *  .  ✦  *  .  ✦  *
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
    Desk["🪵 Deep Plum-Wood Desk (`--desk-surface`)<br/>#140C1E to #201431"] --> Chassis["💼 Thistle Lavender Studio Chassis (`--desk-surface-raised`)<br/>#281B3D"]
    Chassis --> Viewport["📄 Recessed Paper Canvas Surround<br/>#120A1C"]
    Viewport --> Lamp["💡 Incandescent Lamp Glow Overlay (`.lamp-pool`)<br/>#F0BE7C (Single radial overlay)"]
```

### Material Invariants
* **The Single Lamp Pool:** There is at most **one** warm amber illumination pool per scene (`.lamp-pool`). It is rendered as a soft, non-interactive radial gradient overlay (`pointer-events: none`) that batches over the viewport without altering pixel export data.
* **Wood Grain & Dither Inset Textures:**
  * `.texture-dither`: 4px static checkerboard pattern at $\le 6\%$ opacity for inset wells and recessed slider tracks.
  * `.texture-wood-grain`: Static linear gradient streaks representing brushed timber grain.
* **Anti-Slop Discipline:**
  * **Zero ambient floating or bobbing animations.** Elements stay anchored to their physical surfaces.
  * **Zero generic AI sparkles (✨) as feature markers.**
  * **Zero template purple/cyan gradients.** All tones are derived strictly from our semantic OKLCH palette tokens.

---

## 2. Semantic Color Tokens

Our color system is authored in **OKLCH** color space to guarantee perceptual uniformity, verified WCAG AA contrast compliance (4.5:1 for body copy, 3:1 for large controls), and natural directional hue-shifting.

```mermaid
graph LR
    Highlight["☀️ Warm Sunlight Highlight<br/>(H ≈ 80° - 105° Lamp Amber #F0BE7C)"] --- Base["🌸 Core Wisteria Lavender<br/>(H ≈ 305° - 315° #C792DF)"]
    Base --- Shadow["🌑 Cool Plum Shadow<br/>(H ≈ 285° - 295° #3A2E4C)"]
```

### Cozy Midnight (Dark Theme Tokens)

| Token Variable | Hex Code | OKLCH Equivalent | Role & Context |
|---|---|---|---|
| `--desk-bg` | `#140C1E` | `oklch(0.16 0.04 300)` | Master room backdrop, outer layout base |
| `--desk-surface` | `#201431` | `oklch(0.22 0.05 305)` | Master chassis, toolbar, inspector panels |
| `--desk-surface-raised` | `#281B3D` | `oklch(0.26 0.06 308)` | Raised tool blocks, active button plates |
| `--desk-border` | `#3A2E4C` | `oklch(0.32 0.07 310)` | 2px tactile bezel divider, structural outline |
| `--text-heading` | `#EDE8F4` | `oklch(0.93 0.02 300)` | Crisp white/cream headings, button icons |
| `--text-body` | `#D0C4DF` | `oklch(0.82 0.05 305)` | Functional labels, coordinates, layer names |
| `--text-muted` | `#8C7B9E` | `oklch(0.58 0.06 305)` | Inactive tools, helper hints, unit tags |
| `--accent-wisteria` | `#C792DF` | `oklch(0.72 0.15 315)` | Primary active states, selection marquee, play button |
| `--accent-plum` | `#DCABDF` | `oklch(0.79 0.11 320)` | Highlight blooms, secondary guides, curve knots |
| `--accent-gold` | `#F0BE7C` | `oklch(0.82 0.13 80)` | Focus rings, key lights, primary action buttons |
| `--color-danger` | `#E06B7D` | `oklch(0.68 0.18 15)` | Destructive actions, delete layer, discard |

### Morning Atelier (Light Theme Tokens)

| Token Variable | Hex Code | OKLCH Equivalent | Role & Context |
|---|---|---|---|
| `--desk-bg` | `#FBF8F3` | `oklch(0.98 0.01 80)` | Bright morning room base & clean desk surface |
| `--desk-surface` | `#F3EBE0` | `oklch(0.94 0.02 75)` | Warm tactile paper chassis & tool panels |
| `--desk-surface-raised` | `#FFFDF9` | `oklch(0.99 0.01 80)` | Raised card and inspector surfaces |
| `--desk-border` | `#3C2254` | `oklch(0.30 0.09 315)` | High-contrast structural bezel framing |
| `--text-heading` | `#221233` | `oklch(0.20 0.06 315)` | High-contrast dark violet titles & buttons |
| `--text-body` | `#4A3559` | `oklch(0.35 0.06 315)` | Body text, tool parameters, coordinates |
| `--text-muted` | `#78608A` | `oklch(0.50 0.06 315)` | Subtle badges, shortcut keys, secondary text |
| `--accent-gold` | `#D97818` | `oklch(0.65 0.17 65)` | Warm sunlit highlights & primary button fill |
| `--accent-plum` | `#7E2B96` | `oklch(0.48 0.19 320)` | Active tool accents and focus outlines |
| `--accent-wisteria` | `#9940B5` | `oklch(0.55 0.20 315)` | Timeline scrubbers and hover rings |

---

## 3. Dual Theme Switching & Zero-Lag Transition Engine

The studio supports instant switching between **Cozy Midnight** (Dark) and **Morning Atelier** (Light) via the tactile `ThemeToggle` switch:

```mermaid
stateDiagram-v2
    [*] --> SuppressTransitions: Click Theme Switch
    SuppressTransitions --> MutateDOM: Inject Temporary Override Sheet
    MutateDOM --> ForceReflow: Swap data-theme Attribute & Class
    ForceReflow --> RestoreTransitions: Cleanly Remove Override on Next rAF Frame
    RestoreTransitions --> [*]: Normal Smooth Interaction Restored
```

* **Zero-Lag Transition Suppression:** During theme swaps, a temporary `<style>` block disables all CSS transitions across the DOM (`transition: none !important`), forces a synchronous reflow, and removes itself on the next `requestAnimationFrame` tick. This eliminates layout thrashing and repaint stutter across thousands of UI nodes.
* **Animated Tactile Knob:** Spring-physics switch (<kbd>stiffness: 550, damping: 32</kbd>) hosting custom hand-pixelled SVG sprites: a radiant morning sun with geometric rays for Light mode and a cozy crescent moon with a twinkling star for Dark mode.

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
   * Specular reflection light-sweep gliding from left (`-160%`) to right (`+160%`).
3. **Hover Leave (Unhover):**
   * Controlled transition back to `scale(1.0)` with the specular sweep gliding back to the left (`-160%`).
4. **Active / Depression State (Click):**
   * Mechanical depression bounce: `transform: scale(0.97) translateY(1px)`.
   * Inset shadow replacement: `box-shadow: inset 0 2px 4px rgba(0,0,0,0.4)`.
5. **Focus Visible State:**
   * 2px solid amber ring (`outline: 2px solid #F0BE7C; outline-offset: 2px`).

---

## 5. 16-Bit Pixel Cursor & Interactive Atmosphere

On fine-pointer devices (mouse / trackpad), PixiBun activates a custom 16-bit pixel cursor system:
* **Custom SVG Cursors:** Sharp pixel-art quill/arrow for resting state and an illuminated golden wand for clickable elements.
* **Golden Sparkle Particle Trail (`PixelCursor.tsx`):** Lightweight canvas overlay emitting soft amber/wisteria micro-sparkles on rapid cursor movement, with an automatic sleep state when idle to conserve battery and CPU cycles.

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

---

## 7. Anti-Slop Voice & Copywriting Guidelines

* **Voice:** Written from one craftsperson to another — humble, warm, precise, and practical.
* **Banned Buzzwords:** Never use *"Transform your workflow"*, *"The ultimate all-in-one platform"*, *"Seamlessly supercharge"*, *"Unlock next-gen capabilities"*, or fake robotic status codes (*"Payload initialized"*).
* **Positive Framing:** Explain the tangible physical utility clearly: *"Bakes a 3D tangent normal map into a new layer for Godot/Unity"* instead of *"AI-powered magic normal generator"*.
