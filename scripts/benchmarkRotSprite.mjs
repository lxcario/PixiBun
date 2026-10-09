/** Serial, warmed Node 22 measurement; deliberately independent of Vitest/V8 coverage. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';

if (Number(process.versions.node.split('.')[0]) !== 22) throw Error('Benchmark requires the supported Node 22 runtime.');
if (process.env.NODE_V8_COVERAGE || /coverage|inspect|prof/.test(`${process.env.NODE_OPTIONS ?? ''} ${process.execArgv.join(' ')}`)) {
  throw Error('Run performance measurement without coverage, profiling or a debugger.');
}
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--output')) throw Error('Usage: node scripts/benchmarkRotSprite.mjs [--output new-result.json]');
const output = args[1] && path.resolve(args[1]);
if (output && fs.existsSync(output)) throw Error('Benchmark evidence must not overwrite an existing result.');
const sourcePath = path.resolve('src/lib/canvas/rotSprite.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { rotSprite } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
// Same 23x12 hollow outline and 50-angle workload as the retired instrumented timer.
const rows = [
  '.......########........', '......#........#.......', '.....#..........#......',
  '....#............#.....', '....#............#.....', '...#.............#.....',
  '...#.............#.....', '...#.............#.....', '....#............#.....',
  '.....#..........#......', '......###......#.......', '.........######........',
];
const width = rows[0].length, height = rows.length;
const data = new Uint8ClampedArray(width * height * 4);
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  if (rows[y][x] === '#') data.set([58, 46, 76, 255], (y * width + x) * 4);
}
const sprite = { width, height, data };
const angles = Array.from({ length: 50 }, (_, i) => i * 7 * Math.PI / 180);
let checksum = 0;
const batch = () => {
  const start = performance.now();
  for (const angle of angles) {
    const rotated = rotSprite(sprite, angle);
    checksum = (checksum + rotated.width + rotated.height + rotated.data[3]) >>> 0;
  }
  return (performance.now() - start) / angles.length;
};
// Warm every tested angle before measuring; no build, unit worker or browser in this process.
for (let i = 0; i < 5; i++) batch();
const batches = Array.from({ length: 15 }, batch);
const sorted = [...batches].sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)];
const p90 = sorted[Math.ceil(sorted.length * 0.9) - 1];
// Retain the original <10ms budget, now applied to p90 of warmed 50-call batch means.
// Baselines describe a host; they never silently recalibrate this limit on each run.
const limitMs = 10;
const result = {
  kind: 'uncovered-warmed-serial-benchmark', timestamp: new Date().toISOString(),
  runtime: process.version, typescript: ts.version,
  host: { platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length },
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  workload: { width, height, rotationsPerBatch: angles.length, warmupBatches: 5, measuredBatches: batches.length, anglesDegrees: angles.map((_, i) => i * 7) },
  metric: 'milliseconds per rotation averaged within each batch', batches, medianMs: median, p90Ms: p90,
  limitMs, status: p90 < limitMs ? 'passed' : 'failed', checksum,
};
if (output) { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n'); }
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.status === 'passed' ? 0 : 1;
