import type { MotionPart, MotionPartSettings, MotionPose } from './pixiMotion';
import { WORKSPACE_ENVELOPE } from '@/config/canvasLimits';

export const MOTION_EDIT_LIMITS = { minFrames: 2, maxFrames: 30, historyDepth: 50,
  coordinate: WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION * 4, rotation: Math.PI * 2 } as const;
export interface MotionEditSnapshot extends MotionPartSettings {
  startPose: MotionPose;
  endPose: MotionPose;
  activePose: 'start' | 'end';
}
export interface MotionEditHistory {
  partId: string;
  past: MotionEditSnapshot[];
  future: MotionEditSnapshot[];
  pending: MotionEditSnapshot | null;
}
export interface MotionEditingState {
  motionPart: MotionPart | null;
  motionActivePose: 'start' | 'end';
  motionPreviewIndex: number | null;
  motionHistory: MotionEditHistory | null;
}
export function motionEditSnapshot(state: MotionEditingState): MotionEditSnapshot {
  const p = state.motionPart!;
  return { pivot: { ...p.pivot }, startPose: { ...p.startPose }, endPose: { ...p.endPose },
    frameCount: p.frameCount, easing: p.easing, activePose: state.motionActivePose };
}
export function validMotionSettings(p: Pick<MotionPart, 'pivot' | 'startPose' | 'endPose' | 'frameCount' | 'easing'>): boolean {
  const coordinate = (n: number) => Number.isFinite(n) && Math.abs(n) <= MOTION_EDIT_LIMITS.coordinate;
  const pose = (v: MotionPose) => coordinate(v.translationX) && coordinate(v.translationY) &&
    Number.isFinite(v.rotation) && Math.abs(v.rotation) <= MOTION_EDIT_LIMITS.rotation;
  return coordinate(p.pivot.x) && coordinate(p.pivot.y) && pose(p.startPose) && pose(p.endPose) &&
    Number.isInteger(p.frameCount) && p.frameCount >= MOTION_EDIT_LIMITS.minFrames && p.frameCount <= MOTION_EDIT_LIMITS.maxFrames &&
    ['linear', 'ease-in', 'ease-out', 'ease-in-out'].includes(p.easing);
}
export function motionHistoryFor(state: MotionEditingState): MotionEditHistory {
  if (!state.motionHistory || state.motionHistory.partId !== state.motionPart!.id) {
    state.motionHistory = { partId: state.motionPart!.id, past: [], future: [], pending: null };
  }
  return state.motionHistory;
}
export const sameMotionEdit = (a: MotionEditSnapshot, b: MotionEditSnapshot) =>
  a.pivot.x === b.pivot.x && a.pivot.y === b.pivot.y && a.frameCount === b.frameCount && a.easing === b.easing &&
  (['startPose', 'endPose'] as const).every(k => a[k].translationX === b[k].translationX &&
    a[k].translationY === b[k].translationY && a[k].rotation === b[k].rotation);
export function restoreMotionEdit(state: MotionEditingState, snapshot: MotionEditSnapshot): void {
  Object.assign(state.motionPart!, { pivot: { ...snapshot.pivot }, startPose: { ...snapshot.startPose },
    endPose: { ...snapshot.endPose }, frameCount: snapshot.frameCount, easing: snapshot.easing });
  state.motionActivePose = snapshot.activePose;
  state.motionPreviewIndex = null;
}
export function pushMotionEdit(history: MotionEditHistory, before: MotionEditSnapshot): void {
  history.past.push(before);
  if (history.past.length > MOTION_EDIT_LIMITS.historyDepth) history.past.shift();
  history.future = [];
}
/** Only small parameter snapshots; never duplicate or retain raster/mask data. */
export function motionHistoryBytes(history: MotionEditHistory | null): number {
  return history ? 256 + (history.past.length + history.future.length + Number(!!history.pending)) * 256 : 0;
}
