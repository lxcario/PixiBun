'use client';

import React from 'react';
import { TactileButton } from '@/components/ui/TactileButton';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { CANONICAL_SHORTCUTS, ShortcutCategory } from '@/config/shortcuts';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDiagnostics?: () => void;
}

const CATEGORIES: ShortcutCategory[] = [
  'Tools',
  'Editing',
  'Canvas & Viewport',
  'Animation',
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  onOpenDiagnostics,
}) => {
  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Guide & Shortcuts"
      maxWidth="w-[740px] max-w-[95vw]"
      bodyClassName="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden"
    >
      {/* Shortcuts List by Category */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3.5 pr-2">
        <p className="text-xs text-[var(--text-muted)]">
          Letter shortcuts use QWERTY key positions. Symbols follow your keyboard.
          Workspace shortcuts pause while a dialog is open or you’re typing.
        </p>
        {CATEGORIES.map((cat) => (
          <div key={cat} className="flex flex-col gap-1.5">
            <span className="text-[11px] font-mono font-bold text-[#f0be7c] uppercase border-b border-[var(--desk-border)] pb-0.5 tracking-wider">
              {cat}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {CANONICAL_SHORTCUTS.filter((s) => s.category === cat).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-[var(--desk-surface)] px-3 py-1.5 rounded-[2px] border border-[var(--desk-border)] text-xs font-mono shadow-xs gap-2"
                >
                  <span className="text-[var(--text-heading)] font-medium">
                    {item.description}
                  </span>
                  <kbd className="bg-[var(--desk-surface)] text-[#f0be7c] px-1.5 py-0.5 rounded-[2px] border border-[var(--desk-border)] text-[10px] font-bold shadow-xs whitespace-nowrap shrink-0">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Footer with Privacy & Diagnostics Link (UX-8 IA Separation) */}
      <div className="shrink-0 flex items-center justify-between pt-2.5 border-t border-[var(--desk-border)] text-xs font-mono">
        <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2">
          <span>Zero telemetry by default.</span>
          {onOpenDiagnostics && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDiagnostics();
              }}
              className="text-[#f0be7c] hover:text-[#fff8db] font-bold underline cursor-pointer"
            >
              Privacy & Diagnostics →
            </button>
          )}
        </div>

        <TactileButton
          size="sm"
          variant="primary"
          onClick={onClose}
          className="bg-[#f0be7c] text-[#140d1f] hover:bg-[#fcd699] hover:shadow-[0_2px_0_#8c5120] border-2 border-[#8c5120] font-display font-bold shadow-[0_2px_0_#8c5120]"
        >
          Close
        </TactileButton>
      </div>
    </ModalWrapper>
  );
};
