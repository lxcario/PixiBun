'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { useCoDrawStatus } from '@/hooks/useCoDrawStatus';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { BlendMode } from '@/types/canvas';
import IconButton from '@/components/ui/IconButton';
import { studioEvents } from '@/lib/events/studioEvents';
import { MAX_METADATA_NAME_LENGTH } from '@/lib/project/metadataAdmission';

const EFFECT_LABELS: Record<string, string> = {
  photometric: '2.5D lighting',
  'auto-shade': 'auto shade',
  'cast-shadow': 'cast shadow',
  'ground-shadow': 'ground shadow',
  'volumetric-optics': 'older material shading',
  'normal-map': 'normal map',
  specular: 'specular light',
  'sel-out': 'selective outline',
  outline: 'outer outline',
  autotile: 'autotile contours',
  wfc: 'older pattern synthesis',
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
  const currentProjectId = useStudioStore((s) => s.currentProjectId);
  const setActiveLayer = useStudioStore((s) => s.setActiveLayer);
  const addLayer = useStudioStore((s) => s.addLayer);
  const duplicateLayer = useStudioStore((s) => s.duplicateLayer);
  const reorderLayers = useStudioStore((s) => s.reorderLayers);
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
  const isMergeDownAvailable = activeLayerIndex >= 0 && !!currentFrame && activeLayerIndex < currentFrame.layers.length - 1 && !activeLayer?.locked && !currentFrame.layers[activeLayerIndex + 1]?.locked;

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [layerNameInput, setLayerNameInput] = useState('');
  const [mergeConfirmLayerId, setMergeConfirmLayerId] = useState<string | null>(null);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dropTargetLayerId, setDropTargetLayerId] = useState<string | null>(null);
  const mergeTimerRef = useRef<number | null>(null);
  const opacityGestureLayerRef = useRef<string | null>(null);

  useEffect(() => {
    opacityGestureLayerRef.current = null;
  }, [activeLayerId, activeFrameIndex, currentProjectId]);

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

  const moveLayer = (sourceId: string, targetId: string) => {
    if (isGuest || sourceId === targetId || !currentFrame) return;
    const sourceIndex = currentFrame.layers.findIndex((layer) => layer.id === sourceId);
    const targetIndex = currentFrame.layers.findIndex((layer) => layer.id === targetId);
    if (sourceIndex >= 0 && targetIndex >= 0) reorderLayers(sourceIndex, targetIndex);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--desk-surface)]">
      {/* 1. Flush Action Header */}
      <div className="h-8 px-3 flex items-center justify-between bg-[var(--desk-surface-raised)]/40 border-b border-[var(--desk-border)] shrink-0">
        <span className="text-[11px] font-sans font-medium text-[var(--text-muted)]" data-testid="layers-stack-header" title="Each frame has its own layer pixels. A new blank frame keeps the layer names and settings.">
          Frame {activeFrameIndex + 1} · Layers <span data-testid="layers-stack-count" className="font-mono text-[10px] text-[var(--text-body)]">({currentFrame?.layers.length || 0})</span>
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
                ? 'Click again to merge layers and flatten the lower effect recipe. Undo is available while history is retained.'
                : 'Merge Down (flattens the lower effect recipe)'
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
        <div className="h-8 px-2 flex items-center justify-between gap-1.5 bg-[var(--desk-surface-raised)]/30 border-b border-[var(--desk-border)] text-[10px] shrink-0">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <span className="text-[var(--text-muted)] font-sans text-[10px] shrink-0">Opacity</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={Math.round(activeLayer.opacity * 100)}
              onChange={(e) => {
                const layerId = activeLayer.id;
                if (setLayerOpacity(layerId, parseFloat(e.target.value) / 100, opacityGestureLayerRef.current === layerId)) {
                  opacityGestureLayerRef.current = layerId;
                }
              }}
              onPointerUp={() => { opacityGestureLayerRef.current = null; }}
              onPointerCancel={() => { opacityGestureLayerRef.current = null; }}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && ['z', 'y'].includes(e.key.toLowerCase())) opacityGestureLayerRef.current = null;
              }}
              onKeyUp={() => { opacityGestureLayerRef.current = null; }}
              onBlur={() => { opacityGestureLayerRef.current = null; }}
              aria-label="Layer opacity"
              className="flex-1 min-w-[32px] max-w-[48px] h-1 accent-[var(--accent-gold)] cursor-pointer shrink-0"
            />
            <span className="font-mono text-[10px] text-[var(--text-heading)] font-semibold w-7 text-right shrink-0 tabular-nums">
              {Math.round(activeLayer.opacity * 100)}%
            </span>
          </div>

          <div aria-hidden="true" className="w-px h-3.5 bg-[var(--desk-border)] shrink-0" />

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[var(--text-muted)] font-sans text-[10px] shrink-0">Blend</span>
            <select
              value={activeLayer.blendMode}
              onChange={(e) => setLayerBlendMode(activeLayer.id, e.target.value as BlendMode)}
              aria-label="Layer blend mode"
              className="w-[74px] bg-[var(--desk-surface-raised)] text-[var(--text-heading)] px-1 py-0.5 rounded-[2px] border border-[var(--desk-border)] outline-none text-[10px] font-sans cursor-pointer hover:border-[var(--desk-border-highlight)] focus:border-[var(--accent-gold)] truncate"
            >
              <option value="source-over">Normal</option>
              <option value="multiply">Multiply</option>
              <option value="screen">Screen</option>
              <option value="overlay">Overlay</option>
              <option value="color-dodge">Color Dodge</option>
              <option value="source-atop">On artwork only</option>
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
          {(activeLayer.effect.kind === 'volumetric-optics' || activeLayer.effect.kind === 'wfc') && (
            <div className="mt-1 text-[9px] text-[var(--text-body)]">
              This older generated layer is saved as pixels. Hide it to see the original artwork below.
            </div>
          )}
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
          const canMergeDown = !isGuest && !layer.locked && index < (currentFrame?.layers.length || 0) - 1 && !currentFrame?.layers[index + 1]?.locked;
          return (
            <div
              key={layer.id}
              data-testid={`layer-row-${layer.id}`}
              onDragOver={(event) => {
                if (isGuest || !draggedLayerId) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDropTargetLayerId(layer.id);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTargetLayerId(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId = event.dataTransfer.getData('application/x-pixibun-layer') || draggedLayerId;
                if (sourceId) moveLayer(sourceId, layer.id);
                setDraggedLayerId(null);
                setDropTargetLayerId(null);
              }}
              className={`h-8 px-3 flex items-center justify-between text-xs transition-colors group ${
                isActive
                  ? 'bg-[var(--desk-surface-raised)] border-l-2 border-l-[var(--desk-border-highlight)] text-[var(--text-heading)] font-medium'
                  : 'text-[var(--text-body)] hover:bg-[var(--desk-surface-raised)]/40'
              } ${layer.locked ? 'opacity-70' : ''} ${dropTargetLayerId === layer.id && draggedLayerId !== layer.id ? 'outline outline-2 outline-[var(--accent-gold)] outline-offset-[-2px]' : ''} ${draggedLayerId === layer.id ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                <button type="button" draggable={!isGuest && currentFrame.layers.length > 1}
                  disabled={isGuest || currentFrame.layers.length <= 1}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/x-pixibun-layer', layer.id);
                    event.dataTransfer.effectAllowed = 'move';
                    setDraggedLayerId(layer.id);
                  }}
                  onDragEnd={() => { setDraggedLayerId(null); setDropTargetLayerId(null); }}
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                    event.preventDefault();
                    const targetIndex = index + (event.key === 'ArrowUp' ? -1 : 1);
                    if (targetIndex >= 0 && targetIndex < currentFrame.layers.length) reorderLayers(index, targetIndex);
                  }}
                  title="Drag to reorder; use arrow keys when focused"
                  aria-label={`Reorder layer ${layer.name}`}
                  className="w-4 h-6 shrink-0 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-gold)] cursor-grab active:cursor-grabbing disabled:opacity-40 disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]">
                  <span aria-hidden="true" className="text-[13px] leading-none">⠿</span>
                </button>
                {editingLayerId === layer.id ? (
                  <input
                    type="text"
                    maxLength={MAX_METADATA_NAME_LENGTH}
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
                      className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] text-[var(--text-muted)] hover:text-[var(--accent-gold)] text-[10px] p-0.5 cursor-pointer transition-opacity"
                      title="Rename Layer"
                      aria-label={`Rename layer ${layer.name}`}
                    >
                      <PixelIcon name="chisel" size={10} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {(layer.effect?.kind === 'photometric' || layer.effect?.kind === 'specular') && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveLayer(layer.id);
                      studioEvents.emit('pixibun:photometric-gizmo-start', { auto: false, layerId: layer.id });
                    }}
                    className="h-5 px-1 rounded-[2px] border border-[var(--desk-border)] text-[8px] font-mono text-[var(--accent-gold)] hover:bg-[var(--surface-2)] cursor-pointer"
                    title="Reopen this lighting recipe and move the bulb"
                    aria-label={`Edit ${layer.effect.kind === 'specular' ? 'glint' : 'lighting'} effect on ${layer.name}`}
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
