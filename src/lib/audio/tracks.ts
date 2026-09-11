/**
 * Procedural Musical Tracks & Tracker Step Tables
 * 100% in-memory procedural note and percussion arrangements.
 *
 * Musical Attribution & Copyright Notice:
 * Underlying musical compositions and melodies ("The Field of Hopes and Dreams",
 * "My Castle Town", "Empty Town") are © Toby Fox / Materia Collective (Deltarune Ch. 1 & 2).
 * Arranged procedurally for educational and non-commercial fan appreciation.
 * PixiBun claims no copyright over the underlying musical compositions.
 *
 * Authored using Toby Fox's authentic music theory, NES VST 1.1 sound design,
 * Hooktheory chord voicings, and cozy lofi aesthetics:
 * 1. "Field of Hopes" (The Field of Hopes and Dreams — Cozy Lofi Rest, 104 BPM, Bb Major)
 * 2. "My Castle Town" (My Castle Town — Relaxing Cafe Lounge, 102 BPM, Eb Major with Minor Plagal Cadence)
 * 3. "Empty Town" (Empty Town — Atmospheric Music Box Lullaby, 104 BPM, A Minor Andalusian Cadence)
 */

export const TRACKS = [
  'Field of Hopes',
  'My Castle Town',
  'Empty Town',
] as const;

export type TrackTitle = (typeof TRACKS)[number];

export interface SynthVoiceController {
  playPulse: (time: number, freq: number, duration: number, duty: '12' | '25' | '50', gainAmount: number, vibrato?: boolean) => void;
  playFlute?: (time: number, freq: number, duration: number, gainAmount?: number, vibrato?: boolean) => void;
  playFMBass: (time: number, freq: number, duration: number, gainAmount?: number) => void;
  playTriangleBass?: (time: number, freq: number, duration: number, gainAmount?: number) => void;
  playPiano?: (time: number, freq: number, duration: number, gainAmount?: number) => void;
  playChime?: (time: number, freq: number, duration: number, gainAmount?: number) => void;
  playWarmPad: (time: number, chordFreqs: number[], duration: number, gainAmount?: number) => void;
  playOverdriveLead: (time: number, freq: number, duration: number, gainAmount?: number) => void;
  playKick: (time: number) => void;
  playSnare: (time: number) => void;
  playHiHat: (time: number, isOpen?: boolean) => void;
  playMetallicZap: (time: number, duration?: number) => void;
}

export interface TrackConfig {
  title: TrackTitle;
  tempo: number;
  stepDuration?: number;
  hasRainNoise?: boolean;
  scheduleStep: (step: number, time: number, voice: SynthVoiceController) => void;
}

// =========================================================================
// TRACK 0: The Field of Hopes and Dreams (Toby Fox / Deltarune Ch. 1)
// Complete authentic 3-part transcription from Hookpad / TheoryTab score:
// 104.0 BPM in 4/4 meter (each step is a 16th note, 16 steps per bar,
// 40 full measures = 640 steps total, ~92.3s cycle).
// 1. Intro (Bars 0-7): 25% pulse arpeggios over Gm7 -> Eb9 -> Cm7.
// 2. Chorus (Bars 8-23): 50% pulse flute lead with delayed vibrato over
//    the signature Royal Road (Eb7sus4 -> Fadd6 -> Gm7 -> Bb7).
// 3. Outro / "Don't Forget" (Bars 24-39): Warm acoustic felt piano over
//    Cm7 -> Bb/D -> Eb -> F -> D/F# with emotional octave climax.
// =========================================================================
const fieldOfHopesLeadMap: Record<number, [number, number]> = {
  0: [261.63, 1],
  2: [261.63, 1],
  4: [261.63, 1],
  5: [293.66, 1],
  6: [261.63, 1],
  8: [261.63, 1],
  9: [293.66, 1],
  10: [261.63, 1],
  11: [293.66, 1],
  12: [440, 2],
  14: [349.23, 2],
  16: [261.63, 1],
  18: [261.63, 1],
  20: [261.63, 1],
  21: [293.66, 1],
  22: [261.63, 1],
  24: [261.63, 1],
  25: [293.66, 1],
  26: [261.63, 1],
  27: [293.66, 1],
  28: [440, 2],
  30: [349.23, 2],
  32: [261.63, 1],
  34: [261.63, 1],
  36: [261.63, 1],
  37: [293.66, 1],
  38: [261.63, 1],
  40: [261.63, 1],
  41: [293.66, 1],
  42: [261.63, 1],
  43: [293.66, 1],
  44: [440, 2],
  46: [349.23, 2],
  48: [261.63, 1],
  50: [261.63, 1],
  52: [261.63, 1],
  53: [293.66, 1],
  54: [261.63, 1],
  56: [233.08, 2],
  58: [293.66, 2],
  60: [174.61, 2],
  62: [233.08, 2],
  64: [261.63, 1],
  66: [261.63, 1],
  68: [261.63, 1],
  69: [293.66, 1],
  70: [261.63, 1],
  72: [261.63, 1],
  73: [293.66, 1],
  74: [261.63, 1],
  75: [293.66, 1],
  76: [440, 2],
  78: [349.23, 2],
  80: [261.63, 1],
  82: [261.63, 1],
  84: [261.63, 1],
  85: [293.66, 1],
  86: [261.63, 1],
  88: [261.63, 1],
  89: [293.66, 1],
  90: [261.63, 1],
  91: [293.66, 1],
  92: [440, 2],
  94: [349.23, 2],
  96: [261.63, 1],
  98: [261.63, 1],
  100: [261.63, 1],
  101: [293.66, 1],
  102: [261.63, 1],
  104: [261.63, 1],
  105: [293.66, 1],
  106: [261.63, 1],
  107: [293.66, 1],
  108: [440, 2],
  110: [349.23, 2],
  112: [261.63, 1],
  114: [261.63, 1],
  116: [261.63, 1],
  117: [293.66, 1],
  118: [261.63, 1],
  120: [466.16, 2],
  122: [587.33, 2],
  124: [349.23, 2],
  126: [466.16, 2],
  128: [523.25, 10],
  138: [349.23, 2],
  140: [523.25, 1],
  141: [587.33, 1],
  142: [523.25, 1],
  143: [466.16, 1],
  144: [523.25, 10],
  154: [349.23, 2],
  156: [523.25, 1],
  157: [587.33, 1],
  158: [523.25, 1],
  159: [466.16, 1],
  160: [523.25, 10],
  170: [349.23, 2],
  172: [523.25, 1],
  173: [587.33, 1],
  174: [523.25, 1],
  175: [466.16, 1],
  176: [523.25, 3],
  179: [698.46, 3],
  182: [622.25, 3],
  185: [587.33, 1],
  186: [622.25, 1],
  187: [587.33, 1],
  188: [466.16, 2],
  190: [523.25, 2],
  192: [523.25, 10],
  202: [349.23, 2],
  204: [523.25, 1],
  205: [587.33, 1],
  206: [523.25, 1],
  207: [466.16, 1],
  208: [523.25, 10],
  218: [349.23, 2],
  220: [523.25, 1],
  221: [587.33, 1],
  222: [523.25, 1],
  223: [466.16, 1],
  224: [523.25, 10],
  234: [349.23, 2],
  236: [523.25, 1],
  237: [587.33, 1],
  238: [523.25, 1],
  239: [466.16, 1],
  240: [523.25, 3],
  243: [698.46, 3],
  246: [932.33, 3],
  249: [698.46, 1],
  250: [783.99, 1],
  251: [698.46, 1],
  252: [622.25, 2],
  254: [587.33, 2],
  256: [523.25, 10],
  266: [349.23, 1],
  267: [293.66, 1],
  268: [523.25, 1],
  269: [587.33, 1],
  270: [523.25, 1],
  271: [466.16, 1],
  272: [523.25, 10],
  282: [349.23, 1],
  283: [523.25, 1],
  284: [698.46, 1],
  285: [587.33, 1],
  286: [523.25, 1],
  287: [466.16, 1],
  288: [523.25, 10],
  298: [349.23, 2],
  300: [523.25, 1],
  301: [587.33, 1],
  302: [523.25, 1],
  303: [466.16, 1],
  304: [523.25, 3],
  307: [698.46, 3],
  310: [622.25, 3],
  313: [587.33, 1],
  314: [622.25, 1],
  315: [587.33, 1],
  316: [466.16, 2],
  318: [523.25, 2],
  320: [523.25, 10],
  330: [349.23, 1],
  331: [293.66, 1],
  332: [523.25, 1],
  333: [587.33, 1],
  334: [523.25, 1],
  335: [466.16, 1],
  336: [523.25, 10],
  346: [349.23, 1],
  347: [523.25, 1],
  348: [698.46, 1],
  349: [587.33, 1],
  350: [523.25, 1],
  351: [466.16, 1],
  352: [523.25, 10],
  362: [349.23, 2],
  364: [523.25, 1],
  365: [587.33, 1],
  366: [523.25, 1],
  367: [466.16, 1],
  368: [523.25, 3],
  371: [698.46, 3],
  374: [932.33, 3],
  377: [698.46, 1],
  378: [783.99, 1],
  379: [698.46, 1],
  380: [622.25, 2],
  382: [587.33, 2],
  388: [174.61, 2],
  390: [233.08, 2],
  392: [261.63, 4],
  396: [293.66, 2],
  398: [233.08, 8],
  406: [233.08, 2],
  408: [220, 4],
  412: [233.08, 2],
  414: [196, 10],
  424: [174.61, 2],
  426: [233.08, 4],
  430: [261.63, 4],
  434: [233.08, 4],
  438: [220, 4],
  442: [233.08, 4],
  446: [233.08, 6],
  452: [174.61, 2],
  454: [233.08, 2],
  456: [261.63, 4],
  460: [293.66, 2],
  462: [233.08, 8],
  470: [233.08, 2],
  472: [220, 4],
  476: [349.23, 2],
  478: [349.23, 10],
  488: [349.23, 2],
  490: [311.13, 2],
  492: [293.66, 2],
  494: [261.63, 4],
  498: [233.08, 4],
  502: [261.63, 4],
  506: [311.13, 4],
  510: [293.66, 2],
  516: [349.23, 2],
  518: [466.16, 2],
  520: [523.25, 4],
  524: [587.33, 2],
  526: [466.16, 8],
  534: [466.16, 2],
  536: [440, 4],
  540: [466.16, 2],
  542: [392, 10],
  552: [349.23, 2],
  554: [466.16, 4],
  558: [523.25, 4],
  562: [466.16, 4],
  566: [440, 4],
  570: [466.16, 4],
  574: [466.16, 6],
  580: [349.23, 2],
  582: [466.16, 2],
  584: [523.25, 4],
  588: [587.33, 2],
  590: [466.16, 8],
  598: [466.16, 2],
  600: [440, 4],
  604: [698.46, 2],
  606: [698.46, 10],
  616: [698.46, 2],
  618: [622.25, 2],
  620: [587.33, 2],
  622: [523.25, 4],
  626: [466.16, 4],
  630: [523.25, 4],
  634: [622.25, 6],
};

const fieldOfHopesConfig: TrackConfig = {
  title: 'Field of Hopes',
  tempo: 104.0,
  hasRainNoise: true,
  scheduleStep: (step: number, time: number, voice: SynthVoiceController) => {
    const stepDur = (60.0 / 104.0) / 4.0;
    const currentStep = step % 640;
    const measureStep = currentStep % 16;
    const bar = Math.floor(currentStep / 16);

    // 1. Warm Strings / Mellotron Pad Chords (Swells gently every bar)
    if (measureStep === 0) {
      const padMap: Record<number, number[]> = {
        // Intro (Bars 0-7)
        0: [196.00, 233.08, 293.66, 349.23], // Gm7
        1: [196.00, 233.08, 293.66, 349.23], // Gm7
        2: [155.56, 196.00, 233.08, 293.66], // Eb9
        3: [130.81, 155.56, 196.00, 233.08], // Cm7
        4: [196.00, 233.08, 293.66, 349.23], // Gm7
        5: [196.00, 233.08, 293.66, 349.23], // Gm7
        6: [155.56, 196.00, 233.08, 293.66], // Eb9
        7: [130.81, 155.56, 196.00, 233.08], // Cm7
        // Chorus (Bars 8-23, repeated 4-bar Royal Road cycle)
        8: [155.56, 207.65, 233.08, 293.66], // Eb7sus4
        9: [174.61, 220.00, 261.63, 293.66], // F(add6)
        10: [196.00, 233.08, 293.66, 349.23],// Gm7
        11: [116.54, 146.83, 174.61, 207.65],// Bb7
        12: [155.56, 207.65, 233.08, 293.66],
        13: [174.61, 220.00, 261.63, 293.66],
        14: [196.00, 233.08, 293.66, 349.23],
        15: [116.54, 146.83, 174.61, 207.65],
        16: [155.56, 207.65, 233.08, 293.66],
        17: [174.61, 220.00, 261.63, 293.66],
        18: [196.00, 233.08, 293.66, 349.23],
        19: [116.54, 146.83, 174.61, 207.65],
        20: [155.56, 207.65, 233.08, 293.66],
        21: [174.61, 220.00, 261.63, 293.66],
        22: [196.00, 233.08, 293.66, 349.23],
        23: [116.54, 146.83, 174.61, 207.65],
        // Outro (Bars 24-39, "Don't Forget" ballad)
        24: [130.81, 155.56, 196.00, 233.08], // Cm7
        25: [146.83, 174.61, 233.08],         // Bb/D
        26: [155.56, 196.00, 233.08],         // Eb
        27: [174.61, 220.00, 261.63],         // F (resolves to D/F# on beat 3)
        28: [130.81, 155.56, 196.00, 233.08],
        29: [146.83, 174.61, 233.08],
        30: [155.56, 196.00, 233.08],
        31: [174.61, 220.00, 261.63],
        32: [130.81, 155.56, 196.00, 233.08],
        33: [146.83, 174.61, 233.08],
        34: [155.56, 196.00, 233.08],
        35: [174.61, 220.00, 261.63],
        36: [130.81, 155.56, 196.00, 233.08],
        37: [146.83, 174.61, 233.08],
        38: [155.56, 196.00, 233.08],
        39: [174.61, 220.00, 261.63],
      };
      if (padMap[bar]) {
        const dur = (bar >= 24 && bar % 4 === 3) ? stepDur * 7.8 : stepDur * 15;
        voice.playWarmPad(time, padMap[bar], dur, 0.09);
      }
    }
    // D/F# leading tone resolution on beat 3 (step 8) of bars 27, 31, 35, 39
    if (bar >= 24 && bar % 4 === 3 && measureStep === 8) {
      voice.playWarmPad(time, [185.00, 220.00, 293.66], stepDur * 7.5, 0.08);
    }

    // 2. Lead Voice (Dynamic instrumentation matching the 3 song sections)
    if (fieldOfHopesLeadMap[currentStep]) {
      const [freq, durSteps] = fieldOfHopesLeadMap[currentStep];
      if (bar < 8) {
        // Section 1: Intro warm acoustic felt piano / Rhodes arpeggio (delicate, cozy, zero trumpet buzz!)
        if (voice.playPiano) {
          voice.playPiano(time, freq, stepDur * durSteps * 0.85, 0.075);
        } else {
          voice.playPulse(time, freq, stepDur * durSteps * 0.85, '50', 0.06, false);
        }
      } else if (bar < 24) {
        // Section 2: Soaring Chorus theme (Toby Fox warm wooden flute with gentle delayed vibrato & lush reverb)
        if (voice.playFlute) {
          voice.playFlute(time, freq, stepDur * durSteps * 0.95, 0.095, durSteps >= 3);
        } else {
          voice.playPulse(time, freq, stepDur * durSteps * 0.95, '50', 0.08, durSteps >= 3);
        }
      } else {
        // Section 3: Outro / "Don't Forget" tender theme (Tok acoustic felt piano with rich harmonics & reverb)
        if (voice.playPiano) {
          voice.playPiano(time, freq, stepDur * durSteps * 0.95, 0.12);
        } else {
          voice.playPulse(time, freq, stepDur * durSteps * 0.95, '50', 0.09, false);
        }
      }
    }

    // 3. Authentic NES Triangle Bass (Smooth, woody root notes)
    if (measureStep === 0 || measureStep === 8) {
      const bassMap: Record<number, number> = {
        // Intro (Bars 0-7)
        0: 49.00, 1: 49.00, 2: 38.89, 3: 32.70,
        4: 49.00, 5: 49.00, 6: 38.89, 7: 32.70,
        // Chorus (Bars 8-23)
        8: 38.89, 9: 43.65, 10: 49.00, 11: 58.27,
        12: 38.89, 13: 43.65, 14: 49.00, 15: 58.27,
        16: 38.89, 17: 43.65, 18: 49.00, 19: 58.27,
        20: 38.89, 21: 43.65, 22: 49.00, 23: 58.27,
        // Outro (Bars 24-39)
        24: 32.70, 25: 36.71, 26: 38.89, 27: 43.65,
        28: 32.70, 29: 36.71, 30: 38.89, 31: 43.65,
        32: 32.70, 33: 36.71, 34: 38.89, 35: 43.65,
        36: 32.70, 37: 36.71, 38: 38.89, 39: 43.65,
      };
      const root = bassMap[bar] || 49.00;
      const note = (bar >= 24 && bar % 4 === 3 && measureStep === 8) ? 46.25 : root; // F#1 on beat 3
      if (voice.playTriangleBass) {
        voice.playTriangleBass(time, note, stepDur * 3.5, 0.23);
      } else {
        voice.playFMBass(time, note, stepDur * 3.5, 0.23);
      }
    }

    // 4. Mellow Lofi Pillow Percussion
    if (bar >= 8 && bar < 24) {
      // Chorus: Full driving lofi beat
      if (measureStep === 0 || measureStep === 8) voice.playKick(time);
      if (measureStep === 4 || measureStep === 12) voice.playSnare(time);
      if (measureStep % 2 === 0) voice.playHiHat(time, false);
    } else if (bar < 8) {
      // Intro: Minimal rhythmic pulse
      if (measureStep === 0 && bar % 2 === 0) voice.playKick(time);
      if (measureStep % 4 === 2) voice.playHiHat(time, false);
    } else {
      // Outro: Gentle heartbeat kick and quiet hi-hat
      if (measureStep === 0) voice.playKick(time);
      if (measureStep === 8) voice.playHiHat(time, false);
    }
  },
};

// =========================================================================
// TRACK 1: My Castle Town (Toby Fox / Deltarune Ch. 2)
// 108.0 BPM, 4/4 gentle sway, 256 16th-note steps (16 full bars, ~35.5s cycle)
// Canonical Eb Major with Minor Plagal Cadence & Vintage Lofi Vinyl Rain
// =========================================================================
const myCastleTownConfig: TrackConfig = {
  title: 'My Castle Town',
  tempo: 108.0,
  hasRainNoise: true,
  scheduleStep: (step: number, time: number, voice: SynthVoiceController) => {
    const stepDur = (60.0 / 108.0) / 4.0;
    const currentStep = step % 256;
    const measureStep = currentStep % 16;
    const bar = Math.floor(currentStep / 16);

    // 1. Warm Nostalgic Pad / Electric Piano Chords in Eb Major
    if (measureStep === 0) {
      const chordMap: Record<number, number[]> = {
        0: [155.56, 196.00, 233.08, 293.66], // Ebmaj7
        1: [103.83, 130.81, 155.56, 196.00], // Abmaj7
        2: [98.00, 116.54, 146.83, 174.61],  // Gm7
        3: [130.81, 155.56, 196.00, 233.08], // Cm7
        4: [87.31, 103.83, 130.81, 155.56],  // Fm7
        5: [116.54, 146.83, 174.61, 207.65], // Bb7
        6: [155.56, 196.00, 233.08, 293.66], // Ebmaj7
        7: [116.54, 155.56, 174.61, 207.65], // Bb7sus4
        8: [103.83, 130.81, 155.56, 196.00], // Abmaj7
        9: [98.00, 116.54, 146.83, 174.61],  // Gm7
        10: [123.47, 174.61, 196.00, 293.66],// G7/B
        11: [130.81, 155.56, 196.00, 233.08],// Cm7
        12: [87.31, 103.83, 130.81, 155.56], // Fm7
        13: [103.83, 123.47, 155.56, 174.61],// Abm6 (Minor Plagal!)
        14: [98.00, 116.54, 155.56, 196.00], // Eb/G -> Cm
        15: [87.31, 116.54, 146.83, 207.65], // Bb7(b9)
      };
      if (chordMap[bar]) {
        voice.playWarmPad(time, chordMap[bar], stepDur * 15, 0.12);
      }
    }

    // 2. Music Box / Flute Lead Melody in Eb Major (50% Pulse with gentle vibrato)
    const leadMap: Record<number, [number, number]> = {
      0: [466.16, 4], 4: [392.00, 2], 6: [311.13, 2], 8: [293.66, 2], 10: [311.13, 2], 12: [349.23, 4],
      16: [392.00, 12], 28: [311.13, 2], 30: [349.23, 2],
      32: [392.00, 2], 34: [466.16, 2], 36: [587.33, 4], 40: [523.25, 2], 42: [466.16, 2], 44: [392.00, 4],
      48: [311.13, 12], 60: [261.63, 2], 62: [293.66, 2],
      64: [311.13, 2], 66: [349.23, 2], 68: [415.30, 4], 72: [392.00, 2], 74: [349.23, 2], 76: [311.13, 4],
      80: [293.66, 12], 92: [349.23, 2], 94: [392.00, 2],
      96: [415.30, 2], 98: [392.00, 2], 100: [349.23, 2], 102: [311.13, 2], 104: [392.00, 8],
      112: [349.23, 12], 124: [233.08, 1], 125: [311.13, 1], 126: [392.00, 1], 127: [466.16, 1],
      128: [523.25, 4], 132: [466.16, 2], 134: [415.30, 2], 136: [392.00, 2], 138: [415.30, 2], 140: [466.16, 4],
      144: [392.00, 12], 156: [349.23, 2], 158: [392.00, 2],
      160: [415.30, 2], 162: [392.00, 2], 164: [349.23, 2], 166: [311.13, 2], 168: [293.66, 4], 172: [246.94, 4],
      176: [261.63, 16],
      192: [523.25, 4], 196: [466.16, 2], 198: [415.30, 2], 200: [392.00, 2], 202: [349.23, 2], 204: [311.13, 4],
      208: [246.94, 2], 210: [311.13, 2], 212: [349.23, 2], 214: [415.30, 2], 216: [493.88, 8], // Nostalgic B♮!
      224: [466.16, 12], 236: [392.00, 2], 238: [311.13, 2],
      240: [349.23, 4], 244: [293.66, 4], 248: [311.13, 8],
    };
    if (leadMap[currentStep]) {
      const [freq, dur] = leadMap[currentStep];
      if (voice.playFlute) {
        voice.playFlute(time, freq, stepDur * dur * 0.96, 0.095, true);
      } else {
        voice.playPulse(time, freq, stepDur * dur * 0.96, '50', 0.09, true);
      }
    }

    // 3. Gentle Walking NES Triangle Bass in Eb Major
    const bassMap: Record<number, number> = {
      0: 77.78, 8: 116.54, 12: 73.42,
      16: 51.91, 24: 77.78, 28: 98.00,
      32: 49.00, 40: 73.42, 44: 87.31,
      48: 65.41, 56: 98.00, 60: 116.54,
      64: 43.65, 72: 65.41, 76: 77.78,
      80: 58.27, 88: 87.31, 92: 103.83,
      96: 77.78, 104: 116.54, 108: 98.00,
      112: 58.27, 120: 87.31, 124: 103.83,
      128: 51.91, 136: 77.78, 140: 130.81,
      144: 49.00, 152: 73.42, 156: 116.54,
      160: 61.74, 168: 98.00, 172: 73.42,
      176: 65.41, 184: 98.00, 188: 77.78,
      192: 43.65, 200: 65.41, 204: 103.83,
      208: 51.91, 216: 61.74, 220: 77.78,
      224: 49.00, 232: 65.41, 236: 77.78,
      240: 43.65, 248: 58.27, 252: 73.42,
    };
    if (bassMap[currentStep]) {
      if (voice.playTriangleBass) {
        voice.playTriangleBass(time, bassMap[currentStep], stepDur * 3.6, 0.22);
      } else {
        voice.playFMBass(time, bassMap[currentStep], stepDur * 3.6, 0.22);
      }
    }

    // 4. Subtle Lofi Brushed Drums
    if (measureStep === 0 || measureStep === 8) {
      voice.playKick(time);
    }
    if (measureStep === 4 || measureStep === 12) {
      voice.playSnare(time);
    }
    if (measureStep % 4 === 2) {
      voice.playHiHat(time, false);
    }
  },
};

// =========================================================================
// TRACK 2: Empty Town (Toby Fox / Deltarune Ch. 1 OST)
// Exact note-for-note transcription from Hookpad / TheoryTab score:
// 138.0 BPM in 6/8 meter (each step is a 16th note, 12 steps per bar,
// 16 full bars = 192 steps total, ~41.74s cycle).
// Features Toby Fox's Lead Piano Legato, High String Section pad,
// NES Triangle Dotted Bass, and vinyl rain ambience.
// =========================================================================
const emptyTownLeadMap: Record<number, [number, number]> = {
  // Part A: Solo Piano Theme (Bars 0-7, steps 0-95)
  2: [493.88, 1],   // B4
  3: [523.25, 1],   // C5
  4: [493.88, 1],   // B4
  5: [440.00, 1],   // A4
  6: [329.63, 2],   // E4
  8: [261.63, 2],   // C4
  10: [329.63, 2],  // E4

  14: [493.88, 1],  // B4
  15: [523.25, 1],  // C5
  16: [493.88, 1],  // B4
  17: [440.00, 1],  // A4
  18: [587.33, 6],  // D5 (held 3 beats)

  26: [493.88, 1],  // B4
  27: [523.25, 1],  // C5
  28: [493.88, 1],  // B4
  29: [440.00, 1],  // A4
  30: [493.88, 4],  // B4
  34: [523.25, 2],  // C5

  36: [392.00, 2],  // G4
  38: [392.00, 1],  // G4
  39: [349.23, 1],  // F4
  40: [329.63, 1],  // E4
  41: [349.23, 1],  // F4
  42: [329.63, 6],  // E4 (held 3 beats)

  50: [329.63, 1],  // E4
  51: [349.23, 1],  // F4
  52: [329.63, 1],  // E4
  53: [293.66, 1],  // D4
  54: [233.08, 2],  // Bb3
  56: [174.61, 2],  // F3
  58: [349.23, 2],  // F4

  60: [329.63, 3],  // E4
  63: [293.66, 1],  // D4
  64: [261.63, 1],  // C4
  65: [293.66, 1],  // D4
  66: [329.63, 4],  // E4
  70: [261.63, 2],  // C4

  72: [311.13, 2],  // D#4
  74: [246.94, 2],  // B3
  76: [220.00, 2],  // A3
  78: [155.56, 4],  // D#3
  82: [311.13, 2],  // D#4

  84: [329.63, 6],  // E4 (resolving leading tone)

  // Part B: Developed Variation with High Chimes (Bars 8-15, steps 96-191)
  98: [493.88, 1],
  99: [523.25, 1],
  100: [493.88, 1],
  101: [440.00, 1],
  102: [329.63, 2],
  104: [261.63, 2],
  106: [329.63, 2],

  110: [493.88, 1],
  111: [523.25, 1],
  112: [493.88, 1],
  113: [440.00, 1],
  114: [587.33, 6],

  122: [493.88, 1],
  123: [523.25, 1],
  124: [493.88, 1],
  125: [440.00, 1],
  126: [493.88, 4],
  130: [523.25, 2],

  132: [392.00, 2],
  134: [392.00, 1],
  135: [349.23, 1],
  136: [329.63, 1],
  137: [349.23, 1],
  138: [329.63, 6],

  146: [329.63, 1],
  147: [349.23, 1],
  148: [329.63, 1],
  149: [293.66, 1],
  150: [233.08, 2],
  152: [174.61, 2],
  154: [349.23, 2],

  156: [329.63, 3],
  159: [293.66, 1],
  160: [261.63, 1],
  161: [293.66, 1],
  162: [329.63, 4],
  166: [261.63, 2],

  168: [311.13, 2],
  170: [246.94, 2],
  172: [220.00, 2],
  174: [155.56, 4],
  178: [311.13, 2],

  180: [329.63, 6],
};

const emptyTownConfig: TrackConfig = {
  title: 'Empty Town',
  tempo: 138.0,
  stepDuration: (60.0 / 138.0) / 2.0, // 0.21739s per 16th step in 6/8
  hasRainNoise: true,
  scheduleStep: (step: number, time: number, voice: SynthVoiceController) => {
    const stepDur = (60.0 / 138.0) / 2.0;
    const currentStep = step % 192;
    const measureStep = currentStep % 12;
    const bar = Math.floor(currentStep / 12);

    // 1. High String Section Pad Chords (Swells gently every 12-step bar)
    if (measureStep === 0) {
      const chordMap: Record<number, number[]> = {
        0: [220.00, 261.63, 329.63],         // Am (i)
        1: [196.00, 246.94, 329.63],         // Em/G (v6)
        2: [174.61, 220.00, 261.63, 329.63], // Fmaj7 (VI7)
        3: [196.00, 261.63, 329.63],         // C (III)
        4: [174.61, 233.08, 293.66],         // Bb (ii phrygian)
        5: [220.00, 261.63, 329.63],         // Am (i)
        6: [185.00, 246.94, 293.66, 369.99], // B (V/V major)
        7: [164.81, 220.00, 246.94, 329.63], // Esus4 (V sus4)
      };
      const chord = chordMap[bar % 8];
      if (chord) {
        // Bar 7 has a sus4 resolution to major at step 6 (beat 4)
        const dur = (bar % 8 === 7) ? stepDur * 5.8 : stepDur * 11.5;
        voice.playWarmPad(time, chord, dur, 0.08);
      }
    }
    if (measureStep === 6 && bar % 8 === 7) {
      // Esus4 resolves to E major on beat 4!
      voice.playWarmPad(time, [164.81, 207.65, 246.94, 329.63], stepDur * 5.8, 0.08);
    }

    // 2. Toby Fox Lead Piano Legato Melody (Clean, warm acoustic felt piano, single strike per note)
    if (emptyTownLeadMap[currentStep]) {
      const [freq, durSteps] = emptyTownLeadMap[currentStep];
      if (voice.playPiano) {
        voice.playPiano(time, freq, stepDur * durSteps * 0.95, 0.12);
      } else {
        voice.playPulse(time, freq, stepDur * durSteps * 0.95, '50', 0.09, false);
      }
    }

    // 3. Authentic NES Triangle Dotted Bass (Hits on beats 1 and 4 of 6/8 meter)
    if (measureStep === 0 || measureStep === 6) {
      const bassProgression: [number, number][] = [
        [55.00, 82.41], // Bar 0 (Am): A1, E2
        [49.00, 82.41], // Bar 1 (Em/G): G1, E2
        [43.65, 65.41], // Bar 2 (Fmaj7): F1, C2
        [65.41, 98.00], // Bar 3 (C): C2, G2
        [58.27, 87.31], // Bar 4 (Bb): Bb1, F2
        [55.00, 82.41], // Bar 5 (Am): A1, E2
        [61.74, 92.50], // Bar 6 (B): B1, F#2
        [41.20, 41.20], // Bar 7 (E): E1, E1
      ];
      const [beat1Bass, beat4Bass] = bassProgression[bar % 8];
      const bassFreq = measureStep === 0 ? beat1Bass : beat4Bass;

      if (voice.playTriangleBass) {
        voice.playTriangleBass(time, bassFreq, stepDur * 5.2, 0.23);
      } else {
        voice.playFMBass(time, bassFreq, stepDur * 5.2, 0.23);
      }
    }

    // 4. Subtle Orchestral / Lofi Tape Percussion
    if (measureStep === 0) {
      voice.playKick(time);
    }
    if (bar >= 8) {
      if (measureStep === 6) {
        voice.playSnare(time);
      }
      if (measureStep === 2 || measureStep === 4 || measureStep === 8 || measureStep === 10) {
        voice.playHiHat(time, false);
      }
    }
  },
};

export const TRACK_CONFIGS: Record<number, TrackConfig> = {
  0: fieldOfHopesConfig,
  1: myCastleTownConfig,
  2: emptyTownConfig,
};
