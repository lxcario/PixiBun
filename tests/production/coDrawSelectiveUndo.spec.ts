import type { Page } from '@playwright/test';
import { expect, test } from '../helpers/peerTest';
import { installPeerDiagnostics, retainPeerDiagnostics } from '../helpers/peerDiagnostics';

// Audit v1.14.1 defect 3: Undo restored the whole pre-stroke layer and broadcast it,
// erasing a partner's later pixels on both peers.

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));

async function start(page: Page, name: string, position: number) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.getByRole('button', { name: /^Rename project / }).click();
  await page.locator('input:focus').fill(name);
  await page.locator('input:focus').press('Enter');
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * position, box.y + box.height * position);
  await expect.poll(async () => (await pixels(page)).some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
}

async function openCoDraw(page: Page) {
  await page.getByRole('button', { name: 'Studio options', exact: true }).click();
  await page.getByRole('button', { name: 'Co-Draw session', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Peer-to-Peer Co-Draw' })).toBeVisible();
}

async function stroke(page: Page, from: [number, number], to: [number, number]) {
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1]);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], { steps: 24 });
  await page.mouse.up();
}

const pixelAt = (data: number[], i: number) => data.slice(i * 4, i * 4 + 4).join(',');

test('Undo during co-draw takes back only your own pixels, on both peers', async ({ peerHost: host, page: guest }, testInfo) => {
  try {
    await installPeerDiagnostics(host, guest);
    await host.goto('/studio');
    test.skip(!await host.evaluate(() => typeof RTCPeerConnection === 'function'), 'This browser runtime has no WebRTC.');
    await start(host, 'Host canvas', 0.9);
    await start(guest, 'Guest canvas', 0.1);

    await openCoDraw(host);
    await host.getByRole('button', { name: 'Generate Invite Code' }).click();
    const invite = host.getByRole('textbox', { name: 'Generated invite code' });
    await expect(invite).not.toHaveValue('');
    await openCoDraw(guest);
    await guest.getByRole('button', { name: 'Join Session', exact: true }).click();
    await guest.getByRole('textbox', { name: 'Host invite code input' }).fill(await invite.inputValue());
    await guest.getByRole('button', { name: 'Save My Drawing & Join Separately' }).click();
    const answer = guest.getByRole('textbox', { name: 'Generated answer token' });
    await expect(answer).not.toHaveValue('');
    await host.getByRole('textbox', { name: 'Peer answer token input' }).fill(await answer.inputValue());
    await host.getByRole('button', { name: 'Connect', exact: true }).click();
    await expect(guest.getByText('Status: Connected', { exact: true })).toBeVisible();
    await host.getByRole('button', { name: 'Close', exact: true }).click();
    await guest.getByRole('button', { name: 'Close', exact: true }).click();
    const base = await pixels(host);
    await expect.poll(() => pixels(guest)).toEqual(base);

    // Host: a horizontal stroke. Guest: a vertical stroke across it, in its other color.
    await stroke(host, [0.15, 0.5], [0.85, 0.5]);
    const afterHost = await pixels(host);
    await expect.poll(() => pixels(guest)).toEqual(afterHost);
    await guest.getByTestId('main-composite-canvas').hover();
    await guest.keyboard.press('x');
    await stroke(guest, [0.5, 0.15], [0.5, 0.85]);
    const afterGuest = await pixels(guest);
    await expect.poll(() => pixels(host)).toEqual(afterGuest);

    const pixelCount = base.length / 4;
    const guestPixels: number[] = [];
    const hostOnlyPixels: number[] = [];
    for (let i = 0; i < pixelCount; i++) {
      if (pixelAt(afterGuest, i) !== pixelAt(afterHost, i)) guestPixels.push(i);
      else if (pixelAt(afterHost, i) !== pixelAt(base, i)) hostOnlyPixels.push(i);
    }
    expect(guestPixels.length).toBeGreaterThan(5);
    expect(hostOnlyPixels.length).toBeGreaterThan(5);

    // Host undoes its stroke.
    await host.getByTestId('undo-button').click();
    await expect.poll(async () => { const h = await pixels(host); return hostOnlyPixels.every(i => pixelAt(h, i) === pixelAt(base, i)); }).toBe(true);
    for (const peer of [host, guest]) {
      await expect.poll(async () => {
        const now = await pixels(peer);
        return guestPixels.filter(i => pixelAt(now, i) !== pixelAt(afterGuest, i)).length;
      }, { message: 'guest pixels must survive the host Undo' }).toBe(0);
    }
    await expect.poll(() => pixels(guest)).toEqual(await pixels(host));
  } finally { await retainPeerDiagnostics(testInfo, host, guest); }
});
