'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { STARTER_TEMPLATES } from '@/lib/art/starterTemplates';
import { templateToCanvas, SWORD_TEMPLATE } from './showcaseSprites';
import { rotateWithRotSprite } from '@/lib/ai/smartMathEngine';

export const RotSpriteShowcase: React.FC = () => {
  const [spriteType, setSpriteType] = useState<'sword' | 'ghost' | 'bun'>('sword');
  const [angle, setAngle] = useState<number>(45);
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      {/* Left interactive comparison viewport (7 cols) */}
      <div className="lg:col-span-7 flex flex-col items-center">
        {/* Side-by-side Stage */}
        <div className="w-full max-w-[420px] bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[2px] p-4 shadow-lg select-none">
          {/* Top Title Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--desk-border)] mb-4 text-xs font-mono">
            <span className="text-[var(--accent-gold)] font-bold">ROTATION COMPARISON</span>
            <span className="text-[var(--text-muted)]">Angle: {Math.round(angle)}°</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Left: RotSprite (Winning algorithm) */}
            <div className="flex flex-col items-center p-3 bg-[var(--desk-surface-raised)] border-2 border-[var(--accent-gold)]/60 rounded-[2px] relative">
              <div className="w-full text-center text-[11px] font-mono font-bold text-[var(--accent-gold)] mb-2 flex items-center justify-center gap-1">
                <span>✦ ROTSPRITE 8X</span>
              </div>
              <div className="w-28 h-28 bg-[#1e1730] border border-[var(--desk-border)] rounded-[1px] flex items-center justify-center overflow-hidden p-1 shadow-inner">
                <canvas
                  ref={rotSpriteCanvasRef}
                  className="w-24 h-24 pixelated select-none"
                  style={{ imageRendering: 'pixelated' }}
                  aria-label="RotSprite rotation output"
                />
              </div>
              <span className="mt-2 text-[10px] font-mono text-[var(--accent-gold)]">
                Contour-Preserving (RotSprite)
              </span>
            </div>

            {/* Right: Standard Rotation (Flawed algorithm) */}
            <div className="flex flex-col items-center p-3 bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] rounded-[2px] opacity-80">
              <div className="w-full text-center text-[11px] font-mono text-[var(--text-muted)] mb-2">
                STANDARD NEAREST
              </div>
              <div className="w-28 h-28 bg-[#1e1730] border border-[var(--desk-border)] rounded-[1px] flex items-center justify-center overflow-hidden p-1 shadow-inner">
                <canvas
                  ref={standardCanvasRef}
                  className="w-24 h-24 pixelated select-none"
                  style={{ imageRendering: 'pixelated' }}
                  aria-label="Standard nearest neighbor rotation output"
                />
              </div>
              <span className="mt-2 text-[10px] font-mono text-red-400">
                Aliased Grid Sampling
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Controls Below Stage */}
        <div className="w-full max-w-[420px] mt-4 space-y-3">
          {/* Angle Slider & Spin Toggle */}
          <div className="bg-[var(--desk-surface)] p-3 border border-[var(--desk-border)] rounded-[2px]">
            <div className="flex items-center justify-between text-xs font-mono text-[var(--text-body)] mb-2">
              <span className="flex items-center gap-1.5">
                <span className="text-[var(--accent-gold)]">✦</span>
                <span>Rotation Angle</span>
              </span>
              <button
                onClick={() => setIsSpinning((prev) => !prev)}
                className="px-2 py-0.5 rounded-[1px] bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] text-[10px] font-mono hover:text-[var(--accent-gold)] transition-colors"
              >
                {isSpinning ? '⏸ Pause Spin' : '▶ Auto-Spin'}
              </button>
            </div>

            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={angle}
              onChange={(e) => {
                setIsSpinning(false);
                setAngle(Number(e.target.value));
              }}
              className="w-full accent-[var(--accent-gold)] cursor-pointer"
            />

            {/* Quick Angle Snap Buttons */}
            <div className="grid grid-cols-5 gap-1.5 mt-2">
              {[0, 22.5, 45, 90, 135].map((snap) => (
                <button
                  key={snap}
                  onClick={() => {
                    setIsSpinning(false);
                    setAngle(snap);
                  }}
                  className={`py-0.5 text-[10px] font-mono rounded-[1px] border transition-colors ${
                    Math.round(angle) === snap
                      ? 'bg-[var(--desk-surface-raised)] border-[var(--accent-gold)] text-[var(--accent-gold)] font-bold'
                      : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                  }`}
                >
                  {snap}°
                </button>
              ))}
            </div>
          </div>

          {/* Model Switcher */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'sword', label: 'Artisan Blade' },
              { id: 'ghost', label: 'Hearth Ghost' },
              { id: 'bun', label: 'Studio Bun' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSpriteType(item.id as 'sword' | 'ghost' | 'bun')}
                className={`py-1 px-2 text-xs font-mono rounded-[2px] border transition-colors ${
                  spriteType === item.id
                    ? 'bg-[var(--desk-surface-raised)] border-[var(--accent-gold)] text-[var(--accent-gold)] font-bold shadow-sm'
                    : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Explanation & Engine Architecture (5 cols) */}
      <div className="lg:col-span-5 flex flex-col items-start text-left">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] bg-[var(--desk-surface)] border border-[var(--desk-border)] text-[11px] font-mono text-[var(--accent-gold)] mb-3">
          <span>03 / SUBPIXEL GEOMETRY</span>
        </div>

        <h3 className="font-display text-2xl sm:text-3xl text-[var(--text-heading)] leading-tight mb-3">
          RotSprite 8x Scale2X Precision Rotation
        </h3>

        <p className="text-xs sm:text-sm leading-relaxed text-[var(--text-body)] mb-4 font-sans">
          Standard canvas rotation shears low-resolution art: thin 1-pixel strokes get disconnected, outlines break into jagged clumps, and antialiasing introduces blurry smudges.
          RotSprite preserves single-pixel silhouette connectivity and palette purity using 8x Scale2X subpixel geometry, while gracefully respecting discrete pixel grid topology.
        </p>

        {/* Feature Points Card */}
        <div className="w-full bg-[var(--desk-surface)] border border-[var(--desk-border)] rounded-[2px] p-4 mb-5 space-y-3 font-mono text-xs">
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-gold)] mt-0.5">✦</span>
            <div>
              <strong className="text-[var(--text-heading)] block font-sans">3-Pass Scale2X / EPX Upscaling</strong>
              <span className="text-[var(--text-muted)] text-[11px] leading-normal">
                Expands the sprite 8x using pattern-matching corner smoothing (Johnston 1992) before rotation begins.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-plum)] mt-0.5">✦</span>
            <div>
              <strong className="text-[var(--text-heading)] block font-sans">Continuous Inverse Rotation</strong>
              <span className="text-[var(--text-muted)] text-[11px] leading-normal">
                Maps destination pixels back into the 8x upscaled domain, guaranteeing zero gaps or orphan floating pixels.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-gold)] mt-0.5">✦</span>
            <div>
              <strong className="text-[var(--text-heading)] block font-sans">Palette Purity &amp; 1px Conservation</strong>
              <span className="text-[var(--text-muted)] text-[11px] leading-normal">
                Never introduces interpolated intermediary shades. Your hand-picked palette remains 100% pure at any angle.
              </span>
            </div>
          </div>
        </div>

        {/* CTA to studio */}
        <Link
          href="/studio"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[2px] pixel-primary-btn text-xs font-display font-bold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c]"
        >
          <span>ROTATE SPRITES IN STUDIO</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
};
