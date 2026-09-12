import { describe, it, expect } from 'vitest';
import { createAvcCRecord, muxToMp4Blob, Mp4MuxerTrack } from '@/lib/export/isobmffWriter';

describe('ISOBMFF Container Muxer Hardening Suite', () => {
  it('createAvcCRecord throws on truncated or invalid SPS/PPS buffers', () => {
    // SPS length must be >= 4 to access AVC profile indication and compatibility bytes
    const tooShortSps = new Uint8Array([1, 2]);
    const validPps = new Uint8Array([0x68, 0xeb, 0xe3, 0xcb, 0x22, 0xc0]);

    expect(() => {
      createAvcCRecord(tooShortSps, validPps);
    }).toThrow(RangeError);

    expect(() => {
      createAvcCRecord(new Uint8Array(0), validPps);
    }).toThrow(RangeError);

    expect(() => {
      createAvcCRecord(new Uint8Array([0x67, 0x42, 0x00, 0x1f]), new Uint8Array(0));
    }).toThrow(RangeError);
  });

  it('muxToMp4Blob throws on zero or negative track dimensions', () => {
    const invalidTrackZero: Mp4MuxerTrack = {
      width: 0,
      height: 32,
      avcCData: new Uint8Array([1, 2, 3, 4]),
      samples: [{ data: new Uint8Array([0, 0, 0, 1]), durationMs: 100, isKey: true }],
    };

    expect(() => {
      muxToMp4Blob(invalidTrackZero);
    }).toThrow(RangeError);

    const invalidTrackNegative: Mp4MuxerTrack = {
      width: 32,
      height: -10,
      avcCData: new Uint8Array([1, 2, 3, 4]),
      samples: [{ data: new Uint8Array([0, 0, 0, 1]), durationMs: 100, isKey: true }],
    };

    expect(() => {
      muxToMp4Blob(invalidTrackNegative);
    }).toThrow(RangeError);
  });

  it('muxToMp4Blob throws on empty sample list', () => {
    const trackNoSamples: Mp4MuxerTrack = {
      width: 32,
      height: 32,
      avcCData: new Uint8Array([1, 2, 3, 4]),
      samples: [],
    };

    expect(() => {
      muxToMp4Blob(trackNoSamples);
    }).toThrow(/sample list is empty/);
  });

  it('muxToMp4Blob throws when avcCData is missing', () => {
    const trackNoAvcC: Mp4MuxerTrack = {
      width: 32,
      height: 32,
      avcCData: new Uint8Array(0),
      samples: [{ data: new Uint8Array([0, 0, 0, 1]), durationMs: 100, isKey: true }],
    };

    expect(() => {
      muxToMp4Blob(trackNoAvcC);
    }).toThrow(/Missing AVC configuration record/);
  });
});
