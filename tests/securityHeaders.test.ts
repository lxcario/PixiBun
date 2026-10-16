import { describe, expect, it, vi } from 'vitest';
import nextConfig from '../next.config';
import { buildCspHeader } from '@/proxy';

describe('security headers', () => {
  it('limits form submission, framing, plugins and base URLs in the page policy', () => {
    const policy = buildCspHeader('abc');
    for (const directive of ["form-action 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "script-src 'self' 'nonce-abc'"]) {
      expect(policy).toContain(directive);
    }
  });
  it('allows eval only for the development server', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(buildCspHeader('abc')).not.toContain('unsafe-eval');
    vi.stubEnv('NODE_ENV', 'development');
    expect(buildCspHeader('abc')).toContain("'unsafe-eval'");
    vi.unstubAllEnvs();
  });
  it('isolates every response from other origins', async () => {
    const rules = await nextConfig.headers!();
    const all = rules.find(rule => rule.source === '/(.*)')!.headers;
    const value = (key: string) => all.find(header => header.key === key)?.value;
    expect(value('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(value('Cross-Origin-Resource-Policy')).toBe('same-origin');
    expect(value('X-Frame-Options')).toBe('DENY');
    expect(value('X-Content-Type-Options')).toBe('nosniff');
  });
});
