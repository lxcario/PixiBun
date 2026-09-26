/** Return bytes backed by an ArrayBuffer accepted by BlobPart typings and browsers. */
export function toBlobPart(bytes: Uint8Array): BlobPart {
  if (bytes.buffer instanceof ArrayBuffer) {
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  // SharedArrayBuffer is not a portable BlobPart; copy only for that case.
  return Uint8Array.from(bytes);
}
