'use client';

import { inspectGodotKitPreflight } from '@/lib/export/godotKit';
import { useStudioStore } from '@/stores/studioStore';
import { useShallow } from 'zustand/react/shallow';

export function GodotKitExportTab({ indexed, normals, pivot, onIndexed, onNormals, onPivot, disabled }: {
  indexed: boolean; normals: boolean; pivot: 'center' | 'feet'; onIndexed: (value: boolean) => void;
  onNormals: (value: boolean) => void; onPivot: (value: 'center' | 'feet') => void; disabled: boolean;
}) {
  useStudioStore(useShallow(s => [s.frames, s.clips, s.palettes, s.currentPaletteId, s.canvasWidth, s.canvasHeight]));
  const preflight = inspectGodotKitPreflight({ indexed, normals });

  return <fieldset disabled={disabled} className="flex flex-col gap-3 text-xs text-[var(--text-body)]">
    <legend className="font-bold py-2">Godot 4.7 game kit</legend>
    <p>One ZIP with a runnable comparison scene, named clips, original frame holds and nearest pixel filtering. Exported at native size, with up to 4 million atlas pixels.</p>
    <label>Sprite anchor <select aria-label="Godot sprite anchor" value={pivot} onChange={e => onPivot(e.target.value as 'center' | 'feet')} className="bg-[var(--surface-1)] p-1">
      <option value="center">Center</option><option value="feet">Feet</option>
    </select></label>
    <label><input type="checkbox" checked={indexed} onChange={e => onIndexed(e.target.checked)} /> Include indexed palette and runtime cycling</label>
    <p className="text-[11px] text-[var(--text-muted)]">Indexed export needs 1–256 exact palette colors. Set roles and resolve duplicate colors in Palette → Roles and index bindings. Alpha is stored separately.</p>
    <label><input type="checkbox" checked={normals} onChange={e => onNormals(e.target.checked)} /> Include normal-map atlas</label>
    <p className="text-[11px] text-[var(--text-muted)]">Normal export needs exactly one Normal Facets or Normal Map layer in every frame, at full opacity with Normal blending. Godot expects X+ Y+ Z+ maps; exported values are preserved.</p>

    {/* Preflight Inspection */}
    <div className="border border-[var(--desk-border)] bg-[var(--surface-0)] p-2.5 rounded-[2px] flex flex-col gap-2 mt-1">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
        <span>Preflight inspection</span>
        <span className="text-[9px] font-normal normal-case text-[var(--text-muted)]">Live check</span>
      </div>
      <p className="text-[11px] text-[var(--text-body)]">Checks update with your project. Exact artwork colors and stored pixel buffers are checked again when exporting.</p>

      {preflight.ready.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <div className="text-[11px] font-semibold text-[var(--text-heading)] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5cdaac]" />
            <span>Ready ({preflight.ready.length})</span>
          </div>
          <ul className="text-[10px] text-[var(--text-body)] space-y-0.5 pl-3 border-l border-[#5cdaac]/30">
            {preflight.ready.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}

      {preflight.attention.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <div className="text-[11px] font-semibold text-[var(--text-heading)] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f0be7c]" />
            <span>Needs attention ({preflight.attention.length})</span>
          </div>
          <ul className="text-[11px] text-[var(--text-body)] space-y-0.5 pl-3 border-l border-[#f0be7c]/30">
            {preflight.attention.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}

      {preflight.optional.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <div className="text-[11px] font-semibold text-[var(--text-heading)] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c792df]" />
            <span>Optional improvements ({preflight.optional.length})</span>
          </div>
          <ul className="text-[10px] text-[var(--text-muted)] space-y-0.5 pl-3 border-l border-[#c792df]/30">
            {preflight.optional.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}
    </div>
  </fieldset>;
}
