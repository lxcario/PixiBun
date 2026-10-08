/** Synchronous publication boundary. No store or raster dependencies. */
type Notification = () => void;
let pending: Map<object, { previous: unknown; notify: Notification }> | null = null;

function deliver(notification: Notification): void {
  try { notification(); }
  catch (error) {
    // An observer cannot undo a committed edit or prevent other observers running.
    try { console.error('Studio observer failed after workspace publication', error); } catch { /* Reporting cannot change the commit outcome. */ }
    void import('@/lib/diagnostics/capture')
      .then(({ captureDiagnostic }) => captureDiagnostic({ kind: 'error', message: 'Studio observer failed after workspace publication', detail: error instanceof Error ? error.message : 'Unknown observer error' }))
      .catch(() => {});
  }
}

export function deferWorkspaceNotification<T>(listener: (state: T, previous: T) => void, state: T, previous: T): boolean {
  if (pending) {
    const initial = (pending.get(listener)?.previous ?? previous) as T;
    pending.set(listener, { previous: initial, notify: () => listener(state, initial) });
    return true;
  }
  return false;
}

export function forgetWorkspaceNotification(key: object): void { pending?.delete(key); }

/** Nested edits join the outer boundary; failed edits publish no intermediate states. */
export function publishWorkspace<T>(operation: () => T): T {
  if (pending) return operation();
  const notifications = new Map<object, { previous: unknown; notify: Notification }>();
  pending = notifications;
  let result: T;
  try { result = operation(); }
  catch (error) { pending = null; throw error; }
  // Keep the queue active during delivery. If an observer commits another edit,
  // observers still waiting receive that newer state and its matching buffers.
  try {
    while (notifications.size) {
      const [key, notification] = notifications.entries().next().value!;
      notifications.delete(key);
      deliver(notification.notify);
    }
  } finally { pending = null; }
  return result;
}
