import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Entity } from 'playcanvas';
import { PanelMotion } from '../src/playcanvas/panelMotion.js';
import { HubController, HUB_PANELS } from '../src/playcanvas/hubController.js';

test('hub selection preserves velocity, settles exactly, reverses and supports reduced motion', () => {
  const motion = new PanelMotion(8);
  motion.select(2); motion.update(.15);
  const before = [...motion.values], velocity = [...motion.velocities];
  motion.select(6);
  assert.deepEqual(motion.values, before); assert.deepEqual(motion.velocities, velocity);
  for (let i=0;i<240;i++) motion.update(1/60);
  assert.deepEqual(motion.values, [0,0,0,0,0,0,1,0]);
  motion.select(null); motion.update(10);
  assert.deepEqual(motion.values, Array(8).fill(0));
  motion.setReduced(true); motion.select(3);
  assert.equal(motion.values[3], 1);
  assert.throws(() => motion.select(8), RangeError);
  assert.throws(() => motion.update(NaN), RangeError);
});

test('all eight hub panels restore exact transforms after interrupted focus and hover', () => {
  const scene=JSON.parse(readFileSync(new URL('../public/playcanvas/mi02/scene.json',import.meta.url)));
  const root=new Entity('Root'), entities={};
  for(const [id,data] of Object.entries(scene.entities)) {
    const e=entities[id]=new Entity(data.name);
    e.setLocalPosition(...data.position); e.setLocalEulerAngles(...data.rotation); e.setLocalScale(...data.scale);
  }
  for(const [id,data] of Object.entries(scene.entities)) (entities[data.parent]||root).addChild(entities[id]);
  const camera=root.findByName('CAMERA_HUB');
  camera.camera={fov:34,horizontalFov:false};
  const hub=new HubController({root,graphicsDevice:{width:1440,height:900}});
  const rest=hub.panels.map(p=>[p.e.getLocalPosition().toArray(),p.e.getLocalRotation().toArray(),p.e.getLocalScale().toArray()]);
  for(let i=0;i<8;i++) {hub.hover(i);hub.update(.1);hub.select(i);hub.update(.23);}
  hub.hover(null);hub.select(null);hub.update(10);
  assert.deepEqual(hub.panels.map(p=>[p.e.getLocalPosition().toArray(),p.e.getLocalRotation().toArray(),p.e.getLocalScale().toArray()]),rest);
  hub.setReduced(true);hub.select(2);hub.update(0);
  assert.equal(hub.motion.values[2],1);
  hub.dispose();
  assert.deepEqual(hub.panels.map(p=>p.e.getLocalPosition().toArray()),rest.map(p=>p[0]));
});

test('hub package retains approved source bytes and only required runtime dependencies', () => {
  const base=new URL('../public/playcanvas/mi02/',import.meta.url),bytes=readFileSync(new URL('scene.json',base));
  const scene=JSON.parse(bytes),config=JSON.parse(readFileSync(new URL('config.json',base)));
  const proof=JSON.parse(readFileSync(new URL('fixtures/hub-integrity.json',import.meta.url)));
  assert.equal(Object.keys(scene.entities).length,83);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),proof.sceneSha256);
  assert.equal(scene.settings.render.fog_density,.012);
  for(const [name] of HUB_PANELS) assert(Object.values(scene.entities).some(e=>e.name==='PANEL_'+name));
  assert(!Object.values(scene.entities).some(e=>e.components.script));
  const found=new Set(),queue=[scene];
  while(queue.length){const v=queue.pop();if(v&&typeof v==='object')queue.push(...Object.values(v));else if(Object.hasOwn(config.assets,String(v))&&!found.has(String(v))){found.add(String(v));queue.push(config.assets[String(v)].data);}}
  assert.deepEqual([...found].sort(),Object.keys(config.assets).sort());
  assert.deepEqual(config.application_properties.scripts,[]);
  for(const file of proof.files){const asset=config.assets[file.id];assert.equal(createHash('md5').update(readFileSync(new URL('../public'+asset.file.url,import.meta.url))).digest('hex'),file.md5,file.name);}
});

test('hub load failures retain their cause and cancellation destroys a newly created device', async () => {
  const source=readFileSync(new URL('../src/playcanvas/hubRuntime.js',import.meta.url),'utf8');
  const body=source.slice(source.indexOf('export async function')).replace('export ','');
  const make=new Function('fetchJson','createGraphicsDevice',body+';return createHubRuntime');
  const controller=new AbortController(),expected=new Error('Device unavailable');
  const fetchJson=async()=>({entities:{}});
  await assert.rejects(make(fetchJson,async()=>{throw expected;})({}, {signal:controller.signal,enabled:Array(8).fill(true)}),error=>error===expected);
  let destroyed=0;
  const create=make(fetchJson,async()=>{controller.abort();return {destroy(){destroyed++;}};});
  await assert.rejects(create({}, {signal:controller.signal,enabled:Array(8).fill(true)}),{name:'AbortError'});
  assert.equal(destroyed,1);
});
