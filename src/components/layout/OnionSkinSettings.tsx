'use client';

import { useStudioStore } from '@/stores/studioStore';
import { ModalWrapper } from '@/components/ui/ModalWrapper';

export function OnionSkinSettings({ onClose }: { onClose: () => void }) {
  const skin = useStudioStore(s => s.onionSkin), update = useStudioStore(s => s.setOnionSkin);
  return <ModalWrapper isOpen onClose={onClose} title="Onion skin settings" maxWidth="max-w-md">
    <div className="space-y-4 text-sm" data-testid="onion-skin-settings">
      <p className="text-[var(--text-muted)]">Compare the current pose with nearby frames. Ghosts are shown while playback is paused and never appear in exports.</p>
      <label className="flex gap-2 items-center"><input type="checkbox" checked={skin.enabled} onChange={e => update({ enabled: e.target.checked })} />Show onion skin</label>
      <div className="grid grid-cols-2 gap-4">{(['prev', 'next'] as const).map(direction => <div key={direction} className="space-y-3 border border-[var(--desk-border)] p-3">
        <span className="font-semibold">{direction === 'prev' ? 'Previous poses' : 'Next poses'}</span>
        <label className="block text-xs">Frames<input type="number" aria-label={`${direction === 'prev' ? 'Previous' : 'Next'} onion frames`} min={0} max={5} value={skin[direction === 'prev' ? 'prevFrames' : 'nextFrames']} onChange={e => { if (e.target.value !== '') update({ [direction === 'prev' ? 'prevFrames' : 'nextFrames']: Number(e.target.value) }); }} className="block w-full mt-1 p-2 bg-[var(--surface-0)] border border-[var(--desk-border)]" /></label>
        <label className="flex items-center justify-between text-xs">Tint<input type="color" aria-label={`${direction === 'prev' ? 'Previous' : 'Next'} onion tint`} value={skin[direction === 'prev' ? 'prevColor' : 'nextColor']} onChange={e => update({ [direction === 'prev' ? 'prevColor' : 'nextColor']: e.target.value })} className="w-10 h-7" /></label>
      </div>)}</div>
      <label className="block">Opacity · {Math.round(skin.opacity * 100)}%<input aria-label="Onion skin opacity" className="block w-full mt-2 accent-[var(--accent-gold)]" type="range" min={0} max={100} value={Math.round(skin.opacity * 100)} onChange={e => update({ opacity: Number(e.target.value) / 100 })} /></label>
      <div className="flex flex-wrap gap-2" aria-label="Onion skin presets">{[
        { name: 'Previous pose', prevFrames: 1, nextFrames: 0, opacity: 0.35 },
        { name: 'Either side', prevFrames: 1, nextFrames: 1, opacity: 0.25 },
        { name: 'Motion trail', prevFrames: 3, nextFrames: 3, opacity: 0.2 },
      ].map(p => <button type="button" key={p.name} className="px-2 py-1.5 border border-[var(--desk-border)] text-xs hover:bg-[var(--surface-2)]" onClick={() => update({ enabled: true, prevFrames: p.prevFrames, nextFrames: p.nextFrames, opacity: p.opacity, prevColor: '#ef6a70', nextColor: '#69bde8' })}>{p.name}</button>)}</div>
      <p className="text-xs text-[var(--text-muted)]">Set either side to 0 to hide it. More distant frames fade; the trail stops at the first and last frame. These settings travel with your project.</p>
      <p className="text-xs text-[var(--text-muted)]">Start with one previous pose. Check for a planted foot that slides, a torso that changes size, or a highlight that jumps. Then play at 1× to judge the timing.</p>
    </div>
  </ModalWrapper>;
}
