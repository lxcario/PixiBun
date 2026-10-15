/**
 * Minimal PNG chunk reading and writing for carts.
 *
 * A cart hides its data in one ancillary, private, safe-to-copy chunk, so any
 * PNG viewer shows the card and ignores the data. Everything here treats the
 * bytes as untrusted: lengths are bounded and CRCs are checked.
 */

export const PNG_SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

/** Chunk count guard: real cards have a handful of chunks. */
const MAX_CHUNKS = 4096;

export interface PngChunk {
  type: string;
  data: Uint8Array;
  /** Byte offset of the chunk's length field. */
  offset: number;
}

let crcTable: Uint32Array | null = null;
function table(): Uint32Array {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  return crcTable;
}

/** PNG CRC-32 over a chunk's type and data. */
export function crc32(...parts: Uint8Array[]): number {
  const t = table();
  let c = 0xffffffff;
  for (const part of parts) for (let i = 0; i < part.length; i++) c = t[(c ^ part[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const ascii = (text: string) => Uint8Array.from(text, ch => ch.charCodeAt(0));

export function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && PNG_SIGNATURE.every((value, index) => bytes[index] === value);
}

/** Every chunk in order. Throws on a damaged file instead of guessing. */
export function readPngChunks(bytes: Uint8Array): PngChunk[] {
  if (!isPng(bytes)) throw new Error('This file is not a PNG image.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: PngChunk[] = [];
  let offset = 8;
  while (offset < bytes.length) {
    if (chunks.length >= MAX_CHUNKS) throw new Error('The PNG has too many chunks.');
    if (offset + 12 > bytes.length) throw new Error('The PNG ends in the middle of a chunk.');
    const length = view.getUint32(offset);
    if (length > bytes.length - offset - 12) throw new Error('A PNG chunk is longer than the file.');
    const typeBytes = bytes.subarray(offset + 4, offset + 8);
    const type = String.fromCharCode(...typeBytes);
    if (!/^[A-Za-z]{4}$/.test(type)) throw new Error('The PNG has a malformed chunk name.');
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (view.getUint32(offset + 8 + length) !== crc32(typeBytes, data)) throw new Error(`The PNG ${type} chunk is damaged.`);
    chunks.push({ type, data, offset });
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  if (chunks[0]?.type !== 'IHDR' || chunks[chunks.length - 1]?.type !== 'IEND') throw new Error('The PNG is missing its header or end.');
  return chunks;
}

/** Encode one chunk: length, type, data, CRC. */
export function encodeChunk(type: string, data: Uint8Array): Uint8Array {
  if (!/^[A-Za-z]{4}$/.test(type)) throw new Error('PNG chunk names are four letters.');
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  const typeBytes = ascii(type);
  view.setUint32(0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(typeBytes, data));
  return out;
}

/**
 * Return the PNG with every `type` chunk removed and one new `type` chunk placed
 * right before IEND.
 */
export function withChunk(bytes: Uint8Array, type: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
  const chunks = readPngChunks(bytes);
  const end = chunks[chunks.length - 1];
  const kept = chunks.filter(chunk => chunk.type !== type && chunk.type !== 'IEND');
  const parts: Uint8Array[] = [PNG_SIGNATURE];
  for (const chunk of kept) parts.push(bytes.subarray(chunk.offset, chunk.offset + 12 + chunk.data.length));
  parts.push(encodeChunk(type, data));
  parts.push(bytes.subarray(end.offset, end.offset + 12));
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
}

/** The data of the first `type` chunk, or null. */
export function findChunk(bytes: Uint8Array, type: string): Uint8Array | null {
  return readPngChunks(bytes).find(chunk => chunk.type === type)?.data ?? null;
}
