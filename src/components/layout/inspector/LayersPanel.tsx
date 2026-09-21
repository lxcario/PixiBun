'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { useCoDrawStatus } from '@/hooks/useCoDrawStatus';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { BlendMode } from '@/types/canvas';
import IconButton from '@/components/ui/IconButton';
import { studioEvents } from '@/lib/events/studioEvents';

const EFFECT_LABELS: Record<string, string> = {
  photometric: '2.5D lighting',
  'auto-shade': 'auto shade',
  'cast-shadow': 'cast shadow',
  'ground-shadow': 'ground shadow',
  'volumetric-optics': 'material optics',
  'normal-map': 'normal map',
  specular: 'specular light',
  'sel-out': 'selective outline',
  outline: 'outer outline',
  autotile: 'autotile contours',
  wfc: 'tile synthesis',
};

function formatRecipeValue(value: string | number | boolean | null | string[]): string {
  if (Array.isArray(value)) return `${value.length} colors`;
  if (value === null) return 'auto';
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return value;
}

export const LayersPanel: React.FC = () => {
  const { isGuest } = useCoDrawStatus();
  const guestLockTitle = 'Layer structure is managed by the session host.';
  const frames = useStudioStore((s) => s.frames);
  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
  const activeLayerId = useStudioStore((s) => s.activeLayerId);
  const setActiveLayer = useStudioStore((s) => s.setActiveLayer);
  const addLayer = useStudioStore((s) => s.addLayer);
  const duplicateLayer = useStudioStore((s) => s.duplicateLayer);
  const deleteLayer = useStudioStore((s) => s.deleteLayer);
  const mergeLayerDown = useStudioStore((s) => s.mergeLayerDown);
  const toggleLayerVisibility = useStudioStore((s) => s.toggleLayerVisibility);
  const toggleLayerLock = useStudioStore((s) => s.toggleLayerLock);
  const setLayerOpacity = useStudioStore((s) => s.setLayerOpacity);
  const setLayerBlendMode = useStudioStore((s) => s.setLayerBlendMode);
  const renameLayer = useStudioStore((s) => s.renameLayer);

  const currentFrame = frames[activeFrameIndex];
  const activeLayer = currentFrame?.layers.find((l) => l.id === activeLayerId);
  const activeLayerIndex = currentFrame?.layers.findIndex((l) => l.id === activeLayerId) ?? -1;
  const isMergeDownAvailable = activeLayerIndex >= 0 && !!currentFrame && activeLayerIndex < currentFrame.layers.length - 1;

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [layerNameInput, setLayerNameInput] = useState('');
  const [mergeConfirmLayerId, setMergeConfirmLayerId] = useState<string | null>(null);
  const mergeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (mergeTimerRef.current !== null) {
        window.clearTimeout(mergeTimerRef.current);
      }
    };
  }, []);

  const requestMergeDown = (layerId: string) => {
    if (mergeTimerRef.current !== null) {
      window.clearTimeout(mergeTimerRef.current);
      mergeTimerRef.current = null;
    }

    if (mergeConfirmLayerId === layerId) {
      setMergeConfirmLayerId(null);
      mergeLayerDown(layerId);
      return;
    }
    setMergeConfirmLayerId(layerId);
    mergeTimerRef.current = window.setTimeout(() => {
      setMergeConfirmLayerId((current) => (current === layerId ? null : current));
      mergeTimerRef.current = null;
    }, 2500);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--desk-surface)]">
      {/* 1. Flush Action Header */}
      <div className="h-8 px-3 flex items-center justify-between bg-[var(--desk-surface-raised)]/40 border-b border-[var(--desk-border)] shrink-0">
        <span className="text-[11px] font-sans font-medium text-[var(--text-muted)]" data-testid="layers-stack-header">
          Layers <span data-testid="layers-stack-count" className="font-mono text-[10px] text-[var(--text-body)]">({currentFrame?.layers.length || 0})</span>
        </span>
        <div className="flex items-center gap-1">
          <TactileButton
            size="icon-sm"
            variant="default"
            disabled={isGuest}
            onClick={() => addLayer()}
            title={isGuest ? guestLockTitle : 'Add New Layer'}
            aria-label="Add New Layer"
            className="w-6 h-6 p-0 text-xs"
          >
            <PixelIcon name="plus" size={12} />
          </TactileButton>
          <TactileButton
            size="icon-sm"
            variant="default"
            disabled={!activeLayer || isGuest}
            onClick={() => activeLayer && duplicateLayer(activeLayer.id)}
            title={isGuest ? guestLockTitle : 'Duplicate Layer'}
            aria-label="Duplicate Layer"
            className="w-6 h-6 p-0 text-xs"
          >
            <PixelIcon name="copy" size={12} />
          </TactileButton>
          <TactileButton
            size="icon-sm"
            variant={mergeConfirmLayerId === activeLayer?.id ? 'accent' : 'default'}
            disabled={!activeLayer || !isMergeDownAvailable || isGuest}
            onClick={() => activeLayer && requestMergeDown(activeLayer.id)}
            title={
              isGuest
                ? guestLockTitle
                : mergeConfirmLayerId === activeLayer?.id
                ? 'Click again to confirm merge (irreversible)'
                : 'Merge Down (irreversible)'
            }
            aria-label="Merge Down"
            className="w-6 h-6 p-0 text-xs"
          >
            <PixelIcon name="merge-down" size={12} />
          </TactileButton>
          <TactileButton
            size="icon-sm"
            variant="danger"
            disabled={!currentFrame || currentFrame.layers.length <= 1 || isGuest}
            onClick={() => activeLayer && deleteLayer(activeLayer.id)}
            title={isGuest ? guestLockTitle : 'Delete Layer'}
            aria-label="Delete Layer"
            className="w-6 h-6 p-0 text-xs"
          >
            <PixelIcon name="trash" size={12} />
          </TactileButton>
        </div>
      </div>

      {/* 2. Compact Active Layer Properties Strip */}
      {activeLayer && (
        <div className="h-7 px-2.5 flex items-center justify-between gap-2 bg-[var(--desk-surface-raised)]/30 border-b border-[var(--desk-border)] text-[10px] shrink-0">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-[var(--text-muted)] font-sans text-[10px] shrink-0">Opacity</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={Math.round(activeLayer.opacity * 100)}
              onChange={(e) => setLayerOpacity(activeLayer.id, parseFloat(e.target.value) / 100)}
              aria-label="Layer opacity"
              className="w-12 h-1 accent-[var(--accent-gold)] cursor-pointer"
            />
            <span className="font-mono text-[10px] text-[var(--text-heading)] font-medium min-w-[28px] text-right shrink-0">
              {Math.round(activeLayer.opacity * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[var(--text-muted)] font-sans text-[10px]">Blend</span>
            <select
              value={activeLayer.blendMode}
              onChange={(e) => setLayerBlendMode(activeLayer.id, e.target.value as BlendMode)}
              aria-label="Layer blend mode"
              className="bg-[var(--desk-surface-raised)] text-[var(--text-heading)] px-1.5 py-0.5 rounded-[2px] border border-[var(--desk-border)] outline-none text-[10px] font-sans cursor-pointer hover:border-[var(--desk-border-highlight)] focus:border-[var(--accent-gold)]"
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

      {activeLayer?.effect && (
        <div className="px-2.5 py-1.5 border-b border-[var(--desk-border)] bg-[var(--accent-wisteria)]/[0.06] shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-mono uppercase tracking-wide text-[var(--accent-wisteria)]">
              Generated layer · {EFFECT_LABELS[activeLayer.effect.kind] ?? activeLayer.effect.kind}
            </span>
            <span
              className="text-[8px] font-mono text-[var(--text-muted)]"
              title={new Date(activeLayer.effect.updatedAt).toLocaleString()}
            >
              provenance v{activeLayer.effect.version}
            </span>
          </div>
          <div className="text-[8px] font-mono text-[var(--text-muted)]">
            Source: {activeLayer.effect.sourceMode.replaceAll('-', ' ')}
          </div>
          <div className="mt-1 text-[9px] font-sans text-[var(--text-muted)] truncate">
            {Object.entries(activeLayer.effect.params)
              .slice(0, 4)
              .map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${formatRecipeValue(value)}`)
              .join(' · ') || 'No adjustable parameters'}
          </div>
          {activeLayer.effect.analysis?.rationale && (
            <div
              className="mt-0.5 text-[9px] font-sans text-[var(--text-body)] truncate"
              title={activeLayer.effect.analysis.rationale}
            >
              Auto analysis: {activeLayer.effect.analysis.rationale}
            </div>
          )}
        </div>
      )}

      {/* 3. Direct Layer Stack */}
      <div className="overflow-y-auto flex-1 min-h-[60px] divide-y divide-[var(--desk-border)]/40 bg-[var(--desk-surface)]">
        {currentFrame?.layers.map((layer, index) => {
          const isActive = layer.id === activeLayerId;
          const canMergeDown = !isGuest && index < (currentFrame?.layers.length || 0) - 1;
          return (
            <div
              key={layer.id}
              className={`h-8 px-3 flex items-center justify-between text-xs transition-colors group ${
                isActive
                  ? 'bg-[var(--desk-surface-raised)] border-l-2 border-l-[var(--desk-border-highlight)] text-[var(--text-heading)] font-medium'
                  : 'text-[var(--text-body)] hover:bg-[var(--desk-surface-raised)]/40'
              } ${layer.locked ? 'opacity-70' : ''}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isActive ? 'bg-[var(--accent-gold)]' : 'bg-transparent'
                  }`}
                />
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
                    className="bg-[var(--desk-surface-raised)] text-[var(--text-heading)] px-1.5 py-0.5 text-xs font-sans rounded-[2px] border border-[var(--accent-gold)] outline-none w-full"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setActiveLayer(layer.id)}
                      onDoubleClick={() => {
                        setEditingLayerId(layer.id);
                        setLayerNameInput(layer.name);
                      }}
                      className={`truncate text-left bg-transparent border-0 p-0 cursor-pointer flex-1 font-sans text-xs ${
                        isActive ? 'text-[var(--text-heading)] font-semibold' : 'text-inherit'
                      }`}
                      aria-label={`Select layer ${layer.name}. Double click to rename`}
                      title="Click to select, double-click to rename"
                    >
                      {layer.name}
                    </button>
                    {layer.effect && (
                      <span
                        className="px-1 py-px rounded-[2px] border border-[var(--accent-wisteria)]/50 bg-[var(--accent-wisteria)]/10 text-[8px] font-mono font-bold text-[var(--accent-wisteria)] shrink-0"
                        title={`Generated from a saved ${layer.effect.kind} recipe`}
                      >
                        FX
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingLayerId(layer.id);
                        setLayerNameInput(layer.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent-gold)] text-[10px] p-0.5 cursor-pointer transition-opacity"
                      title="Rename Layer"
                      aria-label={`Rename layer ${layer.name}`}
                    >
                      <PixelIcon name="chisel" size={10} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {layer.effect?.kind === 'photometric' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveLayer(layer.id);
                      studioEvents.emit('pixibun:photometric-gizmo-start', { auto: false, layerId: layer.id });
                    }}
                    className="h-5 px-1 rounded-[2px] border border-[var(--desk-border)] text-[8px] font-mono text-[var(--accent-gold)] hover:bg-[var(--surface-2)] cursor-pointer"
                    title="Reopen this lighting recipe and move the bulb"
                    aria-label={`Edit lighting effect on ${layer.name}`}
                  >
                    Edit FX
                  </button>
                )}
                {canMergeDown && (
                  <IconButton
                    icon="merge-down"
                    size="sm"
                    label={
                      mergeConfirmLayerId === layer.id
                        ? `Confirm merge down layer ${layer.name}`
                        : `Merge down layer ${layer.name}`
                    }
                    variant={mergeConfirmLayerId === layer.id ? 'surface' : 'ghost'}
                    active={mergeConfirmLayerId === layer.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      requestMergeDown(layer.id);
                    }}
                  />
                )}
                <IconButton
                  icon={layer.locked ? 'lock' : 'unlock'}
                  size="sm"
                  label={layer.locked ? `Unlock layer ${layer.name}` : `Lock layer ${layer.name}`}
                  active={layer.locked}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerLock(layer.id);
                  }}
                />
                <IconButton
                  icon={layer.visible ? 'eye' : 'eye-off'}
                  size="sm"
                  label={layer.visible ? `Hide layer ${layer.name}` : `Show layer ${layer.name}`}
                  active={layer.visible}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(layer.id);
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
