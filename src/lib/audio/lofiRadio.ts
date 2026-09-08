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
  private overdriveShaper: WaveShaperNode | null = null;

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

    // Master Output & Brickwall Limiter
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
    this.limiter.knee.setValueAtTime(0.0, this.ctx.currentTime);
    this.limiter.ratio.setValueAtTime(20.0, this.ctx.currentTime);
    this.limiter.attack.setValueAtTime(0.002, this.ctx.currentTime);
    this.limiter.release.setValueAtTime(0.05, this.ctx.currentTime);

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

  private initEffects() {
    if (!this.ctx || !this.masterGain) return;
    // Dotted-8th delay bus
    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.value = 0.214; // ~140 BPM 8th
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.32;
    this.delayFilter = this.ctx.createBiquadFilter();
    this.delayFilter.type = 'lowpass';
    this.delayFilter.frequency.value = 3400;

    this.delayNode.connect(this.delayFilter);
    this.delayFilter.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayFilter.connect(this.masterGain);
  }

  // =========================================================================
  // 2. SYNTHESIZER VOICES
  // =========================================================================

  public playPulse(
    time: number,
    freq: number,
    duration: number,
    duty: '12' | '25' | '50' = '25',
    gainLevel = 0.22,
    sendDelay = false
  ) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (duty === '12' && this.pulse12Wave) osc.setPeriodicWave(this.pulse12Wave);
    else if (duty === '50' && this.pulse50Wave) osc.setPeriodicWave(this.pulse50Wave);
    else if (this.pulse25Wave) osc.setPeriodicWave(this.pulse25Wave);

    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(gainLevel, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(gainLevel * 0.7, time + 0.04);
    gain.gain.setValueAtTime(gainLevel * 0.7, time + duration - 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    if (sendDelay && this.delayNode) gain.connect(this.delayNode);

    osc.start(time);
    osc.stop(time + duration);
  }

  public playFMBass(time: number, freq: number, duration: number, gainLevel = 0.38) {
    if (!this.ctx || !this.masterGain) return;
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const carrierGain = this.ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, time);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(freq, time);

    // Modulation index decay for punchy transient
    const peakMod = freq * 3.2;
    modGain.gain.setValueAtTime(peakMod, time);
    modGain.gain.exponentialRampToValueAtTime(freq * 0.15, time + 0.08);
    modGain.gain.exponentialRampToValueAtTime(1.0, time + duration);

    carrierGain.gain.setValueAtTime(0.0001, time);
    carrierGain.gain.linearRampToValueAtTime(gainLevel, time + 0.005);
    carrierGain.gain.exponentialRampToValueAtTime(gainLevel * 0.8, time + 0.05);
    carrierGain.gain.setValueAtTime(gainLevel * 0.8, time + duration - 0.01);
    carrierGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(carrierGain);
    carrierGain.connect(this.masterGain);

    modulator.start(time);
    carrier.start(time);
    modulator.stop(time + duration);
    carrier.stop(time + duration);
  }

  public playOverdriveLead(time: number, freq: number, duration: number, gainLevel = 0.2) {
    if (!this.ctx || !this.masterGain || !this.overdriveShaper) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const preGain = this.ctx.createGain();
    const cabFilter = this.ctx.createBiquadFilter();
    const envGain = this.ctx.createGain();

    if (this.pulse25Wave) osc1.setPeriodicWave(this.pulse25Wave);
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq, time);
    osc2.detune.setValueAtTime(-10, time);

    cabFilter.type = 'lowpass';
    cabFilter.frequency.setValueAtTime(3600, time);
    cabFilter.Q.value = 2.0;

    preGain.gain.value = 2.4;
    envGain.gain.setValueAtTime(0.0001, time);
    envGain.gain.linearRampToValueAtTime(gainLevel, time + 0.008);
    envGain.gain.setValueAtTime(gainLevel * 0.85, time + duration - 0.02);
    envGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc1.connect(preGain);
    osc2.connect(preGain);
    preGain.connect(this.overdriveShaper);
    this.overdriveShaper.connect(cabFilter);
    cabFilter.connect(envGain);
    envGain.connect(this.masterGain);
    if (this.delayNode) envGain.connect(this.delayNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
  }

  public playWarmPad(time: number, freqs: number[], duration: number, gainLevel = 0.12) {
    if (!this.ctx || !this.masterGain) return;
    const perOscGain = gainLevel / freqs.length;

    freqs.forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, time);
      osc2.frequency.setValueAtTime(freq, time);

      osc1.detune.setValueAtTime(+8, time);
      osc2.detune.setValueAtTime(-8, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, time);
      filter.Q.value = 1.0;

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(perOscGain, time + 0.15);
      gain.gain.setValueAtTime(perOscGain, time + duration - 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.1);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + duration + 0.12);
      osc2.stop(time + duration + 0.12);
    });
  }

  // =========================================================================
  // 3. PERCUSSION SYNTHESIS
  // =========================================================================

  public playKick(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.05);

    gain.gain.setValueAtTime(0.85, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  public playSnare(time: number) {
    if (!this.ctx || !this.masterGain || !this.whiteNoiseBuffer) return;

    // Tonal punch
    const bodyOsc = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    bodyOsc.frequency.setValueAtTime(220, time);
    bodyOsc.frequency.exponentialRampToValueAtTime(70, time + 0.03);
    bodyGain.gain.setValueAtTime(0.55, time);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(this.masterGain);

    // Gated noise shell
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.whiteNoiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, time);
    filter.Q.value = 1.2;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, time);
    noiseGain.gain.setValueAtTime(0.35, time + 0.06);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    bodyOsc.start(time);
    noiseSource.start(time);
    bodyOsc.stop(time + 0.09);
    noiseSource.stop(time + 0.12);
  }

  public playHiHat(time: number, isOpen = false) {
    if (!this.ctx || !this.masterGain || !this.whiteNoiseBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.whiteNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time);
    filter.Q.value = 2.0;

    const gain = this.ctx.createGain();
    const dur = isOpen ? 0.25 : 0.04;
    gain.gain.setValueAtTime(0.32, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(time);
    source.stop(time + dur + 0.01);
  }

  public playMetallicZap(time: number, duration = 0.06) {
    if (!this.ctx || !this.masterGain || !this.metallicNoiseBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.metallicNoiseBuffer;
    const gain = this.ctx.createGain();

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

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
      const secondsPer16th = (60.0 / tempo) / 4.0;

      // Lookahead window: schedule up to 120ms into the future
      while (this.nextStepTime < this.ctx.currentTime + 0.12) {
        this.scheduleTrackStep(this.currentTrackIndex, this.currentStep, this.nextStepTime);
        this.nextStepTime += secondsPer16th;
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

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, this.ctx.currentTime);

    this.rainGainNode = this.ctx.createGain();
    this.rainGainNode.gain.setValueAtTime(0.07, this.ctx.currentTime);

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
