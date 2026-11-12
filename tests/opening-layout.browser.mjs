import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

// Run against the locally served production build with npm run test:opening-layout.
test('opening chapter labels stay clear of both actions through scroll and reversal',async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const errors=[];
  try{
    for(const reducedMotion of ['no-preference','reduce']){
      const page=await browser.newPage({reducedMotion});
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(process.env.PORTFOLIO_URL||'http://127.0.0.1:5422/');
      await page.locator('.awakening-world.is-ready').waitFor();
      await page.evaluate(()=>document.fonts.ready);
      const sizes=reducedMotion==='reduce'?[[390,568],[1280,360]]:
        [[1440,900],[1280,720],[1024,768],[820,1180],[768,600],[390,844],[390,667],[375,568],[844,390],[1280,360],[320,480]];
      for(const [width,height]of sizes){
        await page.setViewportSize({width,height});
        const phases=reducedMotion==='reduce'?[0]:[0,.08,.2,.35,.48,.6,.76,.9,1,.9,.76,.6,.48,.35,.2,.08,0];
        for(const progress of phases){
          await page.evaluate(p=>{
            const shell=document.querySelector('.awakening-shell'),stage=shell.querySelector('.awakening-stage');
            window.scrollTo({top:shell.offsetTop+(shell.offsetHeight-stage.offsetHeight)*p,behavior:'instant'});
          },progress);
          await page.waitForTimeout(160);
          const failures=await page.evaluate(()=>{
            const footer=document.querySelector('.awakening-footer'),copy=document.querySelector('.awakening-copy');
            const label=footer.querySelector(':scope > div').getBoundingClientRect(),problems=[];
            const overlaps=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top);
            if(getComputedStyle(copy).visibility==='hidden')return problems;
            for(const action of document.querySelectorAll('.awakening-actions > *')){
              const b=action.getBoundingClientRect();
              if(overlaps(b,label))problems.push(`${action.textContent.trim()} overlaps chapter label`);
              if(b.top<0||b.bottom>innerHeight||b.left<0||b.right>innerWidth)problems.push('Opening action outside viewport');
              const screen=document.querySelector('.opening-screen');
              if(Number(getComputedStyle(screen).opacity)>.98){
                const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
                if(!action.contains(hit))problems.push('Opening action obstructed');
              }
            }
            return problems;
          });
          assert.deepEqual(failures,[],`${width}x${height}, ${reducedMotion}, progress ${progress}`);
        }
      }
      await page.close();
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
