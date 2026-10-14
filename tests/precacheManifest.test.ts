import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MAX_PRECACHE_ASSETS, writePrecacheManifest } from '../scripts/writePrecacheManifest.mjs';
import { buildServiceWorkerScript } from '@/app/sw.js/route';

describe('build precache manifest', () => {
  let root = '';
  afterEach(() => { if (root) rmSync(root, { recursive: true, force: true }); });

  function build(files: string[]) {
    root = mkdtempSync(path.join(tmpdir(), 'pixibun-precache-'));
    mkdirSync(path.join(root, 'public'));
    for (const file of files) {
      const target = path.join(root, '.next', 'static', ...file.split('/'));
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, 'asset');
    }
  }

  it('lists every emitted static file except source maps under the worker version', () => {
    build(['chunks/a.js', 'chunks/a.js.map', 'chunks/b.css', 'media/font.woff2', 'BUILD/_buildManifest.js']);
    writePrecacheManifest({ root, version: 'v1.14.1-abc' });
    expect(JSON.parse(readFileSync(path.join(root, 'public', 'precache-manifest.json'), 'utf8'))).toEqual({
      version: 'v1.14.1-abc',
      assets: ['/_next/static/BUILD/_buildManifest.js', '/_next/static/chunks/a.js', '/_next/static/chunks/b.css', '/_next/static/media/font.woff2'],
    });
  });

  it('refuses a build the worker could not precache completely', () => {
    build(Array.from({ length: MAX_PRECACHE_ASSETS + 1 }, (_, index) => `chunks/${index}.js`));
    expect(() => writePrecacheManifest({ root, version: 'v1' })).toThrow(/precaches at most/);
  });

  it('keeps the script limit equal to the worker limit', () => {
    expect(buildServiceWorkerScript('v1')).toContain(`const MAX_SHELL_DEPENDENCIES = ${MAX_PRECACHE_ASSETS};`);
  });
});
