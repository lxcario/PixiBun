'use client';

import React from 'react';
import { TactileButton } from '@/components/ui/TactileButton';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { shortcutsForKeymap, ShortcutCategory } from '@/config/shortcuts';
import { KEYMAP_LABELS, type Keymap } from '@/lib/input/keymap';
import { usePreferencesStore } from '@/stores/preferencesStore';

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
  const keymap = usePreferencesStore(s => s.keymap);
  const setKeymap = usePreferencesStore(s => s.setKeymap);
  const shortcuts = shortcutsForKeymap(keymap);
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
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span id="keymap-label" className="font-medium text-[var(--text-heading)]">Mouse &amp; keys</span>
          <div role="radiogroup" aria-labelledby="keymap-label" className="flex rounded-[2px] border border-[var(--desk-border)] overflow-hidden">
            {(Object.keys(KEYMAP_LABELS) as Keymap[]).map(option => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={keymap === option}
                data-testid={`keymap-${option}`}
                onClick={() => setKeymap(option)}
                className={`px-2.5 py-1 font-mono ${keymap === option
                  ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)]'
                  : 'bg-[var(--desk-surface)] text-[var(--text-muted)] hover:text-[var(--text-heading)]'}`}
              >
                {KEYMAP_LABELS[option]}
              </button>
            ))}
          </div>
          <span className="text-[var(--text-muted)]">
            {keymap === 'standard'
              ? 'Hold Space to pan, Alt-click picks a color, Shift-click draws a line, right-click paints the secondary color, Enter plays.'
              : 'Space plays, Alt-drag pans, Shift paints the secondary color, right-click opens the tools popup.'}
          </span>
        </div>
        {CATEGORIES.map((cat) => (
          <div key={cat} className="flex flex-col gap-1.5">
            <span className="text-[11px] font-mono font-bold text-[var(--accent-gold)] uppercase border-b border-[var(--desk-border)] pb-0.5 tracking-wider">
              {cat}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {shortcuts.filter((s) => s.category === cat).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-[var(--desk-surface)] px-3 py-1.5 rounded-[2px] border border-[var(--desk-border)] text-xs font-mono shadow-xs gap-2"
                >
                  <span className="text-[var(--text-heading)] font-medium">
                    {item.description}
                  </span>
                  <kbd className="bg-[var(--desk-surface)] text-[var(--accent-gold)] px-1.5 py-0.5 rounded-[2px] border border-[var(--desk-border)] text-[10px] font-bold shadow-xs whitespace-nowrap shrink-0">
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
              className="text-[var(--accent-gold)] hover:text-[#fff8db] font-bold underline cursor-pointer"
            >
              Privacy & Diagnostics →
            </button>
          )}
        </div>

        <TactileButton
          size="sm"
          variant="primary"
          onClick={onClose}
          className="bg-[var(--primary-bg)] text-[var(--primary-fg)] hover:bg-[var(--primary-hover)] hover:shadow-[0_2px_0_#8c5120] border-2 border-[var(--ink)] font-display font-bold shadow-[0_2px_0_#8c5120]"
        >
          Close
        </TactileButton>
      </div>
    </ModalWrapper>
  );
};
