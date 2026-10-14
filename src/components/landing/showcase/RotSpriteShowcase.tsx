'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShowcaseNote } from './ShowcaseNote';
import { useQuests } from './quests';
import { ArtFrame, Dot, Picker, ToolWindow } from './ToolKit';
import { STARTER_TEMPLATES } from '@/lib/art/starterTemplates';
import { templateToCanvas, SWORD_TEMPLATE } from './showcaseSprites';
import { rotateWithRotSprite } from '@/lib/ai/smartMathEngine';

export const RotSpriteShowcase: React.FC = () => {
  const [spriteType, setSpriteType] = useState<'sword' | 'ghost' | 'bun'>('sword');
  // Starts off the 45° snap, so pressing it shows the biggest change.
  const [angle, setAngle] = useState<number>(30);
  const { complete } = useQuests();
  const [isSpinning, setIsSpinning] = useState<boolean>(false);

  const rotSpriteCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const standardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [spriteVersion, setSpriteVersion] = useState<number>(0);

  // Render both RotSprite and Standard Canvas Rotation
  const renderRotations = useCallback(() => {
    void spriteVersion;
    const rotCanvas = rotSpriteCanvasRef.current;
    const stdCanvas = standardCanvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    if (!rotCanvas || !stdCanvas || !baseCanvas) return;

    const baseCtx = baseCanvas.getContext('2d');
    if (!baseCtx) return;

    const w = baseCanvas.width;
    const h = baseCanvas.height;
    const stageSize = 32;

    // 1. RotSprite Rendering (Centered in 32x32 stage for 1:1 scale equivalence)
    const rotSpriteResult = rotateWithRotSprite(baseCtx, w, h, angle);
    const rotCtx = rotCanvas.getContext('2d');
    if (rotCtx) {
      rotCanvas.width = stageSize;
      rotCanvas.height = stageSize;
      rotCtx.imageSmoothingEnabled = false;
      rotCtx.clearRect(0, 0, stageSize, stageSize);
      const destX = Math.round((stageSize - rotSpriteResult.width) / 2);
      const destY = Math.round((stageSize - rotSpriteResult.height) / 2);
      rotCtx.drawImage(rotSpriteResult, destX, destY);
    }

    // 2. Standard Canvas Rotation (Centered in 32x32 stage for 1:1 scale equivalence)
    const stdCtx = stdCanvas.getContext('2d');
    if (stdCtx) {
      stdCanvas.width = stageSize;
      stdCanvas.height = stageSize;
      stdCtx.imageSmoothingEnabled = false;
      stdCtx.clearRect(0, 0, stageSize, stageSize);
      stdCtx.save();
      stdCtx.translate(stageSize / 2, stageSize / 2);
      stdCtx.rotate((angle * Math.PI) / 180);
      stdCtx.drawImage(baseCanvas, -w / 2, -h / 2);
      stdCtx.restore();
    }
  }, [angle, spriteVersion]);

  // Initialize source sprite only when spriteType changes
  useEffect(() => {
    if (spriteType === 'sword') {
      baseCanvasRef.current = templateToCanvas(SWORD_TEMPLATE);
    } else if (spriteType === 'ghost') {
      const tmpl = STARTER_TEMPLATES.find((t) => t.id === 'hearth-ghost')!;
      baseCanvasRef.current = templateToCanvas(tmpl);
    } else {
      const tmpl = STARTER_TEMPLATES.find((t) => t.id === 'bun')!;
      baseCanvasRef.current = templateToCanvas(tmpl);
    }
    setSpriteVersion((v) => v + 1);
  }, [spriteType]);

  // Re-render rotations when angle changes
  useEffect(() => {
    renderRotations();
  }, [renderRotations]);

  // Continuous spin loop
  useEffect(() => {
    if (!isSpinning) return;

    let lastTime = performance.now();
    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setAngle((prev) => (prev + dt * 45) % 360);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSpinning]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
        <ToolWindow name="rotate.pixi" status={`Angle: ${Math.round(angle)}°`} className="max-w-[460px] min-w-0">
          <div className="flex items-start justify-center gap-2 pt-3">
            <ArtFrame tag="RotSprite 8x" glow caption={<span className="text-[var(--accent-sage)]">♥ clean lines</span>}>
              <canvas
                ref={rotSpriteCanvasRef}
                className="block w-[clamp(48px,6vw,96px)] h-auto aspect-square"
                style={{ imageRendering: 'pixelated' }}
                aria-label="RotSprite rotation output"
              />
            </ArtFrame>
            <ArtFrame tag="standard nearest" caption={<span className="text-[var(--accent-plum)]">✕ jaggy lines</span>}>
              <canvas
                ref={standardCanvasRef}
                className="block w-[clamp(48px,6vw,96px)] h-auto aspect-square opacity-90"
                style={{ imageRendering: 'pixelated' }}
                aria-label="Standard nearest neighbor rotation output"
              />
            </ArtFrame>
          </div>

          {/* The turning dial */}
          <div className="mt-6 pt-4 border-t-2 border-dashed border-[var(--desk-border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] text-[var(--text-muted)]">turn it</span>
              <button
                type="button"
                onClick={() => {
                  complete(2);
                  setIsSpinning((prev) => !prev);
                }}
                className="px-2.5 py-1 rounded-[2px] border-2 border-[var(--ink)] bg-[var(--state-active)] font-mono text-[11px] font-bold text-[var(--text-heading)] shadow-[0_2px_0_var(--ink)] hover:text-[var(--accent-gold)] active:translate-y-px active:shadow-none transition-colors"
              >
                {isSpinning ? '⏸ pause' : '▶ spin it'}
              </button>
            </div>
            <input
              type="range"
              aria-label="Rotation angle"
              min="0"
              max="360"
              step="1"
              value={angle}
              onChange={(e) => {
                complete(0);
                setIsSpinning(false);
                setAngle(Number(e.target.value));
              }}
              className="w-full accent-[var(--primary-bg)] cursor-pointer"
            />
            <div className="grid grid-cols-5 gap-1 mt-2 p-1 rounded-[3px] bg-[var(--surface-0)] border-2 border-[var(--ink)]">
              {[0, 22.5, 45, 90, 135].map((snap) => (
                <button
                  key={snap}
                  type="button"
                  onClick={() => {
                    if (snap === 45) complete(1);
                    setIsSpinning(false);
                    setAngle(snap);
                  }}
                  className={`py-1 rounded-[2px] font-mono text-[11px] font-bold transition-colors ${
                    Math.round(angle) === Math.round(snap)
                      ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] shadow-[inset_0_-2px_0_var(--primary-shade)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--desk-surface-raised)] hover:text-[var(--text-heading)]'
                  }`}
                >
                  {snap}°
                </button>
              ))}
            </div>
          </div>
        </ToolWindow>

        <div className="w-full max-w-[460px] min-w-0">
          <Picker
            label="what to turn"
            value={spriteType}
            onChange={setSpriteType}
            options={[
              { value: 'sword', label: 'Little blade', icon: <Dot color="var(--accent-wisteria)" /> },
              { value: 'ghost', label: 'Hearth Ghost', icon: <Dot color="var(--text-heading)" /> },
              { value: 'bun', label: 'Bun', icon: <Dot color="var(--accent-plum)" /> },
            ]}
          />
        </div>
      </div>

      <ShowcaseNote
        kicker="smooth rotation"
        title="Turn it without the jaggies."
        body="Ordinary rotation chews up thin lines. RotSprite works on an enlarged copy first, so edges stay clean and your colours stay yours."
        tips={['Drag the slider and compare both frames.', 'Snap to 45° to see the difference most.', 'Press spin it and watch the blade stay sharp.']}
        cta="ROTATE A SPRITE IN THE STUDIO"
      />
    </div>
  );
};
