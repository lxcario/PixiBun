import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/diagnostics/relay/route';

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

  it('returns 503 when DIAGNOSTICS_RELAY_URL is unset (reports stay local)', async () => {
    delete process.env.DIAGNOSTICS_RELAY_URL;

    const req = new Request('http://localhost:3000/api/diagnostics/relay', {
      method: 'POST',
      body: JSON.stringify({ events: [{ id: 'diag-1', kind: 'error', message: 'test' }] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain('not configured on this server; reports stay local');
  });

  it('ignores any client-supplied endpoint in request body and only uses env-configured URL', async () => {
    process.env.DIAGNOSTICS_RELAY_URL = 'https://configured-upstream.internal/errors';
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    globalThis.fetch = mockFetch;

    // Attacker attempts SSRF to internal metadata service
    const req = new Request('http://localhost:3000/api/diagnostics/relay', {
      method: 'POST',
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

    const req = new Request('http://localhost:3000/api/diagnostics/relay', {
      method: 'POST',
      headers: {
        origin: 'https://pixibun.example.com',
        host: 'pixibun.example.com',
      },
      body: JSON.stringify({ events: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
