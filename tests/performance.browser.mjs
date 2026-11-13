import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

test('production loading defers the offscreen graph and static scenes wake correctly for input',async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const root=process.env.PORTFOLIO_URL||'http://127.0.0.1:5424',errors=[];
 try{
  for(const device of [{viewport:{width:1440,height:900}},{viewport:{width:375,height:667},isMobile:true,hasTouch:true,reducedMotion:'reduce'}]){
   const page=await browser.newPage(device);page.setDefaultTimeout(45000);
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    window.__sceneDraws=new WeakMap();const get=HTMLCanvasElement.prototype.getContext,seen=new WeakSet();
    HTMLCanvasElement.prototype.getContext=function(...args){const gl=get.apply(this,args);if(gl&&args[0].startsWith('webgl')&&!seen.has(gl)){seen.add(gl);const canvas=this;
     for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){const original=gl[name].bind(gl);gl[name]=(...values)=>{__sceneDraws.set(canvas,(__sceneDraws.get(canvas)||0)+1);return original(...values);};}}
     return gl;
    };
   });
   await page.goto(root);await page.locator('.awakening-world.is-ready').waitFor();await page.waitForTimeout(300);
   assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(e=>/SkillGraph.*\.js/.test(e.name))),false);
   assert.equal(await page.locator('.skill-map canvas').count(),0);
   await page.locator('.awakening-actions button').click();await page.waitForTimeout(1800);
   for(let i=0;i<2;i++){await page.keyboard.press('PageDown');await page.waitForTimeout(1100);}
   for(let i=0;i<3;i++)await page.keyboard.press('ArrowDown');
   await page.locator('.inner-chamber[data-phase=arrived] .hub-stage.is-ready').waitFor();
   for(const [id,index,title]of [['projects',2,'Startup Street XI'],['achievements',7,'Yantra Central Hackathon 2026'],['contact',8,null]]){
    const button=page.locator(`.hub-controls > div:nth-child(${index}) button`);
    if(await button.count()){await button.click();await page.waitForTimeout(1200);await page.locator('.hub-open').press('Enter');}
    else await page.locator(`.hub-controls a[data-destination=${id}]`).click();
    await page.locator('.space-shell[data-phase=active]').waitFor();
    if(title){await page.locator('.space-access-control[data-index="0"]').press('Enter');await page.waitForFunction(t=>document.querySelector('#space-detail-title')?.textContent.startsWith(t),title);}
    await page.waitForTimeout(4500);
    const canvas=page.locator('.space-visual canvas'),before=await canvas.evaluate(e=>__sceneDraws.get(e)||0);
    await page.waitForTimeout(500);assert.equal(await canvas.evaluate(e=>__sceneDraws.get(e)||0),before,`${id} is static once settled`);
    if(id==='contact'){
     assert(await page.locator('.space-detail a[href^="mailto:"]').isVisible());
     await page.locator('.space-back').press('a');await page.waitForTimeout(250);
     assert((await canvas.evaluate(e=>__sceneDraws.get(e)||0))>before,'assembly wakes rendering');
     assert(await page.locator('.space-detail a[href^="mailto:"]').isVisible());await page.locator('.space-back').press('r');
    }else{
     await page.locator('.space-access-control[data-index="1"]').press('Enter');
     await page.waitForTimeout(300);assert((await canvas.evaluate(e=>__sceneDraws.get(e)||0))>before,'selection wakes rendering');
     await page.locator('.space-back').press('Escape');
    }
    await page.locator('.space-back').click();await page.locator('.space-shell').waitFor({state:'detached'});
   }
   if(!device.isMobile){await page.locator('#skills').scrollIntoViewIfNeeded();await page.locator('.skill-map canvas').waitFor();assert(await page.evaluate(()=>performance.getEntriesByType('resource').some(e=>/SkillGraph.*\.js/.test(e.name))));}
   await page.close();
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
