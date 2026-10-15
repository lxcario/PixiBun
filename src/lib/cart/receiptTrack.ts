/**
 * The receipt track: how a drawing came to be, as the artist saw it.
 *
 * After each edit the recorder compares the active frame with its previous
 * snapshot and keeps only the pixels that changed. A step is: time since the
 * last step, an optional reset to a new canvas size, then the changed pixels
 * as gaps between positions and references into a running color table, all
 * as varints. Replaying the steps in order rebuilds every stage exactly.
 *
 * A receipt is a record, not proof: anyone determined can script strokes.
 */

export const TRACK_VERSION = 1;
/** Raw bytes a track may grow to before the recorder keeps counting but stops adding steps. */
export const MAX_TRACK_BYTES = 6 * 1024 * 1024;
const MAX_COLORS = 1 << 16;
const MAX_SIDE = 4096;

export interface TrackStep {
  /** Milliseconds since the previous step (capped). */
  dt: number;
  /** Present when the canvas starts over at a new size (transparent). */
  reset?: { width: number; height: number };
  /** Changed pixel indices and their new RGBA colors, packed as 0xRRGGBBAA. */
  indices: Uint32Array;
  colors: Uint32Array;
}

class ByteWriter {
  private buffer = new Uint8Array(1024);
  length = 0;
  private ensure(extra: number) {
    if (this.length + extra <= this.buffer.length) return;
    let size = this.buffer.length * 2;
    while (size < this.length + extra) size *= 2;
    const next = new Uint8Array(size); next.set(this.buffer.subarray(0, this.length)); this.buffer = next;
  }
  byte(value: number) { this.ensure(1); this.buffer[this.length++] = value; }
  varint(value: number) {
    let v = Math.max(0, Math.floor(value));
    this.ensure(8);
    while (v >= 0x80) { this.buffer[this.length++] = (v % 0x80) | 0x80; v = Math.floor(v / 0x80); }
    this.buffer[this.length++] = v;
  }
  u32(value: number) { this.ensure(4); new DataView(this.buffer.buffer).setUint32(this.length, value >>> 0); this.length += 4; }
  bytes(): Uint8Array { return this.buffer.slice(0, this.length); }
}

class ByteReader {
  private at = 0;
  constructor(private readonly data: Uint8Array) {}
  get done() { return this.at >= this.data.length; }
  byte() { if (this.at >= this.data.length) throw new Error('The receipt track ends early.'); return this.data[this.at++]; }
  varint() {
    let value = 0, scale = 1;
    for (let i = 0; i < 8; i++) {
      const b = this.byte();
      value += (b & 0x7f) * scale;
      if (!(b & 0x80)) return value;
      scale *= 0x80;
    }
    throw new Error('The receipt track is damaged.');
  }
  u32() { const v = new DataView(this.data.buffer, this.data.byteOffset + this.at, 4).getUint32(0); this.at += 4; return v; }
}

const pack = (data: Uint8ClampedArray, i: number) => ((data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3]) >>> 0;

/** Builds a track from successive snapshots of what the artist sees. */
export class ReceiptWriter {
  private readonly out = new ByteWriter();
  private readonly palette = new Map<number, number>();
  private previous: { width: number; height: number; data: Uint8ClampedArray } | null = null;
  private lastTime: number | null = null;
  steps = 0;

  constructor() { this.out.byte(TRACK_VERSION); }

  /** Continue an existing track: rebuild its color table and last picture. */
  static resume(bytes: Uint8Array): ReceiptWriter {
    const { steps, palette } = decodeTrackWithPalette(bytes);
    const writer = new ReceiptWriter();
    writer.out.length = 0;
    for (let i = 0; i < bytes.length; i++) writer.out.byte(bytes[i]);
    palette.forEach((color, index) => writer.palette.set(color, index));
    let state: { width: number; height: number; data: Uint8ClampedArray } | null = null;
    for (const step of steps) state = applyStep(step, state);
    writer.previous = state;
    writer.steps = steps.length;
    return writer;
  }

  get byteLength() { return this.out.length; }
  get full() { return this.out.length >= MAX_TRACK_BYTES; }

  /** Record a snapshot. Returns false when nothing changed (or the track is full). */
  add(snapshot: { width: number; height: number; data: Uint8ClampedArray }, time: number): boolean {
    if (this.full) return false;
    const { width, height, data } = snapshot;
    const reset = !this.previous || this.previous.width !== width || this.previous.height !== height;
    const before = reset ? null : this.previous!.data;
    const changed: number[] = [];
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const now = pack(data, i);
      const was = before ? pack(before, i) : 0;
      // Fully transparent pixels compare equal whatever their color channels say.
      if (now === was || ((now & 0xff) === 0 && (was & 0xff) === 0)) continue;
      changed.push(p);
    }
    if (!reset && changed.length === 0) return false;
    const dt = this.lastTime === null ? 0 : Math.min(1e9, Math.max(0, time - this.lastTime));
    this.out.varint(dt);
    this.out.varint(reset ? 1 : 0);
    if (reset) { this.out.varint(width); this.out.varint(height); }
    this.out.varint(changed.length);
    let previousIndex = -1;
    for (const p of changed) {
      this.out.varint(p - previousIndex - 1);
      previousIndex = p;
      const color = pack(data, p * 4);
      const known = this.palette.get(color);
      if (known !== undefined) { this.out.varint(known); continue; }
      if (this.palette.size < MAX_COLORS) {
        this.out.varint(this.palette.size);
        this.palette.set(color, this.palette.size);
      } else {
        this.out.varint(MAX_COLORS);
      }
      this.out.u32(color);
    }
    this.previous = { width, height, data: new Uint8ClampedArray(data) };
    this.lastTime = time;
    this.steps++;
    return true;
  }

  bytes(): Uint8Array { return this.out.bytes(); }
}

/** Read every step of a track. Throws on damage instead of guessing. */
export function decodeTrack(bytes: Uint8Array): TrackStep[] {
  return decodeTrackWithPalette(bytes).steps;
}

function decodeTrackWithPalette(bytes: Uint8Array): { steps: TrackStep[]; palette: number[] } {
  const reader = new ByteReader(bytes);
  if (reader.byte() !== TRACK_VERSION) throw new Error('This receipt was made by a newer PixiBun.');
  const palette: number[] = [];
  const steps: TrackStep[] = [];
  let size = 0;
  while (!reader.done) {
    const dt = reader.varint();
    const flags = reader.varint();
    let reset: TrackStep['reset'];
    if (flags & 1) {
      const width = reader.varint(), height = reader.varint();
      if (width < 1 || height < 1 || width > MAX_SIDE || height > MAX_SIDE) throw new Error('The receipt track has an impossible canvas.');
      reset = { width, height };
      size = width * height;
    }
    if (size === 0) throw new Error('The receipt track has no canvas.');
    const count = reader.varint();
    if (count > size) throw new Error('The receipt track is damaged.');
    const indices = new Uint32Array(count), colors = new Uint32Array(count);
    let index = -1;
    for (let i = 0; i < count; i++) {
      index += reader.varint() + 1;
      if (index >= size) throw new Error('The receipt track is damaged.');
      indices[i] = index;
      const ref = reader.varint();
      if (ref < palette.length) colors[i] = palette[ref];
      else if (ref === palette.length || ref === MAX_COLORS) {
        const color = reader.u32();
        if (ref === palette.length && palette.length < MAX_COLORS) palette.push(color);
        colors[i] = color;
      } else throw new Error('The receipt track is damaged.');
    }
    steps.push({ dt, ...(reset ? { reset } : {}), indices, colors });
  }
  return { steps, palette };
}

/** Apply one step to an RGBA buffer (replaced on reset). Returns the buffer to use from now on. */
export function applyStep(step: TrackStep, current: { width: number; height: number; data: Uint8ClampedArray } | null) {
  const canvas = step.reset
    ? { width: step.reset.width, height: step.reset.height, data: new Uint8ClampedArray(step.reset.width * step.reset.height * 4) }
    : current;
  if (!canvas) throw new Error('The receipt track starts without a canvas.');
  for (let i = 0; i < step.indices.length; i++) {
    const at = step.indices[i] * 4, color = step.colors[i];
    canvas.data[at] = color >>> 24; canvas.data[at + 1] = (color >>> 16) & 0xff; canvas.data[at + 2] = (color >>> 8) & 0xff; canvas.data[at + 3] = color & 0xff;
  }
  return canvas;
}

/** Gaps longer than this count as a break, not drawing time. */
export const IDLE_MS = 90_000;

export function activeTime(steps: Pick<TrackStep, 'dt'>[]): number {
  return steps.reduce((total, step) => total + Math.min(step.dt, IDLE_MS), 0);
}
