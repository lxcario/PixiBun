import {expect,test,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {PixiBunController} from '../../scripts/nibbli/controller';
import {NibbliMemory} from '../../scripts/nibbli/memory';
import {ConversationAdapter} from '../../scripts/nibbli/artist/adapters';
import {MockRotationHandsAdapter,runHands} from '../../scripts/nibbli/artist/handsLoop';
import {executeHandsPlan,handsSignature,observeHands,readHandsProject,type HandsRotation} from '../../scripts/nibbli/artist/hands';
const variants=[
 {degrees:90,width:5,height:7,pivot:{x:12.5,y:13.5},zoom:800,white:[13,13],accent:[10,12]},
 {degrees:180,width:6,height:8,pivot:{x:13,y:14},zoom:1600,white:[13,15],accent:[14,12]},
 {degrees:270,width:5,height:7,pivot:{x:12.5,y:13.5},zoom:1600,white:[11,13],accent:[14,14]},
 {degrees:90,width:6,height:8,pivot:{x:10,y:10},zoom:800,white:[7,12],accent:[4,11]},
 {degrees:270,width:6,height:8,pivot:{x:16,y:10},zoom:1600,white:[18,13],accent:[21,14]},
 {degrees:180,width:5,height:8,pivot:{x:12.5,y:14},zoom:800,white:[12,15],accent:[13,12]},
] as const;
const rectangle=(v:typeof variants[number])=>({x:10,y:10,width:v.width,height:v.height});
async function setup(page:Page,browser:string,journey:string){
 const root=process.env.NIBBLI_ARTIST_ROOT!,candidate=JSON.parse(await readFile(path.join(root,'candidate.json'),'utf8')),memory=await NibbliMemory.create(root,{...candidate,browser,role:'hands',journey});
 await page.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true}));return {root,memory,controller:new PixiBunController(page,memory)};
}
async function seed(controller:PixiBunController,zoom:number){
 await controller.open();await controller.singlePixelBrush();await controller.color('#29233d');await controller.stroke([{x:0,y:0}]);await controller.layer('Motif');
 await controller.stroke([{x:11,y:11},{x:14,y:11},{x:14,y:14}]);await controller.color('#f4effb');await controller.stroke([{x:12,y:12}]);await controller.color('#ab76cf');await controller.stroke([{x:11,y:15}]);await controller.stroke([{x:26,y:26}]);
 await controller.addFrame();await controller.frameDuration(180);await controller.stroke([{x:2,y:2}]);await controller.selectFrame(1);
 await controller.action('fixture-zoom',{zoom},async()=>{await controller.page.getByRole('button',{name:/^Zoom \d+ percent\. Choose zoom level$/}).click();await controller.page.getByRole('group',{name:'Zoom levels',exact:true}).getByRole('button',{name:`${zoom}%`,exact:true}).click();await expect(controller.page.getByRole('button',{name:`Zoom ${zoom} percent. Choose zoom level`,exact:true})).toBeVisible();});
}
for(const [i,v]of variants.entries())test(`Hands rotation ${v.degrees} variant ${i+1} protects pixels, explicit pivot, history and saved exports`,async({page},info)=>{
 const {root,memory,controller}=await setup(page,info.project.name,`rotation-${v.degrees}-variant-${i+1}`);
 try{
  await seed(controller,v.zoom);const before=await observeHands(controller,memory);
  const adapter=process.env.NIBBLI_ARTIST_MODE==='conversation'?new ConversationAdapter(path.join(root,'inbox')):new MockRotationHandsAdapter(v.degrees,rectangle(v),v.pivot);
  const result=await runHands(controller,memory,adapter,`Rotate this asymmetric motif ${v.degrees} degrees clockwise using an explicit ${i<3?'center':'observed'} pivot and a ${v.width} by ${v.height} enclosing selection beginning one pixel above and left of the motif. Preserve the purple outside sentinel, base layer and other frame. Choose the coordinates from the observation and record why and where its pixels should move.`);
  const after=readHandsProject(await controller.export('project')),raster=after.frames[0].layers.find(l=>l.name==='Motif')!.raster,pixel=(x:number,y:number)=>raster.data.slice((y*32+x)*4,(y*32+x)*4+4);
  expect(pixel(v.white[0],v.white[1])).toEqual([244,239,251,255]);expect(pixel(v.accent[0],v.accent[1])).toEqual([171,118,207,255]);expect(pixel(26,26)).toEqual([171,118,207,255]);
  expect(after.frames[1]).toEqual(before.project.frames[1]);expect(after.frames[0].layers.find(l=>l.name!=='Motif')).toEqual(before.project.frames[0].layers.find(l=>l.name!=='Motif'));
  expect(result.functional).toMatchObject({verdict:'passed',edits:1,protectedContent:'passed',saveReloadAndExports:'passed'});expect(controller.runtimeErrors).toEqual([]);await memory.finish('passed',result);
 }catch(error){await memory.finish('failed',{error:String(error),review:'Preserve exact quarter-turn pixels and pivot expectations; inspect the UI and project evidence before repair.'});throw error;}
});
test('Hands rotation cancel preserves all pixels and preceding Undo history for three quarter turns',async({page},info)=>{
 const {memory,controller}=await setup(page,info.project.name,'rotation-cancel-history');
 try{
  await seed(controller,800);const previous=await observeHands(controller,memory),layer=previous.project.frames[0].layers.find(l=>l.name==='Motif')!;
  await controller.selectLayer(layer.id);await controller.tool('pen');await controller.stroke([{x:27,y:26}]);const before=await observeHands(controller,memory);
  await controller.selectLayer(layer.id);
  for(const degrees of [90,180,270] as const){await controller.rotateSelection({x:10,y:10,width:6,height:8},degrees,{x:13,y:14},'cancel');const cancelled=await observeHands(controller,memory);expect(handsSignature(cancelled.project)).toBe(handsSignature(before.project));}
  await controller.undo();expect(handsSignature((await observeHands(controller,memory)).project)).toBe(handsSignature(previous.project));await controller.redo();expect(handsSignature((await observeHands(controller,memory)).project)).toBe(handsSignature(before.project));
  await controller.save();await controller.reload();expect(handsSignature(readHandsProject(await controller.export('project')))).toBe(handsSignature(before.project));expect(controller.runtimeErrors).toEqual([]);await memory.finish('passed',{functional:{verdict:'passed',threePreviewsCancelled:true,previousHistoryPreserved:true},artistic:{verdict:'not-evaluated'}});
 }catch(error){await memory.finish('failed',{error:String(error)});throw error;}
});
test('Hands rotation refuses clipped, wrong-frame, locked, stale, free-angle and late-invalid plans before editing',async({page},info)=>{
 const {memory,controller}=await setup(page,info.project.name,'rotation-refusals');
 try{
  await seed(controller,800);const observation=await observeHands(controller,memory),layer=observation.project.frames[0].layers.find(l=>l.name==='Motif')!;
  const edit:HandsRotation={op:'rotate-selection',degrees:90,rect:rectangle(variants[0]),pivot:variants[0].pivot,frameId:observation.project.frames[0].id,layerId:layer.id,reason:'Expected refusal fixture',expectedChange:'No artwork changes on invalid input',protectedLayerIds:observation.project.frames.flatMap(f=>f.layers.filter(l=>l.id!==layer.id).map(l=>l.id))};
  const plan={protocol:1,observationId:observation.id,edits:[edit]};
  await expect(executeHandsPlan(controller,memory,{...plan,edits:[{...edit,frameId:observation.project.frames[1].id}]},observation)).rejects.toThrow('unavailable');
  await expect(executeHandsPlan(controller,memory,{...plan,edits:[edit,{...edit,pivot:{x:0,y:0}}]},observation)).rejects.toThrow('outside');
  await expect(executeHandsPlan(controller,memory,{...plan,observationId:'stale'},observation)).rejects.toThrow('Stale');
  await expect(executeHandsPlan(controller,memory,{...plan,edits:[{...edit,degrees:37}]},observation)).rejects.toThrow('quarter');
  if(await page.getByRole('dialog').isVisible())await page.keyboard.press('Escape');
  await expect(controller.rotateSelection(edit.rect,90,{x:0,y:0})).rejects.toThrow('clipped');await expect(controller.rotateSelection(edit.rect,90,{x:12.25,y:13.5})).rejects.toThrow('pivot');
  expect(handsSignature((await observeHands(controller,memory)).project)).toBe(handsSignature(observation.project));await controller.selectLayer(layer.id);await page.getByRole('button',{name:'Lock layer Motif',exact:true}).click();
  const locked=await observeHands(controller,memory);await expect(executeHandsPlan(controller,memory,{...plan,observationId:locked.id},locked)).rejects.toThrow('locked');await expect(controller.rotateSelection(edit.rect,90,edit.pivot)).rejects.toThrow('locked');
  expect(handsSignature((await observeHands(controller,memory)).project)).toBe(handsSignature(locked.project));expect((await NibbliMemory.readEvents(memory.directory)).filter(e=>e.kind==='hands-edit-intent')).toHaveLength(0);expect(controller.runtimeErrors).toEqual([]);await memory.finish('passed',{functional:{verdict:'passed',artworkChangedByRefusals:false},artistic:{verdict:'not-evaluated'}});
 }catch(error){await memory.finish('failed',{error:String(error)});throw error;}
});
