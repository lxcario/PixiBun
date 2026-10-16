'use client';

import { useEffect, useRef, useState } from 'react';
import { prepareAppRestart, reloadAppPage } from '@/lib/system/appRestart';
import { PwaUpdateToast } from './PwaUpdateToast';
import { captureDiagnostic } from '@/lib/diagnostics/capture';

export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
export const UPDATE_RECHECK_ON_RETURN_MS = 10 * 60 * 1000;

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
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const restartRequested = useRef(false);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      warmAssets(performance.getEntriesByType('resource'));
      if (!restartRequested.current) return;
      restartRequested.current = false;
      if (restartTimer.current) clearTimeout(restartTimer.current);
      // Recheck the save boundary: edits may have arrived while activation was pending.
      void prepareAppRestart().then(() => reloadAppPage()).catch(error => {
        setUpdating(false);
        setUpdateError(error instanceof Error ? error.message : 'Your work could not be saved. Try again.');
      });
    }, { signal });
    warmAssets(performance.getEntriesByType('resource'));

    registerServiceWorker().then((reg) => {
      if (!reg || signal.aborted) return;

      // Browsers check for a new worker on navigation, which a Studio left open
      // for days may never do. Ask hourly, and on return after a while away.
      if (typeof reg.update === 'function') {
        let lastCheck = Date.now();
        const checkForUpdate = () => {
          if (signal.aborted || navigator.onLine === false) return;
          lastCheck = Date.now();
          reg.update().catch(() => { /* The next check retries. */ });
        };
        const hourly = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
        signal.addEventListener('abort', () => window.clearInterval(hourly), { once: true });
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && Date.now() - lastCheck >= UPDATE_RECHECK_ON_RETURN_MS) checkForUpdate();
        }, { signal });
      }

      // Check if a worker is already waiting
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(reg.waiting);
        setShowToast(true);
      }

      const trackInstalling = (worker: ServiceWorker) => {
        worker.addEventListener(
          'statechange',
          () => {
            // An update means another worker controls the page. WebKit can deliver
            // a first install's "installed" event after that worker has already
            // taken control, which must not read as a new build being ready.
            const controller = navigator.serviceWorker.controller;
            if (
              worker.state === 'installed' &&
              controller && controller !== worker
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

    // Only the page whose user tapped Restart may reload.
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'UPDATE_DEFERRED' && restartRequested.current) {
        restartRequested.current = false;
        if (restartTimer.current) clearTimeout(restartTimer.current);
        setUpdating(false);
        setUpdateError('This older update cannot restart automatically. Try again after the next update is ready.');
      }
    }, { signal });

    return () => {
      ac.abort();
      restartRequested.current = false;
      if (restartTimer.current) clearTimeout(restartTimer.current);
      observer?.disconnect();
    };
  }, []);

  const handleUpdate = async () => {
    if (!waitingWorker || restartRequested.current || updating) return;
    setUpdating(true); setUpdateError(null);
    try {
      await prepareAppRestart();
      if (waitingWorker.state === 'activated' || navigator.serviceWorker.controller === waitingWorker) {
        reloadAppPage();
        return;
      }
      restartRequested.current = true;
      restartTimer.current = setTimeout(() => {
        restartRequested.current = false; setUpdating(false);
        setUpdateError('The update did not finish. Your work is still open; tap Restart to try again.');
      }, 15000);
      waitingWorker.postMessage({ type: 'APPLY_UPDATE' });
    } catch (error) {
      restartRequested.current = false;
      if (restartTimer.current) clearTimeout(restartTimer.current);
      setUpdating(false);
      setUpdateError(error instanceof Error ? error.message : 'Your work could not be saved. Try again.');
    }
  };

  const handleDismiss = () => {
    setShowToast(false);
  };

  if (!showToast) {
    return null;
  }

  return <PwaUpdateToast onUpdate={handleUpdate} onDismiss={handleDismiss} updating={updating} error={updateError} />;
}
