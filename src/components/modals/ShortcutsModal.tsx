'use client';

import React from 'react';
import { TactileButton } from '@/components/ui/TactileButton';
import { ModalWrapper } from '@/components/ui/ModalWrapper';

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
  { key: 'Middle / Alt + Drag', description: 'Pan Canvas Viewport', category: 'Canvas & Viewport' },
  { key: 'Mouse Wheel', description: 'Zoom In / Out Canvas', category: 'Canvas & Viewport' },
  { key: 'Space', description: 'Play / Pause Animation', category: 'Animation' },
  { key: ',', description: 'Step to Previous Frame', category: 'Animation' },
  { key: '.', description: 'Step to Next Frame', category: 'Animation' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const categories = ['Tools', 'Editing', 'Canvas & Viewport', 'Animation'] as const;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts & Hotkeys" maxWidth="w-[540px] max-h-[85vh]">
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
