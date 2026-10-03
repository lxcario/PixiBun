'use client';

import React, { useEffect } from 'react';
import { captureDiagnostic } from '@/lib/diagnostics/capture';
import { initWebVitals } from '@/lib/diagnostics/vitals';
import { diagnosticReason } from '@/lib/diagnostics/reason';

export function DiagnosticsProvider({ children }: { children?: React.ReactNode }) {
  useEffect(() => {
    // 1. Initialize web vitals reporting
    initWebVitals();

    // 2. Global error listener
    const handleError = (event: ErrorEvent) => {
      captureDiagnostic({
        kind: 'error',
        message: event.message || 'Window error event',
        detail: event.error ? diagnosticReason(event.error).detail : `${event.filename}:${event.lineno}:${event.colno}`,
      });
    };

    // 3. Unhandled promise rejection listener
    const handleRejection = (event: PromiseRejectionEvent) => {
      const { message, detail } = diagnosticReason(event.reason);

      captureDiagnostic({
        kind: 'unhandled-rejection',
        message,
        detail,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return <>{children}</>;
}
