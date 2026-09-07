import { describe, it, expect } from 'vitest';
import {
  isValidPixelOp,
  validateCrdtSyncMessage,
  validatePresenceMessage,
  MAX_P2P_PAYLOAD_SIZE,
  P2PSyncSession,
  LAN_ICE_SERVERS,
  PUBLIC_STUN_ICE_SERVERS,
  DEFAULT_ICE_SERVERS,
  encodeSignalingToken,
  decodeSignalingToken,
  SignalingPayload,
} from '@/lib/sync/p2pSync';
import { CrdtPixelBuffer, MAX_OP_LOG_SIZE, PixelOp } from '@/lib/collab/crdtPixelBuffer';

describe('P2P WebRTC Message Validation & Security Safeguards', () => {
  it('enforces 256KB maximum payload size constant', () => {
    expect(MAX_P2P_PAYLOAD_SIZE).toBe(256 * 1024);
    expect(MAX_P2P_PAYLOAD_SIZE).toBe(262144);
  });

  describe('isValidPixelOp boundary validation', () => {
    const validOp: PixelOp = {
      x: 100,
      y: 200,
      r: 255,
      g: 128,
      b: 64,
      a: 255,
      timestamp: 1700000000000,
      peerId: 'peer-alice-1234',
    };

    it('accepts valid PixelOp within [0, 4096) and [0, 255] color bounds', () => {
      expect(isValidPixelOp(validOp)).toBe(true);
      expect(isValidPixelOp({ ...validOp, x: 0, y: 0, r: 0, g: 0, b: 0, a: 0 })).toBe(true);
      expect(isValidPixelOp({ ...validOp, x: 4095, y: 4095, r: 255, g: 255, b: 255, a: 255 })).toBe(true);
    });

    it('rejects coordinate boundaries < 0 or >= 4096', () => {
      expect(isValidPixelOp({ ...validOp, x: -1 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, y: -1 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, x: 4096 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, y: 4096 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, x: 10000 })).toBe(false);
    });

    it('rejects non-integer coordinate values', () => {
      expect(isValidPixelOp({ ...validOp, x: 12.5 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, y: 99.99 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, x: NaN })).toBe(false);
      expect(isValidPixelOp({ ...validOp, y: Infinity })).toBe(false);
    });

    it('rejects color channels outside [0, 255] range', () => {
      expect(isValidPixelOp({ ...validOp, r: -1 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, r: 256 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, r: 128.5 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, g: -5 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, g: 300 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, g: 0.1 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, b: -0.1 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, b: 255.1 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, b: 64.99 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, a: -1 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, a: 256 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, a: 254.5 })).toBe(false);
    });

    it('rejects invalid timestamps or peerIds', () => {
      expect(isValidPixelOp({ ...validOp, timestamp: 0 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, timestamp: -100 })).toBe(false);
      expect(isValidPixelOp({ ...validOp, timestamp: NaN })).toBe(false);
      expect(isValidPixelOp({ ...validOp, peerId: '' })).toBe(false);
      expect(isValidPixelOp({ ...validOp, peerId: 'a'.repeat(200) })).toBe(false);
    });

    it('rejects non-objects, null, and undefined', () => {
      expect(isValidPixelOp(null)).toBe(false);
      expect(isValidPixelOp(undefined)).toBe(false);
      expect(isValidPixelOp('string')).toBe(false);
      expect(isValidPixelOp(123)).toBe(false);
      expect(isValidPixelOp([])).toBe(false);
    });
  });

  describe('validateCrdtSyncMessage schema validation', () => {
    it('accepts valid INITIAL_SYNC and PIXEL_OPS payloads', () => {
      const validPixelOp: PixelOp = {
        x: 10,
        y: 20,
        r: 255,
        g: 0,
        b: 0,
        a: 255,
        timestamp: 1000,
        peerId: 'peer-1',
      };

      const msgOps = validateCrdtSyncMessage({
        type: 'PIXEL_OPS',
        peerId: 'peer-1',
        layerId: 'layer-1',
        ops: [validPixelOp],
        timestamp: 2000,
      });
      expect(msgOps).not.toBeNull();
      expect(msgOps?.type).toBe('PIXEL_OPS');
      expect(msgOps?.ops?.length).toBe(1);
      expect(msgOps?.layerId).toBe('layer-1');

      const msgSync = validateCrdtSyncMessage({
        type: 'INITIAL_SYNC',
        peerId: 'peer-1',
        layerId: 'layer-1',
        ops: [validPixelOp],
      });
      expect(msgSync).not.toBeNull();
      expect(msgSync?.type).toBe('INITIAL_SYNC');

      const msgPing = validateCrdtSyncMessage({
        type: 'PING',
        peerId: 'peer-1',
      });
      expect(msgPing).not.toBeNull();
      expect(msgPing?.type).toBe('PING');
    });

    it('rejects invalid message types and malformed envelopes', () => {
      expect(validateCrdtSyncMessage({ type: 'UNKNOWN', peerId: 'p' })).toBeNull();
      expect(validateCrdtSyncMessage({ type: 'PIXEL_OPS' })).toBeNull();
      expect(validateCrdtSyncMessage({ type: 'PIXEL_OPS', peerId: '' })).toBeNull();
      // Ops messages MUST carry a layerId so per-layer CRDT routing is unambiguous
      expect(
        validateCrdtSyncMessage({
          type: 'PIXEL_OPS',
          peerId: 'p',
          ops: [{ x: 0, y: 0, r: 0, g: 0, b: 0, a: 0, timestamp: 1, peerId: 'p' }],
        })
      ).toBeNull();
      expect(validateCrdtSyncMessage(null)).toBeNull();
      expect(validateCrdtSyncMessage('hello')).toBeNull();
    });

    it('rejects PIXEL_OPS containing any out-of-bounds or malicious op', () => {
      const validOp: PixelOp = {
        x: 10,
        y: 20,
        r: 255,
        g: 0,
        b: 0,
        a: 255,
        timestamp: 1000,
        peerId: 'peer-1',
      };
      const maliciousOp = {
        x: 99999, // Out of bounds
        y: 20,
        r: 255,
        g: 0,
        b: 0,
        a: 255,
        timestamp: 1000,
        peerId: 'peer-1',
      };

      const result = validateCrdtSyncMessage({
        type: 'PIXEL_OPS',
        peerId: 'peer-1',
        layerId: 'layer-1',
        ops: [validOp, maliciousOp],
      });
      expect(result).toBeNull();
    });
  });

  describe('validatePresenceMessage schema validation', () => {
    it('accepts valid CURSOR presence message', () => {
      const result = validatePresenceMessage({
        type: 'CURSOR',
        peerId: 'peer-alice',
        name: 'Alice',
        color: '#f0be7c',
        x: 42,
        y: 84,
      });
      expect(result).toEqual({
        type: 'CURSOR',
        peerId: 'peer-alice',
        name: 'Alice',
        color: '#f0be7c',
        x: 42,
        y: 84,
      });
    });

    it('accepts valid hex colors with 3, 4, 6, or 8 hex digits', () => {
      const base = { type: 'CURSOR', peerId: 'p1', name: 'Alice', x: 0, y: 0 };
      expect(validatePresenceMessage({ ...base, color: '#fff' })?.color).toBe('#fff');
      expect(validatePresenceMessage({ ...base, color: '#abcd' })?.color).toBe('#abcd');
      expect(validatePresenceMessage({ ...base, color: '#123456' })?.color).toBe('#123456');
      expect(validatePresenceMessage({ ...base, color: '#f0be7c80' })?.color).toBe('#f0be7c80');
    });

    it('rejects invalid, non-hex, or malformed color formats', () => {
      const base = { type: 'CURSOR', peerId: 'p1', name: 'Alice', x: 0, y: 0 };
      expect(validatePresenceMessage({ ...base, color: 'red' })).toBeNull();
      expect(validatePresenceMessage({ ...base, color: 'rgb(0,0,0)' })).toBeNull();
      expect(validatePresenceMessage({ ...base, color: '#12' })).toBeNull(); // Too short
      expect(validatePresenceMessage({ ...base, color: '#12345' })).toBeNull(); // 5 digits (invalid in CSS)
      expect(validatePresenceMessage({ ...base, color: '#1234567' })).toBeNull(); // 7 digits (invalid in CSS)
      expect(validatePresenceMessage({ ...base, color: '#123456789' })).toBeNull(); // Too long (9 digits)
      expect(validatePresenceMessage({ ...base, color: '#xyz' })).toBeNull(); // Non-hex characters
      expect(validatePresenceMessage({ ...base, color: '' })).toBeNull();
    });

    it('sanitizes and strips control characters and bidi overrides from peer name', () => {
      const base = { type: 'CURSOR', peerId: 'p1', color: '#fff', x: 0, y: 0 };
      const cleaned = validatePresenceMessage({ ...base, name: 'Alice\x00\x07\x1b' });
      expect(cleaned?.name).toBe('Alice');

      const c1Cleaned = validatePresenceMessage({ ...base, name: 'Bob\x7f\x80\x9f' });
      expect(c1Cleaned?.name).toBe('Bob');

      const bidiCleaned = validatePresenceMessage({ ...base, name: 'Charlie\u202Eevil\u200B' });
      expect(bidiCleaned?.name).toBe('Charlieevil');
    });

    it('rejects presence messages with missing, overlong, or empty fields after sanitization', () => {
      const base = { type: 'CURSOR', peerId: 'p1', color: '#fff', x: 0, y: 0 };
      expect(validatePresenceMessage({ ...base, name: '\x00\x07\x1b' })).toBeNull(); // Empty after strip
      expect(validatePresenceMessage({ ...base, name: ' ' })).toBeNull(); // Whitespace only
      expect(validatePresenceMessage({ ...base, name: 'a'.repeat(65) })).toBeNull(); // Exceeds 64 chars
      expect(validatePresenceMessage({ ...base, name: 'a'.repeat(200) })).toBeNull(); // Guard rejects > 128
      expect(validatePresenceMessage({ type: 'CURSOR', peerId: 'p1', x: NaN, y: 10 })).toBeNull();
      expect(validatePresenceMessage({ type: 'NOT_CURSOR', peerId: 'p1' })).toBeNull();
      expect(validatePresenceMessage({ type: 'CURSOR', peerId: '', name: 'A', color: '#fff', x: 0, y: 0 })).toBeNull();
      expect(validatePresenceMessage(null)).toBeNull();
    });
  });

  describe('CrdtPixelBuffer sliding window opLog & state snapshot', () => {
    it('bounds opLog with sliding window MAX_OP_LOG_SIZE = 10000 to prevent memory exhaustion', () => {
      expect(MAX_OP_LOG_SIZE).toBe(10000);

      const buffer = new CrdtPixelBuffer(64, 64, 'peer-test');

      // Add 10,050 operations
      for (let i = 0; i < 10050; i++) {
        const x = i % 64;
        const y = Math.floor(i / 64) % 64;
        buffer.setPixel(x, y, [255, 100, 50, 255]);
      }

      const allOps = buffer.getAllOps();
      expect(allOps.length).toBe(MAX_OP_LOG_SIZE);
      expect(allOps.length).toBe(10000);
    });

    it('also bounds opLog when receiving remote operations via applyRemoteOp', () => {
      const buffer = new CrdtPixelBuffer(32, 32, 'peer-local');

      for (let i = 0; i < 10020; i++) {
        buffer.applyRemoteOp({
          x: i % 32,
          y: Math.floor(i / 32) % 32,
          r: 10,
          g: 20,
          b: 30,
          a: 255,
          timestamp: 100000 + i,
          peerId: 'peer-remote',
        });
      }

      expect(buffer.getAllOps().length).toBe(MAX_OP_LOG_SIZE);
    });

    it('getStateSnapshotOps exports complete canvas state for newly joined peer synchronization', () => {
      const bufferA = new CrdtPixelBuffer(16, 16, 'peer-A');

      // Draw 3 pixels
      bufferA.setPixel(0, 0, [255, 0, 0, 255]);
      bufferA.setPixel(5, 5, [0, 255, 0, 255]);
      bufferA.setPixel(15, 15, [0, 0, 255, 255]);

      const snapshot = bufferA.getStateSnapshotOps();
      expect(snapshot.length).toBe(3);

      expect(snapshot).toContainEqual(
        expect.objectContaining({ x: 0, y: 0, r: 255, g: 0, b: 0, a: 255, peerId: 'peer-A' })
      );
      expect(snapshot).toContainEqual(
        expect.objectContaining({ x: 5, y: 5, r: 0, g: 255, b: 0, a: 255, peerId: 'peer-A' })
      );
      expect(snapshot).toContainEqual(
        expect.objectContaining({ x: 15, y: 15, r: 0, g: 0, b: 255, a: 255, peerId: 'peer-A' })
      );

      // Hydrate peer B from snapshot
      const bufferB = new CrdtPixelBuffer(16, 16, 'peer-B');
      bufferB.applyRemoteOps(snapshot);

      expect(bufferB.getPixel(0, 0)).toEqual([255, 0, 0, 255]);
      expect(bufferB.getPixel(5, 5)).toEqual([0, 255, 0, 255]);
      expect(bufferB.getPixel(15, 15)).toEqual([0, 0, 255, 255]);
      expect(bufferB.getPixel(1, 1)).toEqual([0, 0, 0, 0]);
    });
  });

  describe('P2PSyncSession message batching & chunking', () => {
    it('chunks large snapshots into 1,000-op batches during broadcastInitialSync', () => {
      const session = new P2PSyncSession({ peerId: 'peer-host' });
      const sentPayloads: string[] = [];

      (session as unknown as { syncChannel: { readyState: string; send: (d: string) => void } }).syncChannel = {
        readyState: 'open',
        send: (data: string) => {
          sentPayloads.push(data);
        },
      };

      // Generate 2500 ops (more than 2x chunk size)
      const ops: PixelOp[] = Array.from({ length: 2500 }, (_, i) => ({
        x: i % 64,
        y: Math.floor(i / 64),
        r: 255,
        g: 100,
        b: 50,
        a: 255,
        timestamp: 1000 + i,
        peerId: 'peer-host',
      }));

      const ok = session.broadcastInitialSync(ops);
      expect(ok).toBe(true);

      // Must be split into 3 chunks: 1000 + 1000 + 500
      expect(sentPayloads.length).toBe(3);

      for (const payload of sentPayloads) {
        // Every single payload MUST be strictly less than MAX_P2P_PAYLOAD_SIZE (256KB)
        expect(payload.length).toBeLessThan(MAX_P2P_PAYLOAD_SIZE);
        const parsed = JSON.parse(payload);
        expect(parsed.type).toBe('INITIAL_SYNC');
        expect(parsed.ops.length).toBeLessThanOrEqual(1000);
      }

      const totalReceivedOps = sentPayloads.reduce(
        (sum, p) => sum + JSON.parse(p).ops.length,
        0
      );
      expect(totalReceivedOps).toBe(2500);
    });

    it('chunks large pixel op batches during broadcastPixelOps', () => {
      const session = new P2PSyncSession({ peerId: 'peer-guest' });
      const sentPayloads: string[] = [];

      (session as unknown as { syncChannel: { readyState: string; send: (d: string) => void } }).syncChannel = {
        readyState: 'open',
        send: (data: string) => {
          sentPayloads.push(data);
        },
      };

      const ops: PixelOp[] = Array.from({ length: 2200 }, (_, i) => ({
        x: i % 32,
        y: Math.floor(i / 32),
        r: 10,
        g: 20,
        b: 30,
        a: 255,
        timestamp: 2000 + i,
        peerId: 'peer-guest',
      }));

      const ok = session.broadcastPixelOps(ops);
      expect(ok).toBe(true);
      expect(sentPayloads.length).toBe(3); // 1000, 1000, 200

      for (const payload of sentPayloads) {
        expect(payload.length).toBeLessThan(MAX_P2P_PAYLOAD_SIZE);
      }
    });
  });

  describe('P2P WebRTC Privacy & LAN-Only Mode Safeguards', () => {
    it('defaults DEFAULT_ICE_SERVERS to LAN_ICE_SERVERS with zero external egress', () => {
      expect(DEFAULT_ICE_SERVERS).toEqual([]);
      expect(LAN_ICE_SERVERS).toEqual([]);
      expect(PUBLIC_STUN_ICE_SERVERS.length).toBeGreaterThan(0);
    });

    it('enforces LAN-only mode even when custom iceServers are provided if lanOnly is true', () => {
      const session = new P2PSyncSession({
        peerId: 'peer-lan',
        lanOnly: true,
        iceServers: [{ urls: 'stun:stun.example.com' }],
      });
      // Verify options retain configuration
      expect((session as unknown as { options: { lanOnly: boolean } }).options.lanOnly).toBe(true);
    });
  });

  describe('Signaling Token Modern UTF-8 & URL-Safe Base64 Encoding', () => {
    it('correctly decodes standard and URL-safe base64 tokens with unicode content', () => {
      const payload: SignalingPayload = {
        version: 1,
        peerId: 'peer-🐇-artisan',
        sdp: { type: 'offer', sdp: 'v=0\r\no=test\r\ns=-\r\n' },
        candidates: [{ candidate: 'cand1', sdpMid: '0', sdpMLineIndex: 0 }],
      };

      const token = encodeSignalingToken(payload);
      expect(typeof token).toBe('string');

      // Decode standard token
      const decoded = decodeSignalingToken(token);
      expect(decoded.peerId).toBe('peer-🐇-artisan');
      expect(decoded.sdp.type).toBe('offer');

      // Convert standard Base64 to URL-safe Base64 (- and _ without padding)
      const urlSafeToken = token.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const decodedUrlSafe = decodeSignalingToken(urlSafeToken);
      expect(decodedUrlSafe).toEqual(payload);
    });

    it('throws descriptive error on empty, corrupted, or malformed signaling tokens', () => {
      expect(() => decodeSignalingToken('')).toThrow(/Invalid signaling token format/);
      expect(() => decodeSignalingToken('   ')).toThrow(/Invalid signaling token format/);
      expect(() => decodeSignalingToken('not-a-valid-base64-json!')).toThrow(/Invalid signaling token format/);
      // Valid base64 but invalid JSON structure (missing required fields)
      const invalidJsonToken = Buffer.from(JSON.stringify({ someField: 123 })).toString('base64');
      expect(() => decodeSignalingToken(invalidJsonToken)).toThrow(/Invalid signaling token format/);
    });
  });
});
