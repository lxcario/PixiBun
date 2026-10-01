import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { importGameDeliveryFixture } from '../helpers/gameDeliveryFixture';
import { artwork, viewPixels, openResearch, openResearchOptions, preview, selectResearchWorkflow, verifyDetailWorkflow, verifyLightWorkflow, verifySceneWorkflow, verifyResearchKeyboardWorkflow, verifyOutlinedArtworkWorkflow } from '../helpers/researchWorkflows';

test('outlined artwork keeps its fill and supports directional lighting without a Normal layer', async ({ page }, info) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await verifyOutlinedArtworkWorkflow(page, async name => { await page.getByTestId('right-inspector').screenshot({ path: info.outputPath(name) }); });
});

test('research simplification preserves marked native pixels and saved source provenance', async ({ page }) => { await verifyDetailWorkflow(page); });
test('shared light previews all poses and applies and restores the entire rig', async ({ page }) => { await verifyLightWorkflow(page); });
test('scene rules reject contradictions and reproduce pinned walkable scenes after reload', async ({ page }) => { await verifySceneWorkflow(page); });
test('research controls and native previews fit and remain accessible', async ({ page }, info) => {
  await importGameDeliveryFixture(page); await openResearch(page); await page.setViewportSize({ width: 1024, height: 768 });
  for (const kind of ['pixelize', 'light', 'scene']) {
    await selectResearchWorkflow(page, kind); await preview(page);
    if (kind === 'scene') {
      await page.getByText('About this result', { exact: true }).click();
      await expect(page.getByText('No path required; this scene may have blocked or disconnected cells.', { exact: true })).toBeVisible();
    }
    expect(await page.getByTestId('right-inspector').evaluate(e => e.scrollWidth > e.clientWidth + 1)).toBe(false);
    expect((await new AxeBuilder({ page }).include('[data-testid="right-inspector"]').analyze()).violations).toEqual([]);
  }
  await page.getByRole('button', { name: 'Apply research preview' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('research-workbench-1024.png'), fullPage: true });
});

test('workflow tabs, scene selection and stale-preview recovery work from the keyboard', async ({ page }) => {
  await verifyResearchKeyboardWorkflow(page);
});

test('real artwork previews update without applying changes and keep equal-size controls in a narrow inspector', async ({ page }, info) => {
  await importGameDeliveryFixture(page, false, { unrelatedPalette: true }); await page.setViewportSize({ width: 1024, height: 768 }); await openResearch(page);
  const before = await artwork(page);
  const dimensions = async (names: string[]) => Promise.all(names.map(name => page.getByRole('button', { name, exact: true }).boundingBox()));
  const equallySized = (boxes: Awaited<ReturnType<typeof dimensions>>) => {
    for (const box of boxes) { expect(box).not.toBeNull(); expect(Math.abs(box!.width - boxes[0]!.width)).toBeLessThan(1); expect(Math.abs(box!.height - boxes[0]!.height)).toBeLessThan(1); }
  };
  for (const kind of ['pixelize', 'light', 'scene']) {
    await selectResearchWorkflow(page, kind);
    expect(await page.getByText('More options', { exact: true }).evaluate(e => (e.parentElement as HTMLDetailsElement).open)).toBe(false);
    await expect(page.getByTestId('research-comparison')).toBeVisible();
    if (kind === 'pixelize') await expect(page.getByRole('button', { name: 'Apply research preview' })).toBeDisabled();
    else await expect(page.getByRole('button', { name: 'Apply research preview' })).toBeEnabled();
    await expect(page.getByLabel('Research preview scale', { exact: true })).toHaveValue('0');
    expect(await viewPixels(page, 'Research source')).toEqual(before);
    const first = await viewPixels(page, 'Research result');
    if (kind === 'pixelize') {
      expect(first).toEqual(before);
      await page.getByRole('tab', { name: 'Simplify', exact: true }).scrollIntoViewIfNeeded();
      await page.getByTestId('right-inspector').screenshot({ path: info.outputPath('original-no-change.png') });
      equallySized(await dimensions(['Original', '2px', '4px', '8px']));
      await page.getByRole('button', { name: '4px', exact: true }).click();
      equallySized(await dimensions(['Blend', 'Strongest', 'Sample']));
      await expect(page.getByRole('checkbox', { name: 'Keep outlines', exact: true })).toBeChecked();
      await page.getByRole('checkbox', { name: 'Keep outlines', exact: true }).uncheck();
    } else if (kind === 'light') {
      await expect(page.getByLabel('Shared light azimuth', { exact: true })).not.toBeVisible();
      const compass = await dimensions(['Light from top left', 'Light from top', 'Light from top right', 'Light from left', 'Light from right', 'Light from bottom left', 'Light from bottom', 'Light from bottom right']);
      equallySized(compass);
      expect(Math.abs(compass[0]!.width - compass[0]!.height)).toBeLessThan(1);
      expect(compass[0]!.y).toBe(compass[2]!.y); expect(compass[0]!.x).toBe(compass[5]!.x);
      expect(compass[2]!.x).toBe(compass[7]!.x);
      expect(Math.abs((compass[0]!.x + compass[2]!.x) / 2 - compass[1]!.x)).toBeLessThan(1);
      equallySized(await dimensions(['Cloth', 'Metal', 'Skin', 'Glow'])); equallySized(await dimensions(['This frame', 'Whole clip']));
      await page.getByRole('button', { name: 'Light from right', exact: true }).click();
    } else {
      equallySized(await dimensions(['Any', 'Across', 'Down'])); await page.getByRole('button', { name: 'Shuffle layout' }).click();
    }
    await expect.poll(() => viewPixels(page, 'Research result')).not.toEqual(first);
    if (kind === 'pixelize') {
      const result = await viewPixels(page, 'Research result');
      for (let i = 0; i < result.length; i += 4) { expect(result[i + 1]).toBeLessThanOrEqual(20); expect(result[i + 2]).toBe(0); expect(result[i + 3]).toBe(before[i + 3]); }
      await openResearchOptions(page);
      await page.getByRole('combobox', { name: 'Allowed palette role' }).selectOption('all');
      await expect.poll(async () => (await viewPixels(page, 'Research result')).some((byte, i) => i % 4 === 2 && byte > 0)).toBe(true);
      await expect(page.getByText('Palette remapping is on: unprotected colors will change.', { exact: true })).toBeVisible();
      await page.getByRole('combobox', { name: 'Allowed palette role' }).selectOption('source');
      await expect.poll(async () => (await viewPixels(page, 'Research result')).filter((_, i) => i % 4 === 2).every(byte => byte === 0)).toBe(true);
      await page.getByText('More options', { exact: true }).click();
    }
    expect(await artwork(page)).toEqual(before);
    await expect(page.getByRole('button', { name: 'Create research preview', exact: true })).toBeVisible();
    expect(await page.getByTestId('right-inspector').evaluate(e => e.scrollWidth > e.clientWidth + 1)).toBe(false);
    await page.getByRole('tab', { name: { pixelize: 'Simplify', light: 'Light', scene: 'Tiles' }[kind], exact: true }).scrollIntoViewIfNeeded();
    const action = await page.getByRole('button', { name: 'Create research preview', exact: true }).boundingBox();
    const inspector = (await page.getByTestId('right-inspector').boundingBox())!;
    expect(action!.y + action!.height).toBeLessThanOrEqual(inspector.y + inspector.height);
    await page.getByTestId('right-inspector').screenshot({ path: info.outputPath(`beginner-${kind}.png`) });
  }
});

test('corner artwork fits in both panes and optional magnification preserves exact scale and accessible edges', async ({ page }, info) => {
  await importGameDeliveryFixture(page, false, { previewOffset: true });
  await openResearch(page); await page.setViewportSize({ width: 1024, height: 768 }); await preview(page);
  const image = page.getByRole('img', { name: 'Research source', exact: true });
  const viewport = page.getByRole('region', { name: 'Research source pixel view' });
  await openResearchOptions(page);
  await expect(page.getByRole('combobox', { name: 'Research preview scale' })).toHaveValue('0');
  expect(await viewport.evaluate(e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)).toBe(false);
  const fitted = await viewport.getByTestId('research-fit-content').boundingBox();
  const imageBox = (await image.boundingBox())!;
  // Native content is at (96,112). Fit moves that occupied rectangle into view without changing its pixels.
  expect(Math.abs(imageBox.x + imageBox.width * 96 / 128 - fitted!.x)).toBeLessThan(1);
  expect(Math.abs(imageBox.y + imageBox.height * 112 / 128 - fitted!.y)).toBeLessThan(1);
  await page.getByRole('tab', { name: 'Simplify', exact: true }).scrollIntoViewIfNeeded();
  await page.getByTestId('right-inspector').screenshot({ path: info.outputPath('corner-artwork-fit.png') });
  await page.getByRole('combobox', { name: 'Research preview scale' }).selectOption('4');
  await expect.poll(() => image.evaluate(e => Math.round(e.getBoundingClientRect().width))).toBe(512);
  const geometry = await viewport.evaluate(e => {
    e.scrollLeft = 0; const box = e.getBoundingClientRect(), canvas = e.querySelector('canvas')!.getBoundingClientRect();
    return { left: canvas.left - box.left, client: e.clientWidth, scroll: e.scrollWidth };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0); expect(geometry.scroll).toBeGreaterThan(geometry.client);
  await viewport.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(() => viewport.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
  const right = await viewport.evaluate(e => { e.scrollLeft = e.scrollWidth; return e.querySelector('canvas')!.getBoundingClientRect().right - e.getBoundingClientRect().right; });
  expect(right).toBeLessThanOrEqual(1);
  expect(await page.getByTestId('right-inspector').evaluate(e => e.scrollWidth > e.clientWidth + 1)).toBe(false);
});

for (const studioTheme of ['atelier', 'cozy-classic']) for (const colorScheme of ['dark', 'light']) {
  test(`${studioTheme} ${colorScheme}: research previews and game-kit warnings remain readable`, async ({ page }, info) => {
    test.setTimeout(60_000);
    await importGameDeliveryFixture(page, true); await openResearch(page);
    await page.evaluate(({ studioTheme, colorScheme }) => {
      const root = document.documentElement; root.dataset.studioTheme = studioTheme; root.dataset.colorScheme = colorScheme;
      root.dataset.theme = colorScheme; root.classList.toggle('light', colorScheme === 'light'); root.classList.toggle('dark', colorScheme === 'dark'); root.style.colorScheme = colorScheme;
    }, { studioTheme, colorScheme });
    for (const kind of ['pixelize', 'light', 'scene']) {
      await selectResearchWorkflow(page, kind);
      expect((await new AxeBuilder({ page }).include('[data-testid="right-inspector"]').analyze()).violations).toEqual([]);
      await preview(page);
      expect((await new AxeBuilder({ page }).include('[data-testid="right-inspector"]').analyze()).violations).toEqual([]);
    }
    await page.getByRole('tab', { name: 'Tiles', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`research-${studioTheme}-${colorScheme}.png`), fullPage: true });
    await page.getByTestId('export-button').click(); const dialog = page.getByRole('dialog');
    await dialog.getByTestId('export-tab-godot-kit').click();
    await dialog.getByRole('checkbox', { name: 'Include indexed palette and runtime cycling' }).check();
    await expect(dialog.getByText(/duplicate color value/)).toBeVisible();
    await dialog.getByText(/duplicate color value/).scrollIntoViewIfNeeded();
    expect((await new AxeBuilder({ page }).include('dialog').analyze()).violations).toEqual([]);
    await page.screenshot({ path: info.outputPath(`game-kit-${studioTheme}-${colorScheme}.png`), fullPage: true });
  });
}
