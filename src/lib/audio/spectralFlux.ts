/**
 * Half-Wave Rectified Spectral Flux Audio Onset Detector.
 *
 * Academic Citations:
 * - Simon Dixon, "Onset Detection Revisited," Proceedings of the 9th International
 *   Conference on Digital Audio Effects (DAFx-06), Montreal, Canada, 2006.
 * - Juan Pablo Bello, Laurent Daudet, Samer Abdallah, Chris Duxbury, Mike Davies,
 *   Mark Sandler, "A Tutorial on Onset Detection in Music Signals," IEEE Transactions
 *   on Speech and Audio Processing, Vol. 13, No. 5, pp. 1035-1047, 2005.
 *
 * Computes sub-band half-wave rectified spectral energy deltas across successive FFT
 * frames and applies adaptive sliding-window thresholding to identify note attacks,
 * percussion hits, and chord changes in real-time with zero latency.
 */

export interface SpectralFluxOptions {
  windowSize?: number; // Sliding window size for local moving average (default: 10)
  thresholdMultiplier?: number; // Multiplier above moving average to register onset (default: 1.4)
  minThreshold?: number; // Absolute minimum flux threshold floor (default: 12)
  refractoryFrames?: number; // Minimum frame gap between consecutive onsets (default: 3)
}

export interface SpectralFluxResult {
  flux: number;
  threshold: number;
  isOnset: boolean;
}

export interface SpectralFluxDetector {
  processFrame(spectrum: Uint8Array | number[] | Float32Array): SpectralFluxResult;
  reset(): void;
}

/**
 * Creates a real-time spectral-flux onset detector instance.
 */
export function createSpectralFluxDetector(
  options: SpectralFluxOptions = {}
): SpectralFluxDetector {
  const windowSize = Math.max(3, options.windowSize ?? 10);
  const thresholdMultiplier = Math.max(1.0, options.thresholdMultiplier ?? 1.4);
  const minThreshold = Math.max(0, options.minThreshold ?? 12);
  const refractoryFrames = Math.max(1, options.refractoryFrames ?? 3);

  let prevSpectrum: Float32Array | null = null;
  const fluxHistory: number[] = [];
  let prevFlux = 0;
  let framesSinceLastOnset = refractoryFrames;

  return {
    processFrame(spectrum: Uint8Array | number[] | Float32Array): SpectralFluxResult {
      const len = spectrum.length;
      if (!prevSpectrum || prevSpectrum.length !== len) {
        prevSpectrum = new Float32Array(len);
        for (let i = 0; i < len; i++) {
          prevSpectrum[i] = spectrum[i];
        }
        return { flux: 0, threshold: minThreshold, isOnset: false };
      }

      // 1. Calculate Half-Wave Rectified Spectral Flux:
      // SF = sum_k ( max(0, X(t, k) - X(t-1, k)) )
      let flux = 0;
      for (let i = 0; i < len; i++) {
        const val = spectrum[i];
        const diff = val - prevSpectrum[i];
        if (diff > 0) {
          flux += diff;
        }
        prevSpectrum[i] = val;
      }

      // 2. Sliding window moving average for adaptive thresholding
      fluxHistory.push(flux);
      if (fluxHistory.length > windowSize) {
        fluxHistory.shift();
      }

      const meanFlux = fluxHistory.reduce((acc, v) => acc + v, 0) / fluxHistory.length;
      const adaptiveThreshold = Math.max(minThreshold, meanFlux * thresholdMultiplier);

      // 3. Peak-picking and refractory condition:
      // Current flux must exceed adaptive threshold, be rising (local attack),
      // and meet minimum refractory cooldown period.
      const isPeak = flux > prevFlux && flux >= adaptiveThreshold;
      const cooldownPassed = framesSinceLastOnset >= refractoryFrames;

      const isOnset = isPeak && cooldownPassed;

      if (isOnset) {
        framesSinceLastOnset = 0;
      } else {
        framesSinceLastOnset++;
      }

      prevFlux = flux;

      return {
        flux,
        threshold: adaptiveThreshold,
        isOnset,
      };
    },

    reset(): void {
      prevSpectrum = null;
      fluxHistory.length = 0;
      prevFlux = 0;
      framesSinceLastOnset = refractoryFrames;
    },
  };
}
