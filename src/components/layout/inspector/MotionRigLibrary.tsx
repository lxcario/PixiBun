'use client';

import { useEffect, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { deleteMotionRig, openMotionRig, saveMotionRig, motionRigSourceReason } from '@/lib/animation/motionRigWorkspace';
import { useShallow } from 'zustand/react/shallow';

export function MotionRigLibrary() {
  const state = useStudioStore(useShallow(s => ({ motionPart: s.motionPart, motionRigs: s.motionRigs,
    hasFloatingSelection: s.hasFloatingSelection, frames: s.frames, canvasWidth: s.canvasWidth,
    canvasHeight: s.canvasHeight, bufferVersion: s.bufferVersion })));
  const partId = state.motionPart?.id;
  const [name, setName] = useState('Motion 1');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    setName(useStudioStore.getState().motionRigs.find(r => r.part.id === partId)?.name ?? 'Motion 1');
    setMessage('');
  }, [partId]);
  const run = async (operation: () => Promise<{ ok: true } | { ok: false; reason: string }>) => {
    setBusy(true); setMessage('');
    try {
      const result = await operation();
      setMessage(result.ok ? 'Motion rig ready. Save your project to keep it.' : result.reason);
    } finally { setBusy(false); }
  };
  if (!state.motionPart && !state.motionRigs.length) return null;
  return <section data-testid="motion-rig-library" aria-label="Saved motion rigs" className="p-3 space-y-2 text-xs border border-[var(--desk-border)]">
    <h3 className="font-bold">Saved motion rigs</h3>
    {state.motionPart && <form onSubmit={e => { e.preventDefault(); void run(() => saveMotionRig(name)); }} className="space-y-2">
      <label className="block">Rig name <input aria-label="Rig name" value={name} maxLength={80} onChange={e => setName(e.target.value)} className="w-full p-1 bg-[var(--surface-0)] border border-[var(--desk-border)]" /></label>
      <button type="submit" disabled={busy || !name.trim()} className="pixel-tactile-btn p-2">Save motion rig</button>
    </form>}
    <p className="text-[var(--text-muted)]">Each rig keeps one part, its selection, pivot and poses. Opening checks the saved artwork.</p>
    {state.hasFloatingSelection && <p role="status">Commit or cancel the floating selection before opening a rig.</p>}
    {state.motionRigs.map(rig => {
      const reason = motionRigSourceReason(rig, state);
      return <div key={rig.id} className="border-t border-[var(--desk-border)] pt-2 space-y-1">
        <p>{rig.name}</p>
        {reason && <p className="text-[var(--text-muted)]">{reason}</p>}
        <div className="flex gap-2">
          <button type="button" aria-label={`Open rig ${rig.name}`} disabled={busy || !!state.motionPart || state.hasFloatingSelection || !!reason} onClick={() => { void run(() => openMotionRig(rig.id)); }} className="pixel-tactile-btn p-1">Open</button>
          <button type="button" aria-label={`Delete rig ${rig.name}`} disabled={busy} onClick={() => {
            const result = deleteMotionRig(rig.id); setMessage(result.ok ? 'Rig removed. Undo restores it.' : result.reason);
          }} className="pixel-tactile-btn p-1">Delete</button>
        </div>
      </div>;
    })}
    {message && <p role="status">{message}</p>}
  </section>;
}
