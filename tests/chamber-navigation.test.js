import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollToChamber, scrollChamberTargetIntoView } from '../src/chamberNavigation.js';

test('chamber anchors land at arrival, while preferences are brought into the viewport', t => {
  const old=Object.fromEntries(['window','document','scrollY','innerHeight'].map(k=>[k,globalThis[k]]));
  t.after(()=>{for(const [key,value] of Object.entries(old)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
  let position,flow=false,native=0;
  const target={getBoundingClientRect:()=>({bottom:950}),scrollIntoView(){native++;}};
  const shell={offsetHeight:4300,classList:{contains:()=>flow},getBoundingClientRect:()=>({top:0}),querySelector:selector=>selector==='.awakening-stage'?{offsetHeight:1000}:{getBoundingClientRect:()=>({top:0})}};
  globalThis.document={querySelector:()=>shell,getElementById:()=>target};
  globalThis.window={scrollTo:options=>position=options.top};globalThis.scrollY=0;globalThis.innerHeight=700;
  assert.equal(scrollToChamber('#explore','instant'),true);assert.equal(position,3300);
  assert.equal(scrollToChamber('#experience-preferences','instant'),true);assert.equal(position,3574);
  assert.equal(scrollToChamber('#unrelated'),false);
  flow=true;scrollToChamber('#explore','instant');assert.equal(native,1);
});

test('panel focus after native scrolling cannot rewind the gateway, while tall content can scroll beyond arrival',t=>{
  const old=Object.fromEntries(['window','scrollY','innerHeight'].map(k=>[k,globalThis[k]]));
  t.after(()=>{for(const[k,v]of Object.entries(old)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}});
  let position,flow=false,native=0;
  const stage={offsetHeight:1000,getBoundingClientRect:()=>({top:-50})};
  const shell={offsetHeight:4300,classList:{contains:()=>flow},getBoundingClientRect:()=>({top:-3350}),querySelector:()=>stage};
  const target={closest:()=>shell,getBoundingClientRect:()=>({top:-30,height:400}),scrollIntoView(){native++;}};
  globalThis.window={scrollTo:options=>position=options};globalThis.scrollY=3350;globalThis.innerHeight=700;
  scrollChamberTargetIntoView(target,{block:'center',behavior:'smooth'});
  assert.deepEqual(position,{top:3300,behavior:'smooth'});
  target.getBoundingClientRect=()=>({top:400,height:300});
  scrollChamberTargetIntoView(target,{block:'start',behavior:'smooth'});
  assert.equal(position.top,3726);
  flow=true;scrollChamberTargetIntoView(target,{block:'start',behavior:'instant'});assert.equal(native,1);
});
