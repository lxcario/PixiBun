import {describe,expect,it} from 'vitest';
import {handsSignature,handsRotationBounds,predictHandsRotation,validateHandsPlan,type HandsRotation,type HandsObservation} from '../scripts/nibbli/artist/hands';
function fixture(){
 const raster={width:32,height:32,data:Array<number>(4096).fill(0)};
 for(const [x,y,r,g,b] of [[11,11,11,22,33],[14,12,99,88,77],[12,15,171,118,207],[26,26,12,34,56]])raster.data.splice((y*32+x)*4,4,r,g,b,255);
 const layer=(id:string)=>({id,name:id,locked:false,visible:true,metadata:{opacity:1,blendMode:'source-over'},raster:structuredClone(raster)});
 const observation:HandsObservation={id:'rotation-observed',screenshotBase64:'fixture',composite:structuredClone(raster),project:{metadata:{width:32,height:32},frames:[{id:'f1',metadata:{durationMs:125},layers:[layer('target'),layer('base')]},{id:'f2',metadata:{durationMs:180},layers:[layer('other')]}]}};
 const edit:HandsRotation={op:'rotate-selection',degrees:90,rect:{x:10,y:10,width:6,height:8},pivot:{x:13,y:14},frameId:'f1',layerId:'target',reason:'Turn the asymmetric observed motif around its explicit pivot.',expectedChange:'Exact quarter-turn pixels and bounds, preserving all other content.',protectedLayerIds:['base','other']};
 return {observation,edit,raw:{protocol:1,observationId:observation.id,edits:[edit]}};
}
const poses=[
 {degrees:90,pivot:{x:13,y:14},points:[[15,12],[14,15],[11,13]],bounds:{x:9,y:11,width:8,height:6}},
 {degrees:180,pivot:{x:13,y:14},points:[[14,16],[11,15],[13,12]],bounds:{x:10,y:10,width:6,height:8}},
 {degrees:270,pivot:{x:13,y:14},points:[[10,15],[11,12],[14,14]],bounds:{x:9,y:11,width:8,height:6}},
 {degrees:90,pivot:{x:10,y:10},points:[[8,11],[7,14],[4,12]],bounds:{x:2,y:10,width:8,height:6}},
 {degrees:270,pivot:{x:16,y:10},points:[[17,14],[18,11],[21,13]],bounds:{x:16,y:10,width:8,height:6}},
] as const;
describe('Independent Hands quarter-turn expectations',()=>{
 it.each(poses)('maps $degrees degrees at pivot $pivot to fixed golden pixels and bounds',pose=>{
  const {edit,observation,raw}=fixture();edit.degrees=pose.degrees;edit.pivot={...pose.pivot};const original=structuredClone(observation);
  const after=validateHandsPlan(raw,observation).checkpoints[0],actual=after.frames[0].layers[0].raster,at=(x:number,y:number)=>(y*32+x)*4;
  pose.points.forEach(([x,y],i)=>expect(actual.data.slice(at(x,y),at(x,y)+4)).toEqual([[11,22,33,255],[99,88,77,255],[171,118,207,255]][i]));
  expect(handsRotationBounds(edit)).toMatchObject(pose.bounds);expect(actual.data.filter((_,i)=>i%4===3&&actual.data[i]===255)).toHaveLength(4);
  expect(actual.data.slice(at(26,26),at(26,26)+4)).toEqual([12,34,56,255]);expect(after.frames[0].layers[1]).toEqual(original.project.frames[0].layers[1]);expect(after.frames[1]).toEqual(original.project.frames[1]);expect(after.metadata).toEqual(original.project.metadata);expect(after.frames[0].metadata).toEqual(original.project.frames[0].metadata);expect(observation).toEqual(original);
 });
 it('admits an odd rectangle around a half-pixel center and a mixed-parity rectangle for a half-turn',()=>{
  const {edit,observation}=fixture();edit.rect={x:10,y:10,width:5,height:7};edit.pivot={x:12.5,y:13.5};
  const after=predictHandsRotation(observation.project.frames[0].layers[0].raster,edit),at=(12*32+14)*4;expect(after.data.slice(at,at+4)).toEqual([11,22,33,255]);
  edit.rect.height=8;edit.pivot.y=14;expect(()=>predictHandsRotation(observation.project.frames[0].layers[0].raster,edit)).toThrow('grid');edit.degrees=180;expect(()=>predictHandsRotation(observation.project.frames[0].layers[0].raster,edit)).not.toThrow();
 });
 it.each(['free-angle','zero','fractional-pivot','pivot-outside','parity','clipping','occupied','hidden-destination-rgb','partial-alpha','hidden-source-rgb','empty','symmetric','wrong-frame','locked','hidden','recipe','normal','normal-map','protection','stale','extra-field','late-invalid'] as const)('refuses %s without changing the observed project',kind=>{
  const {edit,observation,raw}=fixture(),layer=observation.project.frames[0].layers[0],data=layer.raster.data;
  if(kind==='free-angle')Object.assign(edit,{degrees:37});if(kind==='zero')Object.assign(edit,{degrees:0});
  if(kind==='fractional-pivot')edit.pivot.x=13.25;if(kind==='pivot-outside')edit.pivot.x=-1;if(kind==='parity')edit.pivot.x=13.5;if(kind==='clipping')edit.pivot={x:0,y:0};
  if(kind==='occupied')data.splice((12*32+16)*4,4,1,2,3,255);if(kind==='hidden-destination-rgb')data[(12*32+16)*4]=1;
  if(kind==='partial-alpha')data[(11*32+11)*4+3]=128;if(kind==='hidden-source-rgb')data[(10*32+10)*4]=1;if(kind==='empty')data.fill(0);
  if(kind==='symmetric'){data.fill(0);for(const [x,y]of [[12,13],[13,13],[12,14],[13,14]])data.splice((y*32+x)*4,4,1,2,3,255);}
  if(kind==='wrong-frame')edit.frameId='f2';if(kind==='locked')layer.locked=true;if(kind==='hidden')layer.visible=false;if(kind==='recipe')Object.assign(layer.metadata,{effect:{}});
  if(kind==='normal'||kind==='normal-map')Object.assign(layer.metadata,{tag:kind});
  if(kind==='protection')edit.protectedLayerIds=[];if(kind==='stale')raw.observationId='stale';if(kind==='extra-field')Object.assign(edit,{delta:{x:0,y:0}});if(kind==='late-invalid')raw.edits.push({...edit,pivot:{x:0,y:0}});
  const before=handsSignature(observation.project);expect(()=>validateHandsPlan(raw,observation)).toThrow();expect(handsSignature(observation.project)).toBe(before);
 });
 it('retains the unchanged per-plan cost cap for three versus four rotation edits',()=>{
  const {edit,observation,raw}=fixture();expect(validateHandsPlan({...raw,edits:[edit,edit,edit]},observation).checkpoints).toHaveLength(3);
  expect(()=>validateHandsPlan({...raw,edits:[edit,edit,edit,edit]},observation)).toThrow('per-plan');
 });
});
