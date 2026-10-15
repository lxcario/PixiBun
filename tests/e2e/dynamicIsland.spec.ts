import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem('pixibun-studio-theme', 'moonlit');
    localStorage.setItem('pixibun:labs:v1', JSON.stringify({ island: true, liquidTabs: false, paletteStudio: false, quickMagic: false }));
  });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect(page.getByTestId('dynamic-island')).toBeVisible();
});

// Sample the ACTUAL rendered button through every animation frame, including
// the first frame after activation. A final screenshot would miss the drift.
async function sampleToggle(page: Page, selector: string) {
  return page.evaluate(async selector => {
    const button = document.querySelector<HTMLButtonElement>(selector)!;
    const before = button.getBoundingClientRect();
    const samples: { x: number; y: number; height: number; time: number }[] = [];
    const start = performance.now();
    button.click();
    await new Promise<void>(resolve => {
      const tick = () => {
        const box = button.getBoundingClientRect();
        const island = document.querySelector('[data-testid="dynamic-island"]')!.getBoundingClientRect();
        samples.push({ x: box.x - before.x, y: box.y - before.y, height: island.height, time: performance.now() - start });
        // Slow headless engines still need at least six actual observations.
        // This checks geometry, not a frame-rate or physical-device budget.
        if ((performance.now() - start < 900 || samples.length < 6) && performance.now() - start < 3000) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    return samples;
  }, selector);
}

test('brush expand/collapse keeps the existing text row stationary and focus usable', async ({ page }, info) => {
  const selector = '[data-island-brush-row] > button:first-child';
  await page.locator(selector).focus();
  const opening = await sampleToggle(page, selector);
  await expect(page.getByRole('group', { name: 'Brush size controls', exact: true })).toBeVisible();
  const closing = await sampleToggle(page, selector);
  await info.attach('rendered-row-samples', { body: JSON.stringify({ opening, closing }), contentType: 'application/json' });
  for (const samples of [opening, closing]) {
    expect(samples.length).toBeGreaterThan(5);
    expect(Math.max(...samples.map(sample => Math.abs(sample.x)))).toBeLessThan(0.75);
    expect(Math.max(...samples.map(sample => Math.abs(sample.y)))).toBeLessThan(0.75);
  }
  expect(Math.max(...opening.map(sample => sample.height))).toBeGreaterThan(80);
  expect(closing.at(-1)!.height).toBeCloseTo(38, 0);
  await expect(page.locator(selector)).toBeFocused();
  await expect(page.getByRole('group', { name: 'Brush size controls', exact: true })).toBeHidden();
});

test('tool panel grows below a fixed trigger and settles after rapid reversals', async ({ page }, info) => {
  await page.getByTestId('dither-tool').click();
  const button = page.getByTestId('tool-options-button');
  // This implementation keeps the previous tool mounted for its short exit.
  await expect(button).toHaveText(/Dither/);
  // Wait for the requested bloom to finish before checking fixed-row geometry.
  await expect.poll(() => page.locator('.isl-content').evaluate(el => getComputedStyle(el).filter)).toBe('none');
  await expect.poll(() => page.locator('.isl-content').evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).a)).toBe(1);
  const samples = await sampleToggle(page, '[data-testid="tool-options-button"]');
  await info.attach('expanded-trigger-samples', { body: JSON.stringify(samples), contentType: 'application/json' });
  expect(Math.max(...samples.map(sample => Math.abs(sample.x)))).toBeLessThan(0.75);
  expect(Math.max(...samples.map(sample => Math.abs(sample.y)))).toBeLessThan(0.75);
  await page.evaluate(async () => {
    const trigger = document.querySelector<HTMLButtonElement>('[data-testid="tool-options-button"]')!;
    for (let i = 0; i < 8; i++) {
      trigger.click();
      await new Promise(resolve => setTimeout(resolve, 35));
    }
  });
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => page.getByTestId('dynamic-island').getAttribute('class')).not.toContain('is-morphing');
  await page.keyboard.press('Escape');
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(() => page.getByTestId('dynamic-island').evaluate(el => el.getBoundingClientRect().height)).toBeCloseTo(38, 0);
});

test('rapid tool replacement clears blur and confines the requested bloom to uniform scale', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const tool of ['curve', 'eraser', 'bucket', 'dither', 'pen']) {
    await page.getByTestId(`${tool}-tool`).click();
    const scale = await page.locator('.isl-content').evaluate(el => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return { x: matrix.a, y: matrix.d };
    });
    // The approved trial now enters at .95 with a deliberately small bounce.
    // Keep its size bounded and uniform so glyphs never stretch or collapse.
    expect(scale.x).toBeGreaterThanOrEqual(0.949);
    expect(scale.x).toBeLessThanOrEqual(1.015);
    expect(scale.y).toBeCloseTo(scale.x, 5);
  }
  await expect.poll(() => page.locator('.isl-content').evaluate(el => ({ filter: getComputedStyle(el).filter, opacity: getComputedStyle(el).opacity }))).toEqual({ filter: 'none', opacity: '1' });
  await expect.poll(() => page.getByTestId('dynamic-island').getAttribute('class')).not.toContain('is-morphing');
  expect(errors).toEqual([]);
});

test('staged tool replacement prevents interaction with the outgoing controls', async ({ page }) => {
  const captures = await page.evaluate(async () => {
    const content = document.querySelector<HTMLElement>('.isl-content')!;
    const captures: { text: string; inert: boolean; live: number }[] = [];
    const observer = new MutationObserver(() => {
      captures.push({ text: content.textContent || '', inert: content.inert,
        live: document.querySelectorAll('.isl-content').length });
    });
    observer.observe(content, { childList: true, attributes: true, subtree: true });
    document.querySelector<HTMLButtonElement>('[data-testid="curve-tool"]')!.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    observer.disconnect();
    return captures;
  });
  expect(captures.some(capture => capture.text.includes('Pen') && capture.inert)).toBe(true);
  expect(captures.some(capture => capture.text.includes('Bézier') && !capture.inert)).toBe(true);
  for (const capture of captures) {
    expect(capture.live).toBe(1);
    if (capture.text.includes('Pen')) expect(capture.inert).toBe(true);
  }
  await expect.poll(() => page.locator('.isl-content').evaluate(el => ({ filter: getComputedStyle(el).filter, scale: new DOMMatrixReadOnly(getComputedStyle(el).transform).a }))).toEqual({ filter: 'none', scale: 1 });
});

test('rapid staged replacements activate the final tool and leave its settings usable', async ({ page }) => {
  await page.evaluate(async () => {
    for (const tool of ['curve', 'bucket', 'eraser', 'dither', 'pen', 'curve']) {
      document.querySelector<HTMLButtonElement>(`[data-testid="${tool}-tool"]`)!.click();
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  });
  const trigger = page.getByTestId('tool-options-button');
  await expect(trigger).toHaveText(/Bézier/);
  await expect(page.locator('.isl-content')).not.toHaveAttribute('inert');
  await trigger.focus();
  await trigger.press('Enter');
  await expect(page.getByRole('group', { name: /Bézier.*settings/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.getByTestId('dynamic-island').evaluate(el => el.getBoundingClientRect().height)).toBeCloseTo(38, 0);
});

test('switching closed tools never produces a spurious expansion', async ({ page }, info) => {
  const samples = await page.evaluate(async () => {
    const samples: { tool: string; height: number; time: number }[] = [];
    for (const tool of ['curve', 'eraser', 'bucket', 'dither', 'pen']) {
      document.querySelector<HTMLButtonElement>(`[data-testid="${tool}-tool"]`)!.click();
      const start = performance.now();
      await new Promise<void>(resolve => {
        const tick = () => {
          const height = document.querySelector('[data-testid="dynamic-island"]')!.getBoundingClientRect().height;
          samples.push({ tool, height, time: performance.now() - start });
          if (performance.now() - start < 400) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
    }
    return samples;
  });
  await info.attach('closed-tool-height-samples', { body: JSON.stringify(samples), contentType: 'application/json' });
  expect(Math.max(...samples.map(sample => sample.height))).toBeLessThan(38.5);
});

test('repeated activity updates reuse one bubble and release the liquid filter', async ({ page }) => {
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('pixibun:undo')));
  await expect(page.locator('.isl-bubble')).toHaveCount(1);
  await page.locator('.isl-bubble').evaluate(el => el.setAttribute('data-original-bubble', 'true'));
  for (const event of ['pixibun:redo', 'pixibun:undo', 'pixibun:redo']) {
    await page.evaluate(event => window.dispatchEvent(new CustomEvent(event)), event);
    await expect(page.locator('.isl-bubble[data-original-bubble="true"]')).toHaveCount(1);
  }
  await expect(page.getByRole('status').filter({ hasText: 'Redone' })).toBeAttached();
  await expect(page.locator('.isl-bubble')).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator('.isl-goo')).not.toHaveClass(/is-liquid/);
});

test('compact and wide layouts fit their slot and reduced motion removes blur and bounce', async ({ page }, info) => {
  for (const width of [1024, 1280, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.getByTestId('dynamic-island').evaluate(el => {
      const box = el.getBoundingClientRect();
      const slot = el.parentElement!.getBoundingClientRect();
      return box.left >= slot.left - 1 && box.right <= slot.right + 1;
    })).toBe(true);
    await page.getByRole('button', { name: /^Brush size \d+ pixels/ }).click();
    await expect(page.getByRole('group', { name: 'Brush size controls', exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`island-${width}.png`) });
    await page.keyboard.press('Escape');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByTestId('dither-tool').click();
  await page.getByTestId('tool-options-button').click();
  await expect.poll(() => page.locator('.isl-content').evaluate(el => getComputedStyle(el).filter)).toBe('none');
  const effects = await page.locator('[data-testid="dynamic-island"]').evaluate(el => ({
    filter: getComputedStyle(el.querySelector('.isl-goo')!).filter,
    panelTransition: getComputedStyle(el.querySelector('[data-island-panel]')!).transitionDuration,
    animations: el.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length,
  }));
  expect(effects.filter).toBe('none');
  expect(effects.panelTransition).toBe('0s');
  expect(effects.animations).toBe(0);
});

test('hover shortcut splits to the right without moving text and stays reachable across the gap', async ({ page }) => {
  await page.getByTestId('curve-tool').click();
  const trigger = page.getByTestId('tool-options-button');
  await expect(trigger).toHaveText(/Bézier/);
  await expect.poll(() => page.locator('.isl-content').evaluate(el => getComputedStyle(el).filter)).toBe('none');
  const before = await trigger.boundingBox();
  const [shapeSamples] = await Promise.all([
    page.evaluate(() => new Promise<{ width: number; height: number }[]>(resolve => {
      const island = document.querySelector<HTMLElement>('.isl')!;
      island.addEventListener('pointerenter', () => {
        const samples: { width: number; height: number }[] = [];
        const start = performance.now();
        const tick = () => {
          const box = island.querySelector('.isl-blob')!.getBoundingClientRect();
          samples.push({ width: box.width, height: box.height });
          if (performance.now() - start < 850) requestAnimationFrame(tick); else resolve(samples);
        }; requestAnimationFrame(tick);
      }, { once: true });
    })),
    trigger.hover(),
  ]);
  const rootWidth = await page.getByTestId('dynamic-island').evaluate(el => el.getBoundingClientRect().width);
  expect(Math.min(...shapeSamples.map(sample => sample.width))).toBeLessThan(rootWidth * 0.97);
  expect(Math.max(...shapeSamples.map(sample => sample.height))).toBeGreaterThan(38.2);
  const quick = page.getByTestId('island-quick-tool');
  await expect(quick).not.toHaveAttribute('inert');
  await expect.poll(() => quick.evaluate(el => getComputedStyle(el.querySelector('.isl-quick-face')!).opacity)).toBe('1');
  const after = await trigger.boundingBox();
  expect(Math.abs(after!.x - before!.x)).toBeLessThan(0.75);
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(0.75);
  const island = await page.getByTestId('dynamic-island').boundingBox();
  const circle = await quick.boundingBox();
  expect(circle!.x).toBeGreaterThan(island!.x + island!.width + 6);
  await page.mouse.move(island!.x + island!.width + 4, island!.y + 19);
  await expect(quick).not.toHaveAttribute('inert');
  await page.mouse.move(20, 150);
  await expect(quick).toHaveAttribute('inert');
  await trigger.hover();
  await expect(quick).not.toHaveAttribute('inert');
  await quick.hover();
  const resting = await quick.boundingBox();
  await page.mouse.down();
  const pressed = await quick.boundingBox();
  expect(Math.abs(resting!.x - pressed!.x)).toBeLessThan(0.25);
  expect(Math.abs(resting!.y - pressed!.y)).toBeLessThan(0.25);
  await page.mouse.up();
  await quick.focus();
  await quick.press('Enter');
  await page.keyboard.press('Escape');
  await expect(quick).toHaveAttribute('inert');
  await page.mouse.move(20, 150);
  await trigger.focus();
  // Re-enter focus after dismissal, just as keyboard navigation does.
  await trigger.blur();
  await trigger.focus();
  await expect(quick).not.toHaveAttribute('inert');
  await page.keyboard.press('Tab');
  await expect(quick).toBeFocused();
});

test('every tool has a working direct shortcut that keeps settings collapsed', async ({ page }) => {
  // This single case exercises 17 separate tool changes; individual assertions keep their normal timeout.
  test.setTimeout(120000);
  await page.getByTestId('tab-palette').click();
  const tools = ['b', 'c', 'e', 'g', 'Shift+g', 'd', 'r', 'Shift+r', 'm', 'q', 'w', 'l', 'j', 'u', 'o', 'k', 'i'];
  for (const [index, key] of tools.entries()) {
    await page.keyboard.press(key);
    await expect.poll(() => page.locator('.isl-content').evaluate(el => getComputedStyle(el).filter)).toBe('none');
    await page.getByTestId('dynamic-island').hover();
    const quick = page.getByTestId('island-quick-tool');
    await expect(quick).not.toHaveAttribute('inert');
    const before = await quick.getAttribute('aria-label');
    if (index === 16 || index === 6) {
      const swatches = page.locator('[data-testid="right-inspector"] span[title^="Foreground "]');
      const colorsBefore = await swatches.getAttribute('title');
      const [, primary, secondary] = colorsBefore!.match(/^Foreground (.+) · Background (.+)$/)!;
      await quick.click();
      await expect(swatches).toHaveAttribute('title', 'Foreground ' + secondary + ' · Background ' + primary);
      await quick.click();
      await expect(swatches).toHaveAttribute('title', colorsBefore!);
    } else {
      await quick.click();
      await expect(quick).not.toHaveAttribute('aria-label', before!);
    }
    await expect.poll(() => page.getByTestId('dynamic-island').evaluate(el => el.getBoundingClientRect().height)).toBeCloseTo(38, 0);
    await expect(page.locator('.isl [data-island-panel]:visible')).toHaveCount(0);
  }
});

test('Clean corners appears only inside expanded Pen and Bézier controls', async ({ page }) => {
  for (const tool of ['pen', 'curve']) {
    await page.getByTestId(tool + '-tool').click();
    await expect.poll(() => page.locator('.isl-content').evaluate(el => getComputedStyle(el).filter)).toBe('none');
    await expect(page.locator('.isl-content').getByText('Clean corners', { exact: true })).toBeHidden();
    if (tool === 'curve') await page.getByTestId('tool-options-button').click();
    await page.locator('.isl-content').getByRole('button', { name: /^Brush size/ }).click();
    const panel = page.getByRole('group', { name: 'Brush size controls', exact: true });
    const clean = panel.getByRole('checkbox', { name: 'Clean corners', exact: true });
    await expect(clean).toBeVisible();
    const checked = await clean.isChecked();
    await clean.click();
    await expect(clean).toBeChecked({ checked: !checked });
    await page.keyboard.press('Escape');
    await expect(page.locator('.isl-content').getByText('Clean corners', { exact: true })).toBeHidden();
  }
});
