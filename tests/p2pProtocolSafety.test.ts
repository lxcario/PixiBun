import { afterEach, describe, expect, it, vi } from 'vitest';
import { CrdtPixelBuffer, type PixelOp } from '@/lib/collab/crdtPixelBuffer';
import { P2PSyncSession, isValidPixelOp, validateStructurePayload } from '@/lib/sync/p2pSync';
import { validateProjectFile } from '@/lib/project/schema';
import { createBlankProjectFile } from '@/lib/storage/db';

const now = 1_800_000_000_000;
const op = (counter = 0): PixelOp => ({ x: 0, y: 0, r: 255, g: 0, b: 0, a: 255,
  timestamp: now, hlc: [now, counter], peerId: 'remote' });
const sessions: P2PSyncSession[] = [];
afterEach(() => { sessions.splice(0).forEach(session => session.disconnect()); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function transport() {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  const pc = { connectionState: 'connected', onconnectionstatechange: null as (() => void) | null,
    close: vi.fn(), onicecandidate: null, ondatachannel: null };
  vi.stubGlobal('RTCPeerConnection', function () { return pc; });
  const channel = { label: 'pixibun-crdt-sync', readyState: 'open', bufferedAmount: 0,
    send: vi.fn(), close: vi.fn(), onmessage: null as ((e: { data: unknown }) => void) | null,
    onclose: null as (() => void) | null, onopen: null as (() => void) | null,
    onerror: null as (() => void) | null, onbufferedamountlow: null as (() => void) | null };
  const onError = vi.fn();
  const onRemotePixelOps = vi.fn();
  const session = new P2PSyncSession({ peerId: 'local', onError, onRemotePixelOps });
  sessions.push(session);
  const internal = session as unknown as {
    initPeerConnection(): void; setupChannel(channel: RTCDataChannel): void;
    pendingMessageBytes: number; pendingMessages: Map<number, unknown>; retryTimer: unknown;
  };
  internal.initPeerConnection();
  internal.setupChannel(channel as unknown as RTCDataChannel);
  channel.onopen?.();
  const state = (value: string) => { pc.connectionState = value; pc.onconnectionstatechange?.(); };
  const deliver = (value: unknown) => channel.onmessage?.({ data: typeof value === 'string' ? value : JSON.stringify(value) });
  return { session, internal, channel, pc, onError, onRemotePixelOps, state, deliver };
}

describe('Co-draw clock and portable structure admission', () => {
  it.each([2 ** 53, Number.MAX_VALUE, 0.5, -1])('rejects invalid HLC counter %s without mutating the replica', counter => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const buffer = new CrdtPixelBuffer(1, 1, 'local');
    const before = buffer.getHlc();
    expect(isValidPixelOp(op(counter))).toBe(false);
    expect(buffer.applyRemoteOp(op(counter))).toBe(false);
    expect(buffer.getHlc()).toEqual(before);
    expect(buffer.getPixel(0, 0)).toEqual([0, 0, 0, 0]);
    expect(buffer.getAllOps()).toEqual([]);
  });

  it.each([0.5, 2 ** 53])('rejects non-safe physical timestamps %s at the wire boundary', timestamp => {
    expect(isValidPixelOp({ ...op(), timestamp, hlc: [timestamp, 0] })).toBe(false);
    expect(isValidPixelOp({ ...op(), timestamp, hlc: undefined })).toBe(false);
  });

  it('carries a safe exhausted counter into the next millisecond and keeps consecutive local writes ordered', () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const buffer = new CrdtPixelBuffer(1, 1, 'local');
    expect(buffer.applyRemoteOp(op(Number.MAX_SAFE_INTEGER))).toBe(true);
    expect(buffer.getHlc()).toEqual([now + 1, 0]);
    const first = buffer.setPixel(0, 0, [0, 255, 0, 255])!;
    const second = buffer.setPixel(0, 0, [0, 0, 255, 255])!;
    expect(first.hlc).toEqual([now + 1, 1]);
    expect(second.hlc).toEqual([now + 1, 2]);
    expect(isValidPixelOp(first)).toBe(true);
    expect(isValidPixelOp(second)).toBe(true);
    const other = new CrdtPixelBuffer(1, 1, 'other');
    other.applyRemoteOps([second, first, op(Number.MAX_SAFE_INTEGER)]);
    expect(other.getPixel(0, 0)).toEqual([0, 0, 255, 255]);
  });

  it('carries on a local write and merge frontier as well as receive', () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const first = new CrdtPixelBuffer(1, 1, 'first');
    first.applyRemoteOp(op(Number.MAX_SAFE_INTEGER - 1));
    expect(first.setPixel(0, 0, [0, 1, 0, 255])!.hlc).toEqual([now + 1, 0]);
    const remote = new CrdtPixelBuffer(1, 1, 'remote');
    remote.applyRemoteOp(op(Number.MAX_SAFE_INTEGER - 1));
    const merged = new CrdtPixelBuffer(1, 1, 'merged');
    merged.merge(remote);
    expect(merged.getHlc()).toEqual([now + 1, 0]);
    expect(merged.setPixel(0, 0, [0, 0, 1, 255])!.hlc).toEqual([now + 1, 1]);
  });

  it('admits the portable layer-name boundary and rejects longer names before adoption', () => {
    const project = createBlankProjectFile('Shared drawing', 8, 8);
    project.frames[0].layers[0].name = 'x'.repeat(128);
    const structure = { width: 8, height: 8, frames: project.frames };
    expect(validateStructurePayload(structure)).not.toBeNull();
    expect(validateProjectFile(project).ok).toBe(true);
    project.frames[0].layers[0].name += 'x';
    expect(validateStructurePayload(structure)).toBeNull();
    expect(validateProjectFile(project).ok).toBe(false);
  });
});

describe('Co-draw reliable delivery lifecycle', () => {
  it('pauses retries during a transient interruption and resumes the same pending delivery', () => {
    const t = transport();
    t.session.broadcastPixelOps([op()], 'layer');
    const sent = t.channel.send.mock.calls[0][0];
    t.state('disconnected');
    expect(t.internal.retryTimer).toBeNull();
    vi.advanceTimersByTime(5_000);
    expect(t.channel.send).toHaveBeenCalledTimes(1);
    expect(t.internal.pendingMessages.size).toBe(1);
    t.state('connected');
    expect(t.channel.send).toHaveBeenLastCalledWith(sent);
    t.deliver({ type: 'ACK', deliveryId: JSON.parse(sent).deliveryId });
    expect(t.internal.pendingMessageBytes).toBe(0);
    expect(t.internal.pendingMessages.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(t.onError).not.toHaveBeenCalled();
  });

  it.each(['failed', 'closed'])('releases retries and retained bytes on peer state %s', state => {
    const t = transport();
    t.session.broadcastPixelOps([op()], 'layer');
    t.state(state);
    expect(t.internal.pendingMessageBytes).toBe(0);
    expect(t.internal.pendingMessages.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(t.session.broadcastPixelOps([op()], 'layer')).toBe(false);
    expect(t.channel.close).toHaveBeenCalledTimes(1);
    expect(t.pc.close).toHaveBeenCalledTimes(1);
  });

  it('ends an interruption after a bounded recovery window', () => {
    const t = transport();
    t.session.broadcastPixelOps([op()], 'layer');
    t.state('disconnected');
    vi.advanceTimersByTime(30_001);
    expect(t.session.getState()).toBe('failed');
    expect(t.internal.pendingMessageBytes).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(t.onError).toHaveBeenCalledTimes(1);
  });

  it('does not consume the delivery budget while paused and preserves edits queued during recovery', () => {
    const t = transport();
    t.session.broadcastPixelOps([op()], 'layer');
    t.state('disconnected');
    vi.advanceTimersByTime(20_000);
    expect(t.session.broadcastPixelOps([op(1)], 'layer')).toBe(true);
    vi.advanceTimersByTime(9_000);
    expect(t.channel.send).toHaveBeenCalledTimes(1);
    t.state('connected');
    vi.advanceTimersByTime(2_000);
    expect(t.session.getState()).toBe('connected');
    expect(t.internal.pendingMessages.size).toBe(2);
    t.deliver({ type: 'ACK', deliveryId: 1 });
    t.deliver({ type: 'ACK', deliveryId: 2 });
    expect(vi.getTimerCount()).toBe(0);
    expect(t.onError).not.toHaveBeenCalled();
  });

  it('releases an existing queue when a new write exceeds the byte budget', () => {
    const t = transport();
    t.session.broadcastPixelOps([op()], 'layer');
    t.internal.pendingMessageBytes = 32 * 1024 * 1024;
    expect(t.session.broadcastPixelOps([op()], 'layer')).toBe(false);
    expect(t.internal.pendingMessages.size).toBe(0);
    expect(t.internal.pendingMessageBytes).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(t.onError).toHaveBeenCalledTimes(1);
  });

  it('validates reused delivery identifiers before acknowledging them', () => {
    const t = transport();
    const packet = { type: 'PIXEL_OPS', peerId: 'remote', layerId: 'layer', ops: [op()], deliveryId: 1 };
    t.deliver(packet);
    t.channel.send.mockClear();
    t.deliver({ ...packet, ops: [op(2 ** 53)] });
    expect(t.channel.send).not.toHaveBeenCalled();
    expect(t.onRemotePixelOps).toHaveBeenCalledTimes(1);
    expect(t.session.getState()).toBe('failed');
  });

  it('bounds unacknowledged delivery even while the connection remains open', () => {
    const t = transport();
    t.session.broadcastPixelOps([op()], 'layer');
    vi.advanceTimersByTime(30_250);
    expect(t.session.getState()).toBe('failed');
    expect(t.internal.pendingMessageBytes).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(t.onError).toHaveBeenCalledTimes(1);
  });

  it.each(['close', 'error'])('terminates a reliable-channel %s with one visible error', event => {
    const t = transport();
    t.session.broadcastPixelOps([op()], 'layer');
    const handler = event === 'close' ? t.channel.onclose : t.channel.onerror;
    handler?.(); handler?.();
    expect(t.session.getState()).toBe('failed');
    expect(t.internal.pendingMessageBytes).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(t.onError).toHaveBeenCalledTimes(1);
  });

  it.each([
    { type: 'PIXEL_OPS', peerId: 'remote', layerId: 'layer', ops: [op(2 ** 53)], deliveryId: 1 },
    '{bad JSON',
    'x'.repeat(256 * 1024 + 1),
    { type: 'PIXEL_OPS', peerId: 'remote', layerId: 'layer', ops: [op()], deliveryId: 0 },
  ])('rejects invalid artwork without an ACK, dispatch, or endless retry', packet => {
    const t = transport();
    t.session.broadcastPixelOps([op()], 'layer');
    t.channel.send.mockClear();
    t.deliver(packet);
    expect(t.channel.send).not.toHaveBeenCalled();
    expect(t.onRemotePixelOps).not.toHaveBeenCalled();
    expect(t.session.getState()).toBe('failed');
    expect(t.onError).toHaveBeenCalledTimes(1);
    expect(t.internal.pendingMessageBytes).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    t.deliver(packet);
    expect(t.onError).toHaveBeenCalledTimes(1);
  });

  it('still accepts legacy valid packets without delivery IDs and acknowledges retries only once', () => {
    const t = transport();
    const packet = { type: 'PIXEL_OPS', peerId: 'remote', layerId: 'layer', ops: [op()] };
    t.deliver(packet);
    t.deliver({ ...packet, deliveryId: 1 });
    t.deliver({ ...packet, deliveryId: 1 });
    expect(t.onRemotePixelOps).toHaveBeenCalledTimes(2);
    expect(t.channel.send).toHaveBeenCalledTimes(2);
    expect(t.onError).not.toHaveBeenCalled();
  });
});
