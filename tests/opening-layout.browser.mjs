import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

// Run against the locally served production build with npm run test:opening-layout.
test('hero text fits without nested scrolling, with clear actions through passage and reversal',async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const errors=[];
  try{
    for(const reducedMotion of ['no-preference','reduce']){
      const page=await browser.newPage({reducedMotion});
      page.on('pageerror',error=>errors.push(error.message));
      page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
      await page.goto(process.env.PORTFOLIO_URL||'http://127.0.0.1:5422/');
      await page.locator('.awakening-world.is-ready').waitFor();
      await page.evaluate(()=>document.fonts.ready);
      const cdp=await page.context().newCDPSession(page);
      const sizes=reducedMotion==='reduce'?[[390,568],[1280,360]]:
        [[1920,1080],[1440,900],[1366,768],[1280,720],[1024,768],[820,1180],[768,600],[390,844],[375,667],[375,568],[844,390],[1280,360],[320,480],[1366,768,1.25],[1280,720,1.25]];
      for(const [physicalWidth,physicalHeight,zoom=1]of sizes){
        // Native zoom changes CSS viewport dimensions and DPR; emulate that reflow contract.
        const width=Math.round(physicalWidth/zoom),height=Math.round(physicalHeight/zoom);
        await page.setViewportSize({width,height});
        await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:zoom,mobile:false});
        await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
        await page.waitForTimeout(160);
        const overflow=await page.locator('.opening-screen').evaluate(e=>Math.max(0,e.offsetHeight-innerHeight));
        if(overflow>0){
          await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),overflow);
          await page.waitForTimeout(160);
          assert(await page.locator('.awakening-footer').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1),'Document scroll reaches the complete progress footer');
        }
        const phases=reducedMotion==='reduce'?[0]:[0,.08,.2,.35,.48,.6,.76,.9,1,.9,.76,.6,.48,.35,.2,.08,0];
        for(const progress of phases){
          await page.evaluate(p=>{
            const shell=document.querySelector('.awakening-shell'),stage=shell.querySelector('.awakening-stage');
            window.scrollTo({top:shell.offsetTop+(shell.offsetHeight-stage.offsetHeight)*p,behavior:'instant'});
          },progress);
          await page.waitForTimeout(160);
          if(reducedMotion==='no-preference'&&progress===1)await page.locator('.inner-chamber[data-phase=arrived]').waitFor();
          if(reducedMotion==='no-preference'&&progress===0)await page.waitForFunction(()=>document.querySelector('.awakening-footer span')?.textContent==='The ashen void');
          const failures=await page.evaluate(()=>{
            const footer=document.querySelector('.awakening-footer'),copy=document.querySelector('.awakening-copy'),screen=document.querySelector('.opening-screen');
            const label=footer.querySelector(':scope > div').getBoundingClientRect(),problems=[];
            const overlaps=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top);
            for(const element of [copy,document.querySelector('.awakening-description')]){
              if(/auto|scroll/.test(getComputedStyle(element).overflowY))problems.push('Nested hero scroll container');
              if(element.scrollHeight>element.clientHeight+1)problems.push('Introductory text does not fit its container');
            }
            if(document.documentElement.scrollWidth>innerWidth)problems.push('Horizontal page overflow');
            if(document.querySelector('.awakening-stage').clientHeight<screen.offsetHeight)problems.push('Hero clipped by cinematic stage');
            if(getComputedStyle(copy).visibility==='hidden')return problems;
            if(overlaps(document.querySelector('.awakening-description').getBoundingClientRect(),label))problems.push('Introduction overlaps progress label');
            for(const action of document.querySelectorAll('.awakening-actions > *')){
              const b=action.getBoundingClientRect();
              if(overlaps(b,label))problems.push(`${action.textContent.trim()} overlaps chapter label`);
              if(b.top<0||b.bottom>innerHeight||b.left<0||b.right>innerWidth)problems.push('Opening action outside viewport');
              if(Number(getComputedStyle(screen).opacity)>.98){
                const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
                if(!action.contains(hit))problems.push('Opening action obstructed');
              }
            }
            return problems;
          });
          assert.deepEqual(failures,[],`${physicalWidth}x${physicalHeight} @${zoom*100}%, ${reducedMotion}, progress ${progress}`);
        }
      }
      await page.close();
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
