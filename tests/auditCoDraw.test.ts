import { afterEach, expect, it, vi } from 'vitest';
import { P2PSyncSession } from '@/lib/sync/p2pSync';
import { CrdtPixelBuffer } from '@/lib/collab/crdtPixelBuffer';

afterEach(() => vi.useRealTimers());

it('preserves pixel equality across congestion, acknowledgment loss and channel recovery', () => {
  vi.useFakeTimers();
  const local = new CrdtPixelBuffer(32, 32, 'host');
  const remote = new CrdtPixelBuffer(32, 32, 'guest');
  const receive = vi.fn((ops) => { for (const op of ops) remote.applyRemoteOp(op); });
  const sender = new P2PSyncSession({ peerId: 'host' });
  const receiver = new P2PSyncSession({ peerId: 'guest', onRemotePixelOps: receive, onInitialSync: receive });
  type Channel = { label: string; readyState: string; bufferedAmount: number; onmessage?: (e: { data: string }) => void; send: (data: string) => void; close: () => void };
  let dropAck = true;
  const a: Channel = { label: 'pixibun-crdt-sync', readyState: 'open', bufferedAmount: 2 ** 21,
    send: data => b.onmessage?.({ data }), close: () => {} };
  const b: Channel = { label: 'pixibun-crdt-sync', readyState: 'open', bufferedAmount: 0,
    send: data => { if (!dropAck) a.onmessage?.({ data }); }, close: () => {} };
  const setup = (session: P2PSyncSession, channel: Channel) =>
    (session as unknown as { setupChannel: (c: RTCDataChannel) => void }).setupChannel(channel as unknown as RTCDataChannel);
  setup(sender, a); setup(receiver, b);
  for (let i = 0; i < 150; i++) {
    const op = local.setPixel(i % 32, Math.floor(i / 32), [i, 20, 100, 255])!;
    expect(sender.broadcastPixelOps([op], 'layer')).toBe(true);
  }
  expect(receive).not.toHaveBeenCalled();
  a.bufferedAmount = 0;
  vi.advanceTimersByTime(250);
  expect(receive).toHaveBeenCalledTimes(150);
  expect(remote.toRgbaArray()).toEqual(local.toRgbaArray());
  a.readyState = 'connecting';
  vi.advanceTimersByTime(2000);
  dropAck = false;
  a.readyState = 'open';
  vi.advanceTimersByTime(250);
  expect(receive).toHaveBeenCalledTimes(150); // retransmission must not reapply snapshots/ops
  expect((sender as unknown as { pendingMessages: Map<number, unknown> }).pendingMessages.size).toBe(0);
  expect(remote.toRgbaArray()).toEqual(local.toRgbaArray());
  sender.disconnect(); receiver.disconnect();
});
