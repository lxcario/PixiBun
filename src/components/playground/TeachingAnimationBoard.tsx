'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ALT_COLOURS,
  TEACHING_CHARACTERS,
  AltPalette,
  TeachingCharacter,
  resolvePixelColor,
  loadTeachingAnimationIntoPlayground,
} from '@/lib/art/teachingBoardData';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { TactileButton } from '@/components/ui/TactileButton';

interface TeachingAnimationBoardProps {
  onClose?: () => void;
  isModal?: boolean;
}

/**
 * Reusable pixel-crisp SVG sprite renderer.
 */
export const PixelSpriteView: React.FC<{
  grid: string[];
  palette: AltPalette;
  size?: number;
  className?: string;
  opacity?: number;
}> = ({ grid, palette, size = 64, className = '', opacity = 1 }) => {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={`select-none ${className}`}
      style={{ opacity, imageRendering: 'pixelated' }}
      role="img"
      aria-hidden="true"
    >
      {grid.map((row, y) =>
        row.split('').map((char, x) => {
          const color = resolvePixelColor(char, palette);
          if (!color) return null;
          return <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />;
        })
      )}
    </svg>
  );
};

export const TeachingAnimationBoard: React.FC<TeachingAnimationBoardProps> = ({
  onClose,
  isModal = false,
}) => {
  const [characterId, setCharacterId] = useState<'bun' | 'slime'>('bun');
  const [paletteId, setPaletteId] = useState<string>('wisteria');
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(10);
  const [showGhosting, setShowGhosting] = useState<boolean>(true);
  const [hoveredFrame, setHoveredFrame] = useState<number | null>(null);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const character: TeachingCharacter = TEACHING_CHARACTERS[characterId];
  const palette: AltPalette =
    ALT_COLOURS.find((p) => p.id === paletteId) || ALT_COLOURS[0];

  // Real-time animation playback loop honoring custom frame pacing
  const animTimerRef = useRef<number | null>(null);
  const currentFrameRef = useRef(currentFrame);
  currentFrameRef.current = currentFrame;

  useEffect(() => {
    if (!isPlaying) {
      if (animTimerRef.current !== null) {
        window.clearTimeout(animTimerRef.current);
        animTimerRef.current = null;
      }
      return;
    }

    const nextDelay =
      character.jumpFrames[currentFrameRef.current]?.holdMs || 1000 / fps;

    const step = () => {
      setCurrentFrame((prev) => (prev + 1) % character.jumpFrames.length);
    };

    animTimerRef.current = window.setTimeout(step, nextDelay);

    return () => {
      if (animTimerRef.current !== null) {
        window.clearTimeout(animTimerRef.current);
      }
    };
  }, [isPlaying, currentFrame, character.jumpFrames, fps]);

  // Keyboard controls: Space to play/pause, Left/Right arrow to step
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentFrame(
          (prev) => (prev - 1 + character.jumpFrames.length) % character.jumpFrames.length
        );
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentFrame((prev) => (prev + 1) % character.jumpFrames.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [character.jumpFrames.length]);

  // Load into Playground timeline action
  const handleLoadToPlayground = useCallback(() => {
    try {
      loadTeachingAnimationIntoPlayground(character, palette);
    } catch (err) {
      console.error('Failed to load into playground:', err);
    }
    setToastMessage(`Loaded 10-frame ${character.name} jump into Playground timeline!`);
    setTimeout(() => setToastMessage(null), 3200);
  }, [character, palette]);

  // Active frame data
  const activeFrameData = character.jumpFrames[currentFrame];
  const inspectedFrameIndex = hoveredFrame !== null ? hoveredFrame : currentFrame;
  const inspectedFrameData = character.jumpFrames[inspectedFrameIndex];

  // Previous & next frame indices for onion skinning
  const prevFrameIndex =
    (currentFrame - 1 + character.jumpFrames.length) % character.jumpFrames.length;

  return (
    <div className="flex flex-col w-full h-full bg-[var(--desk-bg)] text-[var(--text-heading)] select-none overflow-y-auto relative font-sans">
      {/* Dynamic diagonal drafting pinstripe background overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 z-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(58, 46, 76, 0.15) 0, rgba(58, 46, 76, 0.15) 24px, transparent 24px, transparent 48px)',
        }}
      />

      {/* Top Banner & Atelier Controls */}
      <div className="relative z-10 px-6 py-3.5 bg-[var(--desk-surface)] border-b-2 border-[var(--desk-border)] flex flex-wrap items-center justify-between gap-4 shadow-sm">
        {/* Left: Brand + Mascot Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] flex items-center justify-center p-1 shadow-xs">
              <PixelSpriteView
                grid={TEACHING_CHARACTERS[characterId].jumpFrames[0].grid16}
                palette={palette}
                size={22}
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-xs tracking-wider text-[var(--accent-gold)]">
                  PIXIBUN
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#2e2040] text-[#c792df] border border-[#664b68] rounded-[2px]">
                  TEACHING BOARD
                </span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-body)]">
                Classical 2D Pixel Animation & Construction Stencil
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-[var(--desk-border)] mx-1" />

          {/* Character Switcher (Bun vs Slime) */}
          <div className="flex items-center bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setCharacterId('bun');
                setPaletteId('wisteria');
                setCurrentFrame(0);
              }}
              className={`px-2.5 py-1 rounded-[1px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                characterId === 'bun'
                  ? 'bg-[#f0be7c] text-[#140c1e] shadow-xs'
                  : 'text-[var(--text-body)] hover:text-[#f0be7c]'
              }`}
            >
              <span>🐰</span>
              <span>Bun (Mascot)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCharacterId('slime');
                setPaletteId('matcha');
                setCurrentFrame(0);
              }}
              className={`px-2.5 py-1 rounded-[1px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                characterId === 'slime'
                  ? 'bg-[#f0be7c] text-[#140c1e] shadow-xs'
                  : 'text-[var(--text-body)] hover:text-[#f0be7c]'
              }`}
            >
              <span>🟢</span>
              <span>Gel Slime</span>
            </button>
          </div>
        </div>

        {/* Right: Load to Playground & Close */}
        <div className="flex items-center gap-3">
          <TactileButton
            size="sm"
            variant="primary"
            onClick={handleLoadToPlayground}
            title="Load all 10 jump frames into the Playground drawing timeline"
            className="px-3.5 py-1.5 bg-[#f0be7c] hover:bg-[#f3cb95] text-[#140c1e] border-2 border-[#8c5120] font-mono font-bold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <PixelIcon name="layers" size={13} />
            <span>Load into Playground Timeline</span>
          </TactileButton>

          {isModal && onClose && (
            <TactileButton
              size="icon-sm"
              variant="default"
              onClick={onClose}
              title="Close Teaching Board"
              className="w-8 h-8 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#ff99aa]"
            >
              <span className="text-xs font-bold leading-none font-mono">✕</span>
            </TactileButton>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#281b3d] border-2 border-[#f0be7c] text-[#f0be7c] px-4 py-2 rounded-[2px] font-mono text-xs shadow-xl animate-fade-in flex items-center gap-2">
          <span>✦</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main 4-Window Retro Atelier Grid */}
      <div className="relative z-10 p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        {/* Row 1: BUILDING A SPRITE (Left) + ALT COLOURS (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* WINDOW 1: BUILDING A CHARACTER (lg:col-span-8) */}
          <section className="lg:col-span-8 bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[2px] shadow-md flex flex-col overflow-hidden">
            {/* Retro Window Titlebar */}
            <div className="h-8 bg-[var(--desk-surface-raised)] border-b-2 border-[var(--desk-border)] px-3 flex items-center justify-between select-none">
              <div className="flex items-center gap-2 font-display text-xs font-bold tracking-wider text-[var(--text-heading)]">
                <span className="text-[#f0be7c]">■</span>
                <span>BUILDING A {character.name.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px] text-[var(--text-muted)]">
                <span className="hover:text-[var(--text-heading)] cursor-pointer px-1">-</span>
                <span className="hover:text-[var(--text-heading)] cursor-pointer px-1">o</span>
                <span className="hover:text-[#ff99aa] cursor-pointer px-1">x</span>
              </div>
            </div>

            {/* Window Content: 7 Sequential Stages */}
            <div className="p-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 items-end">
                {character.buildingSteps.map((step, idx) => {
                  const isHovered = hoveredStep === idx;
                  const hasDimensions = step.hasDimensions;
                  const dim = step.dimensionW || 16;

                  return (
                    <div
                      key={step.step}
                      onMouseEnter={() => setHoveredStep(idx)}
                      onMouseLeave={() => setHoveredStep(null)}
                      className={`flex flex-col items-center gap-2 p-2 rounded-[2px] border transition-all cursor-pointer ${
                        isHovered
                          ? 'bg-[#2e2040] border-[#f0be7c] shadow-md -translate-y-0.5'
                          : 'bg-[var(--desk-surface-raised)]/60 border-[var(--desk-border)] hover:border-[#c792df]'
                      }`}
                    >
                      {/* Sprite Display with Dimension Callouts on Step 1 */}
                      <div className="relative flex items-center justify-center p-2">
                        {hasDimensions && (
                          <>
                            {/* Top Dimension Bracket */}
                            <div className="absolute -top-4 left-3 right-3 flex flex-col items-center">
                              <span className="text-[9px] font-mono font-bold text-[var(--text-muted)] leading-none mb-0.5">
                                {dim}
                              </span>
                              <div className="w-full flex items-center">
                                <div className="w-px h-1.5 bg-[var(--text-muted)]" />
                                <div className="flex-1 h-px bg-[var(--text-muted)]" />
                                <div className="w-px h-1.5 bg-[var(--text-muted)]" />
                              </div>
                            </div>

                            {/* Left Dimension Bracket */}
                            <div className="absolute top-3 bottom-3 -left-4 flex items-center">
                              <span className="text-[9px] font-mono font-bold text-[var(--text-muted)] leading-none mr-0.5">
                                {dim}
                              </span>
                              <div className="h-full flex flex-col items-center">
                                <div className="h-px w-1.5 bg-[var(--text-muted)]" />
                                <div className="flex-1 w-px bg-[var(--text-muted)]" />
                                <div className="h-px w-1.5 bg-[var(--text-muted)]" />
                              </div>
                            </div>
                          </>
                        )}

                        <PixelSpriteView
                          grid={step.grid16}
                          palette={palette}
                          size={52}
                        />
                      </div>

                      {/* Step Number & Badge */}
                      <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] font-mono font-bold text-[var(--accent-gold)]">
                          [{step.step}]
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-body)] truncate max-w-[80px]">
                          {step.label.split('. ')[1] || step.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanatory Callout for Hovered / Active Step */}
              <div className="p-2.5 bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] rounded-[2px] font-mono text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#f0be7c] font-bold">
                    {hoveredStep !== null
                      ? character.buildingSteps[hoveredStep].label
                      : 'Artisan Technique:'}
                  </span>
                  <span className="text-[var(--text-body)] text-[11px]">
                    {hoveredStep !== null
                      ? character.buildingSteps[hoveredStep].description
                      : 'Hover over each stage to inspect classical pixel art layer construction.'}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] shrink-0">16×16 Grid</span>
              </div>
            </div>
          </section>

          {/* WINDOW 2: ALT COLOURS (lg:col-span-4) */}
          <section className="lg:col-span-4 bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[2px] shadow-md flex flex-col overflow-hidden">
            {/* Retro Window Titlebar */}
            <div className="h-8 bg-[var(--desk-surface-raised)] border-b-2 border-[var(--desk-border)] px-3 flex items-center justify-between select-none">
              <div className="flex items-center gap-2 font-display text-xs font-bold tracking-wider text-[var(--text-heading)]">
                <span className="text-[#f0be7c]">■</span>
                <span>ALT COLOURS</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px] text-[var(--text-muted)]">
                <span className="hover:text-[var(--text-heading)] cursor-pointer px-1">-</span>
                <span className="hover:text-[var(--text-heading)] cursor-pointer px-1">o</span>
                <span className="hover:text-[#ff99aa] cursor-pointer px-1">x</span>
              </div>
            </div>

            {/* 8 Colorway Swatches (2 rows of 4) */}
            <div className="p-4 flex flex-col justify-between flex-1 gap-3">
              <div className="grid grid-cols-4 gap-2.5">
                {ALT_COLOURS.map((alt) => {
                  const isActive = alt.id === paletteId;
                  return (
                    <button
                      key={alt.id}
                      type="button"
                      onClick={() => setPaletteId(alt.id)}
                      title={`${alt.name} (${alt.tag})`}
                      className={`flex flex-col items-center justify-center p-2 rounded-[2px] border-2 transition-all cursor-pointer relative ${
                        isActive
                          ? 'border-[#f0be7c] bg-[#2e2040] shadow-md -translate-y-0.5 ring-2 ring-[#f0be7c]/40'
                          : 'border-[var(--desk-border)] bg-[var(--desk-surface-raised)]/70 hover:border-[#c792df]'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden border border-[var(--desk-border)] p-1" style={{ backgroundColor: alt.shade }}>
                        <PixelSpriteView
                          grid={character.buildingSteps[6].grid16}
                          palette={alt}
                          size={28}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-[var(--text-body)] mt-1.5 truncate max-w-[56px]">
                        {alt.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Palette Info Card */}
              <div className="p-2.5 bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] rounded-[2px] flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-[2px] border border-[var(--desk-border)]" style={{ backgroundColor: palette.swatch }} />
                  <span className="font-bold text-[#f0be7c]">{palette.name}</span>
                  <span className="text-[var(--text-muted)] text-[10px]">({palette.tag})</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">Click swatch to re-theme</span>
              </div>
            </div>
          </section>
        </div>

        {/* Row 2: JUMP ANIMATION FRAMES (Left) + LIVE ANIMATION PREVIEW (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* WINDOW 3: JUMP ANIMATION FRAMES (lg:col-span-8) */}
          <section className="lg:col-span-8 bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[2px] shadow-md flex flex-col overflow-hidden">
            {/* Retro Window Titlebar */}
            <div className="h-8 bg-[var(--desk-surface-raised)] border-b-2 border-[var(--desk-border)] px-3 flex items-center justify-between select-none">
              <div className="flex items-center gap-2 font-display text-xs font-bold tracking-wider text-[var(--text-heading)]">
                <span className="text-[#f0be7c]">■</span>
                <span>JUMP ANIMATION FRAMES</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px] text-[var(--text-muted)]">
                <span className="hover:text-[var(--text-heading)] cursor-pointer px-1">-</span>
                <span className="hover:text-[var(--text-heading)] cursor-pointer px-1">o</span>
                <span className="hover:text-[#ff99aa] cursor-pointer px-1">x</span>
              </div>
            </div>

            {/* Parabolic Trajectory Graph with Height Guidelines & Vertical Arrows */}
            <div className="p-4 flex flex-col gap-4">
              {/* Frame Labels Header */}
              <div className="grid grid-cols-10 gap-1 text-center font-mono font-bold text-xs">
                {character.jumpFrames.map((jf, idx) => {
                  const isActive = idx === currentFrame;
                  const isInspected = idx === inspectedFrameIndex;
                  return (
                    <button
                      key={jf.frame}
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentFrame(idx);
                      }}
                      onMouseEnter={() => setHoveredFrame(idx)}
                      onMouseLeave={() => setHoveredFrame(null)}
                      className={`py-0.5 rounded-[1px] cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[#f0be7c] text-[#140c1e] font-bold shadow-xs'
                          : isInspected
                          ? 'bg-[#2e2040] text-[#c792df]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                      }`}
                    >
                      [{jf.frame}]
                    </button>
                  );
                })}
              </div>

              {/* Height Arc Coordinate Canvas Box */}
              <div className="relative h-48 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] overflow-hidden p-2 flex flex-col justify-end">
                {/* Horizontal Coordinate Guide Lines (at Y=32, 30, 24, 16) */}
                <div className="absolute inset-x-0 bottom-[100px] border-b border-dashed border-[var(--desk-border)]/80 pointer-events-none flex items-center justify-between px-2">
                  <span className="text-[8px] font-mono text-[var(--text-muted)]/60">32px</span>
                  <span className="text-[8px] font-mono text-[var(--text-muted)]/40">Apex Float</span>
                </div>
                <div className="absolute inset-x-0 bottom-[95px] border-b border-dashed border-[var(--desk-border)]/60 pointer-events-none flex items-center justify-between px-2">
                  <span className="text-[8px] font-mono text-[var(--text-muted)]/60">30px</span>
                </div>
                <div className="absolute inset-x-0 bottom-[81px] border-b border-dashed border-[var(--desk-border)]/60 pointer-events-none flex items-center justify-between px-2">
                  <span className="text-[8px] font-mono text-[var(--text-muted)]/60">24px</span>
                </div>
                <div className="absolute inset-x-0 bottom-[62px] border-b border-dashed border-[var(--desk-border)]/60 pointer-events-none flex items-center justify-between px-2">
                  <span className="text-[8px] font-mono text-[var(--text-muted)]/60">16px</span>
                </div>

                {/* Ground Plane Baseline */}
                <div className="absolute inset-x-0 bottom-6 h-1.5 bg-[#3a2e4c] border-t border-[#4f3e66]" />

                {/* 10 Sprites along the Parabolic Arc */}
                <div className="relative z-10 grid grid-cols-10 gap-1 items-end h-full">
                  {character.jumpFrames.map((jf, idx) => {
                    const isActive = idx === currentFrame;
                    const isInspected = idx === inspectedFrameIndex;
                    // Vertical elevation offset in pixels along max jump (76px)
                    const elevationPx = Math.round((jf.heightPx / 32) * 76);

                    return (
                      <div
                        key={jf.frame}
                        role="button"
                        tabIndex={0}
                        aria-label={`Inspect frame ${idx + 1}`}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsPlaying(false); setCurrentFrame(idx); } }}
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentFrame(idx);
                        }}
                        onMouseEnter={() => setHoveredFrame(idx)}
                        onMouseLeave={() => setHoveredFrame(null)}
                        className="relative flex flex-col items-center justify-end h-full cursor-pointer group"
                      >
                        {/* The elevated sprite */}
                        <div
                          className={`relative z-10 transition-transform duration-150 ${
                            isActive
                              ? 'scale-110 -translate-y-1'
                              : isInspected
                              ? 'scale-105'
                              : 'opacity-85 group-hover:opacity-100'
                          }`}
                          style={{
                            marginBottom: `${elevationPx + (jf.heightPx === 0 ? 0 : 2)}px`,
                          }}
                        >
                          <PixelSpriteView
                            grid={jf.grid16}
                            palette={palette}
                            size={36}
                            className={isActive ? 'drop-shadow-[0_0_6px_rgba(240,190,124,0.6)]' : ''}
                          />
                        </div>

                        {/* Vertical measurement arrow pointing up from ground line to sprite base */}
                        {jf.heightPx > 0 && (
                          <div
                            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center pointer-events-none z-0"
                            style={{ height: `${elevationPx}px` }}
                          >
                            <div className="flex flex-col items-center h-full">
                              <div className="w-0 h-0 border-x-[3px] border-x-transparent border-b-[5px] border-b-[#c792df]" />
                              <div className="w-px flex-1 bg-[#c792df]/50" />
                            </div>
                            <span
                              className={`text-[8px] font-mono font-bold ml-1 self-center leading-none ${
                                isActive ? 'text-[#f0be7c]' : 'text-[var(--text-muted)]'
                              }`}
                            >
                              {jf.heightPx}
                            </span>
                          </div>
                        )}

                        {/* Active frame highlight ring at ground baseline */}
                        {isActive && (
                          <div className="absolute bottom-5.5 w-3 h-1 bg-[#f0be7c] rounded-full shadow-[0_0_6px_#f0be7c] z-20" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Principle & Pacing Breakdown Card */}
              <div className="p-3 bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] rounded-[2px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#2e2040] text-[#f0be7c] border border-[#8c5120] rounded-[2px]">
                      Frame {inspectedFrameData.frame}: {inspectedFrameData.principle}
                    </span>
                    <span className="text-[#c792df] text-[11px] font-bold">
                      Height: {inspectedFrameData.heightPx}px
                    </span>
                  </div>
                  <p className="text-[11px] font-sans text-[var(--text-body)] mt-1">
                    {inspectedFrameData.explanation}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="bg-[#140c1e] border border-[var(--desk-border)] px-2.5 py-1 rounded-[2px] flex flex-col items-end">
                    <span className="text-[9px] text-[var(--text-muted)]">Pacing Hold:</span>
                    <span className="text-xs font-bold text-[#f0be7c]">
                      ~{inspectedFrameData.holdMs} ms
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* WINDOW 4: ANIMATION (lg:col-span-4) */}
          <section className="lg:col-span-4 bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[2px] shadow-md flex flex-col overflow-hidden">
            {/* Retro Window Titlebar */}
            <div className="h-8 bg-[var(--desk-surface-raised)] border-b-2 border-[var(--desk-border)] px-3 flex items-center justify-between select-none">
              <div className="flex items-center gap-2 font-display text-xs font-bold tracking-wider text-[var(--text-heading)]">
                <span className="text-[#f0be7c]">■</span>
                <span>ANIMATION</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px] text-[var(--text-muted)]">
                <span className="hover:text-[var(--text-heading)] cursor-pointer px-1">-</span>
                <span className="hover:text-[var(--text-heading)] cursor-pointer px-1">o</span>
                <span className="hover:text-[#ff99aa] cursor-pointer px-1">x</span>
              </div>
            </div>

            {/* Animation Stage */}
            <div className="p-4 flex flex-col justify-between flex-1 gap-4">
              {/* Viewport Stage with Dynamic Ground Shadow */}
              <div className="relative h-48 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] overflow-hidden">
                {/* Ground Line */}
                <div className="absolute inset-x-0 bottom-8 h-1 bg-[#3a2e4c] border-t border-[#4f3e66]" />

                {/* Dynamic Ground Shadow */}
                <div
                  className="absolute bottom-7 left-1/2 -translate-x-1/2 rounded-full bg-[#140c1e] transition-all duration-75 pointer-events-none"
                  style={{
                    width: `${Math.round(44 * activeFrameData.squashFactor)}px`,
                    height: `${Math.max(3, Math.round(7 * (1 - activeFrameData.heightPx / 48)))}px`,
                    opacity: Math.max(0.2, 0.75 - activeFrameData.heightPx / 60),
                  }}
                />

                {/* Onion Skin Ghosting (Previous Frame) */}
                {showGhosting && isPlaying && (
                  <div
                    className="absolute bottom-7 left-1/2 pointer-events-none transition-transform duration-75"
                    style={{
                      transform: `translate(-50%, -${Math.round(
                        (character.jumpFrames[prevFrameIndex].heightPx / 32) * 64
                      )}px)`,
                    }}
                  >
                    <PixelSpriteView
                      grid={character.jumpFrames[prevFrameIndex].grid16}
                      palette={palette}
                      size={64}
                      opacity={0.25}
                    />
                  </div>
                )}

                {/* Active Animated Character */}
                <div
                  className="absolute bottom-7 left-1/2 z-10 transition-transform duration-75"
                  style={{
                    transform: `translate(-50%, -${Math.round(
                      (activeFrameData.heightPx / 32) * 64
                    )}px)`,
                  }}
                >
                  <PixelSpriteView
                    grid={activeFrameData.grid16}
                    palette={palette}
                    size={64}
                  />
                </div>
              </div>

              {/* Interactive Player Controls */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  {/* Play/Pause & Step Buttons */}
                  <div className="flex items-center gap-1.5">
                    <TactileButton
                      size="sm"
                      variant={isPlaying ? 'default' : 'primary'}
                      onClick={() => setIsPlaying(!isPlaying)}
                      title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                      className="text-xs font-mono font-bold px-3 py-1 flex items-center gap-1.5"
                    >
                      <PixelIcon name={isPlaying ? 'pause' : 'play'} size={12} />
                      <span>{isPlaying ? 'Pause' : 'Play'}</span>
                    </TactileButton>

                    <TactileButton
                      size="icon-sm"
                      variant="default"
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentFrame(
                          (prev) => (prev - 1 + character.jumpFrames.length) % character.jumpFrames.length
                        );
                      }}
                      title="Previous Frame (Left Arrow)"
                      className="w-7 h-7 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
                    >
                      <span>‹</span>
                    </TactileButton>

                    <TactileButton
                      size="icon-sm"
                      variant="default"
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentFrame((prev) => (prev + 1) % character.jumpFrames.length);
                      }}
                      title="Next Frame (Right Arrow)"
                      className="w-7 h-7 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
                    >
                      <span>›</span>
                    </TactileButton>
                  </div>

                  {/* Frame Counter */}
                  <div className="text-[11px] font-mono font-bold text-[#f0be7c]">
                    Frame {currentFrame + 1} / {character.jumpFrames.length}
                  </div>
                </div>

                {/* Speed Controls & Onion Skinning Toggle */}
                <div className="flex items-center justify-between pt-1 border-t border-[var(--desk-border)] text-[10px] font-mono">
                  {/* Speed Selector */}
                  <div className="flex items-center gap-1">
                    <span className="text-[var(--text-muted)] mr-0.5">FPS:</span>
                    {[8, 10, 12, 16].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setFps(rate)}
                        className={`px-1.5 py-0.5 rounded-[1px] font-bold cursor-pointer transition-colors ${
                          fps === rate
                            ? 'bg-[#f0be7c] text-[#140c1e]'
                            : 'text-[var(--text-body)] hover:text-[#f0be7c]'
                        }`}
                      >
                        {rate}
                      </button>
                    ))}
                  </div>

                  {/* Ghosting Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowGhosting(!showGhosting)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-[1px] cursor-pointer transition-colors ${
                      showGhosting
                        ? 'text-[#f0be7c] bg-[#2e2040] border border-[#8c5120]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-body)]'
                    }`}
                    title="Toggle onion skin ghost trail"
                  >
                    <span>Onion Skin:</span>
                    <span className="font-bold">{showGhosting ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom Bar: Atelier Watermark & Info */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] pt-2 border-t border-[var(--desk-border)]/60">
          <div className="flex items-center gap-2">
            <span className="text-[#f0be7c]">/\_/\</span>
            <span>( o.o )</span>
            <span className="text-[var(--text-body)] font-bold">PixiBun Atelier Standards</span>
            <span>— Discrete mass invariance & Richard Williams apex cushioning</span>
          </div>

          <div className="flex items-center gap-2 font-display text-[10px] tracking-wider text-[var(--text-muted)]">
            <span>PIXIBUN ATELIER</span>
            <span className="text-[#f0be7c]">© 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};
