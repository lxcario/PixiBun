import type { NextConfig } from "next";

// Content Security Policy is issued per-request by src/proxy.ts (Next.js 16
// proxy file convention): nonce-based script-src in production, 'unsafe-eval'
// strictly for development (Turbopack HMR). Style-src keeps 'unsafe-inline'
// per the original implementation plan. Static security headers live here;
// the CSP must NOT be duplicated here or the two policies intersect and block
// nonce'd hydration scripts.

import { getBuildVersion } from './scripts/getBuildVersion.mjs';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    // Service worker cache bucket version — build-time injected into
    // src/app/sw.js/route.ts. Use a release override or the actual deployment commit.
    SW_CACHE_VERSION: getBuildVersion(),
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/offline.html',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  experimental: {
    // Turbopack optimized options
  },
};

export default nextConfig;
