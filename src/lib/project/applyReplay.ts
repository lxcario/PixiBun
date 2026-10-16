import { performFloodFill } from '@/lib/canvas/floodFill';
import { applyHistoryEdit } from '@/lib/engine/historyEdit';
import { getGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { useStudioStore } from '@/stores/studioStore';
import { describeReplayStep, replayStepPoints, type ReplayScript, type ReplayStep } from './replayLink';

export type ReplayResult =
  | { ok: true; steps: number }
  /** `applied` steps stayed on the canvas and in Undo before step `failedStep` (1-based) failed. */
  | { ok: false; applied: number; failedStep: number; error: string };

const HISTORY_WAIT_MS = 5000;

/** The viewport registers the Undo history when it mounts; replay steps need it to be undoable. */
async function waitForHistory(signal?: AbortSignal): Promise<boolean> {
  const deadline = performance.now() + HISTORY_WAIT_MS;
  while (!getGlobalHistoryEngine()) {
    if (signal?.aborted || performance.now() > deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  return !signal?.aborted;
}

function applyStep(step: ReplayStep, script: ReplayScript): string | null {
  const studio = useStudioStore.getState();
  if (step.kind === 'add-layer') {
    const before = studio.frames[studio.activeFrameIndex]?.layers.length ?? 0;
    studio.addLayer();
    const after = useStudioStore.getState();
    return (after.frames[after.activeFrameIndex]?.layers.length ?? 0) > before ? null : 'The layer could not be added.';
  }
  if (step.kind === 'add-frame') {
    const before = studio.frames.length;
    studio.addFrame();
    return useStudioStore.getState().frames.length > before ? null : 'The frame could not be added.';
  }
  const { width, height } = script;
  const result = applyHistoryEdit(describeReplayStep(step), (ctx) => {
    ctx.imageSmoothingEnabled = false;
    if (step.kind === 'fill') {
      performFloodFill(ctx, step.at.x, step.at.y, script.palette[step.color], true, 0, false, null);
      return;
    }
    const points = replayStepPoints(step, width, height);
    if (step.kind === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000000';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = script.palette[step.color];
    }
    for (const point of points) ctx.fillRect(point.x, point.y, 1, 1);
  });
  return result.ok ? null : result.error;
}

/**
 * Applies a parsed replay to the open drawing, each step as its own Undo step,
 * on the active layer of the active frame. Stops at the first step that fails.
 */
export async function applyReplay(script: ReplayScript, signal?: AbortSignal): Promise<ReplayResult> {
  if (!await waitForHistory(signal)) {
    return { ok: false, applied: 0, failedStep: 1, error: 'The canvas was not ready for the replay.' };
  }
  const studio = useStudioStore.getState();
  if (studio.canvasWidth !== script.width || studio.canvasHeight !== script.height) {
    return { ok: false, applied: 0, failedStep: 1, error: 'The drawing changed before the replay could start.' };
  }
  for (let index = 0; index < script.steps.length; index++) {
    if (signal?.aborted) return { ok: false, applied: index, failedStep: index + 1, error: 'The replay was interrupted.' };
    const error = applyStep(script.steps[index], script);
    if (error) return { ok: false, applied: index, failedStep: index + 1, error };
  }
  return { ok: true, steps: script.steps.length };
}
