import { NextRequest, NextResponse } from 'next/server';

/**
 * Nonce-based Content Security Policy (Phase 32 / Security Hardening).
 *
 * Next.js 16 replaced the `middleware.ts` file convention with `proxy.ts`.
 * Per the bundled guide (node_modules/next/dist/docs/01-app/02-guides/
 * content-security-policy.md), the proxy issues a fresh per-request nonce,
 * forwards it to the renderer via the request CSP header (so Next.js injects
 * the nonce into its bootstrap <script> tags), and returns it to the browser.
 *
 * Fidelity notes:
 * - 'unsafe-inline' is allowed for styles ONLY (next/font injects inline
 *   <style> tags); production script-src drops 'unsafe-inline' entirely.
 * - 'unsafe-eval' remains strictly development-only for Turbopack HMR.
 * - 'strict-dynamic' is deliberately NOT used: it would demote 'self', breaking
 *   /theme.js (beforeInteractive <Script src>), /sw.js registration, and
 *   static chunk loading. Nonce + 'self' drops 'unsafe-inline' without those
 *   regressions.
 * - Nonces require dynamic rendering; the root layout reads `headers()`,
 *   which opts every route into dynamic rendering.
 */

const buildCspHeader = (nonce: string): string => {
  const isDev = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
};

const generateNonce = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
};

export function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const contentSecurityPolicyHeaderValue = buildCspHeader(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);

  return response;
}

export const config = {
  matcher: [
    /*
     * Page routes only — never invoke the proxy for static assets
     * (/_next/*, /icons/*, /assets/*), API routes, or the service worker:
     * they need no nonce and proxy invocation costs latency.
     * The `missing` conditions skip client-side prefetch requests.
     */
    {
      source: '/((?!api|_next|favicon.ico|sw.js|icons|assets|manifest.webmanifest|offline.html|theme.js).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};