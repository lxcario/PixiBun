'use client';

import { useEffect, useRef, useState } from 'react';
import { hexToHsv, hsvToHex, triangleHsv, trianglePoint } from '@/lib/color/hsvPicker';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useStudioStore } from '@/stores/studioStore';

export function ArtistColorPicker({ color, onChange }: { color: string; onChange: (color: string) => void }) {
  const shape = useWorkspaceStore(s => s.colorPicker);
  const setShape = useWorkspaceStore(s => s.setColorPicker);
  const [h, s, v] = hexToHsv(color);
  const lastHue = useRef(h);
  const hue = s === 0 || v === 0 ? lastHue.current : h;
  useEffect(() => { if (s > 0 && v > 0) lastHue.current = h; }, [h, s, v]);
  const triangleRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  useEffect(() => {
    const ctx = triangleRef.current?.getContext('2d');
    if (!ctx || shape !== 'triangle') return;
    const width = 144, height = 124, image = ctx.createImageData(width, height);
    const pure = hsvToHex(hue, 1, 1);
    const rgb = [1, 3, 5].map(i => parseInt(pure.slice(i, i + 2), 16));
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const hueWeight = 1 - y / (height - 1), black = x / (width - 1) - 0.5 * hueWeight, white = 1 - hueWeight - black;
      if (black < 0 || white < 0) continue;
      const offset = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) image.data[offset + c] = Math.round(rgb[c] * hueWeight + 255 * white);
      image.data[offset + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }, [hue, shape]);
  const updateHue = (next: number) => { lastHue.current = next; onChange(hsvToHex(next, s, v)); };
  const move = (e: React.PointerEvent<HTMLCanvasElement | HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const [sat, val] = shape === 'triangle' ? triangleHsv(x, y) : [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, 1 - y))];
    onChange(hsvToHex(hue, sat, val));
  };
  const pointer = {
    onPointerDown: (e: React.PointerEvent<HTMLCanvasElement | HTMLDivElement>) => { if (e.button !== 0) return; dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); move(e); },
    onPointerMove: (e: React.PointerEvent<HTMLCanvasElement | HTMLDivElement>) => { if (dragging.current) move(e); },
    onPointerUp: () => { dragging.current = false; }, onPointerCancel: () => { dragging.current = false; }, onLostPointerCapture: () => { dragging.current = false; },
  };
  const point = trianglePoint(s, v);
  const inputClass = 'w-full accent-[var(--accent-gold)]';
  return <div className="space-y-2 text-xs" data-testid="artist-color-picker">
    <div className="flex items-center justify-between gap-2">
      <span className="font-semibold">Color picker</span>
      <select aria-label="Color picker shape" value={shape} onChange={e => setShape(e.target.value as 'triangle' | 'square')} className="bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-sm px-1 py-1">
        <option value="triangle">Triangle</option><option value="square">Square</option>
      </select>
    </div>
    {shape === 'triangle' ? <div className="relative w-[192px] h-[192px] mx-auto">
      <div {...pointer} onPointerDown={e => { if (e.button !== 0) return; dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); const r = e.currentTarget.getBoundingClientRect(); updateHue((Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180 / Math.PI + 90 + 360) % 360); }}
        onPointerMove={e => { if (!dragging.current) return; const r = e.currentTarget.getBoundingClientRect(); updateHue((Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180 / Math.PI + 90 + 360) % 360); }}
        className="absolute inset-0 rounded-full touch-none cursor-crosshair" style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }} aria-hidden="true">
        <div className="absolute inset-[13px] rounded-full bg-[var(--desk-surface)]" />
        <span className="absolute w-3 h-3 border-2 border-white rounded-full pointer-events-none shadow-[0_0_2px_black]" style={{ left: 96 + 89 * Math.sin(hue * Math.PI / 180) - 6, top: 96 - 89 * Math.cos(hue * Math.PI / 180) - 6 }} />
      </div>
      <div className="absolute left-6 top-[13px] w-36 h-[124px] pointer-events-none">
        <canvas ref={triangleRef} width={144} height={124} {...pointer} className="w-full h-full touch-none cursor-crosshair pointer-events-auto" style={{ clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }} aria-label="Saturation and value triangle. Use the sliders below for keyboard control." role="img" />
        <span className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-white shadow-[0_0_2px_black]" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} />
      </div>
    </div> : <div {...pointer} className="relative h-36 touch-none cursor-crosshair border border-[var(--desk-border)]" role="img" aria-label="Saturation and value square. Use the sliders below for keyboard control."
      style={{ backgroundColor: hsvToHex(hue, 1, 1), backgroundImage: 'linear-gradient(to top, black, transparent), linear-gradient(to right, white, transparent)' }}>
      <span className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-white pointer-events-none shadow-[0_0_2px_black]" style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%` }} />
    </div>}
    <label className="flex items-center gap-2"><span className="w-16">Hue</span><input className={inputClass} type="range" min={0} max={359} value={Math.round(hue)} onChange={e => updateHue(Number(e.target.value))} aria-label="Picker hue" /></label>
    <label className="flex items-center gap-2"><span className="w-16">Saturation</span><input className={inputClass} type="range" min={0} max={100} value={Math.round(s * 100)} onChange={e => onChange(hsvToHex(hue, Number(e.target.value) / 100, v))} aria-label="Picker saturation" /></label>
    <label className="flex items-center gap-2"><span className="w-16">Value</span><input className={inputClass} type="range" min={0} max={100} value={Math.round(v * 100)} onChange={e => onChange(hsvToHex(hue, s, Number(e.target.value) / 100))} aria-label="Picker value" /></label>
    <div className="flex gap-2 items-center"><span className="w-7 h-7 border border-[var(--desk-border)]" style={{ backgroundColor: color }} />
      <input aria-label="Picker hex color" value={hexDraft ?? color} maxLength={7} className="w-full bg-[var(--surface-0)] border border-[var(--desk-border)] px-2 py-1 font-mono"
        onChange={e => { setHexDraft(e.target.value); if (/^#[\da-f]{6}$/i.test(e.target.value)) onChange(e.target.value); }}
        onBlur={() => { if (hexDraft && /^#[\da-f]{3}$/i.test(hexDraft)) onChange('#' + hexDraft.slice(1).split('').map(c => c + c).join('')); setHexDraft(null); }} />
    </div>
  </div>;
}

export function PinnedColorPanel({ defaultExpanded = true }: { defaultExpanded?: boolean } = {}) {
  const [target, setTarget] = useState<'primary' | 'secondary'>('primary');
  const [isCollapsed, setIsCollapsed] = useState(!defaultExpanded);
  const color = useStudioStore(s => target === 'primary' ? s.primaryColor : s.secondaryColor);
  const primary = useStudioStore(s => s.primaryColor), secondary = useStudioStore(s => s.secondaryColor);
  const setPrimary = useStudioStore(s => s.setPrimaryColor), setSecondary = useStudioStore(s => s.setSecondaryColor);
  const updateLayout = useWorkspaceStore(s => s.updateLayout);

  return (
    <section aria-label="Pinned color panel" className="border-b border-[var(--desk-border)] bg-[var(--desk-surface)]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--desk-surface-raised)]/40 border-b border-[var(--desk-border)]/50 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-[11px] text-[var(--text-heading)]">Color Wheel</span>
          <div className="flex gap-1 ml-1">
            {(['primary', 'secondary'] as const).map(t => (
              <button
                type="button"
                key={t}
                aria-pressed={target === t}
                onClick={() => setTarget(t)}
                className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-[2px] border transition-colors ${
                  target === t
                    ? 'border-[var(--accent-gold)] bg-[var(--surface-0)] font-bold text-[var(--text-heading)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                }`}
              >
                <span className="w-3 h-3 border border-[var(--desk-border)] rounded-[1px]" style={{ backgroundColor: t === 'primary' ? primary : secondary }} />
                <span>{t === 'primary' ? 'Foreground' : 'Background'}</span>
                {target === t && ' ·'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand pinned color panel' : 'Collapse pinned color panel'}
            title={isCollapsed ? 'Expand color picker' : 'Collapse color picker'}
            className="w-5 h-5 flex items-center justify-center rounded-[2px] text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-0)]"
          >
            {isCollapsed ? '▼' : '▲'}
          </button>
          <button
            type="button"
            onClick={() => updateLayout({ color: false })}
            aria-label="Unpin color panel"
            title="Unpin color panel"
            className="w-5 h-5 flex items-center justify-center rounded-[2px] text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:bg-[var(--surface-0)]"
          >
            ✕
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="p-3">
          <ArtistColorPicker color={color} onChange={target === 'primary' ? setPrimary : setSecondary} />
        </div>
      )}
    </section>
  );
}
