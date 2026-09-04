'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { BlendMode } from '@/types/canvas';

export const LayersPanel: React.FC = () => {
  const {
    frames,
    activeFrameIndex,
    activeLayerId,
    setActiveLayer,
    addLayer,
    duplicateLayer,
    deleteLayer,
    mergeLayerDown,
    toggleLayerVisibility,
    toggleLayerLock,
    setLayerOpacity,
    setLayerBlendMode,
    renameLayer,
  } = useStudioStore();

  const currentFrame = frames[activeFrameIndex];
  const activeLayer = currentFrame?.layers.find((l) => l.id === activeLayerId);
  const activeLayerIndex = currentFrame?.layers.findIndex((l) => l.id === activeLayerId) ?? -1;
  const isMergeDownAvailable = activeLayerIndex >= 0 && !!currentFrame && activeLayerIndex < currentFrame.layers.length - 1;

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [layerNameInput, setLayerNameInput] = useState('');

  return (
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
            variant="default"
            disabled={!activeLayer || !isMergeDownAvailable}
            onClick={() => activeLayer && mergeLayerDown(activeLayer.id)}
            title="Merge Down"
            className="w-8 h-8 bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
          >
            <PixelIcon name="merge-down" size={14} />
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
                aria-label="Layer opacity"
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
              aria-label="Layer blend mode"
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
        {currentFrame?.layers.map((layer, index) => {
          const isActive = layer.id === activeLayerId;
          const canMergeDown = index < (currentFrame?.layers.length || 0) - 1;
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

              {/* Actions: Merge Down, Visibility & Lock Toggles */}
              <div className="flex items-center gap-1.5">
                {canMergeDown && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      mergeLayerDown(layer.id);
                    }}
                    className="p-1 transition-colors cursor-pointer text-[var(--text-body)]/50 hover:text-[#f0be7c]"
                    aria-label={`Merge down layer ${layer.name}`}
                    title="Merge Down"
                  >
                    <PixelIcon name="merge-down" size={14} />
                  </button>
                )}
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
  );
};
