import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {PixiBunController} from '../../scripts/nibbli/controller';
import {NibbliMemory} from '../../scripts/nibbli/memory';
import {handsSignature,observeHands,readHandsProject} from '../../scripts/nibbli/artist/hands';
import {readCanvas,readNativePng,verifyRaster} from '../../scripts/nibbli/vision';

function metrics(data:number[]){
 const occupied=new Set<number>(),palette=new Set<string>();let partialAlpha=0;
 for(let i=0;i<data.length;i+=4)if(data[i+3]){occupied.add(i/4);palette.add(data.slice(i,i+4).join(','));if(data[i+3]!==255)partialAlpha++;}
 const unvisited=new Set(occupied);let components=0;
 while(unvisited.size){components++;const queue=[unvisited.values().next().value!];unvisited.delete(queue[0]);for(let i=0;i<queue.length;i++){const p=queue[i],x=p%32,y=Math.floor(p/32);for(const n of [x>0?p-1:-1,x<31?p+1:-1,y>0?p-32:-1,y<31?p+32:-1])if(unvisited.delete(n))queue.push(n);}}
 return {opaquePixels:occupied.size,partialAlpha,components,palette:[...palette].sort()};
}

// Trusted Explorer diagnostic only. Free angles are not accepted from Artist plans.
test('R3 records a real approximately 37 degree RotSprite turn with independent protection and silhouette evidence',async({page},info)=>{
 const root=process.env.NIBBLI_ARTIST_ROOT!,candidate=JSON.parse(await readFile(path.join(root,'candidate.json'),'utf8')),memory=await NibbliMemory.create(root,{...candidate,browser:info.project.name,role:'r3-diagnostic',journey:'free-angle-37'});
 await page.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true}));const controller=new PixiBunController(page,memory);
 try{
  await controller.open();await controller.singlePixelBrush();await controller.color('#29233d');await controller.stroke([{x:0,y:0}]);await controller.layer('Motif');await controller.stroke([{x:11,y:11},{x:14,y:11},{x:14,y:14}]);
  await controller.color('#f4effb');await controller.stroke([{x:12,y:12}]);await controller.color('#ab76cf');await controller.stroke([{x:11,y:15}]);await controller.stroke([{x:26,y:26}]);await controller.addFrame();await controller.frameDuration(180);await controller.stroke([{x:2,y:2}]);await controller.selectFrame(1);
  const before=await observeHands(controller,memory),layer=before.project.frames[0].layers.find(l=>l.name==='Motif')!;await controller.selectLayer(layer.id);
  let observedDegrees=0;
  await controller.action('trusted-free-angle-diagnostic',{requestedDegrees:37,maxPointerAngleErrorDegrees:0.5,source:{x:10,y:10,width:6,height:8},pivot:{x:13,y:14},notPlannerCapability:true},async()=>{
   await controller.tool('select-box');await page.getByTestId('tab-tools').click();await page.getByRole('combobox',{name:'Rotation algorithm',exact:true}).selectOption('rotsprite');
   const box=await page.getByTestId('main-composite-canvas').boundingBox();if(!box)throw new Error('Missing canvas');const sx=box.width/32,sy=box.height/32;
   await page.mouse.move(box.x+10.5*sx,box.y+10.5*sy);await page.mouse.down();try{await page.mouse.move(box.x+15.5*sx,box.y+17.5*sy,{steps:2});}finally{await page.mouse.up();}
   const gizmo=page.getByTestId('selection-transform-gizmo');await expect(gizmo).toBeVisible();
   // The bottom HUD covers the lower-right grip. Use the exposed upper-right zone,
   // retaining the same hit ownership assertion before any rotation gesture.
   const zone=await page.getByTestId('gizmo-rotate-tr').boundingBox(),pivot=await page.getByTestId('gizmo-pivot').boundingBox();if(!zone||!pivot)throw new Error('Missing rotation control');
   const grip={x:zone.x+zone.width/2,y:zone.y+zone.height/2},center={x:pivot.x+pivot.width/2,y:pivot.y+pivot.height/2};
   expect(await page.evaluate(p=>Boolean(document.elementFromPoint(p.x,p.y)?.closest('[data-testid="gizmo-rotate-tr"]')),grip)).toBe(true);
   const dx=grip.x-center.x,dy=grip.y-center.y,a=37*Math.PI/180,end={x:center.x+Math.cos(a)*dx-Math.sin(a)*dy,y:center.y+Math.sin(a)*dx+Math.cos(a)*dy};
   await page.mouse.move(grip.x,grip.y);await page.mouse.down();try{await page.mouse.move(end.x,end.y,{steps:3});}finally{await page.mouse.up();}
   const badge=page.getByTestId('gizmo-degree-badge');await expect(badge).toBeVisible();observedDegrees=Number((await badge.innerText()).replace('°',''));expect(Math.abs(observedDegrees-37)).toBeLessThanOrEqual(0.5);
   await memory.artifact('free-angle-preview-screen.png',await page.screenshot());const preview=await readCanvas(page);await memory.artifact('free-angle-preview-pixels.json',JSON.stringify(preview));
   await page.getByTestId('gizmo-commit-btn').click();await expect(gizmo).toBeHidden();await expect.poll(()=>readCanvas(page)).toEqual(preview);
  });
  const after=await observeHands(controller,memory),target=after.project.frames[0].layers.find(l=>l.id===layer.id)!;
  const radians=observedDegrees*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians),corners=[[10,10],[16,10],[10,18],[16,18]].map(([x,y])=>({x:13+c*(x-13)-s*(y-14),y:14+s*(x-13)+c*(y-14)}));
  // A conservative envelope includes one cell for badge/pointer quantization. It is not an exact-pixel rotation oracle.
  const bounds={left:Math.floor(Math.min(...corners.map(p=>p.x)))-1,right:Math.ceil(Math.max(...corners.map(p=>p.x)))+1,top:Math.floor(Math.min(...corners.map(p=>p.y)))-1,bottom:Math.ceil(Math.max(...corners.map(p=>p.y)))+1};
  expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.top).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeLessThanOrEqual(32);expect(bounds.bottom).toBeLessThanOrEqual(32);
  const expectedProtected=structuredClone(before.project),expectedLayer=expectedProtected.frames[0].layers.find(l=>l.id===layer.id)!;
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const inSource=x>=10&&x<16&&y>=10&&y<18,inDestination=x>=bounds.left&&x<bounds.right&&y>=bounds.top&&y<bounds.bottom;
   if(inSource||inDestination){const at=(y*32+x)*4;expectedLayer.raster.data.splice(at,4,...target.raster.data.slice(at,at+4));}}
  expect(handsSignature(after.project)).toBe(handsSignature(expectedProtected));expect(target.raster.data).not.toEqual(layer.raster.data);
  const prior=metrics(layer.raster.data),result=metrics(target.raster.data);expect(result.partialAlpha).toBe(0);expect(result.opaquePixels).toBeGreaterThan(1);expect(result.palette.every(v=>prior.palette.includes(v))).toBe(true);
  await memory.artifact('free-angle-assessment.json',JSON.stringify({requestedDegrees:37,observedDegrees,bounds,before:prior,after:result,functional:'Protected project, palette/alpha, preview/commit and saved files',artistic:'Recorded metrics and actual images only; no exact contour oracle or artistic approval',plannerCapability:false},null,2));
  await controller.undo();expect(handsSignature((await observeHands(controller,memory)).project)).toBe(handsSignature(before.project));await controller.redo();expect(handsSignature((await observeHands(controller,memory)).project)).toBe(handsSignature(after.project));
  await controller.save();await controller.reload();expect(handsSignature(readHandsProject(await controller.export('project')))).toBe(handsSignature(after.project));await verifyRaster(memory,'R3 PNG matches native committed canvas',readNativePng(await controller.export('png')),await readCanvas(page));
  expect(controller.runtimeErrors).toEqual([]);await memory.finish('passed',{functional:{verdict:'passed',protectedContent:true,previewCommitAgreement:true,historyAndSavedFiles:true},artistic:{verdict:'human-review-required',before:prior,after:result},diagnosticOnly:true});
 }catch(error){await memory.finish('failed',{error:String(error),review:'Retain observed angle, contour/palette metrics and original failure. Do not replace the quarter-turn oracle with this diagnostic envelope.'});throw error;}
});
