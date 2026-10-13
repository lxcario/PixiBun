import { describe, expect, it } from 'vitest';
import { rawLayerPng } from '@/lib/project/rawLayerPng';

const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
function chunk(name: string, data: number[]) {
  const bytes = new Uint8Array(data.length + 12);
  new DataView(bytes.buffer).setUint32(0, data.length);
  bytes.set(Array.from(name, letter => letter.charCodeAt(0)), 4); bytes.set(data, 8);
  // This parser preserves payloads and CRC bytes; native decode validates the image.
  bytes.set([1, 2, 3, 4], bytes.length - 4); return bytes;
}
const header = chunk('IHDR', new Array<number>(13).fill(0)), image = chunk('IDAT', [9, 8, 7, 6]), end = chunk('IEND', []);
describe('raw project PNG profile handling', () => {
  it('removes only the ICC chunk from a temporary copy, preserving encoded pixels, other chunks and the original bytes', async () => {
    const ancillary = chunk('sBIT', [8, 8, 8, 8]), profile = chunk('iCCP', [0, 1, 2]);
    const original = new Blob([signature, header, ancillary, profile, image, end], { type: 'image/png' });
    const before = new Uint8Array(await original.arrayBuffer()), result = await rawLayerPng(original);
    expect(new Uint8Array(await result.arrayBuffer())).toEqual(new Uint8Array(await new Blob([signature, header, ancillary, image, end]).arrayBuffer()));
    expect(new Uint8Array(await original.arrayBuffer())).toEqual(before); expect(result).not.toBe(original);
  });
  it('retains the original Blob when it has no ICC profile', async () => {
    const original = new Blob([signature, header, image, end], { type: 'image/png' });
    expect(await rawLayerPng(original)).toBe(original);
  });
  it('refuses truncated PNGs without replacing their bytes', async () => {
    const original = new Blob([signature, header, image.subarray(0, 8)]), before = new Uint8Array(await original.arrayBuffer());
    await expect(rawLayerPng(original)).rejects.toThrow('Truncated');
    expect(new Uint8Array(await original.arrayBuffer())).toEqual(before);
  });
});
