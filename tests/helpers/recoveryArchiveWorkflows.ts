import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

async function seedArchiveSource(page: Page, count: number) {
  if (process.env.PIXIBUN_ARCHIVE_FIXTURE_DIAGNOSTIC === '1') {
    page.on('console', message => {
      if (message.text().startsWith('[archive-fixture]')) console.warn(message.text());
    });
  }
  await page.addInitScript(() => {
    // Exercise the browser-download fallback rather than an OS-native picker.
    Reflect.deleteProperty(window, 'showSaveFilePicker');
  });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  await page.evaluate(async (records) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('PixiBunDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const projectId = 'phase6-archive-source';
    const timestamp = Date.now() + 86_400_000;
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(['projects', 'layerBlobs'], 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
      transaction.objectStore('projects').put({ id: projectId, name: 'Archive boundary fixture',
        width: 32, height: 32, fps: 12, createdAt: timestamp, updatedAt: timestamp,
        dataJson: JSON.stringify({ format: 'pixibun-project', version: 3, name: 'Archive boundary fixture',
          width: 32, height: 32, fps: 12, createdAt: timestamp, updatedAt: timestamp,
          loopMode: 'repeat', onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1,
            opacity: 0.35, prevColor: '#7fae6b', nextColor: '#c792df' },
          customRamps: [], palettes: [{ id: 'palette-default', name: 'Default', colors: ['#000000', '#ffffff'] }],
          currentPaletteId: 'palette-default', clips: [], frames: [{ id: 'frame-1', durationMs: 83,
            layers: [0, 1, 2].map(i => ({ id: `source-${i}`, name: `Source ${i}`, visible: true,
              locked: false, opacity: 1, blendMode: 'source-over' })) }] }) });
      const store = transaction.objectStore('layerBlobs');
      for (let i = 0; i < records; i++) {
        store.add({ projectId, layerId: `source-${i}`, frameIndex: 0, updatedAt: timestamp,
          blob: new Uint8Array([i % 256, 17, 239]).buffer, blobType: 'image/png' });
      }
    });
    database.close();
  }, Math.min(count, 3));
  await page.reload();
  await expect(page.getByText(/Project Recovery & Safe Mode/i)).toBeVisible();
  await expect(page.getByText('Damaged Element Deletion Required', { exact: true })).toBeVisible();
  await expect(page.getByText(/Unexpected own property/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export Untouched Backup', exact: true })).toBeEnabled();
  if (count > 3) {
    // A source can grow after its earlier diagnosis. The archive must recheck
    // the current transaction rather than trust the displayed assessment.
    await page.evaluate(async (records) => {
      console.warn('[archive-fixture] opening overflow writer');
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('PixiBunDB');
        request.onsuccess = () => { console.warn('[archive-fixture] overflow writer opened'); resolve(request.result); };
        request.onerror = () => reject(request.error);
        request.onblocked = () => console.warn('[archive-fixture] overflow writer blocked');
      });
      for (let start = 3; start < records; start += 250) {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction('layerBlobs', 'readwrite');
          transaction.oncomplete = () => resolve();
          transaction.onabort = () => reject(transaction.error);
          transaction.onerror = () => reject(transaction.error);
          const store = transaction.objectStore('layerBlobs');
          for (let i = start; i < Math.min(start + 250, records); i++) store.add({
            projectId: 'phase6-archive-source', layerId: `source-${i}`, frameIndex: 0,
            updatedAt: 1000, blob: new Uint8Array([i % 256, 17, 239]).buffer, blobType: 'image/png',
          });
        });
        console.warn(`[archive-fixture] committed ${Math.min(start + 250, records)} records`);
      }
      database.close();
    }, count);
  }
}

async function readSourceSummary(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('PixiBunDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction(['projects', 'layerBlobs'], 'readonly');
    const query = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const id = 'phase6-archive-source';
    const projectRequest = query(transaction.objectStore('projects').get(id));
    const countRequest = query(transaction.objectStore('layerBlobs').index('projectId').count(id));
    const firstRequest = query(transaction.objectStore('layerBlobs').index('[projectId+layerId+frameIndex]').get([id, 'source-0', 0]));
    const [project, count, first] = await Promise.all([projectRequest, countRequest, firstRequest]);
    database.close();
    return { project, count, first: { ...first, blob: Array.from(new Uint8Array(first.blob)) } };
  });
}

export async function verifyArchiveOverflow(page: Page, info: TestInfo) {
  await seedArchiveSource(page, 10_001);
  const before = await readSourceSummary(page);
  await writeFile(info.outputPath('source-before.json'), JSON.stringify(before, null, 2));
  await page.evaluate(() => {
    const statistics = { counts: 0, payloadQueries: 0 };
    Object.assign(window, { __archiveQueryStatistics: statistics });
    const count = IDBIndex.prototype.count;
    const getAll = IDBIndex.prototype.getAll;
    const openCursor = IDBIndex.prototype.openCursor;
    IDBIndex.prototype.count = function (...args) {
      if (this.name === '[projectId+id]') statistics.counts++;
      return count.apply(this, args);
    };
    IDBIndex.prototype.getAll = function (...args) {
      if (this.name === '[projectId+id]') statistics.payloadQueries++;
      return getAll.apply(this, args);
    };
    IDBIndex.prototype.openCursor = function (...args) {
      if (this.name === '[projectId+id]') statistics.payloadQueries++;
      return openCursor.apply(this, args);
    };
  });
  let downloads = 0;
  page.on('download', () => { downloads++; });
  await test.step('Refuse the actual oversized archive without loading payloads', async () => {
  await page.getByRole('button', { name: 'Export Untouched Backup', exact: true }).click();
  const warning = page.getByTestId('recovery-backup-error');
  await expect(warning).toBeInViewport();
  await expect(warning).toContainText('Backup wasn\'t completed');
  await expect(warning).toContainText('more than 10,000 stored image records');
  expect(await warning.evaluate(element => {
    for (let current: Element | null = element; current; current = current.parentElement) {
      if (Number(getComputedStyle(current).opacity) === 0) return false;
    }
    return true;
  })).toBe(true);
  await expect(page.getByRole('button', { name: 'Export Untouched Backup', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as Window & {
    __archiveQueryStatistics: { counts: number; payloadQueries: number };
  }).__archiveQueryStatistics)).toEqual({ counts: 1, payloadQueries: 0 });
  expect(downloads).toBe(0);
  expect(await readSourceSummary(page)).toEqual(before);
  }, { timeout: 15_000 });
  await page.screenshot({ path: info.outputPath('archive-overflow-refused.png') });
}

export async function verifyAdmittedArchive(page: Page, info: TestInfo) {
  await seedArchiveSource(page, 3);
  const before = await readSourceSummary(page);
  await writeFile(info.outputPath('source-before.json'), JSON.stringify(before, null, 2));
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Untouched Backup', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
  const archivePath = info.outputPath('untouched-source.zip');
  await download.saveAs(archivePath);
  // Independent ZIP central-directory reader, including store-only data
  // descriptors. Do not reuse the application's archive writer/parser.
  const bytes = await readFile(archivePath);
  const end = bytes.length - 22;
  expect(bytes.readUInt32LE(end)).toBe(0x06054b50);
  const entries = bytes.readUInt16LE(end + 10);
  let offset = bytes.readUInt32LE(end + 16);
  const files = new Map<string, Buffer>();
  for (let i = 0; i < entries; i++) {
    expect(bytes.readUInt32LE(offset)).toBe(0x02014b50);
    expect(bytes.readUInt16LE(offset + 10)).toBe(0);
    const size = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const local = bytes.readUInt32LE(offset + 42);
    expect(bytes.readUInt32LE(local)).toBe(0x04034b50);
    const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
    expect(start + size).toBeLessThanOrEqual(bytes.readUInt32LE(end + 16));
    files.set(bytes.subarray(offset + 46, offset + 46 + nameLength).toString(), bytes.subarray(start, start + size));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  expect(files.get('project.json')?.toString()).toBe(before.project.dataJson);
  const rasters = [...files].filter(([name]) => name.endsWith('.png'));
  expect(rasters).toHaveLength(3);
  expect(rasters.map(([, data]) => [...data]).sort()).toEqual([[0, 17, 239], [1, 17, 239], [2, 17, 239]]);
  expect(files.has('recovery-manifest.json')).toBe(true);
  await expect(page.getByRole('button', { name: 'Export Untouched Backup', exact: true })).toBeEnabled();
  expect(await readSourceSummary(page)).toEqual(before);
  await page.screenshot({ path: info.outputPath('archive-source-preserved.png') });
}
