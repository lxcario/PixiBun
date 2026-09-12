/**
 * isobmffWriter.ts
 *
 * 100% Scratch Pure-TypeScript ISOBMFF (ISO Base Media File Format / MPEG-4 Part 12 & Part 14)
 * Container Muxer for PixiBun Atelier.
 *
 * Implements Fast-Start progressive download box formatting:
 *   [ftyp] -> [moov] (metadata before media) -> [mdat] (media payload)
 * with zero external libraries or npm dependencies.
 */

export class IsobmffWriter {
  private buffer: Uint8Array;
  private view: DataView;
  private offset: number = 0;

  constructor(initialCapacity: number = 4096) {
    this.buffer = new Uint8Array(initialCapacity);
    this.view = new DataView(this.buffer.buffer);
  }

  private ensureCapacity(extraBytes: number): void {
    if (this.offset + extraBytes > this.buffer.byteLength) {
      const newCapacity = Math.max(this.buffer.byteLength * 2, this.offset + extraBytes + 1024);
      const newBuf = new Uint8Array(newCapacity);
      newBuf.set(this.buffer);
      this.buffer = newBuf;
      this.view = new DataView(this.buffer.buffer);
    }
  }

  public u8(value: number): void {
    this.ensureCapacity(1);
    this.view.setUint8(this.offset, value & 0xff);
    this.offset += 1;
  }

  public u16(value: number): void {
    this.ensureCapacity(2);
    this.view.setUint16(this.offset, value & 0xffff, false);
    this.offset += 2;
  }

  public u24(value: number): void {
    this.ensureCapacity(3);
    this.view.setUint8(this.offset, (value >> 16) & 0xff);
    this.view.setUint8(this.offset + 1, (value >> 8) & 0xff);
    this.view.setUint8(this.offset + 2, value & 0xff);
    this.offset += 3;
  }

  public u32(value: number): void {
    this.ensureCapacity(4);
    this.view.setUint32(this.offset, value >>> 0, false);
    this.offset += 4;
  }

  public str(str: string): void {
    this.ensureCapacity(str.length);
    for (let i = 0; i < str.length; i++) {
      this.view.setUint8(this.offset++, str.charCodeAt(i) & 0xff);
    }
  }

  public bytes(data: Uint8Array | ArrayBuffer | number[]): void {
    const arr = data instanceof Uint8Array ? data : new Uint8Array(data);
    this.ensureCapacity(arr.byteLength);
    this.buffer.set(arr, this.offset);
    this.offset += arr.byteLength;
  }

  /**
   * Writes an ISO BMFF Box.
   * Allocates an 8-byte header [size: u32][type: 4-char], invokes callback,
   * then backpatches the calculated total box length.
   */
  public box(type: string, fn: () => void): void {
    const startOffset = this.offset;
    this.u32(0); // placeholder for size
    this.str(type);
    fn();
    const boxSize = this.offset - startOffset;
    this.view.setUint32(startOffset, boxSize, false);
  }

  /**
   * Writes a FullBox: standard box header + 1-byte version + 3-byte flags.
   */
  public fullBox(type: string, version: number, flags: number, fn: () => void): void {
    this.box(type, () => {
      this.u8(version);
      this.u24(flags);
      fn();
    });
  }

  public finish(): Uint8Array {
    return this.buffer.slice(0, this.offset);
  }

  public getLength(): number {
    return this.offset;
  }
}

/**
 * Creates an AVCDecoderConfigurationRecord (payload of avcC box)
 * from SPS and PPS NALUs per ISO/IEC 14496-15 section 5.2.4.1.
 */
export function createAvcCRecord(sps: Uint8Array, pps: Uint8Array): Uint8Array {
  const writer = new IsobmffWriter(32 + sps.length + pps.length);
  writer.u8(1); // configurationVersion = 1
  writer.u8(sps[1]); // AVCProfileIndication
  writer.u8(sps[2]); // profile_compatibility
  writer.u8(sps[3]); // AVCLevelIndication
  writer.u8(0xff); // lengthSizeMinusOne: 6 bits reserved (111111) + 2 bits length minus 1 (3 -> 4 bytes)
  writer.u8(0xe1); // numOfSequenceParameterSets: 3 bits reserved (111) + 5 bits count (1)

  // SPS
  writer.u16(sps.length);
  writer.bytes(sps);

  // PPS
  writer.u8(1); // numOfPictureParameterSets = 1
  writer.u16(pps.length);
  writer.bytes(pps);

  return writer.finish();
}

export interface Mp4MuxerSample {
  data: Uint8Array; // AVCC format sample payload (4-byte Big-Endian length prefixed NALUs)
  durationMs: number;
  isKey: boolean;
}

export interface Mp4MuxerTrack {
  width: number;
  height: number;
  timescale?: number; // default: 1000
  avcCData: Uint8Array; // Raw AVCDecoderConfigurationRecord
  samples: Mp4MuxerSample[];
}

/**
 * Muxes video track and H.264 samples into a compliant, playable Fast-Start MP4 Blob.
 */
export function muxToMp4Blob(track: Mp4MuxerTrack): Blob {
  const timescale = track.timescale ?? 1000;
  const totalDuration = track.samples.reduce((acc, s) => acc + s.durationMs, 0);
  const totalSamples = track.samples.length;

  // 1. Build ftyp Box
  const ftypWriter = new IsobmffWriter(64);
  ftypWriter.box('ftyp', () => {
    ftypWriter.str('isom'); // major_brand
    ftypWriter.u32(0x200);  // minor_version
    ftypWriter.str('isom'); // compatible brands
    ftypWriter.str('iso2');
    ftypWriter.str('avc1');
    ftypWriter.str('mp41');
  });
  const ftypBytes = ftypWriter.finish();

  // 2. Build moov Box (Fast Start: placed before mdat)
  const moovWriter = new IsobmffWriter(8192);
  moovWriter.box('moov', () => {
    // mvhd: Movie Header
    moovWriter.fullBox('mvhd', 0, 0, () => {
      moovWriter.u32(0); // creation_time
      moovWriter.u32(0); // modification_time
      moovWriter.u32(timescale);
      moovWriter.u32(totalDuration);
      moovWriter.u32(0x00010000); // rate 1.0
      moovWriter.u16(0x0100);     // volume 1.0
      moovWriter.u16(0);          // reserved
      moovWriter.u32(0);          // reserved[0]
      moovWriter.u32(0);          // reserved[1]

      // Standard 3x3 identity display transformation matrix (36 bytes)
      moovWriter.u32(0x00010000); moovWriter.u32(0); moovWriter.u32(0);
      moovWriter.u32(0); moovWriter.u32(0x00010000); moovWriter.u32(0);
      moovWriter.u32(0); moovWriter.u32(0); moovWriter.u32(0x40000000);

      for (let i = 0; i < 6; i++) moovWriter.u32(0); // pre_defined
      moovWriter.u32(2); // next_track_ID
    });

    // trak: Video Track
    moovWriter.box('trak', () => {
      // tkhd: Track Header (flags 7 = track_enabled | track_in_movie | track_in_preview)
      moovWriter.fullBox('tkhd', 0, 7, () => {
        moovWriter.u32(0); // creation_time
        moovWriter.u32(0); // modification_time
        moovWriter.u32(1); // track_ID = 1
        moovWriter.u32(0); // reserved
        moovWriter.u32(totalDuration);
        moovWriter.u32(0); moovWriter.u32(0); // reserved
        moovWriter.u16(0); // layer
        moovWriter.u16(0); // alternate_group
        moovWriter.u16(0); // volume (0 for video)
        moovWriter.u16(0); // reserved

        // Matrix
        moovWriter.u32(0x00010000); moovWriter.u32(0); moovWriter.u32(0);
        moovWriter.u32(0); moovWriter.u32(0x00010000); moovWriter.u32(0);
        moovWriter.u32(0); moovWriter.u32(0); moovWriter.u32(0x40000000);

        // Dimensions in 16.16 fixed point
        moovWriter.u32((track.width & 0xffff) << 16);
        moovWriter.u32((track.height & 0xffff) << 16);
      });

      // mdia: Media Box
      moovWriter.box('mdia', () => {
        // mdhd: Media Header
        moovWriter.fullBox('mdhd', 0, 0, () => {
          moovWriter.u32(0); // creation_time
          moovWriter.u32(0); // modification_time
          moovWriter.u32(timescale);
          moovWriter.u32(totalDuration);
          moovWriter.u16(0x55c4); // ISO-639-2/T language code 'und' (undefined)
          moovWriter.u16(0);      // pre_defined
        });

        // hdlr: Handler Reference
        moovWriter.fullBox('hdlr', 0, 0, () => {
          moovWriter.u32(0); // pre_defined
          moovWriter.str('vide'); // handler_type
          moovWriter.u32(0); moovWriter.u32(0); moovWriter.u32(0); // reserved
          moovWriter.str('PixiBun Video\0');
        });

        // minf: Media Information
        moovWriter.box('minf', () => {
          // vmhd: Video Media Header
          moovWriter.fullBox('vmhd', 0, 1, () => {
            moovWriter.u16(0); // graphicsmode
            moovWriter.u16(0); moovWriter.u16(0); moovWriter.u16(0); // opcolor
          });

          // dinf: Data Information
          moovWriter.box('dinf', () => {
            moovWriter.fullBox('dref', 0, 0, () => {
              moovWriter.u32(1); // entry_count
              moovWriter.fullBox('url ', 0, 1, () => {}); // self-contained
            });
          });

          // stbl: Sample Table
          moovWriter.box('stbl', () => {
            // stsd: Sample Description
            moovWriter.fullBox('stsd', 0, 0, () => {
              moovWriter.u32(1); // entry_count

              // avc1: Visual Sample Entry
              moovWriter.box('avc1', () => {
                moovWriter.u16(0); moovWriter.u32(0); // 6 bytes reserved
                moovWriter.u16(1); // data_reference_index = 1
                moovWriter.u16(0); moovWriter.u16(0); // pre_defined, reserved
                moovWriter.u32(0); moovWriter.u32(0); moovWriter.u32(0); // pre_defined[3]
                moovWriter.u16(track.width);
                moovWriter.u16(track.height);
                moovWriter.u32(0x00480000); // 72 dpi horizresolution
                moovWriter.u32(0x00480000); // 72 dpi vertresolution
                moovWriter.u32(0);          // reserved
                moovWriter.u16(1);          // frame_count = 1
                moovWriter.u8(10);          // compressorname length
                moovWriter.str('AVC Coding');
                for (let i = 0; i < 21; i++) moovWriter.u8(0); // padding to 32 bytes
                moovWriter.u16(0x0018);     // depth = 24
                moovWriter.u16(0xffff);     // pre_defined = -1

                // avcC: AVC Configuration Box
                moovWriter.box('avcC', () => {
                  moovWriter.bytes(track.avcCData);
                });
              });
            });

            // stts: Time-to-Sample
            moovWriter.fullBox('stts', 0, 0, () => {
              const runs: { count: number; delta: number }[] = [];
              for (const s of track.samples) {
                const last = runs[runs.length - 1];
                if (last && last.delta === s.durationMs) {
                  last.count++;
                } else {
                  runs.push({ count: 1, delta: s.durationMs });
                }
              }
              moovWriter.u32(runs.length);
              for (const r of runs) {
                moovWriter.u32(r.count);
                moovWriter.u32(r.delta);
              }
            });

            // stsc: Sample-to-Chunk (single continuous chunk)
            moovWriter.fullBox('stsc', 0, 0, () => {
              moovWriter.u32(1); // entry_count
              moovWriter.u32(1); // first_chunk = 1
              moovWriter.u32(totalSamples); // samples_per_chunk
              moovWriter.u32(1); // sample_description_index = 1
            });

            // stsz: Sample Sizes
            moovWriter.fullBox('stsz', 0, 0, () => {
              moovWriter.u32(0); // sample_size (0 = variable)
              moovWriter.u32(totalSamples);
              for (const s of track.samples) {
                moovWriter.u32(s.data.length);
              }
            });

            // stco: Chunk Offset Table (single chunk, will backpatch)
            moovWriter.fullBox('stco', 0, 0, () => {
              moovWriter.u32(1); // entry_count = 1
              moovWriter.u32(0); // placeholder chunk_offset
            });

            // stss: Sync Sample (Keyframes)
            const keyframeIndices: number[] = [];
            track.samples.forEach((s, idx) => {
              if (s.isKey) keyframeIndices.push(idx + 1); // 1-indexed in ISOBMFF
            });
            if (keyframeIndices.length > 0) {
              moovWriter.fullBox('stss', 0, 0, () => {
                moovWriter.u32(keyframeIndices.length);
                for (const k of keyframeIndices) moovWriter.u32(k);
              });
            }
          });
        });
      });
    });
  });

  const moovBytes = moovWriter.finish();

  // 3. Compute and patch the stco chunk offset
  // File layout: [ftyp][moov][mdat header (8 bytes)][sample 0 data...]
  const mdatHeaderOffset = ftypBytes.length + moovBytes.length;
  const chunkOffset = mdatHeaderOffset + 8;

  for (let i = 0; i < moovBytes.length - 8; i++) {
    if (
      moovBytes[i] === 0x73 &&
      moovBytes[i + 1] === 0x74 &&
      moovBytes[i + 2] === 0x63 &&
      moovBytes[i + 3] === 0x6f // 'stco'
    ) {
      const view = new DataView(moovBytes.buffer, moovBytes.byteOffset, moovBytes.byteLength);
      // Box header: 4 bytes size, 4 bytes FourCC, 4 bytes ver/flags, 4 bytes entry count, 4 bytes offset
      view.setUint32(i + 12, chunkOffset, false);
      break;
    }
  }

  // 4. Build mdat Box Header
  const mdatPayloadLength = track.samples.reduce((acc, s) => acc + s.data.length, 0);
  const mdatHeader = new Uint8Array(8);
  const mdatView = new DataView(mdatHeader.buffer);
  mdatView.setUint32(0, 8 + mdatPayloadLength, false);
  mdatHeader[4] = 0x6d; // 'm'
  mdatHeader[5] = 0x64; // 'd'
  mdatHeader[6] = 0x61; // 'a'
  mdatHeader[7] = 0x74; // 't'

  // 5. Package into compliant Blob
  const parts: BlobPart[] = [
    ftypBytes as unknown as BlobPart,
    moovBytes as unknown as BlobPart,
    mdatHeader as unknown as BlobPart,
    ...track.samples.map((s) => s.data as unknown as BlobPart),
  ];
  return new Blob(parts, {
    type: 'video/mp4',
  });
}
