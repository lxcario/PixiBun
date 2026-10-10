import { expect, test, type Page } from '@playwright/test';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import type { ProjectFile } from '../../src/types/project';

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
async function ready(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-restoration-phase=active]')).toBeVisible();
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
}
async function paint(page: Page, fraction: number) {
  const before = await pixels(page), box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * fraction, box.y + box.height * fraction);
  await expect.poll(() => pixels(page)).not.toEqual(before);
}
async function saved(page: Page) {
  await page.getByTestId('save-button').click();
  await expect(page.locator('[role=status]').filter({ hasText: /Changes saved/ })).toBeVisible();
  await expect(page.getByTestId('save-button')).toHaveAttribute('title', 'All changes saved (Ctrl+S)');
}
async function stored(page: Page) {
  return page.evaluate(async () => {
    const opened = indexedDB.open('PixiBunDB');
    const database = await new Promise<IDBDatabase>((resolve, reject) => { opened.onsuccess = () => resolve(opened.result); opened.onerror = () => reject(opened.error); });
    const tx = database.transaction(['projects', 'layerBlobs']);
    const projects = tx.objectStore('projects').getAll(), layers = tx.objectStore('layerBlobs').getAll();
    const records = await Promise.all([projects, layers].map(request => new Promise<unknown[]>(resolve => { request.onsuccess = () => resolve(request.result); })));
    database.close();
    const project = records[0][0] as { id: string; dataJson: string };
    const document = JSON.parse(project.dataJson) as ProjectFile;
    return { id: project.id, document, layers: await Promise.all((records[1] as { projectId: string; layerId: string; blob: ArrayBuffer | Blob }[]).map(async layer => ({
      projectId: layer.projectId, layerId: layer.layerId, representation: layer.blob instanceof Blob ? 'Blob' : 'ArrayBuffer',
      bytes: Array.from(new Uint8Array(layer.blob instanceof Blob ? await layer.blob.arrayBuffer() : layer.blob)),
    }))) };
  });
}

for (const legacyBlob of [false, true]) test(`two actual compatible builds update and roll back while preserving artwork and optional metadata (legacyBlob=${legacyBlob})`, async ({ context }, info) => {
  let current = 'http://localhost:3162';
  let refuseInstall = false, refusedShell = false;
  const activations = new Map<string, number>();
  const servedScripts: { cache: string; originalSha256: string; servedSha256: string }[] = [];
  // This local host retains both builds' static assets; actual hosting skew protection is separate.
  const server = createServer(async (request, response) => {
    try {
      if (request.url?.startsWith('/__rollback_native_activation?')) {
        const cache = new URL(request.url, 'http://localhost').searchParams.get('cache')!;
        activations.set(cache, (activations.get(cache) ?? 0) + 1);
        response.writeHead(204); response.end(); return;
      }
      if (refuseInstall && request.url === '/manifest.webmanifest') {
        refusedShell = true;
        response.writeHead(503); response.end('controlled network failure'); return;
      }
      let upstream = await fetch(current + request.url);
      if (upstream.status === 404 && request.url?.startsWith('/_next/static/')) upstream = await fetch((current.endsWith('3162') ? 'http://localhost:3163' : 'http://localhost:3162') + request.url);
      response.writeHead(upstream.status, Object.fromEntries([...upstream.headers].filter(([key]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(key))));
      let bytes = Buffer.from(await upstream.arrayBuffer());
      if (request.url?.split('?')[0] === '/sw.js') {
        const original = bytes;
        const cache = bytes.toString().match(/const CACHE_NAME = '([^']+)'/)?.[1];
        if (!cache) throw new Error('Native activation observer requires actual emitted cache identity');
        // Observe native activation without forcing takeover or changing either emitted build.
        const observer = '\nself.addEventListener("activate", event => { event.waitUntil(fetch("/__rollback_native_activation?cache=" + encodeURIComponent(' + JSON.stringify(cache) + '), { cache: "no-store" })); });\n';
        bytes = Buffer.concat([bytes, Buffer.from(observer)]);
        servedScripts.push({ cache, originalSha256: createHash('sha256').update(original).digest('hex'), servedSha256: createHash('sha256').update(bytes).digest('hex') });
      }
      response.end(bytes);
    } catch { response.writeHead(502); response.end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/studio`;
  try {
    const oldScript = await (await fetch('http://localhost:3162/sw.js')).text();
    const candidateScript = await (await fetch('http://localhost:3163/sw.js')).text();
    const oldCache = oldScript.match(/const CACHE_NAME = '([^']+)'/)?.[1];
    const candidateCache = candidateScript.match(/const CACHE_NAME = '([^']+)'/)?.[1];
    expect(oldCache).toBeTruthy(); expect(candidateCache).toBeTruthy(); expect(candidateCache).not.toBe(oldCache);
    const first = await context.newPage(); await ready(first, url); await paint(first, 0.25); await saved(first);
    // Establish a controlled older-build baseline before the fixture reload.
    // serviceWorker.ready alone does not prove that the current document is controlled.
    await expect.poll(() => activations.get(oldCache!) ?? 0).toBe(1);
    await first.evaluate(async () => { await navigator.serviceWorker.ready; });
    await expect.poll(() => first.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    const original = await pixels(first);
    const beforeFixture = await stored(first);
    try { await first.evaluate(async ({ legacyBlob, rgba }) => {
      const opened = indexedDB.open('PixiBunDB');
      const database = await new Promise<IDBDatabase>(resolve => { opened.onsuccess = () => resolve(opened.result); });
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(rgba)))).map(byte => byte.toString(16).padStart(2, '0')).join('');
      const tx = database.transaction(['projects', 'layerBlobs'], 'readwrite');
      let fixtureError: Error | undefined;
      const projects = tx.objectStore('projects'), request = projects.getAll();
      request.onsuccess = () => {
        const record = request.result[0] as { dataJson: string }, document = JSON.parse(record.dataJson) as ProjectFile;
        document.customRamps = [{ baseColor: '#ff0000', shades: ['#800000', '#ff0000', '#ff8080'] }];
        document.motionRigs = [{ version: 1, id: 'rollback-rig', name: 'Custody fixture', part: {
          id: 'rollback-part', sourceFrameId: document.frames[0].id, sourceLayerId: document.frames[0].layers[0].id,
          width: document.width, height: document.height, sourceSha256: hash, bounds: { x: 0, y: 0, w: document.width, h: document.height },
          pivot: { x: document.width / 2, y: document.height / 2 }, startPose: { translationX: 0, translationY: 0, rotation: 0 },
          endPose: { translationX: 2, translationY: 0, rotation: 0 }, frameCount: 4, easing: 'linear', maskRuns: null,
        } }];
        record.dataJson = JSON.stringify(document); projects.put(record);
      };
      if (legacyBlob) {
        const layers = tx.objectStore('layerBlobs'), cursor = layers.openCursor();
        cursor.onsuccess = () => {
          if (!cursor.result) return;
          try {
            const layer = cursor.result.value;
            layer.blob = new Blob([layer.blob], { type: layer.blobType ?? 'image/png' }); delete layer.blobType;
            cursor.result.update(layer); cursor.result.continue();
          } catch (error) {
            fixtureError = new Error(`Legacy Blob fixture: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`);
            tx.abort();
          }
        };
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = tx.onabort = event => {
          const error = (event.target as IDBRequest).error ?? tx.error;
          reject(fixtureError ?? new Error(`Fixture transaction ${error?.name}: ${error?.message}`));
        };
      }); database.close();
    }, { legacyBlob, rgba: original }); } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (legacyBlob && info.project.name === 'webkit' &&
          /UnknownError: Error preparing Blob\/File data to be stored in object store/.test(message)) {
        const afterRefusal = await stored(first);
        expect(afterRefusal.id).toBe(beforeFixture.id); expect(afterRefusal.layers).toEqual(beforeFixture.layers);
        const { updatedAt: beforeTime, ...beforeDocument } = beforeFixture.document;
        const { updatedAt: afterTime, ...afterDocument } = afterRefusal.document;
        expect(afterTime).toBeGreaterThanOrEqual(beforeTime); expect(afterDocument).toEqual(beforeDocument);
        expect(await pixels(first)).toEqual(original);
        await info.attach('legacy-blob-capability.json', { body: Buffer.from(JSON.stringify({ message, platform: process.platform, browser: info.project.name, fixtureRefusedAtomically: true, legacyRollbackQualified: false }, null, 2)), contentType: 'application/json' });
        test.skip(true, `Native ${process.platform} WebKit cannot create the legacy Blob fixture; legacy rollback remains unqualified.`);
      }
      throw error;
    }
    await ready(first, url); await expect.poll(() => pixels(first)).toEqual(original);
    const seeded = await stored(first);
    await first.evaluate(async () => { await navigator.serviceWorker.ready; });
    await expect.poll(() => first.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    const second = await context.newPage(); await ready(second, url); await expect.poll(() => pixels(second)).toEqual(original);
    await paint(first, 0.65); const edited = await pixels(first);
    current = 'http://localhost:3163'; refuseInstall = true;
    await first.evaluate(async () => { try { await (await navigator.serviceWorker.getRegistration())!.update(); } catch { /* Installation intentionally refused. */ } });
    await expect.poll(() => refusedShell).toBe(true);
    await expect.poll(() => first.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.installing))).toBe(false);
    expect(await first.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting))).toBe(false);
    expect(await pixels(first)).toEqual(edited); expect(await pixels(second)).toEqual(original);
    refuseInstall = false;
    await first.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
    await expect.poll(() => first.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state)).toBe('installed');
    await first.getByRole('button', { name: 'Update instructions', exact: true }).click();
    await expect(first.getByText(/close all PixiBun tabs/i)).toBeVisible();
    expect(await pixels(first)).toEqual(edited); expect(await pixels(second)).toEqual(original);
    await saved(first); await first.close(); await second.close();
    // Pending fetches can delay activation after the last tab closes. Reopening early
    // creates another client of the old worker and legitimately keeps the update waiting.
    await expect.poll(() => activations.get(candidateCache!) ?? 0).toBe(1);
    const updated = await context.newPage(); await ready(updated, url); await expect.poll(() => pixels(updated)).toEqual(edited);
    await expect.poll(() => updated.evaluate(() => caches.keys())).toEqual([candidateCache]);
    const candidateRecord = await stored(updated);
    expect(candidateRecord.id).toBe(seeded.id); expect(candidateRecord.document.motionRigs).toEqual(seeded.document.motionRigs); expect(candidateRecord.document.customRamps).toEqual(seeded.document.customRamps);
    await paint(updated, 0.85); await saved(updated); const candidatePixels = await pixels(updated), candidateWritten = await stored(updated);
    expect(candidateWritten.layers.every(layer => layer.representation === 'ArrayBuffer')).toBe(true);
    const oldActivationBaseline = activations.get(oldCache!) ?? 0;
    current = 'http://localhost:3162';
    await updated.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
    await expect.poll(() => updated.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state)).toBe('installed');
    await updated.close();
    await expect.poll(() => activations.get(oldCache!) ?? 0).toBe(oldActivationBaseline + 1);
    const rolledBack = await context.newPage(); await ready(rolledBack, url); await expect.poll(() => pixels(rolledBack)).toEqual(candidatePixels);
    await expect.poll(() => rolledBack.evaluate(() => caches.keys())).toEqual([oldCache]);
    const readBack = await stored(rolledBack);
    expect(readBack.id).toBe(candidateWritten.id);
    // The application's visibility/pagehide save may advance updatedAt on close.
    // Preserve every other document field and the exact native PNG records.
    const { updatedAt: beforeCloseTime, ...beforeCloseDocument } = candidateWritten.document;
    const { updatedAt: afterCloseTime, ...afterCloseDocument } = readBack.document;
    expect(afterCloseTime).toBeGreaterThanOrEqual(beforeCloseTime);
    expect(afterCloseDocument).toEqual(beforeCloseDocument); expect(readBack.layers).toEqual(candidateWritten.layers);
    await paint(rolledBack, 0.45); await saved(rolledBack); const rollbackPixels = await pixels(rolledBack);
    const rewritten = await stored(rolledBack); expect(rewritten.document.motionRigs).toEqual(seeded.document.motionRigs); expect(rewritten.document.customRamps).toEqual(seeded.document.customRamps);
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    await rolledBack.reload({ waitUntil: 'domcontentloaded' }); await expect.poll(() => pixels(rolledBack)).toEqual(rollbackPixels);
    await info.attach('two-build-custody.json', { body: Buffer.from(JSON.stringify({ legacyBlob, oldCache, candidateCache, oldIdentity: seeded.id, candidateIdentity: candidateWritten.id, rollbackIdentity: rewritten.id, format: rewritten.document.version, closeSaveTimes: { beforeCloseTime, afterCloseTime }, metadata: { motionRigs: rewritten.document.motionRigs, customRamps: rewritten.document.customRamps } }, null, 2)), contentType: 'application/json' });
    await rolledBack.close();
  } finally {
    await info.attach('native-activation-custody.json', { body: Buffer.from(JSON.stringify({ activations: Object.fromEntries(activations), servedScripts }, null, 2)), contentType: 'application/json' });
    if (server.listening) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  }
});
