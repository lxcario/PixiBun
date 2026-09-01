'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useStudioStore } from '@/stores/studioStore';
import { BunMascot } from '@/components/ui/BunMascot';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const OnboardingOverlay: React.FC = () => {
  const router = useRouter();
  const currentStep = useOnboardingStore((state) => state.getCurrentStep());
  const setOnionSkin = useStudioStore((state) => state.setOnionSkin);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const isComplete = currentStep.type === 'COMPLETE';
  const targetSelector = currentStep.targetSelector;

  // Measure spotlight target rectangle (only when targeting specific UI elements like buttons)
  const updateTargetBounds = useCallback(() => {
    if (!targetSelector || targetSelector === '#center-canvas-area') {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(targetSelector);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect((prev) => {
      if (
        prev &&
        prev.x === rect.left &&
        prev.y === rect.top &&
        prev.width === rect.width &&
        prev.height === rect.height
      ) {
        return prev;
      }
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };
    });
  }, [targetSelector]);

  // Keep target bounds updated during step changes and window resize
  useEffect(() => {
    updateTargetBounds();

    const handleResize = () => updateTargetBounds();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updateTargetBounds]);

  // Automatically enable Onion Skinning when reaching Step 2 or beyond
  useEffect(() => {
    if (currentStep.stepIndex > 0) {
      setOnionSkin({ enabled: true });
    }
  }, [currentStep.stepIndex, setOnionSkin]);

  const pad = 6;

  // Render nothing if no target button spotlight and not complete
  if (!targetRect && !isComplete) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-40 transition-opacity duration-300">
      {/* Target UI Spotlight Ring (if targeting a button like Play) */}
      {targetRect && (
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ filter: 'drop-shadow(0 0 12px rgba(240, 190, 124, 0.45))' }}
        >
          <rect
            x={targetRect.x - pad}
            y={targetRect.y - pad}
            width={targetRect.width + pad * 2}
            height={targetRect.height + pad * 2}
            rx="4"
            ry="4"
            fill="none"
            stroke="#f0be7c"
            strokeWidth="2"
            strokeDasharray="4 2"
          />
        </svg>
      )}

      {/* Completion Celebration Modal */}
      {isComplete && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-auto bg-[#0e0918]/70 backdrop-blur-xs">
          <div className="bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[4px] shadow-[0_16px_40px_rgba(0,0,0,0.7)] p-6 flex flex-col gap-4 text-[var(--text-body)] w-full max-w-md">
            <div className="flex items-center gap-3 border-b border-[var(--desk-border)] pb-3.5">
              <div className="w-12 h-12 rounded-[2px] bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] p-1 flex items-center justify-center shadow-inner">
                <BunMascot size={34} pose="happy" animate />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#7fae6b]">
                  Lesson Complete
                </span>
                <h2 className="text-base font-display font-bold text-[var(--text-heading)]">
                  {currentStep.dialogTitle}
                </h2>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-[var(--text-body)]">
              {currentStep.description}
            </p>

            <div className="bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] rounded-[2px] p-3 text-[11px] font-mono text-[var(--accent-gold)] leading-relaxed">
              {currentStep.artisanTip}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[var(--desk-border)]">
              <TactileButton
                size="sm"
                variant="primary"
                onClick={() => router.push('/studio?fromPlayground=true')}
                className="text-xs font-bold px-5 py-2.5 bg-[#f0be7c] hover:bg-[#f3cb95] text-[#140d1f] border-2 border-[#8c5120] shadow-md flex items-center gap-2"
              >
                <span>Enter Full Studio</span>
                <PixelIcon name="export" size={14} />
              </TactileButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
