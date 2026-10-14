type RestartPreparation = () => Promise<void>;
let prepareStudio: RestartPreparation | null = null;

/** The active Studio supplies its real save operation; landing pages need no save. */
export function registerRestartPreparation(prepare: RestartPreparation): () => void {
  prepareStudio = prepare;
  return () => { if (prepareStudio === prepare) prepareStudio = null; };
}
export async function prepareAppRestart(): Promise<void> {
  if (!prepareStudio && window.location.pathname === '/studio') {
    throw new Error('The studio is still loading. Try restarting once your drawing is ready.');
  }
  await prepareStudio?.();
}
export function reloadAppPage() { window.location.reload(); }
