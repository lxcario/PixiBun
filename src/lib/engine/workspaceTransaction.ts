import { useStudioStore } from '@/stores/studioStore';
import { snapshotBuffers, replaceAllBuffers } from './bufferRegistry';
import { getGlobalHistoryEngine } from './historyEngine';
import { publishWorkspace } from './publicationScope';

/**
 * Commit staged raster ownership, immutable metadata and history together.
 * Callers must stage new canvases rather than modifying existing live pixels.
 * Only synchronous work belongs here; workers and allocation run before commit.
 */
export function commitWorkspace<T>(operation: () => T): T {
  return publishWorkspace(() => {
    const previousState = useStudioStore.getState();
    const previousBuffers = snapshotBuffers();
    const execute = () => {
      try { return operation(); }
      catch (error) {
        replaceAllBuffers(previousBuffers);
        useStudioStore.setState(previousState, true);
        throw error;
      }
    };
    const history = getGlobalHistoryEngine();
    return history ? history.transaction(execute) : execute();
  });
}
