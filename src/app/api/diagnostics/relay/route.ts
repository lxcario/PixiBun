import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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

    const body = await request.json().catch(() => ({}));
    const { events, app, version } = body || {};

    const upstreamPayload = {
      app: app || 'pixibun',
      version: version || '1.0.0',
      timestamp: Date.now(),
      events: Array.isArray(events) ? events : [],
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
