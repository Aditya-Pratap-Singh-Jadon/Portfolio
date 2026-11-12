import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ForgeMotion} from '../src/playcanvas/approved/mi-forge-motion.mjs';
import {NeuralMotion} from '../src/playcanvas/approved/mi-neural-motion.mjs';
import {AccentSelection} from '../src/playcanvas/approved/mi-accents-motion.mjs';
import {SectionNavigation} from '../src/sectionNavigation.js';
import * as presentation from '../src/playcanvas/selectionPresentation.js';
import * as neural from '../src/playcanvas/neuralController.js';

test('details wait for actual foreground/focus, including interrupted Forge and Chronicle selections',()=>{
  assert.equal(typeof presentation.selectionReady,'function');
  const forge=new ForgeMotion();forge.select(0);assert.equal(presentation.selectionReady('forge',forge),false);
  for(let i=0;i<200;i++)forge.update(.02);assert.equal(presentation.selectionReady('forge',forge),true);
  forge.select(1);assert.equal(presentation.selectionReady('forge',forge),false);
  forge.select(2);for(let i=0;i<400;i++)forge.update(.02);assert.equal(forge.active,2);assert.equal(presentation.selectionReady('forge',forge),true);
  const rig=JSON.parse(readFileSync(new URL('../public/playcanvas/mi04/assets/MI_NEURAL_RIG.json',import.meta.url)));
  for(const[kind,m]of[['neural',new NeuralMotion(rig.routes)],['chronicle',new AccentSelection(5,true)],['vault',new AccentSelection(4)]]){
    m.select(0);assert.equal(presentation.selectionReady(kind,m),false);m.update(.08);if(kind==='chronicle')assert.equal(presentation.selectionReady(kind,m),false);
    for(let i=0;i<200;i++)m.update(.02);assert.equal(presentation.selectionReady(kind,m),true);
    m.setReduced(true);m.select(1);assert.equal(presentation.selectionReady(kind,m),true);m.reset();assert.equal(presentation.selectionReady(kind,m),true);
  }
});

test('small touch targets choose the nearest visible Neural node within 22 CSS pixels',()=>{
  assert.equal(typeof neural.nearestTouchNode,'function');
  const nodes=[{x:20,y:30},{x:50,y:30},null];
  assert.equal(neural.nearestTouchNode(21,51,nodes),0);
  assert.equal(neural.nearestTouchNode(43,30,nodes),1);
  assert.equal(neural.nearestTouchNode(20,53,nodes),null);
  assert.equal(neural.nearestTouchNode(100,100,nodes),null);
});

test('return requests are consumed once without advancing history multiple times',()=>{
  const nav=new SectionNavigation();assert.equal(nav.back(),false);nav.setChamber(true);const t=nav.enter('projects');
  nav.ready(t);nav.update(.1);assert.equal(nav.back(),true);assert.equal(nav.back(),false);
  nav.enter('skills');assert.equal(nav.back(),true);assert.equal(nav.back(),false);
});

test('return from a failed scene clears the error pause so the view can finish exiting',()=>{
  const nav=new SectionNavigation();nav.setChamber(true);const t=nav.enter('skills');nav.fail(t);
  assert.equal(nav.state.error,true);assert.equal(nav.back(),true);assert.equal(nav.state.error,false);
  nav.update(0);assert.equal(nav.state.destination,null);assert.equal(nav.state.phase,'command-center');
});
