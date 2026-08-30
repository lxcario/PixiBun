'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { LoopMode } from '@/types/animation';

export const BottomTimeline: React.FC = () => {
  const {
    frames,
    activeFrameIndex,
    setActiveFrame,
    addFrame,
    duplicateFrame,
    deleteFrame,
    isPlaying,
    setIsPlaying,
    fps,
    setFps,
    loopMode,
    setLoopMode,
    onionSkin,
    setOnionSkin,
    clips,
    activeClipId,
    setActiveClipId,
    addClip,
    deleteClip,
  } = useStudioStore();

  const isPingPongForwardRef = useRef(true);
  const [isCreatingClip, setIsCreatingClip] = useState(false);
  const [newClipName, setNewClipName] = useState('New Clip');

  const activeClip = clips.find(c => c.id === activeClipId);
  const minFrame = activeClip ? activeClip.startFrame : 0;
  const maxFrame = activeClip ? activeClip.endFrame : frames.length - 1;

  // Playback timer loop scoped to active clip or entire frame stack
  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;

    const frameDuration = 1000 / fps;
    let lastTimestamp = 0;
    let accumulator = 0;
    let animFrameId: number;

    const tick = (timestamp: number) => {
      if (lastTimestamp === 0) lastTimestamp = timestamp;
      accumulator += timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      if (accumulator >= frameDuration) {
        accumulator -= frameDuration;
        if (loopMode === 'repeat') {
          if (activeFrameIndex < maxFrame) {
            setActiveFrame(activeFrameIndex + 1);
          } else {
            setActiveFrame(minFrame);
          }
        } else if (loopMode === 'once') {
          if (activeFrameIndex < maxFrame) {
            setActiveFrame(activeFrameIndex + 1);
          } else {
            setIsPlaying(false);
          }
        } else if (loopMode === 'ping-pong') {
          if (isPingPongForwardRef.current) {
            if (activeFrameIndex < maxFrame) {
              setActiveFrame(activeFrameIndex + 1);
            } else {
              isPingPongForwardRef.current = false;
              setActiveFrame(Math.max(minFrame, activeFrameIndex - 1));
            }
          } else {
            if (activeFrameIndex > minFrame) {
              setActiveFrame(activeFrameIndex - 1);
            } else {
              isPingPongForwardRef.current = true;
              setActiveFrame(Math.min(maxFrame, activeFrameIndex + 1));
            }
          }
        }
      }

      if (isPlaying) {
        animFrameId = requestAnimationFrame(tick);
      }
    };

    animFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameId);
  }, [
    isPlaying,
    fps,
    loopMode,
    activeFrameIndex,
    frames.length,
    minFrame,
    maxFrame,
    setActiveFrame,
    setIsPlaying,
  ]);

  const handleStepForward = () => {
    if (activeFrameIndex < frames.length - 1) {
      setActiveFrame(activeFrameIndex + 1);
    } else {
      setActiveFrame(0);
    }
  };

  const handleStepBack = () => {
    if (activeFrameIndex > 0) {
      setActiveFrame(activeFrameIndex - 1);
    } else {
      setActiveFrame(frames.length - 1);
    }
  };

  const cycleLoopMode = () => {
    const modes: LoopMode[] = ['repeat', 'ping-pong', 'once'];
    const nextIdx = (modes.indexOf(loopMode) + 1) % modes.length;
    setLoopMode(modes[nextIdx]);
  };

  const handleCreateClipSubmit = () => {
    if (newClipName.trim()) {
      addClip(newClipName.trim(), activeFrameIndex, Math.min(frames.length - 1, activeFrameIndex + 1));
    }
    setIsCreatingClip(false);
  };

  return (
    <footer className="h-32 bg-[var(--desk-surface)] border-t-2 border-[var(--desk-border)] px-4 py-2 flex flex-col justify-between select-none z-20 text-[var(--text-heading)] shadow-sm transition-colors duration-300">
      {/* Top Controls Bar: Play, FPS, Loop Mode, Onion Skin, Frame Actions */}
      <div className="flex items-center justify-between border-b border-[var(--desk-border)] pb-1.5">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <TactileButton
            size="sm"
            variant={isPlaying ? 'primary' : 'default'}
            onClick={() => setIsPlaying(!isPlaying)}
            title="Play / Pause Animation (Space)"
            className={`min-w-[88px] text-xs py-1.5 ${
              isPlaying
                ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                : 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-heading)] hover:text-[#f0be7c]'
            }`}
          >
            <PixelIcon name={isPlaying ? 'pause' : 'play'} size={15} />
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </TactileButton>

          <TactileButton
            size="icon-sm"
            variant="default"
            onClick={handleStepBack}
            title="Previous Frame (,)"
            className="w-8 h-8 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
          >
            <PixelIcon name="step-backward" size={14} />
          </TactileButton>

          <TactileButton
            size="icon-sm"
            variant="default"
            onClick={handleStepForward}
            title="Next Frame (.)"
            className="w-8 h-8 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
          >
            <PixelIcon name="step-forward" size={14} />
          </TactileButton>

          <div className="h-5 w-px bg-[#3a2e4c] mx-1" />

          {/* Loop Mode */}
          <TactileButton
            size="sm"
            variant="default"
            onClick={cycleLoopMode}
            title={`Loop Mode: ${loopMode}`}
            className="text-xs uppercase font-mono py-1.5 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
          >
            <PixelIcon name={loopMode === 'ping-pong' ? 'ping-pong' : 'loop'} size={14} />
            <span>{loopMode}</span>
          </TactileButton>
        </div>

        {/* Center: FPS Scrubber & Onion Skinning */}
        <div className="flex items-center gap-4 text-xs font-mono">
          {/* FPS Slider */}
          <div className="flex items-center gap-2 bg-[var(--desk-surface-raised)] px-2.5 py-1 rounded-[2px] border-2 border-[var(--desk-border)]">
            <span className="text-[var(--text-body)] font-bold">FPS:</span>
            <input
              type="range"
              min="1"
              max="30"
              value={fps}
              onChange={(e) => setFps(parseInt(e.target.value, 10))}
              className="w-20 accent-[#f0be7c] cursor-pointer"
            />
            <span className="text-[#f0be7c] min-w-[20px] font-bold text-right">
              {fps}
            </span>
          </div>

          {/* Onion Skinning Toggle */}
          <TactileButton
            size="sm"
            variant={onionSkin.enabled ? 'primary' : 'default'}
            onClick={() => setOnionSkin({ enabled: !onionSkin.enabled })}
            title="Toggle Onion Skinning"
            className={`text-xs py-1.5 ${
              onionSkin.enabled
                ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                : 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]'
            }`}
          >
            <PixelIcon name="onion" size={14} />
            <span>Onion Skin</span>
          </TactileButton>
        </div>

        {/* Frame Actions (Add, Duplicate, Delete) */}
        <div className="flex items-center gap-1.5">
          <TactileButton
            size="sm"
            variant="default"
            onClick={addFrame}
            title="Add Blank Frame"
            className="text-xs py-1.5 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center gap-1"
          >
            <PixelIcon name="plus" size={13} />
            <span>Frame</span>
          </TactileButton>

          <TactileButton
            size="icon-sm"
            variant="default"
            onClick={() => duplicateFrame(activeFrameIndex)}
            title="Duplicate Active Frame"
            className="w-8 h-8 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
          >
            <PixelIcon name="copy" size={13} />
          </TactileButton>

          <TactileButton
            size="icon-sm"
            variant="danger"
            disabled={frames.length <= 1}
            onClick={() => deleteFrame(activeFrameIndex)}
            title="Delete Active Frame"
            className="w-8 h-8 bg-[#3d1928] border-[#6b283d] text-[#ff99aa] hover:bg-[#521e33]"
          >
            <PixelIcon name="trash" size={13} />
          </TactileButton>
        </div>
      </div>

      {/* Animation Clips Tag Bar & Frame Thumbnail Reel */}
      <div className="flex items-center gap-3 overflow-x-auto">
        {/* Clip Tag Badges */}
        <div className="flex items-center gap-1 border-r border-[var(--desk-border)] pr-2">
          <button
            onClick={() => setActiveClipId(null)}
            className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
              activeClipId === null
                ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:bg-[#2e2040] hover:text-[#f0be7c]'
            }`}
          >
            All Frames ({frames.length})
          </button>

          {clips.map(clip => (
            <div
              key={clip.id}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-bold border transition-colors ${
                activeClipId === clip.id
                  ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                  : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:bg-[#2e2040] hover:text-[#f0be7c]'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveClipId(clip.id)}
                className="cursor-pointer font-bold font-mono text-[10px] bg-transparent border-0 p-0 text-inherit text-left"
              >
                {clip.name} ({clip.startFrame + 1}-{clip.endFrame + 1})
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteClip(clip.id);
                }}
                className="text-[#ff99aa] hover:text-[#ffffff] ml-0.5 cursor-pointer bg-transparent border-0 p-0"
                aria-label={`Delete clip ${clip.name}`}
                title="Delete Clip"
              >
                ×
              </button>
            </div>
          ))}

          {isCreatingClip ? (
            <input
              type="text"
              value={newClipName}
              onChange={(e) => setNewClipName(e.target.value)}
              onBlur={handleCreateClipSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateClipSubmit()}
              ref={(el) => el?.focus()}
              aria-label="New clip name"
              className="bg-[var(--desk-surface-raised)] text-[var(--text-heading)] px-1 py-0.5 text-[10px] font-mono rounded-[2px] border border-[#f0be7c] outline-none w-20"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsCreatingClip(true)}
              className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-bold bg-[var(--desk-surface-raised)] hover:bg-[#2e2040] text-[var(--text-body)] hover:text-[#f0be7c] border border-[var(--desk-border)] cursor-pointer"
              title="Add Tagged Animation Clip"
            >
              + Tag Clip
            </button>
          )}
        </div>

        {/* Frame Thumbnail Reel */}
        <div className="flex items-center gap-2">
          {frames.map((frame, index) => {
            const isActive = index === activeFrameIndex;
            const isInsideClip = activeClip ? (index >= activeClip.startFrame && index <= activeClip.endFrame) : true;

            return (
              <button
                type="button"
                key={frame.id}
                onClick={() => setActiveFrame(index)}
                aria-label={`Select frame ${index + 1}`}
                className={`relative min-w-[52px] h-12 rounded-[2px] border-2 cursor-pointer transition-all flex flex-col items-center justify-between p-1 select-none text-left ${
                  isActive
                    ? 'bg-[#2c1e40] border-[#f0be7c] shadow-[0_2px_0_#130e20]'
                    : isInsideClip
                    ? 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)] hover:bg-[#2e2040]'
                    : 'bg-[var(--desk-surface-raised)] border-[#2c1e3a] opacity-50 hover:opacity-80'
                }`}
              >
                <div className="w-full flex justify-between items-center text-[9px] font-mono leading-none">
                  <span className={isActive ? 'text-[#f0be7c] font-bold' : 'text-[var(--text-heading)] font-bold'}>
                    #{index + 1}
                  </span>
                  <span className={isActive ? 'text-[#f0be7c]/80' : 'text-[var(--text-body)]/60'}>
                    {frame.layers.length}L
                  </span>
                </div>

                {/* Mini Preview Box */}
                <div className="w-6 h-6 bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] rounded-[1px] flex items-center justify-center">
                  <span className="text-[8px] font-mono text-[var(--text-body)] font-bold">
                    {index + 1}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </footer>
  );
};
