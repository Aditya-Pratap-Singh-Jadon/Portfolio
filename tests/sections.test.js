import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import{createHash}from'node:crypto';
import {ForgeMotion} from '../src/playcanvas/approved/mi-forge-motion.mjs';
import {NeuralMotion} from '../src/playcanvas/approved/mi-neural-motion.mjs';
test('section runtime packages retain approved scenes and every required file',()=>{
 const proof=JSON.parse(readFileSync(new URL('./fixtures/section-integrity.json',import.meta.url)));
 for(const p of proof){const base=new URL('../public/playcanvas/'+p.folder+'/',import.meta.url),scene=readFileSync(new URL('scene.json',base)),config=JSON.parse(readFileSync(new URL('config.json',base)));
 assert.equal(createHash('sha256').update(scene).digest('hex'),p.sceneSha256);assert.equal(Object.keys(JSON.parse(scene).entities).length,p.entities);
 assert.equal(Object.values(config.assets).some(a=>a.type==='script'),false);
 for(const f of p.files){const asset=config.assets[f.id];assert(asset.file.url.startsWith('/playcanvas/'+p.folder+'/'));const bytes=readFileSync(new URL('../public'+asset.file.url,import.meta.url));assert.equal(createHash('md5').update(bytes).digest('hex'),f.md5,f.name);}
 }
});
test('approved Forge motion handles every slot, interruptions and exact reset',()=>{const m=new ForgeMotion();for(let i=0;i<6;i++){m.select(i);for(let k=0;k<500;k++)m.update(1/60);assert.equal(m.active,i);assert.equal(m.progress,1);m.select(null);for(let k=0;k<500;k++)m.update(1/60);assert.equal(m.progress,0);assert.equal(m.active,null);}m.select(0);m.update(.1);m.select(5);for(let k=0;k<800;k++)m.update(1/60);assert.equal(m.active,5);m.setReduced(true);m.select(null);assert.equal(m.progress,0);});
test('approved Neural motion propagates only on incident routes and resets exactly',()=>{const rig=JSON.parse(readFileSync(new URL('../public/playcanvas/mi04/assets/MI_NEURAL_RIG.json',import.meta.url)));const m=new NeuralMotion(rig.routes);for(let i=0;i<15;i++){m.select(i);m.update(.65);assert(m.neighbors().length>0);assert(rig.routes.some((r,j)=>m.pulse(j)));m.select(null);for(let k=0;k<500;k++)m.update(1/60);assert.equal(m.exactRest,true);assert(m.focus.values.every(v=>v===0));}m.setReduced(true);m.select(3);assert.equal(m.pulse(0),null);m.reset();assert.equal(m.exactRest,true);});
import {sectionCameraDistance} from '../src/playcanvas/sectionCamera.js';
test('section camera fits all captured corners inside the usable viewport without resizing feedback',()=>{const points=[[-8,5,-18],[9,-5,-16],[0,0,-10]];for(const aspect of [.4,.8,1.6,3]){const d=sectionCameraDistance(points,aspect,36),t=Math.tan(36*Math.PI/360);for(const[x,y,z]of points){assert(Math.abs(x)/(d-z)<=t*aspect*.88+1e-12);assert(Math.abs(y)/(d-z)<=t*.88+1e-12);}assert.equal(sectionCameraDistance(points,aspect,36),d);}});
import {Entity,Vec3} from 'playcanvas';
import {MiForgeNavigation} from '../src/playcanvas/forgeController.js';
test('Forge camera resize rebases approved rest poses rather than animated positions',()=>{
 const root=new Entity('root'),camera=new Entity('camera'),slot=new Entity('slot');root.addChild(camera);root.addChild(slot);camera.setLocalPosition(0,0,18);camera.camera={fov:43,horizontalFov:false};slot.setLocalPosition(-4,2,1);
 const c=new MiForgeNavigation({app:{},entity:root});c.camera=camera;c.canvas={getBoundingClientRect:()=>({width:390,height:440})};c.slots=[{e:slot,p:slot.getLocalPosition().clone()}];c.layout();
 slot.setLocalPosition(9,8,7);camera.setLocalPosition(0,0,30);c.layout();const world=camera.getWorldTransform().transformPoint(new Vec3(...c.slots[0].restCamera));assert(world.distance(c.slots[0].p)<1e-6);
 camera.setLocalPosition(0,0,18);c.layout();assert.deepEqual(c.slots[0].restCamera,[-4,2,-17]);
});
