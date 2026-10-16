import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/diagnostics/relay/route';

// What a browser on the same origin sends with PixiBun's own relay request.
const browserHeaders = { origin: 'http://localhost:3000', 'content-type': 'application/json' };

describe('POST /api/diagnostics/relay (SSRF guard & proxy)', () => {
  const originalEnv = process.env.DIAGNOSTICS_RELAY_URL;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEnv !== undefined) {
      process.env.DIAGNOSTICS_RELAY_URL = originalEnv;
    } else {
      delete process.env.DIAGNOSTICS_RELAY_URL;
    }
  });

  it('returns 503 without forwarding when DIAGNOSTICS_RELAY_URL is unset', async () => {
    delete process.env.DIAGNOSTICS_RELAY_URL;
    const forward = vi.fn();
    globalThis.fetch = forward;

    const req = new Request('http://localhost:3000/api/diagnostics/relay', {
      method: 'POST',
      headers: browserHeaders,
      body: JSON.stringify({ events: [{ id: 'diag-1', kind: 'error', message: 'test' }] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain('not configured on this server; no reports were forwarded');
    expect(forward).not.toHaveBeenCalled();
  });

  it('ignores any client-supplied endpoint in request body and only uses env-configured URL', async () => {
    process.env.DIAGNOSTICS_RELAY_URL = 'https://configured-upstream.internal/errors';
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    globalThis.fetch = mockFetch;

    // Attacker attempts SSRF to internal metadata service
    const req = new Request('http://localhost:3000/api/diagnostics/relay', {
      method: 'POST',
      headers: browserHeaders,
      body: JSON.stringify({
        endpoint: 'http://169.254.169.254/latest/meta-data',
        events: [{ id: 'diag-attack', kind: 'error', message: 'ssrf attempt' }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // Verified: target is strictly the operator-configured upstream, NOT the client endpoint
    expect(mockFetch).toHaveBeenCalledWith(
      'https://configured-upstream.internal/errors',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('forwards diagnostic events to configured HTTPS upstream successfully', async () => {
    process.env.DIAGNOSTICS_RELAY_URL = 'https://relay.example.com/api/errors';
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    globalThis.fetch = mockFetch;

    const req = new Request('http://localhost:3000/api/diagnostics/relay', {
      method: 'POST',
      headers: browserHeaders,
      body: JSON.stringify({
        app: 'pixibun',
        version: '1.0.0',
        events: [{ id: 'diag-1', kind: 'error', message: 'test event' }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://relay.example.com/api/errors',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('returns 503 when configured URL is not HTTPS', async () => {
    process.env.DIAGNOSTICS_RELAY_URL = 'http://insecure-upstream.example.com/errors';

    const req = new Request('http://localhost:3000/api/diagnostics/relay', {
      method: 'POST',
      headers: browserHeaders,
      body: JSON.stringify({ events: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain('must use HTTPS');
  });

  it('rejects cross-origin request from untrusted origin with 403', async () => {
    process.env.DIAGNOSTICS_RELAY_URL = 'https://relay.example.com/api/errors';

    const req = new Request('http://localhost:3000/api/diagnostics/relay', {
      method: 'POST',
      headers: {
        origin: 'https://malicious-site.attacker.com',
        host: 'pixibun.example.com',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ events: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Forbidden cross-origin diagnostics request');
  });

  it('accepts request with matching origin', async () => {
    process.env.DIAGNOSTICS_RELAY_URL = 'https://relay.example.com/api/errors';
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    globalThis.fetch = mockFetch;

    const req = new Request('https://pixibun.example.com/api/diagnostics/relay', {
      method: 'POST',
      headers: {
        origin: 'https://pixibun.example.com',
        host: 'pixibun.example.com',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ events: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it.each(['http://localhost:3000', 'https://pixibun.example.com:444', 'http://pixibun.example.com'])(
    'rejects a different origin even when host headers claim the production host: %s', async (origin) => {
      const req = new Request('https://pixibun.example.com/api/diagnostics/relay', {
        method: 'POST',
        headers: { origin, host: 'pixibun.example.com' },
        body: JSON.stringify({ events: [] }),
      });
      expect((await POST(req)).status).toBe(403);
    }
  );

  it.each([
    ['no Origin', { 'content-type': 'application/json' }, 403],
    ['a text body', { origin: 'http://localhost:3000', 'content-type': 'text/plain' }, 415],
    ['no content type', { origin: 'http://localhost:3000' }, 415],
  ])('refuses a request with %s before spending quota or forwarding', async (_name, headers, status) => {
    process.env.DIAGNOSTICS_RELAY_URL = 'https://upstream.example.com/collect';
    const forward = vi.fn(); globalThis.fetch = forward;
    const req = new Request('http://localhost:3000/api/diagnostics/relay', { method: 'POST', headers, body: JSON.stringify({ events: [] }) });
    expect((await POST(req)).status).toBe(status);
    expect(forward).not.toHaveBeenCalled();
  });

  it('limits by the edge address, not a client-chosen first forwarded entry', async () => {
    process.env.DIAGNOSTICS_RELAY_URL = 'https://upstream.example.com/collect';
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const send = (forwarded: string) => POST(new Request('http://localhost:3000/api/diagnostics/relay', {
      method: 'POST', headers: { ...browserHeaders, 'x-forwarded-for': forwarded }, body: JSON.stringify({ events: [] }),
    }));
    const statuses: number[] = [];
    // Twelve tokens per client: rotating the spoofed first entry must not mint more.
    for (let i = 0; i < 13; i++) statuses.push((await send(`198.51.100.${i}, 203.0.113.77`)).status);
    expect(statuses.slice(0, 12).every(status => status === 200)).toBe(true);
    expect(statuses[12]).toBe(429);
  });
});
