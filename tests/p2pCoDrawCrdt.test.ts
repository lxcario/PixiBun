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

  describe('Hybrid Logical Clock (HLC) & Clock Skew Protection (Kulkarni & Demirbas 2014)', () => {
    it('increments logical counter c monotonically for rapid operations in the same millisecond', () => {
      const buf = new CrdtPixelBuffer(8, 8, 'peer-hlc');

      // Issue 10 rapid writes in tight loop
      const ops: PixelOp[] = [];
      for (let i = 0; i < 10; i++) {
        ops.push(buf.setPixel(i % 8, Math.floor(i / 8), [10, 20, 30, 255])!);
      }

      // Check all operations have defined HLC
      for (let i = 0; i < ops.length; i++) {
        expect(ops[i].hlc).toBeDefined();
        const [l, c] = ops[i].hlc!;
        expect(l).toBeGreaterThan(0);
        expect(c).toBeGreaterThanOrEqual(0);
      }

      // If consecutive ops share the same physical millisecond l, c must strictly increment
      for (let i = 1; i < ops.length; i++) {
        const [prevL, prevC] = ops[i - 1].hlc!;
        const [curL, curC] = ops[i].hlc!;
        if (curL === prevL) {
          expect(curC).toBe(prevC + 1);
        } else {
          expect(curL).toBeGreaterThan(prevL);
          expect(curC).toBe(0); // Resets when physical time advances
        }
      }
    });

    it('rejects remote operations exceeding MAX_CLOCK_DRIFT_MS (60,000ms) to prevent clock poisoning', () => {
      const buf = new CrdtPixelBuffer(8, 8, 'peer-protected');
      const now = Date.now();

      // Skewed op from the future (e.g. 120,000ms ahead)
      const skewedFutureOp: PixelOp = {
        x: 0,
        y: 0,
        r: 255,
        g: 0,
        b: 0,
        a: 255,
        timestamp: now + 120000,
        hlc: [now + 120000, 0],
        peerId: 'peer-rogue',
      };

      const applied = buf.applyRemoteOp(skewedFutureOp);
      expect(applied).toBe(false);

      // Verify cell was not mutated
      expect(buf.getPixel(0, 0)).toEqual([0, 0, 0, 0]);

      // Verify local HLC clock was not poisoned by the future timestamp
      const localHlc = buf.getHlc();
      expect(localHlc[0]).toBeLessThanOrEqual(Date.now() + 100);
    });

    it('accepts valid remote ops within clock drift tolerance and synchronizes local HLC', () => {
      const buf = new CrdtPixelBuffer(8, 8, 'peer-receiver');
      const now = Date.now();

      // Slight forward drift within tolerance (e.g. 5,000ms <= 60,000ms)
      const validOp: PixelOp = {
        x: 2,
        y: 2,
        r: 50,
        g: 150,
        b: 250,
        a: 255,
        timestamp: now + 5000,
        hlc: [now + 5000, 3],
        peerId: 'peer-drift-ok',
      };

      const applied = buf.applyRemoteOp(validOp);
      expect(applied).toBe(true);
      expect(buf.getPixel(2, 2)).toEqual([50, 150, 250, 255]);

      // Local HLC should have advanced to track remote causality
      const localHlc = buf.getHlc();
      expect(localHlc[0]).toBeGreaterThanOrEqual(now + 5000);
    });

    it('resolves LWW conflict using logical counter c when physical timestamps l are identical', () => {
      const buf = new CrdtPixelBuffer(4, 4, 'peer-main');
      const sharedL = 1700000000000;

      // Op 1 with c = 0
      const op1: PixelOp = {
        x: 1,
        y: 1,
        r: 100,
        g: 0,
        b: 0,
        a: 255,
        timestamp: sharedL,
        hlc: [sharedL, 0],
        peerId: 'peer-a',
      };

      // Op 2 with same l, but higher logical counter c = 1
      const op2: PixelOp = {
        x: 1,
        y: 1,
        r: 0,
        g: 200,
        b: 0,
        a: 255,
        timestamp: sharedL,
        hlc: [sharedL, 1],
        peerId: 'peer-b',
      };

      // Apply in order: op1 then op2
      buf.applyRemoteOp(op1);
      expect(buf.getPixel(1, 1)).toEqual([100, 0, 0, 255]);

      buf.applyRemoteOp(op2);
      expect(buf.getPixel(1, 1)).toEqual([0, 200, 0, 255]); // op2 wins due to higher c

      // Now attempt to apply op1 again (stale c=0 vs current c=1)
      const staleApplied = buf.applyRemoteOp(op1);
      expect(staleApplied).toBe(false);
      expect(buf.getPixel(1, 1)).toEqual([0, 200, 0, 255]);
    });

    it('rejects ops with NaN or non-finite timestamp without poisoning local HLC', () => {
      const buf = new CrdtPixelBuffer(4, 4, 'peer-safe');
      const hlcBefore = buf.getHlc();

      // Op with NaN timestamp
      const malformedOp = {
        x: 0,
        y: 0,
        r: 255,
        g: 0,
        b: 0,
        a: 255,
        timestamp: NaN,
        peerId: 'evil-peer',
      } as unknown as PixelOp;

      const applied = buf.applyRemoteOp(malformedOp);
      expect(applied).toBe(false);

      // Local HLC MUST NOT be NaN
      const hlcAfter = buf.getHlc();
      expect(Number.isFinite(hlcAfter[0])).toBe(true);
      expect(Number.isFinite(hlcAfter[1])).toBe(true);
      expect(hlcAfter).toEqual(hlcBefore);

      // Subsequent local writes must produce valid finite timestamps
      const localOp = buf.setPixel(0, 0, [10, 20, 30, 255])!;
      expect(Number.isFinite(localOp.timestamp)).toBe(true);
      expect(Number.isFinite(localOp.hlc![0])).toBe(true);
      expect(Number.isFinite(localOp.hlc![1])).toBe(true);
    });

    it('joins causal frontiers during merge() without inflating logical counter c by canvas cell count', () => {
      const bufA = new CrdtPixelBuffer(16, 16, 'peer-A');
      const bufB = new CrdtPixelBuffer(16, 16, 'peer-B');

      // Draw 50 pixels in bufB
      for (let i = 0; i < 50; i++) {
        bufB.setPixel(i % 16, Math.floor(i / 16), [255, 0, 0, 255]);
      }

      const hlcB = bufB.getHlc();

      // Merge bufB into bufA
      const mutated = bufA.merge(bufB);
      expect(mutated).toBe(50);

      const hlcA = bufA.getHlc();
      // Counter c in bufA should NOT be inflated by +50: it should match Kulkarni receive rule
      expect(hlcA[0]).toBeGreaterThanOrEqual(hlcB[0]);
      expect(hlcA[1]).toBeLessThanOrEqual(hlcB[1] + 1);
    });

    it('filters operations using getOpsSince with HlcTuple', () => {
      const buf = new CrdtPixelBuffer(4, 4, 'peer-query');
      const op1 = buf.setPixel(0, 0, [1, 0, 0, 255])!;
      buf.setPixel(1, 0, [2, 0, 0, 255]);
      const op3 = buf.setPixel(2, 0, [3, 0, 0, 255])!;

      // Filter since op1's HLC tuple
      const opsAfterOp1 = buf.getOpsSince(op1.hlc!);
      expect(opsAfterOp1.length).toBe(2);
      expect(opsAfterOp1[0].x).toBe(1);
      expect(opsAfterOp1[1].x).toBe(2);

      // Filter since op3's HLC tuple (should return none)
      const opsAfterOp3 = buf.getOpsSince(op3.hlc!);
      expect(opsAfterOp3.length).toBe(0);
    });
  });
});
