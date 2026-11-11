// Website embedded adapter: approved transforms, pulses and public events; scoped production controls.
import {Vec3,Ray,Mesh,Texture,PIXELFORMAT_RGBA8,ADDRESS_CLAMP_TO_EDGE,FILTER_LINEAR} from 'playcanvas';
import {AccentSelection,NexusMotion,nexusPose,projectPath} from './approved/mi-accents-motion.mjs';

import {createSectionControls} from './sectionControls.js';
const numbered=(prefix,i)=>prefix+String(i+1).padStart(2,'0');
const heatName=name=>/AMBER|HEAT|MOLTEN/.test(name);
const rest=e=>({e,p:e.getLocalPosition().clone(),q:e.getLocalRotation().clone(),s:e.getLocalScale().clone()});
const restore=r=>{r.e.setLocalPosition(r.p);r.e.setLocalRotation(r.q);r.e.setLocalScale(r.s);};

// Each instance owns only its component's runtime transforms, material clones and listeners.
export class AccentsController {
 constructor(script,kind){
  this.script=script;this.mount=script.mount;this.contentLabels=script.contentLabels;this.initialReduced=script.initialReduced;this.app=script.app;this.entity=script.entity;this.kind=kind;this.listeners=[];this.materials=[];this.meshes=[];this.poses=[];this.items=[];this.time=0;this.stopped=false;
  try{this.start();}catch(error){this.cleanup();this.error=error.message;this.app.fire(`mi:${kind}:error`,{state:'fallback',error:this.error});console.error('MI_ACCENTS_INIT',kind,error);}
 }
 required(name){const e=this.entity.findByName(name);if(!e)throw new Error('Missing approved entity: '+name);return e;}
 listen(target,event,callback){target.addEventListener(event,callback);this.listeners.push(()=>target.removeEventListener(event,callback));}
 on(event,callback){this.app.on(event,callback,this);this.listeners.push(()=>this.app.off(event,callback,this));}
 start(){
  const rig=this.script.rigAsset?.resource;if(rig?.version!==1||rig.sceneId!==2637190||rig.nexus.fragments.length!==8||rig.chronicle.milestones.length!==5||rig.vault.compartments.length!==4)throw new Error('Approved accents motion rig missing');
  this.rig=rig;this.canvas=this.app.graphicsDevice.canvas;this.camera=this.app.root.findByName('CAMERA_ACCENTS');if(!this.camera?.camera)throw new Error('Accents camera missing');
  this.cameraRest=rest(this.camera);this.motion=this.kind==='nexus'?new NexusMotion():new AccentSelection(this.kind==='chronicle'?5:4,this.kind==='chronicle');
  this.light=this.required(`MI_05_${this.kind==='chronicle'?'CHRONICLE_FAULT':this.kind==='vault'?'VAULT_DISPLAY':'NEXUS_REASSEMBLY'}_LOCAL_HEAT`).light;this.lightRest=this.light.intensity;
  const definitions=this.kind==='chronicle'?rig.chronicle.milestones:this.kind==='vault'?rig.vault.compartments:rig.nexus.fragments;
  definitions.forEach((data,i)=>{
   const e=this.required(data.name),item={data,e,index:i,records:this.cloneMaterials(e),movable:[]};
   if(this.kind==='vault')for(const name of [data.presentation,data.name+'_CONTENT_ANCHOR']){const r=rest(this.required(name));this.poses.push(r);item.movable.push(r);}
   else {const r=rest(e);this.poses.push(r);item.movable.push(r);}
   item.pick=e.findComponents('render').filter(r=>r.enabled);this.items.push(item);
  });
  if(this.kind==='chronicle'){
   this.fault=this.cloneMaterials(this.required('CHRONICLE_FAULT_SEGMENTS'));this.texture=this.pulseTexture();
   for(const record of this.fault)this.pulseMesh(record,rig.chroniclePath);
  }else if(this.kind==='nexus'){
   this.texture=this.pulseTexture();
   const c=rig.channels,path=[...c[3].path].reverse().concat(c[2].path.slice(1),[...c[4].path].reverse().slice(1),[...c[1].path].reverse().slice(1),[...c[6].path].reverse().slice(1),c[0].path.slice(1),c[5].path.slice(1));
   for(const item of this.items)for(const record of item.records.filter(r=>r.amber))this.pulseMesh(record,path,item.data.assembled.position);
  }
  this.motion.setReduced(this.initialReduced);
  this.controls();this.listen(this.mount.closest('.space-shell'),'keydown',e=>this.key(e));
  this.listen(this.canvas,'pointerdown',e=>{if(e.isPrimary!==false&&e.button===0)this.down={id:e.pointerId,x:e.clientX,y:e.clientY};});
  this.listen(this.canvas,'pointercancel',()=>{this.down=null;});
  this.listen(this.canvas,'pointerup',e=>{const d=this.down;this.down=null;if(!d||d.id!==e.pointerId||Math.hypot(e.clientX-d.x,e.clientY-d.y)>10)return;const index=this.pick(e.clientX,e.clientY);if(index!==null)this.kind==='nexus'?this.toggle():this.select(index===this.motion.selected?null:index);});
  this.on(`mi:${this.kind}:reset`,()=>this.reset());this.on(`mi:${this.kind}:pause`,v=>{if(typeof v==='boolean')this.pause(v);});this.on(`mi:${this.kind}:reduced-motion`,v=>{if(typeof v==='boolean')this.setReduced(v);});this.on(`mi:${this.kind}:query`,()=>this.report('query'));
  if(this.kind==='nexus'){this.on('mi:nexus:assemble',()=>this.assemble());this.on('mi:nexus:separate',()=>this.separate());}
  else this.on(`mi:${this.kind}:select`,payload=>{const id=typeof payload==='string'?payload:payload?.id;if(id===null){this.reset();return;}const index=this.items.findIndex(x=>x.e.name===id||x.e.guid===id);if(index<0){this.app.fire(`mi:${this.kind}:error`,{error:'Unknown entity ID',state:this.state()});return;}this.select(index);});
  this.ready=true;this.apply();this.report('ready');
 }
 cloneMaterials(entity){
  const records=[];for(const render of entity.findComponents('render'))for(const instance of render.meshInstances){const original=instance.material,clone=original.clone(),r={instance,original,clone,emission:original.emissiveIntensity,emissive:original.emissive.clone(),diffuse:original.diffuse.clone(),amber:heatName(original.name)};this.materials.push(r);records.push(r);instance.material=clone;}return records;
 }
 pulseTexture(){
  const t=new Texture(this.app.graphicsDevice,{name:'MI_P5B_CONTAINED_PULSE',width:256,height:1,format:PIXELFORMAT_RGBA8,mipmaps:false,minFilter:FILTER_LINEAR,magFilter:FILTER_LINEAR,addressU:ADDRESS_CLAMP_TO_EDGE,addressV:ADDRESS_CLAMP_TO_EDGE});const pixels=t.lock();for(let i=0;i<256;i++){const v=Math.round(255*((.35+.65*Math.exp(-(((i/255-.5)/.065)**2)))**(1/2.2)));pixels.set([v,v,v,255],i*4);}t.unlock();return t;
 }
 pulseMesh(record,path,pivot=null){
  const instance=record.instance,original=instance.mesh,p=[],indices=[];original.getPositions(p);original.getIndices(indices);
  const mesh=new Mesh(this.app.graphicsDevice),pulseUvs=[];
  for(let i=0;i<p.length;i+=3){let point;if(pivot)point=[p[i]+pivot[0],p[i+1]+pivot[1]];else {const local=this.entity.getWorldTransform().clone().invert().transformPoint(instance.node.getWorldTransform().transformPoint(new Vec3(p[i],p[i+1],p[i+2])));point=[local.x,local.y];}pulseUvs.push(projectPath(point,path),.5);}
  original.incRefCount();this.meshes.push({instance,original,mesh});
  for(const element of original.vertexBuffer.format.elements){const values=[];original.getVertexStream(element.name,values);if(element.name==='COLOR'&&element.numComponents===3){const rgba=[];for(let i=0;i<values.length;i+=3)rgba.push(values[i],values[i+1],values[i+2],element.normalize?255:1);mesh.setVertexStream(element.name,rgba,4,undefined,element.dataType,element.normalize);}else mesh.setVertexStream(element.name,values,element.numComponents,undefined,element.dataType,element.normalize);}
  mesh.setUvs(1,pulseUvs);mesh.setIndices(indices);mesh.update();instance.mesh=mesh;
  record.clone.emissiveMap=this.texture;record.clone.emissiveMapUv=1;record.clone.emissiveMapOffset.set(2,0);record.clone.emissiveIntensity=record.emission/.35;record.clone.update();record.pulsed=true;
 }
 controls(){createSectionControls(this,this.kind,{presentation:this.script.presentation||'immersive'});}
 key(e){
  if(e.target?.closest?.('.space-detail'))return;
  if(e.defaultPrevented||e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;
  const k=e.key.toLowerCase();
  if(k==='escape'){e.preventDefault();this.reset();}
  else if(k==='m')this.setReduced(!this.motion.reduced);
  else if(this.kind==='chronicle'&&/^[1-5]$/.test(k))this.select(Number(k)-1);
  else if(this.kind==='vault'&&/^[1-4]$/.test(k))this.select(Number(k)-1);
  else if(this.kind==='nexus'){if(k==='a')this.assemble();else if(k==='s')this.separate();else if(k==='r')this.reset();else if(k==='p')this.pause(!this.motion.paused);}
 }
 pick(x,y){
  const rect=this.canvas.getBoundingClientRect(),cam=this.camera.camera,sx=(x-rect.left)*this.canvas.offsetWidth/rect.width,sy=(y-rect.top)*this.canvas.offsetHeight/rect.height,near=cam.screenToWorld(sx,sy,cam.nearClip),far=cam.screenToWorld(sx,sy,cam.farClip),ray=new Ray(near,far.sub(near).normalize()),point=new Vec3();let best=null,distance=Infinity;
  for(const item of this.items)for(const render of item.pick)for(const instance of render.meshInstances)if(instance.aabb.intersectsRay(ray,point)){const d=point.distance(near);if(d<distance){distance=d;best=item.index;}}return best;
 }
 select(index){if(!this.ready||this.stopped)return;this.motion.select(index);this.apply();this.report('selection');}
 selectMilestone(id){this.external(id);}
 selectAchievement(id){this.external(id);}
 external(id){if(!this.ready||this.stopped)return;const i=this.items.findIndex(item=>item.e.name===id||item.e.guid===id);if(i<0)throw new RangeError('Unknown entity ID');this.select(i);}
 resetChronicle(){this.reset();}
 resetVault(){this.reset();}
 resetNexus(){this.reset();}
 assemble(){if(!this.ready||this.stopped)return;this.motion.assemble();this.apply();this.report('assembly-request');}
 separate(){if(!this.ready||this.stopped)return;this.motion.separate();this.apply();this.report('separation-request');}
 toggle(){this.motion.target?this.separate():this.assemble();}
 pause(value){if(!this.ready||this.stopped)return;if(this.kind==='nexus')this.motion.pause(value);else this.motion.paused=Boolean(value);this.report('pause');}
 reset(){if(!this.ready||this.stopped)return;this.motion.reset();this.apply();this.report('reset-request');}
 setReduced(value){if(!this.ready||this.stopped)return;this.motion.setReduced(this.initialReduced||value);this.apply();this.report('reduced-motion');}
 state(){const m=this.motion;return {component:this.kind,state:this.kind==='nexus'?m.state:m.paused?'paused':m.settled?(m.selected===null?'idle':'selected'):(m.selected===null?'resetting':'selecting'),selectedId:this.kind==='nexus'||m.selected===null?null:this.items[m.selected].e.name,selectedEntityId:this.kind==='nexus'||m.selected===null?null:this.items[m.selected].e.guid,progress:this.kind==='nexus'?m.progress:m.pulse,contactReady:this.kind==='nexus'?m.contactReady:false,reducedMotion:m.reduced,paused:m.paused,placeholder:true,error:this.error??null};}
 report(reason){const state=this.state();this.lastState=state.state;this.app.fire(`mi:${this.kind}:state`,{reason,...state});if((reason==='settled'||reason==='reset-request'||state.reducedMotion)&&['idle','selected','separated','assembled'].includes(state.state)){this.app.fire(`mi:${this.kind}:complete`,state);if(state.selectedId===null&&(state.state==='idle'||state.state==='separated'))this.app.fire(`mi:${this.kind}:reset-complete`,state);}if(state.contactReady&&!this.wasContactReady)this.app.fire('mi:nexus:contact-ready',state);this.wasContactReady=state.contactReady;}
 illuminate(records,heat=0,emphasis=1,pulse=null){
  for(const r of records){r.clone.diffuse.copy(r.diffuse).mulScalar(emphasis);if(r.amber)r.clone.emissiveIntensity=r.emission*(1+heat*1.65)*emphasis/(r.pulsed&&pulse!==null?.35:1);if(r.pulsed){r.clone.emissiveMap=pulse===null?null:this.texture;r.clone.emissiveMapOffset.set(pulse===null?2:.5-pulse,0);}r.clone.update();}
 }
 apply(){
  if(!this.ready||this.stopped)return;const m=this.motion;if(this.kind==='nexus'){
   const p=m.progress,pulse=p===1&&m.target&&m.awakening>0&&m.awakening<1?m.awakening:null;
   this.items.forEach((item,i)=>{const pose=nexusPose(item.data,p,i);item.e.setLocalPosition(...pose.position);item.e.setLocalEulerAngles(...pose.rotation);item.e.setLocalScale(...pose.scale);const alignment=p>.97?Math.min(1,(p-.97)/.03):0;this.illuminate(item.records,alignment*.24,1,pulse);});
   this.light.intensity=this.lightRest+(pulse===null?0:.22*Math.sin(Math.PI*pulse));
   this.status.textContent=`Nexus structure · ${m.state}`;
   this.pauseButton.setAttribute('aria-pressed',String(m.paused));
  }else{
   const totalFocus=m.focus.values.reduce((a,b)=>a+b,0);
   this.items.forEach((item,i)=>{const focus=m.focus.values[i],attention=Math.max(0,totalFocus-focus);
    for(const r of item.movable){const offset=this.kind==='vault'?focus*.095-attention*.035:focus*.13;if(offset===0)restore(r);else r.e.setLocalPosition(r.p.x,r.p.y,r.p.z+offset);}
    this.illuminate(item.records,focus+(m.selected===i&&!m.reduced?Math.min(1,m.age/m.duration)*.12:0),1-attention*.22);
    if(this.kind==='vault')for(const r of item.records.filter(r=>!r.amber&&r.instance.node.name.endsWith('_RECESSED_PRESENTATION'))){if(focus===0){r.clone.emissive.copy(r.emissive);r.clone.emissiveIntensity=r.emission;}else{r.clone.emissive.set(r.emissive.r+.09*focus,r.emissive.g+.065*focus,r.emissive.b+.038*focus);r.clone.emissiveIntensity=r.emission+focus*.42;}r.clone.update();}
   });
   if(this.kind==='chronicle'){
    const pulse=m.pulse===null?null:m.pulse*projectPath([0,this.items[m.selected].data.position[1]],this.rig.chroniclePath),idle=m.exactRest||m.reduced?0:(Math.sin(m.time*.61)+Math.sin(m.time*.973+1.7))*.016;
    this.illuminate(this.fault,idle,1,pulse);this.light.intensity=this.lightRest+(m.selected===null?0:.10*m.focus.values[m.selected]);
   }else this.light.intensity=this.lightRest+(m.selected===null?0:.12*m.focus.values[m.selected]);
   const label=m.selected===null?(m.settled?'No selection':'Returning to rest'):(this.contentLabels?.[m.selected]||'No published entry');if(this.status.textContent!==label)this.status.textContent=label;
   this.selectButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(m.selected===i)));
  }
  this.reducedButton.setAttribute('aria-pressed',String(m.reduced));
 }
 tick(dt){if(!this.ready||this.stopped)return;this.motion.update(dt);this.apply();if(this.state().state!==this.lastState)this.report('settled');}
 update(dt){this.tick(dt);}
 view(){if(!this.ready||this.stopped)return;const p=this.entity.getPosition();this.camera.setPosition(p.x+3.7,p.y+2.3,p.z+9.9);this.camera.lookAt(p.x,p.y-.05,p.z);}
 overview(){if(!this.ready||this.stopped)return;restore(this.cameraRest);}
 recordError(error){console.warn('MI_ACCENTS_RECORD',error.message);if(this.status)this.status.textContent=error.message;}
 cleanup(){
  if(this.stopped)return;this.stopped=true;this.ready=false;for(const off of this.listeners.splice(0))off();this.poses.forEach(restore);if(this.light)this.light.intensity=this.lightRest;
  for(const r of this.materials){r.instance.material=r.original;r.clone.destroy();}for(const r of this.meshes){r.instance.mesh=r.original;r.original.decRefCount();r.mesh.destroy();}this.texture?.destroy();this.ui?.remove();this.focusMark?.remove();
 }
}
