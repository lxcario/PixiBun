/**
 * Keeps each drawing's receipt while you work: after every edit, the active
 * frame as you see it goes into the receipt track, with a stroke count and
 * drawing time that skips breaks. Ledgers stay in this browser's
 * `pixibun-receipts` IndexedDB; a receipt leaves only if you include it in a cart.
 */
import { compositeFrame } from '@/lib/render/compositor';
import { useStudioStore } from '@/stores/studioStore';
import { deflate, inflate, type CartReceipt } from './cartFormat';
import { fromBase64Url, toBase64Url } from './cartLink';
import { decodeTrack, IDLE_MS, MAX_TRACK_BYTES, ReceiptWriter, type TrackStep } from './receiptTrack';

const DB_NAME = 'pixibun-receipts';
const STORE = 'ledgers';
const CAPTURE_DELAY_MS = 350;
const SAVE_DELAY_MS = 2500;

interface Ledger {
  projectId: string;
  strokes: number;
  activeMs: number;
  track: Uint8Array;
  updatedAt: number;
}

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('No IndexedDB.')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'projectId' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readLedger(projectId: string): Promise<Ledger | undefined> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE, 'readonly').objectStore(STORE).get(projectId);
    request.onsuccess = () => { database.close(); resolve(request.result as Ledger | undefined); };
    request.onerror = () => { database.close(); reject(request.error); };
  });
}

async function writeLedger(ledger: Ledger): Promise<void> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(ledger);
    tx.oncomplete = () => { database.close(); resolve(); };
    tx.onerror = () => { database.close(); reject(tx.error); };
  });
}

interface Session {
  projectId: string;
  writer: ReceiptWriter;
  strokes: number;
  activeMs: number;
  lastAt: number | null;
}

let session: Session | null = null;

function snapshot() {
  const state = useStudioStore.getState();
  const art = compositeFrame(state.frames, state.activeFrameIndex, state.canvasWidth, state.canvasHeight);
  const ctx = art?.getContext('2d', { willReadFrequently: true });
  return art && ctx ? { width: art.width, height: art.height, data: ctx.getImageData(0, 0, art.width, art.height).data } : null;
}

/** Start recording; returns a stop function that saves what is left. */
export function startReceiptRecorder(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  let captureTimer: number | null = null;
  let saveTimer: number | null = null;
  let switching: Promise<void> = Promise.resolve();
  let stopped = false;
  // Pointers held down. A stroke publishes as it is drawn, so a slow one (WebKit took
  // over 350 ms for a short line) went quiet long enough to be pictured half drawn and
  // counted twice; pictures wait for the release instead.
  const held = new Set<number>();
  let deferred = false;

  const save = async () => {
    if (saveTimer !== null) { window.clearTimeout(saveTimer); saveTimer = null; }
    const current = session;
    if (!current) return;
    try {
      await writeLedger({ projectId: current.projectId, strokes: current.strokes, activeMs: current.activeMs, track: current.writer.bytes(), updatedAt: Date.now() });
    } catch { /* Private browsing or storage full: the receipt lasts this visit. */ }
  };
  const scheduleSave = () => {
    if (saveTimer === null) saveTimer = window.setTimeout(() => { void save(); }, SAVE_DELAY_MS);
  };

  // Pictures taken while a drawing's ledger is still loading, added in order once it is ready.
  let loadingProject: string | null = null;
  let waiting: { picture: NonNullable<ReturnType<typeof snapshot>>; time: number }[] = [];

  const record = (current: Session, picture: NonNullable<ReturnType<typeof snapshot>>, time: number) => {
    const first = current.writer.steps === 0;
    if (!current.writer.add(picture, time)) return;
    if (!first) {
      current.strokes += 1;
      if (current.lastAt !== null) current.activeMs += Math.min(Math.max(0, time - current.lastAt), IDLE_MS);
    }
    current.lastAt = time;
    scheduleSave();
  };

  const capture = () => {
    captureTimer = null;
    const state = useStudioStore.getState();
    if (held.size > 0) { deferred = true; return; }
    if (stopped || state.isPlaying) return;
    const current = session;
    // While switching to this drawing, the previous session lingers until its ledger is
    // saved; pictures taken then belong to the new drawing and wait for it, rather than
    // being dropped (strokes made just after opening a drawing went uncounted).
    if (!current || current.projectId !== state.currentProjectId) {
      if (loadingProject === state.currentProjectId && waiting.length < 64) {
        const picture = snapshot();
        if (picture) waiting.push({ picture, time: Date.now() });
      }
      return;
    }
    const picture = snapshot();
    if (picture) record(current, picture, Date.now());
  };
  const scheduleCapture = () => {
    if (captureTimer !== null) window.clearTimeout(captureTimer);
    captureTimer = window.setTimeout(capture, CAPTURE_DELAY_MS);
  };

  const switchTo = (projectId: string) => {
    // Where this drawing starts, taken now: strokes made while the ledger loads still count.
    const start = snapshot();
    const startedAt = Date.now();
    loadingProject = projectId;
    waiting = [];
    switching = switching.then(async () => {
      await save();
      session = null;
      if (!projectId || stopped) return;
      let ledger: Ledger | undefined;
      try { ledger = await readLedger(projectId); } catch { ledger = undefined; }
      let writer: ReceiptWriter;
      try { writer = ledger ? ReceiptWriter.resume(ledger.track) : new ReceiptWriter(); } catch { writer = new ReceiptWriter(); ledger = undefined; }
      if (stopped || useStudioStore.getState().currentProjectId !== projectId) return;
      session = { projectId, writer, strokes: ledger?.strokes ?? 0, activeMs: ledger?.activeMs ?? 0, lastAt: null };
      // A new receipt starts from the drawing as it opened (a template, an opened cart, or a blank canvas).
      if (!ledger && start) { writer.add(start, startedAt); session.lastAt = startedAt; }
      for (const { picture, time } of waiting) record(session, picture, time);
      waiting = [];
      loadingProject = null;
      scheduleCapture();
    });
  };

  switchTo(useStudioStore.getState().currentProjectId);
  const unsubscribe = useStudioStore.subscribe((state, previous) => {
    if (state.currentProjectId !== previous.currentProjectId) { switchTo(state.currentProjectId); return; }
    if (state.editRevision !== previous.editRevision || state.bufferVersion !== previous.bufferVersion) scheduleCapture();
  });
  const onHide = () => { if (document.visibilityState === 'hidden') void save(); };
  document.addEventListener('visibilitychange', onHide);
  const onPress = (event: PointerEvent) => { held.add(event.pointerId); };
  const onRelease = (event: PointerEvent) => {
    if (held.delete(event.pointerId) && held.size === 0 && deferred) { deferred = false; scheduleCapture(); }
  };
  // A release outside the window may never arrive; leaving it must not stop the receipt.
  const onBlur = () => { held.clear(); if (deferred) { deferred = false; scheduleCapture(); } };
  window.addEventListener('pointerdown', onPress, true);
  window.addEventListener('pointerup', onRelease, true);
  window.addEventListener('pointercancel', onRelease, true);
  window.addEventListener('blur', onBlur);

  return () => {
    stopped = true;
    unsubscribe();
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pointerdown', onPress, true);
    window.removeEventListener('pointerup', onRelease, true);
    window.removeEventListener('pointercancel', onRelease, true);
    window.removeEventListener('blur', onBlur);
    if (captureTimer !== null) window.clearTimeout(captureTimer);
    void save();
  };
}

/** The current drawing's receipt, ready to go in a cart. Null before the first edit. */
export async function currentReceipt(): Promise<CartReceipt | null> {
  const current = session;
  if (!current || current.writer.steps === 0) return null;
  const packed = await deflate(current.writer.bytes());
  return { strokes: current.strokes, activeMs: current.activeMs, track: toBase64Url(packed) };
}

/** Stroke count and drawing time for the export dialog, without packing the track. */
export function receiptSummary(): { strokes: number; activeMs: number; full: boolean } | null {
  const current = session;
  return current ? { strokes: current.strokes, activeMs: current.activeMs, full: current.writer.byteLength >= MAX_TRACK_BYTES } : null;
}

/** Unpack a cart's receipt track for replay. */
export async function unpackTrack(track: string): Promise<TrackStep[]> {
  return decodeTrack(await inflate(fromBase64Url(track), MAX_TRACK_BYTES + 1024));
}
