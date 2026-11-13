import test from 'node:test';
import assert from 'node:assert/strict';
import {sectionNeedsFrame} from '../src/playcanvas/sectionRenderPolicy.js';
import {ForgeMotion} from '../src/playcanvas/approved/mi-forge-motion.mjs';
import {AccentSelection,NexusMotion} from '../src/playcanvas/approved/mi-accents-motion.mjs';

test('static scenes stop only after approved motion and heat settle; dynamic pulses keep running',()=>{
 const forge={motion:new ForgeMotion(),slots:[{heat:.12}],hover:null,keyboardFocus:null};
 assert.equal(sectionNeedsFrame('forge',forge),false);forge.hover=0;assert.equal(sectionNeedsFrame('forge',forge),true);
 forge.slots[0].heat=.5;assert.equal(sectionNeedsFrame('forge',forge),false);
 forge.motion.select(0);assert.equal(sectionNeedsFrame('forge',forge),true);
 for(let i=0;i<1000;i++)forge.motion.update(.02);
 assert.equal(sectionNeedsFrame('forge',forge),true);forge.slots[0].heat=1.15;assert.equal(sectionNeedsFrame('forge',forge),false);
 const vault={motion:new AccentSelection(4)};assert.equal(sectionNeedsFrame('vault',vault),false);
 vault.motion.select(3);assert.equal(sectionNeedsFrame('vault',vault),true);
 for(let i=0;i<1000;i++)vault.motion.update(.02);assert.equal(sectionNeedsFrame('vault',vault),false);
 const nexus={motion:new NexusMotion()};assert.equal(sectionNeedsFrame('nexus',nexus),false);
 nexus.motion.assemble();assert.equal(sectionNeedsFrame('nexus',nexus),true);
 nexus.motion.pause(true);assert.equal(sectionNeedsFrame('nexus',nexus),false);nexus.motion.pause(false);
 for(let i=0;i<2000;i++)nexus.motion.update(.02);assert.equal(nexus.motion.state,'assembled');assert.equal(sectionNeedsFrame('nexus',nexus),false);
 nexus.motion.separate();assert.equal(sectionNeedsFrame('nexus',nexus),true);
 const chronicle={motion:new AccentSelection(5,true)};assert.equal(sectionNeedsFrame('chronicle',chronicle),true);
 chronicle.motion.reset();assert.equal(sectionNeedsFrame('chronicle',chronicle),false);
 chronicle.motion.select(1);assert.equal(sectionNeedsFrame('chronicle',chronicle),true);
 assert.equal(sectionNeedsFrame('neural',{motion:{reduced:false,settled:true}}),true);
 assert.equal(sectionNeedsFrame('neural',{motion:{reduced:true,settled:true}}),false);
});
