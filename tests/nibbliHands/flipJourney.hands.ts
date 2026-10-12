import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PixiBunController } from '../../scripts/nibbli/controller';
import { NibbliMemory } from '../../scripts/nibbli/memory';
import { ConversationAdapter } from '../../scripts/nibbli/artist/adapters';
import { MockFlipHandsAdapter, runHands } from '../../scripts/nibbli/artist/handsLoop';
import { executeHandsPlan, handsSignature, observeHands, readHandsProject, type HandsFlip } from '../../scripts/nibbli/artist/hands';

const variants = [
  { axis: 'horizontal', width: 5, height: 7, zoom: 800 },
  { axis: 'horizontal', width: 6, height: 8, zoom: 1600 },
  { axis: 'vertical', width: 5, height: 7, zoom: 1600 },
  { axis: 'vertical', width: 6, height: 8, zoom: 800 },
] as const;
async function setup(page: Page, browser: string, journey: string) {
  const root = process.env.NIBBLI_ARTIST_ROOT!, candidate = JSON.parse(await readFile(path.join(root, 'candidate.json'), 'utf8'));
  const memory = await NibbliMemory.create(root, { ...candidate, browser, role: 'hands', journey });
  await page.addInitScript(() => Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }));
  return { root, memory, controller: new PixiBunController(page, memory) };
}
async function seed(controller: PixiBunController, zoom: number) {
  await controller.open(); await controller.singlePixelBrush(); await controller.color('#29233d'); await controller.stroke([{ x:0,y:0 }]);
  await controller.layer('Motif');
  // Asymmetric arrow and isolated highlights: both axes change this fixed fixture.
  await controller.stroke([{x:4,y:5},{x:6,y:5},{x:6,y:7}]);
  await controller.color('#f4effb'); await controller.stroke([{x:5,y:6}]);
  await controller.color('#ab76cf'); await controller.stroke([{x:4,y:8}]);
  await controller.stroke([{x:26,y:26}]); // Target-layer sentinel outside either qualified rectangle.
  await controller.addFrame(); await controller.frameDuration(180); await controller.stroke([{x:2,y:2}]); await controller.selectFrame(1);
  await controller.action('fixture-zoom', {zoom}, async()=>{
    await controller.page.getByRole('button',{name:/^Zoom \d+ percent\. Choose zoom level$/}).click();
    await controller.page.getByRole('group',{name:'Zoom levels',exact:true}).getByRole('button',{name:`${zoom}%`,exact:true}).click();
    await expect(controller.page.getByRole('button',{name:`Zoom ${zoom} percent. Choose zoom level`,exact:true})).toBeVisible();
  });
}
const rect = (v: typeof variants[number]) => ({x:3,y:4,width:v.width,height:v.height});
for (const v of variants) test(`Hands flips ${v.axis} asymmetric ${v.width}x${v.height} at ${v.zoom} percent with protected pixels, history and saved exports`, async({page},info)=>{
  const {root,memory,controller}=await setup(page,info.project.name,`flip-${v.axis}-${v.width}x${v.height}-${v.zoom}`);
  try {
    await seed(controller,v.zoom); const before=await observeHands(controller,memory);
    const adapter=process.env.NIBBLI_ARTIST_MODE==='conversation' ? new ConversationAdapter(path.join(root,'inbox')) : new MockFlipHandsAdapter(v.axis,rect(v));
    const result=await runHands(controller,memory,adapter,`Mirror the asymmetric motif ${v.axis} inside its ${v.width} by ${v.height} enclosing rectangle, preserving the outside purple sentinel, base layer and other frame. Inspect the actual motif and explain your selection and expected result.`);
    const after=readHandsProject(await controller.export('project')), target=after.frames[0].layers.find(l=>l.name==='Motif')!, source=before.project.frames[0].layers.find(l=>l.name==='Motif')!;
    const expected=structuredClone(source.raster.data), at=(x:number,y:number)=>(y*32+x)*4;
    // Fixed scalar test expectation, separate from the planner and production transform.
    for(let y=4;y<4+v.height;y++) for(let x=3;x<3+v.width;x++) {
      const fromX=v.axis==='horizontal'? 6+v.width-1-x:x, fromY=v.axis==='vertical'?8+v.height-1-y:y;
      expected.splice(at(x,y),4,...source.raster.data.slice(at(fromX,fromY),at(fromX,fromY)+4));
    }
    expect(target.raster.data).toEqual(expected); expect(target.raster.data).not.toEqual(source.raster.data);
    expect(after.frames[1]).toEqual(before.project.frames[1]); expect(after.frames[0].layers.find(l=>l.name!=='Motif')).toEqual(before.project.frames[0].layers.find(l=>l.name!=='Motif'));
    expect(result.functional).toMatchObject({verdict:'passed',edits:1,protectedContent:'passed',saveReloadAndExports:'passed'});
    expect(controller.runtimeErrors).toEqual([]); await memory.finish('passed',result);
  } catch(error) { await memory.finish('failed',{error:String(error),review:'Preserve asymmetric mirror, protection and history expectations; inspect retained preview and project evidence.'}); throw error; }
});

test('Hands cancels both real flip previews without changing artwork or the preceding Undo history',async({page},info)=>{
  const {memory,controller}=await setup(page,info.project.name,'flip-cancel-history');
  try {
    await seed(controller,800); const beforeLast=await observeHands(controller,memory), id=beforeLast.project.frames[0].layers.find(l=>l.name==='Motif')!.id;
    await controller.selectLayer(id); await controller.tool('pen'); await controller.stroke([{x:27,y:26}]);
    const before=await observeHands(controller,memory); await controller.selectLayer(id);
    for(const axis of ['horizontal','vertical'] as const) {
      await controller.flipSelection(rect(variants[0]),axis,'cancel');
      const after=await observeHands(controller,memory); expect(handsSignature(after.project)).toBe(handsSignature(before.project));
    }
    await controller.undo(); const undone=await observeHands(controller,memory); expect(handsSignature(undone.project)).toBe(handsSignature(beforeLast.project));
    await controller.redo(); const redone=await observeHands(controller,memory); expect(handsSignature(redone.project)).toBe(handsSignature(before.project));
    await controller.save(); await controller.reload(); expect(handsSignature(readHandsProject(await controller.export('project')))).toBe(handsSignature(before.project));
    expect(controller.runtimeErrors).toEqual([]); await memory.finish('passed',{functional:{verdict:'passed',bothAxesCancelled:true,previousHistoryPreserved:true},artistic:{verdict:'not-evaluated'}});
  } catch(error) {await memory.finish('failed',{error:String(error)});throw error;}
});

test('Hands refuses wrong-frame, clipping, stale, locked and late-invalid flips before changing any artwork',async({page},info)=>{
  const {memory,controller}=await setup(page,info.project.name,'flip-refusals');
  try {
    await seed(controller,800); const observation=await observeHands(controller,memory), layer=observation.project.frames[0].layers.find(l=>l.name==='Motif')!;
    const edit:HandsFlip={op:'flip-selection',axis:'horizontal',frameId:observation.project.frames[0].id,layerId:layer.id,rect:rect(variants[0]),reason:'Expected refusal fixture',expectedChange:'No artwork changes on invalid input',protectedLayerIds:observation.project.frames.flatMap(f=>f.layers.filter(l=>l.id!==layer.id).map(l=>l.id))};
    const plan={protocol:1,observationId:observation.id,edits:[edit]};
    await expect(executeHandsPlan(controller,memory,{...plan,edits:[{...edit,frameId:observation.project.frames[1].id}]},observation)).rejects.toThrow('unavailable');
    await expect(executeHandsPlan(controller,memory,{...plan,edits:[edit,{...edit,rect:{...edit.rect,x:30}}]},observation)).rejects.toThrow('outside');
    await expect(executeHandsPlan(controller,memory,{...plan,observationId:'stale'},observation)).rejects.toThrow('Stale');
    if(await page.getByRole('dialog').isVisible()) await page.keyboard.press('Escape');
    await expect(controller.flipSelection({...edit.rect,x:30},'horizontal')).rejects.toThrow('bounded');
    const fresh=await observeHands(controller,memory); expect(handsSignature(fresh.project)).toBe(handsSignature(observation.project));
    await controller.selectLayer(layer.id); await page.getByRole('button',{name:'Lock layer Motif',exact:true}).click();
    const locked=await observeHands(controller,memory); await expect(executeHandsPlan(controller,memory,{...plan,observationId:locked.id},locked)).rejects.toThrow('locked');
    await expect(controller.flipSelection(edit.rect,'horizontal')).rejects.toThrow('locked');
    const after=await observeHands(controller,memory); expect(handsSignature(after.project)).toBe(handsSignature(locked.project));
    expect((await NibbliMemory.readEvents(memory.directory)).filter(e=>e.kind==='hands-edit-intent')).toHaveLength(0);
    expect(controller.runtimeErrors).toEqual([]); await memory.finish('passed',{functional:{verdict:'passed',invalidInputChangedArtwork:false},artistic:{verdict:'not-evaluated'}});
  } catch(error) {await memory.finish('failed',{error:String(error)});throw error;}
});
