'use client';
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlaygroundLayout } from '@/components/layout/PlaygroundLayout';
import {
  preparePractice, beginPractice, discardPractice, keepPractice,
  getPracticeSession, subscribePracticeSession,
} from '@/lib/project/practiceSession';
import { useStudioStore } from '@/stores/studioStore';
import { PracticeActionsContext } from './PracticeActions';

class PracticeBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {
    const session = getPracticeSession();
    if (session) discardPractice(session.token);
  }
  render() {
    return this.state.failed ? <PracticeMessage message="Practice could not stay open. Your original drawing has been restored." /> : this.props.children;
  }
}

function PracticeMessage({ message }: { message: string }) {
  return <main id="main-workspace" tabIndex={-1} className="min-h-dvh flex flex-col items-center justify-center gap-5 p-6 bg-[var(--desk-bg)] text-[var(--text-heading)] font-mono">
    <h1 className="text-xl">A little space to practice</h1>
    <p role="status" className="max-w-lg text-center">{message}</p>
    <Link href="/studio" className="border-2 border-[var(--desk-border)] px-4 py-2">Return to drawing</Link>
  </main>;
}

export function PracticeWorkspace() {
  const router = useRouter();
  const session = useSyncExternalStore(subscribePracticeSession, getPracticeSession, () => null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let token: string | null = null;
    void preparePractice().then(prepared => {
      if (!cancelled) token = beginPractice(prepared).token;
    }).catch(reason => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'Practice could not start safely.');
    });
    return () => {
      cancelled = true;
      if (token) discardPractice(token);
    };
  }, []);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (getPracticeSession() && useStudioStore.getState().isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const blockKeys = (event: KeyboardEvent) => {
      if (saving) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [saving]);

  const keep = async () => {
    if (!session || saving) return;
    setSaving(true);
    setError(null);
    try {
      await keepPractice(session.token);
      router.push('/studio');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Practice could not be saved.');
    } finally { setSaving(false); }
  };
  const returnToDrawing = () => {
    if (session) discardPractice(session.token);
    router.push('/studio');
  };

  return <PracticeBoundary>
    {!session ? <PracticeMessage message={error ?? 'Saving your drawing before opening fresh practice…'} /> :
      <PracticeActionsContext.Provider value={{ keep: () => { void keep(); }, returnToDrawing }}>
        <div inert={saving}>
          <PlaygroundLayout />
        </div>
        {(saving || error) && <div role="status" className="fixed bottom-36 left-1/2 -translate-x-1/2 z-50 max-w-lg border-2 border-[var(--desk-border)] bg-[var(--desk-surface)] p-4 text-[var(--text-heading)] font-mono">
          {saving ? 'Saving practice as a new drawing…' : error}
        </div>}
      </PracticeActionsContext.Provider>}
  </PracticeBoundary>;
}
