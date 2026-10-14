'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import type { TagLoopMode } from '@/types/canvas';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TAG_PALETTE_COLORS = [
  '#F0BE7C', // Amber
  '#4ECCD3', // Teal
  '#FF5E7E', // Crimson
  '#C792DF', // Wisteria
  '#80E080', // Lime
  '#FF9F68', // Coral
  '#64B5F6', // Sky Blue
  '#E0B0FF', // Lavender
  '#FFD54F', // Gold
  '#90A4AE', // Slate
];

export const TagManagerModal: React.FC<TagManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const frames = useStudioStore((s) => s.frames);
  const clips = useStudioStore((s) => s.clips);
  const activeClipId = useStudioStore((s) => s.activeClipId);
  const addTag = useStudioStore((s) => s.addTag);
  const updateTag = useStudioStore((s) => s.updateTag);
  const deleteTag = useStudioStore((s) => s.deleteTag);
  const reorderTags = useStudioStore((s) => s.reorderTags);
  const setActiveTagId = useStudioStore((s) => s.setActiveTagId);

  const [newTagName, setNewTagName] = useState('');
  const [newFromFrame, setNewFromFrame] = useState(1);
  const [newToFrame, setNewToFrame] = useState(Math.max(1, frames.length));
  const [newColor, setNewColor] = useState(TAG_PALETTE_COLORS[0]);
  const [newLoopMode, setNewLoopMode] = useState<TagLoopMode>('forward');

  const handleAddNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTagName.trim() || `Tag ${clips.length + 1}`;
    const minF = Math.max(0, Math.min(frames.length - 1, newFromFrame - 1));
    const maxF = Math.max(minF, Math.min(frames.length - 1, newToFrame - 1));

    addTag(name, minF, maxF, newColor, newLoopMode);
    setNewTagName('');
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Animation Tags & Clips" maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4 text-xs font-mono text-[var(--text-body)]">
        <p className="text-[var(--text-body)]/80 leading-relaxed">
          Define tagged animation loops (e.g. Idle, Walk, Attack). Tags provide visual bracket ribbons on the timeline, control playback bounds, and export directly into Godot 4, Unity, and Aseprite formats.
        </p>

        {/* Existing Tags List */}
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
          {clips.length === 0 ? (
            <div className="p-4 rounded-[2px] border border-dashed border-[var(--desk-border)] text-center text-[var(--text-body)]/60">
              No animation tags created yet. Add a tag below to begin bounding animation loops.
            </div>
          ) : (
            clips.map((clip, index) => {
              const isActive = activeClipId === clip.id;
              const fromVal = (clip.fromFrame ?? clip.startFrame) + 1;
              const toVal = (clip.toFrame ?? clip.endFrame) + 1;
              const loop = clip.loopMode || 'forward';
              const color = clip.color || '#F0BE7C';

              return (
                <div
                  key={clip.id}
                  className={`flex flex-col gap-2 p-2.5 rounded-[2px] border-2 transition-all ${
                    isActive
                      ? 'bg-[#2a1d3b] border-[var(--accent-gold)] shadow-xs'
                      : 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {/* Color Swatch Indicator */}
                    <span
                      className="w-3.5 h-3.5 rounded-[2px] border border-[var(--ink)] shrink-0"
                      style={{ backgroundColor: color }}
                    />

                    {/* Tag Name Input */}
                    <input
                      type="text"
                      aria-label="Tag name"
                      value={clip.name}
                      onChange={(e) => updateTag(clip.id, { name: e.target.value })}
                      className="bg-[var(--surface-0)] text-[var(--text-heading)] px-2 py-1 rounded-[2px] border border-[var(--desk-border)] focus:border-[var(--accent-gold)] outline-none flex-1 font-bold text-xs"
                    />

                    {/* Active Filter Toggle Button */}
                    <TactileButton
                      size="sm"
                      variant={isActive ? 'primary' : 'default'}
                      onClick={() => setActiveTagId(isActive ? null : clip.id)}
                      title={isActive ? 'Clear tag playback filter' : 'Filter playback to this tag'}
                      className="text-[10px] px-2 py-1"
                    >
                      {isActive ? 'FILTERED' : 'FILTER'}
                    </TactileButton>

                    {/* Reorder Buttons */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => reorderTags(index, index - 1)}
                        aria-label="Move tag up"
                        title="Move Tag Up"
                        className="p-1 text-[var(--text-body)]/60 hover:text-[var(--text-heading)] disabled:opacity-20 cursor-pointer disabled:cursor-default"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={index === clips.length - 1}
                        onClick={() => reorderTags(index, index + 1)}
                        aria-label="Move tag down"
                        title="Move Tag Down"
                        className="p-1 text-[var(--text-body)]/60 hover:text-[var(--text-heading)] disabled:opacity-20 cursor-pointer disabled:cursor-default"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Delete Tag Button */}
                    <TactileButton
                      size="icon-sm"
                      variant="danger"
                      onClick={() => deleteTag(clip.id)}
                      title="Delete Tag"
                      className="w-7 h-7 bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger-fg)]"
                    >
                      <PixelIcon name="trash" size={12} />
                    </TactileButton>
                  </div>

                  {/* Frame Range, Loop Mode & Swatches */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--desk-border)]/50 text-[11px]">
                    <div className="flex items-center gap-3">
                      {/* Frame From & To */}
                      <div className="flex items-center gap-1">
                        <span className="text-[var(--text-body)]/60">Frames:</span>
                        <input
                          type="number"
                          min="1"
                          max={frames.length}
                          value={fromVal}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              updateTag(clip.id, { fromFrame: Math.max(0, val - 1) });
                            }
                          }}
                          aria-label={`Start frame for tag ${clip.name}`}
                          className="w-14 bg-[var(--surface-0)] text-[var(--accent-gold)] px-1 py-0.5 rounded-[2px] border border-[var(--desk-border)] text-center text-[11px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span>to</span>
                        <input
                          type="number"
                          min="1"
                          max={frames.length}
                          value={toVal}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              updateTag(clip.id, { toFrame: Math.min(frames.length - 1, val - 1) });
                            }
                          }}
                          aria-label={`End frame for tag ${clip.name}`}
                          className="w-14 bg-[var(--surface-0)] text-[var(--accent-gold)] px-1 py-0.5 rounded-[2px] border border-[var(--desk-border)] text-center text-[11px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>

                      {/* Loop Mode Selector */}
                      <div className="flex items-center gap-1">
                        <span className="text-[var(--text-body)]/60">Loop:</span>
                        <select
                          value={loop}
                          onChange={(e) => updateTag(clip.id, { loopMode: e.target.value as TagLoopMode })}
                          aria-label={`Loop mode for tag ${clip.name}`}
                          className="bg-[var(--surface-0)] text-[var(--text-heading)] px-1.5 py-0.5 rounded-[2px] border border-[var(--desk-border)] text-[11px] outline-none"
                        >
                          <option value="forward">Forward</option>
                          <option value="reverse">Reverse</option>
                          <option value="ping-pong">Ping-Pong</option>
                        </select>
                      </div>
                    </div>

                    {/* Color Swatches */}
                    <div className="flex items-center gap-1">
                      {TAG_PALETTE_COLORS.slice(0, 6).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateTag(clip.id, { color: c })}
                          className={`w-3.5 h-3.5 rounded-[2px] border transition-transform cursor-pointer ${
                            color === c ? 'border-[#ffffff] scale-110' : 'border-[var(--ink)]'
                          }`}
                          style={{ backgroundColor: c }}
                          aria-label={`Set tag color to ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create New Tag Section */}
        <form
          onSubmit={handleAddNewTag}
          className="p-3 bg-[var(--desk-surface-raised)] rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2.5"
        >
          <span className="font-bold text-[var(--text-heading)] text-xs uppercase tracking-wide">
            Add New Animation Tag
          </span>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Tag name (e.g. Idle, Run, Jump)"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              aria-label="New tag name"
              className="bg-[var(--surface-0)] text-[var(--text-heading)] px-2.5 py-1.5 rounded-[2px] border border-[var(--desk-border)] focus:border-[var(--accent-gold)] outline-none flex-1 text-xs"
            />

            <div className="flex items-center gap-1 text-[11px]">
              <span>#</span>
              <input
                type="number"
                min="1"
                max={frames.length}
                value={newFromFrame}
                onChange={(e) => setNewFromFrame(parseInt(e.target.value, 10) || 1)}
                aria-label="New tag start frame"
                className="w-14 bg-[var(--surface-0)] text-[var(--accent-gold)] px-1 py-1 rounded-[2px] border border-[var(--desk-border)] text-center text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span>-</span>
              <input
                type="number"
                min="1"
                max={frames.length}
                value={newToFrame}
                onChange={(e) => setNewToFrame(parseInt(e.target.value, 10) || 1)}
                aria-label="New tag end frame"
                className="w-14 bg-[var(--surface-0)] text-[var(--accent-gold)] px-1 py-1 rounded-[2px] border border-[var(--desk-border)] text-center text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <select
              value={newLoopMode}
              onChange={(e) => setNewLoopMode(e.target.value as TagLoopMode)}
              aria-label="New tag loop mode"
              className="bg-[var(--surface-0)] text-[var(--text-heading)] px-2 py-1.5 rounded-[2px] border border-[var(--desk-border)] text-xs outline-none"
            >
              <option value="forward">Forward</option>
              <option value="reverse">Reverse</option>
              <option value="ping-pong">Ping-Pong</option>
            </select>

            <TactileButton
              type="submit"
              size="sm"
              variant="primary"
              className="whitespace-nowrap px-3 py-1.5"
            >
              <PixelIcon name="plus" size={13} />
              <span>Add Tag</span>
            </TactileButton>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[11px] text-[var(--text-body)]/60">Color:</span>
            {TAG_PALETTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`w-4 h-4 rounded-[2px] border transition-transform cursor-pointer ${
                  newColor === c ? 'border-[#ffffff] scale-125 ring-1 ring-[var(--accent-gold)]' : 'border-[var(--ink)]'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--desk-border)]">
          <TactileButton size="sm" variant="default" onClick={onClose} className="px-4 py-1.5">
            Done
          </TactileButton>
        </div>
      </div>
    </ModalWrapper>
  );
};
