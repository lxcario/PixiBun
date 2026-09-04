/**
 * Last-Write-Wins Conflict-Free Replicated Data Type (LWW-CRDT) Pixel Buffer.
 *
 * Academic Citations:
 * - Martin Kleppmann, Adam Wiggins, Peter van Hardenberg, Mark McGranaghan,
 *   "Local-First Software: You Own Your Data, in spite of the Cloud,"
 *   ACM Onward! Essays, pp. 154-178, 2019.
 * - Marc Shapiro, Nuno Preguiça, Carlos Baquero, Marek Zawirski,
 *   "Conflict-Free Replicated Data Types," Symposium on Self-Stabilizing Systems (SSS 2011),
 *   Lecture Notes in Computer Science, Vol. 6976, pp. 386-400.
 *
 * Implements an accountless, serverless peer-to-peer co-drawing engine where every pixel
 * cell is modeled as an independent LWW-Register with Lamport/wall-clock timestamps and
 * deterministic peerId tie-breaking.
 *
 * Guarantees Strong Eventual Consistency (SEC): any two disconnected clients that edit
 * concurrently and subsequently exchange operations are guaranteed to converge to the
 * mathematically identical buffer state.
 */

export interface PixelOp {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
  timestamp: number;
  peerId: string;
}

export interface CrdtCell {
  r: number;
  g: number;
  b: number;
  a: number;
  timestamp: number;
  peerId: string;
}

export class CrdtPixelBuffer {
  public readonly width: number;
  public readonly height: number;
  public readonly peerId: string;

  private cells: CrdtCell[];
  private logicalClock: number = 0;
  private opLog: PixelOp[] = [];

  constructor(width: number, height: number, peerId: string) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.peerId = peerId;

    const totalPixels = this.width * this.height;
    this.cells = new Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      this.cells[i] = {
        r: 0,
        g: 0,
        b: 0,
        a: 0,
        timestamp: 0,
        peerId: '',
      };
    }
  }

  /**
   * Generates a monotonically increasing timestamp.
   */
  private nextTimestamp(): number {
    const wallTime = Date.now();
    this.logicalClock = Math.max(this.logicalClock + 1, wallTime);
    return this.logicalClock;
  }

  /**
   * Applies a local pixel write operation, advances the logical clock,
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
    const timestamp = this.nextTimestamp();

    const op: PixelOp = {
      x,
      y,
      r: color[0],
      g: color[1],
      b: color[2],
      a: color[3],
      timestamp,
      peerId: this.peerId,
    };

    this.cells[idx] = {
      r: op.r,
      g: op.g,
      b: op.b,
      a: op.a,
      timestamp: op.timestamp,
      peerId: op.peerId,
    };

    this.opLog.push(op);
    return op;
  }

  /**
   * Applies a remote pixel operation according to the LWW-CRDT rule:
   * 1. Higher timestamp wins.
   * 2. Equal timestamps tie-break deterministically via lexicographical peerId.
   *
   * Returns true if the cell was updated, false if the incoming op was stale.
   */
  public applyRemoteOp(op: PixelOp): boolean {
    if (op.x < 0 || op.x >= this.width || op.y < 0 || op.y >= this.height) {
      return false;
    }

    // Keep logical clock synchronized with incoming remote timestamps
    if (op.timestamp > this.logicalClock) {
      this.logicalClock = op.timestamp;
    }

    const idx = op.y * this.width + op.x;
    const current = this.cells[idx];

    let wins = false;
    if (op.timestamp > current.timestamp) {
      wins = true;
    } else if (op.timestamp === current.timestamp) {
      wins = op.peerId > current.peerId;
    }

    if (wins) {
      this.cells[idx] = {
        r: op.r,
        g: op.g,
        b: op.b,
        a: op.a,
        timestamp: op.timestamp,
        peerId: op.peerId,
      };
      this.opLog.push(op);
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
   * Reads cell metadata including Lamport timestamp and peerId.
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
   * Returns all recorded operations since a given timestamp.
   */
  public getOpsSince(sinceTimestamp: number): PixelOp[] {
    return this.opLog.filter((op) => op.timestamp > sinceTimestamp);
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
   */
  public merge(other: CrdtPixelBuffer): number {
    if (other.width !== this.width || other.height !== this.height) {
      throw new Error('Cannot merge CRDT buffers with differing dimensions.');
    }

    let mutated = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const otherCell = other.getCell(x, y);
        if (otherCell && otherCell.timestamp > 0) {
          const op: PixelOp = {
            x,
            y,
            r: otherCell.r,
            g: otherCell.g,
            b: otherCell.b,
            a: otherCell.a,
            timestamp: otherCell.timestamp,
            peerId: otherCell.peerId,
          };
          if (this.applyRemoteOp(op)) {
            mutated++;
          }
        }
      }
    }
    return mutated;
  }
}
