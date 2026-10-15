import { expect, test } from '@playwright/test';

type Sample = { rasterMs: number; nextFrameMs?: number };
type Probe = { x: number; y: number; down?: number; samples: Sample[]; armed: boolean };
type ProbeWindow = Window & { drawingProbe: Probe };

for (const size of [128, 512]) {
  test(`records bounded event-to-raster observations on a ${size} square canvas`, async ({ page, browserName }, info) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(() => {
      const probe: Probe = { x: 0, y: 0, armed: false, samples: [] };
      (window as unknown as ProbeWindow).drawingProbe = probe;
      document.addEventListener('pointerdown', event => {
        if (probe.armed && (event.target as Element).closest('#center-canvas-area')) probe.down = performance.now();
      }, true);
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: [CanvasImageSource, ...number[]]) {
        Reflect.apply(draw, this, args);
        const now = performance.now();
        if (!probe.armed || probe.down === undefined || this.canvas.dataset.testid !== 'main-composite-canvas') return;
        if (this.getImageData(probe.x, probe.y, 1, 1).data[3] === 0) return;
        const sample: Sample = { rasterMs: now - probe.down };
        const down = probe.down; probe.samples.push(sample); probe.down = undefined; probe.armed = false;
        requestAnimationFrame(() => { sample.nextFrameMs = performance.now() - down; });
      };
    });
    await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
    await page.getByTestId('file-menu-button').click(); await page.getByTestId('resize-canvas-button').click();
    const modal = page.getByRole('dialog', { name: 'Resize Canvas & Frame Bounds' });
    await modal.getByRole('spinbutton').first().fill(String(size));
    await modal.getByRole('button', { name: 'Apply Resize', exact: true }).click();
    const canvas = page.getByTestId('main-composite-canvas'); await expect(canvas).toHaveAttribute('width', String(size));
    await page.getByRole('button', { name: 'Fit Canvas to Viewport (Ctrl+0)', exact: true }).click();
    const box = (await canvas.boundingBox())!;
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(size * 0.3) + i * 2, y = Math.floor(size * 0.4);
      await page.evaluate(({ x, y }) => Object.assign((window as unknown as ProbeWindow).drawingProbe, { x, y, armed: true, down: undefined }), { x, y });
      await page.mouse.click(box.x + (x + 0.5) * box.width / size, box.y + (y + 0.5) * box.height / size);
      await expect.poll(() => page.evaluate(() => (window as unknown as ProbeWindow).drawingProbe.samples.filter(s => s.nextFrameMs !== undefined).length)).toBe(i + 1);
    }
    const samples = await page.evaluate(() => (window as unknown as ProbeWindow).drawingProbe.samples.slice(2));
    const values = (key: keyof Sample) => samples.map(s => s[key]!).sort((a, b) => a - b);
    const percentile = (key: keyof Sample, p: number) => values(key)[Math.ceil(samples.length * p) - 1];
    const result = { scope: 'Synthetic pointerdown capture to canvas raster and next animation-frame callback; not physical input, compositor presentation or a latency budget', browserName, size, warmup: 2, samples, medianRasterMs: percentile('rasterMs', 0.5), p90RasterMs: percentile('rasterMs', 0.9), p90NextFrameMs: percentile('nextFrameMs', 0.9) };
    await info.attach('drawing-response.json', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
    console.warn(`Drawing response ${JSON.stringify(result)}`);
  });
}
