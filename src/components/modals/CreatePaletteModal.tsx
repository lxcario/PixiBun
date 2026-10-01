'use client';

import { useState } from 'react';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { TactileButton } from '@/components/ui/TactileButton';
import { useStudioStore } from '@/stores/studioStore';
import { MAX_PALETTE_COLORS, MAX_PALETTE_NAME_LENGTH, MAX_PROJECT_PALETTES } from '@/lib/color/paletteAdmission';
import { compositeFrame } from '@/lib/render/compositor';
import { extractCompactPalette } from '@/lib/color/compactPalette';

function normalizeColor(value: string): string | null {
  const hex = value.trim().replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(hex)) return `#${hex.split('').map(c => c + c).join('').toUpperCase()}`;
  return /^(?:[\da-f]{6}|[\da-f]{8})$/i.test(hex) ? `#${hex.toUpperCase()}` : null;
}

export function CreatePaletteModal({ onClose }: { onClose: () => void }) {
  const palettes = useStudioStore(s => s.palettes);
  const currentId = useStudioStore(s => s.currentPaletteId);
  const primaryColor = useStudioStore(s => s.primaryColor);
  const addPalette = useStudioStore(s => s.addExtractedPalette);
  const [name, setName] = useState('My palette');
  const [colors, setColors] = useState<string[]>([normalizeColor(primaryColor) ?? '#C792DF']);
  const [selected, setSelected] = useState(0);
  const [hex, setHex] = useState(colors[0]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const normalized = normalizeColor(hex);
  const full = palettes.length >= MAX_PROJECT_PALETTES;
  const valid = name.trim().length > 0 && colors.length > 0 && normalized !== null && !full;
  const fieldClass = 'h-9 w-full min-w-0 bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px] px-2 text-xs text-[var(--text-heading)]';

  const loadColors = (next: string[], message = '') => {
    const normalizedColors = next.map(normalizeColor).filter((color): color is string => color !== null);
    setColors(normalizedColors); setSelected(0); setHex(normalizedColors[0] ?? normalizeColor(primaryColor) ?? '#C792DF');
    setError(''); setNotice(message);
  };
  const fromArtwork = () => {
    try {
      const state = useStudioStore.getState();
      const canvas = compositeFrame(state.frames, state.activeFrameIndex, state.canvasWidth, state.canvasHeight);
      const context = canvas?.getContext('2d');
      const extracted = context ? extractCompactPalette(context.getImageData(0, 0, state.canvasWidth, state.canvasHeight).data, 6) : [];
      if (!extracted.length) { setError('Draw or import some artwork first.'); return; }
      loadColors(extracted, 'Up to 6 main colors from this frame.');
    } catch { setError('Could not read this frame. Your draft is still here.'); }
  };
  const editHex = (value: string) => {
    setHex(value); setError('');
    const color = normalizeColor(value);
    if (color && colors.length) setColors(colors.map((existing, i) => i === selected ? color : existing));
  };
  const addColor = () => {
    if (colors.length >= MAX_PALETTE_COLORS || !normalized) return;
    setColors([...colors, normalized]); setSelected(colors.length); setHex(normalized); setError('');
  };
  const moveColor = (direction: -1 | 1) => {
    const target = selected + direction;
    if (target < 0 || target >= colors.length) return;
    const next = [...colors]; [next[selected], next[target]] = [next[target], next[selected]];
    setColors(next); setSelected(target);
  };
  const removeColor = () => {
    const next = colors.filter((_, i) => i !== selected);
    const index = Math.max(0, Math.min(selected, next.length - 1));
    setColors(next); setSelected(index); setHex(next[index] ?? normalizeColor(primaryColor) ?? '#C792DF'); setError('');
  };
  const save = () => {
    if (!valid) return;
    if (addPalette(name.trim(), colors)) onClose();
    else setError('Could not create the palette. Your draft is still here.');
  };

  return (
    <ModalWrapper isOpen onClose={onClose} title="Create palette" maxWidth="w-[440px]"
      bodyClassName="flex flex-col gap-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0 overflow-y-auto p-0.5">
        <label className="flex flex-col gap-1 text-xs">
          Palette name
          <input data-autofocus value={name} maxLength={MAX_PALETTE_NAME_LENGTH}
            onChange={e => { setName(e.target.value); setError(''); }} className={fieldClass} />
        </label>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Start palette from">
          <TactileButton size="sm" onClick={() => loadColors([primaryColor])}>Pick colors</TactileButton>
          <TactileButton size="sm" onClick={() => loadColors(palettes.find(p => p.id === currentId)?.colors ?? [])}>Copy palette</TactileButton>
          <TactileButton size="sm" onClick={fromArtwork}>From artwork</TactileButton>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span>Choose a swatch to edit.</span>
          <span className="text-[var(--text-muted)]" aria-live="polite">{colors.length} {colors.length === 1 ? 'color' : 'colors'}</span>
        </div>
        <div className="grid grid-cols-8 gap-2 p-2 min-h-16 max-h-48 overflow-y-auto bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px]" role="group" aria-label="Palette draft colors">
          {colors.map((color, index) => (
            <button key={index} type="button" aria-label={`Edit color ${index + 1}: ${color}`}
              aria-pressed={selected === index} title={color} style={{ backgroundColor: color }}
              onClick={() => { setSelected(index); setHex(color); setError(''); }}
              className={`aspect-square w-full border rounded-[2px] cursor-pointer ${selected === index ? 'border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]' : 'border-[var(--desk-border)]'}`} />
          ))}
        </div>
        <div className="grid grid-cols-[44px_1fr] gap-2 items-end">
          <input type="color" aria-label="Pick swatch color" value={normalized?.slice(0, 7) ?? '#C792DF'}
            onChange={e => editHex(e.target.value + (normalized?.length === 9 ? normalized.slice(7) : ''))}
            className="w-11 h-9 p-0.5 bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px] cursor-pointer" />
          <label className="flex flex-col gap-1 text-xs">Hex color
            <input value={hex} onChange={e => editHex(e.target.value)} spellCheck={false}
              aria-invalid={!normalized} maxLength={9} className={`${fieldClass} font-mono`} />
          </label>
        </div>
        <TactileButton size="sm" onClick={addColor} disabled={!normalized || colors.length >= MAX_PALETTE_COLORS} className="w-full">+ Add color</TactileButton>
        <div className="grid grid-cols-3 gap-2">
          <TactileButton size="sm" onClick={() => moveColor(-1)} disabled={selected === 0 || !colors.length}>Move left</TactileButton>
          <TactileButton size="sm" onClick={() => moveColor(1)} disabled={selected >= colors.length - 1}>Move right</TactileButton>
          <TactileButton size="sm" onClick={removeColor} disabled={!colors.length}>Remove</TactileButton>
        </div>
        {(!normalized || full || error) && <p role="alert" className="text-xs text-[var(--text-heading)] m-0">
          {error || (full ? `This project already has ${MAX_PROJECT_PALETTES} palettes.` : 'Use a hex color such as #FFAA33.')}
        </p>}
        {notice && <p role="status" className="text-xs text-[var(--text-muted)] m-0">{notice}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[var(--desk-border)] shrink-0">
        <TactileButton onClick={onClose}>Cancel</TactileButton>
        <TactileButton variant="primary" onClick={save} disabled={!valid}>Create palette</TactileButton>
      </div>
    </ModalWrapper>
  );
}
