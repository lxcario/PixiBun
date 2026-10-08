import {expect,test} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
test('motion preview advances when worker results take longer than a cel duration', async ({ page }) => {
  await page.addInitScript(() => {
    const diag: unknown[] = []; (window as Window & {motionDiag:unknown[]}).motionDiag=diag;
    window.addEventListener('pixibun:motion-preview-status', (event)=>diag.push({at:performance.now(),status:(event as CustomEvent).detail}));
    setInterval(()=>diag.push({at:performance.now(),busy:document.querySelector('[data-testid="piximotion-preview-canvas"]')?.getAttribute('aria-busy'),pose:document.querySelector('[data-testid="piximotion-panel"]')?.textContent?.match(/Pose \d+ \/ \d+/)?.[0],value:document.querySelector<HTMLInputElement>('[aria-label="Position X pixels"]')?.value}),100);
    const NativeWorker = window.Worker;
    window.Worker = new Proxy(NativeWorker, { construct(Target, args) {
      const worker = Reflect.construct(Target, args) as Worker;
      return new Proxy(worker, { get(target, key) { const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; },
        set(target, key, value) { return Reflect.set(target, key, key === 'onmessage' && typeof value === 'function' ? (event: MessageEvent) => {
          if (typeof event.data?.result?.destX === 'number') {diag.push({at:performance.now(),result:event.data.id,destX:event.data.result.destX}); setTimeout(() => value.call(target, event), 400);} else value.call(target, event);
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
  await page.getByTestId('piximotion-panel').getByRole('button', { name: 'Pause', exact: true }).click(); await expect(preview).toHaveAttribute('aria-busy', 'false');
  const paused = await signature(); await page.getByRole('button', { name: 'Play Loop', exact: true }).click(); await expect.poll(signature, { timeout: 4000 }).not.toBe(paused);
  await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click(); await expect(preview).toHaveCount(0);
});

test.afterEach(async({page},info)=>{await writeFile(info.outputPath('motion-diag.json'),JSON.stringify(await page.evaluate(()=>(window as Window & {motionDiag:unknown[]}).motionDiag),null,2));});
