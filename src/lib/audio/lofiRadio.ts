'use client';

/**
 * Procedural Web Audio Synthesis & Tracker Engine
 * Zero external audio files or network requests.
 *
 * Implements:
 * - Mathematical Pulse waves with authentic duty cycles (12.5%, 25%, 50%)
 * - 2-Operator FM synthesis for punchy attack & sub-bass
 * - 15-bit NES PRBS Linear Feedback Shift Register (LFSR) noise buffers
 * - Overdriven lead voice with tanh saturation and resonant cabinet filtering
 * - Lookahead Web Audio scheduler for sample-accurate playback
 * - Real-time spectral flux transient onset detection (Dixon 2006)
 */

import { createSpectralFluxDetector, SpectralFluxDetector } from './spectralFlux';
import { studioEvents } from '@/lib/events/studioEvents';
import { TRACKS, TrackTitle, TRACK_CONFIGS, SynthVoiceController } from './tracks';

export { TRACKS, type TrackTitle };

export interface RadioState {
  isPlaying: boolean;
  trackTitle: string;
  volume: number;
}

class ProceduralSoundEngine implements SynthVoiceController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayFilter: BiquadFilterNode | null = null;
  private delayReturnGain: GainNode | null = null;
  private overdriveShaper: WaveShaperNode | null = null;

  // Lush Procedural Convolver Reverb Bus
  private reverbNode: ConvolverNode | null = null;
  private reverbFilter: BiquadFilterNode | null = null;
  private reverbGain: GainNode | null = null;
  private reverbSendNode: GainNode | null = null;

  // Periodic Wave references
  private pulse12Wave: PeriodicWave | null = null;
  private pulse25Wave: PeriodicWave | null = null;
  private pulse50Wave: PeriodicWave | null = null;

  // PRBS Noise Buffers
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private metallicNoiseBuffer: AudioBuffer | null = null;
  private rainNoiseNode: AudioBufferSourceNode | null = null;
  private rainGainNode: GainNode | null = null;

  // Scheduler state
  private isPlaying = false;
  private currentTrackIndex = 0;
  private volume = 0.6;
  private currentStep = 0;
  private nextStepTime = 0;
  private schedulerTimer: number | null = null;
  private meterTimer: number | null = null;
  private listeners: Set<(state: RadioState) => void> = new Set();
  private freqArray: Uint8Array<ArrayBuffer> | null = null;
  private fluxDetector: SpectralFluxDetector = createSpectralFluxDetector({
    minThreshold: 12,
    thresholdMultiplier: 1.35,
  });

  private initContext() {
    if (this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    // Master Output & Musical Soft-Knee Compressor (prevents clipping/distortion)
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.setValueAtTime(-4.0, this.ctx.currentTime);
    this.limiter.knee.setValueAtTime(6.0, this.ctx.currentTime);
    this.limiter.ratio.setValueAtTime(3.5, this.ctx.currentTime);
    this.limiter.attack.setValueAtTime(0.01, this.ctx.currentTime);
    this.limiter.release.setValueAtTime(0.12, this.ctx.currentTime);

    // Spectrum Analyzer for Equalizer & Onset Detection
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyser.smoothingTimeConstant = 0.8;
    this.freqArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.masterGain.connect(this.limiter);
    this.limiter.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.initWaveforms();
    this.initNoiseBuffers();
    this.initShapers();
    this.initEffects();
  }

  // =========================================================================
  // 1. WAVEFORM SYNTHESIS & NOISE GENERATION
  // =========================================================================

  private initWaveforms() {
    if (!this.ctx) return;
    const buildPulse = (duty: number, harmonics = 64): PeriodicWave => {
      const real = new Float32Array(harmonics);
      const imag = new Float32Array(harmonics);
      for (let n = 1; n < harmonics; n++) {
        real[n] = (4 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
        imag[n] = 0;
      }
      return this.ctx!.createPeriodicWave(real, imag, { disableNormalization: false });
    };

    this.pulse12Wave = buildPulse(0.125);
    this.pulse25Wave = buildPulse(0.250);
    this.pulse50Wave = buildPulse(0.500);
  }

  private initNoiseBuffers() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 2; // 2 seconds cyclic buffer

    // Mode 0: 15-bit NES LFSR pseudo-random white noise (tap 1)
    this.whiteNoiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
    const whiteData = this.whiteNoiseBuffer.getChannelData(0);
    let reg0 = 0x7fff;
    for (let i = 0; i < length; i++) {
      const feedback = (reg0 & 1) ^ ((reg0 >> 1) & 1);
      reg0 = (reg0 >> 1) | (feedback << 14);
      whiteData[i] = (reg0 & 1 ? 0.35 : -0.35) * (0.85 + Math.random() * 0.15);
    }

    // Mode 1: 15-bit NES LFSR metallic periodic buzz (tap 6)
    this.metallicNoiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
    const metalData = this.metallicNoiseBuffer.getChannelData(0);
    let reg1 = 0x7fff;
    for (let i = 0; i < length; i++) {
      const feedback = (reg1 & 1) ^ ((reg1 >> 6) & 1);
      reg1 = (reg1 >> 1) | (feedback << 14);
      metalData[i] = reg1 & 1 ? 0.35 : -0.35;
    }
  }

  private initShapers() {
    if (!this.ctx) return;
    const samples = 2048;
    const curve = new Float32Array(samples);
    const k = 4.5;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / (samples - 1) - 1;
      curve[i] = Math.tanh(k * x);
    }
    this.overdriveShaper = this.ctx.createWaveShaper();
    this.overdriveShaper.curve = curve;
  }

  private buildReverbImpulse(duration = 1.6, decay = 2.6): AudioBuffer | null {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = Math.pow(1 - t, decay);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return buffer;
  }

  private sendToReverb(source: AudioNode, amount = 0.25) {
    if (!this.ctx || !this.reverbSendNode) return;
    const send = this.ctx.createGain();
    send.gain.value = amount;
    source.connect(send);
    send.connect(this.reverbSendNode);
  }

  private initEffects() {
    if (!this.ctx || !this.masterGain) return;

    // 1. Procedural Lush Plate Reverb Bus
    const irBuffer = this.buildReverbImpulse(1.6, 2.6);
    if (irBuffer) {
      try {
        this.reverbNode = this.ctx.createConvolver();
        this.reverbNode.buffer = irBuffer;

        this.reverbFilter = this.ctx.createBiquadFilter();
        this.reverbFilter.type = 'lowpass';
        this.reverbFilter.frequency.value = 2400; // Velvety warm damping, zero harsh sizzle

        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0.22; // Cozy parallel wet blend

        this.reverbSendNode = this.ctx.createGain();
        this.reverbSendNode.gain.value = 1.0;

        this.reverbSendNode.connect(this.reverbNode);
        this.reverbNode.connect(this.reverbFilter);
        this.reverbFilter.connect(this.reverbGain);
        this.reverbGain.connect(this.masterGain);
      } catch {
        // Fallback gracefully if convolver is unsupported in older test environment
      }
    }

    // 2. Toby Fox Dreamy Vintage Tape Delay Bus
    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.value = 0.288; // ~104 BPM dotted 8th note delay
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.26;
    this.delayFilter = this.ctx.createBiquadFilter();
    this.delayFilter.type = 'lowpass';
    this.delayFilter.frequency.value = 1800; // Warm analog tape cutoff

    this.delayNode.connect(this.delayFilter);
    this.delayFilter.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayReturnGain = this.ctx.createGain();
    this.delayReturnGain.gain.value = 0.12; // Very soft 12% ambient echo only
    this.delayFilter.connect(this.delayReturnGain);
    this.delayReturnGain.connect(this.masterGain);
  }

  // =========================================================================
  // 2. SYNTHESIZER VOICES (Toby Fox Authentic Sound Design)
  // =========================================================================

  public playPulse(
    time: number,
    freq: number,
    duration: number,
    duty: '12' | '25' | '50' = '25',
    gainLevel = 0.10,
    sendDelay = false
  ) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    if (duty === '12' && this.pulse12Wave) osc.setPeriodicWave(this.pulse12Wave);
    else if (duty === '50' && this.pulse50Wave) osc.setPeriodicWave(this.pulse50Wave);
    else if (this.pulse25Wave) osc.setPeriodicWave(this.pulse25Wave);

    osc.frequency.setValueAtTime(freq, time);

    // Warm Lowpass Filter: softens pulse waves so they sound smooth, mellow, and non-fatiguing
    filter.type = 'lowpass';
    const cutoff = duty === '50' ? 1100 : (duty === '25' ? 1200 : 1350);
    filter.frequency.setValueAtTime(Math.min(cutoff, Math.max(600, freq * 1.5)), time);
    filter.Q.value = 0.7;

    // Toby Fox expressive retro vibrato: for sustained lead notes, apply a gentle 5.0Hz pitch LFO
    if (sendDelay && duration > 0.18) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(5.0, time);
      lfoGain.gain.setValueAtTime(0, time);
      lfoGain.gain.setValueAtTime(0, time + 0.08);
      lfoGain.gain.linearRampToValueAtTime(freq * 0.010, time + 0.22);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(time);
      lfo.stop(time + duration);
    }

    const safeGain = Math.min(gainLevel, 0.12);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(safeGain, time + 0.020); // 20ms smooth attack eliminates clicks
    gain.gain.exponentialRampToValueAtTime(safeGain * 0.70, time + 0.08);
    gain.gain.setValueAtTime(safeGain * 0.70, time + Math.max(0.02, duration - 0.03));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    if (sendDelay && this.delayNode) gain.connect(this.delayNode);
    this.sendToReverb(gain, 0.20);

    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  /**
   * Expressive Toby Fox Wooden Flute / Whistle (Cozy Deltarune Lead Voice).
   * Warm, mellow sine + soft triangle with lowpass warmth, delayed expressive vibrato,
   * and lush reverb wash. Completely eliminates harsh square buzz or grating frequencies.
   */
  public playFlute(time: number, freq: number, duration: number, gainLevel = 0.095, vibrato = true) {
    if (!this.ctx || !this.masterGain) return;

    const oscSine = this.ctx.createOscillator();
    const oscTri = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    oscSine.type = 'sine';
    oscTri.type = 'triangle';
    oscSine.frequency.setValueAtTime(freq, time);
    oscTri.frequency.setValueAtTime(freq, time);

    // Expression / Delayed Vibrato: gentle 4.8Hz vibrato fading in after 100ms
    if (vibrato && duration > 0.18) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(4.8, time);
      lfoGain.gain.setValueAtTime(0, time);
      lfoGain.gain.setValueAtTime(0, time + 0.09);
      lfoGain.gain.linearRampToValueAtTime(freq * 0.009, time + 0.24);
      lfo.connect(lfoGain);
      lfoGain.connect(oscSine.frequency);
      lfoGain.connect(oscTri.frequency);
      lfo.start(time);
      lfo.stop(time + duration);
    }

    // Warm wooden acoustic filter: removes all shrill high frequencies above 1050Hz
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(1050, Math.max(650, freq * 1.4)), time);
    filter.Q.value = 0.75;

    const safeGain = Math.min(gainLevel, 0.12);
    const gSine = this.ctx.createGain();
    gSine.gain.value = 0.75;
    const gTri = this.ctx.createGain();
    gTri.gain.value = 0.25;

    oscSine.connect(gSine);
    oscTri.connect(gTri);
    gSine.connect(filter);
    gTri.connect(filter);

    // Soft breath attack (24ms) completely prevents clicks and harsh transients
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(safeGain, time + 0.024);
    gain.gain.setValueAtTime(safeGain * 0.82, time + Math.max(0.03, duration - 0.04));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    filter.connect(gain);
    gain.connect(this.masterGain);

    // Send into the lush reverb bus for dreamy acoustic body
    this.sendToReverb(gain, 0.25);

    const stopTime = time + duration + 0.04;
    oscSine.start(time);
    oscTri.start(time);
    oscSine.stop(stopTime);
    oscTri.stop(stopTime);
  }

  /**
   * Tok Acoustic Felt Piano / Rhodes Timbre (Toby Fox style).
   * Generates a warm, resonant, full-bodied piano strike:
   * - Sine fundamental + 2nd octave harmonic + subtle 3rd harmonic for woody warmth
   * - 15ms tactile hammer transient ("tok" attack)
   * - Dynamic lowpass filter: starts at ~1250Hz, quickly darkens to ~550Hz
   * - Exponential natural string decay
   * - Lush reverb send for acoustic room bloom
   */
  public playPiano(time: number, freq: number, duration: number, gainLevel = 0.12) {
    if (!this.ctx || !this.masterGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc3.type = 'sine';

    // Tactile felt hammer attack: micro pitch ramp gives satisfying wooden "tok"
    osc1.frequency.setValueAtTime(freq * 1.012, time);
    osc1.frequency.exponentialRampToValueAtTime(freq, time + 0.015);

    osc2.frequency.setValueAtTime(freq * 2.0, time);
    osc3.frequency.setValueAtTime(freq * 3.0, time);

    const safeGain = Math.min(gainLevel, 0.15);

    const g1 = this.ctx.createGain();
    g1.gain.value = 0.72;
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.22;
    const g3 = this.ctx.createGain();
    g3.gain.value = 0.06;

    osc1.connect(g1);
    osc2.connect(g2);
    osc3.connect(g3);

    // Warm felt filter: rounds off treble, eliminates clicks, darkens naturally
    filter.type = 'lowpass';
    const fStart = Math.min(1250, Math.max(650, freq * 2.0));
    const fEnd = Math.min(600, Math.max(320, freq * 1.0));
    filter.frequency.setValueAtTime(fStart, time);
    filter.frequency.exponentialRampToValueAtTime(fEnd, time + Math.min(duration, 0.35));
    filter.Q.value = 0.7;

    g1.connect(filter);
    g2.connect(filter);
    g3.connect(filter);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(safeGain, time + 0.009); // 9ms soft felt hammer strike
    gain.gain.exponentialRampToValueAtTime(safeGain * 0.55, time + 0.10);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    filter.connect(gain);
    gain.connect(this.masterGain);

    // Send to lush procedural reverb (adds rich acoustic room dimension)
    this.sendToReverb(gain, 0.26);

    const stopTime = time + duration + 0.05;
    osc1.start(time);
    osc2.start(time);
    osc3.start(time);

    osc1.stop(stopTime);
    osc2.stop(stopTime);
    osc3.stop(stopTime);
  }

  /**
   * Delicate Music-Box Chime (soft high pure sine with gentle bell decay).
   */
  public playChime(time: number, freq: number, duration: number, gainLevel = 0.04) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    const safeGain = Math.min(gainLevel, 0.06);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(safeGain, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    this.sendToReverb(gain, 0.22);

    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  /**
   * Authentic NES Triangle Wave Sub-Bass (as used in Toby Fox's NES VST setup).
   * Pure, woody, warm bass with zero harsh FM sideband distortion.
   */
  public playTriangleBass(time: number, freq: number, duration: number, gainLevel = 0.24) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    // 240Hz 2nd-order lowpass filter ensures pure, pillowy, grounding sub-bass
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, time);
    filter.Q.value = 0.7;

    const safeGain = Math.min(gainLevel, 0.30);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(safeGain, time + 0.014);
    gain.gain.setValueAtTime(safeGain * 0.85, time + Math.max(0.02, duration - 0.04));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  public playFMBass(time: number, freq: number, duration: number, gainLevel = 0.24) {
    // Forward to authentic NES Triangle Bass for a warm, comfortable acoustic sub
    this.playTriangleBass(time, freq, duration, gainLevel);
  }

  public playOverdriveLead(time: number, freq: number, duration: number, gainLevel = 0.12) {
    if (!this.ctx || !this.masterGain || !this.overdriveShaper) return;
    const osc1 = this.ctx.createOscillator();
    const preGain = this.ctx.createGain();
    const cabFilter = this.ctx.createBiquadFilter();
    const envGain = this.ctx.createGain();

    if (this.pulse25Wave) osc1.setPeriodicWave(this.pulse25Wave);
    osc1.frequency.setValueAtTime(freq, time);

    cabFilter.type = 'lowpass';
    cabFilter.frequency.setValueAtTime(2200, time);
    cabFilter.Q.value = 1.0;

    preGain.gain.value = 1.4;
    envGain.gain.setValueAtTime(0.0001, time);
    envGain.gain.linearRampToValueAtTime(gainLevel, time + 0.016);
    envGain.gain.setValueAtTime(gainLevel * 0.8, time + duration - 0.02);
    envGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc1.connect(preGain);
    preGain.connect(this.overdriveShaper);
    this.overdriveShaper.connect(cabFilter);
    cabFilter.connect(envGain);
    envGain.connect(this.masterGain);
    if (this.delayNode) envGain.connect(this.delayNode);

    osc1.start(time);
    osc1.stop(time + duration);
  }

  public playWarmPad(time: number, freqs: number[], duration: number, gainLevel = 0.08) {
    if (!this.ctx || !this.masterGain) return;
    const perOscGain = (gainLevel / freqs.length) * 0.8;

    freqs.forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      // Triangle pad gives that warm, mellow Rhodes / Mellotron tape blanket
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(560, time);
      filter.Q.value = 0.8;

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(perOscGain, time + 0.22);
      gain.gain.setValueAtTime(perOscGain, time + Math.max(0.05, duration - 0.08));
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      if (this.delayNode) gain.connect(this.delayNode);
      this.sendToReverb(gain, 0.30);

      osc.start(time);
      osc.stop(time + duration + 0.16);
    });
  }

  // =========================================================================
  // 3. MELLOW PERCUSSION SYNTHESIS (Gentle Pillow Drums)
  // =========================================================================

  public playKick(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(85, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(130, time);

    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.18);
  }

  public playSnare(time: number) {
    if (!this.ctx || !this.masterGain || !this.whiteNoiseBuffer) return;

    // Gentle brushed tape tap
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.whiteNoiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, time);
    filter.Q.value = 1.0;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    this.sendToReverb(noiseGain, 0.16);

    noiseSource.start(time);
    noiseSource.stop(time + 0.10);
  }

  public playHiHat(time: number, isOpen = false) {
    if (!this.ctx || !this.masterGain || !this.whiteNoiseBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.whiteNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4500, time);
    filter.Q.value = 1.0;

    const gain = this.ctx.createGain();
    const dur = isOpen ? 0.12 : 0.035;
    gain.gain.setValueAtTime(isOpen ? 0.045 : 0.03, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(time);
    source.stop(time + dur + 0.01);
  }

  public playMetallicZap(time: number, duration = 0.04) {
    if (!this.ctx || !this.masterGain || !this.metallicNoiseBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.metallicNoiseBuffer;
    const gain = this.ctx.createGain();

    gain.gain.setValueAtTime(0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    source.connect(gain);
    gain.connect(this.masterGain);

    source.start(time);
    source.stop(time + duration);
  }

  // =========================================================================
  // 4. LOOKAHEAD SCHEDULING PATTERNS
  // =========================================================================

  private scheduleTrackStep(trackIdx: number, step: number, time: number) {
    const config = TRACK_CONFIGS[trackIdx];
    if (config) {
      config.scheduleStep(step, time, this);
    }
  }

  private startMusicLoop() {
    this.stopMusicLoop();
    if (!this.ctx) return;

    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;

    const config = TRACK_CONFIGS[this.currentTrackIndex];
    if (config?.hasRainNoise) {
      this.startRainNoise();
    } else {
      this.stopRainNoise();
    }

    const scheduleLoop = () => {
      if (!this.isPlaying || !this.ctx) return;

      const currentConfig = TRACK_CONFIGS[this.currentTrackIndex];
      const tempo = currentConfig ? currentConfig.tempo : 128.0;
      const secondsPerStep = currentConfig?.stepDuration ?? ((60.0 / tempo) / 4.0);

      // Prevent timestamp drift / burst-fire if audio context resumes or lags
      if (this.nextStepTime < this.ctx.currentTime) {
        this.nextStepTime = this.ctx.currentTime + 0.01;
      }

      // Lookahead window: schedule up to 120ms into the future
      while (this.nextStepTime < this.ctx.currentTime + 0.12) {
        this.scheduleTrackStep(this.currentTrackIndex, this.currentStep, this.nextStepTime);
        this.nextStepTime += secondsPerStep;
        this.currentStep++;
      }

      this.schedulerTimer = window.setTimeout(scheduleLoop, 25);
    };

    scheduleLoop();

    // Dedicated internal meter loop: ensures Dixon onset detection fires continuously during playback
    // even if no visualizer widget is currently mounted or polling.
    const meterLoop = () => {
      if (!this.isPlaying || !this.analyser || !this.freqArray) return;
      this.analyser.getByteFrequencyData(this.freqArray);
      const onsetRes = this.fluxDetector.processFrame(this.freqArray);
      if (onsetRes.isOnset) {
        studioEvents.emit('pixibun:audio-onset', {
          flux: onsetRes.flux,
          timestamp: Date.now(),
        });
      }
      this.meterTimer = window.setTimeout(meterLoop, 40);
    };
    this.meterTimer = window.setTimeout(meterLoop, 40);
  }

  private stopMusicLoop() {
    if (this.schedulerTimer !== null) {
      window.clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.meterTimer !== null) {
      window.clearTimeout(this.meterTimer);
      this.meterTimer = null;
    }
    this.stopRainNoise();
  }

  private startRainNoise() {
    if (!this.ctx || !this.masterGain || this.rainNoiseNode || !this.whiteNoiseBuffer) return;
    this.rainNoiseNode = this.ctx.createBufferSource();
    this.rainNoiseNode.buffer = this.whiteNoiseBuffer;
    this.rainNoiseNode.loop = true;

    // Warm vinyl rain crackle: soft 520Hz cutoff creates relaxing fireplace/rain mood
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, this.ctx.currentTime);

    this.rainGainNode = this.ctx.createGain();
    this.rainGainNode.gain.setValueAtTime(0.032, this.ctx.currentTime);

    this.rainNoiseNode.connect(filter);
    filter.connect(this.rainGainNode);
    this.rainGainNode.connect(this.masterGain);
    this.rainNoiseNode.start();
  }

  private stopRainNoise() {
    if (this.rainNoiseNode) {
      try {
        this.rainNoiseNode.stop();
        this.rainNoiseNode.disconnect();
      } catch {
        // Ignore audio disconnection errors
      }
      this.rainNoiseNode = null;
    }
    if (this.rainGainNode) {
      this.rainGainNode.disconnect();
      this.rainGainNode = null;
    }
  }

  // =========================================================================
  // 5. PUBLIC API & STATE
  // =========================================================================

  public async play(): Promise<void> {
    this.initContext();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.isPlaying = true;
    this.startMusicLoop();
    this.notify();
  }

  public async pause(): Promise<void> {
    this.isPlaying = false;
    this.stopMusicLoop();
    this.fluxDetector.reset();
    if (this.ctx && this.ctx.state === 'running') {
      try {
        await this.ctx.suspend();
      } catch {
        // Ignore transition error
      }
    }
    this.notify();
  }

  public toggle(): void {
    if (this.isPlaying) {
      void this.pause();
    } else {
      void this.play();
    }
  }

  public nextTrack(): void {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % TRACKS.length;
    this.fluxDetector.reset();
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
   * Returns normalized [0..1] values for 4 equalizer bands and broadcasts
   * real-time spectral-flux deltas as musical transients.
   */
  public getEqualizerLevels(): [number, number, number, number] {
    if (!this.isPlaying || !this.analyser || !this.freqArray) {
      return [0.05, 0.05, 0.05, 0.05];
    }
    this.analyser.getByteFrequencyData(this.freqArray);

    // Simon Dixon 2006 Spectral-flux onset transient detection
    const onsetRes = this.fluxDetector.processFrame(this.freqArray);
    if (onsetRes.isOnset) {
      studioEvents.emit('pixibun:audio-onset', {
        flux: onsetRes.flux,
        timestamp: Date.now(),
      });
    }

    // Sample 4 buckets across low to high mid
    const b0 = (this.freqArray[1] || 0) / 255;
    const b1 = (this.freqArray[3] || 0) / 255;
    const b2 = (this.freqArray[6] || 0) / 255;
    const b3 = (this.freqArray[9] || 0) / 255;

    return [
      Math.max(0.08, Math.min(1.0, b0)),
      Math.max(0.08, Math.min(1.0, b1)),
      Math.max(0.08, Math.min(1.0, b2)),
      Math.max(0.08, Math.min(1.0, b3)),
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

export const lofiRadio = new ProceduralSoundEngine();
