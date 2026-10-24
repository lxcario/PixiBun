import { expect, test, type Page } from '@playwright/test';
import type { StudioState } from '../../src/stores/studioStore';

type StudioWindow = Window & { __studioStore: { getState(): StudioState } };
type EncodingWindow = StudioWindow & { __releaseEncoding?: () => void };

const artwork = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));

async function paint(page: Page, x: number, y: number) {
  const before = await artwork(page);
  const box = await page.getByTestId('main-composite-canvas').boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width * x, box!.y + box!.height * y);
  await expect.poll(() => artwork(page)).not.toEqual(before);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/studio');
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as Partial<StudioWindow>).__studioStore))).toBe(true);
});

test('drawing during a delayed native PNG encoding survives save and reload', async ({ page }) => {
  await paint(page, 0.35, 0.35);
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    let held = false;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      if (held) return original.call(this, callback, type, quality);
      held = true;
      original.call(this, blob => {
        (window as unknown as EncodingWindow).__releaseEncoding = () => callback(blob);
      }, type, quality);
    };
  });
  await page.getByTestId('save-button').click();
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as EncodingWindow).__releaseEncoding))).toBe(true);
  await paint(page, 0.65, 0.65);
  const expected = await artwork(page);
  await page.evaluate(() => (window as unknown as EncodingWindow).__releaseEncoding!());
  await expect.poll(() => page.evaluate(() => !(window as unknown as StudioWindow).__studioStore.getState().isDirty)).toBe(true);
  await page.reload();
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  await expect.poll(() => artwork(page)).toEqual(expected);
});

for (const scenario of [
  { name: 'translucent lower and upper layers', lowerVisible: true, upperVisible: true, lowerOpacity: 0.5, upperOpacity: 0.5 },
  { name: 'a visible upper layer over a hidden lower layer', lowerVisible: false, upperVisible: true, lowerOpacity: 0.5, upperOpacity: 1 },
  { name: 'a hidden upper layer over a translucent lower layer', lowerVisible: true, upperVisible: false, lowerOpacity: 0.5, upperOpacity: 1 },
]) {
  test(`merge and undo preserve real canvas pixels for ${scenario.name}`, async ({ page }) => {
    await page.evaluate(() => (window as unknown as StudioWindow).__studioStore.getState().setPrimaryColor('#ff0000'));
    await paint(page, 0.4, 0.4);
    const lowerId = await page.evaluate(() => {
      const state = (window as unknown as StudioWindow).__studioStore.getState();
      const id = state.activeLayerId;
      state.addLayer('Upper artwork');
      state.setPrimaryColor('#0000ff');
      return id;
    });
    await paint(page, 0.4, 0.4);
    await page.evaluate(({ lowerId, scenario }) => {
      const state = (window as unknown as StudioWindow).__studioStore.getState();
      state.setLayerOpacity(lowerId, scenario.lowerOpacity);
      state.setLayerOpacity(state.activeLayerId, scenario.upperOpacity);
      if (!scenario.lowerVisible) state.toggleLayerVisibility(lowerId);
      if (!scenario.upperVisible) state.toggleLayerVisibility(state.activeLayerId);
    }, { lowerId, scenario });
    // Flush React's composite render before taking the reference pixels.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const before = await artwork(page);
    await page.evaluate(() => {
      const state = (window as unknown as StudioWindow).__studioStore.getState();
      state.mergeLayerDown(state.activeLayerId);
    });
    const layerCount = () => page.evaluate(() => (window as unknown as StudioWindow).__studioStore.getState().frames[0].layers.length);
    if (!scenario.lowerVisible || !scenario.upperVisible) {
      // Audit defect 6 (14 October): Merge Down refuses a hidden layer rather than discard its pixels.
      await expect(page.getByTestId('studio-toast')).toContainText('before merging, so its pixels are kept');
      expect(await layerCount()).toBe(2);
      expect(await artwork(page)).toEqual(before);
      return;
    }
    await expect.poll(layerCount).toBe(1);
    await expect.poll(() => artwork(page)).toEqual(before);
    await page.keyboard.press('Control+z');
    await expect.poll(layerCount).toBe(2);
    await expect.poll(() => artwork(page)).toEqual(before);
    await page.keyboard.press('Control+Shift+z');
    await expect.poll(layerCount).toBe(1);
    await expect.poll(() => artwork(page)).toEqual(before);
  });
}

test('refused backdrop-dependent blending leaves pixels and the layer tree intact', async ({ page }) => {
  await paint(page, 0.4, 0.4);
  await page.evaluate(() => {
    const state = (window as unknown as StudioWindow).__studioStore.getState();
    state.addLayer('Multiply artwork');
    state.setPrimaryColor('#ff0000');
  });
  await paint(page, 0.6, 0.6);
  await page.evaluate(() => {
    const state = (window as unknown as StudioWindow).__studioStore.getState();
    state.setLayerBlendMode(state.activeLayerId, 'multiply');
  });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const before = await artwork(page);
  const revision = await page.evaluate(() => (window as unknown as StudioWindow).__studioStore.getState().editRevision);
  await page.evaluate(() => {
    const state = (window as unknown as StudioWindow).__studioStore.getState();
    state.mergeLayerDown(state.activeLayerId);
  });
  await expect(page.getByText('Merge down requires Normal blending on both visible layers to preserve their appearance.')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as StudioWindow).__studioStore.getState().frames[0].layers.length)).toBe(2);
  expect(await page.evaluate(() => (window as unknown as StudioWindow).__studioStore.getState().editRevision)).toBe(revision);
  expect(await artwork(page)).toEqual(before);
});

test('frame deletion undo and redo restore clips before saving and reloading', async ({ page }) => {
  await paint(page, 0.3, 0.3);
  await expect(page.getByRole('button', { name: 'Undo last action', exact: true })).toBeEnabled();
  const expected = await page.evaluate(() => {
    const store = (window as unknown as StudioWindow).__studioStore;
    store.getState().addFrame();
    store.getState().addClip('Second-frame hold', 1, 1, '#ffffff');
    const clips = structuredClone(store.getState().clips);
    const activeClipId = store.getState().activeClipId;
    store.getState().deleteFrame(1);
    return { clips, activeClipId };
  });
  await page.keyboard.press('Control+z');
  await expect.poll(() => page.evaluate(() => (window as unknown as StudioWindow).__studioStore.getState().clips)).toEqual(expected.clips);
  expect(await page.evaluate(() => (window as unknown as StudioWindow).__studioStore.getState().activeClipId)).toBe(expected.activeClipId);
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(() => page.evaluate(() => (window as unknown as StudioWindow).__studioStore.getState().frames.length)).toBe(1);
  await page.keyboard.press('Control+z');
  await page.getByTestId('save-button').click();
  await expect.poll(() => page.evaluate(() => !(window as unknown as StudioWindow).__studioStore.getState().isDirty)).toBe(true);
  await page.reload();
  await expect.poll(() => page.evaluate(() => (window as unknown as StudioWindow).__studioStore?.getState().clips)).toEqual(expected.clips);
});

test('drawing after clip selection changes the selected frame only', async ({ page }) => {
  await page.evaluate(() => {
    const store = (window as unknown as StudioWindow).__studioStore;
    store.getState().addFrame();
    store.getState().addClip('First frame', 0, 0);
    const clip = store.getState().clips.find(c => c.name === 'First frame')!;
    store.getState().setActiveClipId(clip.id);
  });
  await paint(page, 0.5, 0.5);
  const first = await artwork(page);
  await page.evaluate(() => (window as unknown as StudioWindow).__studioStore.getState().setActiveFrame(1));
  await expect.poll(async () => (await artwork(page)).every((value, index) => index % 4 !== 3 || value === 0)).toBe(true);
  await page.evaluate(() => (window as unknown as StudioWindow).__studioStore.getState().setActiveFrame(0));
  await expect.poll(() => artwork(page)).toEqual(first);
});
