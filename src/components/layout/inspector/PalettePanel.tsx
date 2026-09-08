'use client';

import React, { useRef, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { parsePaletteFile } from '@/lib/color/lospecPalette';
import {
  PaletteCycleTrack,
  parseCRNG,
  serializeCRNG,
  wrapIFFChunk,
} from '@/lib/color/paletteCycling';
import { createId } from '@/lib/engine/id';

export const PalettePanel: React.FC = () => {
  const {
    palettes,
    currentPaletteId,
    selectPalette,
    primaryColor,
    secondaryColor,
    setPrimaryColor,
    setSecondaryColor,
    generateAndAddRamp,
    addExtractedPalette,
    isPaletteCycling,
    togglePaletteCycling,
    paletteCycleSpeedMultiplier,
    setPaletteCycleSpeedMultiplier,
    addPaletteCycleTrack,
    updatePaletteCycleTrack,
    deletePaletteCycleTrack,
  } = useStudioStore();

  const currentPalette = palettes.find((p) => p.id === currentPaletteId) || palettes[0];
  const paletteFileInputRef = useRef<HTMLInputElement | null>(null);
  const crngFileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'swatches' | 'cycling'>('swatches');

  const tracks = currentPalette.cycleTracks || [];

  const handlePaletteImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      try {
        const pal = parsePaletteFile(content, file.name);
        addExtractedPalette(pal.name, pal.colors);
      } catch (err) {
        console.error('Failed to parse palette file:', err);
      }
    };
    reader.readAsText(file);
  };

  const handleCRNGImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) return;
      const bytes = new Uint8Array(buffer);
      try {
        // If file starts with 'CRNG', payload is at offset 8
        let payload = bytes;
        if (bytes.length >= 16 && String.fromCharCode(...bytes.slice(0, 4)) === 'CRNG') {
          payload = bytes.slice(8, 16);
        }
        const track = parseCRNG(payload, createId('track'));
        addPaletteCycleTrack(currentPalette.id, track);
        setActiveSubTab('cycling');
      } catch (err) {
        console.error('Failed to parse CRNG chunk:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportCRNG = (track: PaletteCycleTrack) => {
    const payload = serializeCRNG(track);
    const chunk = wrapIFFChunk('CRNG', payload);
    const blob = new Blob([chunk.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(track.name || 'track').toLowerCase().replace(/\s+/g, '-')}.crng`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddTrack = () => {
    const numColors = currentPalette.colors.length;
    const low = 0;
    const high = Math.min(numColors - 1, 3);
    const newTrack: PaletteCycleTrack = {
      id: createId('track'),
      name: `Cycle ${tracks.length + 1}`,
      low,
      high,
      rate: 6,
      direction: 'forward',
      blendShift: true,
      enabled: true,
    };
    addPaletteCycleTrack(currentPalette.id, newTrack);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file) handlePaletteImportFile(file);
      }}
      className="flex-1 flex flex-col p-3 gap-2.5 overflow-hidden"
    >
      {/* Palette Selector */}
      <div className="flex flex-col gap-2 pb-1.5 border-b border-[var(--desk-border)]">
        <select
          value={currentPaletteId}
          aria-label="Color palette preset"
          onChange={(e) => selectPalette(e.target.value)}
          className="bg-[var(--desk-surface-raised)] text-[var(--text-heading)] font-bold text-xs font-mono px-2.5 py-1.5 rounded-[2px] border-2 border-[var(--desk-border)] outline-none w-full cursor-pointer shadow-xs"
        >
          {palettes.map((pal) => (
            <option key={pal.id} value={pal.id}>
              {pal.name} ({pal.colors.length})
            </option>
          ))}
        </select>

        {/* Sub-tab switcher: Swatches vs Palette Cycling */}
        <div className="flex bg-[var(--desk-surface)] p-0.5 rounded-[2px] border border-[var(--desk-border)] gap-1">
          <button
            onClick={() => setActiveSubTab('swatches')}
            className={`flex-1 py-1 text-[10px] font-mono font-bold rounded-[1px] transition-colors cursor-pointer ${
              activeSubTab === 'swatches'
                ? 'bg-[#f0be7c] text-[#140d1f]'
                : 'text-[var(--text-body)] hover:text-[#f0be7c]'
            }`}
          >
            Swatches ({currentPalette.colors.length})
          </button>
          <button
            onClick={() => setActiveSubTab('cycling')}
            className={`flex-1 py-1 text-[10px] font-mono font-bold rounded-[1px] transition-colors cursor-pointer flex items-center justify-center gap-1 ${
              activeSubTab === 'cycling'
                ? 'bg-[#f0be7c] text-[#140d1f]'
                : 'text-[var(--text-body)] hover:text-[#f0be7c]'
            }`}
          >
            <span>Cycle Engine</span>
            {isPaletteCycling && <span className="w-1.5 h-1.5 rounded-full bg-[#7ce0be] animate-ping" />}
          </button>
        </div>
      </div>

      {/* View 1: Swatches */}
      {activeSubTab === 'swatches' && (
        <>
          <div className="flex gap-1.5">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('pixibun:extract-palette'))}
              className="flex-1 bg-[var(--desk-surface-raised)] hover:bg-[#2e2040] text-[#f0be7c] font-bold text-[10px] font-mono py-1 rounded-[2px] border border-[var(--desk-border)] transition-colors cursor-pointer text-center"
              title="Scan canvas for unique colors and create new palette"
            >
              Scan Canvas
            </button>

            <button
              onClick={() => generateAndAddRamp(primaryColor)}
              className="flex-1 bg-[var(--desk-surface-raised)] hover:bg-[#2e2040] text-[#dcabdf] font-bold text-[10px] font-mono py-1 rounded-[2px] border border-[var(--desk-border)] transition-colors cursor-pointer text-center"
              title="Generate 5-step highlight & shadow ramp in OKLCH"
            >
              + OKLCH Ramp
            </button>

            <button
              onClick={() => paletteFileInputRef.current?.click()}
              className="flex-1 bg-[var(--desk-surface-raised)] hover:bg-[#2e2040] text-[#7ce0be] font-bold text-[10px] font-mono py-1 rounded-[2px] border border-[var(--desk-border)] transition-colors cursor-pointer text-center"
              title="Import Lospec .hex or GIMP .gpl palette file (or drag and drop)"
            >
              + Lospec (.hex)
            </button>

            <input
              ref={paletteFileInputRef}
              type="file"
              accept=".hex,.gpl,.txt,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePaletteImportFile(file);
                e.target.value = '';
              }}
            />
          </div>

          {/* Color Swatch Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2 bg-[var(--desk-surface)] p-2 rounded-[2px] border-2 border-[var(--desk-border)] shadow-xs">
              {currentPalette.colors.map((color, idx) => {
                const isPrimary = color.toLowerCase() === primaryColor.toLowerCase();
                const isSecondary = color.toLowerCase() === secondaryColor.toLowerCase();

                return (
                  <button
                    key={`${color}-${idx}`}
                    onClick={() => setPrimaryColor(color)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSecondaryColor(color);
                    }}
                    style={{ backgroundColor: color }}
                    className={`h-8 w-full rounded-[2px] border-2 transition-transform hover:scale-110 active:scale-95 cursor-pointer relative ${
                      isPrimary
                        ? 'border-[#ffffff] ring-2 ring-[#f0be7c] shadow-sm'
                        : isSecondary
                        ? 'border-[#ffffff] ring-2 ring-[#dcabdf]'
                        : 'border-[#1a1126] hover:border-[#ffffff]'
                    }`}
                    title={`${color} [#${idx}] (L: Primary | R: Secondary)`}
                    aria-label={`Select color ${color}`}
                  >
                    <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                      {idx}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* View 2: Mark Ferrari Dynamic Palette Cycling Engine */}
      {activeSubTab === 'cycling' && (
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-0.5">
          {/* Main Cycling Playback Header */}
          <div className="flex items-center justify-between p-2 bg-[var(--desk-surface-raised)] rounded-[2px] border border-[var(--desk-border)]">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePaletteCycling}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-mono font-bold cursor-pointer transition-all ${
                  isPaletteCycling
                    ? 'bg-[#7ce0be] text-[#140d1f] shadow-[0_2px_0_#3fa382]'
                    : 'bg-[#f0be7c] text-[#140d1f] shadow-[0_2px_0_#8c5120]'
                }`}
              >
                <PixelIcon name={isPaletteCycling ? 'pause' : 'play'} size={13} />
                <span>{isPaletteCycling ? 'Pause Cycle' : 'Play Cycle'}</span>
              </button>
            </div>

            {/* Speed Multiplier */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-[var(--text-muted)]">Speed:</span>
              <select
                value={paletteCycleSpeedMultiplier}
                onChange={(e) => setPaletteCycleSpeedMultiplier(parseFloat(e.target.value))}
                className="bg-[var(--desk-surface)] text-[#f0be7c] font-bold border border-[var(--desk-border)] rounded-[2px] px-1 py-0.5"
              >
                <option value="0.25">0.25x</option>
                <option value="0.5">0.5x</option>
                <option value="1.0">1.0x</option>
                <option value="2.0">2.0x</option>
                <option value="4.0">4.0x</option>
              </select>
            </div>
          </div>

          {/* Track List */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
              <span>ACTIVE CYCLE TRACKS ({tracks.length})</span>
              <div className="flex gap-1">
                <button
                  onClick={() => crngFileInputRef.current?.click()}
                  className="text-[#7ce0be] hover:underline cursor-pointer"
                  title="Import Deluxe Paint CRNG binary chunk"
                >
                  + Import CRNG
                </button>
                <input
                  ref={crngFileInputRef}
                  type="file"
                  accept=".crng,.bin"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCRNGImport(f);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {tracks.length === 0 ? (
              <div className="text-[11px] font-mono text-[var(--text-muted)] p-3 text-center bg-[var(--desk-surface)] rounded-[2px] border border-dashed border-[var(--desk-border)]">
                No cycle tracks configured. Click below to create one!
              </div>
            ) : (
              tracks.map((track) => (
                <div
                  key={track.id}
                  className={`flex flex-col gap-1.5 p-2 rounded-[2px] border text-[10px] font-mono transition-colors ${
                    track.enabled
                      ? 'bg-[var(--desk-surface-raised)] border-[#f0be7c]/60'
                      : 'bg-[var(--desk-surface)] border-[var(--desk-border)] opacity-60'
                  }`}
                >
                  {/* Track Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={track.enabled}
                        onChange={(e) =>
                          updatePaletteCycleTrack(currentPalette.id, track.id, {
                            enabled: e.target.checked,
                          })
                        }
                        className="accent-[#f0be7c] cursor-pointer"
                      />
                      <span className="font-bold text-[var(--text-heading)]">
                        {track.name || `Track [${track.low}..${track.high}]`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleExportCRNG(track)}
                        className="text-[9px] text-[#7ce0be] hover:underline cursor-pointer"
                        title="Export as Deluxe Paint CRNG binary file"
                      >
                        CRNG
                      </button>
                      <button
                        onClick={() => deletePaletteCycleTrack(currentPalette.id, track.id)}
                        className="text-red-400 hover:text-red-300 px-1 cursor-pointer font-bold"
                        title="Delete track"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Range Swatch Bar */}
                  <div className="flex h-3 w-full rounded-[1px] overflow-hidden border border-[var(--desk-border)]">
                    {currentPalette.colors.slice(track.low, track.high + 1).map((c, i) => (
                      <div
                        key={`${track.id}-c-${i}`}
                        style={{ backgroundColor: c }}
                        className="flex-1 h-full"
                        title={`Register ${track.low + i}: ${c}`}
                      />
                    ))}
                  </div>

                  {/* Range Inputs & Frequency */}
                  <div className="grid grid-cols-3 gap-1.5 items-center">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-[var(--text-muted)]">Low / High:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={currentPalette.colors.length - 1}
                          value={track.low}
                          onChange={(e) =>
                            updatePaletteCycleTrack(currentPalette.id, track.id, {
                              low: Math.max(0, parseInt(e.target.value, 10) || 0),
                            })
                          }
                          className="w-10 bg-[var(--desk-surface)] border border-[var(--desk-border)] rounded-[2px] px-1 py-0.5 text-center text-[10px]"
                        />
                        <span>-</span>
                        <input
                          type="number"
                          min={0}
                          max={currentPalette.colors.length - 1}
                          value={track.high}
                          onChange={(e) =>
                            updatePaletteCycleTrack(currentPalette.id, track.id, {
                              high: Math.max(0, parseInt(e.target.value, 10) || 0),
                            })
                          }
                          className="w-10 bg-[var(--desk-surface)] border border-[var(--desk-border)] rounded-[2px] px-1 py-0.5 text-center text-[10px]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-[var(--text-muted)]">Rate (Hz):</span>
                      <input
                        type="number"
                        min={0.1}
                        max={60}
                        step={0.5}
                        value={track.rate}
                        onChange={(e) =>
                          updatePaletteCycleTrack(currentPalette.id, track.id, {
                            rate: Math.max(0.1, parseFloat(e.target.value) || 1),
                          })
                        }
                        className="w-full bg-[var(--desk-surface)] border border-[var(--desk-border)] rounded-[2px] px-1 py-0.5 text-center text-[10px]"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-[var(--text-muted)]">Direction:</span>
                      <select
                        value={track.direction}
                        onChange={(e) =>
                          updatePaletteCycleTrack(currentPalette.id, track.id, {
                            direction: e.target.value as 'forward' | 'reverse' | 'ping-pong',
                          })
                        }
                        className="bg-[var(--desk-surface)] border border-[var(--desk-border)] rounded-[2px] px-1 py-0.5 text-[9px]"
                      >
                        <option value="forward">Forward</option>
                        <option value="reverse">Reverse</option>
                        <option value="ping-pong">Ping-Pong</option>
                      </select>
                    </div>
                  </div>

                  {/* BlendShift Sub-step Interpolation */}
                  <label className="flex items-center justify-between pt-0.5 cursor-pointer">
                    <span className="text-[9px] text-[var(--text-muted)]">
                      BlendShift (Smooth Sub-step Color Blend)
                    </span>
                    <input
                      type="checkbox"
                      checked={track.blendShift}
                      onChange={(e) =>
                        updatePaletteCycleTrack(currentPalette.id, track.id, {
                          blendShift: e.target.checked,
                        })
                      }
                      className="accent-[#7ce0be] cursor-pointer"
                    />
                  </label>
                </div>
              ))
            )}

            {/* Add Track Button */}
            <button
              onClick={handleAddTrack}
              className="w-full bg-[var(--desk-surface-raised)] hover:bg-[#2e2040] text-[#f0be7c] font-bold text-[10px] font-mono py-1.5 rounded-[2px] border border-[var(--desk-border)] transition-colors cursor-pointer text-center flex items-center justify-center gap-1 mt-1"
            >
              <PixelIcon name="plus" size={12} />
              <span>+ Add Color Range Track</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
