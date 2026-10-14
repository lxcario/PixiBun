'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ShowcaseNote } from './ShowcaseNote';
import { useQuests } from './quests';
import { Picker, ToolWindow } from './ToolKit';
import { useThemePalette } from '@/lib/theme/useThemePalette';
import { createShowcaseFrames, createShowcaseDownload, showcaseExportCode, SHOWCASE_DURATIONS, type ShowcaseExportFormat } from './showcaseExport';

const BunSheetStrip: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const palette = useThemePalette();
  useEffect(() => {
    const frames = createShowcaseFrames();
    const ctx = ref.current?.getContext('2d');
    const preview = previewRef.current?.getContext('2d');
    if (!ctx || !preview) return;
    frames.forEach((frame, i) => { ctx.fillStyle = i % 2 ? palette.surface : palette.sunken; ctx.fillRect(i * 20, 0, 20, 22); ctx.drawImage(frame, i * 20, 0); });
    let index = 0;
    let timer: ReturnType<typeof setTimeout>;
    const paint = () => {
      preview.clearRect(0, 0, 20, 22); preview.drawImage(frames[index], 0, 0);
      timer = setTimeout(() => { index = (index + 1) % frames.length; paint(); }, SHOWCASE_DURATIONS[index]);
    };
    paint();
    return () => clearTimeout(timer);
  }, [palette]);
  return <div className="flex items-center gap-3 w-full rounded-[3px] border-2 border-[var(--ink)] bg-[var(--surface-0)] p-2">
    <canvas ref={previewRef} width={20} height={22} className="w-12 h-auto shrink-0" style={{ imageRendering: 'pixelated' }} aria-label="Bun animation preview" />
    <div className="min-w-0 flex-1">
      <p className="mb-1 font-mono text-[11px] text-[var(--text-muted)]">4 frames · 20×22 · live preview</p>
      <canvas ref={ref} width={80} height={22} className="block w-full h-auto" style={{ imageRendering: 'pixelated' }} aria-label="Sprite sheet with four frames of Bun hopping" />
    </div>
  </div>;
};
export const EngineExportShowcase: React.FC = () => {
  const [activeFormat, setActiveFormat] = useState<ShowcaseExportFormat>('godot');
  const { complete } = useQuests();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const code = showcaseExportCode(activeFormat);
  const animated = activeFormat === 'apng' || activeFormat === 'gif';
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setMessage('Copied to clipboard.'); complete(2); }
    catch { setMessage('Copy could not start. Select the text or download the file.'); }
  };
  const handleDownload = async () => {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const { blob, filename } = await createShowcaseDownload(activeFormat);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = filename;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Downloaded ' + filename);
      complete(1);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Export failed. Please try again.'); }
    finally { setBusy(false); }
  };
  return <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
    <div className="lg:col-span-7 flex flex-col items-center gap-3">
      <div className="w-full max-w-[480px]">
        <Picker label="where is it going?" value={activeFormat} onChange={format => { setActiveFormat(format); setCopied(false); setMessage(''); complete(0); }} options={[
          { value: 'godot', label: 'Godot 4' }, { value: 'unity', label: 'Unity' }, { value: 'phaser', label: 'Phaser 3' }, { value: 'apng', label: 'APNG' }, { value: 'gif', label: 'GIF' },
        ]} />
      </div>
      <div className="w-full max-w-[480px]"><BunSheetStrip /></div>
      <ToolWindow name={animated ? 'bun_hop.' + activeFormat : activeFormat === 'godot' ? 'bun_spriteframes.tres' : 'bun_atlas.json'} className="max-w-[480px]">
        <p className="mb-2 text-xs text-[var(--text-muted)]">{animated ? 'Download the animation shown above.' : 'Download the sprite image, matching metadata and import instructions together.'}</p>
        <pre className="max-h-28 overflow-auto rounded-[2px] border-2 border-[var(--ink)] bg-[var(--surface-0)] p-2 font-mono text-[10px] leading-relaxed text-[var(--text-body)] select-text"><code>{code}</code></pre>
        <div className="mt-3 flex flex-wrap gap-2">
          {!animated && <button type="button" onClick={handleCopy} className="px-3 py-2 border-2 border-[var(--ink)] bg-[var(--desk-surface-raised)] font-mono text-xs text-[var(--text-heading)]">{copied ? 'Copied' : 'Copy metadata'}</button>}
          <button type="button" onClick={handleDownload} disabled={busy} className="px-3 py-2 pixel-primary-btn font-mono text-xs disabled:opacity-60">{busy ? 'Exporting…' : animated ? 'Download ' + activeFormat.toUpperCase() : 'Download game kit'}</button>
        </div>
        {message && <p role="status" className="mt-2 text-xs text-[var(--text-body)]">{message}</p>}
      </ToolWindow>
    </div>
    <ShowcaseNote kicker="into your game" title="Your pixels, ready to play." body="Take the bunny into a game project or download its animation. These files contain the same four frames shown in the preview." tips={['Choose your engine or animation format.', 'Download a complete kit, GIF or APNG.', 'Copy the metadata for your engine.']} cta="EXPORT FROM THE STUDIO" />
  </div>;
};
