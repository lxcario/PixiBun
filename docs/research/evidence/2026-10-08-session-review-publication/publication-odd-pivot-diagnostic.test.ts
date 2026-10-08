// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { makeCanvas } from '../tests/helpers/mockCanvas';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import { captureMotionPart, transformMotionPart } from '@/lib/animation/pixiMotion';

it('an odd square captured with its default centered pivot stays in place on a quarter turn', () => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    let ctx=contexts.get(this); if(!ctx){ctx=makeCanvas(this.width||32,this.height||32).getContext('2d')!;contexts.set(this,ctx);} return ctx;
  });
  try {
    clearAllBuffers();useStudioStore.getState().resetToNewProject('odd-pivot-diagnostic');
    const state=useStudioStore.getState(),entry=getOrCreateBuffer(state.activeLayerId,32,32);
    entry.ctx.fillStyle='#ff0000';entry.ctx.fillRect(4,4,3,3);
    const part=captureMotionPart({canvasWidth:32,canvasHeight:32,activeFrameIndex:0,activeLayerId:state.activeLayerId,frames:state.frames,selection:{x:4,y:4,w:3,h:3},selectionMask:null,layerCanvas:entry.canvas});
    expect(part).not.toBeNull();
    const rotated=transformMotionPart(part!,{translationX:0,translationY:0,rotation:Math.PI/2},32,32);
    const visible=Array.from({length:1024},(_,i)=>i).filter(i=>rotated.data[i*4+3]>0).map(i=>[i%32,Math.floor(i/32)]);
    expect(visible).toEqual([[4,4],[5,4],[6,4],[4,5],[5,5],[6,5],[4,6],[5,6],[6,6]]);
  } finally {clearAllBuffers();vi.restoreAllMocks();}
});
