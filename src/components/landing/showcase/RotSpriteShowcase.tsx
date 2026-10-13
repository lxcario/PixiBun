'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShowcaseNote } from './ShowcaseNote';
import { ArtFrame, Dot, Picker, ToolWindow } from './ToolKit';
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
      <div className="lg:col-span-7 flex flex-col items-center gap-5">
        <ToolWindow name="rotate.pixi" status={`Angle: ${Math.round(angle)}°`} className="max-w-[460px]">
          <div className="flex items-start justify-center gap-4 sm:gap-6 pt-3">
            <ArtFrame tag="RotSprite 8x" glow caption={<span className="text-[#a8e092]">♥ clean lines</span>}>
              <canvas
                ref={rotSpriteCanvasRef}
                className="block w-24 h-24 sm:w-28 sm:h-28"
                style={{ imageRendering: 'pixelated' }}
                aria-label="RotSprite rotation output"
              />
            </ArtFrame>
            <ArtFrame tag="standard nearest" caption={<span className="text-[#f2b8c6]">✕ jaggy lines</span>}>
              <canvas
                ref={standardCanvasRef}
                className="block w-24 h-24 sm:w-28 sm:h-28 opacity-90"
                style={{ imageRendering: 'pixelated' }}
                aria-label="Standard nearest neighbor rotation output"
              />
            </ArtFrame>
          </div>

          {/* The turning dial */}
          <div className="mt-6 pt-4 border-t-2 border-dashed border-[#3d2a5c]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] text-[#cdbfdf]">turn it</span>
              <button
                type="button"
                onClick={() => setIsSpinning((prev) => !prev)}
                className="px-2.5 py-1 rounded-[2px] border-2 border-[#0b0714] bg-[#2f1d52] font-mono text-[11px] font-bold text-[#fff3e0] shadow-[0_2px_0_#0b0714] hover:text-[#ffd285] active:translate-y-px active:shadow-none transition-colors"
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
                setIsSpinning(false);
                setAngle(Number(e.target.value));
              }}
              className="w-full accent-[#ffd285] cursor-pointer"
            />
            <div className="grid grid-cols-5 gap-1 mt-2 p-1 rounded-[3px] bg-[#140b21] border-2 border-[#0b0714]">
              {[0, 22.5, 45, 90, 135].map((snap) => (
                <button
                  key={snap}
                  type="button"
                  onClick={() => {
                    setIsSpinning(false);
                    setAngle(snap);
                  }}
                  className={`py-1 rounded-[2px] font-mono text-[11px] font-bold transition-colors ${
                    Math.round(angle) === Math.round(snap)
                      ? 'bg-[#ffd285] text-[#2a1945] shadow-[inset_0_-2px_0_#d89a55]'
                      : 'text-[#cdbfdf] hover:bg-[#2a1945] hover:text-[#fff3e0]'
                  }`}
                >
                  {snap}°
                </button>
              ))}
            </div>
          </div>
        </ToolWindow>

        <div className="w-full max-w-[460px]">
          <Picker
            label="what to turn"
            value={spriteType}
            onChange={setSpriteType}
            options={[
              { value: 'sword', label: 'Little blade', icon: <Dot color="#cdbfdf" /> },
              { value: 'ghost', label: 'Hearth Ghost', icon: <Dot color="#ede8f4" /> },
              { value: 'bun', label: 'Bun', icon: <Dot color="#f2b8c6" /> },
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
