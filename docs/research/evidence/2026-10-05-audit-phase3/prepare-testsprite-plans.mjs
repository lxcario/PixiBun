import { writeFile } from 'node:fs/promises';
const directory = 'docs/research/evidence/2026-10-05-audit-phase3';
const action = description => ({ type: 'action', description });
const assertion = description => ({ type: 'assertion', description });
const plans = [
  ['commands', {
    name: 'Command search contains focus and shares real studio gestures',
    description: 'Modal focus ownership, empty search, disabled history, dialog handoff and exact Fit agreement.',
    planSteps: [
      action('Use a fresh isolated desktop context, 1280x900. Open Studio, wait for restoration, retain every byte of the visible composite canvas through getImageData; if exact pixel or DOM inspection is unavailable, report BLOCKED, never a visibility-only pass.'),
      action('Focus #center-canvas-area and press Ctrl+K. Search Undo. Press Enter, then search a nonexistent command; press Up, Down and Enter. Clear search. Cycle Tab and Shift+Tab twelve times.'),
      assertion('Undo has aria-disabled=true and No action to undo explanation. It does not close or run. Empty results have no aria-activedescendant. Every tab stop remains inside the native open Command Palette dialog.'),
      action('Focus search and Escape. Check focus returns to #center-canvas-area. Reopen, search Gallery and press Enter. Tab inside the Gallery and close it.'),
      assertion('Gallery owns focus after handoff and closing restores canvas focus. Background controls cannot receive Tab while either modal is open. Report skipped focus checks explicitly.'),
      action('Reopen search, choose Ellipse. Then search Onion, inspect F3 hint, execute it; focus canvas and press F3. Focus canvas and press Ctrl+Quote, then execute Toggle Pixel Grid from search.'),
      assertion('Ellipse is selected by the Ellipse command. F3 reverses the onion command state. Grid keyboard and palette commands reverse one another. O selects Ellipse, never onion skin.'),
      action('Choose Animation workspace. Compare zoom and centered pan after Fit from header, Ctrl+0, navigator Fit canvas and command search Fit. Between each, run Actual 100 percent. Repeat after importing an original synthetic 1024x1024 one-layer blank .pixibun project through public Import/Confirm Import. If upload cannot be performed, report the large-canvas check BLOCKED.'),
      assertion('All four Fits agree on the actual workspace dimensions and center the view. The large canvas fits below 100 percent. Compare every artwork byte before/after each command group, with separate baselines before/after intentional import; view commands never paint pixels.'),
    ],
  }],
  ['workspace', {
    name: 'Navigator, Lighting layouts and pointer tools remain usable',
    description: 'Aspect/overlay alignment, full zoom, task persistence and mouse access at compact widths.',
    planSteps: [
      action('Use a fresh isolated desktop context at 1280x900. Open restored Studio. With Pen size 1, draw a small mark; retain every byte of the visible composite canvas. Unsupported exact pixel/DOM inspection is BLOCKED, never a visibility-only pass.'),
      action('Choose Animation. Set Navigator zoom slider to 6400. Measure navigator canvas intrinsic/display dimensions and its viewport outline; click navigator local point (140,56), drag to (84,42), press Right, Shift+Down, Enter.'),
      assertion('Navigator display ratio matches intrinsic 224x112 (2:1). Slider reports 6400. Outline centers are respectively (140,56), (84,42), (87.5,42), (87.5,70), (112,56), within 0.01px. The keyboard target is the overview button. Pixels remain unchanged.'),
      action('Choose Lighting; wait for the actual Add light and depth heading and Lighting controls. Save artwork, clear sessionStorage only, reload and await restoration. Open Palette; View options menu → Arrange... → save Color desk; switch to Animation, then back to Color desk. Reload.'),
      assertion('Lighting selects PixiTools and its Lighting domain after reload. Animation selects Layers. The saved Color desk selects Palette after switching and reload. Exact artwork bytes still match. Report storage/reset constraints explicitly.'),
      action('At widths 1024,1280,1600 with height900 choose Drawing, Pen and draw a fresh short stroke. Click the header Undo and Redo buttons with the mouse, comparing before/after pixels each time. At 1280 hover Dither until its animated preview is visible, click Dither and immediately draw a size1 Bayer2x2 density0.5 stroke from pixel(0,8) directly to(20,8).'),
      assertion('Every mouse Undo restores the previous bytes and Redo the stroke bytes; Drawing controls cannot block Undo. Activating Dither dismisses its preview before drawing. Dither alpha is 255 at even x and 0 at odd x on row8, including both endpoints. Missing intermediate pixels fail. No keyboard tool-selection workaround is permitted for this check.'),
    ],
  }],
];
for (const [slug, plan] of plans) await writeFile(`${directory}/testsprite-${slug}.plan.json`, JSON.stringify({ projectId: 'ad7cf58e-3c0f-41d6-96a8-a3a076faf639', type: 'frontend', priority: 'p1', ...plan }, null, 2) + '\n');
console.log('Prepared two local review drafts; no cases registered or tests run.');
