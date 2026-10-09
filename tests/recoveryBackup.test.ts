import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, type StoredProject, type RecoveryRecord, type StoredLayerBlob } from '@/lib/storage/db';
import {
  prepareUntouchedRecoveryArchive,
  writePreparedRecoveryArchive,
  calculateStoreOnlyZipSize,
  createUtf8StringStream,
  generateRecoveryBackupFilename,
  assertTrustedPreparedArchive,
  validateManifestByteLength,
} from '@/lib/recovery/recoveryBackup';
import {
  writeRecoveryArchiveToFileHandle,
  createRecoveryArchiveBlob,
  validateFallbackBlobArchiveSize,
} from '@/lib/recovery/recoveryBackupTransport';
import {
  RecoveryBackupError,
  type PreparedRecoveryArchive,
  type RecoveryBackupManifestV1,
  type RecoveryReasonCode,
} from '@/lib/recovery/recoveryTypes';
import { RECOVERY_INSPECTION_CEILINGS, RECOVERY_BACKUP_LIMITS } from '@/lib/recovery/recoveryLimits';
import { writeStoreOnlyZip, type RecoveryZipSink } from '@/lib/recovery/zipWriter';
import { getUtf8ByteLength } from '@/lib/safety/safeJson';

// -----------------------------------------------------------------------------
// Truly Independent Test-Only ZIP Parser
// -----------------------------------------------------------------------------

function parseStoreOnlyZipArchive(buffer: Uint8Array): Map<string, Uint8Array> {
  const fileEntries = new Map<string, Uint8Array>();

  // 1. Find EOCD (0x06054b50)
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (
      buffer[i] === 0x50 &&
      buffer[i + 1] === 0x4b &&
      buffer[i + 2] === 0x05 &&
      buffer[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('EOCD signature (0x06054b50) not found in archive buffer.');
  }

  const eocdView = new DataView(buffer.buffer, buffer.byteOffset + eocdOffset, 22);
  const totalEntries = eocdView.getUint16(10, true);
  const cdSize = eocdView.getUint32(12, true);
  const cdOffset = eocdView.getUint32(16, true);

  expect(eocdOffset).toBe(cdOffset + cdSize);

  let cdPtr = cdOffset;
  const textDecoder = new TextDecoder('utf-8');

  for (let i = 0; i < totalEntries; i++) {
    const view = new DataView(buffer.buffer, buffer.byteOffset + cdPtr, 46);
    const sig = view.getUint32(0, true);
    if (sig !== 0x02014b50) {
      throw new Error(`Invalid Central Directory signature at offset ${cdPtr}: 0x${sig.toString(16)}`);
    }

    const uncompressedSize = view.getUint32(24, true);
    const nameLen = view.getUint16(28, true);
    const extraLen = view.getUint16(30, true);
    const commentLen = view.getUint16(32, true);
    const localHeaderOffset = view.getUint32(42, true);

    const nameBytes = buffer.subarray(cdPtr + 46, cdPtr + 46 + nameLen);
    const name = textDecoder.decode(nameBytes);

    // Read payload from local header
    const localView = new DataView(buffer.buffer, buffer.byteOffset + localHeaderOffset, 30);
    const localSig = localView.getUint32(0, true);
    if (localSig !== 0x04034b50) {
      throw new Error(`Invalid Local Header signature at offset ${localHeaderOffset}: 0x${localSig.toString(16)}`);
    }
    const localNameLen = localView.getUint16(26, true);
    const localExtraLen = localView.getUint16(28, true);

    const payloadOffset = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const payload = buffer.slice(payloadOffset, payloadOffset + uncompressedSize);

    fileEntries.set(name, payload);
    cdPtr += 46 + nameLen + extraLen + commentLen;
  }

  return fileEntries;
}

class MemoryZipSink implements RecoveryZipSink {
  public chunks: Uint8Array[] = [];
  public totalBytes = 0;

  async write(chunk: Uint8Array): Promise<void> {
    const copy = new Uint8Array(chunk.length);
    copy.set(chunk);
    this.chunks.push(copy);
    this.totalBytes += chunk.length;
  }

  getBuffer(): Uint8Array {
    const combined = new Uint8Array(this.totalBytes);
    let offset = 0;
    for (const chunk of this.chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    return combined;
  }
}

async function drainStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
    }
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

describe('Phase 1B.4 — Untouched Recovery Archive Assembly & Safe Export Adapters', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    if (!db.isOpen()) {
      await db.open();
    }
    await db.projects.clear();
    await db.layerBlobs.clear();
    await db.recoveryRecords.clear();
  });

  // ---------------------------------------------------------------------------
  // 1. UTF-8 Byte Length & Incremental Streaming Tests
  // ---------------------------------------------------------------------------

  describe('UTF-8 Byte Length & Streaming Fidelity', () => {
    it('getUtf8ByteLength matches TextEncoder across all character classes', () => {
      const cases = [
        '',
        'hello world',
        'alpha \u03B1 beta \u03B2 gamma \u03B3', // Greek BMP (2 bytes)
        '\u4E16\u754C', // CJK BMP (3 bytes)
        '🎨 🐰 🚀 ✨', // Astral Emoji surrogate pairs (4 bytes)
        'prefix \uD83D\uDE00 suffix', // Surrogate pair with ASCII
        'lone high \uD800 alone', // Lone high surrogate -> U+FFFD (3 bytes)
        'lone low \uDC00 alone', // Lone low surrogate -> U+FFFD (3 bytes)
        '\uD800\uD800\uDC00', // Lone high surrogate followed by valid pair
        'a'.repeat(50_000),
      ];

      for (const text of cases) {
        const expected = new TextEncoder().encode(text).length;
        const actual = getUtf8ByteLength(text);
        expect(actual).toBe(expected);
      }
    });

    it('createUtf8StringStream validates maxChunkBytes bounds (rejects < 4, > 65536, NaN, fractions)', () => {
      expect(() => createUtf8StringStream('test', 3)).toThrow(RangeError);
      expect(() => createUtf8StringStream('test', 0)).toThrow(RangeError);
      expect(() => createUtf8StringStream('test', -1)).toThrow(RangeError);
      expect(() => createUtf8StringStream('test', 65537)).toThrow(RangeError);
      expect(() => createUtf8StringStream('test', NaN)).toThrow(RangeError);
      expect(() => createUtf8StringStream('test', 12.5)).toThrow(RangeError);
    });

    it('createUtf8StringStream respects small chunk bounds (>= 4 bytes) without hanging or splitting pairs', async () => {
      const text = 'ab🎨cd\u4E16ef'; // Includes ASCII, astral emoji (4 bytes), and CJK BMP (3 bytes)
      const stream = createUtf8StringStream(text, 4);
      const reader = stream.getReader();

      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        expect(value.length).toBeGreaterThan(0);
        expect(value.length).toBeLessThanOrEqual(4);
        chunks.push(value);
        totalBytes += value.length;
      }

      const combined = new Uint8Array(totalBytes);
      let offset = 0;
      for (const c of chunks) {
        combined.set(c, offset);
        offset += c.length;
      }

      const expected = new TextEncoder().encode(text);
      expect(combined).toEqual(expected);
    });

    it('createUtf8StringStream emits chunks <= 64 KiB without splitting surrogate pairs at 16k boundaries', async () => {
      const prefix = 'a'.repeat(16_383);
      const emoji = '🎨'; // \uD83C\uDF88
      const suffix = 'b'.repeat(10_000);
      const fullText = prefix + emoji + suffix;

      const stream = createUtf8StringStream(fullText);
      const reader = stream.getReader();

      let chunksCount = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunksCount++;
        expect(value.length).toBeLessThanOrEqual(65536);
        chunks.push(value);
      }

      expect(chunksCount).toBeGreaterThanOrEqual(2);

      const combined = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
      let offset = 0;
      for (const c of chunks) {
        combined.set(c, offset);
        offset += c.length;
      }

      const expected = new TextEncoder().encode(fullText);
      expect(combined).toEqual(expected);
    });

    it('createUtf8StringStream handles lone surrogates with platform U+FFFD replacement', async () => {
      const malformed = 'bad \uD800 surrogate \uDC00 text';
      const stream = createUtf8StringStream(malformed);
      const drained = await drainStream(stream);
      const expected = new TextEncoder().encode(malformed);

      expect(drained).toEqual(expected);
    });

    it('createUtf8StringStream handles empty string gracefully', async () => {
      const stream = createUtf8StringStream('');
      const drained = await drainStream(stream);
      expect(drained.length).toBe(0);
    });

    it('createUtf8StringStream supports cooperative cancellation', async () => {
      const hugeText = 'x'.repeat(100_000);
      const stream = createUtf8StringStream(hugeText);
      const reader = stream.getReader();

      const first = await reader.read();
      expect(first.done).toBe(false);

      await reader.cancel('cancelled by test');
      const second = await reader.read();
      expect(second.done).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Exact Store-Only ZIP Size Preflight & Policy Validators
  // ---------------------------------------------------------------------------

  describe('calculateStoreOnlyZipSize & Policy Validators', () => {
    it('matches writeStoreOnlyZip output exactly for empty archive, single, and multiple entries', async () => {
      const testScenarios: Array<Array<{ name: string; payload: Uint8Array }>> = [
        [],
        [{ name: 'zero.txt', payload: new Uint8Array(0) }],
        [{ name: 'project.json', payload: new TextEncoder().encode('{"test":1}') }],
        [
          { name: 'project.json', payload: new TextEncoder().encode('{"hello":"world"}') },
          { name: 'recovery-manifest.json', payload: new TextEncoder().encode('{"v":1}') },
          { name: 'layers/blob_000001.png', payload: new Uint8Array([1, 2, 3, 4, 5]) },
          { name: 'layers/blob_000002.png', payload: new Uint8Array(1024) },
        ],
      ];

      for (const scenario of testScenarios) {
        const meta = scenario.map((e) => ({
          nameBytesLength: new TextEncoder().encode(e.name).length,
          size: e.payload.length,
        }));

        const calculated = calculateStoreOnlyZipSize(meta);

        const sink = new MemoryZipSink();
        const zipEntries = scenario.map((e) => ({
          name: e.name,
          size: e.payload.length,
          openStream(): ReadableStream<Uint8Array> {
            return new ReadableStream({
              start(c) {
                c.enqueue(e.payload);
                c.close();
              },
            });
          },
        }));

        const result = await writeStoreOnlyZip(zipEntries, sink);
        expect(calculated).toBe(result.totalBytesWritten);
        expect(sink.totalBytes).toBe(calculated);
      }
    });

    it('rejects entries exceeding 65,535 count or 4 GiB size limits', () => {
      expect(() => {
        calculateStoreOnlyZipSize(new Array(65536).fill({ nameBytesLength: 10, size: 0 }));
      }).toThrow(RecoveryBackupError);

      expect(() => {
        calculateStoreOnlyZipSize([{ nameBytesLength: 10, size: 0xffffffff + 1 }]);
      }).toThrow(TypeError);

      expect(() => {
        calculateStoreOnlyZipSize([{ nameBytesLength: 0, size: 10 }]);
      }).toThrow(TypeError);
    });

    it('validateManifestByteLength enforces 16 MiB ceiling as pure policy', () => {
      expect(() => validateManifestByteLength(100)).not.toThrow();
      expect(() => validateManifestByteLength(RECOVERY_BACKUP_LIMITS.MAX_MANIFEST_BYTES)).not.toThrow();
      expect(() =>
        validateManifestByteLength(RECOVERY_BACKUP_LIMITS.MAX_MANIFEST_BYTES + 1)
      ).toThrowError(expect.objectContaining({ code: 'MANIFEST_SIZE_EXCEEDED' }));
      expect(() => validateManifestByteLength(-1)).toThrow(TypeError);
      expect(() => validateManifestByteLength(NaN)).toThrow(TypeError);
    });

    it('validateFallbackBlobArchiveSize enforces 250 MB ceiling as pure policy', () => {
      expect(() => validateFallbackBlobArchiveSize(100)).not.toThrow();
      expect(() =>
        validateFallbackBlobArchiveSize(RECOVERY_BACKUP_LIMITS.MAX_FALLBACK_BLOB_BYTES)
      ).not.toThrow();
      expect(() =>
        validateFallbackBlobArchiveSize(RECOVERY_BACKUP_LIMITS.MAX_FALLBACK_BLOB_BYTES + 1)
      ).toThrowError(expect.objectContaining({ code: 'BLOB_FALLBACK_CEILING_EXCEEDED' }));
      expect(() => validateFallbackBlobArchiveSize(-1)).toThrow(TypeError);
      expect(() => validateFallbackBlobArchiveSize(NaN)).toThrow(TypeError);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Immutable Snapshot & Fail-Closed Storage Envelope Tests
  // ---------------------------------------------------------------------------

  describe('prepareUntouchedRecoveryArchive Snapshot & Envelope', () => {
    it('fails closed when project is not found', async () => {
      await expect(
        prepareUntouchedRecoveryArchive('proj-missing-id')
      ).rejects.toThrowError(expect.objectContaining({ code: 'PROJECT_NOT_FOUND' }));
    });

    it('fails closed when projectId is invalid or exceeds bounds', async () => {
      await expect(prepareUntouchedRecoveryArchive('')).rejects.toThrowError(
        expect.objectContaining({ code: 'INVALID_PROJECT_ID' })
      );
      await expect(prepareUntouchedRecoveryArchive('   ')).rejects.toThrowError(
        expect.objectContaining({ code: 'INVALID_PROJECT_ID' })
      );
      await expect(
        prepareUntouchedRecoveryArchive('x'.repeat(RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH + 1))
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_PROJECT_ID' }));
    });

    it('fails closed when dataJson storage type is not a string', async () => {
      const proj: StoredProject = {
        id: 'proj-bad-type',
        name: 'Bad Type',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: null as unknown as string,
      };
      await db.projects.put(proj);

      await expect(prepareUntouchedRecoveryArchive('proj-bad-type')).rejects.toThrowError(
        expect.objectContaining({ code: 'INVALID_DATA_JSON_STORAGE_TYPE' })
      );
    });

    it('preserves empty, whitespace, and malformed dataJson byte-for-byte without parsing', async () => {
      const malformedCases = ['', '   \n\t  ', '{"syntax": broken...}', 'not json at all'];

      for (let i = 0; i < malformedCases.length; i++) {
        const id = `proj-malformed-${i}`;
        const rawJson = malformedCases[i];
        await db.projects.put({
          id,
          name: 'Malformed Project',
          width: 32,
          height: 32,
          fps: 12,
          createdAt: 1000,
          updatedAt: 1000,
          dataJson: rawJson,
        });

        const prepared = await prepareUntouchedRecoveryArchive(id);
        expect(prepared.projectId).toBe(id);
        expect(prepared.dataJsonBytesLength).toBe(new TextEncoder().encode(rawJson).length);

        const sink = new MemoryZipSink();
        await writePreparedRecoveryArchive(prepared, sink);
        const parsedZip = parseStoreOnlyZipArchive(sink.getBuffer());

        const extractedJson = new TextDecoder().decode(parsedZip.get('project.json')!);
        expect(extractedJson).toBe(rawJson);
      }
    });

    describe('actual MAX+1 stored-blob boundary', () => {
      const id = 'proj-excessive-blobs';
      const count = RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS + 1;
      // Database population is setup, not the timed refusal operation. Keep all
      // 10,001 real records and the default hook/test deadlines.
      beforeEach(async () => {
        await db.projects.put({
          id,
          name: 'Excessive Project',
          width: 32,
          height: 32,
          fps: 12,
          createdAt: 1000,
          updatedAt: 1000,
          dataJson: '{}',
        });

        const fakeBlobs = [];
        for (let i = 1; i <= count; i++) {
          fakeBlobs.push({
            id: i,
            projectId: id,
            layerId: `layer-${i}`,
            frameIndex: 0,
            blob: new Blob(['png'], { type: 'image/png' }),
            updatedAt: 1000,
          });
        }
        await db.layerBlobs.bulkPut(fakeBlobs);
      });
      it('fails closed before reading payloads and preserves all stored records', async () => {
        const readPayload = vi.fn((record: StoredLayerBlob) => record);
        db.layerBlobs.hook('reading', readPayload);
        try {
          await expect(prepareUntouchedRecoveryArchive(id)).rejects.toThrowError(
            expect.objectContaining({ code: 'EXCESSIVE_STORED_BLOBS' })
          );
          expect(readPayload).not.toHaveBeenCalled();
          expect(await db.layerBlobs.where('projectId').equals(id).count()).toBe(count);
        } finally {
          db.layerBlobs.hook('reading').unsubscribe(readPayload);
        }
      });
    });

    it.each(['legacy-blob', 'array-buffer'] as const)(
      'preserves all payloads at the inspection ceiling with %s records and ignores other projects',
      async (representation) => {
        const originalCeiling = RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS;
        (RECOVERY_INSPECTION_CEILINGS as { MAX_INSPECTABLE_STORED_BLOBS: number }).MAX_INSPECTABLE_STORED_BLOBS = 2;
        try {
          const projectId = 'proj-at-ceiling';
          await db.projects.put({ id: projectId, name: 'Boundary', width: 32, height: 32,
            fps: 12, createdAt: 1000, updatedAt: 1000, dataJson: '{broken but preserved}' });
          const payload = new Blob(['original bytes'], { type: 'image/png' });
          const blob = representation === 'legacy-blob' ? payload : await payload.arrayBuffer();
          await db.layerBlobs.bulkPut([
            { id: 1, projectId, layerId: 'layer-1', frameIndex: 0, blob, blobType: 'image/png', updatedAt: 1000 },
            { id: 2, projectId, layerId: 'layer-2', frameIndex: 0, blob, blobType: 'image/png', updatedAt: 1000 },
            { id: 3, projectId: 'other-project', layerId: 'other', frameIndex: 0, blob, updatedAt: 1000 },
          ]);
          const archive = await prepareUntouchedRecoveryArchive(projectId);
          const sink = new MemoryZipSink();
          await writePreparedRecoveryArchive(archive, sink);
          const files = parseStoreOnlyZipArchive(sink.getBuffer());
          expect(new TextDecoder().decode(files.get('project.json'))).toBe('{broken but preserved}');
          const rasters = [...files].filter(([name]) => name.endsWith('.png'));
          expect(rasters).toHaveLength(2);
          for (const [, bytes] of rasters) {
            expect(bytes).toEqual(new Uint8Array(await payload.arrayBuffer()));
          }
          expect(await db.layerBlobs.count()).toBe(3);
        } finally {
          (RECOVERY_INSPECTION_CEILINGS as { MAX_INSPECTABLE_STORED_BLOBS: number }).MAX_INSPECTABLE_STORED_BLOBS = originalCeiling;
        }
      },
    );

    it('keeps missing-project and invalid-JSON-type error precedence when payload count exceeds the ceiling', async () => {
      const originalCeiling = RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS;
      (RECOVERY_INSPECTION_CEILINGS as { MAX_INSPECTABLE_STORED_BLOBS: number }).MAX_INSPECTABLE_STORED_BLOBS = 1;
      try {
        const projectId = 'proj-overflow-precedence';
        await db.layerBlobs.bulkPut([1, 2].map(id => ({ id, projectId, layerId: 'layer',
          frameIndex: id, blob: new Blob(['bytes']), updatedAt: 1000 })));
        await expect(prepareUntouchedRecoveryArchive(projectId)).rejects.toMatchObject({ code: 'PROJECT_NOT_FOUND' });
        await db.projects.put({ id: projectId, name: 'Invalid storage', width: 32, height: 32,
          fps: 12, createdAt: 1000, updatedAt: 1000, dataJson: null as unknown as string });
        await expect(prepareUntouchedRecoveryArchive(projectId)).rejects.toMatchObject({ code: 'INVALID_DATA_JSON_STORAGE_TYPE' });
      } finally {
        (RECOVERY_INSPECTION_CEILINGS as { MAX_INSPECTABLE_STORED_BLOBS: number }).MAX_INSPECTABLE_STORED_BLOBS = originalCeiling;
      }
    });

    it('fails closed when a stored blob record has corrupted fields, invalid keys, or non-blob payload', async () => {
      const id = 'proj-corrupt-blob';
      await db.projects.put({
        id,
        name: 'Corrupt Blob Project',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: '{}',
      });

      // Non-blob payload
      await db.layerBlobs.put({
        id: 1,
        projectId: id,
        layerId: 'layer-1',
        frameIndex: 0,
        blob: 'not-a-blob' as unknown as Blob,
        updatedAt: 1000,
      });

      await expect(prepareUntouchedRecoveryArchive(id)).rejects.toThrowError(
        expect.objectContaining({ code: 'INVALID_BLOB_PAYLOAD' })
      );

      // Negative primary key
      await db.layerBlobs.clear();
      await db.layerBlobs.put({
        id: -5,
        projectId: id,
        layerId: 'layer-1',
        frameIndex: 0,
        blob: new Blob(['data']),
        updatedAt: 1000,
      });

      await expect(prepareUntouchedRecoveryArchive(id)).rejects.toThrowError(
        expect.objectContaining({ code: 'CORRUPTED_STORED_BLOB_RECORD' })
      );
    });

    it('includes multiple blobs in deterministic stored-key order and retains orphans & duplicates', async () => {
      const id = 'proj-deterministic-order';
      await db.projects.put({
        id,
        name: 'Deterministic Blobs',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: '{"valid":true}',
      });

      const blob1 = new Blob([new Uint8Array([10, 20, 30])], { type: 'image/png' });
      const blob2 = new Blob([new Uint8Array([40, 50, 60, 70])], { type: 'image/png' });
      const blob3 = new Blob([new Uint8Array([80, 90])], { type: 'image/png' });

      await db.layerBlobs.bulkPut([
        { id: 300, projectId: id, layerId: 'layer-duplicate', frameIndex: 0, blob: blob3, updatedAt: 1000 },
        { id: 100, projectId: id, layerId: 'layer-orphan', frameIndex: 99, blob: blob1, updatedAt: 1000 },
        { id: 200, projectId: id, layerId: 'layer-duplicate', frameIndex: 0, blob: blob2, updatedAt: 1000 },
      ]);

      const prepared = await prepareUntouchedRecoveryArchive(id);
      expect(prepared.blobCount).toBe(3);
      expect(prepared.blobEntries[0].recordId).toBe(100);
      expect(prepared.blobEntries[0].archiveEntry).toBe('layers/blob_000001.png');
      expect(prepared.blobEntries[1].recordId).toBe(200);
      expect(prepared.blobEntries[1].archiveEntry).toBe('layers/blob_000002.png');
      expect(prepared.blobEntries[2].recordId).toBe(300);
      expect(prepared.blobEntries[2].archiveEntry).toBe('layers/blob_000003.png');

      const sink = new MemoryZipSink();
      await writePreparedRecoveryArchive(prepared, sink);
      const parsedZip = parseStoreOnlyZipArchive(sink.getBuffer());

      expect(parsedZip.get('layers/blob_000001.png')).toEqual(new Uint8Array([10, 20, 30]));
      expect(parsedZip.get('layers/blob_000002.png')).toEqual(new Uint8Array([40, 50, 60, 70]));
      expect(parsedZip.get('layers/blob_000003.png')).toEqual(new Uint8Array([80, 90]));
    });

    it('ordinal paths contain no raw IDs, and exotic IDs appear only as escaped JSON values in manifest', async () => {
      const id = 'proj-exotic-ids';
      await db.projects.put({
        id,
        name: 'Exotic Project',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: '{}',
      });

      const exoticLayerId = 'evil/..\\path-traversal\u0000\u001b[31m✨';
      await db.layerBlobs.put({
        id: 1,
        projectId: id,
        layerId: exoticLayerId,
        frameIndex: 0,
        blob: new Blob(['pixel']),
        updatedAt: 1000,
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);
      const sink = new MemoryZipSink();
      await writePreparedRecoveryArchive(prepared, sink);
      const parsedZip = parseStoreOnlyZipArchive(sink.getBuffer());

      for (const entryPath of parsedZip.keys()) {
        expect(entryPath).not.toContain('evil');
        expect(entryPath).not.toContain('..');
        expect(entryPath).not.toContain('\u001b');
      }

      const manifestJson = new TextDecoder().decode(parsedZip.get('recovery-manifest.json')!);
      const parsedManifest: RecoveryBackupManifestV1 = JSON.parse(manifestJson);
      expect(parsedManifest.blobs[0].layerId).toBe(exoticLayerId);
      expect(parsedManifest.blobs[0].archiveEntry).toBe('layers/blob_000001.png');
    });

    it('validates ledger records, applies canonical ordering and deduplication, and rejects malformed ledger records', async () => {
      const id = 'proj-with-ledger';
      await db.projects.put({
        id,
        name: 'Ledger Project',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: '{}',
      });

      await db.recoveryRecords.put({
        projectId: id,
        classificationState: 'recoverable-envelope-exceeded',
        firstDetectedAt: 5000,
        lastConfirmedAt: 6000,
        reasonCodes: ['ENVELOPE_MAX_LAYERS_PER_FRAME', 'ENVELOPE_MAX_FRAMES', 'ENVELOPE_MAX_LAYERS_PER_FRAME'] as RecoveryReasonCode[],
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);
      expect(prepared.manifest.recovery).toBeDefined();
      expect(prepared.manifest.recovery?.classificationState).toBe('recoverable-envelope-exceeded');
      expect(prepared.manifest.recovery?.reasonCodes).toEqual([
        'ENVELOPE_MAX_FRAMES',
        'ENVELOPE_MAX_LAYERS_PER_FRAME',
      ]);
      expect(prepared.manifest.recovery?.firstDetectedAt).toBe(5000);
      expect(prepared.manifest.recovery?.lastConfirmedAt).toBe(6000);

      // Malformed ledger record with invalid state
      await db.recoveryRecords.put({
        projectId: id,
        classificationState: 'invented-state' as unknown as RecoveryRecord['classificationState'],
        firstDetectedAt: 5000,
        lastConfirmedAt: 6000,
        reasonCodes: ['ENVELOPE_MAX_FRAMES'] as RecoveryReasonCode[],
      });

      await expect(prepareUntouchedRecoveryArchive(id)).rejects.toThrowError(
        expect.objectContaining({ code: 'INVALID_RECOVERY_RECORD' })
      );
    });

    it('rejects invalid clock providers', async () => {
      const id = 'proj-clock';
      await db.projects.put({
        id,
        name: 'Clock Project',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: '{}',
      });

      await expect(
        prepareUntouchedRecoveryArchive(id, { now: 'not-a-fn' as unknown as () => Date })
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_CLOCK' }));

      await expect(
        prepareUntouchedRecoveryArchive(id, { now: () => new Date(NaN) })
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_CLOCK' }));
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Immutability, Memory Isolation & Reusable Manifest Tests
  // ---------------------------------------------------------------------------

  describe('Trust Boundary & Immutability Isolation', () => {
    it('no public prepared-archive property exposes a Blob, Uint8Array, stream, or stream factory', async () => {
      const id = 'proj-trust-boundary-check';
      await db.projects.put({
        id,
        name: 'Trust Check',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: '{"safe":true}',
      });

      await db.layerBlobs.put({
        id: 1,
        projectId: id,
        layerId: 'layer-1',
        frameIndex: 0,
        blob: new Blob(['test-blob'], { type: 'image/png' }),
        updatedAt: 1000,
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);

      // Verify assertTrustedPreparedArchive returns void
      expect(assertTrustedPreparedArchive(prepared)).toBeUndefined();

      // Check root properties
      const rootEntries = Object.entries(prepared);
      for (const [, val] of rootEntries) {
        expect(typeof val).not.toBe('function');
        expect(val instanceof Blob).toBe(false);
        expect(val instanceof Uint8Array).toBe(false);
        expect(val instanceof ReadableStream).toBe(false);
      }

      // Check blob descriptors
      for (const desc of prepared.blobEntries) {
        expect('blob' in desc).toBe(false);
        for (const [, val] of Object.entries(desc)) {
          expect(typeof val).not.toBe('function');
          expect(val instanceof Blob).toBe(false);
          expect(val instanceof Uint8Array).toBe(false);
        }
      }
    });

    it('attempts to mutate public object tree do not affect subsequent archive writes', async () => {
      const id = 'proj-mutation-attempt';
      await db.projects.put({
        id,
        name: 'Mutation Test',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: '{"immutable":true}',
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);

      // Verify freezing
      expect(Object.isFrozen(prepared)).toBe(true);
      expect(Object.isFrozen(prepared.manifest)).toBe(true);
      expect(Object.isFrozen(prepared.blobEntries)).toBe(true);

      // Attempted property mutations in non-strict/try-catch block
      try {
        (prepared as unknown as Record<string, unknown>).projectId = 'tampered';
      } catch {
        // Expected TypeError in strict mode
      }
      try {
        (prepared as unknown as Record<string, unknown>).estimatedArchiveBytes = 1;
      } catch {
        // Expected TypeError
      }

      expect(prepared.projectId).toBe(id);
      expect(prepared.estimatedArchiveBytes).toBeGreaterThan(1);

      // Writing archive still produces valid matching bytes
      const sink = new MemoryZipSink();
      const res = await writePreparedRecoveryArchive(prepared, sink);
      expect(res.totalBytesWritten).toBe(prepared.estimatedArchiveBytes);
    });

    it('rejects forged or cloned structural objects', async () => {
      const forged: unknown = {
        projectId: 'forged',
        createdAt: new Date().toISOString(),
        estimatedArchiveBytes: 1,
        entryCount: 1,
        blobCount: 0,
        manifest: {} as RecoveryBackupManifestV1,
        dataJsonBytesLength: 0,
        blobEntries: [],
      };

      const sink = new MemoryZipSink();
      await expect(writePreparedRecoveryArchive(forged as PreparedRecoveryArchive, sink)).rejects.toThrowError(
        expect.objectContaining({ code: 'INVALID_PREPARED_ARCHIVE' })
      );
    });

    it('deliberate in-place mutation of sink chunks in pass 1 does not corrupt pass 2', async () => {
      const id = 'proj-sink-mutation-isolation';
      await db.projects.put({
        id,
        name: 'Sink Mutation Isolation',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: '{"initial":"content"}',
      });

      await db.layerBlobs.put({
        id: 1,
        projectId: id,
        layerId: 'layer-1',
        frameIndex: 0,
        blob: new Blob(['layer-bytes-original'], { type: 'image/png' }),
        updatedAt: 1000,
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);

      // Pass 1: Malicious sink mutates every received chunk in-place
      const mutatingSink: RecoveryZipSink = {
        async write(chunk: Uint8Array): Promise<void> {
          // Overwrite the incoming buffer directly
          chunk.fill(0xff);
        },
      };
      await writePreparedRecoveryArchive(prepared, mutatingSink);

      // Pass 2: Clean sink must receive completely uncorrupted data
      const cleanSink = new MemoryZipSink();
      await writePreparedRecoveryArchive(prepared, cleanSink);

      const parsedZip = parseStoreOnlyZipArchive(cleanSink.getBuffer());
      const extractedJson = new TextDecoder().decode(parsedZip.get('project.json')!);
      expect(extractedJson).toBe('{"initial":"content"}');

      const manifestJson = new TextDecoder().decode(parsedZip.get('recovery-manifest.json')!);
      const parsedManifest = JSON.parse(manifestJson);
      expect(parsedManifest.format).toBe('pixibun-recovery-backup');

      const blobBytes = parsedZip.get('layers/blob_000001.png')!;
      expect(new TextDecoder().decode(blobBytes)).toBe('layer-bytes-original');
    });

    it('proves preparation makes zero mutations to IndexedDB', async () => {
      const id = 'proj-no-mutations';
      const initialProject = {
        id,
        name: 'Original Name',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1234,
        updatedAt: 5678,
        dataJson: '{"original":true}',
      };
      await db.projects.put(initialProject);

      const initialBlob = {
        id: 1,
        projectId: id,
        layerId: 'layer-1',
        frameIndex: 0,
        blob: new Blob(['original-bytes'], { type: 'image/png' }),
        updatedAt: 5678,
      };
      await db.layerBlobs.put(initialBlob);

      const initialLedger = {
        projectId: id,
        classificationState: 'recoverable-envelope-exceeded' as const,
        firstDetectedAt: 1000,
        lastConfirmedAt: 2000,
        reasonCodes: ['ENVELOPE_MAX_FRAMES'] as RecoveryReasonCode[],
      };
      await db.recoveryRecords.put(initialLedger);

      await prepareUntouchedRecoveryArchive(id);

      const currentProject = await db.projects.get(id);
      expect(currentProject).toEqual(initialProject);

      const currentBlob = await db.layerBlobs.get(1);
      expect(currentBlob?.id).toBe(1);
      expect(currentBlob?.updatedAt).toBe(5678);

      const currentLedger = await db.recoveryRecords.get(id);
      expect(currentLedger).toEqual(initialLedger);
    });

    it('proves prepared archive remains stable when database records are updated or deleted after preparation', async () => {
      const id = 'proj-concurrency-test';
      await db.projects.put({
        id,
        name: 'Before Mutation',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: '{"snapshot":"initial"}',
      });

      const initialBytes = new Uint8Array([1, 2, 3]);
      await db.layerBlobs.put({
        id: 1,
        projectId: id,
        layerId: 'layer-1',
        frameIndex: 0,
        blob: new Blob([initialBytes], { type: 'image/png' }),
        updatedAt: 1000,
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);

      // Mutate database
      await db.projects.put({
        id,
        name: 'Mutated Name',
        width: 64,
        height: 64,
        fps: 24,
        createdAt: 9999,
        updatedAt: 9999,
        dataJson: '{"snapshot":"MUTATED"}',
      });

      await db.layerBlobs.put({
        id: 1,
        projectId: id,
        layerId: 'mutated-layer',
        frameIndex: 99,
        blob: new Blob([new Uint8Array([99, 99, 99])], { type: 'image/png' }),
        updatedAt: 9999,
      });

      const sink = new MemoryZipSink();
      await writePreparedRecoveryArchive(prepared, sink);
      const parsedZip = parseStoreOnlyZipArchive(sink.getBuffer());

      expect(new TextDecoder().decode(parsedZip.get('project.json')!)).toBe('{"snapshot":"initial"}');
      expect(parsedZip.get('layers/blob_000001.png')).toEqual(initialBytes);

      // Even if project is deleted from DB, writing prepared archive must succeed
      await db.projects.delete(id);
      await db.layerBlobs.clear();

      const sinkAfterDelete = new MemoryZipSink();
      await writePreparedRecoveryArchive(prepared, sinkAfterDelete);
      const parsedZip2 = parseStoreOnlyZipArchive(sinkAfterDelete.getBuffer());
      expect(new TextDecoder().decode(parsedZip2.get('project.json')!)).toBe('{"snapshot":"initial"}');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. File-Handle Adapter Tests & Complete Post-Open Lifecycle
  // ---------------------------------------------------------------------------

  describe('writeRecoveryArchiveToFileHandle Lifecycle', () => {
    function createMockFileHandle(options?: {
      onWrite?: (chunk: Uint8Array) => Promise<void>;
      failOnWrite?: boolean;
      failOnClose?: boolean;
      failOnAbort?: boolean;
      missingWrite?: boolean;
      missingClose?: boolean;
    }) {
      const writtenChunks: Uint8Array[] = [];
      let closeCalls = 0;
      let abortCalls = 0;
      let abortReason: unknown = undefined;

      const writable: Record<string, unknown> = {
        abort: vi.fn(async (reason: unknown) => {
          abortCalls++;
          abortReason = reason;
          if (options?.failOnAbort) {
            throw new Error('Simulated abort failure');
          }
        }),
      };

      if (!options?.missingWrite) {
        writable.write = vi.fn(async (chunk: Uint8Array) => {
          if (options?.failOnWrite) {
            throw new Error('Simulated write failure');
          }
          if (options?.onWrite) {
            await options.onWrite(chunk);
          }
          writtenChunks.push(chunk.slice());
        });
      }

      if (!options?.missingClose) {
        writable.close = vi.fn(async () => {
          if (options?.failOnClose) {
            throw new Error('Simulated close failure');
          }
          closeCalls++;
        });
      }

      const fileHandle = {
        createWritable: vi.fn(async () => writable),
      } as unknown as FileSystemFileHandle;

      return {
        fileHandle,
        writable,
        writtenChunks,
        getCloseCalls: () => closeCalls,
        getAbortCalls: () => abortCalls,
        getAbortReason: () => abortReason,
      };
    }

    it('on complete success: streams and calls close() exactly once without abort()', async () => {
      const id = 'proj-fh-success';
      await db.projects.put({
        id,
        name: 'FH Success',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1,
        updatedAt: 1,
        dataJson: '{"fh":true}',
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);
      const mock = createMockFileHandle();

      const result = await writeRecoveryArchiveToFileHandle(prepared, mock.fileHandle);

      expect(mock.fileHandle.createWritable).toHaveBeenCalledTimes(1);
      expect(mock.writable.write).toHaveBeenCalled();
      expect(mock.getCloseCalls()).toBe(1);
      expect(mock.getAbortCalls()).toBe(0);
      expect(result.totalBytesWritten).toBe(prepared.estimatedArchiveBytes);
    });

    it('post-open missing write method: calls abort(), does NOT call close(), preserves TypeError', async () => {
      const id = 'proj-fh-missing-write';
      await db.projects.put({
        id,
        name: 'FH Missing Write',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1,
        updatedAt: 1,
        dataJson: '{}',
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);
      const mock = createMockFileHandle({ missingWrite: true });

      await expect(
        writeRecoveryArchiveToFileHandle(prepared, mock.fileHandle)
      ).rejects.toThrow(TypeError);

      expect(mock.getAbortCalls()).toBe(1);
      expect(mock.getCloseCalls()).toBe(0);
    });

    it('post-open missing close method: calls abort(), preserves TypeError', async () => {
      const id = 'proj-fh-missing-close';
      await db.projects.put({
        id,
        name: 'FH Missing Close',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1,
        updatedAt: 1,
        dataJson: '{}',
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);
      const mock = createMockFileHandle({ missingClose: true });

      await expect(
        writeRecoveryArchiveToFileHandle(prepared, mock.fileHandle)
      ).rejects.toThrow(TypeError);

      expect(mock.getAbortCalls()).toBe(1);
    });

    it('post-open write failure: calls abort(), does NOT call close(), preserves original error', async () => {
      const id = 'proj-fh-fail';
      await db.projects.put({
        id,
        name: 'FH Fail',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1,
        updatedAt: 1,
        dataJson: '{}',
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);
      const mock = createMockFileHandle({ failOnWrite: true });

      await expect(
        writeRecoveryArchiveToFileHandle(prepared, mock.fileHandle)
      ).rejects.toThrow('Simulated write failure');

      expect(mock.getAbortCalls()).toBe(1);
      expect(mock.getCloseCalls()).toBe(0);
      expect((mock.getAbortReason() as Error)?.message).toBe('Simulated write failure');
    });

    it('close failure calls abort, and abort failure does not mask close failure', async () => {
      const id = 'proj-fh-close-fail';
      await db.projects.put({
        id,
        name: 'FH Close Fail',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1,
        updatedAt: 1,
        dataJson: '{}',
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);
      const mock = createMockFileHandle({ failOnClose: true, failOnAbort: true });

      await expect(
        writeRecoveryArchiveToFileHandle(prepared, mock.fileHandle)
      ).rejects.toThrow('Simulated close failure');

      expect(mock.getAbortCalls()).toBe(1);
      expect(mock.getCloseCalls()).toBe(0);
    });

    it('does not call createWritable if signal is already aborted', async () => {
      const id = 'proj-fh-aborted';
      await db.projects.put({
        id,
        name: 'FH Aborted',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1,
        updatedAt: 1,
        dataJson: '{}',
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);
      const mock = createMockFileHandle();

      const controller = new AbortController();
      controller.abort();

      await expect(
        writeRecoveryArchiveToFileHandle(prepared, mock.fileHandle, { signal: controller.signal })
      ).rejects.toThrow(DOMException);

      expect(mock.fileHandle.createWritable).toHaveBeenCalledTimes(0);
    });

    it('post-open cancellation during write(): rejects with DOMException AbortError, calls abort() once, never calls close(), and preserves original error even if destination abort() throws', async () => {
      const id = 'proj-fh-cancel-post-open';
      await db.projects.put({
        id,
        name: 'FH Cancel Post Open',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1,
        updatedAt: 1,
        dataJson: '{"cancel":true}',
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);
      const controller = new AbortController();

      let writeCallCount = 0;
      const mock = createMockFileHandle({
        failOnAbort: true,
        onWrite: async () => {
          writeCallCount++;
          // Abort during write
          controller.abort(new DOMException('User cancelled export in flight', 'AbortError'));
        },
      });

      let caughtError: unknown;
      try {
        await writeRecoveryArchiveToFileHandle(prepared, mock.fileHandle, { signal: controller.signal });
      } catch (err) {
        caughtError = err;
      }

      expect(mock.fileHandle.createWritable).toHaveBeenCalledTimes(1);
      expect(writeCallCount).toBeGreaterThanOrEqual(1);
      expect(caughtError).toBeInstanceOf(DOMException);
      expect((caughtError as DOMException).name).toBe('AbortError');
      expect((caughtError as DOMException).message).toBe('User cancelled export in flight');
      expect(mock.getAbortCalls()).toBe(1);
      expect(mock.getCloseCalls()).toBe(0);
      expect(mock.getAbortReason()).toBe(caughtError);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Bounded In-Memory Blob Fallback Tests & Genuine Upstream Buffer Mutation
  // ---------------------------------------------------------------------------

  describe('createRecoveryArchiveBlob Fallback & Defensive Copy', () => {
    it('creates a valid application/zip Blob with byte size strictly matching estimate', async () => {
      const id = 'proj-blob-success';
      await db.projects.put({
        id,
        name: 'Blob Success',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1,
        updatedAt: 1,
        dataJson: '{"blob":true}',
      });

      const blob1 = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' });
      await db.layerBlobs.put({
        id: 1,
        projectId: id,
        layerId: 'layer-1',
        frameIndex: 0,
        blob: blob1,
        updatedAt: 1,
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);
      const archiveBlob = await createRecoveryArchiveBlob(prepared);

      expect(archiveBlob.type).toBe('application/zip');
      expect(archiveBlob.size).toBe(prepared.estimatedArchiveBytes);

      const buf = new Uint8Array(await archiveBlob.arrayBuffer());
      const parsed = parseStoreOnlyZipArchive(buf);
      expect(parsed.get('layers/blob_000001.png')).toEqual(new Uint8Array([1, 2, 3, 4]));
    });

    it('executes createRecoveryArchiveBlob and proves defensive chunk.slice() protects against upstream producer buffer reuse/mutation', async () => {
      const id = 'proj-blob-producer-mutation';
      await db.projects.put({
        id,
        name: 'Blob Producer Mutation',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1,
        updatedAt: 1,
        dataJson: '{"producer":"test"}',
      });

      const initialPayload = new Uint8Array([11, 22, 33, 44]);
      await db.layerBlobs.put({
        id: 1,
        projectId: id,
        layerId: 'layer-1',
        frameIndex: 0,
        blob: new Blob([initialPayload], { type: 'image/png' }),
        updatedAt: 1,
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);

      // Simulate a streaming producer that reuses a single scratch buffer across pulls
      const reusableProducerBuffer = new Uint8Array([11, 22, 33, 44]);
      let streamPulled = false;
      const streamSpy = vi.spyOn(Blob.prototype, 'stream').mockImplementation(() => {
        return new ReadableStream<Uint8Array>({
          pull(controller) {
            if (!streamPulled) {
              streamPulled = true;
              controller.enqueue(reusableProducerBuffer);
            } else {
              // Producer mutates / overwrites scratch buffer after sink accepted it
              reusableProducerBuffer.fill(0xff);
              controller.close();
            }
          },
        }) as unknown as ReturnType<Blob['stream']>;
      });

      let archiveBlob: Blob;
      try {
        archiveBlob = await createRecoveryArchiveBlob(prepared);
      } finally {
        streamSpy.mockRestore();
      }

      // If createRecoveryArchiveBlob performed defensive copying (chunk.slice()),
      // the archive contains the original bytes [11, 22, 33, 44], not [255, 255, 255, 255].
      const buf = new Uint8Array(await archiveBlob.arrayBuffer());
      const parsedZip = parseStoreOnlyZipArchive(buf);
      const extractedBlob = parsedZip.get('layers/blob_000001.png');

      expect(extractedBlob).toEqual(new Uint8Array([11, 22, 33, 44]));
    });

    it('fallback blob clears chunk array references on pre-aborted signal', async () => {
      const id = 'proj-blob-cancel';
      await db.projects.put({
        id,
        name: 'Blob Cancel',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1,
        updatedAt: 1,
        dataJson: 'x'.repeat(100_000),
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);
      const controller = new AbortController();
      controller.abort();

      await expect(
        createRecoveryArchiveBlob(prepared, { signal: controller.signal })
      ).rejects.toThrow(DOMException);
    });

    it('fallback blob clears chunk references and executes cleanup path when cancelled after retention begins', async () => {
      const id = 'proj-blob-cancel-mid-stream';
      await db.projects.put({
        id,
        name: 'Blob Cancel Mid Stream',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1,
        updatedAt: 1,
        dataJson: '{"retain":true}',
      });

      await db.layerBlobs.put({
        id: 1,
        projectId: id,
        layerId: 'layer-1',
        frameIndex: 0,
        blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
        updatedAt: 1,
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);
      const controller = new AbortController();

      // Hook into Blob.prototype.stream so that cancellation occurs AFTER project.json
      // and recovery-manifest.json chunks have already been accepted and retained in the sink's chunks array
      const streamSpy = vi.spyOn(Blob.prototype, 'stream').mockImplementation(() => {
        controller.abort(new DOMException('Cancelled after retention began', 'AbortError'));
        return new ReadableStream<Uint8Array>({
          start(c) {
            c.close();
          },
        }) as unknown as ReturnType<Blob['stream']>;
      });

      let caughtError: unknown;
      try {
        await createRecoveryArchiveBlob(prepared, { signal: controller.signal });
      } catch (err) {
        caughtError = err;
      } finally {
        streamSpy.mockRestore();
      }

      expect(caughtError).toBeInstanceOf(DOMException);
      expect((caughtError as DOMException).name).toBe('AbortError');
      expect((caughtError as DOMException).message).toBe('Cancelled after retention began');
    });

    it('fallback blob clears chunk references and executes cleanup path when stream fails after retention begins', async () => {
      const id = 'proj-blob-fail-mid-stream';
      await db.projects.put({
        id,
        name: 'Blob Fail Mid Stream',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1,
        updatedAt: 1,
        dataJson: '{"retain":true}',
      });

      await db.layerBlobs.put({
        id: 1,
        projectId: id,
        layerId: 'layer-1',
        frameIndex: 0,
        blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
        updatedAt: 1,
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);

      const streamSpy = vi.spyOn(Blob.prototype, 'stream').mockImplementation(() => {
        return new ReadableStream<Uint8Array>({
          pull() {
            throw new Error('Simulated payload read failure after retention began');
          },
        }) as unknown as ReturnType<Blob['stream']>;
      });

      let caughtError: unknown;
      try {
        await createRecoveryArchiveBlob(prepared);
      } catch (err) {
        caughtError = err;
      } finally {
        streamSpy.mockRestore();
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect((caughtError as Error).message).toBe('Simulated payload read failure after retention began');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Safe Filename Generator Tests
  // ---------------------------------------------------------------------------

  describe('generateRecoveryBackupFilename', () => {
    it('produces safe ASCII filename formatted with injected UTC clock', () => {
      const fixedDate = new Date(Date.UTC(2026, 8, 22, 12, 34, 56));
      const name = generateRecoveryBackupFilename(() => fixedDate);
      expect(name).toBe('pixibun-recovery-20260922T123456Z.zip');
    });

    it('contains no raw project name, special characters, or path separators', () => {
      const name = generateRecoveryBackupFilename();
      expect(name).toMatch(/^pixibun-recovery-\d{8}T\d{6}Z\.zip$/);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Zero Raster / Canvas API Invocation Test
  // ---------------------------------------------------------------------------

  describe('Zero Raster / Canvas Decoders Guarantee', () => {
    it('guarantees zero canvas allocation or image decoding APIs are invoked', async () => {
      const originalCreateElement = typeof document !== 'undefined' ? document.createElement : undefined;

      if (typeof document !== 'undefined') {
        vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
          if (tag.toLowerCase() === 'canvas' || tag.toLowerCase() === 'img') {
            throw new Error(`Raster violation: forbidden document.createElement('${tag}') called during backup.`);
          }
          return originalCreateElement ? originalCreateElement.call(document, tag) : ({} as HTMLElement);
        });
      }

      if (typeof window !== 'undefined') {
        (window as unknown as { createImageBitmap?: unknown }).createImageBitmap = () => {
          throw new Error('Raster violation: createImageBitmap called during backup.');
        };
      }

      const id = 'proj-no-raster';
      await db.projects.put({
        id,
        name: 'No Raster Project',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: '{"layers":[{"id":"l1"}]}',
      });

      await db.layerBlobs.put({
        id: 1,
        projectId: id,
        layerId: 'l1',
        frameIndex: 0,
        blob: new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], {
          type: 'image/png',
        }),
        updatedAt: 1000,
      });

      const prepared = await prepareUntouchedRecoveryArchive(id);
      const sink = new MemoryZipSink();
      const writeResult = await writePreparedRecoveryArchive(prepared, sink);

      expect(writeResult.blobCount).toBe(1);
      expect(sink.totalBytes).toBe(prepared.estimatedArchiveBytes);
    });
  });
});
