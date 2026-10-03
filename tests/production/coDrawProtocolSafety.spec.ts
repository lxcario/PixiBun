import { expect, test, type Page } from '@playwright/test';

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
async function coDraw(page: Page) {
  await page.getByRole('button', { name: 'Studio options', exact: true }).click();
  await page.getByRole('button', { name: 'Co-Draw session', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Peer-to-Peer Co-Draw' })).toBeVisible();
}
type CapturedWindow = Window & { phase4Channels: RTCDataChannel[]; phase4Replies: string[] };

for (const fault of ['unsafe clock', 'unserializable layer name'] as const) {
  test(`compiled LAN receiver rejects ${fault} without acknowledging or replacing artwork`, async ({ browser, page }, testInfo) => {
    const hostContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: { width: 1600, height: 1000 } });
    const host = await hostContext.newPage();
    try {
      // Observe real host-created channels; application source exposes no test transport handle.
      await host.addInitScript(() => {
        if (typeof RTCPeerConnection !== 'function') return;
        const original = RTCPeerConnection.prototype.createDataChannel;
        const target = window as unknown as CapturedWindow;
        target.phase4Channels = []; target.phase4Replies = [];
        RTCPeerConnection.prototype.createDataChannel = function (...args) {
          const channel = original.apply(this, args);
          target.phase4Channels.push(channel);
          channel.addEventListener('message', event => target.phase4Replies.push(event.data));
          return channel;
        };
      });
      await host.goto('/studio');
      test.skip(!await host.evaluate(() => typeof RTCPeerConnection === 'function'), 'This runtime lacks WebRTC; malformed peer transport cannot be exercised here.');
      await expect(host.locator('[data-restoration-phase="active"]')).toBeVisible();
      const box = (await host.getByTestId('main-composite-canvas').boundingBox())!;
      await host.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
      await expect.poll(async () => (await pixels(host)).some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
      const shared = await pixels(host);
      await page.setViewportSize({ width: 1600, height: 1000 });
      await page.goto('/studio');
      await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
      await coDraw(host);
      await host.getByRole('button', { name: 'Generate Invite Code' }).click();
      const invite = host.getByRole('textbox', { name: 'Generated invite code' });
      await expect(invite).not.toHaveValue('');
      await coDraw(page);
      await page.getByRole('button', { name: 'Join Session', exact: true }).click();
      await page.getByRole('textbox', { name: 'Host invite code input' }).fill(await invite.inputValue());
      await page.getByRole('button', { name: 'Save My Drawing & Join Separately' }).click();
      const answer = page.getByRole('textbox', { name: 'Generated answer token' });
      await expect(answer).not.toHaveValue('');
      await host.getByRole('textbox', { name: 'Peer answer token input' }).fill(await answer.inputValue());
      await host.getByRole('button', { name: 'Connect', exact: true }).click();
      await expect(page.getByText('Status: Connected', { exact: true })).toBeVisible();
      await expect.poll(() => pixels(page)).toEqual(shared);
      await host.evaluate(fault => {
        const target = window as unknown as CapturedWindow;
        target.phase4Replies = [];
        const timestamp = Date.now();
        const packet = fault === 'unsafe clock'
          ? { type: 'PIXEL_OPS', layerId: 'unknown-layer', ops: [{ x: 0, y: 0, r: 255, g: 0, b: 0, a: 255,
            timestamp, hlc: [timestamp, 2 ** 53], peerId: 'fault-probe' }] }
          : { type: 'STRUCTURE_SYNC', frames: { width: 32, height: 32, frames: [{ id: 'fault-frame', durationMs: 100,
            layers: [{ id: 'fault-layer', name: 'x'.repeat(200), visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] }] } };
        target.phase4Channels.find(channel => channel.label === 'pixibun-crdt-sync')!.send(JSON.stringify({
          ...packet, peerId: 'fault-probe', deliveryId: 777_777,
        }));
      }, fault);
      await expect(page.getByText('Co-draw rejected invalid artwork data. Reconnect with compatible PixiBun versions.', { exact: true })).toBeVisible();
      await expect(page.getByText('Status: Not connected', { exact: true })).toBeVisible();
      expect(await pixels(page)).toEqual(shared);
      expect(await host.evaluate(() => (window as unknown as CapturedWindow).phase4Replies.some(raw => {
        const message = JSON.parse(raw); return message.type === 'ACK' && message.deliveryId === 777_777;
      }))).toBe(false);
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByTestId('save-button').click();
      await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toHaveText('Changes saved');
      await page.reload();
      await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Rename project Shared Drawing', exact: true })).toBeVisible();
      await expect.poll(() => pixels(page)).toEqual(shared);
    } finally { await hostContext.close(); }
  });
}
