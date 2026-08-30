import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint, events, app, version } = body || {};

    const targetUrl = endpoint || process.env.DIAGNOSTICS_RELAY_URL;

    if (!targetUrl || typeof targetUrl !== 'string') {
      return NextResponse.json(
        { error: 'No valid relay endpoint provided or configured' },
        { status: 400 }
      );
    }

    // Basic URL validation to prevent SSRF against invalid schemes
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return NextResponse.json(
          { error: 'Invalid URL protocol' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Malformed relay URL' },
        { status: 400 }
      );
    }

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
        { error: `Upstream relay returned status ${upstreamResponse.status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: 'Relay forward failed', detail: String(err) },
      { status: 500 }
    );
  }
}
