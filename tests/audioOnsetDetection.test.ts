import { describe, it, expect } from 'vitest';
import { createSpectralFluxDetector } from '@/lib/audio/spectralFlux';

describe('Phase 36.3: Spectral-Flux Audio Onset Detection (Dixon 2006, Bello 2005)', () => {
  it('identifies known sudden energy spikes as musical onsets', () => {
    const numBins = 32;
    const detector = createSpectralFluxDetector({
      windowSize: 8,
      thresholdMultiplier: 1.3,
      minThreshold: 15,
      refractoryFrames: 3,
    });

    const numFrames = 50;
    const knownOnsetFrames = [10, 25, 40];
    const detectedOnsets: number[] = [];

    for (let frame = 0; frame < numFrames; frame++) {
      const spectrum = new Uint8Array(numBins);

      if (knownOnsetFrames.includes(frame)) {
        // Sudden transient strike (high energy burst across spectrum)
        spectrum.fill(200);
      } else if (knownOnsetFrames.some((on) => frame > on && frame <= on + 3)) {
        // Exponential decay of the strike (200 -> 120 -> 60 -> 20)
        const age = Math.min(...knownOnsetFrames.filter((on) => on < frame).map((on) => frame - on));
        const decayVal = Math.max(15, Math.round(200 * Math.exp(-age * 0.8)));
        spectrum.fill(decayVal);
      } else {
        // Quiet background noise floor (10-15)
        spectrum.fill(12);
      }

      const res = detector.processFrame(spectrum);
      if (res.isOnset) {
        detectedOnsets.push(frame);
      }
    }

    // Every known onset must be detected
    for (const expected of knownOnsetFrames) {
      const matched = detectedOnsets.some((actual) => Math.abs(actual - expected) <= 1);
      expect(matched).toBe(true);
    }

    // There should be no spurious false positive onsets during decaying notes or quiet floor
    expect(detectedOnsets.length).toBe(knownOnsetFrames.length);
  });

  it('rejects constant amplitude tones with zero false positives', () => {
    const detector = createSpectralFluxDetector({ minThreshold: 10 });
    const numBins = 32;
    const spectrum = new Uint8Array(numBins);
    spectrum.fill(180); // Constant sustained high energy

    let onsets = 0;
    for (let i = 0; i < 30; i++) {
      const res = detector.processFrame(spectrum);
      if (res.isOnset) onsets++;
    }

    // Because energy is constant (delta = 0), flux = 0, no onsets can occur
    expect(onsets).toBe(0);
  });

  it('ignores note release / energy decay phases via half-wave rectification', () => {
    const detector = createSpectralFluxDetector({ minThreshold: 10 });
    const numBins = 16;

    // First frame high energy
    const initial = new Uint8Array(numBins);
    initial.fill(240);
    detector.processFrame(initial);

    // Subsequent decaying frames
    let onsets = 0;
    for (let level = 220; level >= 20; level -= 20) {
      const decay = new Uint8Array(numBins);
      decay.fill(level);
      const res = detector.processFrame(decay);
      expect(res.flux).toBe(0); // All deltas are negative, half-wave rectified to 0
      if (res.isOnset) onsets++;
    }

    expect(onsets).toBe(0);
  });

  it('cleanly resets historical state with reset()', () => {
    const detector = createSpectralFluxDetector({ minThreshold: 10 });
    const high = new Uint8Array(16).fill(250);
    detector.processFrame(high);

    detector.reset();

    // After reset, first frame is treated as baseline
    const res = detector.processFrame(high);
    expect(res.flux).toBe(0);
    expect(res.isOnset).toBe(false);
  });
});
