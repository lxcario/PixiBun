'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import type { MotionPart, MotionPose } from '@/lib/animation/pixiMotion';
import { Point } from '@/lib/canvas/rasterMath';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { isWorkspaceControlTarget, shouldIgnoreWorkspaceKey } from '@/lib/input/workspaceKeyboard';
import { useStudioStore } from '@/stores/studioStore';

export interface PixiMotionGizmoProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  motionPart: MotionPart;
  motionActivePose: 'start' | 'end';
  motionPreviewIndex: number | null;
  onUpdatePivot: (pivot: { x: number; y: number }) => void;
  onUpdatePose: (target: 'start' | 'end', updates: Partial<MotionPose>) => void;
  onTogglePose: () => void;
  onBake: () => void;
  onCancel: () => void;
}

type DragMode = 'pivot' | 'rotate' | 'translate' | null;

export const PixiMotionGizmo: React.FC<PixiMotionGizmoProps> = ({
  zoom,
  motionPart,
  motionActivePose,
  motionPreviewIndex,
  onUpdatePivot,
  onUpdatePose,
  onTogglePose,
  onBake,
  onCancel,
}) => {
  const scale = zoom / 100;
  const isPreviewingScrub = motionPreviewIndex !== null;
  const beginMotionEdit = useStudioStore(s => s.beginMotionEdit);
  const finishMotionEdit = useStudioStore(s => s.finishMotionEdit);

  const currentPose =
    motionActivePose === 'start' ? motionPart.startPose : motionPart.endPose;

  const [dragMode, setDragMode] = useState<DragMode>(null);

  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    canvasPoint: Point;
    startPose: MotionPose;
    startPivot: { x: number; y: number };
    initialAngle: number;
  } | null>(null);

  const clientToCanvas = useCallback(
    (clientX: number, clientY: number): Point => {
      const area = document.getElementById('center-canvas-area');
      if (!area) return { x: 0, y: 0 };
      const rect = area.getBoundingClientRect();
      const px = (clientX - rect.left) / scale;
      const py = (clientY - rect.top) / scale;
      return { x: px, y: py };
    },
    [scale]
  );

  // Keyboard navigation & nudging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreWorkspaceKey(e) || isWorkspaceControlTarget(e) || e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (dragMode) {
          finishMotionEdit(true);
          dragStartRef.current = null;
          setDragMode(null);
        } else {
          // Idle session: cancel/exit PixiMotion mode
          onCancel();
        }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        onBake();
        return;
      }

      const step = e.shiftKey ? 5 : 1;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) beginMotionEdit();
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onUpdatePose(motionActivePose, {
          translationX: currentPose.translationX - step,
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onUpdatePose(motionActivePose, {
          translationX: currentPose.translationX + step,
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onUpdatePose(motionActivePose, {
          translationY: currentPose.translationY - step,
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onUpdatePose(motionActivePose, {
          translationY: currentPose.translationY + step,
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) finishMotionEdit();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [beginMotionEdit, finishMotionEdit, currentPose, dragMode, motionActivePose, onBake, onCancel, onTogglePose, onUpdatePose]);

  // Window pointer move and up during drag
  useEffect(() => {
    if (!dragMode) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return;
      const { startPose, startPivot, initialAngle } = dragStartRef.current;
      const currentCanvas = clientToCanvas(e.clientX, e.clientY);

      if (dragMode === 'pivot') {
        // Pivot moves in canvas coordinates, accounting for translation
        const newPivotX = Math.round(currentCanvas.x - startPose.translationX);
        const newPivotY = Math.round(currentCanvas.y - startPose.translationY);
        onUpdatePivot({ x: newPivotX, y: newPivotY });
      } else if (dragMode === 'translate') {
        const deltaX = Math.round(currentCanvas.x - dragStartRef.current.canvasPoint.x);
        const deltaY = Math.round(currentCanvas.y - dragStartRef.current.canvasPoint.y);
        onUpdatePose(motionActivePose, {
          translationX: startPose.translationX + deltaX,
          translationY: startPose.translationY + deltaY,
        });
      } else if (dragMode === 'rotate') {
        const pivotX = startPivot.x + startPose.translationX;
        const pivotY = startPivot.y + startPose.translationY;
        const curAngle = Math.atan2(currentCanvas.y - pivotY, currentCanvas.x - pivotX);
        const angleDelta = curAngle - initialAngle;

        let finalRotation = startPose.rotation + angleDelta;

        // Shift snap to 15-degree increments
        if (e.shiftKey) {
          const snapStep = Math.PI / 12; // 15 degrees
          finalRotation = Math.round(finalRotation / snapStep) * snapStep;
        }

        onUpdatePose(motionActivePose, { rotation: finalRotation });
      }
    };

    const handlePointerUp = () => {
      finishMotionEdit();
      setDragMode(null);
      dragStartRef.current = null;
    };
    const handlePointerCancel = () => {
      finishMotionEdit(true);
      setDragMode(null);
      dragStartRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('blur', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('blur', handlePointerCancel);
    };
  }, [finishMotionEdit, clientToCanvas, dragMode, motionActivePose, onUpdatePivot, onUpdatePose]);

  const startDrag = (
    mode: DragMode,
    e: React.PointerEvent
  ) => {
    if (!e.isPrimary || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    beginMotionEdit();
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvasPt = clientToCanvas(e.clientX, e.clientY);

    const pivotX = motionPart.pivot.x + currentPose.translationX;
    const pivotY = motionPart.pivot.y + currentPose.translationY;
    const initialAngle = Math.atan2(canvasPt.y - pivotY, canvasPt.x - pivotX);

    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      canvasPoint: canvasPt,
      startPose: { ...currentPose },
      startPivot: { ...motionPart.pivot },
      initialAngle,
    };
    setDragMode(mode);
  };

  // Screen-space coordinates relative to center-canvas-area
  const boxX = (motionPart.bounds.x + currentPose.translationX) * scale;
  const boxY = (motionPart.bounds.y + currentPose.translationY) * scale;
  const boxW = Math.max(1, motionPart.bounds.w * scale);
  const boxH = Math.max(1, motionPart.bounds.h * scale);

  const pivotScreenX = (motionPart.pivot.x + currentPose.translationX) * scale;
  const pivotScreenY = (motionPart.pivot.y + currentPose.translationY) * scale;

  // Pivot relative to top-left of box
  const pivotOriginX = pivotScreenX - boxX;
  const pivotOriginY = pivotScreenY - boxY;

  const deg = (((currentPose.rotation * 180) / Math.PI) % 360 + 360) % 360;
  const displayDeg = deg > 180 ? (deg - 360).toFixed(1) : deg.toFixed(1);

  return (
    <div
      data-testid="piximotion-gizmo-root"
      className="absolute inset-0 pointer-events-none select-none z-40"
    >
      {/* 1. Rotated Bounding Box Container */}
      <div
        data-testid="piximotion-bounding-box"
        style={{
          position: 'absolute',
          left: `${boxX}px`,
          top: `${boxY}px`,
          width: `${boxW}px`,
          height: `${boxH}px`,
          transformOrigin: `${pivotOriginX}px ${pivotOriginY}px`,
          transform: `rotate(${currentPose.rotation}rad)`,
        }}
        className="pointer-events-auto"
      >
        {/* Crisp Pixel-Art Box Outline */}
        <div
          onPointerDown={(e) => !isPreviewingScrub && startDrag('translate', e)}
          title="Drag to translate (Arrow keys to nudge)"
          className={`w-full h-full border-2 border-dashed ${
            motionActivePose === 'start'
              ? 'border-[var(--accent-wisteria)] hover:border-[#ffffff]'
              : 'border-[var(--accent-gold)] hover:border-[#ffffff]'
          } bg-[var(--surface-0)]/15 cursor-move flex items-center justify-center`}
        >
          {/* Subtle center crosshair watermark */}
          <div className="w-2 h-2 opacity-30 border-t border-l border-[var(--desk-border)]" />
        </div>

        {/* Rotation Handle (Stems upward above the box) */}
        {!isPreviewingScrub && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '-26px',
              transform: 'translateX(-50%)',
            }}
            className="flex flex-col items-center pointer-events-auto cursor-grab active:cursor-grabbing group"
            onPointerDown={(e) => startDrag('rotate', e)}
            title="Drag to rotate (Hold Shift to snap 15°)"
          >
            <div
              className={`w-4 h-4 rounded-full border-2 ${
                motionActivePose === 'start'
                  ? 'border-[var(--accent-wisteria)] bg-[#140d1f]'
                  : 'border-[var(--accent-gold)] bg-[#140d1f]'
              } flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}
            >
              <PixelIcon name="rotate" size={10} className="text-[var(--accent-gold)]" />
            </div>
            {/* Stem line */}
            <div
              className={`w-[1.5px] h-2.5 ${
                motionActivePose === 'start'
                  ? 'bg-[var(--accent-wisteria)]'
                  : 'bg-[var(--accent-gold)]'
              }`}
            />
          </div>
        )}

        {/* Readout Degree & Translation Badge */}
        <div
          data-testid="piximotion-readout-badge"
          style={{
            position: 'absolute',
            bottom: '-28px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          className="bg-[#140d1f]/95 text-[var(--accent-gold)] border border-[var(--desk-border)] px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] font-bold shadow-lg pointer-events-none whitespace-nowrap flex items-center gap-1.5 z-50"
        >
          <span>{displayDeg}°</span>
          <span className="text-[var(--text-muted)]">|</span>
          <span>
            {currentPose.translationX >= 0 ? `+${currentPose.translationX}` : currentPose.translationX}
            ,
            {currentPose.translationY >= 0 ? `+${currentPose.translationY}` : currentPose.translationY}
          </span>
        </div>
      </div>

      {/* 2. Draggable Pivot Reticle */}
      <div
        data-testid="piximotion-pivot-handle"
        style={{
          position: 'absolute',
          left: `${pivotScreenX}px`,
          top: `${pivotScreenY}px`,
          transform: 'translate(-50%, -50%)',
        }}
        onPointerDown={(e) => !isPreviewingScrub && startDrag('pivot', e)}
        title="Draggable Motion Pivot (Place at joint/shoulder/elbow)"
        className={`pointer-events-auto cursor-crosshair z-50 flex items-center justify-center ${
          dragMode === 'pivot' ? 'scale-125' : 'hover:scale-110'
        } transition-transform`}
      >
        <div className="relative w-5 h-5 flex items-center justify-center">
          {/* Outer circle */}
          <div className="absolute inset-0 rounded-full border border-[var(--accent-gold)] bg-[#140d1f]/80 shadow-md" />
          {/* Horizontal crosshair */}
          <div className="absolute w-4 h-[1.5px] bg-[var(--accent-gold)]" />
          {/* Vertical crosshair */}
          <div className="absolute h-4 w-[1.5px] bg-[var(--accent-gold)]" />
          {/* Center core dot */}
          <div className="w-1.5 h-1.5 rounded-full bg-[#ffffff] z-10" />
        </div>
      </div>

      {/* 3. Floating HUD Bar (Action Buttons) */}
      <div
        data-testid="piximotion-hud-bar"
        style={{
          position: 'absolute',
          left: `${Math.max(16, boxX + boxW / 2)}px`,
          top: `${Math.max(8, boxY - 42)}px`,
          transform: 'translateX(-50%)',
        }}
        className="bg-[#140d1f]/95 border border-[var(--desk-border)] rounded-[3px] p-1 flex items-center gap-1.5 shadow-xl pointer-events-auto z-50 text-[11px] font-mono select-none"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Active Pose Toggle Button */}
        <button
          type="button"
          onClick={onTogglePose}
          data-testid="piximotion-toggle-pose-btn"
          title="Toggle between START and END poses"
          className={`px-2 py-0.5 rounded-[2px] font-bold text-[10px] transition-colors border ${
            motionActivePose === 'start'
              ? 'bg-[var(--accent-wisteria)] text-[#140d1f] border-[var(--accent-wisteria)]'
              : 'bg-[var(--accent-gold)] text-[#140d1f] border-[var(--accent-gold)]'
          }`}
        >
          {motionActivePose === 'start' ? 'START POSE' : 'END POSE'}
        </button>

        <div className="w-px h-3.5 bg-[var(--desk-border)]" />

        {/* Bake Button */}
        <button
          type="button"
          onClick={onBake}
          data-testid="piximotion-hud-bake-btn"
          title="Bake motion to timeline cels (Enter)"
          className="px-2 py-0.5 rounded-[2px] bg-[#1a3a1a] text-[#80e080] hover:bg-[#255225] border border-[#2e6b2e] font-bold text-[10px] transition-colors"
        >
          BAKE
        </button>

        {/* Cancel Button */}
        <button
          type="button"
          onClick={onCancel}
          data-testid="piximotion-hud-cancel-btn"
          title="Cancel PixiMotion (Escape)"
          className="px-1.5 py-0.5 rounded-[2px] bg-[#3a1a1a] text-[#ff8080] hover:bg-[#522525] border border-[#6b2e2e] font-bold text-[10px] transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
