import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getBuildVersion } from './getBuildVersion.mjs';

// Keep in step with MAX_SHELL_DEPENDENCIES in src/app/sw.js/route.ts.
export const MAX_PRECACHE_ASSETS = 512;

/**
 * Lists every emitted /_next/static file so the service worker can precache the
 * whole Studio at install. Panels opened for the first time while offline then
 * load from the cache instead of failing their chunk request.
 * @param {string} staticDir the build's .next/static directory
 */
export function listStaticAssets(staticDir) {
  return readdirSync(staticDir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && !entry.name.endsWith('.map'))
    .map(entry => '/_next/static/' + path.relative(staticDir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort();
}

export function writePrecacheManifest({ root = process.cwd(), version = getBuildVersion({ env: { ...process.env, NODE_ENV: 'production' } }) } = {}) {
  const assets = listStaticAssets(path.join(root, '.next', 'static'));
  if (assets.length === 0) throw new Error('No built static assets found. Run next build first.');
  if (assets.length > MAX_PRECACHE_ASSETS) {
    throw new Error(`The build emitted ${assets.length} static files; the service worker precaches at most ${MAX_PRECACHE_ASSETS}.`);
  }
  // The worker ignores a list whose version differs from its own cache version.
  writeFileSync(path.join(root, 'public', 'precache-manifest.json'), JSON.stringify({ version, assets }) + '\n');
  return { version, assets };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { version, assets } = writePrecacheManifest();
  console.log(`Precache manifest: ${assets.length} static files for ${version}.`);
}
