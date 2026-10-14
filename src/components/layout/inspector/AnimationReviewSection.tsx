'use client';

import { useEffect, useRef, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import PanelSection from '@/components/ui/PanelSection';
import { createId } from '@/lib/engine/id';
import { clipReviewKey, scanAnimationClip, type ClipReviewReport } from '@/lib/animation/scanClip';
import { MAX_REVIEW_EXCEPTIONS, MAX_REVIEW_REGIONS } from '@/lib/animation/reviewMetadata';
import type { ReviewRegion } from '@/types/animation';

function ReviewCanvas({ data, width, height, zoom, label, regions, shiftX = 0, shiftY = 0 }: {
  data: Uint8ClampedArray; width: number; height: number; zoom: number; label: string; regions: ReviewRegion[]; shiftX?: number; shiftY?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), -shiftX, -shiftY);
    for (const region of regions) {
      ctx.strokeStyle = region.kind === 'protect' ? '#f0be7c' : region.kind === 'contact' ? '#5cdaac' : '#c792df';
      ctx.lineWidth = 1; ctx.strokeRect(region.x + 0.5, region.y + 0.5, region.w - 1, region.h - 1);
    }
  }, [data, width, height, regions, shiftX, shiftY]);
  return <div className="min-w-0">
    <p className="mb-1 text-[10px] text-[var(--text-body)]">{label}</p>
    <div role="region" aria-label={`${label} scrollable comparison`} tabIndex={0}
      className="max-w-full overflow-auto border border-[var(--desk-border)] bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]">
      <canvas ref={ref} width={width} height={height} role="img" aria-label={label}
        style={{ width: width * zoom, height: height * zoom, maxWidth: 'none', imageRendering: 'pixelated' }} />
    </div>
  </div>;
}

export function AnimationReviewSection() {
  const clips = useStudioStore(s => s.clips);
  const clipId = useStudioStore(s => s.activeClipId);
  const frames = useStudioStore(s => s.frames);
  const selection = useStudioStore(s => s.selection);
  const clip = clips.find(c => c.id === clipId);
  const [alignMotion, setAlignMotion] = useState(true);
  const [loop, setLoop] = useState(false);
  const [zoom, setZoom] = useState(4);
  const [regionName, setRegionName] = useState('Important detail');
  const [kind, setKind] = useState<ReviewRegion['kind']>('protect');
  const [report, setReport] = useState<ClipReviewReport | null>(null);
  const [pair, setPair] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const retained = useRef<ClipReviewReport | null>(null);
  const scan = useRef<{ controller: AbortController; key: string; clipId: string } | null>(null);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (report && reportContainerRef.current) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      reportContainerRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }
  }, [report]);

  useEffect(() => {
    const unsubscribe = useStudioStore.subscribe(state => {
      const pending = scan.current;
      const held = retained.current;
      const target = state.clips.find(c => c.id === (pending?.clipId ?? held?.clipId));
      if ((pending || held) && (!target || state.activeClipId !== target.id || clipReviewKey(target) !== (pending?.key ?? held?.key))) {
        pending?.controller.abort(); scan.current = null;
        held?.dispose(); retained.current = null; setReport(null); setBusy(false);
        setMessage('Artwork or review regions changed. Scan again.');
      }
    });
    return () => { unsubscribe(); scan.current?.controller.abort(); retained.current?.dispose(); };
  }, []);

  const clear = () => {
    scan.current?.controller.abort(); scan.current = null;
    retained.current?.dispose(); retained.current = null; setReport(null); setBusy(false);
  };
  const run = async () => {
    if (!clip) return;
    clear(); setBusy(true); setMessage(''); setPair(0);
    const job = { controller: new AbortController(), key: clipReviewKey(clip), clipId: clip.id };
    scan.current = job;
    try {
      const next = await scanAnimationClip(clip, alignMotion, loop, job.controller.signal);
      if (scan.current !== job) { next.dispose(); return; }
      retained.current = next; setReport(next);
    } catch (error) {
      if (scan.current === job) setMessage(error instanceof Error ? error.message : 'Could not scan this clip.');
    } finally { if (scan.current === job) { scan.current = null; setBusy(false); } }
  };
  const addRegion = () => {
    if (!clip || !selection || !regionName.trim()) return;
    const { canvasWidth: width, canvasHeight: height } = useStudioStore.getState();
    const x = Math.max(0, Math.floor(selection.x)), y = Math.max(0, Math.floor(selection.y));
    const w = Math.min(width, Math.ceil(selection.x + selection.w)) - x;
    const h = Math.min(height, Math.ceil(selection.y + selection.h)) - y;
    if (w <= 0 || h <= 0) { setMessage('Select a region inside the artwork.'); return; }
    useStudioStore.getState().updateClip(clip.id, { review: {
      regions: [...(clip.review?.regions ?? []), { id: createId('region'), name: regionName.trim(), kind, x, y, w, h }], exceptions: [],
    } });
  };
  const transition = report?.transitions[pair];
  const from = transition && report?.frames[transition.from], to = transition && report?.frames[transition.to];
  const accepted = Boolean(report && from && to && clip?.review?.exceptions.some(mark =>
    mark.fromFrameId === from.id && mark.toFrameId === to.id && mark.signature === report.signatures[pair]));
  const toggleException = () => {
    if (!clip || !report || !from || !to || clipReviewKey(clip) !== report.key) return;
    const exceptions = (clip.review?.exceptions ?? []).filter(mark => mark.fromFrameId !== from.id || mark.toFrameId !== to.id);
    if (!accepted) exceptions.push({ fromFrameId: from.id, toFrameId: to.id, signature: report.signatures[pair] });
    if (exceptions.length > MAX_REVIEW_EXCEPTIONS) { setMessage('This clip has too many saved exceptions. Clear older marks first.'); return; }
    useStudioStore.getState().updateClip(clip.id, { review: { regions: clip.review?.regions ?? [], exceptions } });
  };

  const humanFindings: { id: string; title: string; desc: string; severity: 'info' | 'notice' | 'watch' }[] = [];
  if (transition) {
    if (transition.protectedChanged > 0) {
      humanFindings.push({
        id: 'protected',
        title: `Protected region modified: ${transition.protectedChanged} pixel${transition.protectedChanged === 1 ? '' : 's'}`,
        desc: 'Shielded detail changed between these frames.',
        severity: 'watch',
      });
    }
    if (transition.transientPixels > 0) {
      humanFindings.push({
        id: 'transient',
        title: `Single-frame flicker: ${transition.transientPixels} pixel${transition.transientPixels === 1 ? '' : 's'}`,
        desc: 'Pixel changed for one frame and reversed in the next pose.',
        severity: 'watch',
      });
    }
    const movingContacts = transition.contacts.filter(c => c.dx !== null && (Math.abs(c.dx) > 0.1 || Math.abs(c.dy!) > 0.1));
    if (movingContacts.length > 0) {
      humanFindings.push({
        id: 'contact',
        title: `Contact drift: ${movingContacts.map(c => `${c.name} (${c.dx!.toFixed(1)}, ${c.dy!.toFixed(1)} px)`).join(', ')}`,
        desc: 'Contact region shifted relative to the character.',
        severity: 'notice',
      });
    }
    if (transition.silhouetteChanged > 0 || transition.outlineChanged > 0) {
      const parts: string[] = [];
      if (transition.silhouetteChanged > 0) parts.push(`${transition.silhouetteChanged} silhouette px`);
      if (transition.outlineChanged > 0) parts.push(`${transition.outlineChanged} outline px`);
      humanFindings.push({
        id: 'silhouette',
        title: `Silhouette & outline change: ${parts.join(', ')}`,
        desc: 'Pose boundary adjusted between frames.',
        severity: 'info',
      });
    }
    if (transition.colorChanged > 0 || transition.addedColors > 0 || transition.removedColors > 0) {
      humanFindings.push({
        id: 'color',
        title: `Color & shading: ${transition.colorChanged} pixel${transition.colorChanged === 1 ? '' : 's'}`,
        desc: `Colors adjusted (${transition.addedColors > 0 ? `+${transition.addedColors} new, ` : ''}${transition.removedColors > 0 ? `-${transition.removedColors} removed` : 'shading changed'}).`,
        severity: 'info',
      });
    }
    if (humanFindings.length === 0) {
      humanFindings.push({
        id: 'clean',
        title: 'Consistent transition',
        desc: 'No silhouette, outline, or color shifts detected between these frames.',
        severity: 'info',
      });
    }
  }

  return <PanelSection title="Animation stability" defaultOpen>
    <div className="p-2 flex flex-col gap-2 text-[11px] text-[var(--text-body)]">
      <p className="text-[10px] text-[var(--text-muted)]">Non-destructive frame comparison. Intentional smears, sparkles and color cycling can be marked as expected.</p>
      <label className="flex flex-col gap-1">Review clip
        <select aria-label="Animation review clip" value={clipId ?? ''} className="w-full bg-[var(--surface-1)] p-1 border border-[var(--desk-border)]"
          onChange={event => { clear(); useStudioStore.getState().setActiveClipId(event.target.value || null); }}>
          <option value="">Choose a clip</option>
          {clips.map(c => <option key={c.id} value={c.id}>{c.name} ({c.startFrame + 1}–{c.endFrame + 1})</option>)}
        </select>
      </label>
      <TactileButton size="sm" disabled={frames.length < 2} onClick={() => useStudioStore.getState().addClip('Animation review', 0, frames.length - 1)}>Create clip from all frames</TactileButton>
      {clip && <>
        <label className="flex gap-2 items-center"><input type="checkbox" checked={alignMotion} onChange={e => { clear(); setAlignMotion(e.target.checked); }} />Align whole-sprite motion</label>
        <label className="flex gap-2 items-center"><input type="checkbox" checked={loop} onChange={e => { clear(); setLoop(e.target.checked); }} />Compare last frame to first</label>
        <p className="text-[10px] text-[var(--text-muted)]">Searches up to 3px motion. Seam check compares last frame to first.</p>
        <TactileButton size="sm" variant="primary" disabled={busy || clip.startFrame === clip.endFrame} onClick={() => void run()}>Scan animation</TactileButton>
        {busy && <TactileButton size="sm" onClick={() => { clear(); setMessage('Animation scan cancelled.'); }}>Cancel scan</TactileButton>}
        <div role="status" aria-live="polite">{busy ? 'Scanning animation…' : message}</div>
        <details className="border border-[var(--desk-border)] p-2">
          <summary className="cursor-pointer">Regions and protection ({clip.review?.regions.length ?? 0})</summary>
          <div className="mt-2 flex flex-col gap-2">
            <p>Use the selection tool, then save its rectangular bounding box. Regions stay at these canvas coordinates across this clip.</p>
            {selection ? (
              <div className="text-[10px] text-[var(--accent-sage)] bg-[var(--surface-0)] px-2 py-1 border border-[var(--desk-border)] rounded-[2px]">
                Active selection: ({Math.round(selection.x)}, {Math.round(selection.y)}) {Math.round(selection.w)}×{Math.round(selection.h)} px
              </div>
            ) : (
              <div className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-0)] px-2 py-1 border border-[var(--desk-border)] rounded-[2px]">
                Select a box on the canvas using Select Box [M] to define region coordinates.
              </div>
            )}
            <label className="flex flex-col gap-1">Region name<input aria-label="Animation region name" maxLength={64} value={regionName} onChange={e => setRegionName(e.target.value)} className="w-full bg-[var(--surface-1)] p-1 border border-[var(--desk-border)]" /></label>
            <label className="flex flex-col gap-1">Purpose<select aria-label="Animation region purpose" value={kind} onChange={e => setKind(e.target.value as ReviewRegion['kind'])} className="w-full bg-[var(--surface-1)] p-1 border border-[var(--desk-border)]">
              <option value="protect">Protect during Pixel Cleanup</option><option value="ignore">Ignore intentional motion</option><option value="contact">Watch contact drift</option>
            </select></label>
            <TactileButton size="sm" disabled={!selection || !regionName.trim() || (clip.review?.regions.length ?? 0) >= MAX_REVIEW_REGIONS} onClick={addRegion}>Save selected region</TactileButton>
            <p className="text-[10px] text-[var(--text-muted)]">Protection applies to Scan Artwork / Apply Cleanup while this clip is selected. Drawing, other filters and transforms remain editable. Changing regions clears saved exceptions.</p>
            {clip.review?.regions.map(r => <div key={r.id} className="flex flex-col gap-1 border-t border-[var(--desk-border)] pt-1">
              <span>{r.name}: {r.kind}, ({r.x}, {r.y}), {r.w} × {r.h}</span>
              <TactileButton size="sm" aria-label={`Remove region ${r.name}`} onClick={() => useStudioStore.getState().updateClip(clip.id, { review: { regions: clip.review!.regions.filter(item => item.id !== r.id), exceptions: [] } })}>Remove region</TactileButton>
            </div>)}
          </div>
        </details>
        {(clip.review?.exceptions.length ?? 0) > 0 && <TactileButton size="sm" onClick={() => useStudioStore.getState().updateClip(clip.id, { review: { regions: clip.review?.regions ?? [], exceptions: [] } })}>Clear saved exceptions</TactileButton>}
      </>}
      {report && transition && from && to && <div ref={reportContainerRef} className="flex flex-col gap-2.5 min-w-0" data-testid="animation-review-report">
        <label className="flex flex-col gap-1">Frame interval<select aria-label="Animation review interval" value={pair} onChange={e => {
          const nextPair = Number(e.target.value);
          setPair(nextPair);
          const t = report.transitions[nextPair];
          if (t) useStudioStore.getState().setActiveFrame(report.frames[t.to].index);
        }} className="bg-[var(--surface-1)] p-1 border border-[var(--desk-border)]">
          {report.transitions.map((t, i) => <option key={i} value={i}>Frame {report.frames[t.from].index + 1} → {report.frames[t.to].index + 1}</option>)}
        </select></label>
        <p>{from.durationMs} ms → {to.durationMs} ms. Motion: ({transition.shiftX}, {transition.shiftY}) px.</p>

        {/* Human-Centered Review Findings */}
        <div className="flex flex-col gap-1.5 border border-[var(--desk-border)] bg-[var(--surface-1)] p-2 rounded-[2px]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Review findings ({humanFindings.length})
          </div>
          <div className="flex flex-col gap-1">
            {humanFindings.map((finding) => (
              <button
                type="button"
                key={finding.id}
                onClick={() => {
                  useStudioStore.getState().setActiveFrame(to.index);
                }}
                className="w-full text-left p-1.5 rounded-[2px] bg-[var(--surface-2)] border border-[var(--desk-border)] hover:border-[var(--accent-gold)] cursor-pointer transition-colors"
                title="Click to focus this frame on canvas"
              >
                <div className="flex items-center gap-1.5 font-semibold text-[11px] text-[var(--text-heading)]">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    finding.severity === 'watch' ? 'bg-[var(--state-danger)]' : finding.severity === 'notice' ? 'bg-[var(--primary-bg)]' : 'bg-[var(--accent-sage)]'
                  }`} />
                  <span>{finding.title}</span>
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 pl-3">
                  {finding.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <TactileButton size="sm" aria-pressed={accepted} onClick={toggleException}>{accepted ? 'Reopen this interval' : 'Mark this change intentional'}</TactileButton>
        {accepted && <p role="status">Marked intentional for these exact frames and settings. Pixel changes require a fresh review.</p>}

        <details className="border border-[var(--desk-border)] p-2 rounded-[2px] bg-[var(--surface-0)]">
          <summary className="cursor-pointer text-[10px] text-[var(--text-muted)] font-mono hover:text-[var(--text-heading)]">Analysis details</summary>
          <ul className="list-disc pl-4 space-y-1 mt-2 text-[10px] text-[var(--text-muted)] font-mono">
            <li>Outline changes: {transition.outlineChanged}; silhouette changes: {transition.silhouetteChanged} pixels.</li>
            <li>One-frame reversals: {transition.transientPixels} pixels in the following pose, when a third frame is available.</li>
            <li>Color / alpha changes: {transition.colorChanged} pixels. Palette colors: +{transition.addedColors}, −{transition.removedColors}.</li>
            <li>Connected clusters: {transition.clustersBefore} → {transition.clustersAfter} (diagonal neighbors connect).</li>
            <li>Protected region changes: {transition.protectedChanged} pixels before motion alignment.</li>
            {transition.contacts.map((c, i) => <li key={i}>{c.name}: {c.dx === null ? 'missing content in one or both frames' : `contact center moved (${c.dx.toFixed(2)}, ${c.dy!.toFixed(2)}) px`}</li>)}
          </ul>
        </details>

        <p className="text-[10px] text-[var(--text-muted)]">These are review cues, not defects. Changes may be intentional. Color counts describe visible RGB values, not palette-register identity.</p>
        <label className="flex flex-col gap-1">Comparison zoom<select aria-label="Animation comparison zoom" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="bg-[var(--surface-1)] p-1 border border-[var(--desk-border)]"><option value={1}>1× native pixels</option><option value={4}>4× pixels</option><option value={8}>8× pixels</option></select></label>
        <ReviewCanvas data={from.data} width={report.width} height={report.height} zoom={zoom} label={`Before: frame ${from.index + 1}`} regions={report.regions} />
        <ReviewCanvas data={to.data} width={report.width} height={report.height} zoom={zoom} label={`Aligned: frame ${to.index + 1}`} regions={report.regions} shiftX={transition.shiftX} shiftY={transition.shiftY} />
        <ReviewCanvas data={transition.difference} width={report.width} height={report.height} zoom={zoom} label="Changed pixels" regions={report.regions} />
        <p className="text-[10px]">Red: disappeared. Blue: appeared. Purple: color / alpha changed. Edge changes may lie outside this view.</p>
        <TactileButton size="sm" onClick={() => useStudioStore.getState().setActiveFrame(to.index)}>Go to reviewed frame</TactileButton>
      </div>}
    </div>
  </PanelSection>;
}
