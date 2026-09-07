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
import { getOrCreateBuffer, clearAllBuffers } from '@/lib/engine/bufferRegistry';
import { CrdtPixelBuffer } from '@/lib/collab/crdtPixelBuffer';
import type { PixelOp } from '@/lib/collab/crdtPixelBuffer';
import {
  P2PSyncSession,
  PUBLIC_STUN_ICE_SERVERS,
  LAN_ICE_SERVERS,
} from '@/lib/sync/p2pSync';
import type {
  P2PConnectionState,
  RemoteCursor,
  StructurePayload,
} from '@/lib/sync/p2pSync';
import { diffImageDataToOps } from '@/lib/sync/strokeDiff';
import type { ImageDataLike } from '@/lib/sync/strokeDiff';
import { createId } from '@/lib/engine/id';

/** Min interval between cursor broadcasts (~30fps) over the lossy presence channel. */
export const CURSOR_BROADCAST_MIN_INTERVAL_MS = 33;
/** Remote cursors older than this are pruned from the overlay. */
export const CURSOR_STALE_MS = 4000;
const CONNECT_SEND_RETRY_MS = 250;
const CONNECT_SEND_MAX_RETRIES = 40;

export const CODRAW_STATE_EVENT = 'pixibun:codraw-state';
export const CODRAW_CURSORS_EVENT = 'pixibun:remote-cursors';
export const CODRAW_COMPOSITE_EVENT = 'pixibun:request-composite';
export const CODRAW_REMOTE_CHANGE_EVENT = 'pixibun:remote-change';

export type CoDrawRole = 'host' | 'guest';

export interface CoDrawStartOptions {
  lanOnly?: boolean;
}

class CoDrawBridge {
  private session: P2PSyncSession | null = null;
  private role: CoDrawRole | null = null;
  private peerId = createId('peer');
  private crdtBuffers = new Map<string, CrdtPixelBuffer>();
  private cursors = new Map<string, RemoteCursor>();
  private lastCursorBroadcast = 0;
  private initialSyncComplete = false;
  private unsubscribeStructure: (() => void) | null = null;
  private lastSeenFrames: unknown = null;

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
    this.reset();
    this.role = 'host';
    this.peerId = createId('peer');
    this.session = this.createSession(options);
    return this.session.createHostInvite();
  }

  async startGuest(inviteToken: string, options: CoDrawStartOptions = {}): Promise<string> {
    this.reset();
    this.role = 'guest';
    this.peerId = createId('peer');
    this.session = this.createSession(options);
    return this.session.acceptHostInvite(inviteToken);
  }

  disconnect(): void {
    this.reset();
  }

  private createSession(options: CoDrawStartOptions): P2PSyncSession {
    return new P2PSyncSession({
      peerId: this.peerId,
      peerName: this.role === 'host' ? 'Atelier Host' : 'Atelier Guest',
      iceServers: options.lanOnly ? LAN_ICE_SERVERS : PUBLIC_STUN_ICE_SERVERS,
      lanOnly: options.lanOnly,
      onConnectionStateChange: (state) => this.handleConnectionState(state),
      onRemotePixelOps: (ops, layerId) => this.applyRemoteOps(ops, layerId),
      onInitialSync: (ops, layerId) => this.applyRemoteOps(ops, layerId),
      onStructureSync: (payload) => this.adoptStructure(payload),
      onRemoteCursor: (cursor) => this.handleRemoteCursor(cursor),
    });
  }

  private reset(): void {
    this.session?.disconnect();
    this.session = null;
    this.role = null;
    this.crdtBuffers.clear();
    this.cursors.clear();
    this.initialSyncComplete = false;
    if (this.unsubscribeStructure) {
      this.unsubscribeStructure();
      this.unsubscribeStructure = null;
    }
    this.lastSeenFrames = null;
  }

  private handleConnectionState(state: P2PConnectionState): void {
    if (state === 'connected') {
      this.initialSyncComplete = false;
      if (this.role === 'host') {
        // Data channels may not be 'open' yet when the PC reports connected;
        // retry until the structure + snapshots actually go out (RFC 8831:
        // channel readiness is orthogonal to PeerConnection state).
        this.sendInitialStateWithRetry(0);
      } else {
        this.initialSyncComplete = true;
      }
    } else if (state === 'disconnected' || state === 'failed') {
      this.initialSyncComplete = false;
      if (this.unsubscribeStructure) {
        this.unsubscribeStructure();
        this.unsubscribeStructure = null;
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CODRAW_STATE_EVENT, { detail: state }));
    }
  }

  private sendInitialStateWithRetry(attempt: number): void {
    if (!this.session || this.session.getState() !== 'connected') return;
    const ok = this.sendStructureAndSnapshots();
    if (ok) {
      if (!this.unsubscribeStructure) {
        this.subscribeToStructureChanges();
      }
      return;
    }
    if (attempt < CONNECT_SEND_MAX_RETRIES) {
      setTimeout(() => this.sendInitialStateWithRetry(attempt + 1), CONNECT_SEND_RETRY_MS);
    }
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
        })),
      })),
    };
    if (!this.session.broadcastStructure(payload)) return false;

    if (!this.initialSyncComplete) {
      for (const frame of state.frames) {
        for (const layer of frame.layers) {
          const crdt = this.getBuffer(layer.id, state.canvasWidth, state.canvasHeight);
          const ops = this.seedCrdtFromCanvas(crdt, layer.id, state.canvasWidth, state.canvasHeight);
          this.session.broadcastInitialSync(ops, layer.id);
        }
      }
      this.initialSyncComplete = true;
    }
    return true;
  }

  private subscribeToStructureChanges(): void {
    this.lastSeenFrames = useStudioStore.getState().frames;
    this.unsubscribeStructure = useStudioStore.subscribe(() => {
      if (this.role !== 'host' || !this.session || this.session.getState() !== 'connected') {
        return;
      }
      const frames = useStudioStore.getState().frames;
      if (frames !== this.lastSeenFrames) {
        this.lastSeenFrames = frames;
        this.sendStructureAndSnapshots();
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
    if (!this.session || this.session.getState() !== 'connected' || !before) return;
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
      useStudioStore.getState().bumpBufferVersion();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CODRAW_COMPOSITE_EVENT));
        window.dispatchEvent(new CustomEvent(CODRAW_REMOTE_CHANGE_EVENT));
      }
    }
  }

  /**
   * Guest-side adoption of the host's layer/frame structure. Clears all local
   * buffers, installs the shared metadata, then repaints every layer canvas
   * from its CRDT replica so pixels synced before this point survive.
   */
  private adoptStructure(payload: StructurePayload): void {
    if (typeof document === 'undefined') return;
    clearAllBuffers();

    // Drop replicas whose dimensions no longer match the shared canvas size.
    for (const [layerId, crdt] of this.crdtBuffers) {
      if (crdt.width !== payload.width || crdt.height !== payload.height) {
        this.crdtBuffers.delete(layerId);
      }
    }

    useStudioStore.setState((state) => {
      state.canvasWidth = payload.width;
      state.canvasHeight = payload.height;
      state.frames = payload.frames.map((f) => ({
        id: f.id,
        durationMs: f.durationMs,
        layers: f.layers.map((l) => ({ ...l })),
      }));
      state.activeFrameIndex = 0;
      state.activeLayerId = payload.frames[0]?.layers[0]?.id ?? state.activeLayerId;
      state.bufferVersion += 1;
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pixibun:history-clear'));
    }

    for (const [layerId, crdt] of this.crdtBuffers) {
      const entry = getOrCreateBuffer(layerId, payload.width, payload.height);
      const img = entry.ctx.createImageData(payload.width, payload.height);
      img.data.set(crdt.toRgbaArray());
      entry.ctx.putImageData(img, 0, 0);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CODRAW_COMPOSITE_EVENT));
      window.dispatchEvent(new CustomEvent(CODRAW_REMOTE_CHANGE_EVENT));
    }
  }

  /** Throttled cursor broadcast over the unreliable presence channel. */
  broadcastCursor(x: number, y: number): void {
    if (!this.session || this.session.getState() !== 'connected') return;
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
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent(CODRAW_CURSORS_EVENT, { detail: this.getActiveCursors() })
    );
  }
}

export const coDrawBridge = new CoDrawBridge();