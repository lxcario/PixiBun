import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/diagnostics/relay/route';
import { APP_VERSION } from '@/config/version';
let client = 0;
const event = { id: 'test', kind: 'error', message: 'Failure', timestamp: 1, route: '/studio', appVersion: 'older-client' };
const request = (body: unknown) => new Request('https://pixibun.test/api/diagnostics/relay', {
  method: 'POST', headers: { origin: 'https://pixibun.test', 'x-forwarded-for': `test-${++client}` }, body: JSON.stringify(body),
});
beforeEach(() => { vi.stubEnv('DIAGNOSTICS_RELAY_URL', 'https://relay.test/errors');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it.each([null, {}, { version: {}, events: [] }, { app: 7, events: [] },
  { events: [{ ...event, kind: 'arbitrary' }] }, { events: [{ ...event, message: {} }] },
  { events: [{ ...event, timestamp: 1.5 }] }, { events: [{ ...event, detail: 'x'.repeat(2063) }] },
  { events: Array(101).fill(event) }])('rejects malformed batches before forwarding: %j', async body => {
  expect((await POST(request(body))).status).toBe(400); expect(fetch).not.toHaveBeenCalled();
});
it('preserves reported client versions, separately identifies the server, and refuses redirects', async () => {
  expect((await POST(request({ version: 'older-client', events: [{ ...event, extra: { untrusted: true } }] }))).status).toBe(200);
  const options = vi.mocked(fetch).mock.calls[0][1]!;
  expect(options.redirect).toBe('error');
  expect(JSON.parse(options.body as string)).toMatchObject({ version: 'older-client', serverVersion: APP_VERSION, events: [event] });
  expect(JSON.parse(options.body as string).events[0]).not.toHaveProperty('extra');
});
