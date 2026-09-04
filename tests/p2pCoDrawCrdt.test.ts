import { describe, it, expect } from 'vitest';
import { CrdtPixelBuffer, PixelOp } from '@/lib/collab/crdtPixelBuffer';

describe('Phase 36.2: Peer-to-Peer Co-Drawing LWW-CRDT Buffer', () => {
  it('converges to byte-identical state after offline divergence and reconnection with zero data loss', () => {
    const width = 8;
    const height = 8;

    // Client A and Client B initialized
    const clientA = new CrdtPixelBuffer(width, height, 'peer-alpha');
    const clientB = new CrdtPixelBuffer(width, height, 'peer-beta');

    // 1. Initial shared stroke while online
    const op1 = clientA.setPixel(0, 0, [255, 0, 0, 255])!;
    clientB.applyRemoteOp(op1);

    expect(clientA.getPixel(0, 0)).toEqual([255, 0, 0, 255]);
    expect(clientB.getPixel(0, 0)).toEqual([255, 0, 0, 255]);

    // 2. Network disconnect / partition occurs: both clients edit concurrently in isolation
    const clientAOps: PixelOp[] = [];
    const clientBOps: PixelOp[] = [];

    // Client A edits non-conflicting (1, 1) and conflicting (3, 3)
    clientAOps.push(clientA.setPixel(1, 1, [0, 255, 0, 255])!);
    clientAOps.push(clientA.setPixel(3, 3, [0, 0, 255, 255])!);

    // Client B edits non-conflicting (2, 2) and conflicting (3, 3)
    clientBOps.push(clientB.setPixel(2, 2, [255, 255, 0, 255])!);
    clientBOps.push(clientB.setPixel(3, 3, [240, 190, 124, 255])!);

    // In isolated state, buffers differ
    expect(clientA.getPixel(1, 1)).toEqual([0, 255, 0, 255]);
    expect(clientB.getPixel(1, 1)).toEqual([0, 0, 0, 0]); // Not yet synced to B

    expect(clientB.getPixel(2, 2)).toEqual([255, 255, 0, 255]);
    expect(clientA.getPixel(2, 2)).toEqual([0, 0, 0, 0]); // Not yet synced to A

    // 3. Network reconnects: exchange offline operations
    clientB.applyRemoteOps(clientAOps);
    clientA.applyRemoteOps(clientBOps);

    // 4. Assert Strong Eventual Consistency (SEC):
    // Both buffers must be 100% byte-identical
    const bufferA = clientA.toRgbaArray();
    const bufferB = clientB.toRgbaArray();

    expect(Array.from(bufferA)).toEqual(Array.from(bufferB));

    // Zero data loss on non-conflicting cells:
    expect(clientA.getPixel(1, 1)).toEqual([0, 255, 0, 255]);
    expect(clientB.getPixel(1, 1)).toEqual([0, 255, 0, 255]);

    expect(clientA.getPixel(2, 2)).toEqual([255, 255, 0, 255]);
    expect(clientB.getPixel(2, 2)).toEqual([255, 255, 0, 255]);

    // Conflicting cell (3, 3) resolved deterministically to the same color on both
    expect(clientA.getPixel(3, 3)).toEqual(clientB.getPixel(3, 3));
  });

  it('guarantees convergence under arbitrary out-of-order delivery', () => {
    const width = 4;
    const height = 4;

    const peerA = new CrdtPixelBuffer(width, height, 'client-1');
    const peerB = new CrdtPixelBuffer(width, height, 'client-2');

    // Generate sequence of operations on different cells
    const ops: PixelOp[] = [
      { x: 0, y: 0, r: 10, g: 10, b: 10, a: 255, timestamp: 100, peerId: 'p1' },
      { x: 1, y: 1, r: 20, g: 20, b: 20, a: 255, timestamp: 101, peerId: 'p1' },
      { x: 2, y: 2, r: 30, g: 30, b: 30, a: 255, timestamp: 102, peerId: 'p2' },
      { x: 0, y: 0, r: 99, g: 99, b: 99, a: 255, timestamp: 103, peerId: 'p2' }, // Overwrite (0, 0)
    ];

    // Deliver in chronological order to peerA
    peerA.applyRemoteOps(ops);

    // Deliver in reversed / scrambled order to peerB
    peerB.applyRemoteOps([...ops].reverse());

    expect(Array.from(peerA.toRgbaArray())).toEqual(Array.from(peerB.toRgbaArray()));
    expect(peerA.getPixel(0, 0)).toEqual([99, 99, 99, 255]);
  });

  it('is idempotent: replaying duplicate operations does not alter state', () => {
    const buffer = new CrdtPixelBuffer(4, 4, 'client-test');
    const op = buffer.setPixel(1, 1, [123, 45, 67, 255])!;

    const stateBefore = Array.from(buffer.toRgbaArray());

    // Replay the exact same operation multiple times
    buffer.applyRemoteOp(op);
    buffer.applyRemoteOp(op);

    const stateAfter = Array.from(buffer.toRgbaArray());
    expect(stateAfter).toEqual(stateBefore);
  });

  it('merges two entire buffers deterministically with merge()', () => {
    const buf1 = new CrdtPixelBuffer(4, 4, 'peer-1');
    const buf2 = new CrdtPixelBuffer(4, 4, 'peer-2');

    buf1.setPixel(0, 0, [255, 0, 0, 255]);
    buf2.setPixel(3, 3, [0, 0, 255, 255]);

    buf1.merge(buf2);
    buf2.merge(buf1);

    expect(Array.from(buf1.toRgbaArray())).toEqual(Array.from(buf2.toRgbaArray()));
  });
});
