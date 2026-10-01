import { computeCrc32 } from './apngEncoder';
export interface BundleFile { name: string; bytes: Uint8Array }
/** Bounded ZIP STORE archive: offline, lossless, no ZIP64 or path traversal. */
export function zipBundle(files: BundleFile[]): Blob {
  if (!files.length || files.length > 64 || new Set(files.map(f => f.name)).size !== files.length ||
      files.some(f => !/^[a-zA-Z0-9_.-]+$/.test(f.name) || f.name === '.' || f.name === '..')) throw new Error('Invalid asset bundle paths.');
  const total = files.reduce((n, f) => n + f.bytes.length + 76 + 2 * f.name.length, 22);
  if (total > 128 * 1024 * 1024) throw new Error('The game kit exceeds the 128 MiB download limit.');
  const bytes = new Uint8Array(total), view = new DataView(bytes.buffer);
  let offset = 0; const entries: { file: BundleFile; offset: number; crc: number; name: Uint8Array }[] = [];
  for (const file of files) {
    const name = new TextEncoder().encode(file.name), crc = computeCrc32(file.bytes, 0, file.bytes.length);
    entries.push({ file, offset, crc, name });
    view.setUint32(offset, 0x04034b50, true); view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 10, 0, true); view.setUint16(offset + 12, 33, true);
    view.setUint32(offset + 14, crc, true); view.setUint32(offset + 18, file.bytes.length, true); view.setUint32(offset + 22, file.bytes.length, true);
    view.setUint16(offset + 26, name.length, true); bytes.set(name, offset + 30); bytes.set(file.bytes, offset + 30 + name.length);
    offset += 30 + name.length + file.bytes.length;
  }
  const central = offset;
  for (const { file, offset: start, crc, name } of entries) {
    view.setUint32(offset, 0x02014b50, true); view.setUint16(offset + 4, 20, true); view.setUint16(offset + 6, 20, true);
    view.setUint16(offset + 14, 33, true); view.setUint32(offset + 16, crc, true);
    view.setUint32(offset + 20, file.bytes.length, true); view.setUint32(offset + 24, file.bytes.length, true);
    view.setUint16(offset + 28, name.length, true); view.setUint32(offset + 42, start, true); bytes.set(name, offset + 46);
    offset += 46 + name.length;
  }
  view.setUint32(offset, 0x06054b50, true); view.setUint16(offset + 8, files.length, true); view.setUint16(offset + 10, files.length, true);
  view.setUint32(offset + 12, offset - central, true); view.setUint32(offset + 16, central, true);
  return new Blob([bytes], { type: 'application/zip' });
}
