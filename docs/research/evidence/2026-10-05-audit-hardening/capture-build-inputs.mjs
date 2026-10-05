import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const walk = async path => (await Promise.all((await readdir(path, { withFileTypes: true })).map(entry => entry.isDirectory() ? walk(`${path}/${entry.name}`) : [`${path}/${entry.name}`]))).flat();
const paths = [...(await walk('src')).filter(path => /\.(tsx?|css)$/.test(path)), 'package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'scripts/getBuildVersion.mjs', '.next/BUILD_ID', '.next/build-manifest.json', '.next/server/app/studio/page.js', '.next/required-server-files.json', ...(await walk('.next/static/chunks')).filter(path => /\.(js|css)$/.test(path)), ...(await walk('.next/server/chunks')).filter(path => /\.js$/.test(path))];
const inputs = await Promise.all(paths.map(async path => { const bytes = await readFile(path); return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; }));
await writeFile('docs/research/evidence/2026-10-05-audit-hardening/build-inputs.json', JSON.stringify({ buildId: (await readFile('.next/BUILD_ID', 'utf8')).trim(), inputs }, null, 2));
console.log(`Captured ${inputs.length} application/build inputs.`);
