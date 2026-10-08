import type { MotionPartBounds, MotionPivot, MotionPose, MotionEasing } from './pixiMotion';
import { WORKSPACE_ENVELOPE } from '@/config/canvasLimits';
import { MOTION_EDIT_LIMITS } from './motionEditing';

/** Version 1 preserves one rigid part; skeletons and parent constraints need a new version. */
export interface MotionRig {
  version: 1;
  id: string;
  name: string;
  part: {
    id: string;
    sourceFrameId: string;
    sourceLayerId: string;
    width: number;
    height: number;
    sourceSha256: string;
    bounds: MotionPartBounds;
    pivot: MotionPivot;
    startPose: MotionPose;
    endPose: MotionPose;
    frameCount: number;
    easing: MotionEasing;
    /** Sorted, disjoint selected-pixel runs in the bounds-local row-major raster. */
    maskRuns: [number, number][] | null;
  };
}

export const MOTION_RIG_LIMITS = { count: 16, maskRuns: 512, jsonChars: 32768 } as const;
export const motionRigBytes = (rigs: MotionRig[] | undefined) => rigs ? JSON.stringify(rigs).length * 2 : 0;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 128): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const integer = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const number = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max;
const shape = (v: unknown, keys: string[]): v is Record<string, unknown> => object(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));

/** Strict admission preserves supported data and refuses unknown motion extensions. */
export function parseMotionRigs(input: unknown): MotionRig[] | null {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > MOTION_RIG_LIMITS.count || JSON.stringify(input).length > MOTION_RIG_LIMITS.jsonChars) return null;
  const ids = new Set<string>(), parts = new Set<string>();
  const max = WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION;
  for (const rig of input) {
    if (!shape(rig, ['version', 'id', 'name', 'part']) || rig.version !== 1 || !text(rig.id) || !text(rig.name, 80) || ids.has(rig.id)) return null;
    ids.add(rig.id);
    const p = rig.part;
    if (!shape(p, ['id', 'sourceFrameId', 'sourceLayerId', 'width', 'height', 'sourceSha256', 'bounds', 'pivot', 'startPose', 'endPose', 'frameCount', 'easing', 'maskRuns']) ||
      !text(p.id) || parts.has(p.id) || !text(p.sourceFrameId) || !text(p.sourceLayerId) ||
      !integer(p.width, 1, max) || !integer(p.height, 1, max) || typeof p.sourceSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(p.sourceSha256)) return null;
    parts.add(p.id);
    if (!shape(p.bounds, ['x', 'y', 'w', 'h']) || !integer(p.bounds.x, 0, p.width - 1) || !integer(p.bounds.y, 0, p.height - 1) ||
      !integer(p.bounds.w, 1, p.width - p.bounds.x) || !integer(p.bounds.h, 1, p.height - p.bounds.y) ||
      !shape(p.pivot, ['x', 'y']) || !number(p.pivot.x, max * 4) || !number(p.pivot.y, max * 4)) return null;
    for (const pose of [p.startPose, p.endPose]) if (!shape(pose, ['translationX', 'translationY', 'rotation']) ||
      !number(pose.translationX, max * 4) || !number(pose.translationY, max * 4) || !number(pose.rotation, Math.PI * 2)) return null;
    if (!integer(p.frameCount, MOTION_EDIT_LIMITS.minFrames, MOTION_EDIT_LIMITS.maxFrames) || !['linear', 'ease-in', 'ease-out', 'ease-in-out'].includes(p.easing as string)) return null;
    if (p.maskRuns !== null) {
      if (!Array.isArray(p.maskRuns) || !p.maskRuns.length || p.maskRuns.length > MOTION_RIG_LIMITS.maskRuns) return null;
      let end = 0;
      const pixels = p.bounds.w * p.bounds.h;
      for (const run of p.maskRuns) {
        if (!Array.isArray(run) || run.length !== 2 || !integer(run[0], end, pixels - 1) || !integer(run[1], 1, pixels - run[0])) return null;
        end = run[0] + run[1];
      }
    }
  }
  return structuredClone(input) as MotionRig[];
}
