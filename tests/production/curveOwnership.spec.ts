import {expect,test,type Page} from '@playwright/test';
const pixels=(page:Page)=>page.getByTestId('main-composite-canvas').evaluate((c:HTMLCanvasElement)=>Array.from(c.getContext('2d')!.getImageData(0,0,c.width,c.height).data));
async function point(page:Page,x:number,y:number){const b=(await page.getByTestId('main-composite-canvas').boundingBox())!;return {x:b.x+(x+0.5)*b.width/32,y:b.y+(y+0.5)*b.height/32};}
async function curve(page:Page){await page.getByTestId('curve-tool').click();const a=await point(page,8,8),b=await point(page,22,8);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:3});await page.mouse.up();await expect(page.getByTestId('curve-adjustment-toolbar')).toBeVisible();}
async function frame(page:Page,n:number){await page.getByRole('button',{name:new RegExp(`^Select frame ${n}\\.`)}).click();}
test.beforeEach(async({page})=>{await page.setViewportSize({width:1600,height:1100});await page.goto('/studio');await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();await expect(page.getByTestId('main-composite-canvas')).toBeVisible();await page.getByTestId('pen-tool').click();const p=await point(page,2,2);await page.mouse.click(p.x,p.y);await expect.poll(async()=> (await pixels(page)).some((v,i)=>i%4===3&&v>0)).toBe(true);});
test('pending Curve cancels on frame switch and preserves both frames and previous Undo',async({page})=>{
 const original=await pixels(page);await page.getByTestId('add-frame-button').click();const blank=await pixels(page);await frame(page,1);await expect.poll(()=>pixels(page)).toEqual(original);await curve(page);await frame(page,2);
 await expect(page.getByTestId('curve-adjustment-toolbar')).toBeHidden();await expect.poll(()=>pixels(page)).toEqual(blank);await frame(page,1);await expect.poll(()=>pixels(page)).toEqual(original);
 await page.getByTestId('undo-button').click();await expect(page.getByRole('button',{name:/^Select frame 2\./})).toBeHidden();await expect.poll(()=>pixels(page)).toEqual(original);
});
test('pending Curve cancels on layer switch without publishing into either layer',async({page})=>{
 const original=await pixels(page);await page.getByTestId('tab-layers').click();await page.getByRole('button',{name:'Add New Layer',exact:true}).click();const newLayer=await page.getByRole('button',{name:/^Select layer /}).first().getAttribute('aria-label');await page.getByRole('button',{name:'Select layer Base Layer. Double click to rename',exact:true}).click();await curve(page);
 await page.getByTestId('tab-layers').click();await page.getByRole('button',{name:newLayer!,exact:true}).click();await expect(page.getByTestId('curve-adjustment-toolbar')).toBeHidden();await expect.poll(()=>pixels(page)).toEqual(original);
 await page.getByRole('button',{name:'Hide layer Base Layer',exact:true}).click();await expect.poll(async()=> (await pixels(page)).every((v,i)=>i%4!==3||v===0)).toBe(true);
});
test('locking a pending Curve refuses Apply and retains the preceding real Undo',async({page})=>{
 const original=await pixels(page);await curve(page);await page.getByTestId('tab-layers').click();await page.getByRole('button',{name:'Lock layer Base Layer',exact:true}).click();await page.locator('#main-content').focus();await page.keyboard.press('Enter');await expect(page.getByTestId('curve-adjustment-toolbar')).toBeHidden();await expect.poll(()=>pixels(page)).toEqual(original);
 await page.getByRole('button',{name:'Unlock layer Base Layer',exact:true}).click();await page.getByTestId('undo-button').click();await expect(page.getByRole('button',{name:'Unlock layer Base Layer',exact:true})).toBeVisible();
 await page.getByTestId('undo-button').click();await expect(page.getByRole('button',{name:'Lock layer Base Layer',exact:true})).toBeVisible();await page.getByTestId('undo-button').click();await expect.poll(async()=> (await pixels(page)).every((v,i)=>i%4!==3||v===0)).toBe(true);
});
test('stale Curve re-edit preserves the later opacity operation and its Undo',async({page})=>{
 await curve(page);await page.getByRole('button',{name:'Apply (Enter)',exact:true}).click();await expect(page.getByTestId('curve-reedit-toolbar')).toBeVisible();await page.getByTestId('tab-layers').click();const opacity=page.getByRole('slider',{name:'Layer opacity',exact:true});await expect(opacity).toHaveAttribute('step','5');await expect(opacity).toHaveValue('100');await opacity.focus();await opacity.press('ArrowLeft');await expect(opacity).toHaveValue('95');const original=await pixels(page);
 await page.getByRole('button',{name:/Re-edit Curve/}).click();await expect(page.getByTestId('curve-reedit-toolbar')).toBeHidden();await expect(opacity).toHaveValue('95');expect(await pixels(page)).toEqual(original);
 await page.getByTestId('undo-button').click();await expect(opacity).toHaveValue('100');
});
test('Curve Cancel button Enter and preview Ctrl+Z preserve earlier artwork',async({page})=>{
 const original=await pixels(page);await curve(page);await page.getByRole('button',{name:'Cancel (Esc)',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByTestId('curve-adjustment-toolbar')).toBeHidden();await expect.poll(()=>pixels(page)).toEqual(original);
 await curve(page);await page.locator('#main-content').focus();await page.keyboard.press('Control+z');await expect(page.getByTestId('curve-adjustment-toolbar')).toBeHidden();await expect.poll(()=>pixels(page)).toEqual(original);
 await page.getByTestId('undo-button').click();await expect.poll(async()=> (await pixels(page)).every((v,i)=>i%4!==3||v===0)).toBe(true);
});
test('immediate Curve re-edit remains reversible through Cancel and Redo',async({page})=>{
 await curve(page);await page.getByRole('button',{name:'Apply (Enter)',exact:true}).click();const original=await pixels(page);await page.getByRole('button',{name:/Re-edit Curve/}).click();await expect(page.getByTestId('curve-adjustment-toolbar')).toBeVisible();await page.getByRole('button',{name:'Cancel (Esc)',exact:true}).click();await expect(page.getByTestId('curve-adjustment-toolbar')).toBeHidden();await expect.poll(()=>pixels(page)).not.toEqual(original);
 await page.getByTestId('redo-button').click();await expect.poll(()=>pixels(page)).toEqual(original);
});
test('dragging a Curve endpoint outside the canvas clamps it to the edge',async({page})=>{
 await curve(page);const handle=(await page.getByTestId('curve-handle-end').boundingBox())!,canvas=(await page.getByTestId('main-composite-canvas').boundingBox())!;
 await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width+20,handle.y+handle.height/2,{steps:3});await page.mouse.up();
 const edge=await point(page,31,8);await expect.poll(async()=>{const b=(await page.getByTestId('curve-handle-end').boundingBox())!;return b.x+b.width/2;}).toBeCloseTo(edge.x,1);
 await expect.poll(async()=>{const b=(await page.getByTestId('curve-handle-end').boundingBox())!;return b.y+b.height/2;}).toBeCloseTo(edge.y,1);await page.getByRole('button',{name:'Cancel (Esc)',exact:true}).click();
});
