const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const origin = process.env.PIXIBUN_PROFILE_ORIGIN || 'http://localhost:3228';
const output = process.env.PIXIBUN_PROFILE_OUTPUT || 'artifacts/pixibun-performance-before.json';
(async () => {
 const browser = await chromium.launch(); const results = { recordedAt: new Date().toISOString(), origin, browser: browser.version(), cpuModel:os.cpus()[0]?.model,logicalCpus:os.cpus().length,physicalMemoryBytes:os.totalmem(),headless:true,viewport:{width:1600,height:1100},repeats:Number(process.env.PIXIBUN_PROFILE_REPEATS||1), scenarios: [] };
 try {
  for (const size of Array.from({length:results.repeats},()=>[64,128,256]).flat()) {
   const context = await browser.newContext({viewport:{width:1600,height:1100}}); const page = await context.newPage();
   await page.addInitScript(() => { window.__longTasks=[]; new PerformanceObserver(list => { for(const e of list.getEntries()) window.__longTasks.push({start:e.startTime,duration:e.duration}); }).observe({type:'longtask', buffered:true}); Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true}); });
   await page.goto(origin+'/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
   const project = await page.evaluate(size => {
    const c=document.createElement('canvas'); c.width=size;c.height=size;const ctx=c.getContext('2d');
    ctx.fillStyle='#182032';ctx.fillRect(size*.25,size*.25,size*.5,size*.5);ctx.fillStyle='#eecc44';ctx.fillRect(size*.3,size*.3,size*.1,size*.1);
    const pngBase64=c.toDataURL().split(',')[1];
    return {format:'pixibun-project',version:3,name:'Performance '+size,width:size,height:size,fps:8,loopMode:'repeat',onionSkin:{enabled:false,prevFrames:1,nextFrames:1,prevColor:'#c792df',nextColor:'#dcabdf',opacity:.45},palettes:[{id:'p',name:'Fixture',colors:['#182032','#eecc44']}],currentPaletteId:'p',customRamps:[],clips:[],frames:[0,1,2,3].map(i=>({id:'f'+i,durationMs:125,layers:[{id:'l'+i,name:'Body',visible:true,locked:false,opacity:1,blendMode:'source-over',pngBase64}]})),createdAt:1,updatedAt:1};
   },size);
   await page.locator('input[type=file]').first().setInputFiles({name:'profile.pixibun',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
   const dialog=page.getByRole('dialog',{name:'Import Project (.pixibun)'}); await dialog.getByRole('button',{name:'Confirm Import'}).click();await expect(dialog).toBeHidden();
   await page.getByRole('button',{name:'Fit Canvas to Viewport (Ctrl+0)',exact:true}).click();
   const measures=[];
   async function measure(name,action){await page.waitForTimeout(200);const start=await page.evaluate(()=>performance.now());const t=Date.now();await action();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const end=await page.evaluate(()=>performance.now());measures.push({name,elapsedMs:Date.now()-t,browserSpanMs:end-start,longTasks:await page.evaluate(({start,end})=>window.__longTasks.filter(e=>e.start>=start&&e.start<=end),{start,end})});}
   await measure('drawing',async()=>{const b=await page.getByTestId('main-composite-canvas').boundingBox();await page.mouse.move(b.x+b.width*.1,b.y+b.height*.1);await page.mouse.down();await page.mouse.move(b.x+b.width*.18,b.y+b.height*.15,{steps:20});await page.mouse.up();});
   await measure('timeline',async()=>{for(const n of [2,3,4,1]) await page.getByRole('button',{name:new RegExp('Select frame '+n+'\\.')}).click();});
   await measure('save',async()=>{await page.getByTestId('save-button').click();await expect(page.getByRole('status').filter({hasText:/^Changes saved$/})).toBeVisible();});
   await page.getByTestId('select-box-tool').click(); const cb=await page.getByTestId('main-composite-canvas').boundingBox();await page.mouse.move(cb.x+cb.width*.2,cb.y+cb.height*.2);await page.mouse.down();await page.mouse.move(cb.x+cb.width*.8,cb.y+cb.height*.8,{steps:4});await page.mouse.up();await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click(); await expect(page.getByTestId('piximotion-panel')).toBeVisible();
   await measure('rotation-preview',async()=>{for(const value of ['15','30','45','60','75']) {const field=page.getByRole('spinbutton',{name:'Rotation degrees',exact:true});await field.fill(value);await field.press('Enter');}const preview=page.getByTestId('piximotion-preview-canvas');if(await preview.getAttribute('aria-busy')!==null)await expect(preview).toHaveAttribute('aria-busy','false');});
   await measure('motion-playback-2s',async()=>{await page.getByRole('button',{name:'Play Loop',exact:true}).click();await page.waitForTimeout(2000);await page.getByRole('button',{name:'Pause',exact:true}).click();});
   const bakeFrames=Number(await page.getByRole('spinbutton',{name:'Motion frames',exact:true}).inputValue());
   await measure('bake-'+bakeFrames+'-frames',async()=>{await page.getByRole('button',{name:'BAKE TO TIMELINE',exact:true}).click();await expect(page.getByTestId('piximotion-panel')).toBeHidden();});
   await measure('project-export',async()=>{await page.getByTestId('export-button').click();await page.getByTestId('export-tab-project').click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download project backup',exact:true}).click();const download=await pending;await download.saveAs('artifacts/motion-bbox-profile-'+size+'.pixibun');});
   results.scenarios.push({canvasSize:size,initialFrames:4,layersPerFrame:1,bakeFrames,measures}); fs.writeFileSync(output,JSON.stringify(results,null,2));await context.close();console.log('Recorded '+size);
  }
 } catch(error) {results.failure=error.message;fs.writeFileSync(output,JSON.stringify(results,null,2));console.error(error.message);process.exitCode=1;} finally {await browser.close();}
})();
