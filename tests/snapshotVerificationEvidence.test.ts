// @vitest-environment node
import { afterEach, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { snapshotVerificationEvidence } from '../scripts/snapshotVerificationEvidence.mjs';
import { verifyEvidenceDownload } from '../scripts/verifyEvidenceDownload.mjs';

const roots: string[] = [];
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pixibun-snapshot-'));
  roots.push(root);
  const source = path.join(root, 'test-results', 'production');
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(path.join(source, '.last-run.json'), '{"status":"interrupted"}');
  fs.writeFileSync(path.join(source, 'trace.network'), Buffer.from([0, 1, 255]));
  const output = 'artifacts/browser-snapshot';
  const snapshot = path.join(root, output);
  const run = () => snapshotVerificationEvidence({ root, sources: ['test-results', 'playwright-report'], output });
  return { root, source, snapshot, run };
}
afterEach(() => {
  for (const root of roots.splice(0)) {
    if (path.dirname(root) !== fs.realpathSync(os.tmpdir()) || !path.basename(root).startsWith('pixibun-snapshot-')) throw Error('Unsafe snapshot fixture cleanup');
    fs.rmSync(root, { recursive: true, force: true });
  }
});

it('captures hidden and binary evidence and keeps custody stable when original workers continue writing', () => {
  const f = fixture();
  expect(f.run()).toMatchObject({ filesCopied: 2, missingSources: ['playwright-report'] });
  fs.appendFileSync(path.join(f.source, 'trace.network'), 'later worker output');
  fs.writeFileSync(path.join(f.source, 'later.trace'), 'late trace');
  expect(fs.readFileSync(path.join(f.snapshot, 'test-results/production/trace.network'))).toEqual(Buffer.from([0, 1, 255]));
  const indexer = spawnSync(process.execPath, [path.resolve('scripts/indexVerificationEvidence.mjs'), '--source', 'artifacts', '--source', 'test-results', '--output', 'artifacts/browser-index.json'], { cwd: f.snapshot, encoding: 'utf8' });
  expect(indexer.status, indexer.stderr).toBe(0);
  const index = path.join(f.snapshot, 'artifacts/browser-index.json');
  const download = path.join(f.root, 'download');
  fs.cpSync(f.snapshot, download, { recursive: true });
  expect(verifyEvidenceDownload({ index, directory: download, downloadedIndex: 'artifacts/browser-index.json' })).toMatchObject({ passed: true, filesIndexed: 3 });
  fs.appendFileSync(path.join(download, 'test-results/production/trace.network'), 'corrupt');
  expect(verifyEvidenceDownload({ index, directory: download, downloadedIndex: 'artifacts/browser-index.json' })).toMatchObject({ passed: false, failures: [expect.objectContaining({ reason: 'changed' })] });
});

it('refuses to replace an existing snapshot', () => {
  const f = fixture(); f.run();
  expect(f.run).toThrow(/new snapshot/);
});

it('refuses credential files before creating a snapshot', () => {
  const f = fixture(); fs.writeFileSync(path.join(f.source, '.env.local'), 'fake fixture value');
  expect(f.run).toThrow(/Credential/);
  expect(fs.existsSync(f.snapshot)).toBe(false);
});

it('refuses linked sources and destinations outside verification output', () => {
  const f = fixture();
  const external = path.join(f.root, 'external'); fs.mkdirSync(external);
  fs.symlinkSync(external, path.join(f.source, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  expect(f.run).toThrow(/Symlinks/);
  expect(() => snapshotVerificationEvidence({ root: f.root, sources: ['test-results'], output: '../outside' })).toThrow(/new snapshot/);
  expect(fs.existsSync(f.snapshot)).toBe(false);
});
