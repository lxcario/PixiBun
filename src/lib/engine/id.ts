// Collision-proof identity generation for layers, frames, clips, and messages.
// Date.now() IDs collided when two entities were created within the same
// millisecond (e.g. addFrame cloning N layers), corrupting buffer lookups.

let counter = 0;

export function createId(prefix: string): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  const random = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${random}`;
}
