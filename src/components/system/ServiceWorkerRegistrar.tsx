'use client';

import React, { useEffect, useState } from 'react';
import { PwaUpdateToast } from './PwaUpdateToast';
import { captureDiagnostic } from '@/lib/diagnostics/capture';

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    window.location.protocol === 'file:'
  ) {
    return Promise.resolve(null);
  }

  return navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      return registration;
    })
    .catch((err) => {
      captureDiagnostic({
        kind: 'error',
        message: 'ServiceWorker registration failed',
        detail: String(err),
      });
      return null;
    });
}

export function ServiceWorkerRegistrar() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    registerServiceWorker().then((reg) => {
      if (!reg) return;

      // Check if a worker is already waiting
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setShowToast(true);
      }

      // Listen for new worker installation
      reg.addEventListener('updatefound', () => {
        const installingWorker = reg.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (
            installingWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            setWaitingWorker(installingWorker);
            setShowToast(true);
          }
        });
      });
    });

    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const handleDismiss = () => {
    setShowToast(false);
  };

  if (!showToast) {
    return null;
  }

  return <PwaUpdateToast onUpdate={handleUpdate} onDismiss={handleDismiss} />;
}
