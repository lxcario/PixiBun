import { NextResponse } from 'next/server';
import { createTokenBucketStore } from '@/lib/server/tokenBucket';
import { APP_VERSION } from '@/config/version';

/**
 * Diagnostics Relay Endpoint Threat Model & Security Boundaries:
 *
 * 1. Origin Validation & Cross-Site Request Forgery (CSRF):
 *    - Diagnostic events are transmitted via POST. The handler validates the incoming `Origin`
 *      header against the request `Host` / `X-Forwarded-Host` header. Requests from untrusted
 *      foreign origins are rejected with HTTP 403 to prevent cross-site quota exhaustion.
 *
 * 2. Trusted Reverse Proxy Assumptions & Client IP Identity:
 *    - Client identity is determined by `clientKey()` inspecting `X-Forwarded-For` and `X-Real-IP`.
 *    - In production deployments (e.g. Vercel, Cloudflare, AWS ALB), an operator-trusted edge
 *      reverse proxy must sanitize or prepend the client IP. In raw, direct Internet-facing Node.js
 *      deployments without an edge proxy, an adversary could spoof `X-Forwarded-For` headers to
 *      circumvent per-IP limits or cause denial-of-service against third-party IP addresses.
 *
 * 3. In-Memory Token Bucket Limits & Multi-Instance Serverless Scaling:
 *    - Rate limiting (`capacity: 12, refillPerMinute: 12`) uses an in-memory token bucket store.
 *    - State is local to the active Node.js / serverless worker process. In distributed or multi-instance
 *      deployments, each container enforces its own rate limit independently; aggregate cluster
 *      throughput scales to (N_instances * 12 req/min) rather than a single global ceiling. Global
 *      rate limiting would require an external distributed store (e.g. Redis/Upstash).
 *
 * 4. Payload Streaming Ceilings & DoS Mitigation:
 *    - Streaming chunk reader enforces `MAX_BODY_BYTES = 64 KB` before buffering the entire payload,
 *      preventing out-of-memory crashes from decompression or allocation bombs (CWE-400 / CWE-770).
 *    - Events array is bounded to `MAX_EVENTS = 100`.
 *    - Upstream URL is read exclusively from server environment (`DIAGNOSTICS_RELAY_URL`), strictly
 *      enforcing HTTPS and ignoring any client-supplied endpoints to prevent SSRF.
 *    - Server-side fetch enforces a 5-second timeout (`AbortSignal.timeout(5000)`) preventing resource leaks.
 */

// Hard input ceilings: the relay accepts only small, bounded diagnostic
// batches. Streaming the body with an early byte ceiling prevents memory exhaustion, and an
// unbounded events array would let a single client flood the upstream.
const MAX_BODY_BYTES = 64 * 1024;
const MAX_EVENTS = 100;

// Token-bucket rate limiting, keyed by client IP.
const relayLimiter = createTokenBucketStore({ capacity: 12, refillPerMinute: 12 });

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function isValidOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // Same-origin or non-browser client without Origin header

  const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
  if (!host) return true;

  try {
    const originUrl = new URL(origin);
    const hostName = host.split(':')[0];
    return (
      originUrl.hostname === hostName ||
      originUrl.hostname === 'localhost' ||
      originUrl.hostname === '127.0.0.1'
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isValidOrigin(request)) {
    return NextResponse.json(
      { error: 'Forbidden cross-origin diagnostics request.' },
      { status: 403 }
    );
  }

  if (!relayLimiter.take(clientKey(request))) {
    relayLimiter.prune();
    return NextResponse.json(
      { error: 'Too many diagnostic reports. Try again later.' },
      { status: 429 }
    );
  }
  relayLimiter.prune();

  try {
    const targetUrl = process.env.DIAGNOSTICS_RELAY_URL;

    if (!targetUrl || typeof targetUrl !== 'string') {
      return NextResponse.json(
        { error: 'Diagnostics relay is not configured on this server; reports stay local.' },
        { status: 503 }
      );
    }

    // Enforce HTTPS-only protocol for server-configured upstream
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
      if (parsedUrl.protocol !== 'https:') {
        return NextResponse.json(
          { error: 'Diagnostics relay upstream must use HTTPS' },
          { status: 503 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Diagnostics relay upstream URL is malformed' },
        { status: 503 }
      );
    }

    // Stream the body and enforce the size ceiling BEFORE buffering the full payload.
    let body: Record<string, unknown> | null = null;
    try {
      const reader = request.body?.getReader();
      if (!reader) {
        return NextResponse.json(
          { error: 'Missing request body' },
          { status: 400 }
        );
      }
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_BODY_BYTES) {
          reader.cancel();
          return NextResponse.json(
            { error: 'Diagnostic payload exceeds the size limit.' },
            { status: 413 }
          );
        }
        chunks.push(value);
      }
      const rawBody = new TextDecoder().decode(
        chunks.length === 1
          ? chunks[0]
          : chunks.reduce((acc, c) => {
              const merged = new Uint8Array(acc.byteLength + c.byteLength);
              merged.set(acc);
              merged.set(c, acc.byteLength);
              return merged;
            }, new Uint8Array(0))
      );
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch (parseErr) {
      console.error('Failed to parse diagnostics relay request JSON:', parseErr);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }
    const { events, app, version } = (body as { events?: unknown[]; app?: string; version?: string }) || {};

    const upstreamPayload = {
      app: app || 'pixibun',
      version: version || process.env.npm_package_version || APP_VERSION,
      timestamp: Date.now(),
      events: Array.isArray(events) ? events.slice(0, MAX_EVENTS) : [],
    };

    const upstreamResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(upstreamPayload),
      // 5 second timeout to avoid hanging serverless functions
      signal: AbortSignal.timeout(5000),
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: 'Upstream relay returned an error' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    // Avoid echoing internal error details to prevent information disclosure
    return NextResponse.json(
      { error: 'Relay forward failed' },
      { status: 500 }
    );
  }
}
