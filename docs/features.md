# What you can make with PixiBun

Current engineering verification and remaining release checks are recorded in the [current status](current-status.md).

[Artist handbook](guides/README.md) · [Documentation map](README.md) · [Current status](current-status.md)

This is the current web app's feature index, reconciled with the published Studio/Nibbli source on **13 October 2026**. Interface pictures retain their actual capture dates; new motion, rotation and Curve adjustment controls have source-backed instructions but no new handbook illustration. Rows distinguish those controls from older captures. A picture shows a real interface state; it does not prove every browser, exported file or artist workflow has been qualified. The guides explain destinations, previews, actions that change pixels immediately and the limits to keep in mind.

## Welcome and starting points

The [3 October session record (local archive)](archives.md#record-docs-research-2026-10-03-audit-session-publication-md) covers the current safety repairs and documentation reconciliation. Exact browser checks and cloud-run limitations are linked there; this feature index is not an execution verdict.

| Feature | What it does | Guide | Screenshot |
| --- | --- | --- | --- |
| Interactive welcome desk | Lamp toggle, pet interaction, temporary mini sketch and clear/color choices | [Desk](guides/welcome-and-demos.md#a-small-moment-at-the-desk) | [Welcome](assets/screenshots/2026-10-02-feature-repairs-phase5/welcome-overview.png) |
| Blank drawing entry | Small canvas presets and full Studio entry | [Begin](guides/welcome-and-demos.md#ready-to-draw) | [Welcome](assets/screenshots/2026-10-02-feature-repairs-phase5/welcome-overview.png) |
| Four starter sprites | Hearth Ghost, Little Shroom, Bun and Little Lantern open as editable starting points | [Starter shelf](guides/welcome-and-demos.md#choose-a-starter-friend) | [All four](assets/screenshots/2026-10-02-feature-guide/starter-shelf.png) |
| 2.5D Lighting & Shadows demonstration | Sample material, light, normal/tone and shadow comparisons | [Lighting demo](guides/welcome-and-demos.md#25d-lighting--shadows) | [Panel](assets/screenshots/2026-10-02-feature-repairs-phase5-welcome/welcome-photometric.png) |
| RotSprite Precision demonstration | Sample angle/presets/spin; RotSprite versus nearest-neighbor | [Rotation demo](guides/welcome-and-demos.md#rotsprite-precision) | [Panel](assets/screenshots/2026-10-02-feature-repairs-phase5-welcome/welcome-rotsprite.png) |
| Image Synthesis demonstration | Two sample scenes, three target sizes, sampling/color/dither comparison | [Image demo](guides/welcome-and-demos.md#image-synthesis) | [Panel](assets/screenshots/2026-10-02-feature-repairs-phase5/welcome-pixelize.png) |
| Game Engine Exports demonstration | Godot/Unity/Phaser sample text and APNG/GIF specification text; copy/download | [Example downloads](guides/welcome-and-demos.md#game-engine-exports) | [Panel](assets/screenshots/2026-10-02-feature-repairs-phase4/welcome-apng-notes.png) |

Source: [moonlit atelier](../src/components/landing/night/NightHero.tsx), [starter definitions](../src/lib/art/starterTemplates.ts), [showcase](../src/components/landing/AtelierEngineShowcase.tsx). Showcase state and downloads are separate from Studio project state.

## Every drawing tool

All **17** entries come from [the canonical tool list](../src/config/shortcuts.ts). The tool guide explains gestures, relevant settings, selection masks, locks and Undo. Tool screenshots show the selected tool and available controls; they are not before/after demonstrations of every possible stroke.

| Tool | Key | Main use | Detailed guide | Screenshot |
| --- | --- | --- | --- | --- |
| Pen | B | Freehand pixels, size and pixel-perfect cleanup | [Pen](guides/drawing-tools.md#pen) | [Controls](assets/screenshots/2026-10-02-feature-guide/tool-pen.png) |
| Bézier Curve | C | Draft a quadratic curve, adjust start/end/bend handles and Apply/Cancel; source/history-bound re-edit | [Curve and current limits](guides/drawing-tools.md#bézier-curve) | [Earlier controls](assets/screenshots/2026-10-02-feature-guide/tool-curve.png) |
| Eraser | E | Remove pixels from the selected layer | [Eraser](guides/drawing-tools.md#eraser) | [Controls](assets/screenshots/2026-10-02-feature-guide/tool-eraser.png) |
| Flood Fill | G | Contiguous/global fill, tolerance and bounded gap closure | [Fill](guides/drawing-tools.md#flood-fill) | [Controls](assets/screenshots/2026-10-02-feature-guide/tool-bucket.png) |
| Pixel Gradient | Shift+G | Masked linear/radial fills using exact ramp colors, optional Bayer 4×4 | [Gradient](guides/drawing-tools.md#pixel-gradient) | [Masked fill](assets/screenshots/2026-10-04-artist-workspace/selection-gradient.png) |
| Dither Brush | D | Patterned primary/secondary color transitions | [Dither](guides/drawing-tools.md#dither-brush) | [Controls](assets/screenshots/2026-10-02-feature-guide/tool-dither.png) |
| Color Replace | R | Replace matching color pixels on the active layer | [Replace](guides/drawing-tools.md#color-replace) | [Controls](assets/screenshots/2026-10-02-feature-guide/tool-color-replace.png) |
| Erase Sampled Color | Shift+R | Remove a sampled family with scope/tolerance choices | [Erase color](guides/drawing-tools.md#erase-sampled-color) | [Controls](assets/screenshots/2026-10-02-feature-guide/tool-erase-color.png) |
| Marquee Box | M | Rectangular selection; add/subtract and transform | [Box](guides/drawing-tools.md#marquee-box) | [Tool](assets/screenshots/2026-10-02-feature-guide/tool-select-box.png) |
| Lasso Select | Q | Freehand selection mask | [Lasso](guides/drawing-tools.md#lasso-select) | [Tool](assets/screenshots/2026-10-02-feature-guide/tool-select-lasso.png) |
| Magic Wand | W | Color-based selection using shared fill settings | [Wand](guides/drawing-tools.md#magic-wand) | [Tool](assets/screenshots/2026-10-02-feature-guide/tool-select-wand.png) |
| Line | L | Straight brush-width stroke | [Line](guides/drawing-tools.md#line) | [Controls](assets/screenshots/2026-10-02-feature-guide/tool-line.png) |
| 2:1 Iso Line | J | ON projects diagonals to 2:1; FREE follows endpoints; both preview and commit agree | [Iso line](guides/drawing-tools.md#21-iso-line) | [Controls](assets/screenshots/2026-10-02-feature-repairs-phase3/iso-snapped.png) |
| Rectangle | U | Outline/filled rectangles | [Rectangle](guides/drawing-tools.md#rectangle) | [Controls](assets/screenshots/2026-10-02-feature-guide/tool-rectangle.png) |
| Ellipse | O | Outline/filled ellipses | [Ellipse](guides/drawing-tools.md#ellipse) | [Controls](assets/screenshots/2026-10-02-feature-guide/tool-ellipse.png) |
| Normal Chisel | K | Paint surface normals on a normal layer | [Chisel](guides/drawing-tools.md#normal-chisel) | [Tool](assets/screenshots/2026-10-02-feature-guide/tool-normal-chisel.png), [surface setup](assets/screenshots/2026-10-02-feature-guide/normal-sculpting.png) |
| Eyedropper | I | Sample a visible color for drawing | [Eyedropper](guides/drawing-tools.md#eyedropper) | [Tool](assets/screenshots/2026-10-02-feature-guide/tool-eyedropper.png) |

## Workspace, layers, selections and view

| Feature | What is available | Guide | Screenshot |
| --- | --- | --- | --- |
| Local project gallery | Search/open, clone, rename and confirmed delete; no cloud account | [Projects](guides/studio-workspace.md#projects-and-names) | [Gallery](assets/screenshots/2026-10-02-feature-guide/projects-gallery.png) |
| Save and title | Rename; immediate Save and debounced autosave; outcome badge | [Save](guides/artwork-safety.md#save-and-restore-outcomes) | [Studio](assets/screenshots/2026-10-02-feature-guide/tool-pen.png) |
| Image/project import | Picker/drop and browser-supplied clipboard image; native/fit, exact/retro, new layer/replace/frame; project/compatible JSON confirmation | [Import](guides/studio-workspace.md#bring-in-an-image) | [Importer](assets/screenshots/2026-10-02-feature-guide/import-image.png) |
| Sprite Sheet Slicer | Guessed/pixel-analyzed cutline suggestions, cell size, margins, spacing, row/column order, empty-cell and timeline destination | [Slicer](guides/studio-workspace.md#slice-a-sprite-sheet) | [Slicer](assets/screenshots/2026-10-02-feature-guide/import-spritesheet.png) |
| Canvas resize | Presets/custom dimensions, aspect lock, anchor, optional resampling | [Resize](guides/studio-workspace.md#resize-the-canvas) | [Dialog](assets/screenshots/2026-10-02-feature-guide/canvas-resize.png) |
| Layer stack | Add/duplicate/rename/reorder/hide/lock/opacity, merge down/delete | [Layers](guides/studio-workspace.md#layers) | [Stack](assets/screenshots/2026-10-02-feature-guide/tool-pen.png) |
| Layer blending | Normal, Multiply, Screen, Overlay, Color Dodge, On artwork only | [Blend choices](guides/studio-workspace.md#layers) | [Stack](assets/screenshots/2026-10-02-feature-guide/tool-pen.png) |
| Color wells and picker | Primary/secondary, swap/reset, recent/quick swatches, triangle/square, HSV/hex and optional pinned panel | [Colors](guides/artist-workspace.md#keep-colors-and-settings-close) | [Picker](assets/screenshots/2026-10-04-artist-workspace/color-tools-navigator.png) |
| Artist workspace | Drawing/Animation/Lighting presets, inspector side/width, panel visibility, six browser layouts, Shift+Tab canvas focus | [Layouts](guides/artist-workspace.md#choose-and-save-a-layout) | [Workspace](assets/screenshots/2026-10-04-artist-workspace/color-tools-navigator.png) |
| Detailed tool inspector | Active-tool brush, fill, selection, dither and chisel controls alongside quick header controls | [Tools](guides/artist-workspace.md#keep-colors-and-settings-close) | [Inspector](assets/screenshots/2026-10-04-artist-workspace/selection-gradient.png) |
| Canvas navigator | Whole-image overview, view outline, recenter, 1:1/Fit and small-canvas grid | [Navigator](guides/artist-workspace.md#see-the-whole-canvas) | [Overview](assets/screenshots/2026-10-04-artist-workspace/color-tools-navigator.png) |
| Selection transforms | Mask, move/nudge, eight resize handles, pivot, rotation/snap, flips, 90° turns, commit/cancel | [Transform](guides/studio-workspace.md#selections-and-transforms) | [Gizmo](assets/screenshots/2026-10-02-feature-guide/selection-transform.png) |
| Rotation algorithm | Contour-aware RotSprite v3 or integer-sampled Paeth, with separate normal-vector handling where applicable | [Rotation](guides/artist-workspace.md#rotate-a-detail-or-try-rigid-part-motion) | The older gizmo capture predates these choices |
| Canvas clipboard | Pixel selection copy/cut/paste, floating destination | [Clipboard](guides/studio-workspace.md#selections-and-transforms) | [Selection](assets/screenshots/2026-10-02-feature-guide/selection-transform.png) |
| Undo/Redo | Session history with admitted payload and depth bounds | [History safety](guides/artwork-safety.md#damaged-stored-projects) | [Studio](assets/screenshots/2026-10-02-feature-guide/tool-pen.png) |
| Zoom, fit and pan | Wheel/steps, fit, 100%, middle/Alt drag and contextual arrows | [Navigation](guides/studio-workspace.md#view-and-symmetry) | [View](assets/screenshots/2026-10-02-feature-guide/view-options.png) |
| Drawing guides | Pixel grid, 2:1 grid, Off/Thirds/Golden/Center/Diagonals/Safe area composition | [Guides](guides/studio-workspace.md#view-and-symmetry) | [Diagonals](assets/screenshots/2026-10-04-artist-workspace/color-tools-navigator.png) |
| Seam/view previews | 3×3 canvas repetition; movable/resizable/minimizable PiP with backdrop/playback | [Previews](guides/studio-workspace.md#view-and-symmetry) | [PiP](assets/screenshots/2026-10-02-feature-repairs-phase3/single-live-preview.png) |
| CVD and silhouette lenses | Color-vision simulation and shape inspection; view only | [Lenses](guides/studio-workspace.md#view-and-symmetry) | [View](assets/screenshots/2026-10-02-feature-guide/view-options.png) |
| Drawing symmetry | Horizontal/vertical mirrors; p2, pm, p4, p4m, p6m wallpaper groups | [Symmetry](guides/studio-workspace.md#view-and-symmetry) | [View](assets/screenshots/2026-10-02-feature-guide/view-options.png) |
| Quick tools menu | Canvas right-click or Shift+F10: ten labeled drawing/selection/shape tools and color swap; either mouse button selects | [Quick tools](guides/studio-workspace.md#right-click-quick-tools) | [Current menu](assets/screenshots/2026-10-08-motion-layout/canvas-tools.png) |
| Command palette | Search tools, project, playback and view actions with Ctrl/Cmd+K | [Commands](guides/studio-workspace.md#appearance-help-and-command-search) | [Search](assets/screenshots/2026-10-02-feature-guide/command-palette.png) |
| Theme and hover help | Moonlit / Sakura / Tidepool / Ember / Moss / Arcade (animated scenes) and Graphite / Plum (flat), each Night/Day; first-run welcome and level-based tips; animated tool-preview preference with 3-step storyboards | [Appearance](guides/studio-workspace.md#appearance-help-and-command-search) | [Studio menu](assets/screenshots/2026-10-02-feature-guide/studio-options.png) |
| Shortcut guide and status | Contextual keys, cursor/size/zoom/frame/layer readouts | [Help](guides/studio-workspace.md#appearance-help-and-command-search) | [Shortcut dialog](assets/screenshots/2026-10-02-feature-guide/shortcuts-help.png) |

Sources: [workspace owners](../ARCHITECTURE.md), [rail](../src/components/layout/AtelierRail.tsx), [viewport](../src/components/layout/CenterViewport.tsx), [layers](../src/components/layout/inspector/LayersPanel.tsx), [shortcuts](contracts/shortcuts.md). View overlays are not painted or exported artwork.

## Palettes and color motion

| Feature | What is available | Guide | Screenshot |
| --- | --- | --- | --- |
| Palette authoring | Named pick/copy/artwork draft; edit/reorder/remove swatches; cancel or create | [Author](guides/palettes-and-cycling.md#gather-your-colors) | [Draft](assets/screenshots/2026-10-02-docs/palette-from-artwork.png) |
| Presets, import and scan | Palette selector, supported HEX/GPL/text/JSON, up-to-six-color Scan Canvas | [Import/scan](guides/palettes-and-cycling.md#swatches-file-import-and-ramps) | [Palette](assets/screenshots/2026-10-02-feature-guide/palette-ramps.png) |
| Palette library | All-swatch cards, project/library/favorites and color-count filters, artist/name search, four credited additional palettes; explicit application | [Library](guides/artist-workspace.md#compare-palettes-before-choosing) | [Library](assets/screenshots/2026-10-04-artist-workspace/palette-library.png) |
| OKLCH ramp | Generate five highlight/shadow swatches from the primary color | [Ramp](guides/palettes-and-cycling.md#swatches-file-import-and-ramps) | [Ramp](assets/screenshots/2026-10-02-feature-guide/palette-ramps.png) |
| Cycle tracks | Name/enable/delete, inclusive First/Last, rate/direction/BlendShift, play/speed | [Cycle](guides/palettes-and-cycling.md#track-controls) | [Configured track](assets/screenshots/2026-10-02-docs/palette-cycle-range.png) |
| CRNG exchange | Supported binary cycle-chunk import/export; not a complete IFF movie | [CRNG](guides/palettes-and-cycling.md#track-controls) | [Track](assets/screenshots/2026-10-02-docs/palette-cycle-range.png) |
| Semantic roles and bindings | Name registers, locate RGB, bind/remove frame rectangles; duplicate-index delivery | [Roles](guides/palettes-and-cycling.md#roles-and-index-bindings) | [Roles](assets/screenshots/2026-10-02-feature-guide/palette-roles.png) |

Sources: [Palette panel](../src/components/layout/inspector/PalettePanel.tsx), [roles](../src/components/layout/inspector/PaletteRolesSection.tsx), [cycle/rendering contract](contracts/rendering.md). Palette changes do not generally recolor stored RGBA pixels.

## Animation and review

| Feature | What is available | Guide | Screenshot |
| --- | --- | --- | --- |
| Timeline editing | Add blank/duplicate/delete frames, reorder, select and edit per-frame holds | [Frames](guides/animation-and-review.md#frames-holds-and-playback) | [Timeline](assets/screenshots/2026-10-02-feature-guide/animation-timeline.png) |
| Playback and onion skin | Play/pause, step, loop, holds, preview speed; 0–5 previous/next ghosts, separate tints, opacity, presets and F3 toggle | [Playback](guides/animation-and-review.md#frames-holds-and-playback) | [Onion controls](assets/screenshots/2026-10-04-artist-workspace/onion-settings.png) |
| Tags and clips | Named inclusive frame ranges, colors and loop choices | [Clips](guides/animation-and-review.md#tags-and-clips) | [Tag editor](assets/screenshots/2026-10-02-feature-guide/animation-tags.png) |
| Animation review | Clip scan, bounded alignment, thumbnails/diff, findings and report navigation | [Review](guides/animation-and-review.md#review-animation) | [Report](assets/screenshots/2026-10-02-feature-guide/animation-review.png) |
| Intentional differences | Record review exceptions without changing pixels | [Review](guides/animation-and-review.md#review-animation) | [Report](assets/screenshots/2026-10-02-feature-guide/animation-review.png) |
| Regions and protection | Named clip rectangles, protection and cleanup scope | [Protection](guides/animation-and-review.md#regions-and-protection) | [Region](assets/screenshots/2026-10-02-feature-guide/animation-protection.png) |
| In-between pose | Insert a heuristic intermediate frame for admitted neighbors | [In-between](guides/animation-and-review.md#add-an-in-between-pose) | [Action](assets/screenshots/2026-10-02-feature-guide/cleanup-color-actions.png) |
| Rigid-part motion and saved rigs | Capture one color-layer selection, Start/End/pivot/easing, preview and bake; shared 2–30-pose limits, precise controls and session parameter Undo/Redo; named rig Save/Open/Rename/Delete; stale sources are refused | [Motion](guides/artist-workspace.md#rotate-a-detail-or-try-rigid-part-motion) | No new handbook capture; [source controls](../src/components/layout/inspector/PixiMotionPanel.tsx) |

Sources: [timeline](../src/components/layout/BottomTimeline.tsx), [review](../src/components/layout/inspector/AnimationReviewSection.tsx), [cleanup/in-between](../src/components/layout/inspector/PixiBudAssistanceSection.tsx), [motion adapter](../src/lib/animation/pixiMotion.ts), [saved rig library](../src/components/layout/inspector/MotionRigLibrary.tsx). A review finding is an inspection cue, not proof that a deliberate animation choice is wrong.

## All five PixiTools tasks

The chooser exposes **Add light and depth**, **Build tiles and patterns**, **Clean and refine**, **Review animation**, and **Try a new look**, plus **Browse all tools**. [Task navigation and actions](guides/pixitools-cleanup-and-tiles.md) share the same operations; opening a task alone does not apply them. [Chooser screenshot](assets/screenshots/2026-10-02-feature-guide/pixitools-chooser.png).

| Feature | What is available | Guide | Screenshot |
| --- | --- | --- | --- |
| Live photometric lighting | Auto/manual light; movable bulb; Apply/Cancel | [Light](guides/lighting-and-surfaces.md#move-a-light-before-applying-it) | [Bulb](assets/screenshots/2026-10-02-feature-guide/lighting-live.png) |
| Materials and tone controls | Material choices, estimated depth, stepped/smooth style and bounded advanced settings | [Setup](guides/lighting-and-surfaces.md#manual-light-and-shading-style) | [Manual](assets/screenshots/2026-10-02-feature-guide/lighting-manual.png) |
| Lighting/glint recipes | Saved source/settings, reopen effect, current/stale source behavior | [Effects](guides/lighting-and-surfaces.md#saved-lighting-and-glint-effects) | [Actions](assets/screenshots/2026-10-02-feature-guide/lighting-extra-actions.png) |
| Normal bake and inspection | Bake a normal map or preview it apart from color | [Normal map](guides/lighting-and-surfaces.md#more-lighting-actions) | [Actions](assets/screenshots/2026-10-02-feature-guide/lighting-extra-actions.png) |
| Glint and selective outline | Specular highlights and directional outline treatment | [More actions](guides/lighting-and-surfaces.md#more-lighting-actions) | [Actions](assets/screenshots/2026-10-02-feature-guide/lighting-extra-actions.png) |
| Surface sculpting | Normal Facets layer, Chisel width/incline/direction, ridge and RNM/UDN/Replace | [Surface](guides/lighting-and-surfaces.md#shape-the-surface) | [Sculpting](assets/screenshots/2026-10-02-feature-guide/normal-sculpting.png) |
| Shadows | Automatic floor shadow; manual projection, direction, radius, opacity, tint/dither | [Shadow](guides/lighting-and-surfaces.md#add-a-shadow) | [Controls](assets/screenshots/2026-10-02-feature-guide/shadow-options.png) |
| Cleanup scan | Non-destructive report/thumbnail; layer/clip scope and cleanup protections | [Scan](guides/pixitools-cleanup-and-tiles.md#scan-before-cleaning) | [Scan](assets/screenshots/2026-10-02-feature-guide/cleanup-scan.png) |
| Rotation and line cleanup | RotSprite presets, Smooth Jaggies, Thin Lines, Remove Stray Pixels | [Lines](guides/pixitools-cleanup-and-tiles.md#clean-rotation-and-lines) | [Preview](assets/screenshots/2026-10-02-feature-guide/cleanup-lines-preview.png) |
| Color moods | Sunset, Moonlight, Neon before/after previews | [Moods](guides/pixitools-cleanup-and-tiles.md#color-moods-and-dithering) | [Sunset](assets/screenshots/2026-10-02-feature-guide/color-mood-preview.png) |
| Dither and palette refinement | Atkinson/Riemersma dithering, Snap to Active Palette, Harmonized Accents | [Colors](guides/pixitools-cleanup-and-tiles.md#color-moods-and-dithering) | [Actions](assets/screenshots/2026-10-02-feature-guide/cleanup-color-actions.png) |
| Selected tile preview/download | Repeat an exact selected rectangle 3×3; download native selected tile PNG | [Repeat](guides/pixitools-cleanup-and-tiles.md#repeat-a-selected-tile) | [Tile](assets/screenshots/2026-10-02-feature-guide/tiles-repeat.png) |
| Unique-tile decomposition | Selected-layer 8/16/32 px slicing; matching PNG + PixiBun/Tiled maps in one ZIP; stale-result blocking | [Slice](guides/pixitools-cleanup-and-tiles.md#slice-into-unique-tiles) | [Result](assets/screenshots/2026-10-02-feature-repairs-phase4/unique-tile-bundle.png) |
| 47-blob contours | Inspect contour preview; apply a separate contour layer | [Contours](guides/pixitools-cleanup-and-tiles.md#preview-47-blob-contours) | [Preview](assets/screenshots/2026-10-02-feature-guide/tiles-contours.png) |
| Simplify variations | Block sizes, edge/palette protection, candidate previews and separate outputs | [Simplify](guides/variations-and-scenes.md#simplify) | [Preview](assets/screenshots/2026-10-02-feature-guide/research-pixelize.png), [options](assets/screenshots/2026-10-02-feature-guide/research-pixelize-options.png) |
| Shared light | Consistent named source across admitted poses, light/material and output views | [Shared light](guides/variations-and-scenes.md#shared-light-across-poses) | [Preview](assets/screenshots/2026-10-02-feature-guide/research-light.png), [options](assets/screenshots/2026-10-02-feature-guide/research-light-options.png) |
| Small tile scenes | Seed, edge/walkability rules, pins, route checks and bounded scene candidates | [Scenes](guides/variations-and-scenes.md#small-tile-scenes) | [Preview](assets/screenshots/2026-10-02-feature-guide/research-scene.png), [options](assets/screenshots/2026-10-02-feature-guide/research-scene-options.png) |
| Variation recipes | Save/reopen settings and sources; current/stale/missing-source handling | [Recipes](guides/variations-and-scenes.md#save-and-revisit-a-recipe) | [Options](assets/screenshots/2026-10-02-feature-guide/research-scene-options.png) |

Sources: [task list](../src/components/layout/inspector/AiToolsPanel.tsx), [lighting](../src/components/layout/inspector/PhotometricLightingSection.tsx), [sculptor](../src/components/layout/inspector/NormalSculptorSection.tsx), [shadows](../src/components/layout/inspector/RaymarchedShadowSection.tsx), [tiles](../src/components/layout/inspector/TilesetDecomposerSection.tsx), [cleanup](../src/components/layout/inspector/PixiBudAssistanceSection.tsx), [variations](../src/components/layout/inspector/ResearchWorkbenchSection.tsx). These are local bounded algorithms; the source directory's “ai” name does not imply a remote generative model.

## Every export tab

All **12** tabs have their own instructions and current screenshot. Scope, scale, alpha, timing and resource admission vary by format; read [the guide](guides/exporting.md) before choosing an output.

| Tab | Output and scope | Detailed guide | Screenshot |
| --- | --- | --- | --- |
| PNG | Visible active-frame still | [PNG](guides/exporting.md#png) | [Options](assets/screenshots/2026-10-02-feature-guide/export-png.png) |
| GIF | Quantized timeline/clip animation | [GIF](guides/exporting.md#gif) | [Options](assets/screenshots/2026-10-02-feature-guide/export-gif.png) |
| APNG | Admitted RGBA timeline/clip animation in a PNG file | [APNG](guides/exporting.md#apng) | [Options](assets/screenshots/2026-10-02-feature-repairs-phase5/export-apng.png) |
| WebM Video | Browser-dependent recorded video; cycles and scale | [WebM](guides/exporting.md#webm-video) | [Options](assets/screenshots/2026-10-02-feature-guide/export-webm.png) |
| MP4 Video | Browser-dependent H.264/MP4; odd dimensions padded | [MP4](guides/exporting.md#mp4-video) | [Options](assets/screenshots/2026-10-02-feature-repairs-phase5/export-mp4.png) |
| Sprite Sheet | Horizontal/vertical/grid PNG with optional Godot resource or TexturePacker JSON | [Sheet](guides/exporting.md#sprite-sheet) | [Options](assets/screenshots/2026-10-02-feature-guide/export-spritesheet.png) |
| Godot Kit | Bounded Godot 4.7 ZIP, exact indexed option, palette/alpha/normal assets and manifest | [Kit](guides/exporting.md#godot-kit) | [Preflight](assets/screenshots/2026-10-02-feature-repairs-phase4/godot-manual-normals.png) |
| Timelapse | Replay of retained history, GIF or supported MP4; not a permanent stroke recording | [Replay](guides/exporting.md#timelapse) | [Options](assets/screenshots/2026-10-02-feature-guide/export-replay.png) |
| Vector SVG | Active-frame heuristic vectorization and scale | [SVG](guides/exporting.md#vector-svg) | [Options](assets/screenshots/2026-10-02-feature-repairs-phase4/svg-approximation.png) |
| Shaders | Godot/Unity palette-lookup code; textures still need delivery | [Shaders](guides/exporting.md#shaders) | [Options](assets/screenshots/2026-10-02-feature-guide/export-shader.png) |
| Cycle Loop | Sample active-frame palette motion into APNG/GIF | [Cycle](guides/exporting.md#cycle-loop) | [Options](assets/screenshots/2026-10-02-feature-guide/export-palette-cycle.png), [configured loop](assets/screenshots/2026-10-02-docs/cycle-loop-export.png) |
| Project Backup | Editable `.pixibun` project including admitted metadata and rasters | [Backup](guides/exporting.md#project-backup) | [Options](assets/screenshots/2026-10-02-feature-guide/export-project.png) |

Sources: [export modal](../src/components/modals/ExportModal.tsx), [export contract](contracts/exports.md). Still-image tabs use the active frame even when a clip selector is visible. Welcome-page APNG/GIF text downloads are not these exporters.

## Learning, Teaching Board and small screens

The [lesson guide](guides/learning-and-playground.md#desktop-lessons) explains drawing notes, lightbox visibility/opacity, Trace Stencil, Clear Frame, local outline comparison, Next/Back, the practice timeline and finishing in Studio. Each of the **12** lessons has a current screenshot and pose/timing details:

| Lesson | Screenshot |
| --- | --- |
| The Master Bouncing Ball | [First pose](assets/screenshots/2026-10-02-feature-repairs-phase2/lesson-master-bouncing-ball.png) |
| Sub-Pixel Character Idle | [First pose](assets/screenshots/2026-10-02-feature-repairs-phase2/lesson-subpixel-idle.png) |
| Sword Slash & Combat Hitstop | [First pose](assets/screenshots/2026-10-02-feature-repairs-phase2/lesson-combat-slash-hitstop.png) |
| Character Hop & Shock Absorption | [First pose](assets/screenshots/2026-10-02-feature-repairs-phase2/lesson-character-hop-shock.png) |
| The Bouncing Mochi | [First pose](assets/screenshots/2026-10-02-feature-repairs-phase2/lesson-bouncing-mochi.png) |
| The Hearth Flame | [First pose](assets/screenshots/2026-10-02-feature-repairs-phase2/lesson-hearth-flame.png) |
| The Character Hop | [First pose](assets/screenshots/2026-10-02-feature-repairs-phase2/lesson-bun-hop.png) |
| Magic Potion Bubbles | [First pose](assets/screenshots/2026-10-02-feature-repairs-phase2/lesson-potion-bubble.png) |
| The Slime Glide | [First pose](assets/screenshots/2026-10-02-feature-repairs-phase2/lesson-slime-glide.png) |
| The Twinkling Star | [First pose](assets/screenshots/2026-10-02-feature-repairs-phase2/lesson-twinkling-star.png) |
| The Water Ripple | [First pose](assets/screenshots/2026-10-02-feature-repairs-phase2/lesson-water-ripple.png) |
| The Sword Slash | [First pose](assets/screenshots/2026-10-02-feature-repairs-phase2/lesson-sword-slash.png) |

| Other learning feature | Guide | Screenshot |
| --- | --- | --- |
| Separate desktop practice: checkpoint original, Return, explicit Keep as a new project, refresh-return pointer and refusal on failure | [Keep and return](guides/learning-and-playground.md#keep-your-drawing-try-something-new) | [Practice](assets/screenshots/2026-10-02-feature-repairs-phase2/isolated-practice.png), [new project](assets/screenshots/2026-10-02-feature-repairs-phase2/kept-practice-new-project.png) |
| Teaching Animation Board: Bun/Gel Slime, construction hover, alternate colors, ten poses, timing/play/FPS/onion trail, load into practice | [Board](guides/learning-and-playground.md#teaching-animation-board) | [Board](assets/screenshots/2026-10-02-feature-repairs-phase2/teaching-board.png) |
| Pocket Doodle Pad: temporary 32×32 drawing, swatches, eraser, clear and PNG download | [Pocket](guides/learning-and-playground.md#pocket-doodle-pad) | [Pad](assets/screenshots/2026-10-02-feature-guide/pocket-doodle.png) |
| Full Studio's narrow-screen gate: Home/Pocket routes; full desk requires 1024 px | [Screen size](guides/learning-and-playground.md#pocket-doodle-pad) | [Gate](assets/screenshots/2026-10-02-feature-guide/mobile-studio-gate.png) |

Sources: [curriculum](../src/lib/art/playgroundLessons.ts), [practice controls](../src/components/onboarding/ArtisanHandbookPanel.tsx), [Teaching Board](../src/components/playground/TeachingAnimationBoard.tsx), [Pocket](../src/components/playground/PocketDoodlePad.tsx). Tracing an example and reaching the completion screen are not evidence of learning gains.

## Safety, collaboration and privacy

| Feature | What is available | Guide | Screenshot |
| --- | --- | --- | --- |
| Local persistence and conflict copies | IndexedDB autosave/immediate save; save outcomes and Save a copy after a conflict | [Safety](guides/artwork-safety.md#save-and-restore-outcomes) | [Project output](assets/screenshots/2026-10-02-feature-guide/export-project.png) |
| Recovery and untouched archive | Assess stored damage, review/consent to losses, create a separate recoverable copy; forensic ZIP with current-source admission and visible failure feedback | [Recovery](guides/artwork-safety.md#damaged-stored-projects) | [Assessment](assets/screenshots/2026-10-02-feature-repairs-phase6/archive-source-preserved.png), [backup refusal](assets/screenshots/2026-10-02-feature-repairs-phase6/archive-overflow-refused.png), [plan](assets/screenshots/2026-10-02-feature-guide/recovery-plan.png) |
| Co-Draw | One host/guest, invite/answer token exchange, peer pixel synchronization, host-owned structure | [Co-Draw](guides/collaboration-and-privacy.md#co-draw) | [Dialog](assets/screenshots/2026-10-02-feature-guide/co-draw.png) |
| Offline and browser installation | After one online visit, production builds precache every Studio file, so drawing and every panel, dialog and export tab open offline; a panel that still cannot load offers Try again in place; installation where the browser offers it | [Offline](guides/collaboration-and-privacy.md#local-saves-and-offline-drawing) | [Studio](assets/screenshots/2026-10-02-feature-guide/tool-pen.png) |
| Diagnostics preferences | Local ring buffer, opt-in remote reports, JSON export and clear logs | [Diagnostics](guides/collaboration-and-privacy.md#help-and-diagnostics) | [Preferences](assets/screenshots/2026-10-02-feature-guide/privacy-diagnostics.png) |
| Vulnerability reporting | Private contact and actual trust/network boundaries | [Security policy](../SECURITY.md) | [Privacy preferences](assets/screenshots/2026-10-02-feature-guide/privacy-diagnostics.png) |

Sources: [storage contract](contracts/storage.md), [Co-Draw](../src/components/modals/CoDrawModal.tsx), [offline route](../src/app/sw.js/route.ts), [security boundaries](contracts/security-boundaries.md). A settings screenshot is not a completed peer session, offline test or recovery success.

## Current limits and unfinished work

These limits belong beside the feature list so a visible control is not mistaken for a completed promise:

- **Practice is temporary until kept:** desktop practice now uses a separate workspace after a confirmed original save. Return restores the original; Keep saves a new project. Refresh loses unkept practice and restores the saved original on return. Session Undo and native handles do not survive a full reload; browser storage can still disappear. Co-Draw must be closed first. Mobile mounts only Pocket. [Saving and return guide](guides/learning-and-playground.md#keep-your-drawing-try-something-new), [custody boundary](../src/lib/project/practiceSession.ts).
- **Normal export needs one source:** manual Normal Facets and baked Normal Maps are both accepted. Every exported frame must have exactly one at full opacity with Normal blending; ambiguous sources are refused. Stored channels are preserved; imported conventions need checking. [Explanation](guides/lighting-and-surfaces.md#shape-the-surface).
- **SVG is approximate:** the panel now explains the contour heuristic; smoothing can change edges and details. Canonical depixelization and pixel-exact reconstruction are not promised. [Actual SVG scope](guides/exporting.md#vector-svg).
- **Tiles are bounded tools:** unique tiles export as a matching PNG/map ZIP, with exact-size admission and stale-result checks. Blob contours are not a finished 47-tile set. Small-scene previews are not general world generation. [Tile guide](guides/pixitools-cleanup-and-tiles.md), [scene guide](guides/variations-and-scenes.md).
- **Browser and resource boundaries:** full Studio needs a wide viewport; codecs/install/offline availability depend on the browser. Project/history/export admission can refuse operations. [Limits](contracts/storage.md), [export fidelity](contracts/exports.md).
- **Qualification remains scoped:** real two-machine Co-Draw, broader engine/device/pen/assistive-technology qualification and participant learning/artist studies remain pending. Read [current status](current-status.md) and [the research registry](research/issue-registry.md).
- **Future and retired work:** v2 neural/native/GPU/SIMD/tree-CRDT/P3 ideas are [proposals](../V2_VISION.md). The retired radio/audio and volumetric/SSAO paths described in old release history are not advertised current features. No cloud account, automatic cloud backup, general AI generation or shipped native package is implied.
- **Artist requests with larger scope:** arbitrary docking, automatic body-part extraction or idle/attack animation, a particle emitter, liquify and free warp are researched proposals, not shipped controls. [Request-by-request decisions (local archive)](archives.md#record-docs-research-2026-10-04-artist-workspace-feedback-md).
- **Motion is a bounded first slice:** one rigid color part in a solo workspace; finish a floating selection first. Normal-tagged or normal-map-effect sources and active Co-Draw are refused. Moving parts also refuse normal artwork or dependent research siblings in the source frame. Rotated parts render within their own bounds and clip at canvas edges. Pose/pivot edits remain temporary until saved or baked, with bounded session parameter Undo/Redo. Cancel the session to use artwork/library history. Bake copies palette-binding rectangles at fixed coordinates; it does not move semantic regions with the part. Multi-part rigs, source rebinding, large-canvas responsiveness and artist qualification remain open. [Current evidence and remaining work (local archive)](archives.md#record-docs-research-2026-10-08-session-review-publication-md).

## What the remaining work would involve

| Boundary | Why it remains | What would close it |
| --- | --- | --- |
| GIF colors/alpha and approximate SVG | Format constraints and the current converter change some detail; a label cannot add fidelity | Use PNG/APNG for admitted RGBA images; a broader SVG algorithm needs reference fixtures and reconstruction comparisons |
| Browser-only storage and temporary practice | Local saves are not off-device copies; reload cannot recreate unkept session memory | Keep an editable Project Backup now; cloud sync or durable practice/history would be separate product work with storage/conflict/privacy contracts |
| Project, tile and export size admission | Bounds refuse oversized work before allocating; the ledger does not measure all browser/GPU memory | Profile named devices and peak/retained allocations before deliberately expanding the envelope |
| More engine and video consumers | Valid bytes and a browser download do not prove every importer/decoder | Import the actual files in named versions; rendered normal lighting, fresh Tiled desktop import and broader Unity/Phaser delivery remain separate |
| Physical devices and assistive technologies | Temporary desktop browser contexts do not exercise real pens, touch hardware or screen readers | Run and record the actual input/keyboard/assistive-technology matrix, including failures |
| Artist usefulness and learning | Local outline scores and automated journeys are not participant observations | Run the consented study protocols with named build/tasks, actual observations and limitations |
| Release/update/rollback | These repairs are an uncommitted local checkout | Record the deployed revision/cache identity and qualify old-reader/update behavior before a separate release decision |

These are concrete follow-ups, not a claim that improvement is impossible. [Current execution](current-status.md), [release readiness](guides/release-readiness.md) and [the research registry](research/issue-registry.md) distinguish repaired defects, format boundaries and work that needs more evidence.

## How to keep this index honest

When adding/removing a user-facing action, update its guide, feature row, source link and affected screenshot together. The coverage check for this revision compared canonical tools, export tabs, PixiTools tasks, curriculum, starters and showcase tabs to their source lists, then reviewed remaining menus and workflows. It does not claim that each internal function deserves its own screenshot or that every sentence is automatically certified.

[Capture provenance](assets/screenshots/2026-10-02-feature-guide/run.json) records the new illustrations; [the dated handbook review (local archive)](archives.md#record-docs-research-2026-10-02-feature-handbook-md) records checks and limitations. Keep operating instructions here and dated executions in research/evidence.
