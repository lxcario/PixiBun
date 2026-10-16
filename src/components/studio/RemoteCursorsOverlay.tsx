'use client';

import React, { useEffect, useState } from 'react';
import { coDrawBridge, CURSOR_STALE_MS } from '@/lib/sync/coDrawBridge';
import { studioEvents } from '@/lib/events/studioEvents';
import type { RemoteCursor } from '@/lib/sync/p2pSync';

/**
 * Renders remote peers' cursors over the canvas stage. Coordinates arrive in
 * canvas space and are scaled by the current zoom (stage shows
 * canvasWidth * zoom / 100 CSS pixels). Cursor updates arrive over the lossy
 * presence channel at ~30fps; a short linear transition smooths jitter
 * without masking intentional movement.
 */
export const RemoteCursorsOverlay = React.memo(function RemoteCursorsOverlay({ zoom }: { zoom: number }) {
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);

  useEffect(() => {
    const sync = () => setCursors(coDrawBridge.getActiveCursors(CURSOR_STALE_MS));
    sync();
    const unsub = studioEvents.on('pixibun:remote-cursors', sync);
    const pruneTimer = typeof window !== 'undefined' ? window.setInterval(sync, 1000) : null;
    return () => {
      unsub();
      if (pruneTimer !== null) window.clearInterval(pruneTimer);
    };
  }, []);

  if (cursors.length === 0) return null;

  const scale = zoom / 100;

  return (
    <div className="absolute inset-0 pointer-events-none z-30" aria-hidden="true">
      {cursors.map((cursor) => (
        <div
          key={cursor.peerId}
          className="absolute will-change-transform"
          style={{
            left: `${cursor.x * scale}px`,
            top: `${cursor.y * scale}px`,
            transition: 'left 60ms linear, top 60ms linear',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))' }}
          >
            <path
              d="M4 2 L20 12 L12 13 L8 20 Z"
              fill={cursor.color}
              stroke="#140d1f"
              strokeWidth="1.5"
            />
          </svg>
          <span
            className="absolute left-3.5 top-3 px-1 py-0.5 text-[9px] font-mono font-bold rounded-[2px] whitespace-nowrap"
            style={{ backgroundColor: cursor.color, color: '#140d1f' }}
          >
            {cursor.name}
          </span>
        </div>
      ))}
    </div>
  );
});