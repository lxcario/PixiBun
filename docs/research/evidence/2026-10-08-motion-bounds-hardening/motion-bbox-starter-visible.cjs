const { chromium } = require('playwright');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const observations=[];
 for(const width of [1920,1280]){
  const context=await browser.newContext({viewport:{width,height:width===1920?1080:720},colorScheme:'dark'});
  const page=await context.newPage();
  page.on('pageerror',error=>observations.push({width,error:String(error)}));
  await page.goto('http://127.0.0.1:3228/studio?template=hearth-ghost');
  await page.waitForFunction(()=>document.querySelector('[data-restoration-phase="active"]')&&document.querySelector('[data-testid="main-composite-canvas"]')?.width===16&&!new URL(location.href).searchParams.has('template'));
  for(const checkpoint of ['ready','settled']){
   if(checkpoint==='settled')await page.waitForTimeout(5000);
   observations.push(await page.evaluate(({width,checkpoint})=>{
    const c=document.querySelector('[data-testid="main-composite-canvas"]');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const rect=c.getBoundingClientRect();
    return {width,checkpoint,url:location.href,opaquePixels:Array.from(d).filter((v,i)=>i%4===3&&v>0).length,canvasStyle:{opacity:getComputedStyle(c).opacity,display:getComputedStyle(c).display,visibility:getComputedStyle(c).visibility,filter:getComputedStyle(c).filter,zIndex:getComputedStyle(c).zIndex},rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},canvases:[...document.querySelectorAll('#center-canvas-area canvas')].map(c=>({testId:c.dataset.testid,opacity:getComputedStyle(c).opacity,zIndex:getComputedStyle(c).zIndex,opaquePixels:Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).filter((v,i)=>i%4===3&&v>0).length}))};
   },{width,checkpoint}));
   await page.screenshot({path:`artifacts/motion-bbox-starter-visible-${width}-${checkpoint}.png`});
  }
  await context.close();
 }
 await browser.close();fs.writeFileSync('artifacts/motion-bbox-starter-visible-diagnostic.json',JSON.stringify(observations,null,2));console.log(JSON.stringify(observations));
})().catch(e=>{console.error(e);process.exitCode=1;});
