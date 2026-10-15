'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import {
  getDiagnosticsSettings,
  setDiagnosticsSettings,
  exportDiagnosticsFile,
  clearDiagnostics,
} from '@/lib/diagnostics/capture';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const [diagSettings, setDiagSettings] = useState(getDiagnosticsSettings());
  const [clearNotice, setClearNotice] = useState(false);
  const clearNoticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDiagSettings(getDiagnosticsSettings());
      setClearNotice(false);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (clearNoticeTimerRef.current !== null) {
        window.clearTimeout(clearNoticeTimerRef.current);
      }
    };
  }, []);

  const handleToggleLocal = (enabled: boolean) => {
    const updated = setDiagnosticsSettings({ enabled });
    setDiagSettings(updated);
  };

  const handleToggleRelay = (relayOptIn: boolean) => {
    const updated = setDiagnosticsSettings({ relayOptIn });
    setDiagSettings(updated);
  };

  const handleClear = async () => {
    await clearDiagnostics();
    if (clearNoticeTimerRef.current !== null) {
      window.clearTimeout(clearNoticeTimerRef.current);
    }
    setClearNotice(true);
    clearNoticeTimerRef.current = window.setTimeout(() => {
      setClearNotice(false);
      clearNoticeTimerRef.current = null;
    }, 2500);
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Privacy, Diagnostics & Health"
      maxWidth="w-[520px]"
    >
      <div className="flex flex-col gap-3 font-mono text-xs text-[var(--text-heading)]">
        <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
          Error and performance logs <strong className="text-[var(--accent-gold)]">stay on this device by default</strong>. Local logging starts enabled and keeps up to 200 records. Sending reports to this site&apos;s server is a separate choice below.
        </p>

        <div className="p-3 bg-[var(--desk-surface)] rounded-[3px] border border-[var(--desk-border)] flex flex-col gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-[12px]">
            <input
              type="checkbox"
              checked={diagSettings.enabled}
              onChange={(e) => handleToggleLocal(e.target.checked)}
              className="rounded border-[var(--desk-border)] accent-[#f0be7c]"
            />
            <span className="font-bold">Enable local diagnostic ring buffer (device only)</span>
          </label>

          <div className="border-t border-[var(--desk-border)] pt-2.5 flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-[12px]">
              <input
                type="checkbox"
                checked={diagSettings.relayOptIn}
                onChange={(e) => handleToggleRelay(e.target.checked)}
                className="rounded border-[var(--desk-border)] accent-[#f0be7c]"
              />
              <span className="font-bold">Send diagnostic reports (off by default)</span>
            </label>

            <p className="pl-5 text-[11px] text-[var(--text-muted)] leading-relaxed">
              Reports leave this device for this site&apos;s server. The site operator controls any onward destination. Export Diagnostics JSON lets you inspect the records before choosing to send them.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1 pt-2.5 border-t border-[var(--desk-border)]">
            <button
              type="button"
              onClick={() => exportDiagnosticsFile()}
              className="px-3 py-1.5 bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] hover:border-[var(--accent-gold)] text-[11px] rounded text-[var(--accent-gold)] font-bold cursor-pointer transition-colors"
            >
              Export Diagnostics JSON
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] hover:border-[var(--danger-border)] text-[11px] rounded text-[var(--danger-fg)] font-bold cursor-pointer transition-colors"
            >
              Clear Stored Logs
            </button>
            {clearNotice && (
              <span className="text-[11px] text-[#86efac] font-bold animate-pulse">Logs cleared!</span>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] hover:text-[var(--accent-gold)] text-xs font-bold rounded-[2px] cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};
