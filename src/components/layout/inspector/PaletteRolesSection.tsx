'use client';
import { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import type { ColorPalette } from '@/types/palette';
import { defaultPaletteSemantics } from '@/lib/color/paletteSemantics';
import { createId } from '@/lib/engine/id';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import { studioEvents } from '@/lib/events/studioEvents';

const COMMON_ROLE_SUGGESTIONS = ['Skin', 'Outline', 'Shade', 'Highlight', 'Metal', 'Cloth', 'Glow', 'FX'];

export function PaletteRolesSection({ palette }: { palette: ColorPalette }) {
  const selection = useStudioStore(s => s.selection);
  const frames = useStudioStore(s => s.frames);
  const [index, setIndex] = useState(0), [role, setRole] = useState(palette.semantics?.entries[0]?.role ?? '');
  if (palette.colors.length < 1 || palette.colors.length > 256) return <p className="text-xs">Index roles require a palette with 1–256 colors.</p>;
  const semantics = palette.semantics ?? defaultPaletteSemantics(palette);
  const selectedIndex = Math.min(index, semantics.entries.length - 1);
  const entry = semantics.entries[selectedIndex];
  const update = useStudioStore.getState().setPaletteSemantics;

  // Duplicate color detection across registers
  const duplicateIndices = palette.colors
    .map((c, i) => (c.toLowerCase() === palette.colors[selectedIndex]?.toLowerCase() ? i : -1))
    .filter(i => i !== -1);
  const isDuplicate = duplicateIndices.length > 1;

  const locatePixels = () => {
    const state = useStudioStore.getState();
    const hex = palette.colors[selectedIndex];
    if (!hex) return;
    const clean = hex.slice(1);
    const fullHex = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const r = parseInt(fullHex.slice(0, 2), 16);
    const g = parseInt(fullHex.slice(2, 4), 16);
    const b = parseInt(fullHex.slice(4, 6), 16);

    const { canvasWidth: w, canvasHeight: h } = state;
    const activeFrame = state.frames[state.activeFrameIndex];
    if (!activeFrame) return;

    let minX = w, minY = h, maxX = -1, maxY = -1, count = 0;
    for (const layer of activeFrame.layers) {
      if (!layer.visible) continue;
      const buf = getOrCreateBuffer(layer.id, w, h);
      const data = buf.ctx.getImageData(0, 0, w, h).data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = (y * w + x) * 4;
          if (data[p + 3] > 0 && data[p] === r && data[p + 1] === g && data[p + 2] === b) {
            count++;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
    }

    if (count > 0) {
      state.setSelection({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
      studioEvents.emit('pixibun:toast', {
        type: 'success',
        message: `Found ${count} pixel${count === 1 ? '' : 's'} matching #${selectedIndex} on Frame ${state.activeFrameIndex + 1}. Selection box created.`,
      });
    } else {
      studioEvents.emit('pixibun:toast', {
        type: 'default',
        message: `No pixels matching #${selectedIndex} found on Frame ${state.activeFrameIndex + 1}.`,
      });
    }
  };

  const bind = () => {
    if (!selection || semantics.bindings.length >= 128) return;
    const state = useStudioStore.getState();
    const x = Math.max(0, Math.floor(selection.x)), y = Math.max(0, Math.floor(selection.y));
    const w = Math.min(state.canvasWidth, Math.ceil(selection.x + selection.w)) - x;
    const h = Math.min(state.canvasHeight, Math.ceil(selection.y + selection.h)) - y;
    if (w <= 0 || h <= 0) return;
    update(palette.id, { ...semantics, bindings: [...semantics.bindings, {
      id: createId('binding'), entryId: entry.id, frameId: state.frames[state.activeFrameIndex].id, x, y, w, h,
    }] });
  };

  return <details className="m-2 p-2 border border-[var(--desk-border)] text-xs text-[var(--text-body)]">
    <summary className="cursor-pointer">Roles and index bindings</summary>
    <div className="mt-2 flex flex-col gap-2">
      <p>Name palette registers for game delivery. RGBA painting does not retain duplicate-color identity; bind selections explicitly for indexed export.</p>

      <label>Palette register<select aria-label="Semantic palette register" className="w-full bg-[var(--surface-1)] p-1 text-xs"
        value={selectedIndex} onChange={e => { const next = Number(e.target.value); setIndex(next); setRole(semantics.entries[next].role); }}>
        {palette.colors.map((color, i) => <option key={i} value={i}>#{i}: {color} {semantics.entries[i].role}</option>)}
      </select></label>

      {/* Duplicate color resolution banner */}
      {isDuplicate && (
        <div className="bg-[#2b1f14] border border-[#f0be7c] p-2 rounded-[2px] text-[10px] flex flex-col gap-1.5">
          <div className="font-semibold text-[#f0be7c] flex items-center gap-1">
            <PixelIcon name="warning" size={11} />
            <span>Duplicate Color Register</span>
          </div>
          <p className="text-[#f0ded0]">
            Color {palette.colors[selectedIndex]} is shared by registers: {duplicateIndices.map(i => `#${i}`).join(', ')}.
            Indexed export requires binding selections to assign ambiguous pixels.
          </p>
          <div className="flex gap-1.5 pt-0.5">
            <TactileButton size="sm" onClick={locatePixels}>
              Locate on canvas
            </TactileButton>
            <TactileButton size="sm" variant="primary" disabled={!selection || semantics.bindings.length >= 128} onClick={bind}>
              Assign selection
            </TactileButton>
          </div>
        </div>
      )}

      <p className="break-words">Saved role: {entry.role || 'unnamed'}</p>

      <div className="flex flex-col gap-1">
        <label>Role name<input aria-label="Palette role name" className="w-full bg-[var(--surface-1)] p-1 text-xs" maxLength={64}
          value={role} onChange={e => setRole(e.target.value)} /></label>

        {/* Quick role suggestions */}
        <div className="flex flex-wrap gap-1 mt-0.5">
          {COMMON_ROLE_SUGGESTIONS.map(suggestion => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setRole(suggestion)}
              className="px-1.5 py-0.5 text-[9px] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-body)] rounded-[1px] border border-[var(--desk-border)] cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        <TactileButton size="sm" onClick={() => update(palette.id, { ...semantics,
          entries: semantics.entries.map(e => e.id === entry.id ? { ...e, role: role.trim() } : e),
        })}>Save palette role</TactileButton>
        <TactileButton size="sm" onClick={locatePixels} title="Locate pixels matching this register on the active frame">
          Locate on canvas
        </TactileButton>
        <TactileButton size="sm" disabled={!selection || semantics.bindings.length >= 128} onClick={bind}>Bind selection to register</TactileButton>
      </div>

      <p className="text-[10px] text-[var(--text-muted)]">Bindings use the selection's bounding box on the current frame. Only pixels exactly matching this register's RGB are assigned; alpha stays separate. Later matching bindings win. Drawing remains editable.</p>
      <p>{semantics.bindings.length} saved index bindings</p>
      {semantics.bindings.map(binding => <div key={binding.id} className="flex flex-col gap-1 border-t border-[var(--desk-border)] pt-1">
        <span className="break-words">{frames.some(f => f.id === binding.frameId) ? `Frame ${frames.findIndex(f => f.id === binding.frameId) + 1}` : 'Removed frame'}: #{semantics.entries.findIndex(e => e.id === binding.entryId)} at ({binding.x}, {binding.y}), {binding.w} × {binding.h}</span>
        <TactileButton size="sm" aria-label={`Remove index binding ${binding.id}`} onClick={() => update(palette.id, {
          ...semantics, bindings: semantics.bindings.filter(b => b.id !== binding.id),
        })}>Remove binding</TactileButton>
      </div>)}
    </div>
  </details>;
}
