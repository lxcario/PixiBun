// CoDrawBridge — the integration layer between the live studio and the P2P
// CRDT sync engine.
//
// Design notes:
// - Full-state antientropy join (Shapiro et al., "Conflict-Free Replicated
//   Data Types," SSS 2011, §4): on connect, the HOST seeds one CrdtPixelBuffer
//   per layer from the live canvases and transmits a complete state snapshot
//   per layer, preceded by a STRUCTURE_SYNC so both peers share one layer-ID
//   namespace (a prerequisite for routing per-layer ops).
// - Delta propagation afterwards: local stroke commits are diffed against
//   their pre-stroke history snapshot (strokeDiff.ts); each changed pixel
//   becomes an LWW op via CrdtPixelBuffer.setPixel and is broadcast.
// - Structure ownership: the host owns the layer/frame tree while a session
//   is active. Guest structural edits remain local and are overwritten by the
//   next host structure push. This is a documented MVP constraint that keeps
//   layer identity deterministic without a full op-based layer CRDT.
// - The bridge is a module singleton so sessions survive modal unmount and
//   so drawing code can reach it without prop drilling.
//
// Convergence guarantee: per-pixel LWW with HLC clocks and deterministic
// peerId tie-breaking (crdtPixelBuffer.ts) yields Strong Eventual Consistency
// for pixel state; canvas buffers are views that converge on op application.

import { useStudioStore } from '@/stores/studioStore';
import { getOrCreateBuffer, hasBuffer, createEntry, replaceAllBuffers, touchBuffer } from '@/lib/engine/bufferRegistry';
import { studioEvents } from '@/lib/events/studioEvents';
import { CrdtPixelBuffer } from '@/lib/collab/crdtPixelBuffer';
import type { PixelOp } from '@/lib/collab/crdtPixelBuffer';
import {
  P2PSyncSession,
  PUBLIC_STUN_ICE_SERVERS,
  LAN_ICE_SERVERS,
  DEFAULT_ICE_SERVERS,
} from '@/lib/sync/p2pSync';
import type {
  P2PConnectionState,
  RemoteCursor,
  StructurePayload,
} from '@/lib/sync/p2pSync';
import { diffImageDataToOps } from '@/lib/sync/strokeDiff';
import type { ImageDataLike } from '@/lib/sync/strokeDiff';
import { createId } from '@/lib/engine/id';
import { assertMemoryAvailable, registerMemoryUsage, reserveMemory } from '@/lib/safety/memoryBudget';

/** Min interval between cursor broadcasts (~30fps) over the lossy presence channel. */
export const CURSOR_BROADCAST_MIN_INTERVAL_MS = 33;
/** Remote cursors older than this are pruned from the overlay. */
export const CURSOR_STALE_MS = 4000;
const CONNECT_SEND_RETRY_MS = 250;
const CONNECT_SEND_MAX_RETRIES = 40;
export const MAX_CODRAW_LAYER_PIXELS = 262_144;
export const MAX_CODRAW_INITIAL_PAINTED_PIXELS = 32_000;

function getStructureCapacityError(width: number, height: number, layerCount: number): string | null {
  if (width * height * layerCount > MAX_CODRAW_LAYER_PIXELS) {
    return `Co-draw supports up to ${MAX_CODRAW_LAYER_PIXELS.toLocaleString()} total layer pixels. Reduce canvas size, frames, or layers to start a session.`;
  }
  return null;
}

export type CoDrawRole = 'host' | 'guest';

export interface CoDrawStartOptions {
  lanOnly?: boolean;
}

export class CoDrawBridge {
  private session: P2PSyncSession | null = null;
  private role: CoDrawRole | null = null;
  private peerId = createId('peer');
  private crdtBuffers = new Map<string, CrdtPixelBuffer>();
  private cursors = new Map<string, RemoteCursor>();
  private lastCursorBroadcast = 0;
  private syncedLayerIds = new Set<string>();
  private unsubscribeStructure: (() => void) | null = null;
  private lastSeenFrames: unknown = null;
  private lastSeenWidth = 0;
  private lastSeenHeight = 0;
  private sessionGeneration = 0;
  private sessionProjectId: string | null = null;
  private guestWorkspaceReady = true;
  private unsubscribeProject: (() => void) | null = null;

  getRole(): CoDrawRole | null {
    return this.role;
  }

  getSession(): P2PSyncSession | null {
    return this.session;
  }

  getConnectionState(): P2PConnectionState {
    return this.session?.getState() ?? 'idle';
  }

  async startHost(options: CoDrawStartOptions = {}): Promise<string> {
    const capacityError = this.getHostCapacityError();
    if (capacityError) throw new Error(capacityError);
    this.reset();
    this.role = 'host';
    this.peerId = createId('peer');
    this.session = this.createSession(options);
    this.watchProject();
    return this.session.createHostInvite();
  }

  /** Publish a checkpointed, separate workspace only after signaling succeeds. */
  async startGuest(
    inviteToken: string,
    activateWorkspace: () => string,
    options: CoDrawStartOptions = {},
    signal?: AbortSignal,
  ): Promise<string> {
    signal?.throwIfAborted();
    this.reset();
    this.role = 'guest';
    this.guestWorkspaceReady = false;
    this.peerId = createId('peer');
    this.session = this.createSession(options);
    const generation = this.sessionGeneration;
    const originalProjectId = this.sessionProjectId;
    const cancel = () => { if (generation === this.sessionGeneration) this.disconnect(); };
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      const answer = await this.session.acceptHostInvite(inviteToken);
      signal?.throwIfAborted();
      if (generation !== this.sessionGeneration || !this.ownsWorkspace()) {
        throw new Error('The drawing or co-draw session changed. Join again from your current drawing.');
      }
      const projectId = activateWorkspace();
      if (projectId === originalProjectId || projectId !== useStudioStore.getState().currentProjectId) {
        throw new Error('Co-draw requires a separate saved drawing.');
      }
      this.sessionProjectId = projectId;
      this.guestWorkspaceReady = true;
      this.watchProject();
      return answer;
    } catch (error) {
      cancel();
      throw error;
    } finally {
      signal?.removeEventListener('abort', cancel);
    }
  }

  disconnect(): void {
    this.reset();
    studioEvents.emit('pixibun:codraw-state', 'idle');
    studioEvents.emit('pixibun:remote-cursors', []);
  }

  private ownsWorkspace(): boolean {
    return this.sessionProjectId === null || this.sessionProjectId === useStudioStore.getState().currentProjectId;
  }

  private watchProject(): void {
    this.unsubscribeProject = useStudioStore.subscribe(() => {
      if (!this.ownsWorkspace()) this.disconnect();
    });
  }

  private createSession(options: CoDrawStartOptions): P2PSyncSession {
    const generation = this.sessionGeneration;
    this.sessionProjectId = useStudioStore.getState().currentProjectId;
    const current = () => generation === this.sessionGeneration && this.ownsWorkspace();
    const artworkCurrent = () => current() && this.guestWorkspaceReady;
    return new P2PSyncSession({
      peerId: this.peerId,
      peerName: this.role === 'host' ? 'PixiBun Host' : 'PixiBun Guest',
      iceServers: options.lanOnly === true
        ? LAN_ICE_SERVERS
        : options.lanOnly === false
          ? PUBLIC_STUN_ICE_SERVERS
          : DEFAULT_ICE_SERVERS,
      lanOnly: options.lanOnly,
      onConnectionStateChange: (state) => { if (current()) this.handleConnectionState(state); },
      onRemotePixelOps: (ops, layerId) => { if (artworkCurrent()) this.applyRemoteOps(ops, layerId); },
      onInitialSync: (ops, layerId) => {
        if (artworkCurrent() && this.role === 'guest') this.applyRemoteOps(ops, layerId);
      },
      onStructureSync: (payload) => { if (artworkCurrent()) this.adoptStructure(payload); },
      onRemoteCursor: (cursor) => { if (artworkCurrent()) this.handleRemoteCursor(cursor); },
      onError: (error) => { if (current()) studioEvents.emit('pixibun:codraw-error', error.message); },
    });
  }

  private reset(): void {
    this.sessionGeneration += 1;
    this.unsubscribeProject?.();
    this.unsubscribeProject = null;
    this.session?.disconnect();
    this.session = null;
    this.role = null;
    this.sessionProjectId = null;
    this.guestWorkspaceReady = true;
    this.crdtBuffers.clear();
    this.cursors.clear();
    this.syncedLayerIds.clear();
    if (this.unsubscribeStructure) {
      this.unsubscribeStructure();
      this.unsubscribeStructure = null;
    }
    this.lastSeenFrames = null;
    this.lastSeenWidth = 0;
    this.lastSeenHeight = 0;
  }

  private handleConnectionState(state: P2PConnectionState): void {
    if (state === 'connected') {
      this.syncedLayerIds.clear();
      if (this.role === 'host') {
        // Data channels may not be 'open' yet when the PC reports connected;
        // retry until the structure + snapshots actually go out (RFC 8831:
        // channel readiness is orthogonal to PeerConnection state).
        this.sendInitialStateWithRetry(0);
      }
    } else if (state === 'disconnected' || state === 'failed') {
      this.syncedLayerIds.clear();
      if (this.unsubscribeStructure) {
        this.unsubscribeStructure();
        this.unsubscribeStructure = null;
      }
    }

    studioEvents.emit('pixibun:codraw-state', state);
  }

  private sendInitialStateWithRetry(attempt: number): void {
    if (!this.session || this.session.getState() !== 'connected') return;
    const capacityError = this.getHostCapacityError();
    if (capacityError) {
      studioEvents.emit('pixibun:codraw-error', capacityError);
      this.session.disconnect();
      return;
    }
    const ok = this.sendStructureAndSnapshots();
    if (ok) {
      if (!this.unsubscribeStructure) {
        this.subscribeToStructureChanges();
      }
      return;
    }
    if (attempt < CONNECT_SEND_MAX_RETRIES) {
      const generation = this.sessionGeneration;
      setTimeout(() => {
        if (generation === this.sessionGeneration) this.sendInitialStateWithRetry(attempt + 1);
      }, CONNECT_SEND_RETRY_MS);
    }
  }

  private getHostCapacityError(): string | null {
    const state = useStudioStore.getState();
    const layerIds = new Set(state.frames.flatMap((frame) => frame.layers.map((layer) => layer.id)));
    const structureError = getStructureCapacityError(state.canvasWidth, state.canvasHeight, layerIds.size);
    if (structureError) return structureError;
    if (new TextEncoder().encode(JSON.stringify(state.frames)).length > 240 * 1024) {
      return 'Co-draw layer and frame metadata is too large to sync. Reduce the number of frames or layers to start a session.';
    }

    let painted = 0;
    for (const layerId of layerIds) {
      if (!hasBuffer(layerId)) continue;
      const data = getOrCreateBuffer(layerId, state.canvasWidth, state.canvasHeight)
        .ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] === 0) continue;
        painted++;
        if (painted > MAX_CODRAW_INITIAL_PAINTED_PIXELS) {
          return `Co-draw supports up to ${MAX_CODRAW_INITIAL_PAINTED_PIXELS.toLocaleString()} painted pixels when joining. Reduce painted area to start a session.`;
        }
      }
    }
    return null;
  }

  private sendStructureAndSnapshots(): boolean {
    if (!this.session) return false;
    const state = useStudioStore.getState();
    const payload: StructurePayload = {
      width: state.canvasWidth,
      height: state.canvasHeight,
      frames: state.frames.map((f) => ({
        id: f.id,
        durationMs: f.durationMs,
        layers: f.layers.map((l) => ({
          id: l.id,
          name: l.name,
          visible: l.visible,
          locked: l.locked,
          opacity: l.opacity,
          blendMode: l.blendMode,
          ...(l.tag !== undefined ? { tag: l.tag } : {}),
          ...(l.effect !== undefined ? { effect: structuredClone(l.effect) } : {}),
        })),
      })),
    };
    if (!this.session.broadcastStructure(payload)) return false;

    const activeLayerIds = new Set<string>();
    for (const frame of state.frames) {
      for (const layer of frame.layers) {
        activeLayerIds.add(layer.id);
        // Structural edits can bake/restore pixels in an existing layer ID.
        // Reconcile the live raster before sending structure and snapshots so
        // merge/undo/redo also update the shared pixel replica, including erasure.
        if (this.syncedLayerIds.has(layer.id)) {
          const crdt = this.getBuffer(layer.id, state.canvasWidth, state.canvasHeight);
          const before = { width: crdt.width, height: crdt.height, data: crdt.toRgbaArray() };
          this.notifyStrokeCommitted(layer.id, before);
        }
        if (!this.syncedLayerIds.has(layer.id)) {
          const existing = this.crdtBuffers.get(layer.id);
          const crdt = this.getBuffer(layer.id, state.canvasWidth, state.canvasHeight);
          const ops = existing === crdt ? crdt.getStateSnapshotOps()
            : this.seedCrdtFromCanvas(crdt, layer.id, state.canvasWidth, state.canvasHeight);
          if (!this.session.broadcastInitialSync(ops, layer.id)) return false;
          this.syncedLayerIds.add(layer.id);
        }
      }
    }
    for (const id of this.syncedLayerIds) {
      if (!activeLayerIds.has(id)) {
        this.syncedLayerIds.delete(id);
        this.crdtBuffers.delete(id);
      }
    }
    return true;
  }

  private subscribeToStructureChanges(): void {
    const initialState = useStudioStore.getState();
    this.lastSeenFrames = initialState.frames;
    this.lastSeenWidth = initialState.canvasWidth;
    this.lastSeenHeight = initialState.canvasHeight;

    this.unsubscribeStructure = useStudioStore.subscribe(() => {
      if (this.role !== 'host' || !this.session || this.session.getState() !== 'connected') {
        return;
      }
      const state = useStudioStore.getState();
      const framesChanged = state.frames !== this.lastSeenFrames;
      const dimensionsChanged =
        state.canvasWidth !== this.lastSeenWidth || state.canvasHeight !== this.lastSeenHeight;

      if (framesChanged || dimensionsChanged) {
        this.lastSeenFrames = state.frames;
        this.lastSeenWidth = state.canvasWidth;
        this.lastSeenHeight = state.canvasHeight;
        if (dimensionsChanged) {
          this.syncedLayerIds.clear();
          this.crdtBuffers.clear();
        }
        this.sendInitialStateWithRetry(0);
      }
    });
  }

  /** Seeds a CRDT replica from the live canvas: every painted pixel becomes a local op. */
  private seedCrdtFromCanvas(
    crdt: CrdtPixelBuffer,
    layerId: string,
    width: number,
    height: number
  ): PixelOp[] {
    const entry = getOrCreateBuffer(layerId, width, height);
    const imgData = entry.ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const ops: PixelOp[] = [];
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const i = (rowOffset + x) * 4;
        if (data[i + 3] > 0) {
          const op = crdt.setPixel(x, y, [data[i], data[i + 1], data[i + 2], data[i + 3]]);
          if (op) ops.push(op);
        }
      }
    }
    return ops;
  }

  private getBuffer(layerId: string, width: number, height: number): CrdtPixelBuffer {
    const existing = this.crdtBuffers.get(layerId);
    if (existing && existing.width === width && existing.height === height) {
      return existing;
    }
    assertMemoryAvailable(width * height * 192 + 10_000 * 192, 'Collaboration replica');
    const fresh = new CrdtPixelBuffer(width, height, this.peerId);
    this.crdtBuffers.set(layerId, fresh);
    return fresh;
  }

  /**
   * Called by the drawing pipeline after a stroke is committed to history.
   * Diffs the pre-stroke snapshot against the live buffer and broadcasts the
   * changed pixels as LWW ops for the given layer.
   */
  notifyStrokeCommitted(layerId: string, before: ImageDataLike | null): void {
    if (!this.guestWorkspaceReady || !this.ownsWorkspace() || !this.session || this.session.getState() !== 'connected' || !before) return;
    const state = useStudioStore.getState();
    const layerExists = state.frames.some((f) => f.layers.some((l) => l.id === layerId));
    if (!layerExists) return;

    const entry = getOrCreateBuffer(layerId, state.canvasWidth, state.canvasHeight);
    const after = entry.ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
    const deltas = diffImageDataToOps(before, after);
    if (deltas.length === 0) return;

    const crdt = this.getBuffer(layerId, state.canvasWidth, state.canvasHeight);
    const ops: PixelOp[] = [];
    for (const d of deltas) {
      const op = crdt.setPixel(d.x, d.y, [d.r, d.g, d.b, d.a]);
      if (op) ops.push(op);
    }
    if (ops.length > 0) {
      this.session.broadcastPixelOps(ops, layerId);
    }
  }

  /** Applies remote (or initial-sync) ops to the CRDT replica and repaints the layer view. */
  private applyRemoteOps(ops: PixelOp[], layerId?: string): void {
    if (!layerId || ops.length === 0) return;
    const state = useStudioStore.getState();
    const layerExists = state.frames.some((f) => f.layers.some((l) => l.id === layerId));
    if (!layerExists) return;

    const crdt = this.getBuffer(layerId, state.canvasWidth, state.canvasHeight);
    const entry = getOrCreateBuffer(layerId, state.canvasWidth, state.canvasHeight);
    const img = entry.ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
    let mutated = 0;
    for (const op of ops) {
      if (crdt.applyRemoteOp(op)) {
        const i = (op.y * state.canvasWidth + op.x) * 4;
        img.data[i] = op.r;
        img.data[i + 1] = op.g;
        img.data[i + 2] = op.b;
        img.data[i + 3] = op.a;
        mutated++;
      }
    }
    if (mutated > 0) {
      entry.ctx.putImageData(img, 0, 0);
      touchBuffer(layerId);
      useStudioStore.getState().bumpBufferVersion();
      studioEvents.emit('pixibun:request-composite');
      studioEvents.emit('pixibun:remote-change');
    }
  }

  /**
   * Guest-side adoption of the host's layer/frame structure. Clears all local
   * buffers, installs the shared metadata, then repaints every layer canvas
   * from its CRDT replica so pixels synced before this point survive.
   */
  private adoptStructure(payload: StructurePayload): void {
    if (this.role !== 'guest') {
      studioEvents.emit('pixibun:codraw-error', 'Only the host may replace the shared frame and layer structure.');
      return;
    }
    if (typeof document === 'undefined') return;
    const layerCount = payload.frames.reduce((count, frame) => count + frame.layers.length, 0);
    const capacityError = getStructureCapacityError(payload.width, payload.height, layerCount);
    if (capacityError) {
      studioEvents.emit('pixibun:codraw-error', capacityError);
      this.session?.disconnect();
      return;
    }
    const activeLayerIds = new Set<string>();
    for (const frame of payload.frames) {
      for (const layer of frame.layers) {
        activeLayerIds.add(layer.id);
      }
    }

    // Stage the guest's views before publishing metadata. Allocation failure
    // leaves its current workspace/replicas intact rather than exposing blank views.
    const replicas = new Map(this.crdtBuffers);
    const staged = new Map<string, ReturnType<typeof createEntry>>();
    for (const [layerId, crdt] of replicas) {
      if (!activeLayerIds.has(layerId) || crdt.width !== payload.width || crdt.height !== payload.height) {
        replicas.delete(layerId);
      }
    }
    let releaseStaging: (() => void) | undefined;
    try {
      releaseStaging = reserveMemory((replicas.size + 2) * payload.width * payload.height * 4, 'Shared artwork staging');
      for (const [layerId, crdt] of replicas) {
        const entry = createEntry(payload.width, payload.height, 1, true);
        const img = entry.ctx.createImageData(payload.width, payload.height);
        img.data.set(crdt.toRgbaArray());
        entry.ctx.putImageData(img, 0, 0);
        staged.set(layerId, entry);
      }
    } catch {
      studioEvents.emit('pixibun:codraw-error', 'Could not prepare the shared artwork. Reconnect to retry.');
      this.session?.disconnect();
      return;
    } finally { releaseStaging?.(); }
    this.crdtBuffers = replicas;
    replaceAllBuffers(staged);

    useStudioStore.setState((state) => {
      state.canvasWidth = payload.width;
      state.canvasHeight = payload.height;
      state.frames = payload.frames.map((f) => ({
        id: f.id,
        durationMs: f.durationMs,
        layers: f.layers.map((l) => ({ ...l })),
      }));
      if (state.activeFrameIndex >= payload.frames.length) {
        state.activeFrameIndex = 0;
      }
      const activeFrame = payload.frames[state.activeFrameIndex];
      const layerStillExists = activeFrame?.layers.some((l) => l.id === state.activeLayerId);
      if (!layerStillExists) {
        state.activeLayerId = activeFrame?.layers[0]?.id ?? '';
      }
      state.bufferVersion += 1;
    });

    studioEvents.emit('pixibun:history-clear');

    studioEvents.emit('pixibun:request-composite');
    studioEvents.emit('pixibun:remote-change');
  }

  /** Throttled cursor broadcast over the unreliable presence channel. */
  broadcastCursor(x: number, y: number): void {
    if (!this.guestWorkspaceReady || !this.ownsWorkspace() || !this.session || this.session.getState() !== 'connected') return;
    const now = Date.now();
    if (now - this.lastCursorBroadcast < CURSOR_BROADCAST_MIN_INTERVAL_MS) return;
    this.lastCursorBroadcast = now;
    this.session.broadcastCursor(x, y);
  }

  private handleRemoteCursor(cursor: RemoteCursor): void {
    this.cursors.set(cursor.peerId, { ...cursor, lastUpdated: Date.now() });
    this.emitCursors();
  }

  getActiveCursors(staleMs: number = CURSOR_STALE_MS): RemoteCursor[] {
    const now = Date.now();
    const active: RemoteCursor[] = [];
    for (const [peerId, cursor] of this.cursors) {
      if (now - cursor.lastUpdated > staleMs) {
        this.cursors.delete(peerId);
      } else {
        active.push(cursor);
      }
    }
    return active;
  }

  private emitCursors(): void {
    studioEvents.emit('pixibun:remote-cursors', this.getActiveCursors());
  }

  getEstimatedMemoryBytes(): number {
    return [...this.crdtBuffers.values()].reduce((sum, buffer) => sum + buffer.estimatedBytes, 0);
  }
}

export const coDrawBridge = new CoDrawBridge();
registerMemoryUsage('collaboration', () => coDrawBridge.getEstimatedMemoryBytes());
