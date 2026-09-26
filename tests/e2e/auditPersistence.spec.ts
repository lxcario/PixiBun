import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test('drawing survives an explicit save and a fresh-page IndexedDB restore', async ({ page }) => {
  await page.goto('/studio');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  const pixels = () => canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data));
  await expect.poll(async () => (await pixels()).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  const before = await pixels();
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  await expect(page.getByText(/Saved .* to browser storage/)).toBeVisible();
  await page.reload();
  await expect(canvas).toBeVisible();
  await expect.poll(pixels).toEqual(before);
});

test('palette edits autosave and invalid cycle ranges never enter the project', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  const result = await page.evaluate(() => {
    const store = (window as Window & {
      __studioStore?: { getState: () => {
        currentPaletteId: string;
        editRevision: number;
        palettes: Array<{ id: string; colors: string[]; cycleTracks?: unknown[] }>;
        addPaletteCycleTrack: (id: string, track: object) => void;
        addCustomColorToPalette: (id: string, color: string) => void;
      } };
    }).__studioStore!;
    const state = store.getState();
    const palette = state.palettes.find((entry) => entry.id === state.currentPaletteId)!;
    const priorTracks = palette.cycleTracks?.length ?? 0;
    const priorRevision = state.editRevision;
    state.addPaletteCycleTrack(palette.id, {
      id: 'invalid-browser-cycle', low: 0, high: palette.colors.length,
      rate: 4, direction: 'forward', blendShift: false, enabled: true,
    });
    const rejected = (store.getState().palettes.find((entry) => entry.id === palette.id)?.cycleTracks?.length ?? 0) === priorTracks
      && store.getState().editRevision === priorRevision;
    state.addCustomColorToPalette(palette.id, '#123ABC');
    return { rejected, paletteId: palette.id };
  });
  expect(result.rejected).toBe(true);
  await expect.poll(() => page.evaluate(() =>
    !(window as Window & { __studioStore?: { getState: () => { isDirty: boolean } } }).__studioStore!.getState().isDirty),
  { timeout: 15000 }).toBe(true);
  await page.reload();
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  await expect.poll(() => page.evaluate((paletteId) => {
    const store = (window as Window & {
      __studioStore?: { getState: () => { palettes: Array<{ id: string; colors: string[] }> } };
    }).__studioStore!;
    return store.getState().palettes.find((palette) => palette.id === paletteId)?.colors.includes('#123ABC') ?? false;
  }, result.paletteId)).toBe(true);
});

test('frame deletion keeps clip metadata valid across save and reload', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  const before = await page.evaluate(() => {
    const store = (window as Window & { __studioStore?: { getState: () => {
      addFrame: () => void;
      addClip: (name: string, from: number, to: number, color: string) => void;
      deleteFrame: (index: number) => void;
      setProjectName: (name: string) => void;
      frames: unknown[];
      clips: Array<{ name: string; fromFrame: number; toFrame: number }>;
      projectName: string;
      editRevision: number;
    } } }).__studioStore!;
    store.getState().addFrame();
    store.getState().addFrame();
    store.getState().addClip('Export range', 1, 2, '#F0BE7C');
    store.getState().deleteFrame(0);
    const revision = store.getState().editRevision;
    const name = store.getState().projectName;
    store.getState().setProjectName('x'.repeat(257));
    return {
      frames: store.getState().frames.length,
      clip: store.getState().clips.find((entry) => entry.name === 'Export range'),
      rejectedName: store.getState().projectName === name && store.getState().editRevision === revision,
    };
  });
  expect(before).toMatchObject({ frames: 2, clip: { fromFrame: 0, toFrame: 1 }, rejectedName: true });
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  await expect.poll(() => page.evaluate(() =>
    !(window as Window & { __studioStore?: { getState: () => { isDirty: boolean } } }).__studioStore!.getState().isDirty,
  )).toBe(true);
  await page.reload();
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => {
      frames: unknown[];
      clips: Array<{ name: string; fromFrame: number; toFrame: number }>;
    } } }).__studioStore?.getState();
    return state?.frames.length === 2 && state.clips.some((clip) =>
      clip.name === 'Export range' && clip.fromFrame === 0 && clip.toFrame === 1);
  })).toBe(true);
});

test('header image picker decodes a real PNG and opens import controls', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 4;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 4, 4);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'red.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('red.png', { exact: false }).first()).toBeVisible();
});

test('a multi-frame, multi-layer project restores its layer PNG bytes after import', async ({ page }) => {
  await page.addInitScript(() => {
    // Exercise the browser download path without opening a native save dialog.
    Object.defineProperty(window, 'showSaveFilePicker', { value: undefined });
  });
  await page.goto('/studio');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data)
      .some((value, index) => index % 4 === 3 && value > 0))).toBe(true);
  await page.evaluate(() => {
    const store = (window as Window & { __studioStore?: { getState: () => {
      addLayer: (name: string) => void;
      addFrame: () => void;
      addClip: (name: string, start: number, end: number) => void;
      setFrameDuration: (index: number, durationMs: number) => void;
      setActiveFrame: (index: number) => void;
    } } }).__studioStore!;
    store.getState().addLayer('Overlay');
    store.getState().addFrame();
    store.getState().setFrameDuration(1, 240);
    store.getState().addClip('Two-frame proof', 0, 1);
  });
  await page.mouse.click(box!.x + box!.width * 0.7, box!.y + box!.height * 0.7);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => {
    setActiveFrame: (index: number) => void;
  } } }).__studioStore!.getState().setActiveFrame(0));
  const before = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data));

  const downloadProject = async () => {
    await page.getByTestId('export-button').click();
    await page.getByTestId('export-tab-project').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download PROJECT' }).click(),
    ]);
    return fs.readFile(await download.path());
  };
  const first = JSON.parse((await downloadProject()).toString('utf8'));
  expect(first.frames).toHaveLength(2);
  expect(first.frames.every((frame: { layers: unknown[] }) => frame.layers.length === 2)).toBe(true);
  expect(first.frames[1].durationMs).toBe(240);
  expect(first.clips.some((clip: { name: string; startFrame: number; endFrame: number }) =>
    clip.name === 'Two-frame proof' && clip.startFrame === 0 && clip.endFrame === 1)).toBe(true);
  expect(first.frames[0].layers.some((layer: { pngBase64: string }) => layer.pngBase64)).toBe(true);

  await page.getByTestId('new-drawing-button').click();
  await page.getByRole('button', { name: 'Start New Drawing' }).click();
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data)
      .some((value, index) => index % 4 === 3 && value > 0))).toBe(false);

  await page.locator('input[type=file][accept*=".pixibun"]').setInputFiles({
    name: 'roundtrip.pixibun',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(first)),
  });
  await expect(page.getByRole('dialog', { name: 'Import Project (.pixibun)' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm Import' }).click();
  await expect(page.getByRole('dialog', { name: 'Import Project (.pixibun)' })).toBeHidden();
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data))).toEqual(before);

  const second = JSON.parse((await downloadProject()).toString('utf8'));
  expect(second.frames.map((frame: { layers: { pngBase64: string }[] }) =>
    frame.layers.map((layer) => layer.pngBase64))).toEqual(
      first.frames.map((frame: { layers: { pngBase64: string }[] }) =>
        frame.layers.map((layer) => layer.pngBase64)));
  expect(second.palettes).toEqual(first.palettes);
  expect(second.clips).toEqual(first.clips);
});

test('pattern generation starts and receives a heavy-compute worker response', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const tracking = { started: 0, responses: 0, url: '', errors: [] as string[], responseTypes: [] as string[] };
    Object.assign(window, { __workerTracking: tracking });
    window.Worker = class extends NativeWorker {
      constructor(scriptURL: string | URL, options?: WorkerOptions) {
        super(scriptURL, options);
        tracking.started++;
        tracking.url = String(scriptURL);
        this.addEventListener('message', (event: MessageEvent<{ type: string }>) => {
          tracking.responses++;
          tracking.responseTypes.push(event.data.type);
        });
        this.addEventListener('error', (event) => tracking.errors.push(event.message));
      }
    };
  });
  await page.goto('/studio');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.getByTestId('tab-ai').click();
  await page.getByRole('button', { name: 'Tiles & Patterns' }).click();
  await page.getByRole('button', { name: 'Seamless Patterns & Tilesets' }).click();
  await page.getByRole('button', { name: 'Generate Seamless Pattern (WFC)' }).click();
  await expect.poll(() => page.evaluate(() =>
    (window as unknown as { __workerTracking: { started: number } }).__workerTracking.started)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() =>
    (window as unknown as { __workerTracking: { responses: number } }).__workerTracking.responses),
  { timeout: 30000 }).toBeGreaterThan(0);
  expect(await page.evaluate(() =>
    (window as unknown as { __workerTracking: { url: string; errors: string[]; responseTypes: string[] } }).__workerTracking))
    .toMatchObject({ errors: [], responseTypes: expect.arrayContaining(['wfc:done']), url: expect.stringContaining('/_next/static/chunks/') });
});
