/**
 * PixiBun carts.
 *
 * A cart is a PNG that is a picture, a project and a process at once, the way
 * a PICO-8 cart is both a label and a game. The card art is ordinary PNG
 * pixels; the drawing itself (frames, layers, palettes and their cycle tracks),
 * the light, the optional receipt, the license and the remix lineage ride in
 * one private `pxBn` chunk as compressed JSON.
 *
 * Carts are untrusted input. Sizes are capped before and during inflation, the
 * JSON goes through SafeJson, the project through the normal project schema,
 * and nothing in a cart is ever executed.
 */
import { SafeJson } from '@/lib/safety/safeJson';
import { validateProjectFile } from '@/lib/project/schema';
import { RECOVERY_INSPECTION_CEILINGS } from '@/lib/recovery/recoveryLimits';
import type { ProjectFile } from '@/types/project';
import { findChunk, withChunk } from './pngChunks';

/** Ancillary (p), private (x), reserved (B), safe to copy (n). */
export const CART_CHUNK = 'pxBn';
export const CART_FORMAT = 'pixibun-cart';
export const CART_VERSION = 1;
/** Leading byte of the chunk data; lets a later version change the encoding. */
const ENCODING_DEFLATE_JSON = 1;

export const MAX_CART_COMPRESSED_BYTES = 16 * 1024 * 1024;
export const MAX_CART_JSON_BYTES = SafeJson.MAX_PAYLOAD_BYTES;
const MAX_PARENTS = 16;
const MAX_TEXT = 80;

export const CART_LICENSES = ['all-rights-reserved', 'cc-by', 'cc-by-sa', 'cc0'] as const;
export type CartLicense = typeof CART_LICENSES[number];
export const CART_LICENSE_LABELS: Record<CartLicense, string> = {
  'all-rights-reserved': 'All rights reserved',
  'cc-by': 'CC BY 4.0',
  'cc-by-sa': 'CC BY-SA 4.0',
  cc0: 'CC0 (public domain)',
};

export interface CartLight {
  azimuth: number;
  elevation: number;
  brightness: number;
  radius: number;
}

/**
 * The making-of: a record, not proof. Strokes are delta-coded points in
 * `track` (see receipt.ts); `strokes` and `activeMs` print on the card.
 */
export interface CartReceipt {
  strokes: number;
  activeMs: number;
  track?: string;
}

export interface CartAncestor {
  id: string;
  title?: string;
  maker?: string;
}

export interface CartRecord {
  format: typeof CART_FORMAT;
  version: typeof CART_VERSION;
  title: string;
  maker?: string;
  note?: string;
  license: CartLicense;
  createdAt: number;
  light?: CartLight;
  receipt?: CartReceipt;
  /** This cart's own id comes from its project; parents are the carts it remixed. */
  lineage: { id: string; parents: CartAncestor[] };
  project: ProjectFile;
}

export class CartError extends Error {
  constructor(message: string) { super(message); this.name = 'CartError'; }
}

const encoder = new TextEncoder();

async function pipeBytes(bytes: Uint8Array, transform: GenericTransformStream, limit: number): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(transform);
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > limit) throw new CartError('This cart unpacks to more than PixiBun opens.');
      parts.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    if (error instanceof CartError) throw error;
    throw new CartError('This cart’s data is damaged.');
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
}

export const deflate = (bytes: Uint8Array) => pipeBytes(bytes, new CompressionStream('deflate'), MAX_CART_COMPRESSED_BYTES);
export const inflate = (bytes: Uint8Array, limit = MAX_CART_JSON_BYTES) => pipeBytes(bytes, new DecompressionStream('deflate'), limit);

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** A short, stable id for a drawing: the same pixels and frames give the same id. */
export async function cartId(project: ProjectFile): Promise<string> {
  // Hash the normalized form, so a cart's id survives opening and saving again.
  const normalized = validateProjectFile(project);
  const { createdAt: _created, updatedAt: _updated, ...content } = normalized.ok ? normalized.value : project;
  return (await sha256Hex(JSON.stringify(content))).slice(0, 16);
}

/** Printable text only: control characters are dropped, never rendered. */
const printable = (value: string) => Array.from(value).filter(ch => { const code = ch.codePointAt(0)!; return code >= 0x20 && code !== 0x7f; }).join('');
const text = (value: unknown, max = MAX_TEXT) =>
  typeof value === 'string' ? printable(value).trim().slice(0, max) || undefined : undefined;
const finite = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : undefined;

function readLight(value: unknown): CartLight | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const azimuth = finite(raw.azimuth, 0, 360), elevation = finite(raw.elevation, 0, 90);
  if (azimuth === undefined || elevation === undefined) return undefined;
  return {
    azimuth, elevation,
    brightness: finite(raw.brightness, 0.5, 2) ?? 1.15,
    radius: finite(raw.radius, 16, 256) ?? 64,
  };
}

function readReceipt(value: unknown): CartReceipt | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const strokes = finite(raw.strokes, 0, 10_000_000), activeMs = finite(raw.activeMs, 0, 1e12);
  if (strokes === undefined || activeMs === undefined) return undefined;
  const track = typeof raw.track === 'string' && raw.track.length <= 8 * 1024 * 1024 && /^[A-Za-z0-9_-]*$/.test(raw.track) ? raw.track : undefined;
  return { strokes: Math.round(strokes), activeMs: Math.round(activeMs), ...(track ? { track } : {}) };
}

function readAncestor(value: unknown): CartAncestor | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || !/^[0-9a-f]{16}$/.test(raw.id)) return undefined;
  return { id: raw.id, ...(text(raw.title) ? { title: text(raw.title) } : {}), ...(text(raw.maker) ? { maker: text(raw.maker) } : {}) };
}

/** Validate an untrusted parsed cart. Unknown fields are dropped. */
export async function validateCart(value: unknown): Promise<CartRecord> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CartError('This cart is not a PixiBun cart.');
  const raw = value as Record<string, unknown>;
  if (raw.format !== CART_FORMAT) throw new CartError('This cart is not a PixiBun cart.');
  if (raw.version !== CART_VERSION) throw new CartError('This cart was made by a newer PixiBun. Update PixiBun to open it.');
  const project = validateProjectFile(raw.project);
  if (!project.ok) throw new CartError(`This cart’s drawing could not be opened: ${project.error}`);
  const lineage = raw.lineage && typeof raw.lineage === 'object' ? raw.lineage as Record<string, unknown> : {};
  const parents = Array.isArray(lineage.parents) ? lineage.parents.slice(0, MAX_PARENTS).map(readAncestor).filter((a): a is CartAncestor => !!a) : [];
  const license = CART_LICENSES.includes(raw.license as CartLicense) ? raw.license as CartLicense : 'all-rights-reserved';
  const light = readLight(raw.light), receipt = readReceipt(raw.receipt);
  return {
    format: CART_FORMAT,
    version: CART_VERSION,
    title: text(raw.title) ?? project.value.name ?? 'Untitled cart',
    ...(text(raw.maker) ? { maker: text(raw.maker) } : {}),
    ...(text(raw.note, 280) ? { note: text(raw.note, 280) } : {}),
    license,
    createdAt: finite(raw.createdAt, 0, 8.64e15) ?? 0,
    ...(light ? { light } : {}),
    ...(receipt ? { receipt } : {}),
    // The id is always recomputed: a cart cannot claim to be another drawing.
    lineage: { id: await cartId(project.value), parents },
    project: project.value,
  };
}

/** Pack a cart into the chunk payload: an encoding byte, then deflated JSON. */
export async function encodeCartData(cart: CartRecord): Promise<Uint8Array> {
  const packed = await deflate(encoder.encode(JSON.stringify(cart)));
  if (packed.length + 1 > MAX_CART_COMPRESSED_BYTES) throw new CartError('This drawing is too large to fit in a cart.');
  const out = new Uint8Array(packed.length + 1);
  out[0] = ENCODING_DEFLATE_JSON;
  out.set(packed, 1);
  return out;
}

export async function decodeCartData(data: Uint8Array): Promise<CartRecord> {
  if (data.length < 2 || data.length > MAX_CART_COMPRESSED_BYTES) throw new CartError('This cart’s data is damaged or too large.');
  if (data[0] !== ENCODING_DEFLATE_JSON) throw new CartError('This cart was made by a newer PixiBun. Update PixiBun to open it.');
  const json = new TextDecoder('utf-8', { fatal: true }).decode(await inflate(data.subarray(1)));
  let parsed: unknown;
  try {
    parsed = SafeJson.parse(json, { maxTraversedNodes: RECOVERY_INSPECTION_CEILINGS.MAX_METADATA_NODES });
  } catch {
    throw new CartError('This cart’s data is damaged or too complex to open.');
  }
  return validateCart(parsed);
}

/** Put a cart inside a card PNG. */
export async function writeCart(card: Uint8Array, cart: CartRecord): Promise<Uint8Array<ArrayBuffer>> {
  return withChunk(card, CART_CHUNK, await encodeCartData(cart));
}

/** The cart inside a PNG, or null for an ordinary image. Throws for a damaged cart. */
export async function readCart(png: Uint8Array): Promise<CartRecord | null> {
  const data = findChunk(png, CART_CHUNK);
  return data ? decodeCartData(data) : null;
}

/** Cheap check before reading a whole file: does this PNG carry a cart? */
export function hasCartChunk(png: Uint8Array): boolean {
  try { return findChunk(png, CART_CHUNK) !== null; } catch { return false; }
}
