import { useStudioStore } from '@/stores/studioStore';
import { getBufferGeneration, getBufferRevision } from './bufferRegistry';

/** Bind compute results to the initiating document, pose, layer and source pixels. */
export function workspaceJobKey(layerIds: readonly string[]): string {
  const state = useStudioStore.getState();
  const frame = state.frames[state.activeFrameIndex];
  return JSON.stringify([state.currentProjectId, state.canvasWidth, state.canvasHeight,
    state.editRevision, frame?.id, state.activeLayerId,
    layerIds.map(id => {
      const owner = state.frames.find(candidate => candidate.layers.some(layer => layer.id === id));
      return [id, getBufferGeneration(id), getBufferRevision(id), owner?.id,
        owner?.layers.find(layer => layer.id === id)];
    })]);
}

export interface WorkspaceJob {
  signal: AbortSignal;
  check(): void;
  cancel(): void;
  dispose(): void;
}

/**
 * Observe source ownership during work, forward cancellation to the worker, and
 * check again immediately before publishing. Caller releases allocations in finally.
 */
export function beginWorkspaceJob(layerIds: readonly string[], externalSignal?: AbortSignal,
  readKey: () => string = () => workspaceJobKey(layerIds)): WorkspaceJob {
  const controller = new AbortController(), key = readKey();
  let disposed = false;
  const dispose = () => {
    if (disposed) return; disposed = true;
    unsubscribe(); externalSignal?.removeEventListener('abort', externalAbort);
  };
  const cancel = () => {
    controller.abort(new DOMException('Workspace job cancelled.', 'AbortError'));
    dispose();
  };
  const externalAbort = () => { controller.abort(externalSignal?.reason); dispose(); };
  const check = () => {
    if (controller.signal.aborted) throw controller.signal.reason;
    if (key !== readKey()) {
      controller.abort(new DOMException('Artwork changed during computation. No result was applied.', 'AbortError'));
      dispose();
      throw controller.signal.reason;
    }
  };
  const unsubscribe = useStudioStore.subscribe(() => {
    // Aborting the worker is expected control flow; do not throw from a subscriber.
    try { check(); } catch { /* The operation receives this through its signal/check. */ }
  });
  externalSignal?.addEventListener('abort', externalAbort, { once: true });
  if (externalSignal?.aborted) externalAbort();
  const state = useStudioStore.getState();
  if (layerIds.some(id => !state.frames.some(frame => frame.layers.some(layer => layer.id === id)))) cancel();
  return { signal: controller.signal, check, cancel, dispose };
}
