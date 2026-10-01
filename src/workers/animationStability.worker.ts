import { analyzeAnimationStability, type StabilityInput } from '@/lib/animation/stabilityAnalysis';

self.onmessage = (event: MessageEvent<StabilityInput>) => {
  try {
    const transitions = analyzeAnimationStability(event.data);
    self.postMessage({ transitions }, { transfer: transitions.map(t => t.difference.buffer as ArrayBuffer) });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
