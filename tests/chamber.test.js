import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleChamber } from '../src/playcanvas/chamberTimeline.js';
import { sampleOpening } from '../src/playcanvas/openingTimeline.js';

test('chamber emerges during camera passage, without an empty interval', () => {
  assert.equal(sampleChamber(.7).reveal,0);
  assert(sampleChamber(.85).reveal>0);
  assert.equal(sampleOpening(.85).phase,'passage');
  assert(sampleChamber(.94).reveal>.8);
  for(let i=0;i<=1000;i++) {
    const s=sampleChamber(i/1000);
    assert(s.reveal>=0&&s.reveal<=1);
    assert(s.openingOpacity+s.reveal>=1-1e-12);
    assert(s.depth>=0&&s.depth<=1);
    if(i)assert(s.reveal>=sampleChamber((i-1)/1000).reveal);
  }
});
test('chamber sampling restores exact endpoints and reverses without retained state', () => {
  const forward=Array.from({length:101},(_,i)=>sampleChamber(i/100));
  for(let i=100;i>=0;i--)assert.deepEqual(sampleChamber(i/100),forward[i]);
  assert.deepEqual(sampleChamber(-1),sampleChamber(0));
  assert.deepEqual(sampleChamber(NaN),sampleChamber(0));
  assert.deepEqual(sampleChamber(2),sampleChamber(1));
  assert.equal(sampleChamber(1).depth,0);
  assert.equal(sampleChamber(1).openingOpacity,0);
  assert.equal(sampleChamber(1).interactive,true);
  assert.equal(sampleChamber(.9).interactive,false);
});
test('reduced motion and unavailable opening expose the settled chamber immediately', () => {
  for(const p of [0,.4,.8,1])assert.deepEqual(sampleChamber(p,true),sampleChamber(1));
});
