import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/diagnostics/relay/route';

describe('POST /api/diagnostics/relay (same-origin proxy)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects request with 400 if no endpoint is provided or configured', async () => {
    const req = new Request('http://localhost:3000/api/diagnostics/relay', {
      method: 'POST',
      body: JSON.stringify({ events: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('No valid relay endpoint');
  });

  it('rejects invalid or unsafe URL protocol with 400', async () => {
    const req = new Request('http://localhost:3000/api/diagnostics/relay', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'javascript:alert(1)', events: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('forwards diagnostic events to upstream endpoint and returns success', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    globalThis.fetch = mockFetch;

    const req = new Request('http://localhost:3000/api/diagnostics/relay', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: 'https://relay.example.com/api/errors',
        app: 'pixibun',
        version: '1.0.0',
        events: [{ id: 'diag-1', kind: 'error', message: 'test' }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://relay.example.com/api/errors',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });
});
