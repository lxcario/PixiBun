import { describe, it, expect, vi } from 'vitest';
import {
  encodeSignalingToken,
  decodeSignalingToken,
  P2PSyncSession,
  SignalingPayload,
} from '@/lib/sync/p2pSync';
import { CrdtPixelBuffer } from '@/lib/collab/crdtPixelBuffer';

describe('P2P WebRTC Canvas Pairing & State Sync Engine', () => {
  it('encodes and decodes signaling tokens without loss', () => {
    const originalPayload: SignalingPayload = {
      version: 1,
      peerId: 'peer-alpha-123',
      sdp: {
        type: 'offer',
        sdp: 'v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n',
      },
      candidates: [
        {
          candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 50000 typ host',
          sdpMid: '0',
          sdpMLineIndex: 0,
        },
      ],
    };

    const token = encodeSignalingToken(originalPayload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(32);

    const decoded = decodeSignalingToken(token);
    expect(decoded).toEqual(originalPayload);
  });

  it('rejects malformed or invalid signaling tokens', () => {
    expect(() => decodeSignalingToken('not-a-valid-token')).toThrow();
    expect(() => decodeSignalingToken(Buffer.from('{"version":2}').toString('base64'))).toThrow(
      'Invalid PixiBun signaling token format.'
    );
  });

  it('initializes session with correct peer identity and initial idle state', () => {
    const session = new P2PSyncSession({
      peerId: 'peer-tester',
      peerName: 'PixelMaster',
      peerColor: '#ff0055',
    });

    expect(session.peerId).toBe('peer-tester');
    expect(session.peerName).toBe('PixelMaster');
    expect(session.peerColor).toBe('#ff0055');
    expect(session.getState()).toBe('idle');
  });

  it('coordinates dual RTCDataChannel message transmission with CrdtPixelBuffer', () => {
    const bufferA = new CrdtPixelBuffer(16, 16, 'peer-alice');
    const bufferB = new CrdtPixelBuffer(16, 16, 'peer-bob');

    const mockSyncChannel = {
      label: 'pixibun-crdt-sync',
      readyState: 'open',
      send: vi.fn(),
      close: vi.fn(),
    };

    const mockPresenceChannel = {
      label: 'pixibun-presence',
      readyState: 'open',
      send: vi.fn(),
      close: vi.fn(),
    };

    const session = new P2PSyncSession({
      peerId: 'peer-alice',
      onRemotePixelOps: (ops) => {
        bufferB.applyRemoteOps(ops);
      },
    });

    // Inject mock data channels to test payload formatting
    (session as unknown as { syncChannel: typeof mockSyncChannel }).syncChannel = mockSyncChannel;
    (session as unknown as { presenceChannel: typeof mockPresenceChannel }).presenceChannel =
      mockPresenceChannel;

    // Draw local stroke
    const op = bufferA.setPixel(5, 5, [255, 128, 0, 255])!;
    const sent = session.broadcastPixelOps([op]);

    expect(sent).toBe(true);
    expect(mockSyncChannel.send).toHaveBeenCalledTimes(1);

    const syncCallArg = JSON.parse(mockSyncChannel.send.mock.calls[0][0]);
    expect(syncCallArg.type).toBe('PIXEL_OPS');
    expect(syncCallArg.peerId).toBe('peer-alice');
    expect(syncCallArg.ops.length).toBe(1);
    expect(syncCallArg.ops[0].x).toBe(5);
    expect(syncCallArg.ops[0].y).toBe(5);

    // Simulate receiving remote stroke on client B
    bufferB.applyRemoteOps(syncCallArg.ops);
    expect(bufferB.getPixel(5, 5)).toEqual([255, 128, 0, 255]);

    // Test cursor presence broadcast
    const cursorSent = session.broadcastCursor(120, 85);
    expect(cursorSent).toBe(true);
    expect(mockPresenceChannel.send).toHaveBeenCalledTimes(1);

    const presenceCallArg = JSON.parse(mockPresenceChannel.send.mock.calls[0][0]);
    expect(presenceCallArg.type).toBe('CURSOR');
    expect(presenceCallArg.x).toBe(120);
    expect(presenceCallArg.y).toBe(85);

    session.disconnect();
    expect(session.getState()).toBe('disconnected');
    expect(mockSyncChannel.close).toHaveBeenCalled();
    expect(mockPresenceChannel.close).toHaveBeenCalled();
  });
});
