// Pan offset shown while a pan gesture is in progress.
//
// Writing panX/panY to the studio store on every pointer move re-rendered the
// whole viewport, the Navigator and the light gizmo each frame. During a
// gesture the pan lives here instead: the viewport moves its stage and the
// Navigator moves its view box imperatively, and the owner of the gesture
// writes the store once when it ends.

export interface PanPoint {
  x: number;
  y: number;
}

/**
 * Called with the live pan on every preview. When the gesture ends it is
 * called with `null` and the pan the store now holds (`settled`), or with no
 * settled pan when the preview was abandoned and the store value stands.
 */
export type LivePanListener = (pan: PanPoint | null, settled?: PanPoint) => void;

let live: PanPoint | null = null;
const listeners = new Set<LivePanListener>();

/** The pan being previewed, or null when no gesture is in progress. */
export function getLivePan(): PanPoint | null {
  return live;
}

/** Shows a pan without touching the store. Rounded like the store's setPan. */
export function previewPan(x: number, y: number): void {
  const next = { x: Math.round(x), y: Math.round(y) };
  if (live && live.x === next.x && live.y === next.y) return;
  live = next;
  for (const listener of listeners) listener(next);
}

/**
 * Ends the preview. Pass the pan that was just written to the store so every
 * listener lands exactly on it; omit it to fall back to the store value.
 */
export function endLivePan(settled?: PanPoint): void {
  if (!live && !settled) return;
  live = null;
  for (const listener of listeners) listener(null, settled);
}

export function subscribeLivePan(listener: LivePanListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Writes the previewed pan to the store with `setPan` and ends the preview.
 * Returns the committed pan, or null when nothing was being previewed.
 */
export function commitLivePan(setPan: (x: number, y: number) => void): PanPoint | null {
  const pan = live;
  if (!pan) return null;
  setPan(pan.x, pan.y);
  endLivePan(pan);
  return pan;
}
