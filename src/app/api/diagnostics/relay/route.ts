import { NextResponse } from 'next/server';
import { createTokenBucketStore } from '@/lib/server/tokenBucket';

// Hard input ceilings: the relay accepts only small, bounded diagnostic
// batches. An unbounded request.json() is a memory-exhaustion vector, and an
// unbounded events array would let a single client flood the upstream.
const MAX_BODY_BYTES = 64 * 1024;
const MAX_EVENTS = 100;

// Token-bucket rate limiting, keyed by client IP (OWASP REST Cheat Sheet:
// rate limiting as baseline protection for public API endpoints). Per-process
// memory: correct for a single Node instance; a per-instance limit on
// multi-instance deployments.
const relayLimiter = createTokenBucketStore({ capacity: 12, refillPerMinute: 12 });

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(request: Request) {
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

    // Read as text first so the size ceiling is enforced BEFORE parsing.
    let body: Record<string, unknown> | null = null;
    try {
      const rawBody = await request.text();
      if (rawBody.length > MAX_BODY_BYTES) {
        return NextResponse.json(
          { error: 'Diagnostic payload exceeds the size limit.' },
          { status: 413 }
        );
      }
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
      version: version || '1.12.0',
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
