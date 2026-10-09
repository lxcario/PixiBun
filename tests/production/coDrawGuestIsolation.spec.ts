import { expect, test, type Page } from '@playwright/test';
import { installPeerDiagnostics, retainPeerDiagnostics } from '../helpers/peerDiagnostics';

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
async function drawing(page: Page, name: string, position: number) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.getByRole('button', { name: /^Rename project / }).click();
  await page.locator('input:focus').fill(name);
  await page.locator('input:focus').press('Enter');
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * position, box.y + box.height * position);
  await expect.poll(async () => (await pixels(page)).some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
  return pixels(page);
}
async function coDraw(page: Page) {
  await page.getByRole('button', { name: 'Studio options', exact: true }).click();
  await page.getByRole('button', { name: 'Co-Draw session', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Peer-to-Peer Co-Draw' })).toBeVisible();
}
async function gallery(page: Page) {
  await page.getByTestId('file-menu-button').click();
  await page.getByRole('menuitem', { name: 'Projects', exact: true }).click();
  return page.getByRole('dialog', { name: 'Atelier Projects & Gallery' });
}

test('compiled LAN guest reloads the shared copy and reopens its untouched original from Gallery', async ({ browser, page }, testInfo) => {
  const hostContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
  const host = await hostContext.newPage();
  try {
    await installPeerDiagnostics(host, page);
    await host.goto('/studio');
    test.skip(!await host.evaluate(() => typeof RTCPeerConnection === 'function'),
      'This browser runtime has no WebRTC; live pairing cannot be qualified here. See the separate guest-refusal scenario.');
    const hostArt = await drawing(host, 'Host artwork', 0.7);
    const originalArt = await drawing(page, 'Guest original', 0.3);
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
    await expect.poll(() => pixels(page)).toEqual(hostArt);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByTestId('save-button').click();
    await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toHaveText('Changes saved');
    await page.reload();
    await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rename project Shared Drawing', exact: true })).toBeVisible();
    await expect.poll(() => pixels(page)).toEqual(hostArt);
    const projects = await gallery(page);
    await expect(projects.getByRole('button', { name: 'Open project Shared Drawing', exact: true })).toBeVisible();
    await projects.getByRole('button', { name: 'Open project Guest original', exact: true }).click();
    await expect(projects).not.toBeVisible();
    await expect.poll(() => pixels(page)).toEqual(originalArt);
    await page.screenshot({ path: testInfo.outputPath('original-reopened.png'), fullPage: true });
  } finally { await retainPeerDiagnostics(testInfo, host, page); await hostContext.close(); }
});

test('compiled browser without WebRTC refuses a valid guest invite and preserves original artwork', async ({ page }) => {
  await page.goto('/studio');
  test.skip(await page.evaluate(() => typeof RTCPeerConnection === 'function'), 'This scenario requires a runtime without WebRTC.');
  const original = await drawing(page, 'Original without WebRTC', 0.4);
  const invite = Buffer.from(JSON.stringify({
    version: 1, peerId: 'test-host', sdp: { type: 'offer', sdp: 'v=0\r\n' }, candidates: [],
  })).toString('base64');
  await coDraw(page);
  await page.getByRole('button', { name: 'Join Session', exact: true }).click();
  await page.getByRole('textbox', { name: 'Host invite code input' }).fill(invite);
  await page.getByRole('button', { name: 'Save My Drawing & Join Separately' }).click();
  await expect(page.getByText('WebRTC RTCPeerConnection is not supported in this environment.', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Generated answer token' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rename project Original without WebRTC', exact: true })).toBeVisible();
  expect(await pixels(page)).toEqual(original);
  await page.getByTestId('undo-button').click();
  await expect.poll(() => pixels(page)).not.toEqual(original);
});

test('compiled invalid invite preserves the original drawing and its Undo history', async ({ page }) => {
  const original = await drawing(page, 'Original after failure', 0.4);
  await coDraw(page);
  await page.getByRole('button', { name: 'Join Session', exact: true }).click();
  await page.getByRole('textbox', { name: 'Host invite code input' }).fill('invalid-invite');
  await page.getByRole('button', { name: 'Save My Drawing & Join Separately' }).click();
  await expect(page.getByText(/invalid.*(token|format)|not valid/i)).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rename project Original after failure', exact: true })).toBeVisible();
  expect(await pixels(page)).toEqual(original);
  await page.getByTestId('undo-button').click();
  await expect.poll(() => pixels(page)).not.toEqual(original);
});
