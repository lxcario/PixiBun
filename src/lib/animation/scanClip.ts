import { useStudioStore } from '@/stores/studioStore';
import { getBufferGeneration, getBufferRevision } from '@/lib/engine/bufferRegistry';
import { compositeFrame } from '@/lib/render/compositor';
import { reserveMemory } from '@/lib/safety/memoryBudget';
import { analyzeAnimationStability, validateStabilitySize, type StabilityInput, type StabilityTransition } from './stabilityAnalysis';
import type { AnimationClip } from '@/types/animation';

export interface ClipReviewReport extends StabilityInput {
  key: string;
  clipId: string;
  signatures: string[];
  transitions: StabilityTransition[];
  dispose: () => void;
}

/** Includes raster identities, timing and visual metadata; navigation and accepted marks are excluded. */
export function clipReviewKey(clip: AnimationClip): string {
  const s = useStudioStore.getState();
  return JSON.stringify([s.currentProjectId, s.canvasWidth, s.canvasHeight, clip.id, clip.startFrame, clip.endFrame,
    clip.loopMode, clip.review?.regions ?? [], s.frames.slice(clip.startFrame, clip.endFrame + 1).map(f =>
      [f.id, f.durationMs, f.layers.map(l => [l.id, l.visible, l.opacity, l.blendMode, getBufferGeneration(l.id), getBufferRevision(l.id)])])]);
}

let workerBusy = false;
export async function runStabilityWorker(input: StabilityInput, signal?: AbortSignal): Promise<StabilityTransition[]> {
  if (signal?.aborted) throw new Error('Animation scan cancelled.');
  if (workerBusy) throw new Error('Another animation scan is running. Cancel it before retrying.');
  validateStabilitySize(input.width, input.height, input.frames.length);
  // Browser-less small fallback supports deterministic tests; large scans require a worker.
  if (typeof Worker === 'undefined') {
    if (input.width * input.height * input.frames.length > 8192) throw new Error('A worker is required for this animation scan.');
    return analyzeAnimationStability(input);
  }
  workerBusy = true;
  let worker: Worker | undefined;
  try {
    return await new Promise<StabilityTransition[]>((resolve, reject) => {
      const finish = (result?: StabilityTransition[], error?: Error) => {
        clearTimeout(timer); signal?.removeEventListener('abort', abort); worker?.terminate();
        if (error) reject(error); else resolve(result!);
      };
      const abort = () => finish(undefined, new Error('Animation scan cancelled.'));
      const timer = setTimeout(() => finish(undefined, new Error('Animation scan timed out. Choose a shorter clip.')), 30_000);
      signal?.addEventListener('abort', abort, { once: true });
      try {
        worker = new Worker(new URL('../../workers/animationStability.worker.ts', import.meta.url), { type: 'module' });
        worker.onerror = event => {
          console.error('Animation review worker failed:', event.message);
          finish(undefined, new Error('Animation scan failed. Your artwork is unchanged.'));
        };
        worker.onmessage = (event: MessageEvent<{ transitions?: StabilityTransition[]; error?: string }>) => {
          if (event.data.error) finish(undefined, new Error(event.data.error));
          else if (Array.isArray(event.data.transitions)) finish(event.data.transitions);
          else finish(undefined, new Error('Animation scan returned an invalid result.'));
        };
        const copy = { ...input, frames: input.frames.map(f => ({ ...f, data: new Uint8ClampedArray(f.data) })) };
        worker.postMessage(copy, copy.frames.map(f => f.data.buffer));
      } catch (error) { finish(undefined, error instanceof Error ? error : new Error(String(error))); }
    });
  } finally { worker?.terminate(); workerBusy = false; }
}

const digest = async (data: Uint8Array): Promise<string> => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data as Uint8Array<ArrayBuffer>)), b => b.toString(16).padStart(2, '0')).join('');

export async function scanAnimationClip(clip: AnimationClip, alignMotion: boolean, loop: boolean, signal?: AbortSignal): Promise<ClipReviewReport> {
  if (signal?.aborted) throw new Error('Animation scan cancelled.');
  const state = useStudioStore.getState();
  const { canvasWidth: width, canvasHeight: height } = state;
  const count = clip.endFrame - clip.startFrame + 1;
  validateStabilitySize(width, height, count);
  const key = clipReviewKey(clip);
  // Includes snapshots, transfer copies, masks, queues, color sets, and diff images.
  // The conservative lease stays held while the comparison report retains pixels.
  const dispose = reserveMemory(width * height * (count * 128 + 8), 'Animation review');
  const check = () => {
    if (signal?.aborted) throw new Error('Animation scan cancelled.');
    const current = useStudioStore.getState().clips.find(c => c.id === clip.id);
    if (!current || clipReviewKey(current) !== key) throw new Error('Artwork or review regions changed. Scan again.');
  };
  try {
    const frames: StabilityInput['frames'] = [];
    const hashes: string[] = [];
    const scratch = document.createElement('canvas');
    for (let index = clip.startFrame; index <= clip.endFrame; index++) {
      check();
      const canvas = compositeFrame(state.frames, index, width, height, {}, scratch);
      const data = canvas?.getContext('2d')?.getImageData(0, 0, width, height).data;
      if (!data) throw new Error('Could not read the frame for review.');
      const frame = state.frames[index];
      frames.push({ id: frame.id, index, durationMs: frame.durationMs, data });
      hashes.push(await digest(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)));
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    check();
    const input: StabilityInput = { width, height, frames, regions: structuredClone(clip.review?.regions ?? []), alignMotion, loop };
    const transitions = await runStabilityWorker(input, signal);
    const signatures = await Promise.all(transitions.map(t => {
      // Reversal cues also depend on the next pose and its motion alignment.
      // Bind that context so a changed following frame cannot retain an old judgment.
      const following = transitions.find(next => next.from === t.to);
      const context = following ? [frames[following.to].id, frames[following.to].durationMs, hashes[following.to]] : null;
      return digest(new TextEncoder().encode(JSON.stringify([
        'animation-review-v2', width, height, frames[t.from].id, frames[t.to].id, frames[t.from].durationMs, frames[t.to].durationMs,
        hashes[t.from], hashes[t.to], context, input.regions, alignMotion, loop,
      ])));
    }));
    check();
    return { ...input, clipId: clip.id, key, transitions, signatures, dispose };
  } catch (error) { dispose(); throw error; }
}
