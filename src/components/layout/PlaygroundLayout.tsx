'use client';

import React, { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePracticeActions } from '@/components/playground/PracticeActions';
import { isPracticeActive } from '@/lib/project/practiceSession';
import { useStudioStore } from '@/stores/studioStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { evaluateStencilCoverage } from '@/lib/art/stencilEvaluator';
import { getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import { LeftToolbar } from './LeftToolbar';
import { CenterViewport } from './CenterViewport';
import { BottomTimeline } from './BottomTimeline';
import { ArtisanHandbookPanel } from '@/components/onboarding/ArtisanHandbookPanel';
import { OnboardingOverlay } from '@/components/onboarding/OnboardingOverlay';
import { PixiBunLogo } from '@/components/ui/PixiBunLogo';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { studioEvents } from '@/lib/events/studioEvents';
import { TeachingBoardModal } from '@/components/playground/TeachingBoardModal';

export const PlaygroundLayout: React.FC = () => {
  const practice = usePracticeActions();
  const [showTeachingBoard, setShowTeachingBoard] = React.useState(false);
  const {
    getCurrentStep,
    getCurrentFrameTemplate,
    recordAnalysis,
    setStepIndex,
  } = useOnboardingStore();

  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
  const activeLayerId = useStudioStore((s) => s.activeLayerId);
  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const canvasHeight = useStudioStore((s) => s.canvasHeight);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const canUndo = useStudioStore((s) => s.canUndo);
  const canRedo = useStudioStore((s) => s.canRedo);
  const tools = useStudioStore((s) => s.tools);
  const setBrushSize = useStudioStore((s) => s.setBrushSize);
  const setActiveTool = useStudioStore((s) => s.setActiveTool);
  const swapColors = useStudioStore((s) => s.swapColors);
  const setIsPlaying = useStudioStore((s) => s.setIsPlaying);

  const stepConfig = getCurrentStep();

  // Session ownership and initialization happen before the viewport mounts.
  useEffect(() => {
    const unsub = studioEvents.on('pixibun:open-teaching-board', () => {
      setShowTeachingBoard(true);
    });
    return () => unsub();
  }, []);

  // Stroke commit detection & rigorous mathematical stencil coverage evaluation
  const handleCommitHistory = useCallback(() => {
    if (!isPracticeActive()) return;
    const template = getCurrentFrameTemplate();
    if (!template || !activeLayerId) return;

    const buf = getOrCreateBuffer(activeLayerId, canvasWidth, canvasHeight);
    const analysis = evaluateStencilCoverage(buf.ctx, canvasWidth, canvasHeight, template);
    recordAnalysis(analysis);
  }, [getCurrentFrameTemplate, activeLayerId, canvasWidth, canvasHeight, recordAnalysis]);

  // Synchronize timeline frame selection with playground step
  const prevActiveFrameIndexRef = React.useRef(activeFrameIndex);
  const prevIsPlayingRef = React.useRef(isPlaying);

  useEffect(() => {
    if (!isPracticeActive()) return;
    // If playback just stopped (pause transition), snap step to the active paused frame
    if (prevIsPlayingRef.current && !isPlaying) {
      const { steps } = useOnboardingStore.getState();
      const targetStepIndex = steps.findIndex(
        (s) => s.type === 'DRAW_FRAME' && s.frameIndex === activeFrameIndex
      );
      if (targetStepIndex !== -1) {
        useOnboardingStore.getState().setStepIndex(targetStepIndex);
      }
    }
    prevIsPlayingRef.current = isPlaying;

    // While playing, freeze step updates so top bar and handbook do not jump or flicker
    if (isPlaying) {
      prevActiveFrameIndexRef.current = activeFrameIndex;
      return;
    }

    if (prevActiveFrameIndexRef.current !== activeFrameIndex) {
      prevActiveFrameIndexRef.current = activeFrameIndex;
      const { steps, currentStepIndex } = useOnboardingStore.getState();
      const currentStep = steps[currentStepIndex];
      if (currentStep && currentStep.type === 'DRAW_FRAME' && currentStep.frameIndex !== activeFrameIndex) {
        const targetStepIndex = steps.findIndex(
          (s) => s.type === 'DRAW_FRAME' && s.frameIndex === activeFrameIndex
        );
        if (targetStepIndex !== -1) {
          useOnboardingStore.getState().setStepIndex(targetStepIndex);
        }
      }
    }
  }, [activeFrameIndex, isPlaying]);

  // Monitor playback to automatically celebrate completion
  useEffect(() => {
    if (isPlaying && stepConfig.type === 'PLAYBACK') {
      const timer = setTimeout(() => {
        setStepIndex(stepConfig.totalSteps - 1);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, stepConfig.type, stepConfig.totalSteps, setStepIndex]);

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    studioEvents.emit('pixibun:undo');
  }, []);

  const handleRedo = useCallback(() => {
    studioEvents.emit('pixibun:redo');
  }, []);

  // Keyboard shortcuts in playground (Pen, Eraser, Undo, Redo, Play)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPracticeActive()) return;
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      const key = e.key.toLowerCase();
      switch (key) {
        case 'b':
          setActiveTool('pen');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case 'x':
          swapColors();
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, swapColors, isPlaying, setIsPlaying, handleUndo, handleRedo]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--desk-bg)] text-[var(--text-heading)] transition-colors duration-300 overflow-hidden select-none relative">
      {/* Playground Top Bar */}
      <header className="h-12 bg-[var(--desk-surface)] border-b-2 border-[var(--desk-border)] px-4 flex items-center justify-between select-none z-30 shadow-sm transition-colors duration-300">
        {/* Left: Brand + Tutorial Badge */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-95 transition-all group focus-visible:outline-none"
            title="Return to PixiBun Home"
          >
            <PixiBunLogo
              showSubtitle={false}
              className="group-hover:scale-105 transition-transform drop-shadow-sm"
            />
            <span className="text-[9px] font-mono font-bold text-[var(--accent-gold)] bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] px-1.5 py-0.5 rounded-[2px] shadow-sm select-none">
              PLAYGROUND
            </span>
          </Link>

          <div className="h-4 w-px bg-[var(--desk-border)] mx-1" />

          {/* Current Step Pill */}
          <div className="flex items-center gap-1.5 bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] px-2.5 py-1 rounded-[2px] text-xs font-mono">
            <span className="text-[var(--accent-gold)] font-bold">Step {stepConfig.stepIndex + 1}:</span>
            <span className="text-[var(--text-body)]">{stepConfig.title}</span>
          </div>
        </div>

        {/* Center: Brush Size & Undo / Redo Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] px-2 py-0.5 rounded-[2px]">
            <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] mr-0.5">Pen:</span>
            {[1, 2, 3].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setBrushSize(sz)}
                className={`px-1.5 py-0.5 rounded-[1px] text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                  tools.brushSize === sz
                    ? 'bg-[var(--accent-gold)] text-[var(--desk-bg)] border border-[#8c5120]'
                    : 'text-[var(--text-body)] hover:text-[var(--accent-gold)]'
                }`}
                title={`Set Brush Size to ${sz}px`}
              >
                {sz}px
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <TactileButton
              size="icon-sm"
              variant="default"
              disabled={!canUndo}
              onClick={handleUndo}
              title="Undo (Ctrl+Z)"
              className="w-8 h-8 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)] disabled:opacity-40"
            >
              <PixelIcon name="undo" size={13} />
            </TactileButton>

            <TactileButton
              size="icon-sm"
              variant="default"
              disabled={!canRedo}
              onClick={handleRedo}
              title="Redo (Ctrl+Y)"
              className="w-8 h-8 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)] disabled:opacity-40"
            >
              <PixelIcon name="redo" size={13} />
            </TactileButton>
          </div>
        </div>

        {/* Right: Teaching Board, Theme Toggle & Skip to Studio */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowTeachingBoard(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] bg-[var(--desk-surface-raised)] hover:bg-[var(--surface-2)] border-2 border-[#8c5120] text-xs font-mono font-bold text-[var(--accent-gold)] hover:text-[#fff] transition-all cursor-pointer shadow-sm active:translate-y-px"
            title="Open 10-Frame Jump Anatomy Teaching Board"
          >
            <span className="text-[var(--accent-gold)]">✦</span>
            <span>Teaching Board</span>
          </button>

          <button type="button" onClick={practice?.keep} disabled={!practice}
            className="border-2 border-[#8c5120] px-3 py-1.5 text-xs font-mono text-[var(--accent-gold)]">
            Keep practice in Studio
          </button>
          <ThemeToggle />

          <button
            type="button"
            onClick={practice?.returnToDrawing}
            disabled={!practice}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-[var(--desk-surface-raised)] hover:bg-[var(--surface-2)] border-2 border-[var(--desk-border)] text-xs font-mono font-bold text-[var(--text-body)] hover:text-[var(--accent-gold)] transition-all cursor-pointer shadow-sm active:translate-y-px"
            title="Restore your original drawing in Studio" aria-label="Return to drawing"
          >
            <span>Return to drawing</span>
            <span className="text-[var(--accent-gold)]">➔</span>
          </button>
        </div>
      </header>
      <p className="shrink-0 px-4 py-1.5 text-center text-xs text-[var(--text-body)] bg-[var(--desk-surface-raised)] border-b border-[var(--desk-border)]">
        A fresh sheet to try things. Keep saves a new project; Return brings your drawing back. Practice is temporary until you keep it.
      </p>

      {/* Main Workspace Area (Left Restricted Toolbar + Center Stage + Right Artisan Handbook) */}
      <div id="main-workspace" tabIndex={-1} className="flex flex-1 overflow-hidden outline-none relative">
        <LeftToolbar isPlaygroundMode={true} />
        <CenterViewport onCommitHistory={handleCommitHistory} />
        <ArtisanHandbookPanel />
      </div>

      {/* Bottom Timeline (Always present to preserve stable viewport dimensions) */}
      <BottomTimeline isPlaygroundMode={true} />

      {/* Onboarding Interactive Spotlight Overlay */}
      <OnboardingOverlay />

      {/* 10-Frame Animation Anatomy Teaching Board Modal */}
      <TeachingBoardModal
        isOpen={showTeachingBoard}
        onClose={() => setShowTeachingBoard(false)}
      />
    </div>
  );
};
