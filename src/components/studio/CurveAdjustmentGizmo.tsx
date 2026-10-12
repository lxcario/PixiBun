'use client';

import React from 'react';
import type { Point } from '@/lib/canvas/rasterMath';
import type { CurveHandleId } from '@/hooks/viewport/useCurvePointerHandler';

export interface CurveAdjustmentGizmoProps {
  zoom: number;
  start: Point;
  control: Point;
  end: Point;
  draggingHandle: CurveHandleId | null;
  onStartDrag: (handle: CurveHandleId, e: React.PointerEvent) => void;
}

export const CurveAdjustmentGizmo: React.FC<CurveAdjustmentGizmoProps> = ({
  zoom,
  start,
  control,
  end,
  draggingHandle,
  onStartDrag,
}) => {
  const scale = zoom / 100;

  // Screen coordinates centered at the pixel center (+0.5)
  const sx = (start.x + 0.5) * scale;
  const sy = (start.y + 0.5) * scale;
  const cx = (control.x + 0.5) * scale;
  const cy = (control.y + 0.5) * scale;
  const ex = (end.x + 0.5) * scale;
  const ey = (end.y + 0.5) * scale;

  return (
    <div
      data-testid="curve-adjustment-gizmo"
      className="absolute inset-0 pointer-events-none select-none z-30"
      style={{ overflow: 'visible' }}
    >
      {/* Tangent Guide Lines (Dashed Lilac Vector Lines) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ overflow: 'visible' }}
        aria-hidden="true"
      >
        <line
          x1={sx}
          y1={sy}
          x2={cx}
          y2={cy}
          stroke="rgba(167, 139, 250, 0.75)"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
        <line
          x1={cx}
          y1={cy}
          x2={ex}
          y2={ey}
          stroke="rgba(167, 139, 250, 0.75)"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
      </svg>

      {/* Start Endpoint Handle */}
      <div
        data-testid="curve-handle-start"
        className="absolute pointer-events-auto cursor-move flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${sx}px`,
          top: `${sy}px`,
          width: '18px',
          height: '18px',
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onStartDrag('start', e);
        }}
        title="Start Point (Drag to move)"
      >
        <div
          className={`w-2.5 h-2.5 rounded-[1px] border shadow-xs transition-transform ${
            draggingHandle === 'start'
              ? 'bg-[#f59e0b] border-[#0f172a] scale-125'
              : 'bg-[#38bdf8] border-[#0f172a] hover:bg-[#67e8f9] hover:scale-115'
          }`}
          style={{ boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.6)' }}
        />
      </div>

      {/* End Endpoint Handle */}
      <div
        data-testid="curve-handle-end"
        className="absolute pointer-events-auto cursor-move flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${ex}px`,
          top: `${ey}px`,
          width: '18px',
          height: '18px',
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onStartDrag('end', e);
        }}
        title="End Point (Drag to move)"
      >
        <div
          className={`w-2.5 h-2.5 rounded-[1px] border shadow-xs transition-transform ${
            draggingHandle === 'end'
              ? 'bg-[#f59e0b] border-[#0f172a] scale-125'
              : 'bg-[#38bdf8] border-[#0f172a] hover:bg-[#67e8f9] hover:scale-115'
          }`}
          style={{ boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.6)' }}
        />
      </div>

      {/* Control Handle (Bend Diamond) */}
      <div
        data-testid="curve-handle-control"
        className="absolute pointer-events-auto cursor-grab active:cursor-grabbing flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${cx}px`,
          top: `${cy}px`,
          width: '20px',
          height: '20px',
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onStartDrag('control', e);
        }}
        title="Control Handle (Drag to bend curve)"
      >
        <div
          className={`w-3 h-3 rotate-45 border shadow-sm flex items-center justify-center transition-transform ${
            draggingHandle === 'control'
              ? 'bg-[#38bdf8] border-[#0f172a] scale-125'
              : 'bg-[#ffffff] border-[#0f172a] hover:bg-[#fef08a] hover:scale-115'
          }`}
          style={{ boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.6)' }}
        >
          <div className="w-1 h-1 bg-[#f59e0b] rounded-full pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
