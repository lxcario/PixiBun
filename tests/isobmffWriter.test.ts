import { describe, it, expect } from 'vitest';
import {
  IsobmffWriter,
  createAvcCRecord,
  muxToMp4Blob,
  Mp4MuxerTrack,
} from '@/lib/export/isobmffWriter';

describe('Pure-TypeScript ISOBMFF Binary Writer', () => {
  it('writes basic integer types and strings in Big-Endian order', () => {
    const writer = new IsobmffWriter(16);
    writer.u8(0x12);
    writer.u16(0x3456);
    writer.u24(0x789abc);
    writer.u32(0xdeadbeef);
    writer.str('TEST');

    const bytes = writer.finish();
    expect(bytes.length).toBe(1 + 2 + 3 + 4 + 4);

    expect(bytes[0]).toBe(0x12);
    expect(bytes[1]).toBe(0x34);
    expect(bytes[2]).toBe(0x56);
    expect(bytes[3]).toBe(0x78);
    expect(bytes[4]).toBe(0x9a);
    expect(bytes[5]).toBe(0xbc);
    expect(bytes[6]).toBe(0xde);
    expect(bytes[7]).toBe(0xad);
    expect(bytes[8]).toBe(0xbe);
    expect(bytes[9]).toBe(0xef);
    expect(String.fromCharCode(...bytes.slice(10, 14))).toBe('TEST');
  });

  it('computes and backpatches box size correctly', () => {
    const writer = new IsobmffWriter(32);
    writer.box('test', () => {
      writer.u32(0x11223344);
    });

    const bytes = writer.finish();
    expect(bytes.length).toBe(12); // 4 bytes size + 4 bytes 'test' + 4 bytes payload

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(0, false)).toBe(12);
    expect(String.fromCharCode(...bytes.slice(4, 8))).toBe('test');
    expect(view.getUint32(8, false)).toBe(0x11223344);
  });

  it('builds compliant AVCDecoderConfigurationRecord (avcC)', () => {
    const sps = new Uint8Array([0x67, 0x42, 0x00, 0x1f, 0xab, 0xcd]);
    const pps = new Uint8Array([0x68, 0xce, 0x3c, 0x80]);

    const avcC = createAvcCRecord(sps, pps);
    expect(avcC[0]).toBe(1); // configurationVersion = 1
    expect(avcC[1]).toBe(sps[1]); // profile = 0x42
    expect(avcC[2]).toBe(sps[2]); // compatibility = 0x00
    expect(avcC[3]).toBe(sps[3]); // level = 0x1f
    expect(avcC[4]).toBe(0xff); // lengthSizeMinusOne = 3 (0xff)
    expect(avcC[5]).toBe(0xe1); // numOfSequenceParameterSets = 1 (0xe1)
  });

  it('muxes track and samples into valid Fast-Start MP4 blob with backpatched stco', async () => {
    const sps = new Uint8Array([0x67, 0x42, 0x00, 0x1f]);
    const pps = new Uint8Array([0x68, 0xce]);
    const avcCData = createAvcCRecord(sps, pps);

    // Mock 3 AVCC samples with 4-byte NALU length prefixes
    const sample1 = new Uint8Array([0x00, 0x00, 0x00, 0x02, 0x65, 0x88]); // Keyframe
    const sample2 = new Uint8Array([0x00, 0x00, 0x00, 0x02, 0x41, 0x88]); // Inter-frame
    const sample3 = new Uint8Array([0x00, 0x00, 0x00, 0x02, 0x41, 0x89]); // Inter-frame

    const track: Mp4MuxerTrack = {
      width: 64,
      height: 64,
      timescale: 1000,
      avcCData,
      samples: [
        { data: sample1, durationMs: 100, isKey: true },
        { data: sample2, durationMs: 100, isKey: false },
        { data: sample3, durationMs: 100, isKey: false },
      ],
    };

    const blob = muxToMp4Blob(track);
    expect(blob.type).toBe('video/mp4');

    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    // 1. Check ftyp box at offset 0
    const ftypSize = view.getUint32(0, false);
    const ftypType = String.fromCharCode(...bytes.slice(4, 8));
    expect(ftypType).toBe('ftyp');

    // 2. Check moov box at offset ftypSize
    const moovSize = view.getUint32(ftypSize, false);
    const moovType = String.fromCharCode(...bytes.slice(ftypSize + 4, ftypSize + 8));
    expect(moovType).toBe('moov');

    // 3. Check mdat box immediately after moov
    const mdatOffset = ftypSize + moovSize;
    const mdatSize = view.getUint32(mdatOffset, false);
    const mdatType = String.fromCharCode(...bytes.slice(mdatOffset + 4, mdatOffset + 8));
    expect(mdatType).toBe('mdat');

    const expectedPayloadSize = sample1.length + sample2.length + sample3.length;
    expect(mdatSize).toBe(8 + expectedPayloadSize);

    // 4. Verify stco chunk offset inside moov matches mdatOffset + 8
    let foundStco = false;
    for (let i = ftypSize; i < mdatOffset - 8; i++) {
      if (
        bytes[i] === 0x73 &&
        bytes[i + 1] === 0x74 &&
        bytes[i + 2] === 0x63 &&
        bytes[i + 3] === 0x6f
      ) {
        foundStco = true;
        const chunkOffset = view.getUint32(i + 12, false);
        expect(chunkOffset).toBe(mdatOffset + 8);
        break;
      }
    }
    expect(foundStco).toBe(true);
  });
});
