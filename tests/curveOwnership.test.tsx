// @vitest-environment happy-dom
import {act,cleanup,renderHook} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {useCurvePointerHandler} from '@/hooks/viewport/useCurvePointerHandler';
import {useStudioStore} from '@/stores/studioStore';
import {clearAllBuffers,getOrCreateBuffer,touchBuffer} from '@/lib/engine/bufferRegistry';
import {createHistoryEngine,setGlobalHistoryEngine} from '@/lib/engine/historyEngine';
import type {HistoryStep} from '@/types/canvas';
import {makeCanvas} from './helpers/mockCanvas';
beforeEach(()=>{
 const contexts=new WeakMap<HTMLCanvasElement,CanvasRenderingContext2D>();
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(this:HTMLCanvasElement){let ctx=contexts.get(this);if(!ctx){ctx=makeCanvas(this.width||32,this.height||32).getContext('2d')!;contexts.set(this,ctx);}return ctx;});
 clearAllBuffers();setGlobalHistoryEngine(null);
 useStudioStore.setState(s=>{s.tools.activeTool='curve';s.canvasWidth=32;s.canvasHeight=32;s.editRevision=0;s.activeFrameIndex=0;s.activeLayerId='a';s.currentProjectId='curve-ownership';
  s.frames=[{id:'f1',durationMs:100,layers:[{id:'a',name:'A',visible:true,locked:false,opacity:1,blendMode:'source-over'},{id:'b',name:'B',visible:true,locked:false,opacity:1,blendMode:'source-over'}]},
   {id:'f2',durationMs:100,layers:[{id:'c',name:'C',visible:true,locked:false,opacity:1,blendMode:'source-over'}]}];});
 getOrCreateBuffer('a',32,32);getOrCreateBuffer('b',32,32);getOrCreateBuffer('c',32,32);
});
afterEach(()=>{cleanup();setGlobalHistoryEngine(null);clearAllBuffers();vi.restoreAllMocks();});
const event={button:0,shiftKey:false} as React.PointerEvent;
function fixture(){const draw=vi.fn(),commit=vi.fn(),discard=vi.fn(),undo=vi.fn(),capture=vi.fn(),previewCanvasRef={current:document.createElement('canvas')},renderComposite=vi.fn();
 const hook=renderHook(()=>useCurvePointerHandler({canvasWidth:32,canvasHeight:32,previewCanvasRef,drawPointsOnActiveLayer:draw,captureSnapshot:capture,commitSnapshot:commit,discardSnapshot:discard,performUndo:undo,renderComposite}));
 act(()=>{hook.result.current.onPointerDown(event,{x:5,y:5});hook.result.current.onPointerMove(event,{x:20,y:5});hook.result.current.onPointerUp(event,{x:20,y:5});});return {...hook,draw,commit,discard,undo,capture};}
it.each(['frame','layer','locked','replacement','pixels'])('refuses publishing pending curve after %s ownership changes',kind=>{
 const f=fixture();expect(f.result.current.isAdjusting).toBe(true);
 act(()=>{if(kind==='pixels')touchBuffer('a');else useStudioStore.setState(s=>{
  if(kind==='frame'){s.activeFrameIndex=1;s.activeLayerId='c';}
  if(kind==='layer')s.activeLayerId='b';
  if(kind==='locked')s.frames[0].layers[0].locked=true;
  if(kind==='replacement')s.currentProjectId='replacement';
 });f.result.current.commit();});
 expect(f.draw).not.toHaveBeenCalled();expect(f.commit).not.toHaveBeenCalled();expect(f.result.current.isAdjusting).toBe(false);expect(f.discard).toHaveBeenCalled();
});
it('refuses re-edit after unrelated artwork changes without undoing them',()=>{
 const f=fixture();act(()=>f.result.current.commit());expect(f.result.current.canReEdit).toBe(true);
 touchBuffer('a');act(()=>expect(f.result.current.reEdit()).toBe(false));expect(f.undo).not.toHaveBeenCalled();expect(f.result.current.isAdjusting).toBe(false);
});
function step(description:string):HistoryStep{return {type:'pixel',layerId:'a',frameIndex:0,imageData:getOrCreateBuffer('a',32,32).ctx.getImageData(0,0,32,32),description};}
it('refuses re-edit when another history entry is on top even if pixels did not change',()=>{
 const engine=createHistoryEngine(50);setGlobalHistoryEngine(engine);const f=fixture();f.commit.mockImplementation(()=>engine.push(step('Bézier Curve')));
 act(()=>f.result.current.commit());engine.push(step('Unrelated operation'));
 act(()=>expect(f.result.current.reEdit()).toBe(false));expect(f.undo).not.toHaveBeenCalled();expect(engine.peekUndo()?.description).toBe('Unrelated operation');
});
it('does not reopen a curve if its requested Undo is refused',()=>{
 const engine=createHistoryEngine(50);setGlobalHistoryEngine(engine);const f=fixture();f.commit.mockImplementation(()=>engine.push(step('Bézier Curve')));
 act(()=>f.result.current.commit());act(()=>expect(f.result.current.reEdit()).toBe(false));expect(f.undo).toHaveBeenCalledOnce();expect(f.result.current.isAdjusting).toBe(false);expect(f.capture).toHaveBeenCalledOnce();
});
it('leaves Enter on a focused Cancel button to the button instead of committing artwork',()=>{
 const f=fixture(),button=document.createElement('button');document.body.append(button);button.focus();
 button.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));expect(f.draw).not.toHaveBeenCalled();button.remove();
});
it('does not take Enter from a select input while a curve is pending',()=>{
 const f=fixture(),select=document.createElement('select');document.body.append(select);select.focus();
 select.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));expect(f.draw).not.toHaveBeenCalled();select.remove();
});
it('claims curve re-edit Ctrl+Z before the existing workspace Undo listener',()=>{
 const workspaceUndo=vi.fn();window.addEventListener('keydown',workspaceUndo);
 try {const f=fixture();act(()=>f.result.current.commit());act(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true,cancelable:true})));
  expect(f.undo).toHaveBeenCalledOnce();expect(workspaceUndo).not.toHaveBeenCalled();}
 finally {window.removeEventListener('keydown',workspaceUndo);}
});
it('cancels pending preview on Ctrl+Z without undoing earlier committed artwork',()=>{
 const workspaceUndo=vi.fn();window.addEventListener('keydown',workspaceUndo);
 try {const f=fixture();act(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true,cancelable:true})));
  expect(f.result.current.isAdjusting).toBe(false);expect(f.draw).not.toHaveBeenCalled();expect(workspaceUndo).not.toHaveBeenCalled();}
 finally {window.removeEventListener('keydown',workspaceUndo);}
});
