/**
 * Canvas keymaps.
 *
 * Standard follows the conventions pixel artists know from Aseprite: hold Space
 * to pan, Alt-click picks a color, Shift-click draws a straight line from the
 * last pixel, right-click paints with the secondary color, and Enter plays.
 * PixiBun classic keeps the original keys: Space plays, Alt-drag pans, Shift
 * paints with the secondary color, and right-click opens the canvas tools popup.
 * Middle-button drag pans in both.
 */

export type Keymap = 'standard' | 'classic';

export const KEYMAP_LABELS: Record<Keymap, string> = { standard: 'Standard', classic: 'PixiBun classic' };

export type PointerIntentKind = 'pan' | 'sample' | 'draw' | 'ignore';

export interface PointerIntent {
  kind: PointerIntentKind;
  /** Paint or pick the secondary color instead of the primary one. */
  secondary: boolean;
  /** Draw a straight line from the end of the previous stroke first. */
  lineFromLast: boolean;
}

export interface PointerModifiers {
  button: number;
  altKey: boolean;
  shiftKey: boolean;
}

/** Tools whose right-click paints with the secondary color in the standard keymap. */
const SECONDARY_PAINT_TOOLS = new Set(['pen', 'eraser', 'dither', 'bucket', 'line', 'isometric-line', 'rectangle', 'ellipse', 'curve']);
/** Tools that draw a line from the last pixel on Shift-click in the standard keymap. */
const LINE_FROM_LAST_TOOLS = new Set(['pen', 'eraser', 'dither']);
/** Tools whose Shift chooses the secondary color in the classic keymap. */
const CLASSIC_SHIFT_SECONDARY_TOOLS = SECONDARY_PAINT_TOOLS;

const intent = (kind: PointerIntentKind, secondary = false, lineFromLast = false): PointerIntent => ({ kind, secondary, lineFromLast });

/** What a pointer press on the canvas does, before any tool runs. */
export function pointerIntent(keymap: Keymap, e: PointerModifiers, tool: string, spaceHeld: boolean): PointerIntent {
  if (e.button === 1) return intent('pan');
  const selectTool = tool.startsWith('select-');

  if (keymap === 'classic') {
    // Selection tools own Alt for subtraction.
    if (e.button === 0 && e.altKey && !selectTool) return intent('pan');
    if (e.button !== 0) return intent('ignore');
    return intent('draw', e.shiftKey && CLASSIC_SHIFT_SECONDARY_TOOLS.has(tool));
  }

  if (e.button === 0 && spaceHeld) return intent('pan');
  if (e.button !== 0 && e.button !== 2) return intent('ignore');
  const right = e.button === 2;
  if (e.altKey && !selectTool) return intent('sample', right);
  if (tool === 'eyedropper') return intent('sample', right);
  if (right) return SECONDARY_PAINT_TOOLS.has(tool) ? intent('draw', true) : intent('ignore');
  return intent('draw', false, e.shiftKey && LINE_FROM_LAST_TOOLS.has(tool));
}

/** Whether a stroke in progress paints with the secondary color. */
export function strokeUsesSecondary(keymap: Keymap, startedSecondary: boolean, e: { shiftKey: boolean } | undefined, tool: string): boolean {
  // Classic lets Shift switch colors mid-stroke, as it always has.
  if (keymap === 'classic') return !!e?.shiftKey && CLASSIC_SHIFT_SECONDARY_TOOLS.has(tool);
  return startedSecondary;
}

/** Right-click on the artwork opens the tools popup only in the classic keymap. */
export function rightClickOpensToolsPopup(keymap: Keymap, onArtwork: boolean): boolean {
  return keymap === 'classic' || !onArtwork;
}

/** The key that plays and pauses the animation. */
export function playbackKey(keymap: Keymap): 'Enter' | ' ' {
  return keymap === 'standard' ? 'Enter' : ' ';
}

export function parseKeymap(value: unknown): Keymap {
  return value === 'classic' ? 'classic' : 'standard';
}

// Space is held for panning in the standard keymap. One flag for the whole
// workspace: the keyboard hook sets it and the viewport reads it.
let spaceHeld = false;
export function isSpaceHeld(): boolean { return spaceHeld; }
export function setSpaceHeld(held: boolean): void {
  if (spaceHeld === held) return;
  spaceHeld = held;
  if (typeof document !== 'undefined') {
    if (held) document.documentElement.dataset.spacePan = 'true';
    else delete document.documentElement.dataset.spacePan;
  }
}
