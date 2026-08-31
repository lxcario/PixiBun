'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { BlendMode } from '@/types/canvas';
import { MaterialType, OpticalPresetType, AnisoFlowPreset, CelToneCount } from '@/types/tools';
import { harmonizePaletteColors } from '@/lib/ai/pixelAiEngine';

const SHADOW_COLOR_PRESETS = [
  { label: 'Indigo', hex: '#180B26' },
  { label: 'Obsidian', hex: '#0A0612' },
  { label: 'Umber', hex: '#26140B' },
  { label: 'Violet', hex: '#2E1065' },
  { label: 'Teal/Fog', hex: '#062419' },
];

export const RightInspector: React.FC = () => {
  const {
    canvasWidth,
    canvasHeight,
    activeInspectorTab,
    setActiveInspectorTab,
    frames,
    activeFrameIndex,
    activeLayerId,
    setActiveLayer,
    addLayer,
    duplicateLayer,
    deleteLayer,
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
    setLightBrightness,
    setMaterialPreset,
    setCavityStrength,
    setDitherModulation,
    setOpticalPreset,
    setTranslucencyDepth,
    setFresnelPower,
    setAnisoAngle,
    setAnisoFlow,
    setOpticalCelTones,
    showNormalMapPreview,
    toggleNormalMapPreview,
  } = useStudioStore();

  const currentFrame = frames[activeFrameIndex];
  const activeLayer = currentFrame?.layers.find((l) => l.id === activeLayerId);
  const currentPalette = palettes.find((p) => p.id === currentPaletteId) || palettes[0];
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [layerNameInput, setLayerNameInput] = useState('');
  const [rotationAngle, setRotationAngle] = useState<number>(45);

  // 2D Raymarched Soft Shadow State
  const [shadowLightX, setShadowLightX] = useState<number>(Math.round(canvasWidth / 2));
  const [shadowLightY, setShadowLightY] = useState<number>(Math.round(canvasHeight / 4));
  const [shadowLightRadius, setShadowLightRadius] = useState<number>(16);
  const [shadowOpacity, setShadowOpacity] = useState<number>(0.6);
  const [shadowColor, setShadowColor] = useState<string>('#180B26');
  const [shadowDitherMode, setShadowDitherMode] = useState<'none' | '2x2' | '4x4' | '8x8'>('4x4');

  // 1. Module 1: Full Photometric Lighting & Normal Mapping Pipeline
  const handleRenderPhotometricLighting = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(
      new CustomEvent('pixibun:photometric-lighting', {
        detail: {
          lightAzimuth: tools.lightAzimuth,
          lightElevation: tools.lightElevation,
          lightRadius: tools.lightRadius,
          lightBrightness: tools.lightBrightness,
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
  };

  const handleBakeNormalMap = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(new CustomEvent('pixibun:bake-normal-map'));
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
  };

  const handleGroundShadow = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(new CustomEvent('pixibun:ground-shadow'));
  };

  // 2D Raymarched Soft Shadows (Aaltonen Cone Tracing)
  const handleRenderCastShadow = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(
      new CustomEvent('pixibun:render-cast-shadow', {
        detail: {
          lightX: shadowLightX,
          lightY: shadowLightY,
          lightRadius: shadowLightRadius,
          shadowOpacity: shadowOpacity,
          shadowColor: shadowColor,
          ditherMode: shadowDitherMode,
        },
      })
    );
  };

  const handle47Blob = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(new CustomEvent('pixibun:apply-47-blob'));
  };

  // 2. Module 2: Volumetric Optics, SSS & Anisotropic Shaders
  const handleRenderVolumetricOptics = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(
      new CustomEvent('pixibun:volumetric-optics', {
        detail: {
          preset: tools.opticalPreset,
          translucencyDepth: tools.translucencyDepth,
          fresnelPower: tools.fresnelPower,
          anisoAngle: tools.anisoAngle,
          anisoFlow: tools.anisoFlow,
          celTones: tools.opticalCelTones,
          lightAzimuth: tools.lightAzimuth,
          lightElevation: tools.lightElevation,
          lightColor: primaryColor || '#FFFFFF',
          paletteColors: currentPalette.colors,
          ditherModulation: tools.ditherModulation,
        },
      })
    );
  };

  // 3. Module 3: Advanced Dithering Actions
  const handleAtkinsonDither = () => {
    window.dispatchEvent(
      new CustomEvent('pixibun:atkinson-dither', {
        detail: { colors: currentPalette.colors },
      })
    );
  };

  const handleRiemersmaDither = () => {
    window.dispatchEvent(
      new CustomEvent('pixibun:riemersma-dither', {
        detail: { colors: currentPalette.colors },
      })
    );
  };

  // 4. Module 4: Pixel Perfection & RotSprite
  const handleRotSprite = (angle: number) => {
    window.dispatchEvent(
      new CustomEvent('pixibun:rot-sprite', {
        detail: { angle },
      })
    );
  };

  const handleCleanJaggies = () => {
    window.dispatchEvent(new CustomEvent('pixibun:clean-jaggies'));
  };

  const handleSkeletonThinning = () => {
    window.dispatchEvent(new CustomEvent('pixibun:skeleton-thinning'));
  };

  const handleRemoveStrays = () => {
    window.dispatchEvent(new CustomEvent('pixibun:remove-strays'));
  };

  const handleColorGrade = (grade: 'sunset' | 'moonlight' | 'neon') => {
    window.dispatchEvent(new CustomEvent('pixibun:color-grade', { detail: { grade } }));
  };

  const handleQuantizePalette = () => {
    window.dispatchEvent(
      new CustomEvent('pixibun:quantize-palette', {
        detail: { colors: currentPalette.colors },
      })
    );
  };

  const handleHarmonizePalette = () => {
    const harmonics = harmonizePaletteColors(currentPalette.colors);
    harmonics.forEach((c) => addCustomColorToPalette(currentPaletteId, c));
  };

  const handleInBetweenFrame = () => {
    window.dispatchEvent(new CustomEvent('pixibun:in-between-frame'));
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
          <PixelIcon name="sparkles" size={14} />
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
                  className={`flex items-center justify-between px-2.5 py-2 rounded-[2px] border-2 text-xs font-mono transition-all ${
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
                        ref={(el) => el?.focus()}
                        aria-label="Layer name"
                        className="bg-[#181124] text-[var(--text-heading)] px-1.5 py-0.5 text-xs font-mono rounded-[2px] border border-[#f0be7c] outline-none w-full"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveLayer(layer.id)}
                        onDoubleClick={() => {
                          setEditingLayerId(layer.id);
                          setLayerNameInput(layer.name);
                        }}
                        className="truncate text-left bg-transparent border-0 p-0 text-inherit cursor-pointer flex-1 font-mono text-xs"
                        aria-label={`Select layer ${layer.name}. Double click to rename`}
                        title="Click to select, double-click to rename"
                      >
                        {layer.name}
                      </button>
                    )}
                  </div>

                  {/* Visibility & Lock Toggles */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerLock(layer.id);
                      }}
                      className={`p-1 transition-colors cursor-pointer ${
                        layer.locked ? 'text-[#f0be7c]' : 'text-[var(--text-body)]/50 hover:text-[var(--text-heading)]'
                      }`}
                      aria-label={layer.locked ? `Unlock layer ${layer.name}` : `Lock layer ${layer.name}`}
                      title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                    >
                      <PixelIcon name={layer.locked ? 'lock' : 'unlock'} size={14} />
                    </button>

                    <button
                      type="button"
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
                      aria-label={layer.visible ? `Hide layer ${layer.name}` : `Show layer ${layer.name}`}
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
                    aria-label={`Select color ${color}`}
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
                <div className="flex items-center gap-1 min-w-[54px] justify-end">
                  <svg
                    className="w-3 h-3 text-[#f0be7c] transition-transform duration-75"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ transform: `rotate(${tools.lightAzimuth}deg)` }}
                    aria-hidden="true"
                  >
                    <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                  </svg>
                  <span className="text-[#f0be7c] font-bold text-[10px] text-right">
                    {tools.lightAzimuth}°
                  </span>
                </div>
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

              {/* Brightness / Exposure */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-[var(--text-body)] font-bold">Brightness:</span>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={tools.lightBrightness}
                  onChange={(e) => setLightBrightness(parseFloat(e.target.value))}
                  className="w-32 accent-[#f0be7c] cursor-pointer"
                />
                <span className="text-[#f0be7c] font-bold text-[10px] min-w-[28px] text-right">
                  {Math.round(tools.lightBrightness * 100)}%
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

          {/* Module 2: 2D Raymarched Soft Shadows (Aaltonen Cone Tracing) */}
          <div className="bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#f0be7c] uppercase tracking-wider flex items-center gap-1">
                <PixelIcon name="sun" size={12} />
                <span>Raymarched Soft Shadows</span>
              </span>
              <span className="text-[9px] font-mono text-[#dcabdf] font-bold">2D Cone Tracing</span>
            </div>

            {/* Parameters Grid */}
            <div className="bg-[var(--desk-surface-raised)] p-2 rounded-[2px] border border-[var(--desk-border)] flex flex-col gap-1.5">
              {/* Light X */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-[var(--text-body)] font-bold">Light X:</span>
                <input
                  type="range"
                  min="0"
                  max={canvasWidth}
                  value={shadowLightX}
                  onChange={(e) => setShadowLightX(parseInt(e.target.value, 10))}
                  className="w-32 accent-[#f0be7c] cursor-pointer"
                />
                <span className="text-[#f0be7c] font-bold text-[10px] min-w-[28px] text-right">
                  {shadowLightX}px
                </span>
              </div>

              {/* Light Y */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-[var(--text-body)] font-bold">Light Y:</span>
                <input
                  type="range"
                  min="0"
                  max={canvasHeight}
                  value={shadowLightY}
                  onChange={(e) => setShadowLightY(parseInt(e.target.value, 10))}
                  className="w-32 accent-[#f0be7c] cursor-pointer"
                />
                <span className="text-[#f0be7c] font-bold text-[10px] min-w-[28px] text-right">
                  {shadowLightY}px
                </span>
              </div>

              {/* Light Radius (Penumbra Softness) */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-[var(--text-body)] font-bold">Light Radius (RL):</span>
                <input
                  type="range"
                  min="2"
                  max="64"
                  value={shadowLightRadius}
                  onChange={(e) => setShadowLightRadius(parseInt(e.target.value, 10))}
                  className="w-32 accent-[#f0be7c] cursor-pointer"
                />
                <span className="text-[#dcabdf] font-bold text-[10px] min-w-[28px] text-right">
                  {shadowLightRadius}px
                </span>
              </div>

              {/* Shadow Opacity */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-[var(--text-body)] font-bold">Opacity:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={shadowOpacity}
                  onChange={(e) => setShadowOpacity(parseFloat(e.target.value))}
                  className="w-32 accent-[#f0be7c] cursor-pointer"
                />
                <span className="text-[#f0be7c] font-bold text-[10px] min-w-[28px] text-right">
                  {Math.round(shadowOpacity * 100)}%
                </span>
              </div>

              {/* Dither Mode */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-[var(--text-body)] font-bold">Bayer Dither:</span>
                <select
                  value={shadowDitherMode}
                  onChange={(e) => setShadowDitherMode(e.target.value as 'none' | '2x2' | '4x4' | '8x8')}
                  className="bg-[#181124] text-[var(--text-heading)] font-bold text-[10px] font-mono px-2 py-0.5 rounded-[1px] border border-[var(--desk-border)] outline-none cursor-pointer"
                >
                  <option value="none">Smooth (No Dither)</option>
                  <option value="2x2">Bayer 2x2 (Coarse)</option>
                  <option value="4x4">Bayer 4x4 (Classic)</option>
                  <option value="8x8">Bayer 8x8 (Fine)</option>
                </select>
              </div>

              {/* Shadow Color Preset Selector */}
              <div className="flex flex-col gap-1 text-xs font-mono pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-body)] font-bold">Shadow Tint:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={shadowColor}
                      onChange={(e) => setShadowColor(e.target.value)}
                      className="w-4 h-4 rounded-[1px] border border-[var(--desk-border)] cursor-pointer bg-transparent"
                      title="Custom Shadow Color"
                    />
                    <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase">{shadowColor}</span>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {SHADOW_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      onClick={() => setShadowColor(preset.hex)}
                      className={`py-0.5 text-[8px] font-mono font-bold rounded-[1px] border transition-colors cursor-pointer ${
                        shadowColor.toUpperCase() === preset.hex.toUpperCase()
                          ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120] shadow-[0_1px_0_#8c5120]'
                          : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]'
                      }`}
                      title={`Set shadow tint to ${preset.label} (${preset.hex})`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            <TactileButton
              size="sm"
              variant="primary"
              onClick={handleRenderCastShadow}
              title="Raymarch 2D physically accurate soft shadows with Aaltonen contact hardening into a non-destructive layer"
              className="text-[11px] py-2 font-mono font-bold bg-[#f0be7c] text-[#140d1f] border-[#8c5120] shadow-[0_2px_0_#8c5120] flex items-center justify-center gap-1.5"
            >
              <PixelIcon name="sun" size={14} />
              <span>Render Cast Shadows</span>
            </TactileButton>
          </div>

          {/* Module 3: Volumetric Optics, Subsurface Scattering & Anisotropic Shaders */}
          <div className="bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#f0be7c] uppercase tracking-wider flex items-center gap-1">
                <PixelIcon name="sparkles" size={12} />
                <span>Volumetric Optics & SSS</span>
              </span>
              <span className="text-[9px] font-mono text-[#dcabdf] font-bold">2D Physics</span>
            </div>

            {/* Optical Preset Selector */}
            <div className="flex flex-col gap-1 text-xs font-mono">
              <span className="text-[10px] text-[var(--text-body)] font-bold">Material Preset:</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'gemstone', label: 'Gem' },
                  { id: 'slime', label: 'Slime' },
                  { id: 'hair', label: 'Hair' },
                  { id: 'foliage', label: 'Leaf' },
                  { id: 'metal_aniso', label: 'Metal' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setOpticalPreset(preset.id as OpticalPresetType)}
                    className={`py-1 text-[9px] font-mono font-bold rounded-[1px] border transition-colors cursor-pointer ${
                      tools.opticalPreset === preset.id
                        ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120] shadow-[0_1px_0_#8c5120]'
                        : 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cel Tones / Shading Mode Selector */}
            <div className="flex flex-col gap-1 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-body)] font-bold">Cel Tones:</span>
                <span className="text-[9px] text-[#dcabdf] font-bold">
                  {tools.opticalCelTones === 'smooth' ? 'Smooth VFX' : `${tools.opticalCelTones} Tones`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: 2, label: '2 Tones' },
                  { id: 3, label: '3 Tones' },
                  { id: 4, label: '4 Tones' },
                  { id: 'smooth', label: 'Smooth' },
                ].map((option) => (
                  <button
                    key={String(option.id)}
                    onClick={() => setOpticalCelTones(option.id as CelToneCount)}
                    className={`py-1 text-[9px] font-mono font-bold rounded-[1px] border transition-colors cursor-pointer ${
                      tools.opticalCelTones === option.id
                        ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120] shadow-[0_1px_0_#8c5120]'
                        : 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parameter Sliders */}
            <div className="bg-[var(--desk-surface-raised)] p-2 rounded-[2px] border border-[var(--desk-border)] flex flex-col gap-2">
              {/* Translucency Depth (SSS) */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-[var(--text-body)] font-bold">SSS Depth:</span>
                <input
                  type="range"
                  min="1"
                  max="32"
                  value={tools.translucencyDepth}
                  onChange={(e) => setTranslucencyDepth(parseInt(e.target.value, 10))}
                  className="w-28 accent-[#f0be7c] cursor-pointer"
                />
                <span className="text-[#f0be7c] font-bold text-[10px] min-w-[28px] text-right">
                  {tools.translucencyDepth}px
                </span>
              </div>

              {/* Fresnel Grazing Power */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-[var(--text-body)] font-bold">Fresnel Rim:</span>
                <input
                  type="range"
                  min="1.0"
                  max="8.0"
                  step="0.5"
                  value={tools.fresnelPower}
                  onChange={(e) => setFresnelPower(parseFloat(e.target.value))}
                  className="w-28 accent-[#f0be7c] cursor-pointer"
                />
                <span className="text-[#dcabdf] font-bold text-[10px] min-w-[28px] text-right">
                  {tools.fresnelPower}x
                </span>
              </div>

              {/* Anisotropic Flow Preset */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-[var(--text-body)] font-bold">Flow Type:</span>
                <select
                  value={tools.anisoFlow}
                  onChange={(e) => setAnisoFlow(e.target.value as AnisoFlowPreset)}
                  className="bg-[#181124] text-[var(--text-heading)] font-bold text-[10px] font-mono px-2 py-0.5 rounded-[1px] border border-[var(--desk-border)] outline-none cursor-pointer"
                >
                  <option value="vertical">Vertical (Hair)</option>
                  <option value="horizontal">Horizontal (Folds)</option>
                  <option value="radial">Radial (Gem Facets)</option>
                  <option value="curvature">Curvature Gradient</option>
                </select>
              </div>

              {/* Anisotropy Angle */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-[var(--text-body)] font-bold">Aniso Angle:</span>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={tools.anisoAngle}
                  onChange={(e) => setAnisoAngle(parseInt(e.target.value, 10))}
                  className="w-28 accent-[#f0be7c] cursor-pointer"
                />
                <span className="text-[#f0be7c] font-bold text-[10px] min-w-[28px] text-right">
                  {tools.anisoAngle}°
                </span>
              </div>
            </div>

            {/* Action Button: Render Volumetric Optics */}
            <TactileButton
              size="sm"
              variant="primary"
              onClick={handleRenderVolumetricOptics}
              title="Render SSS forward scattering, dielectric Fresnel rim glow & Kajiya-Kay anisotropic highlights"
              className="text-[10px] py-1.5 font-bold bg-[#f0be7c] text-[#140d1f] border-[#8c5120] shadow-[0_2px_0_#8c5120] flex items-center justify-center gap-1.5"
            >
              <PixelIcon name="sparkles" size={13} />
              <span>Render Volumetric Optics</span>
            </TactileButton>
          </div>

          {/* Module 3: Geometry & Curve Tools */}
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
                title="Smart Anti-Aliasing: Smooths staircase jagged edges with intermediate OKLab blend tones"
                className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="pen" size={12} />
                <span>De-Jaggy (AA)</span>
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
                title="Warm golden hour Kelvin shift (+2800K) with sunset amber peach tones"
                className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
              >
                <PixelIcon name="sun" size={12} />
                <span>Sunset</span>
              </TactileButton>

              <TactileButton
                size="sm"
                variant="default"
                onClick={() => handleColorGrade('moonlight')}
                title="Cool night Kelvin shift (-3500K) with luminous cobalt/wisteria ambient tint"
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
                title="Optical Flow & SDF In-Between Morphing: Generates true smooth intermediate tween frame"
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
