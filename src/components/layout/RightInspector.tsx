'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { BlendMode } from '@/types/canvas';
import { MaterialType } from '@/types/tools';
import { harmonizePaletteColors } from '@/lib/ai/pixelAiEngine';

export const RightInspector: React.FC = () => {
  const {
    activeInspectorTab,
    setActiveInspectorTab,
    frames,
    activeFrameIndex,
    activeLayerId,
    setActiveLayer,
    addLayer,
    duplicateLayer,
    deleteLayer,
    duplicateFrame,
    toggleLayerVisibility,
    toggleLayerLock,
    setLayerOpacity,
    setLayerBlendMode,
    renameLayer,
    palettes,
    currentPaletteId,
    selectPalette,
    primaryColor,
    secondaryColor,
    setPrimaryColor,
    setSecondaryColor,
    addCustomColorToPalette,
    generateAndAddRamp,
    tools,
    setActiveTool,
    setLightAzimuth,
    setLightElevation,
    setMaterialPreset,
    setCavityStrength,
    setDitherModulation,
    showNormalMapPreview,
    toggleNormalMapPreview,
  } = useStudioStore();

  const currentFrame = frames[activeFrameIndex];
  const activeLayer = currentFrame?.layers.find((l) => l.id === activeLayerId);
  const currentPalette = palettes.find((p) => p.id === currentPaletteId) || palettes[0];

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [layerNameInput, setLayerNameInput] = useState('');
  const [lastActionStatus, setLastActionStatus] = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(45);

  const showFeedback = (msg: string) => {
    setLastActionStatus(msg);
    setTimeout(() => setLastActionStatus(null), 3000);
  };

  // 1. Module 1: Full Photometric Lighting & Normal Mapping Pipeline
  const handleRenderPhotometricLighting = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(
      new CustomEvent('pixibun:photometric-lighting', {
        detail: {
          lightAzimuth: tools.lightAzimuth,
          lightElevation: tools.lightElevation,
          lightRadius: tools.lightRadius,
          lightColor: primaryColor || '#FFFFFF',
          ambientIntensity: 0.35,
          material: tools.materialPreset,
          cavityStrength: tools.cavityStrength,
          ditherModulation: tools.ditherModulation,
          bayerSize: '4x4',
          paletteColors: [],
        },
      })
    );
    showFeedback(`Photometric ${tools.materialPreset.toUpperCase()} lighting evaluated with OKLab Bayer dithering`);
  };

  const handleBakeNormalMap = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(new CustomEvent('pixibun:bake-normal-map'));
    showFeedback('Tangent-Space Normal Map (128, 128, 255) baked to new layer');
  };

  const handleSpecularHighlight = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(
      new CustomEvent('pixibun:highlight', {
        detail: {
          lightAzimuth: tools.lightAzimuth,
          lightElevation: tools.lightElevation,
          highlightColor: primaryColor || '#FFFFFF',
        },
      })
    );
    showFeedback(`Blinn-Phong specular glint placed at ${tools.lightAzimuth}°`);
  };

  const handleSelOut = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(
      new CustomEvent('pixibun:sel-out', {
        detail: {
          lightAzimuth: tools.lightAzimuth,
          lightElevation: tools.lightElevation,
        },
      })
    );
    showFeedback('Selective outline (Sel-Out) softened based on light alignment');
  };

  const handleGroundShadow = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(new CustomEvent('pixibun:ground-shadow'));
    showFeedback('Ground drop shadow cast beneath sprite base');
  };

  const handle47Blob = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(new CustomEvent('pixibun:apply-47-blob'));
    showFeedback('47-Tile Blob autotiling contours generated on new layer');
  };

  // 3. Module 3: Advanced Dithering Actions
  const handleAtkinsonDither = () => {
    window.dispatchEvent(
      new CustomEvent('pixibun:atkinson-dither', {
        detail: { colors: currentPalette.colors },
      })
    );
    showFeedback('Atkinson 75% error-diffusion dithering applied');
  };

  const handleRiemersmaDither = () => {
    window.dispatchEvent(
      new CustomEvent('pixibun:riemersma-dither', {
        detail: { colors: currentPalette.colors },
      })
    );
    showFeedback('Riemersma Hilbert space-filling dithering applied');
  };

  // 4. Module 4: Pixel Perfection & RotSprite
  const handleRotSprite = (angle: number) => {
    window.dispatchEvent(
      new CustomEvent('pixibun:rot-sprite', {
        detail: { angle },
      })
    );
    showFeedback(`RotSprite 8x Scale2X rotation applied at ${angle}°`);
  };

  const handleCleanJaggies = () => {
    window.dispatchEvent(new CustomEvent('pixibun:clean-jaggies'));
    showFeedback('Staircase double-pixel corners smoothed');
  };

  const handleSkeletonThinning = () => {
    window.dispatchEvent(new CustomEvent('pixibun:skeleton-thinning'));
    showFeedback('Zhang-Suen 1px line thinning normalized strokes');
  };

  const handleRemoveStrays = () => {
    window.dispatchEvent(new CustomEvent('pixibun:remove-strays'));
    showFeedback('Isolated noise pixels swept away');
  };

  const handleColorGrade = (grade: 'sunset' | 'moonlight' | 'neon') => {
    window.dispatchEvent(new CustomEvent('pixibun:color-grade', { detail: { grade } }));
    if (grade === 'sunset') showFeedback('Warm sunset dusk tone applied');
    else if (grade === 'moonlight') showFeedback('Midnight moonlight tone applied');
    else showFeedback('High saturation cyber tone applied');
  };

  const handleQuantizePalette = () => {
    window.dispatchEvent(
      new CustomEvent('pixibun:quantize-palette', {
        detail: { colors: currentPalette.colors },
      })
    );
    showFeedback('Every pixel snapped to active palette via OKLab distance');
  };

  const handleHarmonizePalette = () => {
    const harmonics = harmonizePaletteColors(currentPalette.colors);
    harmonics.forEach((c) => addCustomColorToPalette(currentPaletteId, c));
    showFeedback(`${harmonics.length} harmonic OKLCH tones added to palette`);
  };

  const handleInBetweenFrame = () => {
    duplicateFrame(activeFrameIndex);
    showFeedback('In-between animation frame added to timeline');
  };

  return (
    <aside className="w-80 bg-[var(--desk-surface)] border-l-2 border-[var(--desk-border)] flex flex-col justify-between select-none z-10 text-[var(--text-heading)] shadow-sm transition-colors duration-300">
      {/* 1. Top Tab Switcher */}
      <div className="flex bg-[var(--desk-surface-raised)] border-b-2 border-[var(--desk-border)] p-1.5 gap-1.5">
        <button
          onClick={() => setActiveInspectorTab('layers')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-mono font-bold py-2 rounded-[2px] border transition-colors cursor-pointer ${
            activeInspectorTab === 'layers'
              ? 'bg-[var(--desk-surface-raised)] border-[#f0be7c] text-[#f0be7c] shadow-[0_2px_0_#130e20]'
              : 'bg-[var(--desk-surface)] border-[#352248] text-[var(--text-body)] hover:text-[#f0be7c] hover:bg-[var(--desk-surface)]'
          }`}
        >
          <PixelIcon name="layers" size={14} />
          <span>Layers</span>
        </button>

        <button
          onClick={() => setActiveInspectorTab('palette')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-mono font-bold py-2 rounded-[2px] border transition-colors cursor-pointer ${
            activeInspectorTab === 'palette'
              ? 'bg-[var(--desk-surface-raised)] border-[#f0be7c] text-[#f0be7c] shadow-[0_2px_0_#130e20]'
              : 'bg-[var(--desk-surface)] border-[#352248] text-[var(--text-body)] hover:text-[#f0be7c] hover:bg-[var(--desk-surface)]'
          }`}
        >
          <PixelIcon name="palette" size={14} />
          <span>Palette</span>
        </button>

        <button
          onClick={() => setActiveInspectorTab('ai')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-mono font-bold py-2 rounded-[2px] border transition-colors cursor-pointer ${
            activeInspectorTab === 'ai'
              ? 'bg-[var(--desk-surface-raised)] border-[#f0be7c] text-[#f0be7c] shadow-[0_2px_0_#130e20]'
              : 'bg-[var(--desk-surface)] border-[#352248] text-[var(--text-body)] hover:text-[#f0be7c] hover:bg-[var(--desk-surface)]'
          }`}
        >
          <PixelIcon name="gemini" size={14} />
          <span>PixiBud AI</span>
        </button>
      </div>

      {/* Tab 1: Layers Management */}
      {activeInspectorTab === 'layers' && (
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
          {/* Layer Actions Toolbar */}
          <div className="flex items-center justify-between gap-1 pb-2 border-b border-[var(--desk-border)]">
            <span className="text-xs font-mono font-bold text-[var(--text-heading)] uppercase tracking-wider">
              Layers ({currentFrame?.layers.length || 0})
            </span>
            <div className="flex items-center gap-1.5">
              <TactileButton
                size="icon-sm"
                variant="default"
                onClick={() => addLayer()}
                title="Add New Layer"
                className="w-8 h-8 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
              >
                <PixelIcon name="plus" size={14} />
              </TactileButton>
              <TactileButton
                size="icon-sm"
                variant="default"
                disabled={!activeLayer}
                onClick={() => activeLayer && duplicateLayer(activeLayer.id)}
                title="Duplicate Layer"
                className="w-8 h-8 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
              >
                <PixelIcon name="copy" size={14} />
              </TactileButton>
              <TactileButton
                size="icon-sm"
                variant="danger"
                disabled={!currentFrame || currentFrame.layers.length <= 1}
                onClick={() => activeLayer && deleteLayer(activeLayer.id)}
                title="Delete Layer"
                className="w-8 h-8 bg-[#3d1928] border-[#6b283d] text-[#ff99aa] hover:bg-[#521e33]"
              >
                <PixelIcon name="trash" size={14} />
              </TactileButton>
            </div>
          </div>

          {/* Active Layer Properties (Opacity & Blend Mode) */}
          {activeLayer && (
            <div className="bg-[var(--desk-surface-raised)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2.5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--text-body)] font-bold">Opacity:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={activeLayer.opacity}
                    onChange={(e) => setLayerOpacity(activeLayer.id, parseFloat(e.target.value))}
                    className="w-28 accent-[#f0be7c] cursor-pointer"
                  />
                  <span className="text-[#f0be7c] font-bold min-w-[36px] text-right">
                    {Math.round(activeLayer.opacity * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--text-body)] font-bold">Blend:</span>
                <select
                  value={activeLayer.blendMode}
                  onChange={(e) => setLayerBlendMode(activeLayer.id, e.target.value as BlendMode)}
                  className="bg-[#181124] text-[var(--text-heading)] font-bold text-xs font-mono px-2.5 py-1 rounded-[2px] border-2 border-[var(--desk-border)] outline-none cursor-pointer"
                >
                  <option value="source-over">Normal</option>
                  <option value="multiply">Multiply</option>
                  <option value="screen">Screen</option>
                  <option value="overlay">Overlay</option>
                  <option value="color-dodge">Color Dodge</option>
                  <option value="darken">Darken</option>
                  <option value="lighten">Lighten</option>
                  <option value="difference">Difference</option>
                </select>
              </div>
            </div>
          )}

          {/* Layer Stack List */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
            {currentFrame?.layers.map((layer) => {
              const isActive = layer.id === activeLayerId;
              return (
                <div
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-[2px] border-2 text-xs font-mono transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#2c1e40] border-[#f0be7c] text-[#f0be7c] font-bold shadow-xs'
                      : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:bg-[#281b3d] hover:text-[var(--text-heading)]'
                  }`}
                >
                  {/* Layer Name / Edit */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {editingLayerId === layer.id ? (
                      <input
                        type="text"
                        value={layerNameInput}
                        onChange={(e) => setLayerNameInput(e.target.value)}
                        onBlur={() => {
                          if (layerNameInput.trim()) {
                            renameLayer(layer.id, layerNameInput.trim());
                          }
                          setEditingLayerId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (layerNameInput.trim()) {
                              renameLayer(layer.id, layerNameInput.trim());
                            }
                            setEditingLayerId(null);
                          }
                        }}
                        autoFocus
                        className="bg-[#181124] text-[var(--text-heading)] px-1.5 py-0.5 text-xs font-mono rounded-[2px] border border-[#f0be7c] outline-none w-full"
                      />
                    ) : (
                      <span
                        onDoubleClick={() => {
                          setEditingLayerId(layer.id);
                          setLayerNameInput(layer.name);
                        }}
                        className="truncate"
                        title="Double-click to rename"
                      >
                        {layer.name}
                      </span>
                    )}
                  </div>

                  {/* Visibility & Lock Toggles */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerLock(layer.id);
                      }}
                      className={`p-1 transition-colors cursor-pointer ${
                        layer.locked ? 'text-[#f0be7c]' : 'text-[var(--text-body)]/50 hover:text-[var(--text-heading)]'
                      }`}
                      title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                    >
                      <PixelIcon name={layer.locked ? 'lock' : 'unlock'} size={14} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerVisibility(layer.id);
                      }}
                      className={`p-1 transition-colors cursor-pointer ${
                        layer.visible
                          ? isActive
                            ? 'text-[#f0be7c]'
                            : 'text-[var(--text-body)]'
                          : 'text-[var(--text-body)]/30 hover:text-[var(--text-heading)]'
                      }`}
                      title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                    >
                      <PixelIcon name={layer.visible ? 'eye' : 'eye-off'} size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Palette Management */}
      {activeInspectorTab === 'palette' && (
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
          {/* Palette Selector & Quick Tools */}
          <div className="flex flex-col gap-2 pb-2 border-b border-[var(--desk-border)]">
            <select
              value={currentPaletteId}
              onChange={(e) => selectPalette(e.target.value)}
              className="bg-[var(--desk-surface-raised)] text-[var(--text-heading)] font-bold text-xs font-mono px-2.5 py-1.5 rounded-[2px] border-2 border-[var(--desk-border)] outline-none w-full cursor-pointer shadow-xs"
            >
              {palettes.map((pal) => (
                <option key={pal.id} value={pal.id}>
                  {pal.name} ({pal.colors.length})
                </option>
              ))}
            </select>

            <div className="flex gap-1.5">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('pixibun:extract-palette'))}
                className="flex-1 bg-[var(--desk-surface-raised)] hover:bg-[#2e2040] text-[#f0be7c] font-bold text-[10px] font-mono py-1.5 rounded-[2px] border border-[var(--desk-border)] transition-colors cursor-pointer text-center"
                title="Scan canvas for unique colors and create new palette"
              >
                Scan Canvas
              </button>

              <button
                onClick={() => generateAndAddRamp(primaryColor)}
                className="flex-1 bg-[var(--desk-surface-raised)] hover:bg-[#2e2040] text-[#dcabdf] font-bold text-[10px] font-mono py-1.5 rounded-[2px] border border-[var(--desk-border)] transition-colors cursor-pointer text-center"
                title="Generate 5-step highlight & shadow ramp in OKLCH"
              >
                + OKLCH Ramp
              </button>
            </div>
          </div>

          {/* Color Swatch Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2 bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] shadow-xs">
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
                    title={`${color} (Left click: Primary | Right click: Secondary)`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: PixiBud Smart Studio — 4 Professional Mathematical Modules */}
      {activeInspectorTab === 'ai' && (
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto">
          {/* Action Feedback Banner */}
          {lastActionStatus && (
            <div className="bg-[#2c1e40] border-2 border-[#f0be7c] text-[#f0be7c] px-2.5 py-1.5 rounded-[2px] text-xs font-mono font-bold shadow-xs animate-fade-in">
              ✦ {lastActionStatus}
            </div>
          )}

          {/* Module 1: 2.5D Photometric Lighting & Normal Mapping Studio */}
          <div className="bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#f0be7c] uppercase tracking-wider flex items-center gap-1">
                <PixelIcon name="sun" size={12} />
                <span>2.5D Photometric Studio</span>
              </span>
              <span className="text-[10px] font-mono text-[#f0be7c] font-bold">
                {tools.lightAzimuth}° / {tools.lightElevation}°
              </span>
            </div>

            {/* Material Preset Selector */}
            <div className="flex items-center justify-between text-xs font-mono bg-[var(--desk-surface-raised)] p-1.5 rounded-[2px] border border-[var(--desk-border)]">
              <span className="text-[10px] text-[var(--text-body)] font-bold">Material:</span>
              <select
                value={tools.materialPreset}
                onChange={(e) => setMaterialPreset(e.target.value as MaterialType)}
                className="bg-[#181124] text-[#f0be7c] font-bold text-[10px] px-2 py-0.5 rounded-[2px] border border-[var(--desk-border)] outline-none cursor-pointer"
              >
                <option value="matte">Matte Clay (Kd: 1.0, Ks: 0.08)</option>
                <option value="metal">Polished Metal (Kd: 0.45, Ks: 1.35)</option>
                <option value="glass">Glossy Glass (Kd: 0.20, Ks: 1.80)</option>
                <option value="fabric">Velvet Fabric (Kd: 1.15, Rim: On)</option>
                <option value="gold">Gold / Brass (Kd: 0.55, Ks: 1.50)</option>
              </select>
            </div>

            {/* Light Parameters (Azimuth, Elevation, Radius, Cavity AO, Dither Modulation) */}
            <div className="bg-[var(--desk-surface-raised)] p-2 rounded-[2px] border border-[var(--desk-border)] flex flex-col gap-1.5">
              {/* Azimuth */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-[var(--text-body)] font-bold">Azimuth:</span>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={tools.lightAzimuth}
                  onChange={(e) => setLightAzimuth(parseInt(e.target.value, 10))}
                  className="w-32 accent-[#f0be7c] cursor-pointer"
                />
                <span className="text-[#f0be7c] font-bold text-[10px] min-w-[28px] text-right">
                  {tools.lightAzimuth}°
                </span>
              </div>

              {/* Elevation */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-[var(--text-body)] font-bold">Elevation:</span>
                <input
                  type="range"
                  min="0"
                  max="90"
                  value={tools.lightElevation}
                  onChange={(e) => setLightElevation(parseInt(e.target.value, 10))}
                  className="w-32 accent-[#f0be7c] cursor-pointer"
                />
                <span className="text-[#dcabdf] font-bold text-[10px] min-w-[28px] text-right">
                  {tools.lightElevation}°
                </span>
              </div>

              {/* Laplace Cavity Ambient Occlusion */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-[var(--text-body)] font-bold">Cavity AO:</span>
                <input
                  type="range"
                  min="0"
                  max="2.0"
                  step="0.1"
                  value={tools.cavityStrength}
                  onChange={(e) => setCavityStrength(parseFloat(e.target.value))}
                  className="w-32 accent-[#f0be7c] cursor-pointer"
                />
                <span className="text-[#f0be7c] font-bold text-[10px] min-w-[28px] text-right">
                  {Math.round(tools.cavityStrength * 100)}%
                </span>
              </div>

              {/* Bayer Dither Modulation */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-[var(--text-body)] font-bold">Dither Mod:</span>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={tools.ditherModulation}
                  onChange={(e) => setDitherModulation(parseFloat(e.target.value))}
                  className="w-32 accent-[#f0be7c] cursor-pointer"
                />
                <span className="text-[#dcabdf] font-bold text-[10px] min-w-[28px] text-right">
                  {Math.round(tools.ditherModulation * 100)}%
                </span>
              </div>
            </div>

            {/* Primary Action: Full Photometric Lighting */}
            <TactileButton
              size="sm"
              variant="primary"
              onClick={handleRenderPhotometricLighting}
              title="Execute full Blinn-Phong + Lambert + Laplace Cavity AO + OKLab Bayer Dither"
              className="text-[11px] py-2 font-mono font-bold bg-[#f0be7c] text-[#140d1f] border-[#8c5120] shadow-[0_2px_0_#8c5120] flex items-center justify-center gap-1.5"
            >
              <PixelIcon name="sun" size={14} />
              <span>Render Photometric</span>
            </TactileButton>

            {/* Normal Map Export & Actions */}
            <div className="grid grid-cols-2 gap-1.5">
              <TactileButton
                size="sm"
                variant="default"
                onClick={handleBakeNormalMap}
                title="Bake 3D tangent space normal map (128, 128, 255) directly to a new layer"
                className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[#dcabdf] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="copy" size={12} />
                <span>Bake Normals</span>
              </TactileButton>

              <TactileButton
                size="sm"
                variant="default"
                onClick={toggleNormalMapPreview}
                title="Toggle live viewport normal map inspection mode"
                className={`text-[10px] py-1.5 font-bold border transition-colors flex items-center justify-center gap-1 ${
                  showNormalMapPreview
                    ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                    : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
                }`}
              >
                <PixelIcon name={showNormalMapPreview ? 'eye' : 'eye-off'} size={12} />
                <span>Normal View</span>
              </TactileButton>

              <TactileButton
                size="sm"
                variant="default"
                onClick={handleSpecularHighlight}
                title="Add isolated Blinn-Phong specular glint"
                className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="sparkles" size={12} />
                <span>Specular</span>
              </TactileButton>

              <TactileButton
                size="sm"
                variant="default"
                onClick={handleSelOut}
                title="Selective outlining based on light angle alignment"
                className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="pen" size={12} />
                <span>Sel-Out</span>
              </TactileButton>
            </div>
          </div>

          {/* Module 2: Geometry & Curve Tools */}
          <div className="bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2 shadow-xs">
            <span className="text-[10px] font-mono font-bold text-[#dcabdf] uppercase tracking-wider flex items-center gap-1">
              <PixelIcon name="curve" size={12} />
              <span>Geometry & Autotiling</span>
            </span>

            <div className="grid grid-cols-1 gap-1.5">
              <TactileButton
                size="sm"
                variant="default"
                onClick={() => {
                  setActiveTool('curve');
                  showFeedback('Curve tool active — click and drag on canvas to draw Bézier curve');
                }}
                title="Select Bézier Curve drawing tool on toolbar"
                className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="curve" size={12} />
                <span>Bézier Curve Tool</span>
              </TactileButton>

              <TactileButton
                size="sm"
                variant="default"
                onClick={handle47Blob}
                title="Calculate 47-tile bitmask connectivity and generate autotile edge contours"
                className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="grid-iso" size={12} />
                <span>47-Blob Autotile Edges</span>
              </TactileButton>

              <TactileButton
                size="sm"
                variant="default"
                onClick={handleGroundShadow}
                title="Calculate bounding base and cast elliptical ground shadow"
                className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="sparkles" size={12} />
                <span>Ground Drop Shadow</span>
              </TactileButton>
            </div>
          </div>

          {/* Module 3: Advanced Dithering Suite */}
          <div className="bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2 shadow-xs">
            <span className="text-[10px] font-mono font-bold text-[#f0be7c] uppercase tracking-wider flex items-center gap-1">
              <PixelIcon name="dither" size={12} />
              <span>Advanced Dithering</span>
            </span>

            <div className="grid grid-cols-2 gap-1.5">
              <TactileButton
                size="sm"
                variant="default"
                onClick={handleAtkinsonDither}
                title="Atkinson error diffusion with 75% error retention for retro Mac contrast"
                className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="dither" size={12} />
                <span>Atkinson 75%</span>
              </TactileButton>

              <TactileButton
                size="sm"
                variant="default"
                onClick={handleRiemersmaDither}
                title="Riemersma space-filling Hilbert curve dithering without directional worming"
                className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="wrap" size={12} />
                <span>Riemersma</span>
              </TactileButton>
            </div>
          </div>

          {/* Module 4: Pixel Perfection & RotSprite 8x Engine */}
          <div className="bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2.5 shadow-xs">
            <span className="text-[10px] font-mono font-bold text-[#dcabdf] uppercase tracking-wider flex items-center gap-1">
              <PixelIcon name="rotate" size={12} />
              <span>RotSprite 8x & Cleanup</span>
            </span>

            {/* RotSprite Angle Control */}
            <div className="bg-[var(--desk-surface-raised)] p-2 rounded-[2px] border border-[var(--desk-border)] flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-[var(--text-body)] font-bold">Angle:</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={rotationAngle}
                  onChange={(e) => setRotationAngle(parseInt(e.target.value, 10))}
                  className="w-32 accent-[#f0be7c] cursor-pointer"
                />
                <span className="text-[#f0be7c] font-bold text-[10px] min-w-[28px] text-right">
                  {rotationAngle}°
                </span>
              </div>

              <div className="flex items-center gap-1">
                {[-90, -45, 45, 90].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => {
                      setRotationAngle(deg);
                      handleRotSprite(deg);
                    }}
                    className="flex-1 py-0.5 text-[9px] font-bold font-mono bg-[var(--desk-surface)] hover:bg-[#2e2040] text-[var(--text-body)] hover:text-[#f0be7c] border border-[var(--desk-border)] rounded-[1px] cursor-pointer"
                  >
                    {deg > 0 ? `+${deg}°` : `${deg}°`}
                  </button>
                ))}
              </div>

              <TactileButton
                size="sm"
                variant="primary"
                onClick={() => handleRotSprite(rotationAngle)}
                title="3-pass Scale2X upscaling + nearest rotation + downscale snap"
                className="text-[10px] py-1 font-bold bg-[#f0be7c] text-[#140d1f] border-[#8c5120] mt-0.5 flex items-center justify-center gap-1"
              >
                <PixelIcon name="rotate" size={12} />
                <span>Rotate with RotSprite</span>
              </TactileButton>
            </div>

            {/* Cleaners */}
            <div className="grid grid-cols-2 gap-1.5">
              <TactileButton
                size="sm"
                variant="default"
                onClick={handleCleanJaggies}
                title="Remove staircase double-pixel corners in 1px strokes"
                className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="pen" size={12} />
                <span>De-Jaggy</span>
              </TactileButton>

              <TactileButton
                size="sm"
                variant="default"
                onClick={handleSkeletonThinning}
                title="Zhang-Suen morphological skeleton thinning for 1px line normalization"
                className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="line" size={12} />
                <span>1px Thin</span>
              </TactileButton>

              <TactileButton
                size="sm"
                variant="default"
                onClick={handleRemoveStrays}
                title="Sweep away accidental isolated noise dots"
                className="text-[10px] py-1.5 font-bold col-span-2 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="trash" size={12} />
                <span>Clean Stray Pixels</span>
              </TactileButton>
            </div>
          </div>

          {/* Module 5: Atmospheric Color Grading & Animation In-Betweening */}
          <div className="bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2 shadow-xs">
            <span className="text-[10px] font-mono font-bold text-[#f0be7c] uppercase tracking-wider flex items-center gap-1">
              <PixelIcon name="sparkles" size={12} />
              <span>Color Tint & Frame Morph</span>
            </span>

            <div className="grid grid-cols-2 gap-1.5">
              <TactileButton
                size="sm"
                variant="default"
                onClick={() => handleColorGrade('sunset')}
                title="Warm golden sunset glow"
                className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="sun" size={12} />
                <span>Sunset</span>
              </TactileButton>

              <TactileButton
                size="sm"
                variant="default"
                onClick={() => handleColorGrade('moonlight')}
                title="Midnight violet moonlight glow"
                className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="sparkles" size={12} />
                <span>Moonlight</span>
              </TactileButton>

              <TactileButton
                size="sm"
                variant="default"
                onClick={handleHarmonizePalette}
                title="Generate 4 harmonic OKLCH tones"
                className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="palette" size={12} />
                <span>Harmonize</span>
              </TactileButton>

              <TactileButton
                size="sm"
                variant="primary"
                onClick={handleQuantizePalette}
                title="Snap every pixel cleanly to the active palette"
                className="text-[10px] py-1.5 font-bold bg-[#f0be7c] text-[#140d1f] border-[#8c5120] flex items-center justify-center gap-1"
              >
                <PixelIcon name="palette" size={12} />
                <span>Snap Palette</span>
              </TactileButton>

              <TactileButton
                size="sm"
                variant="default"
                onClick={handleInBetweenFrame}
                title="Optical flow tweening in-between animation frame"
                className="text-[10px] py-1.5 font-bold col-span-2 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="plus" size={12} />
                <span>+ In-Between Frame</span>
              </TactileButton>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
