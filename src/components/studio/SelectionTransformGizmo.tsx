'use client';

import React, { useMemo } from 'react';
import {
  TransformHandleType,
  TransformState,
} from '@/hooks/viewport/useViewportSelectionTransform';
import {
  extractSelectionBoundarySegments,
  boundarySegmentsToSvgPath,
} from '@/lib/canvas/selectionUtils';
import { Point } from '@/lib/canvas/rasterMath';

interface SelectionTransformGizmoProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  selectionMask: Uint8Array | null;
  transform: TransformState;
  interactive?: boolean;
  onHandlePointerDown: (handle: TransformHandleType, clientPoint: Point, canvasPoint: Point) => void;
  onPointerMove: (canvasPoint: Point, modifiers: { shiftKey: boolean; altKey: boolean }) => void;
  onPointerUp: () => void;
  onCommit: () => void;
  onCancel: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onRotate90CW: () => void;
  onRotate90CCW: () => void;
}

const HANDLE_VISUAL_SIZE = 8;
const HANDLE_HIT_SIZE = 18;

export const SelectionTransformGizmo: React.FC<SelectionTransformGizmoProps> = ({
  canvasWidth,
  canvasHeight,
  zoom,
  selectionMask,
  transform,
  interactive = true,
  onHandlePointerDown,
  onPointerMove,
  onPointerUp,
  onCommit,
  onCancel,
  onFlipH,
  onFlipV,
  onRotate90CW,
  onRotate90CCW,
}) => {
  const scale = zoom / 100;

  // Screen coordinates relative to #center-canvas-area
  const screenX = transform.x * scale;
  const screenY = transform.y * scale;
  const screenW = Math.max(1, transform.w * scale);
  const screenH = Math.max(1, transform.h * scale);

  const pivotScreenX = transform.pivot.x * scale;
  const pivotScreenY = transform.pivot.y * scale;

  const localPivotX = pivotScreenX - screenX;
  const localPivotY = pivotScreenY - screenY;

  // Degrees readout
  const rotationDeg = (((transform.rotation * 180) / Math.PI) % 360 + 360) % 360;
  const displayDeg = rotationDeg > 180 ? (rotationDeg - 360).toFixed(1) : rotationDeg.toFixed(1);

  // Irregular per-pixel boundary segments
  const perPixelSvgPath = useMemo(() => {
    if (!selectionMask || Math.abs(transform.rotation) > 1e-4) return null;
    const segments = extractSelectionBoundarySegments(selectionMask, canvasWidth, canvasHeight);
    return boundarySegmentsToSvgPath(segments, scale);
  }, [selectionMask, canvasWidth, canvasHeight, scale, transform.rotation]);

  const clientToCanvas = (e: React.PointerEvent): Point => {
    const area = document.getElementById('center-canvas-area');
    if (!area) return { x: 0, y: 0 };
    const rect = area.getBoundingClientRect();
    const px = (e.clientX - rect.left) / scale;
    const py = (e.clientY - rect.top) / scale;
    return { x: px, y: py };
  };

  const startDrag = (handle: TransformHandleType, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const canvasPoint = clientToCanvas(e);
    onHandlePointerDown(handle, { x: e.clientX, y: e.clientY }, canvasPoint);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (transform.isTransforming) {
      e.stopPropagation();
      const canvasPoint = clientToCanvas(e);
      onPointerMove(canvasPoint, { shiftKey: e.shiftKey, altKey: e.altKey });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (transform.isTransforming) {
      if ((e.target as HTMLElement).hasPointerCapture?.(e.pointerId)) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
      onPointerUp();
    }
  };

  const handles: { id: TransformHandleType; x: number; y: number; cursor: string }[] = [
    { id: 'tl', x: 0, y: 0, cursor: 'nwse-resize' },
    { id: 'tc', x: screenW / 2, y: 0, cursor: 'ns-resize' },
    { id: 'tr', x: screenW, y: 0, cursor: 'nesw-resize' },
    { id: 'mr', x: screenW, y: screenH / 2, cursor: 'ew-resize' },
    { id: 'br', x: screenW, y: screenH, cursor: 'nwse-resize' },
    { id: 'bc', x: screenW / 2, y: screenH, cursor: 'ns-resize' },
    { id: 'bl', x: 0, y: screenH, cursor: 'nesw-resize' },
    { id: 'ml', x: 0, y: screenH / 2, cursor: 'ew-resize' },
  ];

  return (
    <>
      <style>{`
        @keyframes marching-ants {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 8; }
        }
        .marching-ants-black {
          stroke: #140d1f;
          stroke-width: 1.5;
          stroke-dasharray: 4 4;
          animation: marching-ants 0.4s linear infinite;
        }
        .marching-ants-white {
          stroke: #ffffff;
          stroke-width: 1.5;
          stroke-dasharray: 4 4;
          stroke-dashoffset: 4;
          animation: marching-ants 0.4s linear infinite;
        }
      `}</style>

      {/* 1. Irregular Per-Pixel Marching Ants Contour (when not rotating) */}
      {perPixelSvgPath && (
        <svg
          className="absolute inset-0 pointer-events-none z-20 overflow-visible"
          width={canvasWidth * scale}
          height={canvasHeight * scale}
        >
          <path d={perPixelSvgPath} fill="none" className="marching-ants-black" />
          <path d={perPixelSvgPath} fill="none" className="marching-ants-white" />
        </svg>
      )}

      {/* 1.5 Non-Interactive Bounding Box Outline (when drawing with tools like Pen/Eraser) */}
      {!interactive && !perPixelSvgPath && (
        <svg
          className="absolute top-0 left-0 pointer-events-none z-20 overflow-visible"
          style={{
            width: `${screenW}px`,
            height: `${screenH}px`,
            transform: `translate(${screenX}px, ${screenY}px)`,
          }}
        >
          <rect x={0} y={0} width={screenW} height={screenH} fill="none" className="marching-ants-black" />
          <rect x={0} y={0} width={screenW} height={screenH} fill="none" className="marching-ants-white" />
        </svg>
      )}

      {/* 2. Free-Transform Rotated Bounding Box & Handles (Only when interactive) */}
      {interactive && (
        <div
          data-testid="selection-transform-gizmo"
          className="absolute top-0 left-0 pointer-events-auto select-none z-30"
          style={{
            width: `${screenW}px`,
            height: `${screenH}px`,
            transformOrigin: `${localPivotX}px ${localPivotY}px`,
            transform: `translate(${screenX}px, ${screenY}px) rotate(${transform.rotation}rad)`,
            touchAction: 'none',
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
        {/* Dual-Pass Marching Ants Bounding Box Outline */}
        <svg
          className="absolute inset-0 pointer-events-none overflow-visible"
          width={screenW}
          height={screenH}
        >
          {/* Black Underlay */}
          <rect
            x={0}
            y={0}
            width={screenW}
            height={screenH}
            fill="none"
            className="marching-ants-black"
          />
          {/* White Overlay Phase Shifted */}
          <rect
            x={0}
            y={0}
            width={screenW}
            height={screenH}
            fill="none"
            className="marching-ants-white"
          />
        </svg>

        {/* Translation Hit Body (Inside Area) */}
        <div
          data-testid="gizmo-translate-body"
          className="absolute inset-0 cursor-move bg-transparent"
          title="Drag to move selection (Shift to lock axis)"
          onPointerDown={(e) => startDrag('translate', e)}
        />

        {/* Outer Rotation Hit Zones (4 Corners Extended Annulus) */}
        {[
          { x: -16, y: -16, corner: 'tl' },
          { x: screenW - 8, y: -16, corner: 'tr' },
          { x: screenW - 8, y: screenH - 8, corner: 'br' },
          { x: -16, y: screenH - 8, corner: 'bl' },
        ].map((zone) => (
          <div
            key={`rot-zone-${zone.corner}`}
            data-testid={`gizmo-rotate-${zone.corner}`}
            className="absolute w-6 h-6 rounded-full cursor-crosshair z-30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-auto"
            style={{
              left: `${zone.x}px`,
              top: `${zone.y}px`,
            }}
            title="Drag to rotate selection (Shift to snap 15°)"
            onPointerDown={(e) => startDrag('rotate', e)}
          >
            <div className="w-4 h-4 rounded-full border border-[#f0be7c] bg-[#140d1f]/70 text-[#f0be7c] text-[8px] flex items-center justify-center font-bold">
              ↻
            </div>
          </div>
        ))}

        {/* 8 Transform Handles */}
        {handles.map((h) => (
          <div
            key={h.id}
            data-testid={`gizmo-handle-${h.id}`}
            className="absolute z-40 flex items-center justify-center pointer-events-auto"
            style={{
              left: `${h.x}px`,
              top: `${h.y}px`,
              width: `${HANDLE_HIT_SIZE}px`,
              height: `${HANDLE_HIT_SIZE}px`,
              transform: 'translate(-50%, -50%)',
              cursor: h.cursor,
            }}
            onPointerDown={(e) => startDrag(h.id, e)}
          >
            <div
              className="border border-[#140d1f] shadow-xs"
              style={{
                width: `${HANDLE_VISUAL_SIZE}px`,
                height: `${HANDLE_VISUAL_SIZE}px`,
                backgroundColor: transform.activeHandle === h.id ? '#f0be7c' : '#ffffff',
                boxShadow: '0 0 0 1px #f0be7c',
              }}
            />
          </div>
        ))}

        {/* Center Pivot Reticle Crosshair (⊕) */}
        <div
          data-testid="gizmo-pivot"
          className="absolute z-40 w-5 h-5 flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing"
          style={{
            left: `${localPivotX}px`,
            top: `${localPivotY}px`,
            transform: 'translate(-50%, -50%)',
          }}
          title="Center Pivot Anchor (drag to shift rotation center)"
          onPointerDown={(e) => startDrag('pivot', e)}
        >
          <div className="relative w-4 h-4 flex items-center justify-center">
            {/* Circle */}
            <div className="absolute inset-0 rounded-full border border-[#f0be7c] bg-[#140d1f]/60" />
            {/* Horizontal reticle */}
            <div className="absolute w-3.5 h-[1.5px] bg-[#f0be7c]" />
            {/* Vertical reticle */}
            <div className="absolute h-3.5 w-[1.5px] bg-[#f0be7c]" />
            {/* Center dot */}
            <div className="w-1 h-1 rounded-full bg-[#ffffff] z-10" />
          </div>
        </div>

        {/* Live Degree Readout Badge (when rotated) */}
        {Math.abs(parseFloat(displayDeg)) > 0.1 && (
          <div
            data-testid="gizmo-degree-badge"
            className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#140d1f] text-[#f0be7c] border border-[#f0be7c] text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] shadow-md pointer-events-none whitespace-nowrap z-50"
          >
            {displayDeg}°
          </div>
        )}

        {/* Quick Action Floating HUD Bar */}
        <div
          data-testid="gizmo-hud-bar"
          className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-[#140d1f]/95 border border-[#3a2e4c] rounded-[2px] px-1 py-0.5 flex items-center gap-1 shadow-lg pointer-events-auto z-50 text-[11px] font-mono"
        >
          <button
            type="button"
            onClick={onFlipH}
            title="Flip Horizontal (H)"
            className="w-6 h-5 flex items-center justify-center text-[var(--text-body)] hover:text-[#f0be7c] hover:bg-[#2c1e40] rounded-[2px] cursor-pointer"
          >
            ↔
          </button>
          <button
            type="button"
            onClick={onFlipV}
            title="Flip Vertical (V)"
            className="w-6 h-5 flex items-center justify-center text-[var(--text-body)] hover:text-[#f0be7c] hover:bg-[#2c1e40] rounded-[2px] cursor-pointer"
          >
            ↕
          </button>
          <div className="w-px h-3 bg-[#3a2e4c]" />
          <button
            type="button"
            onClick={onRotate90CCW}
            title="Rotate 90° CCW"
            className="w-6 h-5 flex items-center justify-center text-[var(--text-body)] hover:text-[#f0be7c] hover:bg-[#2c1e40] rounded-[2px] cursor-pointer"
          >
            ↺
          </button>
          <button
            type="button"
            onClick={onRotate90CW}
            title="Rotate 90° CW"
            className="w-6 h-5 flex items-center justify-center text-[var(--text-body)] hover:text-[#f0be7c] hover:bg-[#2c1e40] rounded-[2px] cursor-pointer"
          >
            ↻
          </button>
          <div className="w-px h-3 bg-[#3a2e4c]" />
          <button
            type="button"
            onClick={onCommit}
            title="Commit Transform (Enter)"
            data-testid="gizmo-commit-btn"
            className="w-6 h-5 flex items-center justify-center text-[#80e080] hover:bg-[#1a3a1a] rounded-[2px] cursor-pointer font-bold"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={onCancel}
            title="Cancel Transform (Escape)"
            data-testid="gizmo-cancel-btn"
            className="w-6 h-5 flex items-center justify-center text-[#ff8080] hover:bg-[#3a1a1a] rounded-[2px] cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      </div>
      )}
    </>
  );
};
