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

Studio keyboard shortcuts exclude focused INPUT, TEXTAREA and SELECT elements. Space on buttons/summary/role-button controls keeps native activation and does not start playback. Other handlers can have additional modal/selection rules; do not promise universal shortcut suppression on every contenteditable/custom control. Alt starts subtraction on the artwork or selection body with a selection tool. Middle-button drag pans even with a selection tool; Alt pans with other tools. Transform handles retain their own modifier gestures, including Shift axis lock on translation.

Space is playback, not Space+drag pan. Z alone is not Undo. Rivet/N is retired. Export has no E shortcut. Open secondary controls through File → Projects/Import/Canvas size and Studio → Help/appearance/Co-Draw.
