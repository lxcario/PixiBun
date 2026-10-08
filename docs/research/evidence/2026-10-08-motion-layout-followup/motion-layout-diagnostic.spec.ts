import { expect, test } from '@playwright/test';
test('motion preview advances when worker results take longer than a cel duration', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = new Proxy(NativeWorker, { construct(Target, args) {
      const worker = Reflect.construct(Target, args) as Worker;
      return new Proxy(worker, { get(target, key) { const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; },
        set(target, key, value) { return Reflect.set(target, key, key === 'onmessage' && typeof value === 'function' ? (event: MessageEvent) => {
          if (typeof event.data?.result?.destX === 'number') setTimeout(() => value.call(target, event), 400); else value.call(target, event);
        } : value, target); } });
    } });
  });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio?template=hearth-ghost');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click();
  const end = page.getByRole('spinbutton', { name: 'Position X pixels', exact: true }); await end.fill('4'); await end.press('Enter');
  const preview = page.getByTestId('piximotion-preview-canvas'); await expect(preview).toHaveAttribute('aria-busy', 'false');
  const signature = () => preview.evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data).join(','));
  const first = await signature(); await page.getByRole('button', { name: 'Play Loop', exact: true }).click();
  await expect.poll(signature, { timeout: 4000 }).not.toBe(first);
  await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click(); await expect(preview).toHaveCount(0);
});
