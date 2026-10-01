'use client';

import { useEffect, useState } from 'react';
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
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
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
  const [updateDeferred, setUpdateDeferred] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const ac = new AbortController();
    const { signal } = ac;
    const warmed = new Set<string>();
    const warmAssets = (entries: PerformanceEntry[]) => {
      const controller = navigator.serviceWorker.controller;
      if (!controller) return;
      const urls = entries.map(entry => entry.name).filter(value => {
        const url = new URL(value, window.location.origin);
        return url.origin === window.location.origin && url.pathname.startsWith('/_next/static/') && !warmed.has(value);
      });
      urls.forEach(url => warmed.add(url));
      if (urls.length) controller.postMessage({ type: 'CACHE_ASSETS', urls });
    };
    // Initial requests can finish before the first worker claims this page.
    // Buffer completed resources and also track lazy studio chunks as they arrive.
    const observer = typeof PerformanceObserver === 'undefined' ? null : new PerformanceObserver(list => warmAssets(list.getEntries()));
    observer?.observe({ type: 'resource', buffered: true });
    navigator.serviceWorker.addEventListener('controllerchange', () => warmAssets(performance.getEntriesByType('resource')), { signal });
    warmAssets(performance.getEntriesByType('resource'));

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

    // Never reload artwork because a worker changed (including older deployed workers).
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'UPDATE_DEFERRED') setUpdateDeferred(true);
    }, { signal });

    return () => {
      ac.abort();
      observer?.disconnect();
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      setUpdateDeferred(true);
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const handleDismiss = () => {
    setShowToast(false);
  };

  if (!showToast) {
    return null;
  }

  return <PwaUpdateToast onUpdate={handleUpdate} onDismiss={handleDismiss} deferred={updateDeferred} />;
}
