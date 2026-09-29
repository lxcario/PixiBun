import { describe, it, expect, vi } from 'vitest';
import {
  encodeSignalingToken,
  decodeSignalingToken,
  P2PSyncSession,
  DEFAULT_ICE_SERVERS,
  PUBLIC_STUN_ICE_SERVERS,
  SignalingPayload,
  StructurePayload,
} from '@/lib/sync/p2pSync';
import { CrdtPixelBuffer, type PixelOp } from '@/lib/collab/crdtPixelBuffer';
import { CoDrawBridge } from '@/lib/sync/coDrawBridge';
import { useStudioStore } from '@/stores/studioStore';
import { installDocumentCanvasMock } from './helpers/mockCanvas';
import { getOrCreateBuffer } from '@/lib/engine/bufferRegistry';

describe('P2P WebRTC Canvas Pairing & State Sync Engine', () => {
  it('rejects an oversized host workspace before creating an invite or allocating CRDT buffers', async () => {
    const bridge = new CoDrawBridge();
    useStudioStore.setState({
      canvasWidth: 1024,
      canvasHeight: 1024,
      frames: [{
        id: 'large-frame', durationMs: 100,
        layers: [{ id: 'large-layer', name: 'Large', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }],
      }],
    });
    await expect(bridge.startHost()).rejects.toThrow('total layer pixels');
    expect(bridge.getSession()).toBeNull();
  });

  it('rejects a dense host artwork before the initial sync can overflow its queue', async () => {
    installDocumentCanvasMock();
    const bridge = new CoDrawBridge();
    useStudioStore.setState({
      canvasWidth: 200,
      canvasHeight: 200,
      frames: [{
        id: 'dense-frame', durationMs: 100,
        layers: [{ id: 'dense-layer', name: 'Dense', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }],
      }],
    });
    const buffer = getOrCreateBuffer('dense-layer', 200, 200);
    buffer.ctx.fillStyle = '#ffffff';
    buffer.ctx.fillRect(0, 0, 180, 180);
    await expect(bridge.startHost()).rejects.toThrow('painted pixels');
    expect(bridge.getSession()).toBeNull();
  });

  it('uses the module ICE default for CoDraw unless public STUN is requested', () => {
    const bridge = new CoDrawBridge();
    const createSession = (options: { lanOnly?: boolean }) =>
      (bridge as unknown as { createSession: (options: { lanOnly?: boolean }) => P2PSyncSession })
        .createSession(options);
    const iceServers = (session: P2PSyncSession) =>
      (session as unknown as { options: { iceServers: RTCIceServer[] } }).options.iceServers;

    expect(iceServers(createSession({}))).toBe(DEFAULT_ICE_SERVERS);
    expect(iceServers(createSession({ lanOnly: false }))).toBe(PUBLIC_STUN_ICE_SERVERS);
  });
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

  it('suppresses ordered reliable retries with constant-size receive state', () => {
    const onRemotePixelOps = vi.fn();
    const channel = {
      label: 'pixibun-crdt-sync',
      readyState: 'open',
      send: vi.fn(),
      close: vi.fn(),
      bufferedAmount: 0,
      onmessage: null as ((event: { data: string }) => void) | null,
    };
    const session = new P2PSyncSession({ peerId: 'local', onRemotePixelOps });
    (session as unknown as { setupChannel: (channel: RTCDataChannel) => void }).setupChannel(
      channel as unknown as RTCDataChannel
    );
    const op = new CrdtPixelBuffer(8, 8, 'remote').setPixel(2, 3, [255, 0, 0, 255])!;
    const deliver = (deliveryId: number) => channel.onmessage?.({
      data: JSON.stringify({ type: 'PIXEL_OPS', peerId: 'remote', layerId: 'layer-1', ops: [op], deliveryId }),
    });

    for (let id = 1; id <= 2000; id++) deliver(id);
    deliver(1);
    deliver(2000);
    expect(onRemotePixelOps).toHaveBeenCalledTimes(2000);
    expect(channel.send).toHaveBeenCalledTimes(2002);
    expect((session as unknown as { lastReceivedDeliveryId: number }).lastReceivedDeliveryId).toBe(2000);

    deliver(2001);
    expect(onRemotePixelOps).toHaveBeenCalledTimes(2001);
    session.disconnect();
    expect((session as unknown as { lastReceivedDeliveryId: number }).lastReceivedDeliveryId).toBe(0);
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

  it('tracks synced layer IDs so newly created layers added after initial sync send their initial canvas snapshot', () => {
    installDocumentCanvasMock();
    const bridge = new CoDrawBridge();
    const broadcastInitialSync = vi.fn().mockReturnValue(true);
    const broadcastStructure = vi.fn(() => true);

    const mockSession = {
      getState: () => 'connected',
      broadcastStructure,
      broadcastInitialSync,
      disconnect: vi.fn(),
    };

    (bridge as unknown as { session: unknown; role: string }).session = mockSession;
    (bridge as unknown as { role: string }).role = 'host';

    useStudioStore.setState({
      canvasWidth: 8,
      canvasHeight: 8,
      frames: [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [
            {
              id: 'layer-1',
              name: 'Background',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
            },
          ],
        },
      ],
    });

    // Initial sync
    const ok1 = (bridge as unknown as { sendStructureAndSnapshots: () => boolean }).sendStructureAndSnapshots();
    expect(ok1).toBe(true);
    expect(broadcastStructure).toHaveBeenCalledTimes(1);
    expect(broadcastInitialSync).toHaveBeenCalledTimes(1);
    expect(broadcastInitialSync).toHaveBeenCalledWith(expect.any(Array), 'layer-1');

    broadcastInitialSync.mockClear();

    // Now a new layer is added after initial sync
    useStudioStore.setState({
      canvasWidth: 8,
      canvasHeight: 8,
      frames: [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [
            {
              id: 'layer-1',
              name: 'Background',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
            },
            {
              id: 'layer-2',
              name: 'Foreground',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
            },
          ],
        },
      ],
    });

    // Subsequent structure update
    const ok2 = (bridge as unknown as { sendStructureAndSnapshots: () => boolean }).sendStructureAndSnapshots();
    expect(ok2).toBe(true);
    expect(broadcastStructure).toHaveBeenCalledTimes(2);
    // Newly created layer-2 must send its initial canvas snapshot, while layer-1 is not re-sent
    expect(broadcastInitialSync).toHaveBeenCalledTimes(1);
    expect(broadcastInitialSync).toHaveBeenCalledWith(expect.any(Array), 'layer-2');

    broadcastInitialSync.mockClear();

    // Now delete layer-2
    useStudioStore.setState({
      canvasWidth: 8,
      canvasHeight: 8,
      frames: [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [
            {
              id: 'layer-1',
              name: 'Background',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
            },
          ],
        },
      ],
    });

    const ok3 = (bridge as unknown as { sendStructureAndSnapshots: () => boolean }).sendStructureAndSnapshots();
    expect(ok3).toBe(true);
    // layer-2 should be pruned from syncedLayerIds
    const syncedLayerIds = (bridge as unknown as { syncedLayerIds: Set<string> }).syncedLayerIds;
    expect(syncedLayerIds.has('layer-2')).toBe(false);
    expect(syncedLayerIds.has('layer-1')).toBe(true);

    // Re-adding layer-2 should re-trigger initial sync for layer-2
    useStudioStore.setState({
      canvasWidth: 8,
      canvasHeight: 8,
      frames: [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [
            {
              id: 'layer-1',
              name: 'Background',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
            },
            {
              id: 'layer-2',
              name: 'Foreground',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
            },
          ],
        },
      ],
    });

    const ok4 = (bridge as unknown as { sendStructureAndSnapshots: () => boolean }).sendStructureAndSnapshots();
    expect(ok4).toBe(true);
    expect(broadcastInitialSync).toHaveBeenCalledWith(expect.any(Array), 'layer-2');
  });

  it('automatically triggers structure broadcast and re-syncs all layers when canvas dimensions change', () => {
    installDocumentCanvasMock();
    const bridge = new CoDrawBridge();
    const broadcastInitialSync = vi.fn();
    const broadcastStructure = vi.fn((_payload: StructurePayload) => true);

    const mockSession = {
      getState: () => 'connected',
      broadcastStructure,
      broadcastInitialSync,
      disconnect: vi.fn(),
    };

    (bridge as unknown as { session: unknown; role: string }).session = mockSession;
    (bridge as unknown as { role: string }).role = 'host';

    useStudioStore.setState({
      canvasWidth: 8,
      canvasHeight: 8,
      frames: [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [
            {
              id: 'layer-1',
              name: 'Background',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
            },
          ],
        },
      ],
    });

    // Start structure listener
    (bridge as unknown as { subscribeToStructureChanges: () => void }).subscribeToStructureChanges();

    broadcastStructure.mockClear();
    broadcastInitialSync.mockClear();

    // Resize canvas via store
    useStudioStore.setState({
      canvasWidth: 16,
      canvasHeight: 16,
    });

    // Both structure broadcast and re-seeding of layer-1 must be triggered with new dimensions
    expect(broadcastStructure).toHaveBeenCalledTimes(1);
    expect(broadcastStructure).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 16,
        height: 16,
      })
    );

    expect(broadcastInitialSync).toHaveBeenCalledTimes(1);
    expect(broadcastInitialSync).toHaveBeenCalledWith(expect.any(Array), 'layer-1');

    (bridge as unknown as { reset: () => void }).reset();
  });

  it('preserves valid activeFrameIndex and prunes deleted layer replicas during adoptStructure', () => {
    installDocumentCanvasMock();
    const bridge = new CoDrawBridge();

    // Seed dummy CRDT buffer for an existing layer
    const buffer = new CrdtPixelBuffer(8, 8, 'peer-host');
    (bridge as unknown as { crdtBuffers: Map<string, CrdtPixelBuffer> }).crdtBuffers.set('layer-keep', buffer);
    (bridge as unknown as { crdtBuffers: Map<string, CrdtPixelBuffer> }).crdtBuffers.set('layer-delete', buffer);

    useStudioStore.setState({
      activeFrameIndex: 1,
      activeLayerId: 'layer-keep',
      frames: [
        { id: 'f1', durationMs: 100, layers: [{ id: 'l1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
        { id: 'f2', durationMs: 100, layers: [{ id: 'layer-keep', name: 'Keep', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
      ],
    });

    // Host sends structure that excludes layer-delete
    (bridge as unknown as { adoptStructure: (p: unknown) => void }).adoptStructure({
      width: 8,
      height: 8,
      frames: [
        { id: 'f1', durationMs: 100, layers: [{ id: 'l1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
        { id: 'f2', durationMs: 100, layers: [{ id: 'layer-keep', name: 'Keep', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
      ],
    });

    const crdtBuffers = (bridge as unknown as { crdtBuffers: Map<string, CrdtPixelBuffer> }).crdtBuffers;
    expect(crdtBuffers.has('layer-delete')).toBe(false);
    expect(crdtBuffers.has('layer-keep')).toBe(true);

    // Guest active frame should be preserved since frame index 1 still exists
    expect(useStudioStore.getState().activeFrameIndex).toBe(1);
    expect(useStudioStore.getState().activeLayerId).toBe('layer-keep');
  });

  it('enforces backpressure when data channel or presence channel bufferedAmount exceeds safety ceilings', () => {
    const session = new P2PSyncSession({ peerId: 'peer-backpressure' });

    const congestedSyncChannel = {
      label: 'pixibun-crdt-sync',
      readyState: 'open',
      bufferedAmount: 2 * 1024 * 1024, // 2MB (exceeds 1MB ceiling)
      send: vi.fn(),
      close: vi.fn(),
    } as unknown as RTCDataChannel;

    const normalPresenceChannel = {
      label: 'pixibun-presence',
      readyState: 'open',
      bufferedAmount: 0,
      send: vi.fn(),
      close: vi.fn(),
    } as unknown as RTCDataChannel;

    (session as unknown as { syncChannel: RTCDataChannel }).syncChannel = congestedSyncChannel;
    (session as unknown as { presenceChannel: RTCDataChannel }).presenceChannel = normalPresenceChannel;

    const ops: PixelOp[] = [{ x: 0, y: 0, r: 255, g: 255, b: 255, a: 255, timestamp: 1, peerId: 'p1' }];

    // broadcastPixelOps should yield and return false due to backpressure
    const opsResult = session.broadcastPixelOps(ops, 'l1');
    expect(opsResult).toBe(true);
    expect(congestedSyncChannel.send).not.toHaveBeenCalled();

    // broadcastInitialSync should yield under backpressure
    const initResult = session.broadcastInitialSync(ops, 'l1');
    expect(initResult).toBe(true);
    expect(congestedSyncChannel.send).not.toHaveBeenCalled();

    Object.defineProperty(congestedSyncChannel, 'bufferedAmount', { value: 0 });
    (session as unknown as { flushReliable: () => void }).flushReliable();
    expect(congestedSyncChannel.send).toHaveBeenCalledTimes(2);
    // broadcastCursor succeeds on uncongested presence channel
    const cursorResult = session.broadcastCursor(10, 20);
    expect(cursorResult).toBe(true);
    expect(normalPresenceChannel.send).toHaveBeenCalled();

    // Now congest the presence channel
    const congestedPresenceChannel = {
      label: 'pixibun-presence',
      readyState: 'open',
      bufferedAmount: 128 * 1024, // 128 KB (exceeds 64 KB ceiling)
      send: vi.fn(),
      close: vi.fn(),
    } as unknown as RTCDataChannel;
    (session as unknown as { presenceChannel: RTCDataChannel }).presenceChannel = congestedPresenceChannel;

    // broadcastCursor should drop frame and return false under backpressure
    const congestedCursorResult = session.broadcastCursor(15, 25);
    expect(congestedCursorResult).toBe(false);
    expect(congestedPresenceChannel.send).not.toHaveBeenCalled();
    session.disconnect();
  });
});
