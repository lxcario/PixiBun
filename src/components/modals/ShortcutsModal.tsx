'use client';

import React, { useState, useEffect } from 'react';
import { TactileButton } from '@/components/ui/TactileButton';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import {
  getDiagnosticsSettings,
  setDiagnosticsSettings,
  exportDiagnosticsFile,
  clearDiagnostics,
} from '@/lib/diagnostics/capture';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  key: string;
  description: string;
  category: 'Tools' | 'Canvas & Viewport' | 'Animation' | 'Editing';
}

const SHORTCUTS: ShortcutEntry[] = [
  { key: 'B', description: 'Pen Tool', category: 'Tools' },
  { key: 'C', description: 'Bézier Curve Tool', category: 'Tools' },
  { key: 'E', description: 'Eraser Tool', category: 'Tools' },
  { key: 'G', description: 'Flood Fill / Bucket', category: 'Tools' },
  { key: 'D', description: 'Dither Brush', category: 'Tools' },
  { key: 'I', description: 'Eyedropper', category: 'Tools' },
  { key: 'M', description: 'Marquee Box Select', category: 'Tools' },
  { key: 'Q', description: 'Lasso Select', category: 'Tools' },
  { key: 'W', description: 'Magic Wand', category: 'Tools' },
  { key: 'L', description: 'Line Tool', category: 'Tools' },
  { key: 'J', description: 'Isometric 2:1 Line', category: 'Tools' },
  { key: 'U', description: 'Rectangle Tool', category: 'Tools' },
  { key: 'O', description: 'Ellipse Tool', category: 'Tools' },
  { key: 'R', description: 'Color Replace Tool', category: 'Tools' },
  { key: 'X', description: 'Swap Colors', category: 'Editing' },
  { key: '[ / ]', description: 'Decrease / Increase Size', category: 'Editing' },
  { key: 'H / V', description: 'Flip Selection H / V', category: 'Editing' },
  { key: 'Ctrl + C / X / V', description: 'Copy / Cut / Paste', category: 'Editing' },
  { key: 'Ctrl + Z / Y', description: 'Undo / Redo Stroke', category: 'Editing' },
  { key: 'Esc', description: 'Deselect / Commit Float', category: 'Editing' },
  { key: 'Shift + Select', description: 'Add to Selection (Union)', category: 'Editing' },
  { key: 'Alt + Select', description: 'Subtract from Selection', category: 'Editing' },
  { key: 'Middle / Alt + Drag', description: 'Pan Canvas Viewport', category: 'Canvas & Viewport' },
  { key: 'Arrow Keys', description: 'Pan Viewport / Nudge Selection', category: 'Canvas & Viewport' },
  { key: 'Mouse Wheel', description: 'Zoom In / Out Canvas', category: 'Canvas & Viewport' },
  { key: 'Ctrl + + / -', description: 'Zoom In / Out Step', category: 'Canvas & Viewport' },
  { key: 'Ctrl + 0', description: 'Fit Canvas to Screen', category: 'Canvas & Viewport' },
  { key: 'Ctrl + 1', description: 'Reset Zoom to 100%', category: 'Canvas & Viewport' },
  { key: 'Space', description: 'Play / Pause Animation', category: 'Animation' },
  { key: ',', description: 'Step to Previous Frame', category: 'Animation' },
  { key: '.', description: 'Step to Next Frame', category: 'Animation' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const categories = ['Tools', 'Editing', 'Canvas & Viewport', 'Animation'] as const;
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagSettings, setDiagSettings] = useState(getDiagnosticsSettings());
  const [clearNotice, setClearNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDiagSettings(getDiagnosticsSettings());
      setClearNotice(false);
    }
  }, [isOpen]);

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
    setClearNotice(true);
    setTimeout(() => setClearNotice(false), 2500);
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Atelier Guide & Shortcuts" maxWidth="w-[560px] max-h-[85vh]">
      {/* Shortcuts List by Category */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
        {categories.map((cat) => (
          <div key={cat} className="flex flex-col gap-1.5">
            <span className="text-[11px] font-mono font-bold text-[#f0be7c] uppercase border-b border-[var(--desk-border)] pb-0.5 tracking-wider">
              {cat}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {SHORTCUTS.filter((s) => s.category === cat).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-[var(--desk-surface)] px-2.5 py-1.5 rounded-[2px] border border-[var(--desk-border)] text-xs font-mono shadow-xs"
                >
                  <span className="text-[var(--text-heading)] truncate mr-2 font-medium">{item.description}</span>
                  <kbd className="bg-[var(--desk-surface)] text-[#f0be7c] px-1.5 py-0.5 rounded-[2px] border border-[var(--desk-border)] text-[10px] font-bold shadow-xs whitespace-nowrap">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Privacy & Diagnostics Section */}
        <div className="mt-2 border-t border-[var(--desk-border)] pt-3">
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="flex items-center justify-between w-full text-left text-xs font-mono font-bold text-[#f0be7c] hover:text-[#fff8db] py-1 cursor-pointer"
          >
            <span>Privacy, Diagnostics & Offline Health</span>
            <span className="text-[10px]">{showDiagnostics ? '▲ Hide' : '▼ View'}</span>
          </button>

          {showDiagnostics && (
            <div className="mt-2 p-3 bg-[var(--desk-surface)] rounded-[3px] border border-[var(--desk-border)] flex flex-col gap-2.5 text-xs font-mono text-[var(--text-heading)]">
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                PixiBun honors a strict <strong className="text-[#f0be7c]">zero-telemetry guarantee</strong>. Diagnostic events and web vitals are captured exclusively to your browser&apos;s local IndexedDB ring buffer (200 entries max) for troubleshooting.
              </p>

              <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={diagSettings.enabled}
                  onChange={(e) => handleToggleLocal(e.target.checked)}
                  className="rounded border-[var(--desk-border)] accent-[#f0be7c]"
                />
                <span>Enable local diagnostic ring buffer (local only)</span>
              </label>

              <div className="border-t border-[var(--desk-border)] pt-2 flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={diagSettings.relayOptIn}
                    onChange={(e) => handleToggleRelay(e.target.checked)}
                    className="rounded border-[var(--desk-border)] accent-[#f0be7c]"
                  />
                  <span>Opt-in remote crash relay (strictly off by default)</span>
                </label>

                {diagSettings.relayOptIn && (
                  <p className="pl-5 text-[10px] text-[var(--text-muted)] italic leading-tight">
                    The relay destination is configured by the server operator via <code className="text-[#f0be7c]">DIAGNOSTICS_RELAY_URL</code>. If no upstream is configured, reports stay on this device.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1 pt-2 border-t border-[var(--desk-border)]">
                <button
                  type="button"
                  onClick={() => exportDiagnosticsFile()}
                  className="px-2.5 py-1 bg-[var(--desk-bg)] border border-[var(--desk-border)] hover:border-[#f0be7c] text-[11px] rounded text-[#f0be7c] font-medium cursor-pointer"
                >
                  📥 Export Diagnostics JSON
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1 bg-[var(--desk-bg)] border border-[var(--desk-border)] hover:border-[#fca5a5] text-[11px] rounded text-[#fca5a5] cursor-pointer"
                >
                  🧹 Clear Stored Logs
                </button>
                {clearNotice && (
                  <span className="text-[10px] text-[#86efac]">Logs cleared!</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Footer */}
      <div className="flex justify-end pt-2 border-t border-[var(--desk-border)]">
        <TactileButton
          size="sm"
          variant="primary"
          onClick={onClose}
          className="bg-[#f0be7c] text-[#140d1f] hover:bg-[#fff8db] border-2 border-[#8c5120] font-display font-bold shadow-[0_2px_0_#8c5120]"
        >
          Close
        </TactileButton>
      </div>
    </ModalWrapper>
  );
};
