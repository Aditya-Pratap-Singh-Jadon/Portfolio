import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareSectionScene,runtimeDestinations,sectionAssetIds} from '../src/playcanvas/sectionScenes.js';
import {sectionControlDefinitions} from '../src/playcanvas/sectionControls.js';
import {AccentSelection,NexusMotion,nexusPose} from '../src/playcanvas/approved/mi-accents-motion.mjs';
import {sectionCameraFrame} from '../src/playcanvas/sectionCamera.js';

test('each MI05 destination retains its approved subtree and shares one runtime package',()=>{
  const source=JSON.parse(readFileSync(new URL('../public/playcanvas/mi05/scene.json',import.meta.url)));
  const original=JSON.stringify(source);
  for(const id of ['experience','achievements','contact']){
    const def=runtimeDestinations[id],view=prepareSectionScene(source,def);
    assert.equal(def.folder,'mi05');assert.equal(def.scene,'MI_05_ACCENTS');
    for(const other of ['MI_05_CHRONICLE_FAULT','MI_05_VAULT_DISPLAY','MI_05_NEXUS_REASSEMBLY'])
      assert.equal(Object.values(view.entities).some(e=>e.name===other),other===def.root);
    for(const [key,e]of Object.entries(view.entities)){
      assert.deepEqual(e.position,source.entities[key].position);assert.deepEqual(e.rotation,source.entities[key].rotation);
      assert.deepEqual(e.scale,source.entities[key].scale);assert.equal(e.resource_id,source.entities[key].resource_id);
      assert.equal(e.components.script,undefined);
      for(const child of e.children||[])assert(view.entities[child]);
    }
  }
  assert.equal(JSON.stringify(source),original);
});

test('production control definitions preserve object selection and reset without demo actions',()=>{
  for(const[kind,count]of[['forge',6],['neural',15],['chronicle',5],['vault',4]]){
    const defs=sectionControlDefinitions(kind);
    assert.equal(defs.filter(d=>d.action==='select').length,count);
    assert(defs.some(d=>d.action==='reset'));assert(!defs.some(d=>/record|inspect|debug/i.test(d.label)));
  }
  const nexus=sectionControlDefinitions('nexus');
  for(const action of ['assemble','separate','reset'])assert(nexus.some(d=>d.action===action));
  assert.throws(()=>sectionControlDefinitions('unknown'),RangeError);
});

test('view asset selection retains transitive geometry and rig dependencies without other-view assets',()=>{
  const assets={1:{data:{container:2}},2:{data:{back:1}},3:{data:{}},4:{data:{texture:5}},5:{data:{}}};
  assert.deepEqual([...sectionAssetIds({render:{asset:1}},assets,4)].sort(),['1','2','4','5']);
});

test('approved accents select every object and Nexus reverses interrupted assembly exactly',()=>{
  const rig=JSON.parse(readFileSync(new URL('../public/playcanvas/mi05/assets/accents-motion-rig.json',import.meta.url)));
  for(const[kind,count]of[['chronicle',5],['vault',4]]){
    const m=new AccentSelection(count,kind==='chronicle');
    for(let i=0;i<count;i++){m.select(i);m.update(.2);if(kind==='chronicle')assert(m.pulse!==null);for(let j=0;j<400;j++)m.update(1/60);assert.equal(m.focus.values[i],1);m.reset();for(let j=0;j<400;j++)m.update(1/60);assert(m.focus.values.every(v=>v===0));}
  }
  const m=new NexusMotion();m.assemble();m.update(.4);const p=m.progress;m.separate();assert.equal(m.progress,p);m.assemble();for(let i=0;i<800;i++)m.update(1/60);assert.equal(m.contactReady,true);
  rig.nexus.fragments.forEach((f,i)=>assert.deepEqual(nexusPose(f,1,i),f.assembled));
  m.separate();for(let i=0;i<800;i++)m.update(1/60);assert.equal(m.progress,0);rig.nexus.fragments.forEach((f,i)=>assert.deepEqual(nexusPose(f,0,i),f.separated));
  m.setReduced(true);m.assemble();assert.equal(m.contactReady,true);m.reset();assert.equal(m.progress,0);
});

test('isolated exhibition framing centers distant objects and keeps critical bounds below the title',()=>{
  const points=[[-9,3,-18],[-7,-3,-17]],aspect=.6,fov=36,frame=sectionCameraFrame(points,aspect,fov,false,.1),t=Math.tan(fov*Math.PI/360);
  assert.equal(frame.x,-8);assert.equal(frame.y,0);assert(frame.distance<0);
  for(const[x,y,z]of points){assert(Math.abs(x-frame.x)/(frame.distance-z)<=t*aspect*.88+1e-12);assert(Math.abs(y-frame.y)/(frame.distance-z)<=t*.8+1e-12);assert(frame.distance-z>=.5);}
});
