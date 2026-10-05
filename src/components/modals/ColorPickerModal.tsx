'use client';

import { useStudioStore } from '@/stores/studioStore';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { ArtistColorPicker } from '@/components/ui/ArtistColorPicker';

export function ColorPickerModal({ isOpen, onClose, target }: { isOpen: boolean; onClose: () => void; target: 'primary' | 'secondary' }) {
  const primary = useStudioStore(s => s.primaryColor), secondary = useStudioStore(s => s.secondaryColor);
  const setPrimary = useStudioStore(s => s.setPrimaryColor), setSecondary = useStudioStore(s => s.setSecondaryColor);
  const add = useStudioStore(s => s.addCustomColorToPalette), paletteId = useStudioStore(s => s.currentPaletteId);
  const color = target === 'primary' ? primary : secondary;
  return <ModalWrapper isOpen={isOpen} onClose={onClose} title={`Pick Custom ${target === 'primary' ? 'Primary' : 'Secondary'} Color`} maxWidth="w-[340px]">
    <ArtistColorPicker color={color} onChange={target === 'primary' ? setPrimary : setSecondary} />
    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[var(--desk-border)] text-xs">
      <button type="button" onClick={() => add(paletteId, color)} className="px-2 py-2 border border-[var(--desk-border)] text-[var(--accent-gold)]">Save to palette</button>
      <button type="button" onClick={onClose} className="px-3 py-2 bg-[var(--accent-gold)] text-[var(--surface-0)]">Select Color</button>
    </div>
  </ModalWrapper>;
}
