import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeSignalingToken, MAX_SIGNALING_CANDIDATES, P2PSyncSession } from '@/lib/sync/p2pSync';

const payload = () => ({ version: 1, peerId: 'peer', sdp: { type: 'offer', sdp: 'v=0\r\n' }, candidates: [{ candidate: 'candidate:1', sdpMid: null, sdpMLineIndex: null }] });
const token = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64');
afterEach(() => vi.unstubAllGlobals());
describe('typed manual signaling admission', () => {
  it.each([40, MAX_SIGNALING_CANDIDATES])('admits %i typed candidates without imposing a guessed WebRTC limit', count => {
    const value = payload(); value.candidates = Array.from({ length: count }, () => value.candidates[0]);
    expect(decodeSignalingToken(token(value))).toEqual(value);
  });
  it.each([
    { peerId: '' }, { peerId: 7 }, { peerId: 'x'.repeat(129) },
    { sdp: { type: 'rollback', sdp: 'v=0' } }, { sdp: { type: 'offer', sdp: {} } },
    { candidates: [null] }, { candidates: [{ candidate: 2 }] },
    { candidates: [{ candidate: '', sdpMLineIndex: 0.1 }] },
    { candidates: [{ candidate: '', usernameFragment: {} }] },
    { candidates: new Array(MAX_SIGNALING_CANDIDATES + 1).fill({ candidate: '' }) },
  ])('rejects malformed fields before opening a guest connection: %j', async change => {
    const create = vi.fn(); vi.stubGlobal('RTCPeerConnection', create);
    const session = new P2PSyncSession({ peerId: 'guest' });
    await expect(session.acceptHostInvite(token({ ...payload(), ...change }))).rejects.toThrow('Invalid signaling token');
    expect(create).not.toHaveBeenCalled();
  });
  it('rejects an answer passed as a host invite before changing connection state', async () => {
    const create = vi.fn(); vi.stubGlobal('RTCPeerConnection', create);
    const session = new P2PSyncSession({ peerId: 'guest' });
    await expect(session.acceptHostInvite(token({ ...payload(), sdp: { type: 'answer', sdp: 'v=0' } }))).rejects.toThrow('must contain an offer');
    expect(create).not.toHaveBeenCalled();
  });
});
