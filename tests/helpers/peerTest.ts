import { test as base, type BrowserContext, type BrowserContextOptions, type Page, type TestInfo } from '@playwright/test';

async function closePeerContext(context: BrowserContext, info: TestInfo) {
  const startedAt = performance.now();
  let failure: string | undefined;
  try {
    await context.close();
  } catch (error) {
    failure = String(error);
    throw error;
  } finally {
    await info.attach('peer-host-cleanup', {
      body: Buffer.from(JSON.stringify({ phase: 'fixture-teardown', durationMs: performance.now() - startedAt, failure })),
      contentType: 'application/json',
    });
  }
}

/** Own the extra peer context through the runner's normal fixture lifecycle. */
export const test = base.extend<{ peerHost: Page; peerContextOptions: BrowserContextOptions }>({
  peerContextOptions: [{}, { option: true }],
  peerHost: async ({ browser, baseURL, peerContextOptions }, provide, info) => {
    const context = await browser.newContext({ ...peerContextOptions, baseURL });
    try {
      await provide(await context.newPage());
    } finally {
      await closePeerContext(context, info);
    }
  },
});

export { expect } from '@playwright/test';
