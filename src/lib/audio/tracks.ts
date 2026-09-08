/**
 * Procedural Musical Tracks & Tracker Step Tables
 * 100% in-memory procedural note and percussion arrangements.
 */

export const TRACKS = [
  'Cyber Run',
  'Rainy Lilac',
  'Neon Castle',
] as const;

export type TrackTitle = (typeof TRACKS)[number];

export interface SynthVoiceController {
  playPulse: (time: number, freq: number, duration: number, duty: '12' | '25' | '50', gainAmount: number, vibrato?: boolean) => void;
  playFMBass: (time: number, freq: number, duration: number, gainAmount?: number) => void;
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
  hasRainNoise?: boolean;
  scheduleStep: (step: number, time: number, voice: SynthVoiceController) => void;
}

export const TRACK_CONFIGS: Record<number, TrackConfig> = {
  0: {
    title: 'Cyber Run',
    tempo: 140.0,
    hasRainNoise: false,
    scheduleStep: (step: number, time: number, voice: SynthVoiceController) => {
      const stepDur = (60.0 / 140.0) / 4.0;
      const arpNotes: (number | null)[] = [
        349.23, 415.30, 523.25, 311.13, 349.23, 523.25, 415.30, 293.66,
        349.23, 415.30, 523.25, 311.13, 349.23, 293.66, 261.63, 233.08,
        311.13, 392.00, 466.16, 293.66, 311.13, 466.16, 392.00, 261.63,
        293.66, 349.23, 415.30, 261.63, 293.66, 261.63, 233.08, 207.65,
      ];
      const note = arpNotes[step % 32];
      if (note) {
        voice.playPulse(time, note, stepDur * 0.9, '12', 0.16, true);
      }

      // Syncopated FM Bass
      const bassNotes: { [key: number]: number } = {
        0: 87.31, 2: 174.61, 5: 87.31, 7: 103.83, 10: 116.54, 13: 130.81, 15: 155.56,
        16: 87.31, 18: 174.61, 21: 87.31, 24: 116.54, 27: 103.83, 30: 130.81,
      };
      if (bassNotes[step % 32]) {
        voice.playFMBass(time, bassNotes[step % 32], stepDur * 1.5, 0.42);
      }

      // Warm Saw Pad (Fm9 bar 1 -> Bb7 bar 2)
      if (step % 32 === 0) {
        voice.playWarmPad(time, [174.61, 207.65, 261.63, 311.13], stepDur * 16, 0.12);
      } else if (step % 32 === 16) {
        voice.playWarmPad(time, [233.08, 293.66, 349.23, 415.30], stepDur * 16, 0.12);
      }

      // Overdrive Battle Accent Stabs
      if (step % 32 === 0 || step % 32 === 10 || step % 32 === 16 || step % 32 === 26) {
        voice.playOverdriveLead(time, 349.23, stepDur * 1.6, 0.2);
      }

      // Drums
      if (step % 8 === 0 || step % 8 === 6) {
        voice.playKick(time);
      }
      if (step % 8 === 4) {
        voice.playSnare(time);
      }
      const isOpenHat = step % 4 === 2;
      voice.playHiHat(time, isOpenHat);

      if (step % 32 === 30 || step % 32 === 31) {
        voice.playMetallicZap(time, 0.05);
      }
    },
  },
  1: {
    title: 'Rainy Lilac',
    tempo: 84.0,
    hasRainNoise: true,
    scheduleStep: (step: number, time: number, voice: SynthVoiceController) => {
      const stepDur = (60.0 / 84.0) / 4.0;
      const chordStep = step % 64;

      if (chordStep === 0) {
        // Fmaj7
        voice.playPulse(time, 174.61, stepDur * 14, '50', 0.12);
        voice.playPulse(time, 220.00, stepDur * 14, '50', 0.1);
        voice.playPulse(time, 261.63, stepDur * 14, '50', 0.1);
        voice.playPulse(time, 329.63, stepDur * 14, '50', 0.08);
        voice.playFMBass(time, 87.31, stepDur * 14, 0.3);
      } else if (chordStep === 16) {
        // Em7
        voice.playPulse(time, 164.81, stepDur * 14, '50', 0.12);
        voice.playPulse(time, 196.00, stepDur * 14, '50', 0.1);
        voice.playPulse(time, 246.94, stepDur * 14, '50', 0.1);
        voice.playPulse(time, 293.66, stepDur * 14, '50', 0.08);
        voice.playFMBass(time, 82.41, stepDur * 14, 0.3);
      } else if (chordStep === 32) {
        // Dm7
        voice.playPulse(time, 146.83, stepDur * 14, '50', 0.12);
        voice.playPulse(time, 174.61, stepDur * 14, '50', 0.1);
        voice.playPulse(time, 220.00, stepDur * 14, '50', 0.1);
        voice.playPulse(time, 261.63, stepDur * 14, '50', 0.08);
        voice.playFMBass(time, 73.42, stepDur * 14, 0.3);
      } else if (chordStep === 48) {
        // Cmaj7
        voice.playPulse(time, 130.81, stepDur * 14, '50', 0.12);
        voice.playPulse(time, 164.81, stepDur * 14, '50', 0.1);
        voice.playPulse(time, 196.00, stepDur * 14, '50', 0.1);
        voice.playPulse(time, 246.94, stepDur * 14, '50', 0.08);
        voice.playFMBass(time, 65.41, stepDur * 14, 0.3);
      }

      // Soft brushed hat and subtle kick
      if (chordStep % 16 === 0) {
        voice.playKick(time);
      }
      if (chordStep % 8 === 4) {
        voice.playHiHat(time, false);
      }
    },
  },
  2: {
    title: 'Neon Castle',
    tempo: 128.0,
    hasRainNoise: false,
    scheduleStep: (step: number, time: number, voice: SynthVoiceController) => {
      const stepDur = (60.0 / 128.0) / 4.0;
      const melodyNotes: { [key: number]: number } = {
        0: 329.63, 3: 440.00, 6: 523.25, 8: 493.88, 11: 392.00, 14: 440.00,
        16: 329.63, 19: 440.00, 22: 587.33, 24: 523.25, 27: 493.88, 30: 392.00,
      };
      const mel = melodyNotes[step % 32];
      if (mel) {
        voice.playPulse(time, mel, stepDur * 2.2, '25', 0.22, true);
      }

      // Syncopated Bassline
      const bassNotes: { [key: number]: number } = {
        0: 110.00, 4: 110.00, 7: 130.81, 10: 146.83, 12: 164.81, 14: 98.00,
        16: 110.00, 20: 110.00, 23: 164.81, 26: 146.83, 28: 130.81, 30: 82.41,
      };
      if (bassNotes[step % 32]) {
        voice.playFMBass(time, bassNotes[step % 32], stepDur * 1.8, 0.4);
      }

      // Pad backdrop
      if (step % 32 === 0) {
        voice.playWarmPad(time, [220.00, 261.63, 329.63, 392.00], stepDur * 16, 0.12);
      } else if (step % 32 === 16) {
        voice.playWarmPad(time, [174.61, 220.00, 261.63, 329.63], stepDur * 16, 0.12);
      }

      // Driving beat
      if (step % 8 === 0) {
        voice.playKick(time);
      }
      if (step % 8 === 4) {
        voice.playSnare(time);
      }
      voice.playHiHat(time, step % 4 === 2);
    },
  },
};
