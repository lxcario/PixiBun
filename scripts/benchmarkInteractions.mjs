/** Original affine and palette workloads, measured serially outside coverage. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';

if (Number(process.versions.node.split('.')[0]) !== 22) throw Error('Benchmark requires Node 22.');
if (process.env.NODE_V8_COVERAGE || /coverage|inspect|prof/.test(`${process.env.NODE_OPTIONS ?? ''} ${process.execArgv.join(' ')}`)) {
  throw Error('Measure without coverage, profiling or a debugger.');
}
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--output')) throw Error('Usage: node scripts/benchmarkInteractions.mjs [--output new-result.json]');
const output = args[1] && path.resolve(args[1]);
if (output && fs.existsSync(output)) throw Error('Refusing to overwrite evidence.');
const sourceHashes = {};
async function loadSource(relativePath) {
  const source = fs.readFileSync(relativePath, 'utf8');
  sourceHashes[relativePath] = crypto.createHash('sha256').update(source).digest('hex');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}
const { rotateNearest } = await loadSource('src/lib/canvas/rotSprite.ts');
const { updateLivePaletteLUT32 } = await loadSource('src/lib/color/paletteCycling.ts');
let checksum = 0;
const warmupBatches = 5, measuredBatches = 15;
function summarize(batches, limitMs) {
  const sorted = [...batches].sort((a, b) => a - b);
  const p90Ms = sorted[Math.ceil(sorted.length * .9) - 1];
  return { batches, medianMs: sorted[Math.floor(sorted.length / 2)], p90Ms, limitMs, passed: p90Ms < limitMs };
}
const nearest = [];
for (const resolution of [32, 64, 128, 256]) {
  const data = new Uint8ClampedArray(resolution * resolution * 4);
  for (let i = 0; i < data.length / 4; i++) data.set([(i * 13) % 256, (i * 29) % 256, (i * 47) % 256, 255], i * 4);
  const buffer = { width: resolution, height: resolution, data };
  const batch = () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      const rotated = rotateNearest(buffer, i / 100 * Math.PI * 2);
      checksum = (checksum + rotated.width + rotated.height + rotated.data[3]) >>> 0;
    }
    return (performance.now() - start) / 100;
  };
  for (let i = 0; i < warmupBatches; i++) batch();
  nearest.push({ resolution, rotationsPerBatch: 100, ...summarize(Array.from({ length: measuredBatches }, batch), 16.66) });
}
const palette = [];
const basePaletteHex = Array.from({ length: 256 }, (_, i) =>
  `#${i.toString(16).padStart(2, '0')}${((i * 3) % 256).toString(16).padStart(2, '0')}${((i * 7) % 256).toString(16).padStart(2, '0')}`);
const tracks = [
  { id: 't1', name: 'water', low: 10, high: 32, rate: 12, direction: 'forward', blendShift: false, enabled: true },
  { id: 't2', name: 'fire', low: 40, high: 70, rate: 8, direction: 'ping-pong', blendShift: true, enabled: true },
];
for (const resolution of [64, 128, 256, 512]) {
  const pixels = resolution * resolution;
  const indexMap = Uint8Array.from({ length: pixels }, (_, i) => i % 256);
  const data32 = new Uint32Array(pixels);
  const baseData32 = Uint32Array.from({ length: pixels }, (_, i) => 0xff000000 | i);
  const lut = new Uint32Array(256);
  const batch = () => {
    let lutMs = 0, totalMs = 0;
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      updateLivePaletteLUT32(basePaletteHex, tracks, i / 50 * 2, lut);
      const afterLut = performance.now();
      for (let p = 0; p < pixels; p++) {
        const index = indexMap[p];
        data32[p] = index === 255 ? baseData32[p] : (lut[index] ?? baseData32[p]);
      }
      const end = performance.now();
      lutMs += afterLut - start;
      totalMs += end - start;
      checksum = (checksum + data32[i] + data32[pixels - 1]) >>> 0;
    }
    return { lutMs: lutMs / 50, totalMs: totalMs / 50 };
  };
  for (let i = 0; i < warmupBatches; i++) batch();
  const batches = Array.from({ length: measuredBatches }, batch);
  palette.push({ resolution, remapsPerBatch: 50,
    lut: summarize(batches.map(b => b.lutMs), 2), total: summarize(batches.map(b => b.totalMs), 16.66) });
}
const passed = nearest.every(r => r.passed) && palette.every(r => r.lut.passed && r.total.passed);
const result = { kind: 'uncovered-warmed-serial-interaction-benchmark', timestamp: new Date().toISOString(),
  runtime: process.version, typescript: ts.version,
  host: { platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length },
  sourceHashes, warmupBatches, measuredBatches, metric: 'p90 of batch means in milliseconds per operation',
  nearest, palette, checksum, status: passed ? 'passed' : 'failed' };
if (output) { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n'); }
console.log(JSON.stringify(result, null, 2));
process.exitCode = passed ? 0 : 1;
