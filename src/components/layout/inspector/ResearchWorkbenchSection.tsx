'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon, type PixelIconName } from '@/components/ui/PixelIcon';
import { studioEvents } from '@/lib/events/studioEvents';
import {
  createResearchPreview,
  applyResearchPreview,
  researchSourceStatus,
  researchWorkspaceKey,
  type ResearchPreview,
} from '@/lib/research/workbench';
import type { ResearchSettings, DetailRegion, MaterialRole, TileRule } from '@/lib/research/recipes';
import type { ResearchOutput } from '@/lib/research/algorithms';

const control =
  'w-full min-w-0 min-h-8 rounded-[2px] border border-[var(--desk-border)] bg-[var(--surface-1)] p-1 text-[var(--text-body)] text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]';
const button =
  'min-h-8 rounded-[2px] border border-[var(--desk-border)] bg-[var(--surface-1)] px-2.5 py-1 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--surface-2)] hover:border-[var(--desk-border-highlight)] disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] cursor-pointer';
const primaryButton =
  'min-h-8 rounded-[2px] border border-[var(--tool-active-border)] bg-[var(--tool-active-bg)] px-3 py-1 text-xs font-semibold text-[var(--tool-active-fg)] hover:brightness-110 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] cursor-pointer';

const workflows: { id: ResearchSettings['kind']; label: string; icon: PixelIconName }[] = [
  { id: 'pixelize', label: 'Simplify', icon: 'grid' },
  { id: 'light', label: 'Light', icon: 'lamp' },
  { id: 'scene', label: 'Tiles', icon: 'grid' },
];

const rule = (): TileRule => ({ north: 'ground', east: 'ground', south: 'ground', west: 'ground', walkable: true });
function rgb(color: string): string {
  return /^#[a-f\d]{3}$/i.test(color)
    ? '#' + color.slice(1).split('').map((c) => c + c).join('')
    : color.slice(0, 7);
}

type PreviewBounds = { x: number; y: number; w: number; h: number };
function visibleBounds(width: number, height: number, images: Uint8ClampedArray[]): PreviewBounds {
  let left = width, top = height, right = -1, bottom = -1;
  for (const data of images) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!data[(y * width + x) * 4 + 3]) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  return right < 0 ? { x: 0, y: 0, w: width, h: height } : { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

function PixelView({
  data,
  width,
  height,
  scale,
  label,
  scene,
  tileSize,
  cursor,
  onCellClick,
  bounds,
}: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  scale: number;
  label: string;
  scene?: ResearchOutput;
  tileSize?: number;
  cursor?: number;
  onCellClick?: (cell: number) => void;
  bounds: PreviewBounds;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [fitWidth, setFitWidth] = useState(100);
  const instructionsId = useId();
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const measure = () => setFitWidth(Math.max(1, element.clientWidth - 8));
    measure(); const observer = new ResizeObserver(measure); observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const fittedScale = Math.min(fitWidth / bounds.w, 176 / bounds.h, 8);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(new ImageData(data.slice(), width, height), 0, 0);
    if (scene && tileSize) {
      const cols = width / tileSize;
      ctx.strokeStyle = '#ff3f85';
      ctx.lineWidth = 1;
      for (const seam of scene.seams ?? []) {
        const x = (seam.cell % cols) * tileSize;
        const y = Math.floor(seam.cell / cols) * tileSize;
        ctx.beginPath();
        if (seam.side === 'east') {
          ctx.moveTo(x + tileSize - 0.5, y);
          ctx.lineTo(x + tileSize - 0.5, y + tileSize);
        } else {
          ctx.moveTo(x, y + tileSize - 0.5);
          ctx.lineTo(x + tileSize, y + tileSize - 0.5);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(
        (cursor! % cols) * tileSize + 0.5,
        Math.floor(cursor! / cols) * tileSize + 0.5,
        tileSize - 1,
        tileSize - 1
      );
    }
  }, [data, width, height, scene, tileSize, cursor]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCellClick || !tileSize) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.floor((e.clientX - rect.left) * width / rect.width);
    const clickY = Math.floor((e.clientY - rect.top) * height / rect.height);
    const cols = width / tileSize;
    const rows = height / tileSize;
    const cellX = Math.floor(clickX / tileSize);
    const cellY = Math.floor(clickY / tileSize);
    if (cellX >= 0 && cellX < cols && cellY >= 0 && cellY < rows) {
      onCellClick(cellY * cols + cellX);
    }
  };

  return (
    <>
    <div
      ref={viewportRef}
      role="region"
      aria-label={`${label} pixel view`}
      aria-describedby={onCellClick ? instructionsId : undefined}
      tabIndex={0}
      className="overflow-auto max-h-72 border border-[var(--desk-border)] bg-[var(--desk-surface)] rounded-[2px] p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
    >
      <div data-testid={scale === 0 ? 'research-fit-content' : undefined} className={scale === 0 ? 'relative overflow-hidden mx-auto' : undefined}
        style={scale === 0 ? { width: bounds.w * fittedScale, height: bounds.h * fittedScale,
          backgroundImage: 'linear-gradient(45deg, var(--surface-2) 25%, transparent 25%, transparent 75%, var(--surface-2) 75%), linear-gradient(45deg, var(--surface-2) 25%, transparent 25%, transparent 75%, var(--surface-2) 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 8px 8px' } : undefined}>
      <canvas
        ref={ref}
        width={width}
        height={height}
        role="img"
        aria-label={label}
        onClick={handleCanvasClick}
        className={`block mx-auto ${onCellClick && tileSize ? 'cursor-pointer' : ''}`}
        style={{
          width: width * (scale || fittedScale),
          height: height * (scale || fittedScale),
          ...(scale === 0 ? { position: 'absolute', left: -bounds.x * fittedScale, top: -bounds.y * fittedScale } : {}),
          maxWidth: 'none',
          imageRendering: 'pixelated',
        }}
      />
      </div>
    </div>
    {onCellClick && tileSize && <>
      <label className="text-[11px] flex flex-col gap-1">
        Choose a scene cell
        <select aria-label="Scene preview cell" className={control} value={cursor ?? 0} onChange={(e) => onCellClick(Number(e.target.value))}>
          {Array.from({ length: width * height / tileSize ** 2 }, (_, cell) => <option key={cell} value={cell}>Cell {cell + 1} · column {cell % (width / tileSize) + 1}, row {Math.floor(cell / (width / tileSize)) + 1}</option>)}
        </select>
      </label>
      <p id={instructionsId} className="text-[11px] leading-relaxed text-[var(--text-body)]">Choose a cell above or click the preview. The direction buttons below check walkability.</p>
    </>}
    </>
  );
}

export function ResearchWorkbenchSection() {
  const state = useStudioStore();
  const palette = state.palettes.find((p) => p.id === state.currentPaletteId) ?? state.palettes[0];
  const selected = state.frames[state.activeFrameIndex]?.layers.find((l) => l.id === state.activeLayerId);
  const saved = selected?.research;

  const [kind, setKind] = useState<ResearchSettings['kind']>('pixelize');
  const [name, setName] = useState('Detail study');
  const [pixel, setPixel] = useState<Extract<ResearchSettings, { kind: 'pixelize' }>>({
    kind: 'pixelize',
    block: 1,
    candidate: 'nearest',
    colors: [],
    protected: [],
    preserveEdges: true,
  });
  const [light, setLight] = useState<Extract<ResearchSettings, { kind: 'light' }>>({
    kind: 'light',
    azimuth: 315,
    elevation: 45,
    ambient: 0.25,
    intensity: 1,
    height: 0,
    material: 'cloth',
    regions: [],
    shape: 'rounded',
  });

  const sceneSizes = Array.from({ length: 64 }, (_, i) => i + 1).filter(
    (size) =>
      state.canvasWidth % size === 0 &&
      state.canvasHeight % size === 0 &&
      (state.canvasWidth * state.canvasHeight) / size ** 2 <= 16
  );
  const defaultTile = sceneSizes[0] ?? 64;
  const [scene, setScene] = useState<Extract<ResearchSettings, { kind: 'scene' }>>({
    kind: 'scene',
    tileSize: defaultTile,
    seed: 1,
    path: 'none',
    tiles: [],
    pins: [],
  });

  const [tile, setTile] = useState(0);
  const [pinCell, setPinCell] = useState(0);
  const [role, setRole] = useState('source');
  const [regionName, setRegionName] = useState('Important detail');
  const [allClip, setAllClip] = useState(false);
  const [scale, setScale] = useState(0);
  const [pose, setPose] = useState(0);
  const [view, setView] = useState<'data' | 'specular' | 'shadow'>('data');
  const [overlay, setOverlay] = useState(true);
  const [cursor, setCursor] = useState(0);
  const [status, setStatus] = useState('');
  const [sourceStatus, setSourceStatus] = useState('Checking sources…');
  const [busy, setBusy] = useState(true);
  const [fresh, setFresh] = useState(false);
  const [more, setMore] = useState(false);
  const [preview, setPreview] = useState<ResearchPreview | null>(null);

  const previewRef = useRef<ResearchPreview | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settings = kind === 'pixelize' ? pixel : kind === 'light' ? light : scene;
  const configKey = JSON.stringify([settings, name, allClip]);
  const workspaceKey = researchWorkspaceKey();
  const previousInputs = useRef({ configKey, workspaceKey });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = preview?.frames[Math.min(pose, preview.frames.length - 1)];
  const bounds = useMemo(() => preview && current ? visibleBounds(preview.width, preview.height, [current.before, current.result[view] ?? current.result.data]) : { x: 0, y: 0, w: 1, h: 1 }, [preview, current, view]);
  const hasChanges = useMemo(() => preview?.frames.some(frame => frame.before.some((byte, i) => byte !== frame.result.data[i])) ?? false, [preview]);

  useEffect(() => () => {
    abortRef.current?.abort();
    previewRef.current?.dispose();
  }, []);

  useEffect(() => {
    const sourceChanged = workspaceKey !== previousInputs.current.workspaceKey;
    const changed = sourceChanged ? 'Artwork changed. Update the preview.' : 'Updating preview…';
    previousInputs.current = { configKey, workspaceKey };
    if (abortRef.current) abortRef.current.abort(new Error(changed));
    if (previewRef.current) setStatus(changed);
    setFresh(false);
    if (sourceChanged) {
      previewRef.current?.dispose(); previewRef.current = null; setPreview(null);
    }
  }, [configKey, workspaceKey]);

  useEffect(() => {
    let disposed = false;
    if (saved) {
      setSourceStatus('Checking sources…');
      void researchSourceStatus(saved).then((result) => {
        if (!disposed) {
          setSourceStatus(
            result === 'current'
              ? 'Source pixels are current.'
              : result === 'stale'
              ? 'Source changed: recompute this recipe.'
              : 'Source is missing: recipe cannot be recomputed.'
          );
        }
      });
    }
    return () => {
      disposed = true;
    };
  }, [saved, state.bufferVersion, state.editRevision]);

  useEffect(() => {
    const count = (state.canvasWidth * state.canvasHeight) / scene.tileSize ** 2;
    if (Number.isInteger(count) && count > 0 && count <= 16) {
      setScene((s) => (s.tiles.length === count ? s : { ...s, tiles: Array.from({ length: count }, rule), pins: [] }));
    }
    setTile(0);
  }, [state.canvasWidth, state.canvasHeight, scene.tileSize]);

  const selectWorkflow = (nextKind: ResearchSettings['kind']) => {
    if (nextKind !== kind) setBusy(true);
    setKind(nextKind);
    setMore(false);
    setName(nextKind === 'light' ? 'Shared light' : nextKind === 'scene' ? 'Scene study' : 'Detail study');
  };

  const previewAction = useCallback(async () => {
    if (autoTimer.current) { clearTimeout(autoTimer.current); autoTimer.current = null; }
    if (abortRef.current) return;
    setFresh(false);
    setBusy(true);
    setStatus('Preparing preview…');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await createResearchPreview(settings, name, allClip, controller.signal);
      if (controller.signal.aborted) {
        result.dispose();
        return;
      }
      previewRef.current?.dispose(); previewRef.current = result;
      setPreview(result);
      setFresh(true);
      setPose(0);
      setView('data');
      setCursor(settings.kind === 'scene' ? Math.max(0, result.frames[0].result.map?.findIndex((t) => settings.tiles[t].walkable) ?? 0) : 0);
      setStatus(result.frames.some(frame => frame.before.some((byte, i) => byte !== frame.result.data[i])) ? 'Preview ready. Your artwork is unchanged until Apply.' : 'No change to your pixels.');
    } catch (error) {
      if (controller.signal.aborted) {
        setStatus(controller.signal.reason instanceof Error && controller.signal.reason.name !== 'AbortError' ? controller.signal.reason.message : 'Preview cancelled.');
      } else {
        previewRef.current?.dispose(); previewRef.current = null; setPreview(null);
        setStatus((error as Error).message);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  }, [settings, name, allClip]);

  const cancelPreview = () => {
    if (autoTimer.current) { clearTimeout(autoTimer.current); autoTimer.current = null; }
    if (abortRef.current) abortRef.current.abort();
    else { setBusy(false); setStatus('Preview cancelled.'); }
  };

  useEffect(() => {
    autoTimer.current = setTimeout(() => { void previewAction(); }, 300);
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); autoTimer.current = null; };
  }, [previewAction]);

  const load = () => {
    if (!saved) return;
    setName(saved.name);
    setKind(saved.settings.kind);
    setRole(saved.settings.kind === 'pixelize' && !saved.settings.colors.length ? 'source' : 'saved');
    if (saved.settings.kind === 'pixelize') setPixel(structuredClone(saved.settings));
    if (saved.settings.kind === 'light') setLight(structuredClone(saved.settings));
    if (saved.settings.kind === 'scene') setScene(structuredClone(saved.settings));
    setStatus('Recipe loaded. Create a fresh preview before applying changes.');
  };

  const selectedRegion = (): DetailRegion => {
    const r = state.selection;
    if (!r || !regionName.trim()) throw new Error('Select a rectangle and name the detail first.');
    return { ...r, name: regionName };
  };

  const addRegion = () => {
    try {
      const r = selectedRegion();
      if ((kind === 'pixelize' ? pixel.protected.length : light.regions.length) >= 16) {
        throw new Error('Up to 16 named regions are supported.');
      }
      if (kind === 'pixelize') {
        setPixel((s) => ({ ...s, protected: [...s.protected, r] }));
      } else {
        setLight((s) => ({ ...s, regions: [...s.regions, { ...r, material: s.material }] }));
      }
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const move = (dx: number, dy: number) => {
    if (!current?.result.map) return;
    const cols = state.canvasWidth / scene.tileSize;
    const rows = state.canvasHeight / scene.tileSize;
    const x = (cursor % cols) + dx;
    const y = Math.floor(cursor / cols) + dy;
    const next = y * cols + x;
    if (x < 0 || y < 0 || x >= cols || y >= rows || !scene.tiles[current.result.map[next]].walkable) {
      setStatus('That scene cell is blocked.');
      return;
    }
    setCursor(next);
    setStatus(`Scene cursor: column ${x + 1}, row ${y + 1}.`);
  };

  const roles = [...new Set(palette.semantics?.entries.map((e) => e.role).filter(Boolean) ?? [])];
  const choice = (active: boolean) => `${button} w-full min-h-9 flex items-center justify-center text-center ${active ? 'border-[var(--accent-gold)] bg-[var(--surface-3)] text-[var(--accent-gold)] font-semibold' : ''}`;
  const apply = () => {
    if (!preview || !fresh || busy || !hasChanges) return;
    try {
      applyResearchPreview(preview); previewRef.current = null; setPreview(null);
      setStatus(`Added to ${preview.frames.length} frame${preview.frames.length === 1 ? '' : 's'}. Your original pixels are retained.`);
      studioEvents.emit('pixibun:toast', { type: 'success', message: 'New look added. Originals retained.', action: { label: 'Undo', onClick: () => studioEvents.emit('pixibun:undo') } });
    } catch (error) { setStatus((error as Error).message); }
  };
  const setPaletteRole = (next: string) => {
    setRole(next);
    if (next !== 'saved') setPixel(s => ({ ...s, colors: next === 'source' ? [] : palette.colors.filter((_, i) => next === 'all' || palette.semantics?.entries[i].role === next).map(rgb) }));
  };
  const field = (label: string, aria: string, value: number, min: number, max: number, key: 'azimuth' | 'elevation' | 'ambient' | 'intensity' | 'height', step = 1) => (
    <label className="flex flex-col gap-1 text-[11px]">{label}<input className={control} aria-label={aria} type="number" value={value} min={min} max={max} step={step} onChange={e => setLight(s => ({ ...s, [key]: Number(e.target.value) }))} /></label>
  );

  return <section aria-label="Try a new look" className="min-w-0 flex flex-col gap-3 text-xs text-[var(--text-body)]">
    <div role="tablist" aria-label="Variation intention selector" className="grid grid-cols-3 gap-2">
      {workflows.map((tab, index) => <button key={tab.id} id={`research-${tab.id}-tab`} type="button" role="tab" aria-controls="research-workflow-panel" aria-selected={kind === tab.id} tabIndex={kind === tab.id ? 0 : -1}
        ref={element => { tabRefs.current[index] = element; }} onClick={() => selectWorkflow(tab.id)} className={choice(kind === tab.id)}
        onKeyDown={event => {
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : undefined;
          if (next === undefined) return;
          event.preventDefault(); event.stopPropagation(); selectWorkflow(workflows[next].id); tabRefs.current[next]?.focus();
        }}><span className="flex items-center justify-center gap-1"><PixelIcon name={tab.icon} size={12} />{tab.label}</span></button>)}
    </div>

    <div id="research-workflow-panel" role="tabpanel" aria-labelledby={`research-${kind}-tab`} aria-busy={busy} className="flex flex-col gap-3 min-w-0">
      {current && preview && <div className="flex flex-col gap-2" data-testid="research-comparison">
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0 flex flex-col gap-1"><p className="text-center text-[11px]">Before</p><PixelView data={current.before} width={preview.width} height={preview.height} scale={scale} label="Research source" bounds={bounds} /></div>
          <div className="min-w-0 flex flex-col gap-1"><p className="text-center text-[11px]">{fresh ? 'After' : busy ? 'Updating…' : 'Previous preview'}</p><PixelView data={current.result[view] ?? current.result.data} width={preview.width} height={preview.height} scale={scale} label="Research result" bounds={bounds} scene={kind === 'scene' && overlay ? current.result : undefined} tileSize={scene.tileSize} cursor={cursor} onCellClick={kind === 'scene' ? cell => { setPinCell(cell); setCursor(cell); setStatus(`Scene cell ${cell + 1} selected.`); } : undefined} /></div>
        </div>
        {kind === 'scene' && <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={overlay} onChange={e => setOverlay(e.target.checked)} />Show border differences and scene cursor</label>
          <p className="text-center text-[11px]">{current.result.seams?.length ?? 0} border differences · {current.result.repeats ?? 0} repeated tiles</p>
          <div className="grid grid-cols-3 gap-2 w-40 mx-auto"><span /><button type="button" aria-label="Move scene cursor North" title="Move north" className={button} onClick={() => move(0, -1)}>↑</button><span /><button type="button" aria-label="Move scene cursor West" title="Move west" className={button} onClick={() => move(-1, 0)}>←</button><span className="flex items-center justify-center"><PixelIcon name="grid" size={15} /></span><button type="button" aria-label="Move scene cursor East" title="Move east" className={button} onClick={() => move(1, 0)}>→</button><span /><button type="button" aria-label="Move scene cursor South" title="Move south" className={button} onClick={() => move(0, 1)}>↓</button><span /></div>
        </div>}
      </div>}

      <fieldset className="min-w-0 flex flex-col gap-3">
        <legend className="sr-only">Simple choices</legend>
        {kind === 'pixelize' && <>
          <div className="flex flex-col gap-1.5"><p>Pixel blocks</p><div className="grid grid-cols-4 gap-2">{[{ size: 1, label: 'Original' }, { size: 2, label: '2px' }, { size: 4, label: '4px' }, { size: 8, label: '8px' }].map(preset => <button key={preset.size} type="button" aria-pressed={pixel.block === preset.size && (preset.size !== 1 || !pixel.colors.length)} className={choice(pixel.block === preset.size && (preset.size !== 1 || !pixel.colors.length))} onClick={() => { setPixel(s => ({ ...s, block: preset.size, ...(preset.size === 1 ? { colors: [] } : {}) })); if (preset.size === 1) setRole('source'); }}>{preset.label}</button>)}</div>{pixel.block > 1 && <p className="text-[11px] text-[var(--text-muted)]">Larger blocks remove small details.</p>}</div>
          {pixel.block > 1 && <><label className="flex items-center gap-2"><input type="checkbox" checked={!!pixel.preserveEdges} onChange={e => setPixel(s => ({ ...s, preserveEdges: e.target.checked }))} />Keep outlines</label>{!pixel.preserveEdges && <p className="text-[11px]">Blocks can replace outlines and small details.</p>}<div className="flex flex-col gap-1.5"><p>Style</p><div className="grid grid-cols-3 gap-2">{[{ id: 'average', label: 'Blend', hint: 'Blends each block' }, { id: 'contrast', label: 'Strongest', hint: 'Uses the most contrasting color' }, { id: 'nearest', label: 'Sample', hint: 'Uses a center pixel' }].map(candidate => <button key={candidate.id} type="button" title={candidate.hint} aria-pressed={pixel.candidate === candidate.id} className={choice(pixel.candidate === candidate.id)} onClick={() => setPixel(s => ({ ...s, candidate: candidate.id as typeof s.candidate }))}>{candidate.label}</button>)}</div></div></>}
        </>}
        {kind === 'light' && <>
          <div className="flex flex-col gap-1.5"><p className="text-center">Light comes from</p><div className="grid grid-cols-3 gap-2 w-32 mx-auto">
            {[{ deg: 315, arrow: '↖', name: 'top left' }, { deg: 0, arrow: '↑', name: 'top' }, { deg: 45, arrow: '↗', name: 'top right' }, { deg: 270, arrow: '←', name: 'left' }, null, { deg: 90, arrow: '→', name: 'right' }, { deg: 225, arrow: '↙', name: 'bottom left' }, { deg: 180, arrow: '↓', name: 'bottom' }, { deg: 135, arrow: '↘', name: 'bottom right' }].map((direction, i) => direction ? <button key={direction.deg} type="button" aria-label={`Light from ${direction.name}`} title={direction.name} aria-pressed={light.azimuth === direction.deg} className={`${choice(light.azimuth === direction.deg)} aspect-square`} onClick={() => setLight(s => ({ ...s, azimuth: direction.deg }))}><span className="text-lg">{direction.arrow}</span></button> : <span key={`center-${i}`} className="flex items-center justify-center text-[var(--accent-gold)]"><PixelIcon name="lamp" size={22} /></span>)}
          </div></div>
          <label className="flex flex-col gap-1.5">Brightness<input type="range" aria-label="Light brightness" min={0} max={2} step={0.05} value={light.intensity} aria-valuetext={`${Math.round(light.intensity * 100)} percent`} onChange={e => setLight(s => ({ ...s, intensity: Number(e.target.value) }))} className="w-full accent-[var(--accent-gold)]" /></label>
          {!state.frames[state.activeFrameIndex]?.layers.some(layer => layer.tag === 'normal-map') && <p className="text-[11px]">{light.shape === 'rounded' ? 'Rounded shape estimated from your outline.' : 'Flat shape: direction only affects cast shadows.'}</p>}
          <div className="flex flex-col gap-1.5"><p>Surface</p><div className="grid grid-cols-2 gap-2">{[{ id: 'cloth', label: 'Cloth' }, { id: 'metal', label: 'Metal' }, { id: 'skin', label: 'Skin' }, { id: 'emissive', label: 'Glow' }].map(material => <button key={material.id} type="button" aria-pressed={light.material === material.id} className={choice(light.material === material.id)} onClick={() => setLight(s => ({ ...s, material: material.id as MaterialRole }))}>{material.label}</button>)}</div></div>
          <div className="grid grid-cols-2 gap-2"><button type="button" className={choice(!allClip)} aria-pressed={!allClip} onClick={() => setAllClip(false)}>This frame</button><button type="button" className={choice(allClip)} aria-pressed={allClip} onClick={() => setAllClip(true)}>Whole clip</button></div>
        </>}
        {kind === 'scene' && <>
          <div className="grid grid-cols-2 gap-2 items-end"><label className="flex flex-col gap-1 text-[11px]">Tile size<select aria-label="Scene tile size" className={control} value={scene.tileSize} onChange={e => setScene(s => ({ ...s, tileSize: Number(e.target.value), tiles: [], pins: [] }))}>{!sceneSizes.includes(scene.tileSize) && <option value={scene.tileSize}>{scene.tileSize}px · does not fit</option>}{sceneSizes.map(n => <option key={n} value={n}>{n}px</option>)}</select></label><button type="button" className={button} onClick={() => setScene(s => ({ ...s, seed: (s.seed + 1) >>> 0 }))}>Shuffle layout</button></div>
          {!sceneSizes.length && <p>Use a canvas that splits into 16 tiles or fewer.</p>}
          <div className="flex flex-col gap-1.5"><p>Leave a walking route</p><div className="grid grid-cols-3 gap-2">{[{ id: 'none', label: 'Any' }, { id: 'horizontal', label: 'Across' }, { id: 'vertical', label: 'Down' }].map(path => <button key={path.id} type="button" aria-pressed={scene.path === path.id} className={choice(scene.path === path.id)} onClick={() => setScene(s => ({ ...s, path: path.id as typeof s.path }))}>{path.label}</button>)}</div></div>
        </>}

        {kind !== 'scene' && <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-2"><button type="button" className={button} onClick={() => state.setActiveTool('select-box')}>Select an area</button><button type="button" className={button} disabled={!state.selection} onClick={addRegion}>{kind === 'pixelize' ? 'Keep this detail' : 'Use surface here'}</button></div>
          <p className="text-[11px] text-center text-[var(--text-muted)]">{state.selection ? `${state.selection.w}×${state.selection.h} pixels selected` : 'Drag a box on your artwork.'}</p>
          {(kind === 'pixelize' ? pixel.protected : light.regions).map((region, i) => <div key={i} className="flex items-center justify-between gap-2"><span className="min-w-0 break-words">{region.name} ({region.w} × {region.h})</span><button type="button" className={button} aria-label={`Remove research region ${i + 1}`} onClick={() => kind === 'pixelize' ? setPixel(s => ({ ...s, protected: s.protected.filter((_, n) => n !== i) })) : setLight(s => ({ ...s, regions: s.regions.filter((_, n) => n !== i) }))}>Remove</button></div>)}
        </div>}

        <details open={more} onToggle={event => setMore(event.currentTarget.open)} className="border-t border-[var(--desk-border)] pt-2">
          <summary className="cursor-pointer text-[11px] text-[var(--text-body)]">More options</summary>
          <div className="mt-3 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[11px]">New layer name<input aria-label="Research recipe name" className={control} maxLength={64} value={name} onChange={e => setName(e.target.value)} /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-[11px]">View size<select aria-label="Research preview scale" className={control} value={scale} onChange={e => setScale(Number(e.target.value))}><option value={0}>Fit artwork</option><option value={1}>1× canvas</option><option value={4}>4× canvas</option></select></label>
              <label className="flex flex-col gap-1 text-[11px]">Frame<select aria-label="Research preview pose" className={control} value={pose} disabled={!preview} onChange={e => setPose(Number(e.target.value))}>{preview ? preview.frames.map((f, i) => <option key={f.index} value={i}>Frame {f.index + 1}</option>) : <option value={0}>Current frame</option>}</select></label>
            </div>
            {kind === 'light' && <label className="flex flex-col gap-1 text-[11px]">Show<select aria-label="Shared light preview output" className={control} value={view} onChange={e => setView(e.target.value as typeof view)}><option value="data">Full result</option><option value="specular">Shine only</option><option value="shadow">Shadow only</option></select></label>}
            {kind === 'pixelize' && <>
              <div className="grid grid-cols-2 gap-2"><label className="flex flex-col gap-1 text-[11px]">Exact pixel size<select aria-label="Simplification block size" className={control} value={pixel.block} onChange={e => setPixel(s => ({ ...s, block: Number(e.target.value) }))}>{Array.from({ length: 16 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}px</option>)}</select></label><label className="flex flex-col gap-1 text-[11px]">Style<select aria-label="Simplification candidate" className={control} value={pixel.candidate} onChange={e => setPixel(s => ({ ...s, candidate: e.target.value as typeof s.candidate }))}><option value="average">Blend</option><option value="contrast">Strongest</option><option value="nearest">Sample</option></select></label></div>
              <label className="flex flex-col gap-1 text-[11px]">Color changes<select aria-label="Allowed palette role" className={control} value={role} onChange={e => setPaletteRole(e.target.value)}><option value="source">Keep artwork colors</option>{role === 'saved' && <option value="saved">Saved palette restriction</option>}<option value="all">Replace with active palette</option>{roles.map(r => <option key={r} value={r}>Replace with {r} colors</option>)}</select></label>{pixel.colors.length > 0 && <p className="text-[11px]">Palette remapping is on: unprotected colors will change.</p>}
            </>}
            {kind === 'light' && <>
              <label className="flex flex-col gap-1 text-[11px]">Shape without a Normal layer<select aria-label="Light fallback shape" className={control} value={light.shape ?? 'flat'} onChange={e => setLight(s => ({ ...s, shape: e.target.value as 'flat' | 'rounded' }))}><option value="rounded">Estimate rounded shape</option><option value="flat">Flat surface</option></select></label>
              <div className="grid grid-cols-2 gap-2">{field('Direction (°)', 'Shared light azimuth', light.azimuth, 0, 359, 'azimuth')}{field('Height of light (°)', 'Shared light elevation', light.elevation, 5, 90, 'elevation')}{field('Fill light', 'Shared light ambient', light.ambient, 0, 1, 'ambient', 0.05)}{field('Brightness', 'Shared light intensity', light.intensity, 0, 2, 'intensity', 0.05)}{field('Shadow distance', 'Shared light height', light.height, 0, 16, 'height')}<label className="flex flex-col gap-1 text-[11px]">Surface<select aria-label="Shared light material" className={control} value={light.material} onChange={e => setLight(s => ({ ...s, material: e.target.value as MaterialRole }))}>{['cloth', 'metal', 'skin', 'emissive'].map(m => <option key={m} value={m}>{m === 'emissive' ? 'Glow' : m}</option>)}</select></label></div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={allClip} onChange={e => setAllClip(e.target.checked)} />Use this rig across the active clip (all frames if no clip)</label>
              <p className="text-[11px]">A Normal layer takes priority over the estimated shape. Each frame needs an original color layer with the same name.</p>
            </>}
            {kind !== 'scene' && <><label className="flex flex-col gap-1 text-[11px]">Area name<input aria-label="Research detail name" className={control} maxLength={64} value={regionName} onChange={e => setRegionName(e.target.value)} /></label><button type="button" className={button} onClick={addRegion}>{kind === 'pixelize' ? 'Protect selected rectangle' : 'Assign material to selected rectangle'}</button></>}
            {kind === 'scene' && <>
              <div className="grid grid-cols-2 gap-2"><label className="flex flex-col gap-1 text-[11px]">Layout number<input aria-label="Scene seed" className={control} type="number" min={0} max={4294967295} value={scene.seed} onChange={e => setScene(s => ({ ...s, seed: Number(e.target.value) }))} /></label><label className="flex flex-col gap-1 text-[11px]">Walking route<select aria-label="Scene walkable path" className={control} value={scene.path} onChange={e => setScene(s => ({ ...s, path: e.target.value as typeof s.path }))}><option value="none">Any</option><option value="horizontal">Across</option><option value="vertical">Down</option></select></label></div>
              <label className="flex flex-col gap-1 text-[11px]">Tile to edit<select aria-label="Scene atlas tile" className={control} value={tile} onChange={e => setTile(Number(e.target.value))}>{scene.tiles.map((_, i) => <option key={i} value={i}>Tile {i + 1}</option>)}</select></label>
              {scene.tiles[tile] && <><div className="grid grid-cols-2 gap-2">{(['north', 'east', 'south', 'west'] as const).map(side => <label key={side} className="flex flex-col gap-1 text-[11px]">{side[0].toUpperCase() + side.slice(1)} edge<input aria-label={`Tile ${side} edge`} className={control} maxLength={24} value={scene.tiles[tile][side]} onChange={e => setScene(s => ({ ...s, tiles: s.tiles.map((t, i) => i === tile ? { ...t, [side]: e.target.value } : t) }))} /></label>)}</div><label className="flex items-center gap-2"><input type="checkbox" checked={scene.tiles[tile].walkable} onChange={e => setScene(s => ({ ...s, tiles: s.tiles.map((t, i) => i === tile ? { ...t, walkable: e.target.checked } : t) }))} />Tile is walkable</label></>}
              <p className="text-[11px]">Matching edge names allow tiles to join. Pink lines show pixel differences, not blocked paths.</p>
              <div className="grid grid-cols-2 gap-2 items-end"><label className="flex flex-col gap-1 text-[11px]">Pin to cell<select aria-label="Pinned scene cell" className={control} value={pinCell} onChange={e => setPinCell(Number(e.target.value))}>{scene.tiles.map((_, i) => <option key={i} value={i}>Cell {i + 1}</option>)}</select></label><button type="button" className={button} onClick={() => setScene(s => ({ ...s, pins: [...s.pins.filter(p => p.cell !== pinCell), { cell: pinCell, tile }] }))}>Pin chosen tile to cell</button></div>
              <p className="text-[11px]">{scene.pins.map(p => `Cell ${p.cell + 1} → tile ${p.tile + 1}`).join(', ') || 'No pinned cells.'}</p><button type="button" className={button} onClick={() => setScene(s => ({ ...s, pins: [] }))}>Clear scene pins</button>
            </>}
          </div>
        </details>
      </fieldset>

      {saved && <div className="flex flex-col gap-1.5 border-t border-[var(--desk-border)] pt-2"><p role="status" className="text-[11px]">{sourceStatus}</p><button type="button" aria-label="Load saved recipe" className={button} onClick={load} disabled={busy}>Use saved settings</button></div>}
      {current && <details className="text-[11px]"><summary className="cursor-pointer">About this result</summary><div className="mt-2 flex flex-col gap-1">{current.result.notes.map(note => <p key={note}>{note}</p>)}</div></details>}
      {status && <p role="status" className="text-[11px] leading-relaxed break-words">{status}</p>}
      <div data-testid="research-actions" className="sticky bottom-0 z-10 border-t border-[var(--desk-border)] bg-[var(--desk-surface)] pt-2 pb-2 flex flex-col gap-2">
      <div className={`grid ${busy || current && fresh ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
        {busy ? <button type="button" className={button} disabled>Updating preview…</button> : <button type="button" aria-label="Create research preview" className={current ? button : primaryButton} onClick={previewAction}>{current ? 'Update preview' : 'Preview my artwork'}</button>}
        {busy && <button type="button" className={button} onClick={cancelPreview}>Cancel preview</button>}
        {!busy && current && fresh && <button type="button" aria-label="Apply research preview" className={primaryButton} onClick={apply} disabled={!hasChanges}>{hasChanges ? 'Apply' : 'No change'}</button>}
      </div>
      <p className="text-center text-[10px] text-[var(--text-muted)]">Adds an editable layer. Undo restores this change.</p>
      </div>
    </div>
  </section>;
}
