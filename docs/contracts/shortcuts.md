# Studio shortcuts and focus policy

The generated tool table in [source-contracts.json](../generated/source-contracts.json) is checked against [shortcuts.ts](../../src/config/shortcuts.ts) and actual keyboard mappings in [useStudioKeyboard.ts](../../src/hooks/studio/useStudioKeyboard.ts). It is a source-backed inventory, not proof of every input-device interaction.

| Action | Shortcut / gesture |
| --- | --- |
| Pen / Eraser / Fill / Eyedropper | B / E / G / I |
| Curve / Dither | C / D; Shift+D resets primary/secondary colors |
| Marquee / Lasso / Wand | M / Q / W; Shift adds and Alt subtracts selection |
| Line / Iso line / Rectangle / Ellipse | L / J / U / O |
| Color Replace / Erase Sampled Color / Normal Chisel | R / Shift+R / K |
| Undo / Redo | Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y |
| Save local / Save As file | Ctrl/Cmd+S / Ctrl/Cmd+Shift+S |
| Command palette / Help | Ctrl/Cmd+K / ? |
| Play / Pause; previous / next frame | Space; comma / period |
| Pan / Zoom / Fit / 100% | Middle or supported Alt+drag; wheel; Ctrl/Cmd+0 / Ctrl/Cmd+1 |
| Step zoom / brush size | Ctrl/Cmd + plus/minus; left/right square brackets |
| Squint / CVD / swap colors | S / P / X |
| Symmetry / selection flip | Shift+H/V toggles mirrors; H/V flip a selection through viewport handlers, or toggle mirrors when no selection |

Letter shortcuts use physical QWERTY key positions, including letter-based Save/Undo/Redo/clipboard commands. Where a keyboard does not report a physical letter code, the produced key provides a fallback. Punctuation, numbers, Space and navigation retain their character/key meanings; the Help dialog states this policy. This does not change the interface language or the operating system's keyboard layout.

Studio, selection, lighting and desktop-practice workspace handlers pause for open native/ARIA modal dialogs, inputs/textareas/selects, editable ancestors and custom textbox/searchbox/combobox/spinbutton/slider controls. They also leave previously handled events, composition input, dead/process keys and AltGraph to their owner. Image paste uses the same dialog/editable boundary. Modal-owned commands and native text editing remain available. The lighting gizmo retains keyboard ownership of its own slider handles through an explicit owner scope; other workspace handlers still yield to those sliders. Unrecognized Ctrl/Cmd/Alt combinations do not fall through to bare tool shortcuts; the lighting gizmo retains its explicit Alt+R action.

Space on buttons, links, summary and matching custom controls keeps native activation and does not start workspace playback. Selection Enter/arrows leave those controls alone. CenterViewport gives Escape/arrow transforms one keyboard owner: arrows nudge once (Shift uses ten pixels) and Escape cancels without first committing the float. Shift+H/V remains symmetry, even with a selection; unshifted H/V is selection flip when applicable. Alt starts subtraction on the artwork or selection body with a selection tool. Middle-button drag pans even with a selection tool; Alt pans with other tools. Transform handles retain their own modifier gestures, including Shift axis lock on translation.

The drawing viewport uses `touch-action: none` and accepts primary-touch drawing while ignoring secondary fingers. Browser scroll/pinch gestures remain available outside that viewport. This introduces neither two-finger canvas navigation nor pressure-sensitive brush behavior. Tablet touch emulation and physical-device qualification have separate scopes in the dated input repair record.

Space is playback, not Space+drag pan. Z alone is not Undo. Rivet/N is retired. Export has no E shortcut. Open secondary controls through File → Projects/Import/Canvas size and Studio → Help/appearance/Co-Draw.
