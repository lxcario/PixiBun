// @vitest-environment node
import { afterEach, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const publisher = path.resolve('scripts/publishEvidence.mjs');
const fixtures: string[] = [];

it('routine browser screenshots do not overwrite historical documentation captures', () => {
  const unsafe: string[] = [];
  for (const folder of ['tests/e2e', 'tests/production']) {
    for (const file of fs.readdirSync(folder)) {
      if (!file.endsWith('.spec.ts')) continue;
      const source = fs.readFileSync(path.join(folder, file), 'utf8');
      if (/\.screenshot\s*\(\s*\{[^}]*\bpath\s*:\s*['"`]docs[\\/](?:assets|research)[\\/]/.test(source)) unsafe.push(path.join(folder, file));
    }
  }
  expect(unsafe).toEqual([]);
});

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pixibun-evidence-'));
  fixtures.push(root);
  fs.mkdirSync(path.join(root, 'artifacts', 'run'), { recursive: true });
  execFileSync('git', ['init', '--quiet'], { cwd: root });
  fs.writeFileSync(path.join(root, '.gitignore'), '/artifacts/\n');
  const capture = Buffer.from('capture fixture bytes');
  fs.writeFileSync(path.join(root, 'artifacts', 'run', 'sample.png'), capture);
  fs.writeFileSync(path.join(root, 'run.json'), JSON.stringify({ command: 'fixture', runtime: 'Node 22', browser: 'fixture', viewport: '8x8', revision: 'fixture', verdict: 'passed' }));
  const run = (destination = 'artifacts/evidence-archive/new-run') => spawnSync(process.execPath, [publisher, '--source', 'artifacts/run', '--destination', destination, '--run', 'run.json'], { cwd: root, encoding: 'utf8' });
  return { root, capture, run, destination: path.join(root, 'artifacts', 'evidence-archive', 'new-run') };
}
afterEach(() => {
  for (const root of fixtures.splice(0)) {
    const resolved = path.resolve(root);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('pixibun-evidence-')) throw Error('Unsafe fixture cleanup');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});

it('archives source bytes and hashes once, and refuses to replace an archived run', () => {
  const f = fixture();
  expect(f.run().status).toBe(0);
  expect(fs.readFileSync(path.join(f.destination, 'sample.png'))).toEqual(f.capture);
  const manifest = fs.readFileSync(path.join(f.destination, 'manifest.json'));
  expect(JSON.parse(manifest.toString()).captures).toEqual([{ path: 'sample.png', sha256: crypto.createHash('sha256').update(f.capture).digest('hex') }]);
  fs.writeFileSync(path.join(f.root, 'artifacts', 'run', 'sample.png'), 'changed source');
  expect(f.run().status).not.toBe(0);
  expect(fs.readFileSync(path.join(f.destination, 'sample.png'))).toEqual(f.capture);
  expect(fs.readFileSync(path.join(f.destination, 'manifest.json'))).toEqual(manifest);
});

it('requires verdict metadata before creating an evidence directory', () => {
  const f = fixture();
  fs.writeFileSync(path.join(f.root, 'run.json'), JSON.stringify({ command: 'fixture' }));
  expect(f.run().status).not.toBe(0);
  expect(fs.existsSync(f.destination)).toBe(false);
});

it('refuses to publish raw captures into the source documentation tree', () => {
  const f = fixture();
  expect(f.run('docs/research/evidence/new-run').status).not.toBe(0);
  expect(fs.existsSync(path.join(f.root, 'docs'))).toBe(false);
});

it('refuses a local archive when its output would be included in Git', () => {
  const f = fixture();
  fs.writeFileSync(path.join(f.root, '.gitignore'), '');
  expect(f.run().status).not.toBe(0);
  expect(fs.existsSync(f.destination)).toBe(false);
});
