import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { autoSaveWorkspaceDetailed, createBlankProjectFile, db, deleteProject, getStoredProjectVersion, renameProject } from '@/lib/storage/db';
import { assertMemoryAvailable, COMBINED_MEMORY_LIMIT_BYTES, getMemoryBudgetUsage, registerMemoryUsage, reserveMemory } from '@/lib/safety/memoryBudget';
import { withExportMemory } from '@/lib/export/exportMemory';
import { buildServiceWorkerScript } from '@/app/sw.js/route';

beforeEach(async () => {
  await db.projects.clear(); await db.layerBlobs.clear();
  registerMemoryUsage('rasters', () => 0); registerMemoryUsage('history', () => 0); registerMemoryUsage('collaboration', () => 0);
});

describe('Atomic storage version admission', () => {
  it('stores binary bytes, returns equivalent typed Blobs, and retains legacy Blob readability', async () => {
    const project = createBlankProjectFile();
    const blob = new Blob([new Uint8Array([0, 255, 17])], { type: 'image/png' });
    const layerId = project.frames[0].layers[0].id;
    await autoSaveWorkspaceDetailed('binary', project, undefined, [{ layerId, frameIndex: 0, blob }], undefined, null);
    const record = (await db.layerBlobs.where('projectId').equals('binary').first())!;
    expect(Object.hasOwn(record, 'blobType')).toBe(false);
    expect(record.blob.type).toBe('image/png');
    expect(new Uint8Array(await record.blob.arrayBuffer())).toEqual(new Uint8Array([0, 255, 17]));
    const raw = await new Promise<{ blob: unknown }>((resolve, reject) => {
      const request = db.backendDB().transaction('layerBlobs').objectStore('layerBlobs').get(record.id!);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    expect(raw.blob).toBeInstanceOf(ArrayBuffer);
    await db.layerBlobs.add({ projectId: 'legacy-blob', layerId, frameIndex: 0, blob, updatedAt: Date.now() });
    expect((await db.layerBlobs.where('projectId').equals('legacy-blob').first())!.blob).toBeInstanceOf(Blob);
  });

  it('leaves metadata and blobs intact when binary preparation fails before the transaction', async () => {
    const project = createBlankProjectFile();
    await autoSaveWorkspaceDetailed('intact', project);
    const before = await db.projects.get('intact');
    const blob = new Blob(['pixels']); vi.spyOn(blob, 'arrayBuffer').mockRejectedValue(new Error('read failed'));
    expect(await autoSaveWorkspaceDetailed('intact', { ...project, name: 'refused' }, undefined,
      [{ layerId: project.frames[0].layers[0].id, frameIndex: 0, blob }])).toMatchObject({ ok: false });
    expect(await db.projects.get('intact')).toEqual(before);
    expect(getMemoryBudgetUsage().reservedBytes).toBe(0);
  });

  it('permits exactly one of two saves from the same base and preserves the winning blobs', async () => {
    const project = createBlankProjectFile();
    const first = await autoSaveWorkspaceDetailed('shared', project, undefined, [], undefined, null);
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error('fixture');
    const layerId = project.frames[0].layers[0].id;
    const save = (name: string) => autoSaveWorkspaceDetailed('shared', { ...project, name }, undefined,
      [{ layerId, frameIndex: 0, blob: new Blob([name]) }], undefined, first.storageVersion);
    const outcomes = await Promise.all([save('one'), save('two')]);
    expect(outcomes.filter(result => result.ok)).toHaveLength(1);
    expect(outcomes.filter(result => !result.ok && result.reason === 'conflict')).toHaveLength(1);
    const stored = await db.projects.get('shared');
    const blob = await db.layerBlobs.where('projectId').equals('shared').first();
    expect(await blob!.blob.text()).toBe(stored!.name);
  });

  it('refuses to resurrect a project deleted after it was opened', async () => {
    const project = createBlankProjectFile();
    await autoSaveWorkspaceDetailed('deleted', project);
    const version = getStoredProjectVersion((await db.projects.get('deleted'))!);
    await deleteProject('deleted');
    expect(await autoSaveWorkspaceDetailed('deleted', project, undefined, [], undefined, version)).toMatchObject({ ok: false, reason: 'conflict' });
    expect(await db.projects.get('deleted')).toBeUndefined();
  });

  it('detects gallery renames and migrates legacy rows without a schema upgrade', async () => {
    const project = createBlankProjectFile();
    await autoSaveWorkspaceDetailed('legacy', project);
    await db.projects.update('legacy', { storageVersion: undefined });
    const version = getStoredProjectVersion((await db.projects.get('legacy'))!);
    expect(version).toMatch(/^legacy:/);
    expect(await renameProject('legacy', 'renamed')).toBe(true);
    expect(await autoSaveWorkspaceDetailed('legacy', project, undefined, [], undefined, version)).toMatchObject({ ok: false, reason: 'conflict' });
    expect((await db.projects.get('legacy'))!.name).toBe('renamed');
  });
});

describe('Combined memory admission', () => {
  it('counts live rasters, history including baseline, replicas and simultaneous reservations', () => {
    registerMemoryUsage('rasters', () => 200 * 1024 * 1024);
    registerMemoryUsage('history', () => 100 * 1024 * 1024);
    registerMemoryUsage('collaboration', () => 20 * 1024 * 1024);
    const release = reserveMemory(100 * 1024 * 1024, 'first export');
    expect(() => reserveMemory(100 * 1024 * 1024, 'second export')).toThrow(/combined artwork memory budget/);
    release(); release();
    expect(getMemoryBudgetUsage().reservedBytes).toBe(0);
    expect(() => assertMemoryAvailable(192 * 1024 * 1024, 'staging')).not.toThrow();
    expect(() => assertMemoryAvailable(192 * 1024 * 1024 + 1, 'staging')).toThrow();
  });

  it('rejects impossible estimates before work and releases failed and overlapping exports', async () => {
    const frame = { width: 1024, height: 1024 } as HTMLCanvasElement;
    const work = vi.fn();
    await expect(withExportMemory(Array.from({ length: 40 }, () => frame), 1, work)).rejects.toThrow(/memory budget/);
    expect(work).not.toHaveBeenCalled();
    await expect(withExportMemory([frame], 1, async () => { throw new DOMException('Cancelled', 'AbortError'); })).rejects.toThrow('Cancelled');
    expect(getMemoryBudgetUsage().reservedBytes).toBe(0);
    let finish!: () => void;
    const held = withExportMemory([frame], 1, () => new Promise<void>(resolve => { finish = resolve; }));
    expect(getMemoryBudgetUsage().reservedBytes).toBe(16 * 1024 * 1024);
    const release = reserveMemory(COMBINED_MEMORY_LIMIT_BYTES - getMemoryBudgetUsage().totalBytes, 'other job');
    await expect(withExportMemory([frame], 1, work)).rejects.toThrow();
    release(); finish(); await held;
    expect(getMemoryBudgetUsage().reservedBytes).toBe(0);
  });
});

it('executes the real worker update handler: open tabs defer, zero windows permits activation', async () => {
  const listeners = new Map<string, (event: { data: unknown; source: { postMessage: ReturnType<typeof vi.fn> }; waitUntil: (p: Promise<unknown>) => void }) => void>();
  const skipWaiting = vi.fn();
  const matchAll = vi.fn().mockResolvedValue([{}, {}]);
  const self = { addEventListener: (type: string, callback: typeof listeners extends Map<string, infer V> ? V : never) => listeners.set(type, callback), clients: { matchAll }, skipWaiting };
  new Function('self', buildServiceWorkerScript('test'))(self);
  const source = { postMessage: vi.fn() };
  let pending!: Promise<unknown>;
  const event = { data: { type: 'SKIP_WAITING' }, source, waitUntil: (p: Promise<unknown>) => { pending = p; } };
  listeners.get('message')!(event); await pending;
  expect(skipWaiting).not.toHaveBeenCalled();
  expect(source.postMessage).toHaveBeenCalledWith({ type: 'UPDATE_DEFERRED' });
  matchAll.mockResolvedValue([]);
  listeners.get('message')!(event); await pending;
  expect(skipWaiting).toHaveBeenCalledTimes(1);
});

it('precaches same-origin shell dependencies and retains them while bounding dynamic cache entries', async () => {
  const records = new Map<string, Response>();
  const origin = 'https://pixibun.test';
  const html = '<script src="/_next/static/studio.js"></script><link href="/_next/static/font.woff2"><script src="https://foreign.test/_next/static/evil.js"></script><a href="/api/private">api</a>';
  const key = (path: string | { url: string }) => {
    const url = new URL(typeof path === 'string' ? path : path.url, origin); return url.pathname + url.search;
  };
  const cache = {
    addAll: vi.fn(async (paths: string[]) => { for (const path of paths) records.set(key(path), new Response(path === '/' || path === '/studio' ? html : 'asset')); }),
    match: async (path: string) => records.get(key(path))?.clone(),
    put: async (path: string, response: Response) => { records.set(key(path), response.clone()); },
    keys: async () => [...records.keys()].map(path => ({ url: origin + path })),
    delete: async (path: { url: string }) => records.delete(key(path)),
  };
  const self = { location: { origin }, addEventListener: vi.fn() };
  const runtime = new Function('self', 'caches', buildServiceWorkerScript('test') + '\nreturn { precacheShell, trimCache };')(self, { open: async () => cache });
  await runtime.precacheShell();
  expect(cache.addAll.mock.calls[1][0]).toEqual(['/_next/static/studio.js', '/_next/static/font.woff2']);
  const onMessage = self.addEventListener.mock.calls.find(([type]) => type === 'message')![1];
  let warmed!: Promise<unknown>;
  onMessage({ data: { type: 'CACHE_ASSETS', urls: ['/_next/static/lazy.js?dpl=release', 'https://foreign.test/_next/static/evil.js', 'http://['] },
    waitUntil: (pending: Promise<unknown>) => { warmed = pending; } });
  await warmed;
  expect(cache.addAll.mock.calls.at(-1)![0]).toEqual(['/_next/static/lazy.js?dpl=release']);
  for (let i = 0; i < 80; i++) records.set('/dynamic/' + i, new Response('dynamic'));
  await runtime.trimCache(cache, 50);
  expect(records.has('/_next/static/studio.js')).toBe(true);
  expect(records.has('/_next/static/font.woff2')).toBe(true);
  expect(records.has('/_next/static/lazy.js?dpl=release')).toBe(true);
  expect(records.has('/studio')).toBe(true);
  expect([...records.keys()].filter(path => path.startsWith('/dynamic/'))).toHaveLength(50);
});

it('precaches every static file from its own build list and ignores another deployment\'s list', async () => {
  const origin = 'https://pixibun.test';
  async function install(list: unknown) {
    const added: string[][] = [];
    const cache = {
      addAll: vi.fn(async (paths: string[]) => { added.push(paths); }),
      match: async () => new Response('<script src="/_next/static/studio.js"></script>'),
      put: async () => {},
    };
    const fetch = vi.fn(async () => list === null ? new Response('missing', { status: 404 }) : Response.json(list));
    const runtime = new Function('self', 'caches', 'fetch', buildServiceWorkerScript('release-1') + '\nreturn { precacheShell };')(
      { location: { origin }, addEventListener: vi.fn() }, { open: async () => cache }, fetch);
    await runtime.precacheShell();
    expect(fetch).toHaveBeenCalledWith('/precache-manifest.json', { cache: 'no-store' });
    return added[1];
  }
  const lazy = ['/_next/static/chunks/export.js', '/_next/static/media/font.woff2', '/_next/static/studio.js'];
  expect(await install({ version: 'release-1', assets: [...lazy, '/api/private', '/_next/static/../secret', 7] })).toEqual(lazy);
  expect(await install({ version: 'release-0', assets: lazy })).toEqual(['/_next/static/studio.js']);
  expect(await install(null)).toEqual(['/_next/static/studio.js']);
  // Same version, different build (a dev server beside a production list): the shell's file is missing.
  expect(await install({ version: 'release-1', assets: lazy.slice(0, 2) })).toEqual(['/_next/static/studio.js']);
});

it('preserves worker constructor fragments when serving cached bootstrap scripts', async () => {
  const handlers = new Map<string, (event: unknown) => void>();
  const workerResponse = new Response('worker bootstrap', { headers: { 'Content-Type': 'application/javascript', 'Cross-Origin-Resource-Policy': 'same-origin' } });
  Object.defineProperty(workerResponse, 'url', { value: 'https://studio.test/_next/static/bootstrap.js' });
  const cache = { match: vi.fn(async () => workerResponse) };
  new Function('self', 'caches', 'fetch', buildServiceWorkerScript('worker-test'))(
    { location: { origin: 'https://studio.test' }, addEventListener: (type: string, handler: (event: unknown) => void) => handlers.set(type, handler) },
    { open: async () => cache }, vi.fn(async () => { throw new Error('offline'); }),
  );
  let returned!: Promise<Response>;
  handlers.get('fetch')!({ request: { url: workerResponse.url, method: 'GET', mode: 'same-origin', destination: 'worker' },
    respondWith: (response: Promise<Response>) => { returned = response; }, waitUntil: vi.fn() });
  const response = await returned;
  expect(response.url).toBe(''); // Fetch keeps the constructor URL instead of a fragmentless response URL.
  expect(response.headers.get('Content-Type')).toBe('application/javascript');
  expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
  expect(await response.text()).toBe('worker bootstrap');
});
