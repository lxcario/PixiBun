'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { isPracticeActive } from '@/lib/project/practiceSession';
import { useStudioStore } from '@/stores/studioStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { coachForFrame } from '@/lib/art/playgroundCoach';
import { isWorkspaceControlTarget, shouldIgnoreWorkspaceKey, workspaceShortcutKey } from '@/lib/input/workspaceKeyboard';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { CenterViewport } from './CenterViewport';
import { TeachingBoardModal } from '@/components/playground/TeachingBoardModal';
import { PlaygroundTopBar } from '@/components/playground/PlaygroundTopBar';
import { CoachPanel } from '@/components/playground/CoachPanel';
import { ToolDock } from '@/components/playground/ToolDock';
import { FilmStrip } from '@/components/playground/FilmStrip';
import { GhostOverlay } from '@/components/playground/GhostOverlay';
import { LessonPicker } from '@/components/playground/LessonPicker';
import { LessonCelebration } from '@/components/playground/LessonCelebration';
import { scoreActiveLayer } from '@/components/playground/useLessonActions';
import { useFrameScores, usePlaygroundUi } from '@/components/playground/playgroundUi';

/** Show or hide the tracing guide, and how strongly it shows. */
const GuideControl: React.FC = () => {
  const showStencilGuide = useOnboardingStore((s) => s.showStencilGuide);
  const toggleStencilGuide = useOnboardingStore((s) => s.toggleStencilGuide);
  const stencilOpacity = useOnboardingStore((s) => s.stencilOpacity);
  const setStencilOpacity = useOnboardingStore((s) => s.setStencilOpacity);
  return (
    <div className="pointer-events-auto flex items-center gap-2 h-10 pl-1 pr-3 rounded-[3px] border-2 border-[var(--ink)] bg-[var(--desk-surface)] shadow-[0_3px_0_var(--ink)]">
      <button
        type="button"
        aria-pressed={showStencilGuide}
        onClick={toggleStencilGuide}
        title={showStencilGuide ? 'Hide the faint guide shape' : 'Show the faint guide shape'}
        className="h-8 px-2 flex items-center gap-1.5 rounded-[2px] text-xs font-semibold text-[var(--text-heading)] hover:bg-[var(--desk-surface-raised)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
      >
        <PixelIcon name={showStencilGuide ? 'eye' : 'eye-off'} size={13} />
        Guide
      </button>
      {showStencilGuide && (
        <input
          type="range"
          aria-label="Guide strength"
          min="0.1"
          max="1"
          step="0.05"
          value={stencilOpacity}
          onChange={(e) => setStencilOpacity(parseFloat(e.target.value))}
          className="w-24 accent-[var(--accent-gold)] cursor-pointer"
        />
      )}
    </div>
  );
};

/** A small label above the canvas that names the pose being drawn (or playing). */
const CanvasCaption: React.FC = () => {
  const lesson = useOnboardingStore((s) => s.getCurrentLesson());
  const step = useOnboardingStore((s) => s.getCurrentStep());
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
  const reduceMotion = Boolean(useReducedMotion());
  const text = isPlaying
    ? 'Playing your animation'
    : step.type === 'DRAW_FRAME' && step.frameIndex !== undefined
      ? `Frame ${step.frameIndex + 1} · ${coachForFrame(lesson, step.frameIndex).title}`
      : `Frame ${activeFrameIndex + 1}`;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.p
        key={text}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
        transition={{ duration: 0.2 }}
        className="px-3 py-1.5 rounded-[2px] border-2 border-[var(--ink)] bg-[var(--desk-surface)] font-display text-xs text-[var(--text-heading)] shadow-[0_3px_0_var(--ink)]"
      >
        {isPlaying && <span aria-hidden="true" className="inline-block w-2 h-2 mr-2 bg-[var(--state-danger)] animate-pulse" />}
        {text}
      </motion.p>
    </AnimatePresence>
  );
};

/** Errors from lesson edits (for example a locked layer) would otherwise go unseen here. */
const PlaygroundToast: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = studioEvents.on('pixibun:toast', ({ message }) => {
      setToast({ message, id: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 4200);
    });
    return () => { unsub(); clearTimeout(timer); };
  }, []);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-32 left-1/2 -translate-x-1/2 z-50">
      <AnimatePresence>
        {toast && (
          <motion.p key={toast.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="max-w-md px-4 py-2.5 border-2 border-[var(--ink)] bg-[var(--desk-surface)] text-sm text-[var(--text-heading)] shadow-[0_4px_0_var(--ink)]">
            {toast.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Fill the stage at a crisp whole-number scale, leaving room for the tool dock, caption and guide control. */
function heroZoom(canvasWidth: number, canvasHeight: number, stageWidth: number, stageHeight: number) {
  const scale = Math.floor(Math.min((stageWidth - 200) / canvasWidth, (stageHeight - 150) / canvasHeight));
  return Math.max(100, Math.min(6400, scale * 100));
}

/**
 * The Playground: the canvas in the middle, a few tools beside it, one coach
 * card on the right and the flipbook of frames along the bottom.
 */
export const PlaygroundLayout: React.FC = () => {
  const [showTeachingBoard, setShowTeachingBoard] = useState(false);
  const step = useOnboardingStore((s) => s.getCurrentStep());
  const template = useOnboardingStore((s) => s.getCurrentFrameTemplate());
  const lessonId = useOnboardingStore((s) => s.activeLessonId);
  const introSeen = usePlaygroundUi((s) => Boolean(s.introSeen[lessonId]));
  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const scores = useFrameScores();

  useEffect(() => {
    usePlaygroundUi.getState().reset();
    const unsub = studioEvents.on('pixibun:open-teaching-board', () => setShowTeachingBoard(true));
    return () => unsub();
  }, []);

  // The canvas is the hero: CenterViewport fits it on open with this rule, and
  // the stage refits on resize. A manual zoom holds until then.
  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const canvasHeight = useStudioStore((s) => s.canvasHeight);
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      if (!stage.clientWidth || !stage.clientHeight) return;
      useStudioStore.getState().setZoomAndPan(heroZoom(canvasWidth, canvasHeight, stage.clientWidth, stage.clientHeight), 0, 0);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [canvasWidth, canvasHeight]);

  // Score each finished stroke against the lesson pose.
  const handleCommitHistory = useCallback(() => {
    if (isPracticeActive()) scoreActiveLayer();
  }, []);

  // Onion skin shows the previous drawing once the learner is past the first frame.
  useEffect(() => {
    if (isPracticeActive() && step.stepIndex > 0) useStudioStore.getState().setOnionSkin({ enabled: true });
  }, [step.stepIndex]);

  // Picking a frame in the filmstrip while drawing moves the lesson to that frame.
  const prevFrameRef = useRef(activeFrameIndex);
  const prevPlayingRef = useRef(isPlaying);
  useEffect(() => {
    if (!isPracticeActive()) return;
    const wasPlaying = prevPlayingRef.current;
    prevPlayingRef.current = isPlaying;
    if (isPlaying) { prevFrameRef.current = activeFrameIndex; return; }
    const changed = prevFrameRef.current !== activeFrameIndex;
    prevFrameRef.current = activeFrameIndex;
    if (!changed && !wasPlaying) return;
    const { steps, currentStepIndex, setStepIndex } = useOnboardingStore.getState();
    const current = steps[currentStepIndex];
    // Watching and finishing are their own steps; pausing there keeps the learner in place.
    if (current?.type !== 'DRAW_FRAME' || current.frameIndex === activeFrameIndex) return;
    const target = steps.findIndex((s) => s.type === 'DRAW_FRAME' && s.frameIndex === activeFrameIndex);
    if (target !== -1) setStepIndex(target);
  }, [activeFrameIndex, isPlaying]);

  // Once the learner has watched a full loop or so, the lesson is done.
  useEffect(() => {
    if (!isPlaying || step.type !== 'PLAYBACK') return;
    const { frames, fps } = useStudioStore.getState();
    const loopMs = frames.reduce((sum, frame) => sum + (frame.durationMs ?? Math.round(1000 / fps)), 0);
    const slow = usePlaygroundUi.getState().slowMotion ? 1 / 0.35 : 1;
    const timer = setTimeout(() => {
      useOnboardingStore.getState().setStepIndex(step.totalSteps - 1);
    }, Math.max(1800, loopMs * slow + 300));
    return () => clearTimeout(timer);
  }, [isPlaying, step.type, step.totalSteps]);

  // Show, don't tell: the first time a learner reaches an empty frame, ghost-draw it.
  const demoed = useRef(new Set<string>());
  const stepFrameScore = step.frameIndex !== undefined ? scores[step.frameIndex] ?? 0 : 0;
  useEffect(() => {
    if (!introSeen || step.type !== 'DRAW_FRAME' || isPlaying) return;
    const key = `${lessonId}:${step.id}`;
    if (demoed.current.has(key)) return;
    demoed.current.add(key);
    if (stepFrameScore > 0) return;
    const timer = setTimeout(() => usePlaygroundUi.getState().showDemo(), 450);
    return () => clearTimeout(timer);
    // Only a step change (or finishing the intro) should start a demo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introSeen, lessonId, step.id, step.type]);

  // Keyboard: Pen, Fill, Eraser, swap colors, Undo/Redo and Play.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPracticeActive()) return;
      if (shouldIgnoreWorkspaceKey(e) || e.altKey) return;
      const key = workspaceShortcutKey(e);
      const studio = useStudioStore.getState();
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        studioEvents.emit(e.shiftKey ? 'pixibun:redo' : 'pixibun:undo');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && key === 'y') {
        e.preventDefault();
        studioEvents.emit('pixibun:redo');
        return;
      }
      if (e.ctrlKey || e.metaKey) return;
      switch (key) {
        case 'b': studio.setActiveTool('pen'); break;
        case 'e': studio.setActiveTool('eraser'); break;
        case 'g': studio.setActiveTool('bucket'); break;
        case 'x': studio.swapColors(); break;
        case ' ':
          if (isWorkspaceControlTarget(e)) return;
          e.preventDefault();
          studio.setIsPlaying(!studio.isPlaying);
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lesson art always sits on the same warm paper as the canvas, in day and night.
  return (
    <div className="flex flex-col h-dvh w-screen bg-[var(--desk-bg)] text-[var(--text-heading)] overflow-hidden select-none relative"
      style={{ '--lesson-paper': '#fbf8f2' } as React.CSSProperties}>
      <PlaygroundTopBar />

      <div id="main-workspace" tabIndex={-1} className="flex flex-1 min-h-0 outline-none">
        <div ref={stageRef} className="relative flex-1 min-w-0 flex">
          {/* Tracing reads best on plain paper. */}
          <CenterViewport onCommitHistory={handleCommitHistory} fitZoom={heroZoom} plainPaper stageOverlay={<GhostOverlay template={template} />} />
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 z-30">
            <ToolDock />
          </div>
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-30">
            <CanvasCaption />
          </div>
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
            <GuideControl />
          </div>
        </div>
        <CoachPanel />
      </div>

      <FilmStrip />

      <LessonPicker />
      <LessonCelebration />
      <TeachingBoardModal isOpen={showTeachingBoard} onClose={() => setShowTeachingBoard(false)} />
      <PlaygroundToast />
    </div>
  );
};
