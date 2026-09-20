'use client';

import React, { useEffect } from 'react';
import { PixiBunLogo } from '@/components/ui/PixiBunLogo';
import { captureDiagnostic, exportDiagnosticsFile } from '@/lib/diagnostics/capture';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureDiagnostic({
      kind: 'error',
      message: error.message || 'Unhandled route error',
      detail: error.stack || (error.digest ? `Digest: ${error.digest}` : undefined),
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--desk-bg)] text-[var(--text-heading)] p-6 font-mono">
      <div className="max-w-md w-full bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[4px] p-6 shadow-[0_4px_0_var(--desk-bg)] flex flex-col gap-4 text-center">
        <div className="flex justify-center mb-1">
          <PixiBunLogo size="lg" className="drop-shadow-sm" />
        </div>
        <h2 className="text-lg font-bold text-[var(--accent-gold)] font-display">
          A Hitch in the Atelier
        </h2>
        <p className="text-xs text-[var(--text-body)] leading-relaxed">
          An unexpected interruption occurred. Your artwork and preferences remain safely stored in your browser.
        </p>
        {error.message && (
          <div className="bg-[var(--desk-bg)] border border-[var(--desk-border)] p-2.5 rounded text-[11px] text-[#fca5a5] text-left break-words max-h-24 overflow-y-auto font-mono">
            {error.message}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2 justify-center mt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 bg-[var(--accent-gold)] text-[var(--desk-bg)] font-bold text-xs rounded border-2 border-[var(--desk-border)] hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[var(--desk-surface-raised)] text-[var(--text-heading)] font-medium text-xs rounded border border-[var(--desk-border)] hover:bg-[var(--desk-surface)] transition-colors"
          >
            Reload Atelier
          </button>
          <button
            type="button"
            onClick={() => exportDiagnosticsFile()}
            className="px-3 py-2 bg-transparent text-[var(--text-body)] hover:text-[var(--accent-gold)] text-xs underline underline-offset-2 transition-colors"
          >
            Export Logs
          </button>
        </div>
      </div>
    </div>
  );
}
