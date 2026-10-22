'use client';
import { AnimatePresence } from 'motion/react';

import { SafeJson } from '@/lib/safety/safeJson';
import { reportImportError } from '@/lib/project/importFile';
import React, { useRef, useState, useCallback } from 'react';
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
import { studioEvents } from '@/lib/events/studioEvents';
import { MAX_PALETTE_CYCLE_TRACKS, paletteCycleTrackError } from '@/lib/color/paletteAdmission';
import PanelSection from '@/components/ui/PanelSection';
import StudioSelect from '@/components/ui/StudioSelect';
import StudioNumberInput from '@/components/ui/StudioNumberInput';
import StudioToggle from '@/components/ui/StudioToggle';
import IconButton from '@/components/ui/IconButton';
import { TactileButton } from '@/components/ui/TactileButton';
import { PaletteRolesSection } from './PaletteRolesSection';
import { InspectorSection } from './InspectorKit';
import { CreatePaletteModal } from '@/components/modals/CreatePaletteModal';
import { PaletteCycleColors } from './PaletteCycleColors';
import { PinnedColorPanel } from '@/components/ui/ArtistColorPicker';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { lazyPanel } from '@/components/system/lazyPanel';
const PaletteLibraryModal = lazyPanel(
  () => import('@/components/modals/PaletteLibraryModal').then(m => m.PaletteLibraryModal),
  'Palette library'
);

/** `basics={false}` leaves out the picker, palette chooser and swatches (Labs: Paint pot shows its own). */
export const PalettePanel: React.FC<{ basics?: boolean }> = ({ basics = true }) => {
  const colorPinned = useWorkspaceStore(s => s.layout.color);
  const palettes = useStudioStore((s) => s.palettes);
  const currentPaletteId = useStudioStore((s) => s.currentPaletteId);
  const selectPalette = useStudioStore((s) => s.selectPalette);
  const primaryColor = useStudioStore((s) => s.primaryColor);
  const secondaryColor = useStudioStore((s) => s.secondaryColor);
  const setPrimaryColor = useStudioStore((s) => s.setPrimaryColor);
  const setSecondaryColor = useStudioStore((s) => s.setSecondaryColor);
  const generateAndAddRamp = useStudioStore((s) => s.generateAndAddRamp);
  const addExtractedPalette = useStudioStore((s) => s.addExtractedPalette);
  const removePaletteColor = useStudioStore((s) => s.removePaletteColor);
  const isPaletteCycling = useStudioStore((s) => s.isPaletteCycling);
  const togglePaletteCycling = useStudioStore((s) => s.togglePaletteCycling);
  const paletteCycleSpeedMultiplier = useStudioStore((s) => s.paletteCycleSpeedMultiplier);
  const setPaletteCycleSpeedMultiplier = useStudioStore((s) => s.setPaletteCycleSpeedMultiplier);
  const addPaletteCycleTrack = useStudioStore((s) => s.addPaletteCycleTrack);
  const updatePaletteCycleTrack = useStudioStore((s) => s.updatePaletteCycleTrack);
  const deletePaletteCycleTrack = useStudioStore((s) => s.deletePaletteCycleTrack);

  const currentPalette = palettes.find((p) => p.id === currentPaletteId) || palettes[0];
  const paletteFileInputRef = useRef<HTMLInputElement | null>(null);
  const crngFileInputRef = useRef<HTMLInputElement | null>(null);
  const [creatingPalette, setCreatingPalette] = useState(false);
  const [browsingPalettes, setBrowsingPalettes] = useState(false);
  const closePaletteCreator = useCallback(() => setCreatingPalette(false), []);
  const [selectedSwatch, setSelectedSwatch] = useState<{ paletteId: string; index: number } | null>(null);
  const selectedIndex = selectedSwatch?.paletteId === currentPalette.id
    ? Math.min(selectedSwatch.index, currentPalette.colors.length - 1)
    : currentPalette.colors.findIndex(color => color.toLowerCase() === primaryColor.toLowerCase());

  const tracks = currentPalette.cycleTracks || [];

  const handlePaletteImportFile = (file: File) => {
    if (file.size > SafeJson.MAX_PAYLOAD_BYTES) { reportImportError(new Error('Palette file exceeds the 50 MB limit.')); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      try {
        const pal = parsePaletteFile(content, file.name);
        addExtractedPalette(pal.name, pal.colors);
      } catch (err) {
        reportImportError(err);
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
        const error = paletteCycleTrackError(track, currentPalette.colors.length);
        if (error) throw new Error(error);
        addPaletteCycleTrack(currentPalette.id, track);
      } catch (err) {
        reportImportError(err);
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
      className="flex flex-col bg-[var(--desk-surface)]"
    >
      {basics && <>
      {/* 0. Color Studio: Wheel, HSV Sliders & Hex Controls */}
      <PinnedColorPanel defaultExpanded={true} pinned={colorPinned} />

      {/* 1. Which palette, and the two colors you paint with */}
      <InspectorSection
        title="Palette"
        meta={
          <span className="relative w-8 h-6 shrink-0" title={`Foreground ${primaryColor} · Background ${secondaryColor}`}>
            <span className="absolute right-0 bottom-0 w-4 h-4 rounded-[3px] border-2 border-[var(--desk-surface)] shadow-[0_0_0_1px_var(--desk-border)]" style={{ backgroundColor: secondaryColor }} />
            <span className="absolute left-0 top-0 w-4 h-4 rounded-[3px] border-2 border-[var(--desk-surface)] shadow-[0_0_0_1px_var(--desk-border)]" style={{ backgroundColor: primaryColor }} />
          </span>
        }
      >
        <div className="flex items-center gap-1.5">
          <select
            value={currentPaletteId}
            onChange={(e) => selectPalette(e.target.value)}
            aria-label="Color palette preset"
            className="flex-1 min-w-0 bg-[var(--surface-0)] text-[var(--text-heading)] px-2 py-1 rounded-[3px] border border-[var(--desk-border)] outline-none text-xs font-sans cursor-pointer hover:border-[var(--accent-gold)]/40 transition-colors truncate"
          >
            {palettes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.colors.length})
              </option>
            ))}
          </select>
          <TactileButton
            size="sm"
            onClick={() => setBrowsingPalettes(true)}
            title="Library and presets"
            className="h-7 px-2 text-[11px] shrink-0"
          >
            <PixelIcon name="layers" size={11} /> Browse palettes
          </TactileButton>
        </div>
      </InspectorSection>
      <AnimatePresence>{browsingPalettes && <PaletteLibraryModal key="PaletteLibraryModal" onClose={() => setBrowsingPalettes(false)} />}</AnimatePresence>

      {/* 2. Swatches */}
      <InspectorSection
        title="Swatches"
        meta={<span>{currentPalette.colors.length} colors</span>}
      >
        <div className="grid grid-cols-8 gap-1 p-1.5 rounded-[6px] bg-[var(--surface-0)]/70 border border-[var(--desk-border)] min-h-[48px] max-h-[200px] overflow-y-auto">
          {currentPalette.colors.map((color, idx) => {
            const isPrimary = color.toLowerCase() === primaryColor.toLowerCase();
            const isSecondary = color.toLowerCase() === secondaryColor.toLowerCase();

            return (
              <button
                key={`${color}-${idx}`}
                onClick={() => { setPrimaryColor(color); setSelectedSwatch({ paletteId: currentPalette.id, index: idx }); }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSecondaryColor(color);
                }}
                style={{ backgroundColor: color }}
                className={`aspect-square w-full rounded-[3px] border transition-transform hover:-translate-y-px cursor-pointer relative ${
                  isPrimary
                    ? 'border-white ring-2 ring-[var(--accent-gold)] z-10'
                    : isSecondary
                    ? 'border-white ring-2 ring-[var(--accent-plum)] ring-offset-0 z-10'
                    : 'border-black/20 hover:border-white/70'
                }`}
                title={`${color} [#${idx}] (Left-click: Primary | Right-click: Secondary)`}
                aria-label={`Select color ${color}`}
              >
                {(isPrimary || isSecondary) && (
                  <span aria-hidden="true" className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full border border-white ${isPrimary ? 'bg-[var(--accent-gold)]' : 'bg-[var(--accent-plum)]'}`} />
                )}
              </button>
            );
          })}
        </div>
        <p className="m-0 mt-1.5 text-[10px] text-[var(--text-muted)]">Click for foreground · right-click for background · drop a palette file here to import.</p>
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-4 h-4 rounded-[3px] border border-[var(--desk-border)] shrink-0"
              style={{ backgroundColor: selectedIndex >= 0 ? currentPalette.colors[selectedIndex] : 'transparent' }}
            />
            <span className="text-[11px] font-mono text-[var(--text-body)] truncate">
              {selectedIndex >= 0 ? `${currentPalette.colors[selectedIndex]} · #${selectedIndex}` : 'Choose a color'}
            </span>
          </div>
          <TactileButton
            size="sm"
            disabled={selectedIndex < 0 || currentPalette.colors.length <= 1}
            title={currentPalette.colors.length <= 1 ? 'Keep at least one color.' : 'Remove the selected swatch. Artwork stays unchanged.'}
            onClick={() => { if (removePaletteColor(currentPalette.id, selectedIndex)) setSelectedSwatch({ paletteId: currentPalette.id, index: Math.max(0, selectedIndex - 1) }); }}
            className="h-6 px-2 text-[10px] shrink-0"
          >
            <PixelIcon name="trash" size={11} /> Remove color
          </TactileButton>
        </div>
      </InspectorSection>
      </>}

      {/* 3. Grow the palette */}
      <InspectorSection title="Add colors">
        <div className="grid grid-cols-2 gap-1.5">
          <TactileButton
            variant="tactile"
            size="sm"
            onClick={() => setCreatingPalette(true)}
            className="justify-center h-8 text-xs font-semibold text-[var(--accent-gold)] border-[var(--accent-gold)]/40 hover:border-[var(--accent-gold)]"
          >
            <PixelIcon name="plus" size={11} /> Create palette
          </TactileButton>
          <TactileButton
            variant="tactile"
            size="sm"
            onClick={() => studioEvents.emit('pixibun:extract-palette')}
            title="Group the visible artwork into up to 6 main colors. Artwork stays unchanged."
            className="justify-center h-8 text-xs"
          >
            <PixelIcon name="eyedropper" size={11} /> Scan Canvas
          </TactileButton>
          <TactileButton
            variant="tactile"
            size="sm"
            onClick={() => generateAndAddRamp(primaryColor)}
            title="Add a 5-step highlight and shadow ramp built from the foreground color (OKLCH)"
            data-testid="oklch-ramp-button"
            className="justify-center h-8 text-xs"
          >
            <PixelIcon name="gradient" size={11} /> Shade ramp
          </TactileButton>
          <TactileButton
            variant="tactile"
            size="sm"
            onClick={() => paletteFileInputRef.current?.click()}
            title="Import a Lospec .hex or GIMP .gpl palette file (or drop it on this panel)"
            className="justify-center h-8 text-xs"
          >
            <PixelIcon name="import" size={11} /> Import file
          </TactileButton>
        </div>

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
      </InspectorSection>

      <AnimatePresence>{creatingPalette && <CreatePaletteModal key="CreatePaletteModal" onClose={closePaletteCreator} />}</AnimatePresence>

      {/* 4. Cycle Engine Section */}
      <PaletteRolesSection key={currentPalette.id} palette={currentPalette} />
      <PanelSection
        title="Cycle Engine"
        defaultOpen={isPaletteCycling}
        storageKey="palette-panel-cycling"
        actions={
          <IconButton 
            icon={isPaletteCycling ? 'pause' : 'play'} 
            onClick={togglePaletteCycling} 
            label={isPaletteCycling ? 'Pause Cycle' : 'Play Cycle'}
            size="sm"
            active={isPaletteCycling}
          />
        }
      >
        <div className="flex flex-col gap-3">
          <StudioSelect
            label="Playback Speed"
            value={paletteCycleSpeedMultiplier.toString()}
            options={[
              { value: "0.25", label: "0.25x" },
              { value: "0.5", label: "0.5x" },
              { value: "1", label: "1.0x" },
              { value: "2", label: "2.0x" },
              { value: "4", label: "4.0x" },
            ]}
            onChange={(val) => setPaletteCycleSpeedMultiplier(parseFloat(val))}
          />

          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold">CYCLE TRACKS ({tracks.length})</span>
            <div className="flex gap-1">
              <button
                onClick={() => crngFileInputRef.current?.click()}
                disabled={tracks.length >= MAX_PALETTE_CYCLE_TRACKS}
                className="text-[var(--accent-gold)] hover:underline cursor-pointer text-[10px] font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                title={tracks.length >= MAX_PALETTE_CYCLE_TRACKS ? 'Cycle track limit reached' : 'Import Deluxe Paint CRNG binary chunk'}
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
            <div className="text-[11px] font-mono text-[var(--text-muted)] p-3 text-center bg-[var(--surface-1)] rounded-[var(--radius-sm)] border border-dashed border-[var(--desk-border)]">
              No cycle tracks configured. Click below to create one!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {tracks.map((track) => (
                <PanelSection 
                  key={track.id} 
                  title={track.name || `Track [${track.low}..${track.high}]`}
                  defaultOpen={false}
                  className={`border border-[var(--desk-border)] rounded-[var(--radius-sm)] overflow-hidden ${track.enabled ? 'border-[var(--accent-gold)]/60' : 'opacity-80'}`}
                  actions={
                    <div className="flex items-center gap-2">
                      <StudioToggle
                        label=""
                        ariaLabel={`Enable ${track.name || `Track [${track.low}..${track.high}]`}`}
                        checked={track.enabled}
                        onChange={(val) => updatePaletteCycleTrack(currentPalette.id, track.id, { enabled: val })}
                      />
                      <TactileButton 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleExportCRNG(track)} 
                        title="Export as Deluxe Paint CRNG binary file"
                      >
                        CRNG
                      </TactileButton>
                      <IconButton 
                        icon="trash" 
                        variant="danger" 
                        size="sm" 
                        onClick={() => deletePaletteCycleTrack(currentPalette.id, track.id)} 
                        label="Delete track"
                      />
                    </div>
                  }
                >
                  <div className="flex flex-col gap-3">
                    <PaletteCycleColors colors={currentPalette.colors} track={track}
                      onChange={range => updatePaletteCycleTrack(currentPalette.id, track.id, range)} />

                    <div className="flex flex-col gap-2">
                      <details className="text-[10px] text-[var(--text-muted)]">
                        <summary className="cursor-pointer min-h-6 leading-6">Color index numbers</summary>
                        <div className="flex flex-col gap-2 pt-1">
                      <StudioNumberInput
                        label="Low Index"
                        value={track.low}
                        min={0}
                        max={track.high}
                        onChange={(val) => updatePaletteCycleTrack(currentPalette.id, track.id, { low: val })}
                      />
                      <StudioNumberInput
                        label="High Index"
                        value={track.high}
                        min={track.low}
                        max={currentPalette.colors.length - 1}
                        onChange={(val) => updatePaletteCycleTrack(currentPalette.id, track.id, { high: val })}
                      />
                        </div>
                      </details>
                      <StudioNumberInput
                        label="Rate (Hz)"
                        value={track.rate}
                        min={0.1}
                        max={60}
                        step={0.5}
                        inputStep="any"
                        onChange={(val) => updatePaletteCycleTrack(currentPalette.id, track.id, { rate: val })}
                      />
                      <StudioSelect
                        label="Direction"
                        value={track.direction}
                        options={[
                          { value: 'forward', label: 'Forward' },
                          { value: 'reverse', label: 'Reverse' },
                          { value: 'ping-pong', label: 'Ping-Pong' },
                        ]}
                        onChange={(val) => updatePaletteCycleTrack(currentPalette.id, track.id, { direction: val as 'forward' | 'reverse' | 'ping-pong' })}
                      />
                      <StudioToggle
                        label="BlendShift (Smooth)"
                        checked={track.blendShift}
                        onChange={(val) => updatePaletteCycleTrack(currentPalette.id, track.id, { blendShift: val })}
                      />
                    </div>
                  </div>
                </PanelSection>
              ))}
            </div>
          )}

          <TactileButton
            variant="tactile"
            size="md"
            onClick={handleAddTrack}
            disabled={tracks.length >= MAX_PALETTE_CYCLE_TRACKS}
            className="w-full mt-2"
          >
            <PixelIcon name="plus" size={12} />
            <span>Add Color Range Track</span>
          </TactileButton>
        </div>
      </PanelSection>
    </div>
  );
};
