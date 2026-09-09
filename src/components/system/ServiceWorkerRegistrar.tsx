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
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const ac = new AbortController();
    const { signal } = ac;

    registerServiceWorker().then((reg) => {
      if (!reg || signal.aborted) return;

      // Check if a worker is already waiting
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(reg.waiting);
        setShowToast(true);
      }

      const trackInstalling = (worker: ServiceWorker) => {
        worker.addEventListener(
          'statechange',
          () => {
            if (
              worker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              if (!signal.aborted) {
                setWaitingWorker(worker);
                setShowToast(true);
              }
            }
          },
          { signal }
        );
      };

      if (reg.installing) {
        trackInstalling(reg.installing);
      }

      // Listen for new worker installation
      reg.addEventListener(
        'updatefound',
        () => {
          if (reg.installing) {
            trackInstalling(reg.installing);
          }
        },
        { signal }
      );
    });

    let refreshing = false;
    const hadController = Boolean(navigator.serviceWorker?.controller);
    const handleControllerChange = () => {
      if (!refreshing && hadController) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, { signal });

    return () => {
      ac.abort();
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
