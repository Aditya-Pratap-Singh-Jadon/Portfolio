import test from 'node:test';
import assert from 'node:assert/strict';
import { SectionNavigation, destinations } from '../src/sectionNavigation.js';

const settle = nav => { for(let i=0;i<100;i++)nav.update(.05); };

test('section entry waits for its own load and returns without restarting the gateway',()=>{
  const nav=new SectionNavigation();
  assert.equal(nav.state.phase,'gateway');nav.setChamber(true);
  const token=nav.enter('projects');settle(nav);
  assert.equal(nav.state.phase,'entering');assert.equal(nav.state.progress,0);
  assert.equal(nav.enter('projects'),token);
  nav.ready(token);settle(nav);
  assert.equal(nav.state.phase,'active');assert.equal(nav.state.progress,1);
  nav.back();nav.update(.1);assert.equal(nav.fail(token),false);assert.equal(nav.state.phase,'returning');settle(nav);
  assert.equal(nav.state.phase,'command-center');assert.equal(nav.state.destination,null);
});

test('interrupted requests reject stale completions and permit repeated return/entry',()=>{
  const nav=new SectionNavigation();nav.setChamber(true);
  const old=nav.enter('projects');nav.ready(old);nav.update(.2);
  nav.enter('skills');settle(nav);
  assert.equal(nav.state.destination,'skills');assert.equal(nav.state.progress,0);
  assert.equal(nav.ready(old),false);
  nav.ready(nav.state.token);settle(nav);nav.back();nav.update(.1);
  const token=nav.enter('skills');nav.ready(token);settle(nav);
  assert.equal(nav.state.phase,'active');
  nav.back();nav.back();settle(nav);assert.equal(nav.state.destination,null);
});

test('loading failure, cancellation and reduced motion retain back navigation',()=>{
  const nav=new SectionNavigation();nav.setChamber(true);
  const token=nav.enter('skills');nav.fail(token);
  assert.equal(nav.state.error,true);assert.equal(nav.state.progress,0);
  const retry=nav.retry();assert.notEqual(retry,token);assert.equal(nav.ready(token),false);assert.equal(nav.state.error,false);
  nav.back();nav.update(0);assert.equal(nav.state.destination,null);
  assert.equal(nav.ready(token),false);
  nav.setReduced(true);const next=nav.enter('projects');nav.ready(next);nav.update(0);
  assert.equal(nav.state.phase,'active');nav.back();nav.update(0);
  assert.equal(nav.state.phase,'command-center');
  assert.throws(()=>nav.enter('unknown'),RangeError);assert.throws(()=>nav.update(NaN),RangeError);
  assert.deepEqual(Object.keys(destinations),['about','projects','experience','skills','github','linkedin','achievements','contact']);
  assert.equal(destinations.projects.scene,'MI_03_PROJECT_FORGE');
  assert.equal(destinations.skills.scene,'MI_04_NEURAL_CORE');
});
