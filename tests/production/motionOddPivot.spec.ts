import { expect, test, type Page } from '@playwright/test';
import { chooseTool } from '../helpers/tools';
const pixels=(page:Page,id='main-composite-canvas')=>page.getByTestId(id).evaluate((c:HTMLCanvasElement)=>Array.from(c.getContext('2d')!.getImageData(0,0,c.width,c.height).data));
async function numeric(page:Page,label:string,value:string){const field=page.getByRole('spinbutton',{name:label,exact:true});await field.fill(value);await field.press('Enter');await expect(field).toHaveValue(value);}
test('odd-sized centered motion preserves a square on a quarter turn and Center Pivot restores that center',async({page})=>{
  await page.setViewportSize({width:1600,height:1100});await page.goto('/studio');await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const canvas=page.getByTestId('main-composite-canvas');await expect.poll(()=>canvas.evaluate((c:HTMLCanvasElement)=>c.width)).toBe(32);
  const box=(await canvas.boundingBox())!,point=(x:number,y:number)=>({x:box.x+box.width*x/32,y:box.y+box.height*y/32});
  for(const row of [4,5,6]){const start=point(4.25,row+0.25),end=point(6.25,row+0.25);await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:3});await page.mouse.up();}
  await expect.poll(async()=> (await pixels(page)).filter((v,i)=>i%4===3&&v>0).length).toBe(9);const original=await pixels(page);
  await chooseTool(page, 'select-box');const start=point(4.25,4.25),end=point(6.75,6.75);await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:3});await page.mouse.up();
  await page.getByTestId('tab-tools').click();await page.getByTestId('create-motion-part-btn').click();await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  await numeric(page,'Rotation degrees','90');await expect(page.getByTestId('piximotion-preview-canvas')).toHaveAttribute('aria-busy','false');
  await expect.poll(()=>pixels(page,'piximotion-preview-canvas')).toEqual(original);
  await expect(page.getByRole('spinbutton',{name:'Pivot X pixels',exact:true})).toHaveValue('5.5');await expect(page.getByRole('spinbutton',{name:'Pivot Y pixels',exact:true})).toHaveValue('5.5');
  await numeric(page,'Pivot X pixels','0');await page.getByRole('button',{name:'Center Pivot',exact:true}).click();
  await expect(page.getByRole('spinbutton',{name:'Pivot X pixels',exact:true})).toHaveValue('5.5');await expect.poll(()=>pixels(page,'piximotion-preview-canvas')).toEqual(original);
  await numeric(page,'Motion frames','3');await page.getByRole('button',{name:'BAKE TO TIMELINE',exact:true}).click();await expect(page.getByTestId('piximotion-panel')).toBeHidden();await expect.poll(()=>pixels(page)).toEqual(original);
  await page.getByTestId('undo-button').click();await expect(page.getByRole('button',{name:/^Select frame \d+\./})).toHaveCount(1);await expect.poll(()=>pixels(page)).toEqual(original);
  await page.getByTestId('redo-button').click();await page.getByRole('button',{name:/Select frame 3\./}).click();await expect.poll(()=>pixels(page)).toEqual(original);
});
