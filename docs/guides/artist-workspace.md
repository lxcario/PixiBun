# Arrange a desk for drawing and animation

[Handbook](README.md) · [Drawing tools](drawing-tools.md) · [Animation](animation-and-review.md)

Use the **Workspace** list in the project rail to keep the panels you need nearby. These are desktop Studio controls; the phone's Pocket interface has its own layout. At compact desktop widths, control groups wrap onto another row so project actions remain reachable.

## Choose and save a layout

| Layout | Starting arrangement |
| --- | --- |
| Drawing | Right inspector, 292 px wide, Tools selected, timeline visible |
| Animation | Right inspector, 320 px wide, Layers selected, navigator and timeline visible |
| Lighting | Right inspector, 340 px wide, PixiTools selected, pinned color picker and navigator visible, timeline hidden |

Open **View → Arrange...** to put the inspector on the left or right, set its width from 260 to 420 px, and show or hide the color picker, navigator and timeline. Enter a name and **Save layout**; keep up to six named layouts. A saved layout includes the selected inspector tab and PixiTools task. Choose it from the Workspace list to restore that task and arrangement. Lighting opens **Add light and depth**; reloading restores the stored task even when session preferences were cleared. Later adjustments affect the current arrangement; save another named layout to keep that variation. **Restore preset** restores the selected built-in preset, or Drawing when a user layout is selected.

Layouts, color-picker shape and palette favorites belong to this browser and site origin. They are separate from project artwork and are not included in a project backup. This version moves the whole inspector; it does not detach individual panels or drag tabs into arbitrary docks. Switching layouts does not change pixels or frame holds.

## Keep colors and settings close

![Pinned triangle, detailed settings and the whole-canvas navigator.](../assets/screenshots/2026-10-04-artist-workspace/color-tools-navigator.png)

Choose **Color** to pin the picker. **Foreground / Background** chooses which drawing color you edit. The outer ring sets hue; the triangle mixes that hue with white and black. Choose **Square** if you prefer independent saturation and value axes. The Hue, Saturation and Value sliders also support keyboard input; the hex field accepts `#rrggbb`, or `#rgb` when you leave the field. Changing a drawing color does not recolor existing pixels.

Choose the inspector's **Tools** tab for the selected tool's controls: brush size, clean corners, shape fill, fill tolerance, selection tolerance, dither pattern or chisel settings as applicable. The top bar retains quick controls. The settings panel scrolls when several optional panels are open.

**Composition** offers Off, Rule of thirds, Golden ratio, Center, Diagonals and Safe area (10%). The safe-area guide is a framing aid, not a guarantee about a target engine or screen. Guides never become artwork or appear in exports.

## Compare palettes before choosing

Open **Palette → Browse palettes**. Cards display all swatches together; search by palette or artist, filter project/library/favorites, or limit the color count. Clicking a card previews it without changing the active palette. **Favorite** keeps it in this browser's favorites; **Use palette** selects an existing project palette or adds the chosen library palette once.

![Palette library with complete swatch previews and explicit application.](../assets/screenshots/2026-10-04-artist-workspace/palette-library.png)

The additional library includes [Sweetie 16 by GrafxKid](https://lospec.com/palette-list/sweetie-16), [DawnBringer 16 by DawnBringer](https://lospec.com/palette-list/dawnbringer-16), [Endesga 16 by ENDESGA](https://lospec.com/palette-list/endesga-16) and [1bit Monitor Glow by Polyducks](https://lospec.com/palette-list/1bit-monitor-glow). Each card links to its source. Choosing a palette does not recolor existing RGBA artwork. Use the separate palette-snap workflow when you intend to change artwork colors.

## See the whole canvas

Choose **View → Navigator** for a small, unsmoothed whole-canvas overview with a viewport outline. Its aspect ratio stays fixed, so artwork pixels retain their proportions. Click or drag the overview to center the main view on that location. Focus the overview and use arrows to move by one artwork pixel, Shift+arrows by eight, or Enter to center. **1:1** restores 100%; **Fit canvas** uses the same workspace fit as the header, Ctrl/Cmd+0 and command search, including zoom below 100% for large artwork. The zoom slider covers 10–6400%. Its optional grid covers the complete image on canvases up to 128×128; larger canvases disable that grid to avoid a dense, unreadable overlay.

## Draw a pixel gradient

![A two-color gradient constrained by an irregular selection mask.](../assets/screenshots/2026-10-04-artist-workspace/selection-gradient.png)

1. Work on an unlocked layer. Make a box, lasso or wand selection when only part of the layer should change.
2. Choose **Pixel Gradient** or press **Shift+G** with the canvas focused. Open the inspector's **Tools** tab.
3. Choose **Linear** or **Radial**, then **Foreground → background** or **Active palette, in order**. A useful palette ramp needs an intentional swatch order; a general-purpose palette is not automatically a good shading ramp.
4. Keep **Bayer 4×4 dithering** on for a patterned transition, or turn it off for hard bands. Drag from the first color toward the last; a radial drag runs from the center to its radius. Inspect the live preview, then release to commit one Undo step.

Only supplied ramp RGB colors are painted, at full opacity. No interpolated RGB colors are introduced. Without a selection, the fill covers the active layer, including transparent pixels; it can replace that layer's existing artwork. A one-color palette or zero-length drag does nothing. Canceling the pointer gesture leaves artwork unchanged. Gradient fill does not apply drawing mirrors; edit or duplicate a selected result deliberately if you need a mirrored fill.

## Inspect poses with onion skin

![Onion skin controls beside two independently drawn poses.](../assets/screenshots/2026-10-04-artist-workspace/onion-settings.png)

Open the gear beside **Onion Skin** in the expanded timeline. Set **Previous / Next** counts independently from 0 to 5, choose each tint and adjust opacity. **Previous pose** isolates the last pose; **Either side** compares both neighbors; **Motion trail** shows three on each side. Distant ghosts fade. Trails stop at the project's first and last frame; they do not wrap or stop at a clip tag boundary. Memory admission can reduce available previews.

Ghosts appear while paused, and remain separate from artwork and exports. **F3** toggles them with canvas focus. These settings travel with the saved project. Try one previous pose first: compare the planted foot, torso size and highlight placement; use playback at 1× to judge timing. The [walk-cycle exercise](animation-and-review.md#build-a-readable-walk-cycle) gives a concrete sequence.

## Work with only the canvas

Focus the drawing canvas and press **Shift+Tab**, or choose **View → Canvas Only**. The project rail, workspace row, tool shelf, inspector, timeline, status bar and floating preview are hidden. Press **Shift+Tab** again, or choose **Restore panels**, to recover the same arrangement. Playback can continue while the timeline is hidden. Focus mode is temporary and is not restored after reload.

Shift+Tab in an input, dialog or focused button keeps its ordinary keyboard-navigation behavior. F3 and drawing shortcuts also yield to dialogs and editable controls. The existing [focus policy](../contracts/shortcuts.md) remains applicable.
