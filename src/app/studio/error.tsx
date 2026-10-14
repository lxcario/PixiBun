'use client';

import { useEffect, useState } from 'react';
import { PixiBunLogo } from '@/components/ui/PixiBunLogo';
import { captureDiagnostic, exportDiagnosticsFile } from '@/lib/diagnostics/capture';
import { saveAfterStudioCrash, type StudioCrashSave } from '@/lib/project/studioCrashSave';

export default function StudioErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Claim "saved" only after a save of the live drawing has actually succeeded.
  const [save, setSave] = useState<StudioCrashSave | null>(null);
  useEffect(() => {
    let current = true;
    void saveAfterStudioCrash().then(result => { if (current) setSave(result); });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    captureDiagnostic({
      kind: 'error',
      message: error.message || 'Unhandled studio canvas error',
      detail: error.stack || (error.digest ? `Digest: ${error.digest}` : undefined),
      route: '/studio',
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--desk-bg)] text-[var(--text-heading)] p-6 font-mono">
      <div className="max-w-lg w-full bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[4px] p-6 shadow-[0_4px_0_var(--desk-bg)] flex flex-col gap-4 text-center">
        <div className="flex justify-center mb-1">
          <PixiBunLogo size="lg" className="drop-shadow-sm" />
        </div>
        <h2 className="text-lg font-bold text-[var(--accent-gold)] font-display">
          Studio Canvas Hitch
        </h2>
        <p className="text-xs text-[var(--text-body)] leading-relaxed">
          The studio workbench encountered an issue rendering canvas state.
        </p>
        <p role="status" data-testid="studio-error-save-status" className="text-xs text-[var(--text-body)] leading-relaxed">
          {save === null ? 'Saving your latest strokes…'
            : save.saved ? <strong className="text-[var(--accent-gold)]">Your artwork is saved on this device.</strong>
            : <><strong className="text-[#fca5a5]">Your latest strokes are not saved.</strong> Resume Session keeps them open; reloading now would lose them. ({save.error})</>}
        </p>
        {error.message && (
          <div className="bg-[var(--desk-bg)] border border-[var(--desk-border)] p-2.5 rounded text-[11px] text-[#fca5a5] text-left break-words max-h-28 overflow-y-auto font-mono">
            {error.message}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2 justify-center mt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 bg-[var(--accent-gold)] text-[var(--desk-bg)] font-bold text-xs rounded border-2 border-[var(--desk-border)] hover:opacity-90 cursor-pointer"
          >
            Resume Session
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[var(--desk-surface-raised)] text-[var(--text-heading)] font-medium text-xs rounded border border-[var(--desk-border)] hover:bg-[var(--desk-surface)] cursor-pointer"
          >
            Reload Studio
          </button>
          <button
            type="button"
            onClick={() => exportDiagnosticsFile()}
            className="px-3 py-2 bg-transparent text-[var(--text-body)] hover:text-[var(--accent-gold)] text-xs underline underline-offset-2 cursor-pointer"
          >
            Export Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}
