/**
 * paletteCycling.ts
 * Mark Ferrari 8-Bit Dynamic Palette Cycling Engine
 * 
 * Deluxe Paint IFF ILBM CRNG & CCRT chunk parsing and serialization,
 * 32-bit LUT renderer, ping-pong fencepost oscillation,
 * sub-step BlendShift linear color interpolation, and harmonic rational retuning
 * for seamless loop unrolling.
 */

export interface PaletteCycleTrack {
  id: string;
  name?: string;
  low: number; // Lower palette index (0..255)
  high: number; // Upper palette index (0..255, high >= low)
  rate: number; // Frequency in steps per second (Hz)
  direction: 'forward' | 'reverse' | 'ping-pong';
  blendShift: boolean; // Sub-step linear color interpolation
  enabled: boolean;
}

/**
 * Standard Deluxe Paint CRNG (Color Register Range) flags.
 */
export const CRNG_FLAGS = {
  RNG_ACTIVE: 1, // Bit 0: Active cycling
  RNG_REVERSE: 2, // Bit 1: Reverse cycle direction
} as const;

/**
 * Parses an 8-byte big-endian IFF ILBM CRNG chunk payload.
 */
export function parseCRNG(chunkBytes: Uint8Array, id: string = 'crng-0'): PaletteCycleTrack {
  if (chunkBytes.length < 8) {
    throw new Error(`CRNG chunk must be at least 8 bytes, got ${chunkBytes.length}`);
  }

  const view = new DataView(chunkBytes.buffer, chunkBytes.byteOffset, chunkBytes.byteLength);
  // pad1: int16 (reserved 0)
  const rateRaw = view.getInt16(2, false); // big-endian
  const flags = view.getUint16(4, false);
  const low = view.getUint8(6);
  const high = view.getUint8(7);

  // Electronic Arts / Commodore Amiga IFF ILBM CRNG specification:
  // - rateRaw: Q2.14 fixed-point frequency where 16384 = 60 Hz (steps/sec)
  // - flags: bit 0 = RNG_ACTIVE (1), bit 1 = RNG_REVERSE (2)
  // Track activation is strictly controlled by RNG_ACTIVE flag bit and non-zero positive rate
  const isActive = (flags & CRNG_FLAGS.RNG_ACTIVE) !== 0 && rateRaw > 0;
  const isReverse = (flags & CRNG_FLAGS.RNG_REVERSE) !== 0;

  // Rate scaling: 16384 = 60 steps/sec in standard DPaint
  const rateHz = rateRaw > 0 ? (rateRaw * 60) / 16384 : 0;

  return {
    id,
    name: `CRNG [${low}..${high}]`,
    low: Math.min(low, high),
    high: Math.max(low, high),
    rate: Math.round(rateHz * 100) / 100,
    direction: isReverse ? 'reverse' : 'forward',
    blendShift: false,
    enabled: isActive,
  };
}

/**
 * Serializes a cycle track into an 8-byte big-endian IFF ILBM CRNG chunk payload.
 */
export function serializeCRNG(track: PaletteCycleTrack): Uint8Array {
  const bytes = new Uint8Array(8);
  const view = new DataView(bytes.buffer);

  // pad1 = 0
  view.setInt16(0, 0, false);

  // rate: 16384 = 60 Hz
  const rateVal = Math.max(0, Math.min(32767, Math.round((track.rate * 16384) / 60)));
  view.setInt16(2, rateVal, false);

  let flags = 0;
  if (track.enabled) flags |= CRNG_FLAGS.RNG_ACTIVE;
  if (track.direction === 'reverse') flags |= CRNG_FLAGS.RNG_REVERSE;
  view.setUint16(4, flags, false);

  view.setUint8(6, Math.max(0, Math.min(255, track.low)));
  view.setUint8(7, Math.max(0, Math.min(255, track.high)));

  return bytes;
}

/**
 * Parses a 14-byte big-endian Commodore Graphicraft CCRT (Color Cycling Range and Timing) chunk.
 */
export function parseCCRT(chunkBytes: Uint8Array, id: string = 'ccrt-0'): PaletteCycleTrack {
  if (chunkBytes.length < 14) {
    throw new Error(`CCRT chunk must be at least 14 bytes, got ${chunkBytes.length}`);
  }

  const view = new DataView(chunkBytes.buffer, chunkBytes.byteOffset, chunkBytes.byteLength);
  const directionRaw = view.getInt16(0, false);
  const start = view.getUint8(2);
  const end = view.getUint8(3);
  const seconds = view.getInt32(4, false);
  const microseconds = view.getInt32(8, false);

  const deltaSec = seconds + microseconds * 1e-6;
  const rateHz = deltaSec > 0 ? 1 / deltaSec : 0;

  let direction: 'forward' | 'reverse' | 'ping-pong' = 'forward';
  if (directionRaw === -1) direction = 'reverse';
  // Direction 2 is a PixiBun extension, not a standard CCRT direction.
  else if (directionRaw === 2) direction = 'ping-pong';

  return {
    id,
    name: `CCRT [${start}..${end}]`,
    low: Math.min(start, end),
    high: Math.max(start, end),
    rate: Math.round(rateHz * 100) / 100,
    direction,
    blendShift: false,
    enabled: directionRaw !== 0 && rateHz > 0,
  };
}

/**
 * Serializes a cycle track into a 14-byte big-endian Commodore Graphicraft CCRT chunk.
 */
export function serializeCCRT(track: PaletteCycleTrack): Uint8Array {
  const bytes = new Uint8Array(14);
  const view = new DataView(bytes.buffer);

  let dirVal = 0;
  if (track.enabled) {
    if (track.direction === 'reverse') dirVal = -1;
    // Direction 2 round-trips PixiBun ping-pong tracks but may not be
    // understood by other IFF CCRT readers (standard values: -1, 0, 1).
    else if (track.direction === 'ping-pong') dirVal = 2;
    else dirVal = 1;
  }
  view.setInt16(0, dirVal, false);

  view.setUint8(2, Math.max(0, Math.min(255, track.low)));
  view.setUint8(3, Math.max(0, Math.min(255, track.high)));

  if (track.rate > 0) {
    const deltaSec = 1 / track.rate;
    const sec = Math.floor(deltaSec);
    const microsec = Math.round((deltaSec - sec) * 1e6);
    view.setInt32(4, sec, false);
    view.setInt32(8, microsec, false);
  } else {
    view.setInt32(4, 0, false);
    view.setInt32(8, 0, false);
  }

  return bytes;
}

/**
 * Wraps a payload into a formal 4-byte ID + 4-byte big-endian size IFF chunk container,
 * with optional even-boundary padding byte.
 */
export function wrapIFFChunk(chunkId: string, payload: Uint8Array): Uint8Array {
  if (chunkId.length !== 4) {
    throw new Error(`IFF chunk ID must be exactly 4 ASCII characters, got '${chunkId}'`);
  }

  const pad = payload.length % 2 !== 0 ? 1 : 0;
  const totalLength = 8 + payload.length + pad;
  const result = new Uint8Array(totalLength);
  const view = new DataView(result.buffer);

  // 4-byte chunk ID
  for (let i = 0; i < 4; i++) {
    result[i] = chunkId.charCodeAt(i);
  }

  // 4-byte big-endian payload length (pad not included)
  view.setUint32(4, payload.length, false);

  // Payload
  result.set(payload, 8);

  // Pad byte if odd
  if (pad === 1) {
    result[totalLength - 1] = 0;
  }

  return result;
}

/**
 * Computes ping-pong offset with period M = 2(S - 1) and zero-bound fencepost safety.
 * Returns an offset in [0, S - 1].
 */
export function calculatePingPongOffset(phase: number, rangeSize: number): number {
  if (rangeSize <= 1) return 0;

  const M = 2 * (rangeSize - 1);
  let p = phase % M;
  if (p < 0) p += M;

  const intP = Math.floor(p);
  if (intP < rangeSize) {
    return intP;
  }
  return M - intP;
}

/**
 * Helper to parse hex color string into [r, g, b] [0, 255]^3.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) || 0;
    const g = parseInt(clean[1] + clean[1], 16) || 0;
    const b = parseInt(clean[2] + clean[2], 16) || 0;
    return [r, g, b];
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return [r, g, b];
}

/**
 * Packs RGB into little-endian 32-bit integer 0xFFBBGGRR for Canvas ImageData.
 */
export function packRgb32(r: number, g: number, b: number, a: number = 255): number {
  return ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
}

/**
 * Unpacks little-endian 32-bit integer 0xAABBGGRR to [r, g, b].
 */
export function unpackRgb32(packed: number): [number, number, number] {
  const r = packed & 0xff;
  const g = (packed >> 8) & 0xff;
  const b = (packed >> 16) & 0xff;
  return [r, g, b];
}

/**
 * Sub-step BlendShift linear color interpolation.
 */
export function blendColorsRgb(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] {
  const clampedT = Math.max(0, Math.min(1, t));
  const r = Math.round(c1[0] * (1 - clampedT) + c2[0] * clampedT);
  const g = Math.round(c1[1] * (1 - clampedT) + c2[1] * clampedT);
  const b = Math.round(c1[2] * (1 - clampedT) + c2[2] * clampedT);
  return [r, g, b];
}

/**
 * 32-bit LUT renderer. Palette parsing and blending allocate small RGB tuples.
 * Updates an output Uint32Array (size >= palette.length) with the dynamic colors for all palette indices.
 * The per-pixel remapping pass can use the resulting LUT without allocating per pixel.
 */
export function updateLivePaletteLUT32(
  basePaletteHex: string[],
  tracks: PaletteCycleTrack[],
  elapsedSec: number,
  outLUT32: Uint32Array
): void {
  const numColors = basePaletteHex.length;

  // 1. Initialize LUT with base colors
  for (let i = 0; i < numColors; i++) {
    const [r, g, b] = hexToRgb(basePaletteHex[i] || '#000000');
    outLUT32[i] = packRgb32(r, g, b, 255);
  }

  // 2. Apply active cycle tracks
  for (const track of tracks) {
    if (!track.enabled || track.rate <= 0) continue;
    const low = Math.max(0, Math.min(numColors - 1, track.low));
    const high = Math.max(0, Math.min(numColors - 1, track.high));
    if (high <= low) continue;

    const S = high - low + 1;
    const phaseFloat = elapsedSec * track.rate;

    if (track.direction === 'ping-pong') {
      const M = 2 * (S - 1);
      if (M <= 0) continue;

      for (let k = 0; k < S; k++) {
        const destRegister = low + k;

        if (track.blendShift) {
          // Continuous ping-pong position for register k
          let p = (phaseFloat + k) % M;
          if (p < 0) p += M;

          const intP = Math.floor(p);
          const frac = p - intP;

          const getOffset = (idx: number) => {
            const modIdx = idx % M;
            return modIdx < S ? modIdx : M - modIdx;
          };

          const off1 = getOffset(intP);
          const off2 = getOffset(intP + 1);

          const c1 = hexToRgb(basePaletteHex[low + off1] || '#000000');
          const c2 = hexToRgb(basePaletteHex[low + off2] || '#000000');
          const blended = blendColorsRgb(c1, c2, frac);

          outLUT32[destRegister] = packRgb32(blended[0], blended[1], blended[2], 255);
        } else {
          let p = (Math.floor(phaseFloat) + k) % M;
          if (p < 0) p += M;
          const offset = p < S ? p : M - p;
          const [r, g, b] = hexToRgb(basePaletteHex[low + offset] || '#000000');
          outLUT32[destRegister] = packRgb32(r, g, b, 255);
        }
      }
    } else {
      // Forward or Reverse cycling
      const dirSign = track.direction === 'reverse' ? 1 : -1;

      for (let k = 0; k < S; k++) {
        const destRegister = low + k;

        if (track.blendShift) {
          const shiftContinuous = phaseFloat * dirSign;
          let p = (k + shiftContinuous) % S;
          if (p < 0) p += S;

          const intP = Math.floor(p);
          const frac = p - intP;
          const srcIdx1 = low + intP;
          const srcIdx2 = low + ((intP + 1) % S);

          const c1 = hexToRgb(basePaletteHex[srcIdx1] || '#000000');
          const c2 = hexToRgb(basePaletteHex[srcIdx2] || '#000000');
          const blended = blendColorsRgb(c1, c2, frac);

          outLUT32[destRegister] = packRgb32(blended[0], blended[1], blended[2], 255);
        } else {
          const shiftInt = Math.floor(phaseFloat) * dirSign;
          let srcK = (k + shiftInt) % S;
          if (srcK < 0) srcK += S;
          const [r, g, b] = hexToRgb(basePaletteHex[low + srcK] || '#000000');
          outLUT32[destRegister] = packRgb32(r, g, b, 255);
        }
      }
    }
  }
}

/**
 * Harmonic rational retuning for seamless loop unrolling without coprime LCM period explosion.
 * Given a target loop duration T (e.g. 2.0s, 3.0s, 4.0s), retunes each track's rate to
 * the nearest harmonic integer cycle count k = round(T * rate / M) over T, ensuring seamless looping without pop discontinuities.
 */
export function retuneTracksForSeamlessLoop(
  tracks: PaletteCycleTrack[],
  targetDurationSec: number
): PaletteCycleTrack[] {
  const T = Math.max(0.1, targetDurationSec);

  return tracks.map((track) => {
    if (!track.enabled || track.rate <= 0 || track.high <= track.low) {
      return { ...track };
    }

    const S = track.high - track.low + 1;
    const M = track.direction === 'ping-pong' ? Math.max(1, 2 * (S - 1)) : Math.max(1, S);

    // Number of full periods that fit into duration T
    // Period in seconds is M / rate, so numCycles = T / (M / rate) = (T * rate) / M
    const nominalCycles = (T * track.rate) / M;
    const harmonicCycles = Math.max(1, Math.round(nominalCycles));

    // Retuned rate ensures exact integer cycles: retunedRate = (harmonicCycles * M) / T
    const retunedRate = (harmonicCycles * M) / T;

    return {
      ...track,
      rate: Math.round(retunedRate * 1e6) / 1e6,
    };
  });
}
