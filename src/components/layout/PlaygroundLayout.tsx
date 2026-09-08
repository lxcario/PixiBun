'use client';

import React, { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStudioStore } from '@/stores/studioStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { evaluateStencilCoverage } from '@/lib/art/stencilEvaluator';
import { getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import { LeftToolbar } from './LeftToolbar';
import { CenterViewport } from './CenterViewport';
import { BottomTimeline } from './BottomTimeline';
import { ArtisanHandbookPanel } from '@/components/onboarding/ArtisanHandbookPanel';
import { OnboardingOverlay } from '@/components/onboarding/OnboardingOverlay';
import { BunMascot } from '@/components/ui/BunMascot';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { studioEvents } from '@/lib/events/studioEvents';

export const PlaygroundLayout: React.FC = () => {
  const router = useRouter();
  const {
    getCurrentStep,
    getCurrentFrameTemplate,
    recordAnalysis,
    setStepIndex,
  } = useOnboardingStore();

  const {
    frames,
    activeLayerId,
    canvasWidth,
    canvasHeight,
    isPlaying,
    canUndo,
    canRedo,
    tools,
    setBrushSize,
    setActiveTool,
    swapColors,
    setIsPlaying,
  } = useStudioStore();

  const stepConfig = getCurrentStep();

  // Initialize playground state and brush size on mount
  useEffect(() => {
    useOnboardingStore.getState().startPlayground();
    setBrushSize(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stroke commit detection & rigorous mathematical stencil coverage evaluation
  const handleCommitHistory = useCallback(() => {
    const template = getCurrentFrameTemplate();
    if (!template || !activeLayerId) return;

    const buf = getOrCreateBuffer(activeLayerId, canvasWidth, canvasHeight);
    const analysis = evaluateStencilCoverage(buf.ctx, canvasWidth, canvasHeight, template);
    recordAnalysis(analysis);
  }, [getCurrentFrameTemplate, activeLayerId, canvasWidth, canvasHeight, recordAnalysis]);

  // Monitor frame additions when user clicks + Frame on timeline
  const prevFramesCountRef = React.useRef(frames.length);
  useEffect(() => {
    if (frames.length > prevFramesCountRef.current) {
      if (stepConfig.type === 'DRAW_FRAME' && stepConfig.frameIndex !== undefined) {
        if (frames.length - 1 > stepConfig.frameIndex) {
          useOnboardingStore.getState().nextStep();
        }
      }
    }
    prevFramesCountRef.current = frames.length;
  }, [frames.length, stepConfig.type, stepConfig.frameIndex]);

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
            className="flex items-center gap-2 hover:opacity-90 transition-opacity focus-visible:outline-none"
            title="Return to PixiBun Home"
          >
            <div className="w-7 h-7 flex items-center justify-center bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] p-0.5 shadow-sm">
              <BunMascot size={18} animate />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display font-bold text-xs tracking-wider text-[var(--text-heading)]">
                PIXIBUN
              </span>
              <span className="text-[9px] font-mono font-bold text-[var(--accent-gold)]">
                PLAYGROUND
              </span>
            </div>
          </Link>

          <div className="h-4 w-px bg-[var(--desk-border)] mx-1" />

          {/* Current Step Pill */}
          <div className="flex items-center gap-1.5 bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] px-2.5 py-1 rounded-[2px] text-xs font-mono">
            <span className="text-[#f0be7c] font-bold">Step {stepConfig.stepIndex + 1}:</span>
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
                    ? 'bg-[#f0be7c] text-[#140d1f] border border-[#8c5120]'
                    : 'text-[var(--text-body)] hover:text-[#f0be7c]'
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
              className="w-8 h-8 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] disabled:opacity-40"
            >
              <PixelIcon name="undo" size={13} />
            </TactileButton>

            <TactileButton
              size="icon-sm"
              variant="default"
              disabled={!canRedo}
              onClick={handleRedo}
              title="Redo (Ctrl+Y)"
              className="w-8 h-8 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] disabled:opacity-40"
            >
              <PixelIcon name="redo" size={13} />
            </TactileButton>
          </div>
        </div>

        {/* Right: Theme Toggle & Skip to Studio */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          <button
            type="button"
            onClick={() => router.push('/studio?fromPlayground=true')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-[var(--desk-surface-raised)] hover:bg-[#2e2040] border-2 border-[var(--desk-border)] text-xs font-mono font-bold text-[var(--text-body)] hover:text-[#f0be7c] transition-all cursor-pointer shadow-sm active:translate-y-px"
            title="Skip onboarding and enter the full studio"
          >
            <span>Skip to Studio</span>
            <span className="text-[#f0be7c]">➔</span>
          </button>
        </div>
      </header>

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
    </div>
  );
};
