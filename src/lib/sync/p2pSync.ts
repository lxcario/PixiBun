import { SafeJson, getUtf8ByteLength } from '@/lib/safety/safeJson';
/**
 * Local-First Peer-to-Peer WebRTC Synchronization Engine for PixiBun Atelier.
 *
 * Algorithm & Standards References:
 * - Marc Shapiro, Nuno Preguiça, Carlos Baquero, Marek Zawirski,
 *   "Conflict-Free Replicated Data Types," SSS 2011, LNCS 6976, pp. 386-400.
 * - RFC 8831: WebRTC Data Channels / RFC 8832: WebRTC Data Channel Establishment Protocol.
 *
 * Design Philosophy:
 * - Martin Kleppmann, Adam Wiggins, Peter van Hardenberg, Mark McGranaghan,
 *   "Local-First Software: You Own Your Data, in spite of the Cloud,"
 *   ACM Onward! Essays, pp. 154-178, 2019.
 *   (Architectural motivation for the serverless, accountless, user-owned design.)
 *
 * Architecture:
 * - 100% serverless, accountless, zero-cloud architecture with manual copy-paste token signaling.
 * - Dual RTCDataChannel Transport:
 *   1. Reliable Ordered Channel ('pixibun-crdt-sync'): Transmits CRDT delta batches and full-state
 *      snapshots, guaranteeing Strong Eventual Consistency (SEC) across network partitions.
 *   2. Unreliable Unordered Channel ('pixibun-presence', PR-SCTP maxRetransmits: 0):
 *      Transmits 60fps cursor movements and live awareness without head-of-line blocking.
 */

import { PixelOp } from '@/lib/collab/crdtPixelBuffer';
import { createTokenBucketStore, TokenBucketStore } from '@/lib/server/tokenBucket';
import { WORKSPACE_ENVELOPE } from '@/config/canvasLimits';
import { validateLayerEffect } from '@/lib/project/schema';
import { validateProjectResourceBudget } from '@/lib/project/resourceBudget';
import { ANIMATION_TIMING_LIMITS } from '@/lib/project/animationTiming';
import type { LayerEffectRecipe } from '@/types/canvas';

export interface RemoteCursor {
  peerId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  lastUpdated: number;
}

export type P2PConnectionState =
  | 'idle'
  | 'generating-offer'
  | 'waiting-for-answer'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';

export interface SignalingPayload {
  version: 1;
  peerId: string;
  sdp: RTCSessionDescriptionInit;
  candidates: RTCIceCandidateInit[];
}

export interface CrdtSyncMessage {
  type: 'INITIAL_SYNC' | 'PIXEL_OPS' | 'PING' | 'STRUCTURE_SYNC';
  peerId: string;
  ops?: PixelOp[];
  /** Layer whose buffer the ops apply to (layer IDs are shared via STRUCTURE_SYNC). */
  layerId?: string;
  /** Host layer/frame structure for STRUCTURE_SYNC messages. */
  frames?: StructurePayload;
  timestamp?: number;
}

export interface PresenceMessage {
  type: 'CURSOR';
  peerId: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

export interface P2PSyncSessionOptions {
  peerId: string;
  peerName?: string;
  peerColor?: string;
  iceServers?: RTCIceServer[];
  lanOnly?: boolean;
  onRemotePixelOps?: (ops: PixelOp[], layerId?: string) => void;
  onInitialSync?: (ops: PixelOp[], layerId?: string) => void;
  onStructureSync?: (payload: StructurePayload) => void;
  onRemoteCursor?: (cursor: RemoteCursor) => void;
  onConnectionStateChange?: (state: P2PConnectionState) => void;
  onError?: (error: Error) => void;
}

export const LAN_ICE_SERVERS: RTCIceServer[] = [];
export const PUBLIC_STUN_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
export const DEFAULT_ICE_SERVERS: RTCIceServer[] = LAN_ICE_SERVERS;

export const MAX_P2P_PAYLOAD_SIZE = 256 * 1024; // 256 KB
export const MAX_DATA_CHANNEL_BUFFERED_AMOUNT = 1024 * 1024; // 1 MB backpressure ceiling
export const MAX_PRESENCE_BUFFERED_AMOUNT = 64 * 1024; // 64 KB presence buffer ceiling
export const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Blend modes that may appear in a STRUCTURE_SYNC payload (mirrors types/canvas.ts). */
export const STRUCTURE_BLEND_MODES = ['source-over', 'multiply', 'screen', 'overlay', 'color-dodge'] as const;

export interface StructureLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: (typeof STRUCTURE_BLEND_MODES)[number];
  tag?: string;
  effect?: LayerEffectRecipe;
}

export interface StructureFrame {
  id: string;
  durationMs: number;
  layers: StructureLayer[];
}

export interface StructurePayload {
  width: number;
  height: number;
  frames: StructureFrame[];
}

function isStructureBlendMode(value: unknown): value is StructureLayer['blendMode'] {
  return typeof value === 'string' && (STRUCTURE_BLEND_MODES as readonly string[]).includes(value);
}

/**
 * Validates a STRUCTURE_SYNC payload before it is allowed anywhere near the
 * store: every field is bounds-checked so a malicious peer cannot inject
 * malformed layer metadata, oversized structures, or invalid blend modes.
 * Mirrors the guarantees of lib/project/schema.ts for untrusted inputs.
 */
export function validateStructurePayload(data: unknown): StructurePayload | null {
  if (typeof data !== 'object' || data === null) return null;
  const p = data as Record<string, unknown>;

  if (
    typeof p.width !== 'number' || !Number.isInteger(p.width) || p.width < 1 || p.width > WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION ||
    typeof p.height !== 'number' || !Number.isInteger(p.height) || p.height < 1 || p.height > WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION
  ) {
    return null;
  }
  if (!Array.isArray(p.frames) || p.frames.length === 0 || p.frames.length > WORKSPACE_ENVELOPE.MAX_CANVAS_FRAMES) return null;

  const frames: StructureFrame[] = [];
  const frameIds = new Set<string>();
  const layerIds = new Set<string>();
  for (const rawFrame of p.frames) {
    if (typeof rawFrame !== 'object' || rawFrame === null) return null;
    const f = rawFrame as Record<string, unknown>;
    if (typeof f.id !== 'string' || f.id.length === 0 || f.id.length > 128 || frameIds.has(f.id)) return null;
    frameIds.add(f.id);
    if (
      typeof f.durationMs !== 'number' || !Number.isInteger(f.durationMs) ||
      f.durationMs < ANIMATION_TIMING_LIMITS.durationMinMs || f.durationMs > ANIMATION_TIMING_LIMITS.durationMaxMs
    ) {
      return null;
    }
    if (!Array.isArray(f.layers) || f.layers.length === 0 || f.layers.length > WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS) return null;

    const layers: StructureLayer[] = [];
    for (const rawLayer of f.layers) {
      if (typeof rawLayer !== 'object' || rawLayer === null) return null;
      const l = rawLayer as Record<string, unknown>;
      if (typeof l.id !== 'string' || l.id.length === 0 || l.id.length > 128 || layerIds.has(l.id)) return null;
      layerIds.add(l.id);
      if (typeof l.name !== 'string' || l.name.length > 256) return null;
      if (typeof l.visible !== 'boolean' || typeof l.locked !== 'boolean') return null;
      if (typeof l.opacity !== 'number' || !Number.isFinite(l.opacity) || l.opacity < 0 || l.opacity > 1) return null;
      if (!isStructureBlendMode(l.blendMode)) return null;
      if (l.tag !== undefined && (typeof l.tag !== 'string' || l.tag.length > 64)) return null;
      const effect = validateLayerEffect(l.effect);
      if (typeof effect === 'string') return null;
      layers.push({
        id: l.id,
        name: l.name,
        visible: l.visible,
        locked: l.locked,
        opacity: l.opacity,
        blendMode: l.blendMode,
        ...(l.tag !== undefined ? { tag: l.tag } : {}),
        ...(effect !== undefined ? { effect } : {}),
      });
    }
    frames.push({ id: f.id, durationMs: f.durationMs, layers });
  }

  const budget = validateProjectResourceBudget(p.width, p.height, frames);
  if (!budget.ok) return null;

  return { width: p.width, height: p.height, frames };
}

/**
 * Validates whether an incoming object conforms to a valid PixelOp with strict boundary constraints:
 * - 0 <= x, y < WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION (canvas coordinate bounds)
 * - 0 <= r, g, b, a <= 255 (8-bit color channel bounds)
 * - valid numeric timestamp and non-empty peerId
 * - optional valid HLC tuple [l, c]
 */
export function isValidPixelOp(op: unknown): op is PixelOp {
  if (typeof op !== 'object' || op === null) return false;
  const o = op as Record<string, unknown>;

  if (typeof o.x !== 'number' || !Number.isFinite(o.x) || Math.floor(o.x) !== o.x || o.x < 0 || o.x >= WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION) {
    return false;
  }
  if (typeof o.y !== 'number' || !Number.isFinite(o.y) || Math.floor(o.y) !== o.y || o.y < 0 || o.y >= WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION) {
    return false;
  }
  if (typeof o.r !== 'number' || !Number.isFinite(o.r) || Math.floor(o.r) !== o.r || o.r < 0 || o.r > 255) {
    return false;
  }
  if (typeof o.g !== 'number' || !Number.isFinite(o.g) || Math.floor(o.g) !== o.g || o.g < 0 || o.g > 255) {
    return false;
  }
  if (typeof o.b !== 'number' || !Number.isFinite(o.b) || Math.floor(o.b) !== o.b || o.b < 0 || o.b > 255) {
    return false;
  }
  if (typeof o.a !== 'number' || !Number.isFinite(o.a) || Math.floor(o.a) !== o.a || o.a < 0 || o.a > 255) {
    return false;
  }
  if (typeof o.timestamp !== 'number' || !Number.isFinite(o.timestamp) || o.timestamp <= 0) {
    return false;
  }
  if (typeof o.peerId !== 'string' || o.peerId.length === 0 || o.peerId.length > 128) {
    return false;
  }
  if (o.hlc !== undefined) {
    if (
      !Array.isArray(o.hlc) ||
      o.hlc.length !== 2 ||
      typeof o.hlc[0] !== 'number' ||
      !Number.isFinite(o.hlc[0]) ||
      o.hlc[0] <= 0 ||
      Math.floor(o.hlc[0]) !== o.hlc[0] ||
      typeof o.hlc[1] !== 'number' ||
      !Number.isFinite(o.hlc[1]) ||
      o.hlc[1] < 0 ||
      Math.floor(o.hlc[1]) !== o.hlc[1]
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Validates and sanitizes an incoming CRDT sync message.
 */
export function validateCrdtSyncMessage(data: unknown): CrdtSyncMessage | null {
  if (typeof data !== 'object' || data === null) return null;
  const msg = data as Record<string, unknown>;

  if (
    msg.type !== 'INITIAL_SYNC' &&
    msg.type !== 'PIXEL_OPS' &&
    msg.type !== 'PING' &&
    msg.type !== 'STRUCTURE_SYNC'
  ) {
    return null;
  }
  if (typeof msg.peerId !== 'string' || msg.peerId.length === 0 || msg.peerId.length > 128) {
    return null;
  }

  if (msg.type === 'INITIAL_SYNC' || msg.type === 'PIXEL_OPS') {
    if (!Array.isArray(msg.ops)) return null;
    // layerId is mandatory when ops target a specific layer buffer
    if (
      typeof msg.layerId !== 'string' ||
      msg.layerId.length === 0 ||
      msg.layerId.length > 128
    ) {
      return null;
    }
    const validOps: PixelOp[] = [];
    for (const op of msg.ops) {
      if (isValidPixelOp(op)) {
        validOps.push(op);
      } else {
        // Discard invalid / out-of-bounds operations
        return null;
      }
    }
    return {
      type: msg.type,
      peerId: msg.peerId,
      ops: validOps,
      layerId: msg.layerId,
      timestamp: typeof msg.timestamp === 'number' && Number.isFinite(msg.timestamp) ? msg.timestamp : undefined,
    };
  }

  if (msg.type === 'STRUCTURE_SYNC') {
    const frames = validateStructurePayload(msg.frames);
    if (!frames) return null;
    return {
      type: 'STRUCTURE_SYNC',
      peerId: msg.peerId,
      frames,
      timestamp: typeof msg.timestamp === 'number' && Number.isFinite(msg.timestamp) ? msg.timestamp : undefined,
    };
  }

  return {
    type: 'PING',
    peerId: msg.peerId,
    timestamp: typeof msg.timestamp === 'number' && Number.isFinite(msg.timestamp) ? msg.timestamp : undefined,
  };
}

/**
 * Strips C0 control characters (0-31), DEL (127), C1 control characters (128-159),
 * bidi override characters (8234-8238, 8294-8297), and zero-width spaces (8203, 65279).
 */
export function sanitizePeerName(rawName: string): string {
  let result = '';
  const limit = Math.min(rawName.length, 256);
  for (let i = 0; i < limit; i++) {
    const code = rawName.charCodeAt(i);
    if (
      (code >= 0 && code <= 31) ||
      (code >= 127 && code <= 159) ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069) ||
      code === 0x200b ||
      code === 0xfeff
    ) {
      continue;
    }
    result += rawName[i];
  }
  return result.trim();
}

/**
 * Validates and sanitizes an incoming Presence message:
 * - Sanitizes and strips control characters from peer name, enforcing length bounds [1, 64]
 * - Strictly validates hex color matching /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
 */
export function validatePresenceMessage(data: unknown): PresenceMessage | null {
  if (typeof data !== 'object' || data === null) return null;
  const msg = data as Record<string, unknown>;

  if (msg.type !== 'CURSOR') return null;
  if (typeof msg.peerId !== 'string' || msg.peerId.length === 0 || msg.peerId.length > 128) return null;
  if (typeof msg.name !== 'string' || msg.name.length === 0 || msg.name.length > 128) return null;

  // Sanitize and strip control characters (C0 and C1 sets, bidi overrides) and trim whitespace
  const sanitizedName = sanitizePeerName(msg.name);
  if (sanitizedName.length === 0 || sanitizedName.length > 64) return null;

  // Strictly validate hex color format (#rgb, #rgba, #rrggbb, #rrggbbaa)
  if (typeof msg.color !== 'string' || !HEX_COLOR_REGEX.test(msg.color)) return null;

  if (typeof msg.x !== 'number' || !Number.isFinite(msg.x)) return null;
  if (typeof msg.y !== 'number' || !Number.isFinite(msg.y)) return null;

  return {
    type: 'CURSOR',
    peerId: msg.peerId,
    name: sanitizedName,
    color: msg.color,
    x: msg.x,
    y: msg.y,
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
  }
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  // Normalize URL-safe Base64 to standard Base64
  let stdBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = stdBase64.length % 4;
  if (pad) {
    stdBase64 += '='.repeat(4 - pad);
  }

  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(stdBase64, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  const binary = atob(stdBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes signaling payload into a compact base64 string using modern TextEncoder.
 */
export function encodeSignalingToken(payload: SignalingPayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64(bytes);
}

/**
 * Decodes signaling token from a base64 string using modern TextDecoder.
 * Fully supports both standard Base64 and URL-safe Base64 formats.
 */
export function decodeSignalingToken(token: string): SignalingPayload {
  try {
    if (typeof token !== 'string' || token.trim().length === 0) {
      throw new Error('Token string cannot be empty.');
    }
    if (token.length > 1024 * 1024) throw new Error('Signaling token exceeds the size limit.');
    const clean = token.trim();
    const bytes = base64ToBytes(clean);
    const json = new TextDecoder('utf-8').decode(bytes);

    const parsed = SafeJson.parse<SignalingPayload>(json);
    if (!parsed || parsed.version !== 1 || !parsed.sdp || !Array.isArray(parsed.candidates)) {
      throw new Error('Invalid PixiBun signaling token format.');
    }

    return parsed;
  } catch (err) {
    throw new Error(`Invalid signaling token format: ${(err as Error).message}`);
  }
}

/**
 * Peer-to-Peer Co-Drawing WebRTC Session Coordinator.
 */
export class P2PSyncSession {
  public readonly peerId: string;
  public readonly peerName: string;
  public readonly peerColor: string;

  private pc: RTCPeerConnection | null = null;
  private syncChannel: RTCDataChannel | null = null;
  private presenceChannel: RTCDataChannel | null = null;

  private state: P2PConnectionState = 'idle';
  private iceCandidates: RTCIceCandidateInit[] = [];
  private options: P2PSyncSessionOptions;

  // Defensive Token Bucket Rate Limiters (Turner 1986 / Tanenbaum §5.3)
  private pendingMessages = new Map<number, { json: string; sentAt: number }>();
  // The reliable channel is ordered. A high-water mark suppresses retries without
  // retaining one ID for every message in a long co-draw session.
  private lastReceivedDeliveryId = 0;
  private deliveryId = 0;
  private retryTimer: ReturnType<typeof setInterval> | null = null;

  private queueReliable(msg: CrdtSyncMessage): boolean {
    const id = ++this.deliveryId;
    const json = JSON.stringify({ ...msg, deliveryId: id });
    const bytes = new TextEncoder().encode(json).length;
    const queuedBytes = Array.from(this.pendingMessages.values()).reduce((n, item) => n + item.json.length * 2, 0);
    if (bytes > MAX_P2P_PAYLOAD_SIZE || queuedBytes + json.length * 2 > 32 * 1024 * 1024) {
      this.options.onError?.(new Error('Co-draw queue is full. Reconnect to resynchronize artwork.'));
      this.setState('failed');
      return false;
    }
    this.pendingMessages.set(id, { json, sentAt: 0 });
    if (!this.retryTimer) this.retryTimer = setInterval(() => this.flushReliable(), 250);
    this.flushReliable();
    return true;
  }

  private flushReliable(): void {
    const channel = this.syncChannel;
    if (!channel || channel.readyState !== 'open') return;
    for (const item of this.pendingMessages.values()) {
      if ((channel.bufferedAmount ?? 0) > MAX_DATA_CHANNEL_BUFFERED_AMOUNT) return;
      if (item.sentAt && Date.now() - item.sentAt < 1500) continue;
      try { channel.send(item.json); item.sentAt = Date.now(); }
      catch { return; }
    }
    if (!this.pendingMessages.size && this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }
  private presenceRateLimiter: TokenBucketStore = createTokenBucketStore({ capacity: 150, refillPerMinute: 7200 });

  constructor(options: P2PSyncSessionOptions) {
    this.peerId = options.peerId;
    this.peerName = options.peerName ?? `Artisan-${options.peerId.slice(0, 4)}`;
    this.peerColor = options.peerColor ?? '#f0be7c';
    this.options = options;
  }

  public getState(): P2PConnectionState {
    return this.state;
  }

  private setState(newState: P2PConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.options.onConnectionStateChange?.(newState);
    }
  }

  /**
   * Initializes RTCPeerConnection with dual RTCDataChannels.
   */
  private initPeerConnection(): RTCPeerConnection {
    if (typeof RTCPeerConnection === 'undefined') {
      throw new Error('WebRTC RTCPeerConnection is not supported in this environment.');
    }

    const iceServers = this.options.lanOnly
      ? LAN_ICE_SERVERS
      : (this.options.iceServers ?? DEFAULT_ICE_SERVERS);

    const pc = new RTCPeerConnection({
      iceServers,
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.iceCandidates.push(e.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        this.setState('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        this.setState('disconnected');
      } else if (pc.connectionState === 'failed') {
        this.setState('failed');
      }
    };

    // Guest listener for channels created by Host
    pc.ondatachannel = (e) => {
      this.setupChannel(e.channel);
    };

    this.pc = pc;
    return pc;
  }

  /**
   * Hooks data channel event listeners based on channel label.
   */
  private setupChannel(channel: RTCDataChannel): void {
    if (channel.label === 'pixibun-crdt-sync') {
      this.lastReceivedDeliveryId = 0;
      this.syncChannel = channel;
      channel.bufferedAmountLowThreshold = MAX_DATA_CHANNEL_BUFFERED_AMOUNT / 2;
      channel.onbufferedamountlow = () => this.flushReliable();
      channel.onopen = () => {
        this.flushReliable();
        if (this.pc?.connectionState === 'connected' || channel.readyState === 'open') {
          this.setState('connected');
        }
      };
      channel.onmessage = (e) => {
        try {
          if (typeof e.data === 'string' && getUtf8ByteLength(e.data) > MAX_P2P_PAYLOAD_SIZE) {
            console.warn('P2P payload exceeded 256KB limit. Discarding message.');
            return;
          }
          const raw = SafeJson.parse<Record<string, unknown>>(e.data);
          if (raw?.type === 'ACK' && Number.isSafeInteger(raw.deliveryId)) {
            this.pendingMessages.delete(raw.deliveryId as number);
            this.flushReliable();
            return;
          }
          const deliveryId = Number.isSafeInteger(raw?.deliveryId) && (raw.deliveryId as number) > 0
            ? raw.deliveryId as number
            : undefined;
          const acknowledge = () => {
            if (deliveryId !== undefined && channel.readyState === 'open') {
              channel.send(JSON.stringify({ type: 'ACK', deliveryId }));
            }
          };
          if (deliveryId !== undefined && deliveryId <= this.lastReceivedDeliveryId) {
            acknowledge();
            return;
          }
          const msg = validateCrdtSyncMessage(raw);
          if (!msg) {
            console.warn('P2P CRDT sync message failed validation.');
            return;
          }
          if (msg.type === 'INITIAL_SYNC' && msg.ops) {
            this.options.onInitialSync?.(msg.ops, msg.layerId);
          } else if (msg.type === 'PIXEL_OPS' && msg.ops) {
            this.options.onRemotePixelOps?.(msg.ops, msg.layerId);
          } else if (msg.type === 'STRUCTURE_SYNC' && msg.frames) {
            this.options.onStructureSync?.(msg.frames);
          }
          if (deliveryId !== undefined) this.lastReceivedDeliveryId = deliveryId;
          acknowledge();
        } catch (err) {
          console.error('Failed to parse CRDT sync message:', err);
        }
      };
    } else if (channel.label === 'pixibun-presence') {
      this.presenceChannel = channel;
      channel.onmessage = (e) => {
        try {
          if (!this.presenceRateLimiter.take('presence')) {
            // Drop excessive presence frame silently
            return;
          }
          if (typeof e.data === 'string' && getUtf8ByteLength(e.data) > MAX_P2P_PAYLOAD_SIZE) {
            console.warn('P2P presence payload exceeded 256KB limit. Discarding message.');
            return;
          }
          const raw = SafeJson.parse<Record<string, unknown>>(e.data);
          const msg = validatePresenceMessage(raw);
          if (!msg) {
            console.warn('P2P presence message failed validation.');
            return;
          }
          if (msg.type === 'CURSOR') {
            this.options.onRemoteCursor?.({
              peerId: msg.peerId,
              name: msg.name,
              color: msg.color,
              x: msg.x,
              y: msg.y,
              lastUpdated: Date.now(),
            });
          }
        } catch (err) {
          console.error('Failed to parse presence message:', err);
        }
      };
    }
  }

  /**
   * Helper waiting for ICE candidate gathering completion:
   * - 5000ms hard safety ceiling (ensuring slow cellular/VPN/STUN candidates are gathered).
   * - Resolves immediately when gathering state is 'complete' or null candidate is received.
   * - Resolves on a 600ms idle debounce once candidate gathering settles.
   */
  private waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      let done = false;
      let idleTimeoutId: ReturnType<typeof setTimeout> | null = null;

      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(hardTimeoutId);
        if (idleTimeoutId) clearTimeout(idleTimeoutId);
        pc.removeEventListener('icegatheringstatechange', checkState);
        pc.removeEventListener('icecandidate', checkCandidate);
        resolve();
      };

      const hardTimeoutId = setTimeout(finish, 5000);

      const checkState = () => {
        if (pc.iceGatheringState === 'complete') {
          finish();
        }
      };

      const checkCandidate = (e: RTCPeerConnectionIceEvent) => {
        if (e.candidate) {
          if (idleTimeoutId) clearTimeout(idleTimeoutId);
          idleTimeoutId = setTimeout(finish, 600);
        } else {
          // null candidate signals end of candidate gathering
          finish();
        }
      };

      pc.addEventListener('icegatheringstatechange', checkState);
      pc.addEventListener('icecandidate', checkCandidate);
    });
  }

  /**
   * Host workflow: creates local offer, waits for ICE candidates, and returns the invite code.
   */
  public async createHostInvite(): Promise<string> {
    this.setState('generating-offer');
    this.iceCandidates = [];

    const pc = this.initPeerConnection();

    // Create Reliable Ordered CRDT Sync Channel
    const syncCh = pc.createDataChannel('pixibun-crdt-sync', { ordered: true });
    this.setupChannel(syncCh);

    // Create Unreliable Unordered Presence Channel (PR-SCTP maxRetransmits: 0)
    const presenceCh = pc.createDataChannel('pixibun-presence', {
      ordered: false,
      maxRetransmits: 0,
    });
    this.setupChannel(presenceCh);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await this.waitForIceGathering(pc);

    this.setState('waiting-for-answer');

    const payload: SignalingPayload = {
      version: 1,
      peerId: this.peerId,
      sdp: pc.localDescription!.toJSON(),
      candidates: this.iceCandidates,
    };

    return encodeSignalingToken(payload);
  }

  /**
   * Guest workflow: accepts host invite token, creates answer, and returns answer token.
   */
  public async acceptHostInvite(inviteToken: string): Promise<string> {
    this.setState('connecting');
    this.iceCandidates = [];

    const hostPayload = decodeSignalingToken(inviteToken);
    const pc = this.initPeerConnection();

    await pc.setRemoteDescription(new RTCSessionDescription(hostPayload.sdp));

    // Add host ICE candidates
    for (const c of hostPayload.candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (err) {
        console.warn('Could not add host ICE candidate:', err);
      }
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await this.waitForIceGathering(pc);

    const guestPayload: SignalingPayload = {
      version: 1,
      peerId: this.peerId,
      sdp: pc.localDescription!.toJSON(),
      candidates: this.iceCandidates,
    };

    return encodeSignalingToken(guestPayload);
  }

  /**
   * Host workflow (final step): applies guest answer token to complete connection.
   */
  public async completeHostConnection(answerToken: string): Promise<void> {
    if (!this.pc) {
      throw new Error('Host connection has not been initialized.');
    }

    this.setState('connecting');
    const guestPayload = decodeSignalingToken(answerToken);

    await this.pc.setRemoteDescription(new RTCSessionDescription(guestPayload.sdp));

    for (const c of guestPayload.candidates) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (err) {
        console.warn('Could not add guest ICE candidate:', err);
      }
    }
  }

  /**
   * Broadcasts CRDT pixel operations over the reliable ordered channel.
   */
  public broadcastPixelOps(ops: PixelOp[], layerId?: string): boolean {
    if (!this.syncChannel || this.syncChannel.readyState !== 'open' || ops.length === 0) {
      return false;
    }


    const CHUNK_SIZE = 256;
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const chunk = ops.slice(i, i + CHUNK_SIZE);
      const msg: CrdtSyncMessage = {
        type: 'PIXEL_OPS',
        peerId: this.peerId,
        ops: chunk,
        ...(layerId !== undefined ? { layerId } : {}),
        timestamp: Date.now(),
      };
      if (!this.queueReliable(msg)) return false;
    }
    return true;
  }

  /**
   * Broadcasts initial full state over the reliable ordered channel.
   * Chunks large snapshots into batches of 256 ops to stay safely within the 256KB frame limit.
   */
  public broadcastInitialSync(allOps: PixelOp[], layerId?: string): boolean {
    if (!this.syncChannel || this.syncChannel.readyState !== 'open') {
      return false;
    }


    if (allOps.length === 0) {
      const msg: CrdtSyncMessage = {
        type: 'INITIAL_SYNC',
        peerId: this.peerId,
        ops: [],
        ...(layerId !== undefined ? { layerId } : {}),
        timestamp: Date.now(),
      };
      if (!this.queueReliable(msg)) return false;
      return true;
    }

    const CHUNK_SIZE = 256;
    for (let i = 0; i < allOps.length; i += CHUNK_SIZE) {
      const chunk = allOps.slice(i, i + CHUNK_SIZE);
      const msg: CrdtSyncMessage = {
        type: 'INITIAL_SYNC',
        peerId: this.peerId,
        ops: chunk,
        ...(layerId !== undefined ? { layerId } : {}),
        timestamp: Date.now(),
      };
      if (!this.queueReliable(msg)) return false;
    }
    return true;
  }

  /**
   * Broadcasts the host's layer/frame structure so both peers share one layer
   * ID namespace (a prerequisite for per-layer CRDT op routing).
   * The payload is metadata-only (no pixels) and validated on receipt by
   * validateStructurePayload.
   */
  public broadcastStructure(payload: StructurePayload): boolean {
    if (!this.syncChannel || this.syncChannel.readyState !== 'open') {
      return false;
    }


    const msg: CrdtSyncMessage = {
      type: 'STRUCTURE_SYNC',
      peerId: this.peerId,
      frames: payload,
      timestamp: Date.now(),
    };
    const json = JSON.stringify(msg);
    if (json.length > MAX_P2P_PAYLOAD_SIZE) {
      console.warn('P2P structure payload exceeded 256KB limit. Discarding message.');
      return false;
    }
    if (!this.queueReliable(msg)) return false;
    return true;
  }

  /**
   * Broadcasts cursor position over the lossy, zero-retransmission presence channel.
   */
  public broadcastCursor(x: number, y: number): boolean {
    if (!this.presenceChannel || this.presenceChannel.readyState !== 'open') {
      return false;
    }

    // Drop lossy cursor frame under backpressure
    if ((this.presenceChannel.bufferedAmount ?? 0) > MAX_PRESENCE_BUFFERED_AMOUNT) {
      return false;
    }

    const msg: PresenceMessage = {
      type: 'CURSOR',
      peerId: this.peerId,
      name: this.peerName,
      color: this.peerColor,
      x,
      y,
    };

    this.presenceChannel.send(JSON.stringify(msg));
    return true;
  }

  /**
   * Closes data channels and peer connection.
   */
  public disconnect(): void {
    if (this.retryTimer) clearInterval(this.retryTimer);
    this.retryTimer = null;
    this.pendingMessages.clear();
    this.lastReceivedDeliveryId = 0;
    if (this.syncChannel) {
      this.syncChannel.close();
      this.syncChannel = null;
    }
    if (this.presenceChannel) {
      this.presenceChannel.close();
      this.presenceChannel = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.setState('disconnected');
  }
}
