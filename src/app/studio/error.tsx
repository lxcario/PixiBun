'use client';

import React, { useEffect } from 'react';
import { captureDiagnostic, exportDiagnosticsFile } from '@/lib/diagnostics/capture';

export default function StudioErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureDiagnostic({
      kind: 'error',
      message: error.message || 'Unhandled studio canvas error',
      detail: error.stack || (error.digest ? `Digest: ${error.digest}` : undefined),
      route: '/studio',
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#140c1e] text-[#f7e7c4] p-6 font-mono">
      <div className="max-w-lg w-full bg-[#20152e] border-2 border-[#8c5120] rounded-[4px] p-6 shadow-[0_4px_0_#0a050f] flex flex-col gap-4 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-[#3a2052] border border-[#f0be7c] flex items-center justify-center text-xl">
          🎨
        </div>
        <h2 className="text-lg font-bold text-[#f0be7c] font-display">
          Studio Canvas Hitch
        </h2>
        <p className="text-xs text-[#d3b89d] leading-relaxed">
          The studio workbench encountered an issue rendering canvas state. <strong className="text-[#f0be7c]">Your artwork is safely saved in local IndexedDB storage.</strong>
        </p>
        {error.message && (
          <div className="bg-[#140c1e] border border-[#3d2352] p-2.5 rounded text-[11px] text-[#fca5a5] text-left break-words max-h-28 overflow-y-auto font-mono">
            {error.message}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2 justify-center mt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 bg-[#f0be7c] text-[#140c1e] font-bold text-xs rounded border-2 border-[#8c5120] hover:bg-[#fff8db] shadow-[0_2px_0_#8c5120] cursor-pointer"
          >
            Resume Session
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#2d1b3f] text-[#f7e7c4] font-medium text-xs rounded border border-[#8c5120] hover:bg-[#3b2353] cursor-pointer"
          >
            Reload Studio
          </button>
          <button
            type="button"
            onClick={() => exportDiagnosticsFile()}
            className="px-3 py-2 bg-transparent text-[#d3b89d] hover:text-[#f0be7c] text-xs underline underline-offset-2 cursor-pointer"
          >
            Export Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}
