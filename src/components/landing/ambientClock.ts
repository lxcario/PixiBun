/**
 * One clock for every decorative animation on the homepage.
 *
 * Each scene used to run its own requestAnimationFrame at the display's full
 * rate, repainting pixel art 60 times a second even when nothing a person
 * could see had changed. Here a single frame loop drives them all: each
 * subscriber ticks at its own pace (pixel art reads best around 12 fps),
 * only while its element is on screen and the tab is visible, and never under
 * reduced motion. A `boost` runs a subscriber at full rate for a moment, for
 * the instant feedback of pointer interaction.
 */

export interface AmbientTicker {
  /** Turn ticking on or off (for example from an IntersectionObserver). */
  setActive(active: boolean): void;
  /** Run at the display's full rate for `ms`, then settle back to the ambient pace. */
  boost(ms?: number): void;
  dispose(): void;
}

interface Subscriber {
  draw: (now: number) => void;
  interval: number;
  last: number;
  active: boolean;
  boostUntil: number;
}

const subscribers = new Set<Subscriber>();
let frame = 0;
let listening = false;

function tick(now: number) {
  frame = 0;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  let anyActive = false;
  for (const sub of subscribers) {
    if (!sub.active) continue;
    anyActive = true;
    const interval = now < sub.boostUntil ? 0 : sub.interval;
    // A little slack so a 60 Hz display does not skip every other 12 fps tick.
    if (now - sub.last >= interval - 4) {
      sub.last = now;
      sub.draw(now);
    }
  }
  if (anyActive) frame = requestAnimationFrame(tick);
}

function wake() {
  if (frame || typeof requestAnimationFrame === 'undefined') return;
  frame = requestAnimationFrame(tick);
}

/** Stop the shared frame loop as soon as nothing is ticking. */
function settle() {
  if (!frame || [...subscribers].some(sub => sub.active)) return;
  cancelAnimationFrame(frame);
  frame = 0;
}

function listen() {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wake(); });
}

/** Subscribe a draw function at `fps` frames a second. Starts inactive. */
export function ambientTicker(draw: (now: number) => void, fps = 12): AmbientTicker {
  listen();
  const sub: Subscriber = { draw, interval: 1000 / fps, last: 0, active: false, boostUntil: 0 };
  subscribers.add(sub);
  return {
    setActive(active) {
      sub.active = active;
      if (active) wake(); else settle();
    },
    boost(ms = 900) {
      sub.boostUntil = performance.now() + ms;
      if (sub.active) wake();
    },
    dispose() {
      subscribers.delete(sub);
      settle();
    },
  };
}

/** Tick only while `element` is on screen. Returns a cleanup function. */
export function tickWhileVisible(element: Element, ticker: AmbientTicker, enabled = true): () => void {
  if (!enabled) { ticker.setActive(false); return () => ticker.dispose(); }
  // Start ticking; the observer reports the real visibility right away and pauses offscreen scenes.
  ticker.setActive(true);
  if (typeof IntersectionObserver === 'undefined') return () => ticker.dispose();
  const observer = new IntersectionObserver(([entry]) => ticker.setActive(entry.isIntersecting), { rootMargin: '120px 0px' });
  observer.observe(element);
  return () => { observer.disconnect(); ticker.dispose(); };
}

/** Number of live subscribers, for tests. */
export function ambientSubscriberCount(): number {
  return subscribers.size;
}
