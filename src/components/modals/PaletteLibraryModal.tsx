'use client';

import { useMemo, useState } from 'react';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { useStudioStore } from '@/stores/studioStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { ARTIST_PALETTES, samePaletteColors } from '@/config/artistPalettes';
import { COZY_PALETTES } from '@/config/cozyPalettes';
import type { ColorPalette } from '@/types/palette';

export function PaletteLibraryModal({ onClose }: { onClose: () => void }) {
  const palettes = useStudioStore(s => s.palettes), selected = useStudioStore(s => s.currentPaletteId);
  const select = useStudioStore(s => s.selectPalette), add = useStudioStore(s => s.addExtractedPalette);
  const favorites = useWorkspaceStore(s => s.favoritePalettes), toggleFavorite = useWorkspaceStore(s => s.toggleFavorite);
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('all'), [count, setCount] = useState('all');
  const [previewId, setPreviewId] = useState(selected), [error, setError] = useState('');
  const catalog = useMemo(() => {
    const project: (ColorPalette & { source?: string; category: string; favoriteId: string })[] = palettes.map(p => {
      const credit = ARTIST_PALETTES.find(a => samePaletteColors(a.colors, p.colors));
      return { ...p, author: p.author ?? credit?.author, source: credit?.source, category: 'Project', favoriteId: credit?.id ?? p.id };
    });
    // PixiBun's cozy set stays reachable from projects saved before it shipped.
    const library = [...COZY_PALETTES.map(c => ({ ...c, source: undefined as string | undefined, category: 'Cozy' })), ...ARTIST_PALETTES];
    return [...project, ...library.filter(a => !palettes.some(p => samePaletteColors(p.colors, a.colors))).map(a => ({ ...a, favoriteId: a.id }))];
  }, [palettes]);
  const preview = catalog.find(p => p.id === previewId) ?? catalog[0];
  const results = catalog.filter(p => `${p.name} ${p.author ?? ''}`.toLowerCase().includes(query.toLowerCase()) &&
    (filter === 'all' || filter === 'favorites' && favorites.includes(p.favoriteId) || filter === 'project' && p.category === 'Project' || filter === 'library' && p.category !== 'Project') &&
    (count === 'all' || count === 'small' && p.colors.length <= 8 || count === 'medium' && p.colors.length > 8 && p.colors.length <= 16 || count === 'large' && p.colors.length > 16));
  const usePalette = () => {
    if (!preview) return;
    const existing = palettes.find(p => p.id === preview.id || samePaletteColors(p.colors, preview.colors));
    if (existing) { select(existing.id); onClose(); }
    else if (add(preview.name, preview.colors)) onClose();
    else setError('This palette could not be added. Check the project palette limit or free history space and try again.');
  };
  const field = 'bg-[var(--surface-0)] border border-[var(--desk-border)] px-2 py-2 text-xs';
  return <ModalWrapper isOpen onClose={onClose} title="Palette library" maxWidth="w-[760px]">
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2"><input aria-label="Search palettes" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search palettes or artists" className={`${field} flex-1 min-w-40`} />
        <select aria-label="Palette collection" value={filter} onChange={e => setFilter(e.target.value)} className={field}><option value="all">All palettes</option><option value="project">In this project</option><option value="library">Artist library</option><option value="favorites">Favorites</option></select>
        <select aria-label="Palette color count" value={count} onChange={e => setCount(e.target.value)} className={field}><option value="all">Any size</option><option value="small">2–8 colors</option><option value="medium">9–16 colors</option><option value="large">17+ colors</option></select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-4">
        <div className="grid grid-cols-2 content-start gap-2 max-h-80 overflow-y-auto pr-1" aria-label="Palette previews">{results.map(p => <div key={p.id} className={`border ${p.id === preview?.id ? 'border-[var(--accent-gold)]' : 'border-[var(--desk-border)]'} bg-[var(--surface-0)]`}>
          <button type="button" aria-label={`Preview ${p.name}`} aria-pressed={p.id === preview?.id} onClick={() => { setPreviewId(p.id); setError(''); }} className="block w-full p-2 text-left">
            <div className="grid grid-cols-8 h-12 mb-2" aria-hidden="true">{p.colors.map((c, i) => <span key={i} style={{ backgroundColor: c, gridColumn: p.colors.length < 8 ? `span ${Math.floor(8 / p.colors.length)}` : undefined }} />)}</div>
            <span className="block text-xs font-semibold truncate">{p.name}</span><span className="block text-[10px] text-[var(--text-muted)] mt-1">{p.colors.length} colors · {p.category === 'Project' ? 'In project' : p.author}</span>
          </button>
          <button type="button" aria-label={`Favorite ${p.name}`} aria-pressed={favorites.includes(p.favoriteId)} onClick={() => toggleFavorite(p.favoriteId)} className="px-2 pb-2 text-xs text-[var(--accent-gold)]">{favorites.includes(p.favoriteId) ? '★ Saved' : '☆ Favorite'}</button>
        </div>)}{results.length === 0 && <p className="col-span-2 text-sm text-[var(--text-muted)]">No palettes match these filters.</p>}</div>
        {preview && <section aria-label="Selected palette preview" className="border border-[var(--desk-border)] p-3 space-y-3">
          <h2 className="text-sm font-semibold">{preview.name}</h2>{preview.author && <p className="text-xs text-[var(--text-muted)]">By {preview.author}</p>}
          <div className="grid grid-cols-4 gap-1">{preview.colors.map((c, i) => <span key={i} className="h-6" style={{ backgroundColor: c }} title={c} />)}</div>
          <p className="text-xs text-[var(--text-muted)]">{preview.colors.length} colors. Browsing keeps your current palette and artwork unchanged.</p>
          {preview.source && <a href={preview.source} target="_blank" rel="noreferrer" className="block text-xs underline text-[var(--accent-gold)]">Artist credit on Lospec ↗</a>}
          <button type="button" onClick={usePalette} className="w-full px-2 py-2 bg-[var(--accent-gold)] text-[var(--surface-0)] text-xs font-semibold">Use palette</button>
          {error && <p role="alert" className="text-xs">{error}</p>}
        </section>}
      </div>
    </div>
  </ModalWrapper>;
}
