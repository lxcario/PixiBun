'use client';

import { useState, useEffect } from 'react';
import { coDrawBridge, CoDrawRole } from '@/lib/sync/coDrawBridge';
import { studioEvents } from '@/lib/events/studioEvents';
import type { P2PConnectionState } from '@/lib/sync/p2pSync';

export interface CoDrawStatus {
  connectionState: P2PConnectionState;
  role: CoDrawRole | null;
  isCoDrawActive: boolean;
  isHost: boolean;
  isGuest: boolean;
}

export function useCoDrawStatus(): CoDrawStatus {
  const [status, setStatus] = useState<CoDrawStatus>(() => {
    const conn = coDrawBridge.getConnectionState();
    const r = coDrawBridge.getRole();
    return {
      connectionState: conn,
      role: r,
      isCoDrawActive: conn === 'connected',
      isHost: conn === 'connected' && r === 'host',
      isGuest: conn === 'connected' && r === 'guest',
    };
  });

  useEffect(() => {
    const sync = () => {
      const conn = coDrawBridge.getConnectionState();
      const r = coDrawBridge.getRole();
      setStatus({
        connectionState: conn,
        role: r,
        isCoDrawActive: conn === 'connected',
        isHost: conn === 'connected' && r === 'host',
        isGuest: conn === 'connected' && r === 'guest',
      });
    };

    sync();
    const unsub = studioEvents.on('pixibun:codraw-state', sync);
    return unsub;
  }, []);

  return status;
}
