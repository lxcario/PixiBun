# Studio shortcuts and focus policy

The [current status](../current-status.md) records the qualifying revision and observed limits for this contract; production-host and device qualification remain separate.

The generated tool table in [source-contracts.json](../generated/source-contracts.json) is checked against [shortcuts.ts](../../src/config/shortcuts.ts), the shared [command registry](../../src/config/studioCommands.ts) and its keyboard dispatch in [useStudioKeyboard.ts](../../src/hooks/studio/useStudioKeyboard.ts). It is a source-backed inventory, not proof of every input-device interaction.

Two keymaps share every letter shortcut and differ only in Space, Enter, Alt, Shift and the right button on the artwork ([keymap.ts](../../src/lib/input/keymap.ts)). **Standard** is the default and follows common pixel-art editors; **PixiBun classic** keeps the original keys. Switch in **Guide & Shortcuts** (`?`); the choice is saved with the other local preferences.

| Gesture | Standard | PixiBun classic |
| --- | --- | --- |
| Play / Pause | Enter (not while a selection is active, where Enter commits it) | Space |
| Pan | Hold Space and drag; middle-button drag | Alt+drag with a non-selection tool; middle-button drag |
| Pick a color | Alt+click (right button picks the secondary color); the Eyedropper tool's right button also picks secondary | Eyedropper tool only |
| Secondary color | Right-click with Pen, Eraser, Dither, Fill, Line, Iso line, Rectangle, Ellipse or Curve | Shift while painting |
| Straight line from the last pixel | Shift+click with Pen, Eraser or Dither (same layer and frame) | Not available |
| Right-click on the artwork | Paints (see above); right-click beside the artwork opens Canvas tools | Opens Canvas tools |

| Action | Shortcut / gesture |
| --- | --- |
| Pen / Eraser / Fill / Eyedropper | B / E / G / I |
| Pixel Gradient | Shift+G |
| Curve / Dither | C / D; Shift+D resets primary/secondary colors |
| Marquee / Lasso / Wand | M / Q / W; Shift adds and Alt subtracts selection |
| Line / Iso line / Rectangle / Ellipse | L / J / U / O |
| Color Replace / Erase Sampled Color / Normal Chisel | R / Shift+R / K |
| Undo / Redo | Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y |
| Save local / Save As file | Ctrl/Cmd+S / Ctrl/Cmd+Shift+S |
| Command palette / Help | Ctrl/Cmd+K / ? |
| Play / Pause; previous / next frame | Enter (standard) or Space (classic); comma / period |
| Onion skin toggle | F3; previous/next counts, tints and opacity are in the timeline gear |
| Canvas only / restore panels | Shift+Tab with canvas focus; focused controls and dialogs retain keyboard navigation |
| Canvas tools popup | Right-click beside the artwork (standard) or anywhere in the workspace (classic), or Shift+F10 / Context Menu key with the drawing canvas focused; arrows/Home/End navigate, Enter selects, Tab stays inside, Escape closes |
| Pan / Zoom / Fit / 100% | Middle drag, plus Space+drag (standard) or Alt+drag (classic); wheel; Ctrl/Cmd+0 / Ctrl/Cmd+1 |
| Step zoom / brush size | Ctrl/Cmd + plus/minus; left/right square brackets |
| Pixel grid | Ctrl/Cmd + Quote key; the produced apostrophe is the fallback when a physical code is unavailable |
| Navigator keyboard pan / center | Focus overview: arrows by one pixel; Shift+arrows by eight; Enter centers |
| Squint / CVD / swap colors | S / P / X |
| Symmetry / selection flip | Shift+H/V toggles mirrors; H/V flip a selection through viewport handlers, or toggle mirrors when no selection |

Letter shortcuts use physical QWERTY key positions, including letter-based Save/Undo/Redo/clipboard commands. Where a keyboard does not report a physical letter code, the produced key provides a fallback. The grid toggle also accepts the physical Quote position. Other punctuation, numbers, Space and navigation retain their character/key meanings. This does not change the interface language or the operating system's keyboard layout.

The canvas popup's scoped opening keys are owned by [useRadialContextMenu](../../src/hooks/useRadialContextMenu.ts); button navigation, focus restoration and pointer isolation are owned by [RadialContextMenu](../../src/components/studio/RadialContextMenu.tsx). Its labeled tools reuse the canonical metadata above.

Command search opens in the shared native modal, with focus on its combobox. Up/Down select a result, Enter runs it, and Escape restores the opener. The highlighted result is exposed through aria-activedescendant; results do not add individual Tab stops. Empty search results do not execute a command. Undo/Redo remain disabled with an explanation when unavailable. A command that opens another dialog gives that dialog focus; restoration cannot steal focus back to a disconnected search input. Tool selection, Fit, actual pixels, grid and onion skin share registry actions and shortcut labels with keyboard dispatch. Fit measures the drawing region, centers pan and uses the canonical zoom limits/ladder.

Studio, selection, lighting and desktop-practice workspace handlers pause for open native/ARIA modal dialogs, inputs/textareas/selects, editable ancestors and custom textbox/searchbox/combobox/spinbutton/slider controls. They also leave previously handled events, composition input, dead/process keys and AltGraph to their owner. Image paste uses the same dialog/editable boundary. Modal-owned commands and native text editing remain available. The lighting gizmo retains keyboard ownership of its own slider handles through an explicit owner scope; other workspace handlers still yield to those sliders. Unrecognized Ctrl/Cmd/Alt combinations do not fall through to bare tool shortcuts; the lighting gizmo retains its explicit Alt+R action.

Space on buttons, links, summary and matching custom controls keeps native activation and does not start workspace playback. Selection Enter/arrows leave those controls alone. CenterViewport gives Escape/arrow transforms one keyboard owner: arrows nudge once (Shift uses ten pixels) and Escape cancels without first committing the float. Shift+H/V remains symmetry, even with a selection; unshifted H/V is selection flip when applicable. Alt starts subtraction on the artwork or selection body with a selection tool in both keymaps. Middle-button drag pans even with a selection tool; with other tools Alt picks a color (standard) or pans (classic). Transform handles retain their own modifier gestures, including Shift axis lock on translation.

The drawing viewport uses `touch-action: none` and accepts primary-touch drawing while ignoring secondary fingers. Browser scroll/pinch gestures remain available outside that viewport. This introduces neither two-finger canvas navigation nor pressure-sensitive brush behavior. Tablet touch emulation and physical-device qualification have separate scopes in the dated input repair record.

In the standard keymap Space is held to pan and Enter plays; in classic Space is playback. Z alone is not Undo. Rivet/N is retired. Export has no E shortcut. Open secondary controls through File → Projects/Import/Canvas size and Studio → Help/appearance/Co-Draw.
