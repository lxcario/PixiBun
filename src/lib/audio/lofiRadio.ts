'use client';

/**
 * Native Web Audio API Procedural Lo-Fi Synthesizer
 * Zero external audio files or network requests.
 * Synthesizes vinyl/rain noise + warm pentatonic chords + sub-bass in real-time.
 */

export interface RadioState {
  isPlaying: boolean;
  trackTitle: string;
  volume: number;
}

const TRACKS = [
  'lo-fi beats',
  'rainy night in lilac',
  'cozy hearth',
];

// Pentatonic warm chord progressions [frequency Hz arrays]
const PROGRESSIONS = [
  // Progression 1: Fmaj7 -> Em7 -> Dm7 -> Cmaj7
  [
    [174.61, 220.0, 261.63, 329.63], // Fmaj7
    [164.81, 196.0, 246.94, 293.66], // Em7
    [146.83, 174.61, 220.0, 261.63], // Dm7
    [130.81, 164.81, 196.0, 246.94], // Cmaj7
  ],
  // Progression 2: Am7 -> G6 -> Fmaj7 -> Em7
  [
    [220.0, 261.63, 329.63, 392.0],  // Am7
    [196.0, 246.94, 293.66, 329.63], // G6
    [174.61, 220.0, 261.63, 329.63], // Fmaj7
    [164.81, 196.0, 246.94, 293.66], // Em7
  ],
  // Progression 3: Dmaj7 -> C#m7 -> Bm7 -> Amaj7 (Cozy Hearth)
  [
    [146.83, 185.0, 220.0, 277.18],  // Dmaj7
    [138.59, 164.81, 207.65, 246.94], // C#m7
    [123.47, 146.83, 185.0, 220.0],  // Bm7
    [110.0, 138.59, 164.81, 207.65], // Amaj7
  ],
];

class LofiAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private noiseNode: AudioNode | null = null;
  private chordTimer: number | null = null;
  private isPlaying = false;
  private currentTrackIndex = 0;
  private chordIndex = 0;
  private volume = 0.6;
  private listeners: Set<(state: RadioState) => void> = new Set();
  private freqArray: Uint8Array<ArrayBuffer> | null = null;

  private initContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyser.smoothingTimeConstant = 0.8;
    this.freqArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  private createNoiseGenerator(): AudioNode | null {
    if (!this.ctx || !this.masterGain) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate warm pink/vinyl noise with subtle clicks
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      let sample = (b0 + b1 + b2) * 0.15;
      // Occasional gentle vinyl pop
      if (Math.random() < 0.0003) {
        sample += (Math.random() * 2 - 1) * 0.4;
      }
      output[i] = sample;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Lowpass filter for soft cozy rain sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    whiteNoise.start();
    return whiteNoise;
  }

  private playChord(freqs: number[]) {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    const chordDuration = 3.6;

    freqs.forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      const oscFilter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // Gentle pitch micro-vibrato (tape flutter)
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.3, now);
      lfoGain.gain.setValueAtTime(1.5, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + chordDuration);

      // Lowpass warmth
      oscFilter.type = 'lowpass';
      oscFilter.frequency.setValueAtTime(950, now);
      oscFilter.frequency.exponentialRampToValueAtTime(300, now + chordDuration);

      // Cozy Rhodes envelope
      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.exponentialRampToValueAtTime(0.04, now + 0.15);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + chordDuration);

      osc.connect(oscFilter);
      oscFilter.connect(oscGain);
      oscGain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + chordDuration);
    });

    // Sub-bass note
    const bassFreq = freqs[0] / 2;
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(bassFreq, now);

    bassGain.gain.setValueAtTime(0.0001, now);
    bassGain.gain.exponentialRampToValueAtTime(0.06, now + 0.1);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, now + chordDuration);

    bassOsc.connect(bassGain);
    bassGain.connect(this.masterGain);
    bassOsc.start(now);
    bassOsc.stop(now + chordDuration);
  }

  private startMusicLoop() {
    this.stopMusicLoop();
    const progression = PROGRESSIONS[this.currentTrackIndex % PROGRESSIONS.length];

    const step = () => {
      if (!this.isPlaying) return;
      const currentChord = progression[this.chordIndex % progression.length];
      this.playChord(currentChord);
      this.chordIndex++;
      this.chordTimer = window.setTimeout(step, 3600);
    };

    step();
  }

  private stopMusicLoop() {
    if (this.chordTimer !== null) {
      window.clearTimeout(this.chordTimer);
      this.chordTimer = null;
    }
  }

  public async play(): Promise<void> {
    this.initContext();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (!this.noiseNode) {
      this.noiseNode = this.createNoiseGenerator();
    }

    this.isPlaying = true;
    this.startMusicLoop();
    this.notify();
  }

  public pause(): void {
    this.isPlaying = false;
    this.stopMusicLoop();
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
    this.notify();
  }

  public toggle(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public nextTrack(): void {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % TRACKS.length;
    this.chordIndex = 0;
    if (this.isPlaying) {
      this.startMusicLoop();
    }
    this.notify();
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    this.notify();
  }

  /**
   * Returns normalized [0..1] values for 4 equalizer bands.
   */
  public getEqualizerLevels(): number[] {
    if (!this.isPlaying || !this.analyser || !this.freqArray) {
      return [0.05, 0.05, 0.05, 0.05];
    }
    this.analyser.getByteFrequencyData(this.freqArray);
    // Sample 4 buckets across low to high mid
    const b0 = (this.freqArray[1] || 0) / 255;
    const b1 = (this.freqArray[3] || 0) / 255;
    const b2 = (this.freqArray[6] || 0) / 255;
    const b3 = (this.freqArray[9] || 0) / 255;
    return [
      Math.max(0.1, b0),
      Math.max(0.1, b1),
      Math.max(0.1, b2),
      Math.max(0.1, b3),
    ];
  }

  public getState(): RadioState {
    return {
      isPlaying: this.isPlaying,
      trackTitle: TRACKS[this.currentTrackIndex],
      volume: this.volume,
    };
  }

  public subscribe(cb: (state: RadioState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((cb) => cb(state));
  }
}

export const lofiRadio = new LofiAudioEngine();
