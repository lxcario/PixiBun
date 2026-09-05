/**
 * Local-First Peer-to-Peer WebRTC Synchronization Engine for PixiBun Atelier.
 *
 * Academic Citations:
 * - Martin Kleppmann, Adam Wiggins, Peter van Hardenberg, Mark McGranaghan,
 *   "Local-First Software: You Own Your Data, in spite of the Cloud,"
 *   ACM Onward! Essays, pp. 154-178, 2019.
 * - Marc Shapiro, Nuno Preguiça, Carlos Baquero, Marek Zawirski,
 *   "Conflict-Free Replicated Data Types," SSS 2011, LNCS 6976, pp. 386-400.
 * - RFC 8831: WebRTC Data Channels / RFC 8832: WebRTC Data Channel Establishment Protocol.
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
  type: 'INITIAL_SYNC' | 'PIXEL_OPS' | 'PING';
  peerId: string;
  ops?: PixelOp[];
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
  onRemotePixelOps?: (ops: PixelOp[]) => void;
  onInitialSync?: (ops: PixelOp[]) => void;
  onRemoteCursor?: (cursor: RemoteCursor) => void;
  onConnectionStateChange?: (state: P2PConnectionState) => void;
  onError?: (error: Error) => void;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const MAX_P2P_PAYLOAD_SIZE = 256 * 1024; // 256 KB

/**
 * Validates whether an incoming object conforms to a valid PixelOp with strict boundary constraints:
 * - 0 <= x, y < 4096 (canvas coordinate bounds)
 * - 0 <= r, g, b, a <= 255 (8-bit color channel bounds)
 * - valid numeric timestamp and non-empty peerId
 */
export function isValidPixelOp(op: unknown): op is PixelOp {
  if (typeof op !== 'object' || op === null) return false;
  const o = op as Record<string, unknown>;

  if (typeof o.x !== 'number' || !Number.isFinite(o.x) || Math.floor(o.x) !== o.x || o.x < 0 || o.x >= 4096) {
    return false;
  }
  if (typeof o.y !== 'number' || !Number.isFinite(o.y) || Math.floor(o.y) !== o.y || o.y < 0 || o.y >= 4096) {
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

  return true;
}

/**
 * Validates and sanitizes an incoming CRDT sync message.
 */
export function validateCrdtSyncMessage(data: unknown): CrdtSyncMessage | null {
  if (typeof data !== 'object' || data === null) return null;
  const msg = data as Record<string, unknown>;

  if (msg.type !== 'INITIAL_SYNC' && msg.type !== 'PIXEL_OPS' && msg.type !== 'PING') {
    return null;
  }
  if (typeof msg.peerId !== 'string' || msg.peerId.length === 0 || msg.peerId.length > 128) {
    return null;
  }

  if (msg.type === 'INITIAL_SYNC' || msg.type === 'PIXEL_OPS') {
    if (!Array.isArray(msg.ops)) return null;
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
 * Validates and sanitizes an incoming Presence message.
 */
export function validatePresenceMessage(data: unknown): PresenceMessage | null {
  if (typeof data !== 'object' || data === null) return null;
  const msg = data as Record<string, unknown>;

  if (msg.type !== 'CURSOR') return null;
  if (typeof msg.peerId !== 'string' || msg.peerId.length === 0 || msg.peerId.length > 128) return null;
  if (typeof msg.name !== 'string' || msg.name.length > 64) return null;
  if (typeof msg.color !== 'string' || msg.color.length > 32) return null;
  if (typeof msg.x !== 'number' || !Number.isFinite(msg.x)) return null;
  if (typeof msg.y !== 'number' || !Number.isFinite(msg.y)) return null;

  return {
    type: 'CURSOR',
    peerId: msg.peerId,
    name: msg.name,
    color: msg.color,
    x: msg.x,
    y: msg.y,
  };
}

/**
 * Encodes signaling payload into a compact URL-safe base64 string.
 */
export function encodeSignalingToken(payload: SignalingPayload): string {
  const json = JSON.stringify(payload);
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(json)));
  }
  return Buffer.from(json, 'utf-8').toString('base64');
}

/**
 * Decodes signaling token from a base64 string.
 */
export function decodeSignalingToken(token: string): SignalingPayload {
  const clean = token.trim();
  let json = '';
  if (typeof atob !== 'undefined') {
    json = decodeURIComponent(escape(atob(clean)));
  } else {
    json = Buffer.from(clean, 'base64').toString('utf-8');
  }

  const parsed = JSON.parse(json);
  if (!parsed || parsed.version !== 1 || !parsed.sdp || !Array.isArray(parsed.candidates)) {
    throw new Error('Invalid PixiBun signaling token format.');
  }

  return parsed as SignalingPayload;
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

    const pc = new RTCPeerConnection({
      iceServers: this.options.iceServers ?? DEFAULT_ICE_SERVERS,
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
      this.syncChannel = channel;
      channel.onopen = () => {
        if (this.pc?.connectionState === 'connected' || channel.readyState === 'open') {
          this.setState('connected');
        }
      };
      channel.onmessage = (e) => {
        try {
          if (typeof e.data === 'string' && e.data.length > MAX_P2P_PAYLOAD_SIZE) {
            console.warn('P2P payload exceeded 256KB limit. Discarding message.');
            return;
          }
          const raw = JSON.parse(e.data);
          const msg = validateCrdtSyncMessage(raw);
          if (!msg) {
            console.warn('P2P CRDT sync message failed validation.');
            return;
          }
          if (msg.type === 'INITIAL_SYNC' && msg.ops) {
            this.options.onInitialSync?.(msg.ops);
          } else if (msg.type === 'PIXEL_OPS' && msg.ops) {
            this.options.onRemotePixelOps?.(msg.ops);
          }
        } catch (err) {
          console.error('Failed to parse CRDT sync message:', err);
        }
      };
    } else if (channel.label === 'pixibun-presence') {
      this.presenceChannel = channel;
      channel.onmessage = (e) => {
        try {
          if (typeof e.data === 'string' && e.data.length > MAX_P2P_PAYLOAD_SIZE) {
            console.warn('P2P presence payload exceeded 256KB limit. Discarding message.');
            return;
          }
          const raw = JSON.parse(e.data);
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
   * Helper waiting for ICE candidate gathering completion (with a 1500ms safety timeout).
   */
  private waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }, 1500);

      const checkState = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeoutId);
          pc.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };

      pc.addEventListener('icegatheringstatechange', checkState);
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
  public broadcastPixelOps(ops: PixelOp[]): boolean {
    if (!this.syncChannel || this.syncChannel.readyState !== 'open' || ops.length === 0) {
      return false;
    }

    const CHUNK_SIZE = 1000;
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const chunk = ops.slice(i, i + CHUNK_SIZE);
      const msg: CrdtSyncMessage = {
        type: 'PIXEL_OPS',
        peerId: this.peerId,
        ops: chunk,
        timestamp: Date.now(),
      };
      this.syncChannel.send(JSON.stringify(msg));
    }
    return true;
  }

  /**
   * Broadcasts initial full state over the reliable ordered channel.
   * Chunks large snapshots into batches of 1,000 ops to stay safely within the 256KB frame limit.
   */
  public broadcastInitialSync(allOps: PixelOp[]): boolean {
    if (!this.syncChannel || this.syncChannel.readyState !== 'open') {
      return false;
    }

    if (allOps.length === 0) {
      const msg: CrdtSyncMessage = {
        type: 'INITIAL_SYNC',
        peerId: this.peerId,
        ops: [],
        timestamp: Date.now(),
      };
      this.syncChannel.send(JSON.stringify(msg));
      return true;
    }

    const CHUNK_SIZE = 1000;
    for (let i = 0; i < allOps.length; i += CHUNK_SIZE) {
      const chunk = allOps.slice(i, i + CHUNK_SIZE);
      const msg: CrdtSyncMessage = {
        type: 'INITIAL_SYNC',
        peerId: this.peerId,
        ops: chunk,
        timestamp: Date.now(),
      };
      this.syncChannel.send(JSON.stringify(msg));
    }
    return true;
  }

  /**
   * Broadcasts cursor position over the lossy, zero-retransmission presence channel.
   */
  public broadcastCursor(x: number, y: number): boolean {
    if (!this.presenceChannel || this.presenceChannel.readyState !== 'open') {
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
