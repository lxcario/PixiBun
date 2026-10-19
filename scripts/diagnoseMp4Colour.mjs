/** Retain controlled native color observations after a codec regression fails.
 * Diagnostic only: never changes the product export, original file or verdict.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { chromium, firefox } from '@playwright/test';

const [reportPath, outputPath, ffmpeg = 'ffmpeg'] = process.argv.slice(2);
const root = path.resolve('artifacts');
const output = path.resolve(outputPath ?? '');
if (!reportPath || !output.startsWith(root + path.sep)) throw Error('Required: results.json new-output-directory-under-artifacts [ffmpeg]');
await fs.mkdir(output); // Preserve earlier diagnostics rather than overwrite them.
const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
function findFirefoxFile(suites) {
  for (const suite of suites) {
    const nested = findFirefoxFile(suite.suites ?? []); if (nested) return nested;
    for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
      if (test.projectName !== 'firefox') continue;
      for (const result of test.results ?? []) for (const attachment of result.attachments ?? []) {
        if (attachment.name === 'actual-painted-poses.mp4' && attachment.body) return Buffer.from(attachment.body, 'base64');
      }
    }
  }
}
const original = findFirefoxFile(report.suites ?? []);
if (!original) throw Error('No actual Firefox MP4 attachment; no replacement file invented.');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function mediaHash(bytes) {
  let offset = 0; const payloads = [];
  while (offset + 8 <= bytes.length) {
    const size = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    if (size < 8 || offset + size > bytes.length) throw Error('Unsupported/truncated diagnostic MP4 box.');
    if (type === 'mdat') payloads.push(bytes.subarray(offset + 8, offset + size));
    offset += size;
  }
  if (!payloads.length || offset !== bytes.length) throw Error('Missing media payload.');
  return hash(Buffer.concat(payloads));
}
const originalPath = path.join(output, 'original.mp4');
await fs.writeFile(originalPath, original, { flag: 'wx' });
const mediaSha256 = mediaHash(original);
const variants = [{ name: 'original', file: originalPath, bytes: original }];
for (const matrix of ['smpte170m', 'bt709']) {
  const file = path.join(output, `container-${matrix}.mp4`);
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', originalPath, '-map', '0:v:0', '-c:v', 'copy', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1', '-colorspace', matrix, '-color_range', 'tv', '-movflags', '+write_colr', file], { encoding: 'utf8', timeout: 20_000 });
  if (result.status !== 0) throw Error(`Metadata diagnostic failed: ${result.error?.message ?? result.stderr}`);
  const bytes = await fs.readFile(file);
  if (mediaHash(bytes) !== mediaSha256) throw Error('Remux changed media samples; not accepted as a metadata-only comparison.');
  variants.push({ name: matrix, file, bytes });
}
const receipt = { schema: 1, diagnosticOnly: true, originalVerdictUnchanged: true, mediaSha256,
  files: variants.map(v => ({ name: v.name, bytes: v.bytes.length, sha256: hash(v.bytes), mediaSha256: mediaHash(v.bytes) })), browsers: [] };
// A fresh loopback origin makes WebCodecs available without changing app CSP.
const server = http.createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end('<!doctype html><title>Codec diagnostic</title>'); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  for (const [name, type] of [['firefox', firefox], ['chromium', chromium]]) {
    const browser = await type.launch({ headless: true, ...(name === 'chromium' ? { channel: 'chromium' } : {}) });
    const row = { name, hostPlatform: process.platform, files: [] }; receipt.browsers.push(row);
    try {
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      row.encoder = await page.evaluate(async () => {
        if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return { unavailable: true };
        const configs = []; let inputColorSpace;
        const encoder = new VideoEncoder({ output: (_chunk, metadata) => {
          const config = metadata?.decoderConfig;
          if (config) configs.push({ codec: config.codec, codedWidth: config.codedWidth, codedHeight: config.codedHeight, colorSpace: config.colorSpace });
        }, error: error => configs.push({ error: error.message }) });
        try {
          encoder.configure({ codec: 'avc1.42001f', width: 32, height: 32, bitrate: 2_000_000, framerate: 30, avc: { format: 'avc' }, hardwareAcceleration: 'prefer-software' });
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
          const context = canvas.getContext('2d'); context.fillStyle = '#ff0000'; context.fillRect(0, 0, 32, 32);
          const frame = new VideoFrame(canvas, { timestamp: 0, duration: 160_000 }); inputColorSpace = frame.colorSpace.toJSON();
          try { encoder.encode(frame, { keyFrame: true }); } finally { frame.close(); }
          await Promise.race([encoder.flush(), new Promise((_, reject) => setTimeout(() => reject(Error('Encoder diagnostic timed out')), 8000))]);
          return { inputColorSpace, configs };
        } catch (error) { return { inputColorSpace, configs, error: String(error) }; }
        finally { try { encoder.close(); } catch { /* An errored encoder can already be closed. */ } }
      });
      for (const variant of variants) {
        try {
          const observed = await page.evaluate(async bytes => {
            const video = document.createElement('video'); video.muted = true; video.preload = 'auto'; document.body.append(video);
            const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'video/mp4' }));
            const event = name => new Promise((resolve, reject) => {
              const timer = setTimeout(() => reject(Error('Diagnostic media timeout: ' + name)), 8000);
              video.addEventListener(name, () => { clearTimeout(timer); resolve(); }, { once: true });
              video.addEventListener('error', () => { clearTimeout(timer); reject(Error('Diagnostic media error')); }, { once: true });
            });
            try {
              const ready = event('loadeddata'); video.src = url; await ready;
              const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
              const context = canvas.getContext('2d'), samples = [];
              for (const at of [.08, .28]) { const seek = event('seeked'); video.currentTime = at; await seek; context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(video, 0, 0); samples.push([...context.getImageData(16, 16, 1, 1).data]); }
              return { width: video.videoWidth, height: video.videoHeight, duration: video.duration, samples };
            } finally { video.removeAttribute('src'); video.load(); video.remove(); URL.revokeObjectURL(url); }
          }, [...variant.bytes]);
          row.files.push({ name: variant.name, ...observed });
        } catch (error) { row.files.push({ name: variant.name, error: error.message }); }
      }
      await page.close();
    } finally { await browser.close(); }
  }
} finally {
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  await fs.writeFile(path.join(output, 'observations.json'), JSON.stringify(receipt, null, 2), { flag: 'wx' });
}
console.log(JSON.stringify(receipt));
