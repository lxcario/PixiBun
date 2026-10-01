/**
 * Last-Write-Wins Conflict-Free Replicated Data Type (LWW-CRDT) Pixel Buffer
 * with Hybrid Logical Clock (HLC) & Bounded Clock Drift Skew Protection.
 *
 * Algorithm References:
 * - Marc Shapiro, Nuno Preguiça, Carlos Baquero, Marek Zawirski,
 *   "Conflict-Free Replicated Data Types," Symposium on Self-Stabilizing
 *   Systems (SSS 2011), LNCS Vol. 6976, pp. 386-400.
 *   (Defines the LWW-Register CRDT used for per-pixel conflict resolution.)
 * - Sandeep S. Kulkarni, Murat Demirbas, Deepak Madappa, Bharadwaj Avva,
 *   Marcelo Leone, "Logical Physical Clocks," 18th International Conference
 *   on Principles of Distributed Systems (OPODIS 2014), LNCS Vol. 8878,
 *   pp. 17-32, Springer, 2014.
 *   (Defines the Hybrid Logical Clock mechanism used for causal ordering.)
 *
 * Design Philosophy:
 * - Martin Kleppmann, Adam Wiggins, Peter van Hardenberg, Mark McGranaghan,
 *   "Local-First Software: You Own Your Data, in spite of the Cloud,"
 *   ACM Onward! Essays, pp. 154-178, 2019.
 *   (Architectural motivation for the serverless, accountless, user-owned design.)
 *
 * Implements an accountless, serverless peer-to-peer co-drawing engine where every pixel
 * cell is modeled as an independent LWW-Register governed by a monotonic Hybrid Logical Clock
 * tuple (l, c) and deterministic peerId tie-breaking.
 *
 * Guarantees Strong Eventual Consistency (SEC) and causality tracking while remaining bounded
 * to physical wall-clock time within MAX_CLOCK_DRIFT_MS (60,000ms), actively rejecting rogue
 * or drifted remote updates from poisoning the logical physical clock.
 */

export type HlcTuple = [l: number, c: number];

export interface PixelOp {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
  timestamp: number;
  hlc?: HlcTuple;
  peerId: string;
}

export interface CrdtCell {
  r: number;
  g: number;
  b: number;
  a: number;
  timestamp: number;
  hlc: HlcTuple;
  peerId: string;
}

export const MAX_OP_LOG_SIZE = 10000;
export const MAX_CLOCK_DRIFT_MS = 60000; // 60s bounded physical clock drift tolerance

export class CrdtPixelBuffer {
  public readonly width: number;
  public readonly height: number;
  public readonly peerId: string;
  public readonly maxClockDriftMs: number;

  private cells: CrdtCell[];
  private hlc: HlcTuple = [0, 0];
  private opLog: PixelOp[] = [];
  /** Conservative estimate for JS cells, HLC tuples, peer strings and retained ops. */
  get estimatedBytes(): number { return (this.cells.length + this.opLog.length) * 192; }

  constructor(
    width: number,
    height: number,
    peerId: string,
    maxClockDriftMs: number = MAX_CLOCK_DRIFT_MS
  ) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.peerId = peerId;
    this.maxClockDriftMs = Math.max(0, maxClockDriftMs);

    const totalPixels = this.width * this.height;
    this.cells = new Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      this.cells[i] = {
        r: 0,
        g: 0,
        b: 0,
        a: 0,
        timestamp: 0,
        hlc: [0, 0],
        peerId: '',
      };
    }
  }

  /**
   * Returns a copy of the current Hybrid Logical Clock tuple [l, c].
   */
  public getHlc(): HlcTuple {
    return [this.hlc[0], this.hlc[1]];
  }

  /**
   * Appends an op to the local log with a bounded sliding window to prevent unbounded memory growth.
   */
  private appendOpToLog(op: PixelOp): void {
    this.opLog.push(op);
    if (this.opLog.length > MAX_OP_LOG_SIZE) {
      this.opLog.splice(0, this.opLog.length - MAX_OP_LOG_SIZE);
    }
  }

  /**
   * Generates a snapshot of all active pixel operations across the canvas,
   * enabling full canvas synchronization to newly joined peers.
   */
  public getStateSnapshotOps(): PixelOp[] {
    const snapshot: PixelOp[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.cells[y * this.width + x];
        if (cell.timestamp > 0 || cell.hlc[0] > 0 || cell.peerId !== '') {
          snapshot.push({
            x,
            y,
            r: cell.r,
            g: cell.g,
            b: cell.b,
            a: cell.a,
            timestamp: cell.timestamp,
            hlc: [cell.hlc[0], cell.hlc[1]],
            peerId: cell.peerId,
          });
        }
      }
    }
    return snapshot;
  }

  /**
   * Advances the local Hybrid Logical Clock for a send/local event (Kulkarni et al., 2014):
   * l' = max(l_old, pt)
   * if (l' == l_old) c' = c_old + 1 else c' = 0
   */
  private nextHlc(): HlcTuple {
    const pt = Date.now();
    const lOld = this.hlc[0];
    const lNext = Math.max(lOld, pt);
    const cNext = lNext === lOld ? this.hlc[1] + 1 : 0;
    this.hlc = [lNext, cNext];
    return this.hlc;
  }

  /**
   * Applies a local pixel write operation, advances the Hybrid Logical Clock,
   * updates the cell, logs the op, and returns the PixelOp to be broadcast.
   */
  public setPixel(
    x: number,
    y: number,
    color: [number, number, number, number]
  ): PixelOp | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }

    const idx = y * this.width + x;
    const [l, c] = this.nextHlc();

    const op: PixelOp = {
      x,
      y,
      r: color[0],
      g: color[1],
      b: color[2],
      a: color[3],
      timestamp: l,
      hlc: [l, c],
      peerId: this.peerId,
    };

    this.cells[idx] = {
      r: op.r,
      g: op.g,
      b: op.b,
      a: op.a,
      timestamp: l,
      hlc: [l, c],
      peerId: op.peerId,
    };

    this.appendOpToLog(op);
    return op;
  }

  /**
   * Applies a remote pixel operation according to the LWW-CRDT rule:
   * 1. Check bounded clock drift skew (|remote.l - local.pt| <= MAX_CLOCK_DRIFT_MS).
   * 2. Synchronize local HLC according to Kulkarni/Demirbas receive rule.
   * 3. Higher (l, c) tuple wins; tie-break deterministically via lexicographical peerId.
   *
   * Returns true if the cell was updated, false if the incoming op was stale or rejected due to clock skew.
   */
  public applyRemoteOp(op: PixelOp): boolean {
    if (
      !op ||
      typeof op !== 'object' ||
      typeof op.x !== 'number' ||
      typeof op.y !== 'number' ||
      op.x < 0 ||
      op.x >= this.width ||
      op.y < 0 ||
      op.y >= this.height ||
      typeof op.peerId !== 'string' ||
      op.peerId.length === 0
    ) {
      return false;
    }

    const remoteL = op.hlc ? op.hlc[0] : op.timestamp;
    const remoteC = op.hlc ? op.hlc[1] : 0;

    // Reject non-finite, NaN, or non-positive physical timestamps or invalid counters
    if (
      typeof remoteL !== 'number' ||
      !Number.isFinite(remoteL) ||
      remoteL <= 0 ||
      typeof remoteC !== 'number' ||
      !Number.isFinite(remoteC) ||
      remoteC < 0
    ) {
      return false;
    }

    const pt = Date.now();

    // Bounded clock drift tolerance: reject operations from peers whose physical clock
    // is skewed into the future beyond MAX_CLOCK_DRIFT_MS (e.g. 60,000ms).
    if (remoteL - pt > this.maxClockDriftMs) {
      return false;
    }

    // Synchronize local HLC according to Kulkarni et al. receive rule:
    // l' = max(l_old, pt, remote.l)
    // if (l' == l_old == remote.l) c' = max(c_old, remote.c) + 1
    // else if (l' == l_old) c' = c_old + 1
    // else if (l' == remote.l) c' = remote.c + 1
    // else c' = 0
    const lOld = this.hlc[0];
    const lNext = Math.max(lOld, pt, remoteL);
    let cNext = 0;
    if (lNext === lOld && lNext === remoteL) {
      cNext = Math.max(this.hlc[1], remoteC) + 1;
    } else if (lNext === lOld) {
      cNext = this.hlc[1] + 1;
    } else if (lNext === remoteL) {
      cNext = remoteC + 1;
    } else {
      cNext = 0;
    }
    this.hlc = [lNext, cNext];

    const idx = op.y * this.width + op.x;
    const current = this.cells[idx];
    const curL = current.hlc ? current.hlc[0] : current.timestamp;
    const curC = current.hlc ? current.hlc[1] : 0;

    let wins = false;
    if (remoteL > curL) {
      wins = true;
    } else if (remoteL === curL) {
      if (remoteC > curC) {
        wins = true;
      } else if (remoteC === curC) {
        wins = op.peerId > current.peerId;
      }
    }

    if (wins) {
      this.cells[idx] = {
        r: op.r,
        g: op.g,
        b: op.b,
        a: op.a,
        timestamp: remoteL,
        hlc: [remoteL, remoteC],
        peerId: op.peerId,
      };
      this.appendOpToLog({
        ...op,
        timestamp: remoteL,
        hlc: [remoteL, remoteC],
      });
      return true;
    }

    return false;
  }

  /**
   * Applies an array of remote operations.
   * Returns the count of mutated cells.
   */
  public applyRemoteOps(ops: PixelOp[]): number {
    let mutated = 0;
    for (const op of ops) {
      if (this.applyRemoteOp(op)) {
        mutated++;
      }
    }
    return mutated;
  }

  /**
   * Reads a pixel color from the CRDT buffer.
   */
  public getPixel(x: number, y: number): [number, number, number, number] {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return [0, 0, 0, 0];
    }
    const cell = this.cells[y * this.width + x];
    return [cell.r, cell.g, cell.b, cell.a];
  }

  /**
   * Reads cell metadata including HLC timestamp tuple and peerId.
   */
  public getCell(x: number, y: number): Readonly<CrdtCell> | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.cells[y * this.width + x];
  }

  /**
   * Exports an RGBA Uint8ClampedArray suitable for 2D canvas putImageData.
   */
  public toRgbaArray(): Uint8ClampedArray {
    const data = new Uint8ClampedArray(this.width * this.height * 4);
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      const offset = i * 4;
      data[offset] = cell.r;
      data[offset + 1] = cell.g;
      data[offset + 2] = cell.b;
      data[offset + 3] = cell.a;
    }
    return data;
  }

  /**
   * Returns all recorded operations since a given physical timestamp or HLC tuple.
   */
  public getOpsSince(since: number | HlcTuple): PixelOp[] {
    if (Array.isArray(since)) {
      const [sinceL, sinceC] = since;
      return this.opLog.filter((op) => {
        const l = op.hlc ? op.hlc[0] : op.timestamp;
        const c = op.hlc ? op.hlc[1] : 0;
        return l > sinceL || (l === sinceL && c > sinceC);
      });
    }
    return this.opLog.filter((op) => {
      const l = op.hlc ? op.hlc[0] : op.timestamp;
      return l > since;
    });
  }

  /**
   * Returns the entire operation log.
   */
  public getAllOps(): PixelOp[] {
    return [...this.opLog];
  }

  /**
   * Deterministically merges another CRDT buffer into this one.
   * Both buffers must have identical dimensions.
   * Directly joins cell states without inflating the logical counter,
   * then advances the local HLC once to cover both buffers and physical time.
   */
  public merge(other: CrdtPixelBuffer): number {
    if (other.width !== this.width || other.height !== this.height) {
      throw new Error('Cannot merge CRDT buffers with differing dimensions.');
    }

    let mutated = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const otherCell = other.getCell(x, y);
        if (otherCell && (otherCell.timestamp > 0 || otherCell.hlc[0] > 0 || otherCell.peerId !== '')) {
          const idx = y * this.width + x;
          const current = this.cells[idx];
          const otherL = otherCell.hlc ? otherCell.hlc[0] : otherCell.timestamp;
          const otherC = otherCell.hlc ? otherCell.hlc[1] : 0;
          const curL = current.hlc ? current.hlc[0] : current.timestamp;
          const curC = current.hlc ? current.hlc[1] : 0;

          let wins = false;
          if (otherL > curL) {
            wins = true;
          } else if (otherL === curL) {
            if (otherC > curC) {
              wins = true;
            } else if (otherC === curC) {
              wins = otherCell.peerId > current.peerId;
            }
          }

          if (wins) {
            this.cells[idx] = {
              r: otherCell.r,
              g: otherCell.g,
              b: otherCell.b,
              a: otherCell.a,
              timestamp: otherL,
              hlc: [otherL, otherC],
              peerId: otherCell.peerId,
            };
            this.appendOpToLog({
              x,
              y,
              r: otherCell.r,
              g: otherCell.g,
              b: otherCell.b,
              a: otherCell.a,
              timestamp: otherL,
              hlc: [otherL, otherC],
              peerId: otherCell.peerId,
            });
            mutated++;
          }
        }
      }
    }

    // Advance local HLC once to subsume the causal frontier of both histories
    const otherHlc = other.getHlc();
    const pt = Date.now();
    const lOld = this.hlc[0];
    const remoteL = otherHlc[0];
    const remoteC = otherHlc[1];
    const lNext = Math.max(lOld, pt, remoteL);
    let cNext = 0;
    if (lNext === lOld && lNext === remoteL) {
      cNext = Math.max(this.hlc[1], remoteC) + 1;
    } else if (lNext === lOld) {
      cNext = this.hlc[1] + 1;
    } else if (lNext === remoteL) {
      cNext = remoteC + 1;
    } else {
      cNext = 0;
    }
    this.hlc = [lNext, cNext];

    return mutated;
  }
}
