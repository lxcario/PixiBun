// Collision-proof identity generation for layers, frames, clips, and messages.
// Date.now() IDs collided when two entities were created within the same
// millisecond (e.g. addFrame cloning N layers), corrupting buffer lookups.

let counter = 0;

function getRandomEntropy(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0].toString(36);
  }
  return Math.floor(Math.random() * 0xffffffff).toString(36);
}

export function createId(prefix: string): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  const random = getRandomEntropy();
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${random}`;
}
