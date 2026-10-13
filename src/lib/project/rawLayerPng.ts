import { reserveMemory } from '@/lib/safety/memoryBudget';

/** Project layers store raw RGBA samples, including normal-map data, not ICC display colors. */
export async function rawLayerPng(blob: Blob): Promise<Blob> {
  const release = reserveMemory(blob.size * 2, 'Preparing raw project PNG samples');
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (!signature.every((byte, i) => bytes[i] === byte)) return blob;
    const view = new DataView(bytes.buffer), parts: Blob[] = [blob.slice(0, 8)];
    let removed = false, ended = false;
    for (let offset = 8; offset < bytes.length;) {
      if (offset + 12 > bytes.length) throw new Error('Truncated project PNG chunk.');
      const length = view.getUint32(offset), end = offset + length + 12;
      if (end > bytes.length) throw new Error('Truncated project PNG payload.');
      const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
      // WebKit ignores colorSpaceConversion:none for its own embedded ICC profile.
      // Preserve all image bytes/CRCs; only the temporary decoder copy loses that profile.
      if (type === 'iCCP') removed = true;
      else parts.push(blob.slice(offset, end));
      offset = end;
      if (type === 'IEND') { ended = true; break; }
    }
    if (!ended) throw new Error('Incomplete project PNG.');
    return removed ? new Blob(parts, { type: 'image/png' }) : blob;
  } finally { release(); }
}
