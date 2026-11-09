import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollToChamber } from '../src/chamberNavigation.js';

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
