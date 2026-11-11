import test from 'node:test';
import assert from 'node:assert/strict';
import * as labels from '../src/playcanvas/forgeLabels.js';

test('Forge atlas paints mapped project names and honest unassigned labels within six tiles',()=>{
  assert.equal(typeof labels.paintForgeLabels,'function');
  const draws=[];
  const context={clearRect(){},measureText:text=>({width:text.length*34}),fillText(text,x,y,maxWidth){draws.push({text,x,y,maxWidth});}};
  labels.paintForgeLabels(context,['Startup Street XI','StackVision','CUBEX','No published entry','No published entry','No published entry']);
  assert.deepEqual(draws.map(d=>d.text),['Startup','Street XI','StackVision','CUBEX','Unassigned','Unassigned','Unassigned']);
  for(const draw of draws){assert(draw.x===256||draw.x===768);assert(draw.y>0&&draw.y<768);assert(draw.maxWidth<=440);}
});

test('Forge label UV transforms use the existing planar surface coordinates without altering mesh positions',()=>{
  assert.equal(typeof labels.forgeLabelUV,'function');
  const bounds={center:{x:.2,y:-.1},halfExtents:{x:1.5,y:.8}},before=JSON.stringify(bounds);
  for(let i=0;i<6;i++){
    const {tiling,offset}=labels.forgeLabelUV(bounds,i),col=i%2,row=Math.floor(i/2);
    assert(Math.abs((bounds.center.x-bounds.halfExtents.x)*tiling[0]+offset[0]-col*.5)<1e-12);
    assert(Math.abs((bounds.center.x+bounds.halfExtents.x)*tiling[0]+offset[0]-(col+1)*.5)<1e-12);
    assert(Math.abs((bounds.center.y-bounds.halfExtents.y)*tiling[1]+1-tiling[1]-offset[1]-(1-(row+1)*.25))<1e-12);
    assert(Math.abs((bounds.center.y+bounds.halfExtents.y)*tiling[1]+1-tiling[1]-offset[1]-(1-row*.25))<1e-12);
  }
  assert.equal(JSON.stringify(bounds),before);
});
