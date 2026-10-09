// @vitest-environment node
import { afterEach, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const roots: string[] = [];
const hash = (bytes: Buffer | string) => crypto.createHash('sha256').update(bytes).digest('hex');
function witness() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pixibun-custody-'));
  roots.push(root);
  const directory = path.join(root, 'download');
  fs.mkdirSync(path.join(directory, 'custody-witness'), { recursive: true });
  const bytes = Buffer.from('hidden witness bytes');
  const files = [{ path: 'artifacts/custody-witness/.last-run.json', bytes: bytes.length, sha256: hash(bytes) }];
  const indexBytes = JSON.stringify({ schema: 1, files, fileManifestSha256: hash(files.map(file => `${file.sha256}  ${file.path}\n`).join('')) });
  const index = path.join(root, 'original-index.json');
  fs.writeFileSync(index, indexBytes);
  fs.writeFileSync(path.join(directory, 'custody-witness-index.json'), indexBytes);
  const hidden = path.join(directory, 'custody-witness', '.last-run.json');
  fs.writeFileSync(hidden, bytes);
  const receipt = path.join(root, 'receipt.json');
  const run = () => spawnSync(process.execPath, [path.resolve('scripts/verifyEvidenceDownload.mjs'), '--index', index,
    '--download', directory, '--downloaded-index', 'custody-witness-index.json', '--strip-prefix', 'artifacts/', '--receipt', receipt], { encoding: 'utf8' });
  return { root, directory, hidden, receipt, run };
}
afterEach(() => {
  for (const root of roots.splice(0)) {
    if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('pixibun-custody-')) throw Error('Unsafe custody fixture cleanup');
    fs.rmSync(root, { recursive: true, force: true });
  }
});
it('verifies downloaded hidden evidence and the original index, and refuses receipt replacement', () => {
  const f = witness();
  expect(f.run().status).toBe(0);
  expect(JSON.parse(fs.readFileSync(f.receipt, 'utf8'))).toMatchObject({ passed: true, filesIndexed: 1, downloadedIndexVerified: true });
  expect(f.run().status).not.toBe(0);
});
for (const fault of ['missing', 'changed', 'extra', 'changed index'] as const) it(`fails custody verification on ${fault} downloaded bytes`, () => {
  const f = witness();
  if (fault === 'missing') fs.unlinkSync(f.hidden);
  if (fault === 'changed') fs.writeFileSync(f.hidden, 'corrupted bytes');
  if (fault === 'extra') fs.writeFileSync(path.join(f.directory, 'unexpected.txt'), 'extra');
  if (fault === 'changed index') fs.writeFileSync(path.join(f.directory, 'custody-witness-index.json'), '{}');
  expect(f.run().status).toBe(1);
  expect(JSON.parse(fs.readFileSync(f.receipt, 'utf8'))).toMatchObject({ passed: false, failures: [expect.objectContaining({ reason: fault === 'changed index' ? 'changed' : fault })] });
});
