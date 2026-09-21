'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore, generateLessonSteps } from '@/stores/onboardingStore';
import { useStudioStore } from '@/stores/studioStore';
import { PLAYGROUND_LESSONS, getTemplateRows, getTemplateGridSize } from '@/lib/art/playgroundLessons';
import { BunMascot } from '@/components/ui/BunMascot';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { getOrCreateBuffer, touchBuffer } from '@/lib/engine/bufferRegistry';
import { TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';
import { evaluateStencilCoverage } from '@/lib/art/stencilEvaluator';
import { studioEvents } from '@/lib/events/studioEvents';

export const ArtisanHandbookPanel: React.FC = () => {
  const router = useRouter();
  const {
    currentStepIndex,
    setStepIndex,
    nextStep,
    prevStep,
    activeLessonId,
    selectLesson,
    showStencilGuide,
    toggleStencilGuide,
    stencilOpacity,
    setStencilOpacity,
    isFrameDrawingComplete,
    latestAnalysis,
    recordAnalysis,
    getCurrentLesson,
    getCurrentStep,
    getCurrentFrameTemplate,
  } = useOnboardingStore();

  const {
    frames,
    activeLayerId,
    canvasWidth,
    canvasHeight,
    addFrame,
    setActiveFrame,
    bumpBufferVersion,
    isPlaying,
    setIsPlaying,
  } = useStudioStore();

  const lesson = getCurrentLesson();
  const stepConfig = getCurrentStep();
  const currentTemplate = getCurrentFrameTemplate();
  const steps = generateLessonSteps(lesson);
  const isComplete = stepConfig.type === 'COMPLETE';
  const isDrawingStep = stepConfig.type === 'DRAW_FRAME';

  // Copy template pixels directly onto active canvas layer and trigger completion
  const handleTraceTemplate = useCallback(() => {
    if (!currentTemplate || !activeLayerId) return;
    const buf = getOrCreateBuffer(activeLayerId, canvasWidth, canvasHeight);
    const ctx = buf.ctx;
    ctx.imageSmoothingEnabled = false;

    const rows = getTemplateRows(currentTemplate);
    const gridSize = getTemplateGridSize(currentTemplate);
    const cellW = canvasWidth / gridSize;
    const cellH = canvasHeight / gridSize;

    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const char = row[x];
        if (char === '.') continue;
        const color = TEMPLATE_PALETTE[char];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(
            Math.floor(x * cellW),
            Math.floor(y * cellH),
            Math.max(1, Math.ceil(cellW)),
            Math.max(1, Math.ceil(cellH))
          );
        }
      }
    });

    touchBuffer(activeLayerId);
    bumpBufferVersion();
    const analysis = evaluateStencilCoverage(ctx, canvasWidth, canvasHeight, currentTemplate);
    recordAnalysis(analysis);
  }, [currentTemplate, activeLayerId, canvasWidth, canvasHeight, bumpBufferVersion, recordAnalysis]);

  // Clear current frame layer
  const handleClearFrame = useCallback(() => {
    if (!activeLayerId) return;
    const buf = getOrCreateBuffer(activeLayerId, canvasWidth, canvasHeight);
    buf.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    touchBuffer(activeLayerId);
    bumpBufferVersion();
    if (currentTemplate) {
      const analysis = evaluateStencilCoverage(buf.ctx, canvasWidth, canvasHeight, currentTemplate);
      recordAnalysis(analysis);
    }
  }, [activeLayerId, canvasWidth, canvasHeight, bumpBufferVersion, currentTemplate, recordAnalysis]);

  const handleNextAction = useCallback(() => {
    if (stepConfig.type === 'DRAW_FRAME' && stepConfig.frameIndex !== undefined) {
      const nextFrameIdx = stepConfig.frameIndex + 1;
      if (nextFrameIdx < lesson.totalFrames) {
        if (frames.length <= nextFrameIdx) {
          addFrame();
        }
        setActiveFrame(nextFrameIdx);
      }
    }
    nextStep();
  }, [stepConfig, lesson.totalFrames, frames.length, addFrame, setActiveFrame, nextStep]);

  const displayPercent = latestAnalysis ? latestAnalysis.completionScore : 0;

  return (
    <aside className="w-80 bg-[var(--desk-surface)] border-l-2 border-[var(--desk-border)] flex flex-col justify-between select-none z-20 shadow-lg text-[var(--text-heading)] transition-colors duration-300 overflow-y-auto">
      {/* 1. Header: Lesson Switcher & Mascot */}
      <div className="p-4 border-b border-[var(--desk-border)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[2px] bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] p-0.5 flex items-center justify-center">
              <BunMascot size={22} pose={stepConfig.mascotPose} animate />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--accent-gold)]">
                {lesson.badge}
              </span>
              <h2 className="text-xs font-display font-bold text-[var(--text-heading)]">
                {lesson.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              useOnboardingStore.setState({ isPlaygroundActive: false, showStencilGuide: false });
              router.push('/studio?fromPlayground=true');
            }}
            className="text-[10px] font-mono font-bold text-[var(--text-body)] hover:text-[#f0be7c] transition-colors cursor-pointer bg-transparent border-0"
            title="Skip to full studio"
          >
            Skip to Studio
          </button>
        </div>

        {/* Lesson Selector */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[9px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
            <span>Lesson Curriculum:</span>
            <span className="text-[#f0be7c]">{PLAYGROUND_LESSONS.findIndex(l => l.id === activeLessonId) + 1} / {PLAYGROUND_LESSONS.length}</span>
          </div>
          <div className="relative">
            <select
              value={activeLessonId}
              onChange={(e) => selectLesson(e.target.value)}
              aria-label="Choose animation lesson"
              className="w-full bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] px-2.5 py-1.5 text-xs font-mono font-bold text-[var(--text-heading)] hover:border-[#f0be7c] focus:border-[#f0be7c] focus:outline-none cursor-pointer appearance-none shadow-inner"
            >
              {PLAYGROUND_LESSONS.map((l) => (
                <option key={l.id} value={l.id} className="bg-[#1f152b] text-[#f2ecf7]">
                  [{l.badge}] {l.title} ({l.totalFrames}f @ {l.fps}fps)
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#f0be7c] text-[10px]">
              ▼
            </div>
          </div>

          {/* Quick Launch Teaching Animation Board */}
          <button
            type="button"
            onClick={() => studioEvents.emit('pixibun:open-teaching-board')}
            className="mt-1 flex items-center justify-between px-2.5 py-1.5 rounded-[2px] bg-[#241a34] hover:bg-[#2e2040] border border-[#8c5120] text-xs font-mono text-[#f0be7c] hover:text-[#fff] transition-all cursor-pointer shadow-xs group"
            title="Open 10-Frame Jump Anatomy Teaching Board"
          >
            <span className="flex items-center gap-1.5 font-bold">
              <span className="text-sm">✦</span>
              <span>10-Frame Jump Anatomy</span>
            </span>
            <span className="text-[10px] text-[#c792df] group-hover:translate-x-0.5 transition-transform">
              Teaching Board ➔
            </span>
          </button>
        </div>
      </div>

      {/* 2. Dynamic Step Progress Spine */}
      <div className="px-4 pt-3 flex items-center justify-between gap-1">
        {steps.map((s, idx) => {
          const isActive = idx === currentStepIndex;
          const isPast = idx < currentStepIndex;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStepIndex(idx)}
              className={`flex-1 h-1.5 rounded-[1px] transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#f0be7c] shadow-[0_0_6px_#f0be7c]'
                  : isPast
                  ? 'bg-[#8c5120]'
                  : 'bg-[var(--desk-border)]'
              }`}
              title={`Step ${idx + 1}: ${s.title}`}
            />
          );
        })}
      </div>

      {/* 3. Core Instructional Body */}
      <div className="p-4 flex-1 flex flex-col gap-3.5 overflow-y-auto">
        <div className="flex flex-col gap-0.5">
          <div className="text-[10px] font-mono font-bold text-[var(--accent-gold)] uppercase tracking-wider">
            Step {stepConfig.stepIndex + 1} of {stepConfig.totalSteps}
          </div>
          <h3 className="text-sm font-display font-bold text-[var(--text-heading)] leading-snug">
            {stepConfig.title}
          </h3>
          <p className="text-[11px] font-mono text-[var(--text-body)]/70">
            {stepConfig.subtitle}
          </p>
        </div>

        {/* Real-Time Mathematical Ink Analysis Meter */}
        {isDrawingStep && (
          <div className="bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] rounded-[2px] p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold">
              <span className={isFrameDrawingComplete ? 'text-[#7fae6b]' : 'text-[var(--text-body)]'}>
                {isFrameDrawingComplete ? 'Outline Ready!' : 'Outline Progress:'}
              </span>
              <span className={isFrameDrawingComplete ? 'text-[#7fae6b]' : 'text-[#f0be7c]'}>
                {displayPercent}%
              </span>
            </div>

            <div className="w-full h-1.5 bg-[#140d1f] rounded-[1px] overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isFrameDrawingComplete ? 'bg-[#7fae6b]' : 'bg-[#f0be7c]'
                }`}
                style={{ width: `${Math.max(4, displayPercent)}%` }}
              />
            </div>

            <span className="text-[9px] font-mono text-[var(--text-body)]/70">
              {latestAnalysis?.statusMessage || 'Trace the outline stencil on the canvas, or click Trace Stencil.'}
            </span>
          </div>
        )}

        {/* Senior Artisan Physics & Timing Monitor */}
        {currentTemplate && (
          <div className="bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] rounded-[2px] p-2.5 flex flex-col gap-2 shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold">
              <span className="text-[#f0be7c] uppercase tracking-wider flex items-center gap-1">
                <PixelIcon name="sparkles" size={11} className="text-[#f0be7c]" />
                <span>Physics & Timing</span>
              </span>
              {currentTemplate.kineticPhase && (
                <span className="bg-[#2e2040] text-[#f0be7c] px-1.5 py-0.5 rounded-[2px] text-[9px] border border-[#8c5120]">
                  {currentTemplate.kineticPhase}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
              <div className="bg-[#140d1f] border border-[var(--desk-border)] p-1.5 rounded-[1px] flex flex-col">
                <span className="text-[9px] text-[var(--text-muted)]">Pacing Hold:</span>
                <span className="font-bold text-[#f0be7c]">~{currentTemplate.recommendedHoldMs} ms</span>
              </div>
              <div className="bg-[#140d1f] border border-[var(--desk-border)] p-1.5 rounded-[1px] flex flex-col">
                <span className="text-[9px] text-[var(--text-muted)]">Target Volume:</span>
                <span className="font-bold text-[#7fae6b]">
                  {currentTemplate.effectivePixelArea ? `${currentTemplate.effectivePixelArea} px` : 'Preserved'}
                </span>
              </div>
            </div>

            {currentTemplate.opticalTrick && (
              <div className="bg-[#1f152b] border-l-2 border-[#c792df] p-1.5 text-[10px] font-mono text-[#ede8f4] leading-relaxed">
                <span className="text-[#c792df] font-bold mr-1">Optical Note:</span>
                {currentTemplate.opticalTrick}
              </div>
            )}
          </div>
        )}

        {/* Animation Principle Box */}
        {currentTemplate && (
          <div className="bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] rounded-[2px] p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#f0be7c] uppercase">
              <PixelIcon name="onion" size={12} />
              <span>{currentTemplate.principle}</span>
            </div>
            <p className="text-[11px] font-sans leading-relaxed text-[var(--text-body)]">
              {currentTemplate.explanation}
            </p>
          </div>
        )}

        {/* Step Description */}
        <p className="text-xs leading-relaxed text-[var(--text-body)]">
          {stepConfig.description}
        </p>

        {/* Artisan Rule Callout */}
        {stepConfig.artisanTip && (
          <div className="bg-[#241a34] border-l-2 border-[#f0be7c] p-2.5 text-[11px] font-mono text-[#f0be7c] leading-relaxed">
            {stepConfig.artisanTip}
          </div>
        )}

        {/* Interactive Tracing Lightbox Controls */}
        {currentTemplate && (
          <div className="mt-2 pt-2 border-t border-[var(--desk-border)] flex flex-col gap-2">
            <div className="text-[10px] font-mono font-bold text-[var(--text-body)] uppercase tracking-wider flex items-center justify-between">
              <span>Tracing Lightbox</span>
              <button
                type="button"
                onClick={toggleStencilGuide}
                className="text-[#f0be7c] hover:underline cursor-pointer bg-transparent border-0 p-0 text-[10px] font-mono"
              >
                {showStencilGuide ? 'Hide Lightbox' : 'Show Lightbox'}
              </button>
            </div>

            {showStencilGuide && (
              <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-body)]">
                <span>Opacity:</span>
                <input
                  type="range"
                  aria-label="Lightbox opacity"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={stencilOpacity}
                  onChange={(e) => setStencilOpacity(parseFloat(e.target.value))}
                  className="flex-1 accent-[#f0be7c] cursor-pointer"
                />
                <span className="w-8 text-right font-bold text-[#f0be7c]">
                  {Math.round(stencilOpacity * 100)}%
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <TactileButton
                size="sm"
                variant="default"
                onClick={handleTraceTemplate}
                title="Fill master stencil onto canvas"
                className="text-[10px] font-mono py-1 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
              >
                Trace Stencil
              </TactileButton>

              <TactileButton
                size="sm"
                variant="default"
                onClick={handleClearFrame}
                title="Clear current drawing to retry hand-drawn stroke"
                className="text-[10px] font-mono py-1 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#ff99aa]"
              >
                Clear Frame
              </TactileButton>
            </div>
          </div>
        )}
      </div>

      {/* 4. Footer Actions & Navigation */}
      <div className="p-4 border-t border-[var(--desk-border)] flex items-center justify-between gap-2">
        {stepConfig.stepIndex > 0 && !isComplete ? (
          <TactileButton
            size="sm"
            variant="default"
            onClick={prevStep}
            className="text-xs px-3 py-1.5 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
          >
            Back
          </TactileButton>
        ) : (
          <div />
        )}

        {isComplete ? (
          <TactileButton
            size="sm"
            variant="primary"
            onClick={() => {
              useOnboardingStore.setState({ isPlaygroundActive: false, showStencilGuide: false });
              router.push('/studio?fromPlayground=true');
            }}
            className="text-xs font-bold px-4 py-2 bg-[#f0be7c] hover:bg-[#f3cb95] text-[#140d1f] border-2 border-[#8c5120] shadow-md flex items-center gap-1.5"
          >
            <span>{stepConfig.nextButtonLabel}</span>
            <PixelIcon name="export" size={13} />
          </TactileButton>
        ) : stepConfig.type === 'PLAYBACK' ? (
          <TactileButton
            size="sm"
            variant={isPlaying ? 'default' : 'primary'}
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-xs font-bold px-4 py-1.5 bg-[#f0be7c] hover:bg-[#f3cb95] text-[#140d1f] border-2 border-[#8c5120] shadow-sm flex items-center gap-1.5"
          >
            <PixelIcon name={isPlaying ? 'pause' : 'play'} size={13} />
            <span>{isPlaying ? 'Pause Loop' : 'Play Loop'}</span>
          </TactileButton>
        ) : (
          <TactileButton
            size="sm"
            variant="primary"
            onClick={handleNextAction}
            className="text-xs font-bold px-4 py-1.5 bg-[#f0be7c] hover:bg-[#f3cb95] text-[#140d1f] border-2 border-[#8c5120] shadow-sm"
          >
            {stepConfig.nextButtonLabel}
          </TactileButton>
        )}
      </div>
    </aside>
  );
};
