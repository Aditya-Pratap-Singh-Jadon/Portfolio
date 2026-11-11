// Website adapter of the approved controller: scoped UI/lifecycle, unchanged geometry and motion math.
import { createSectionControls } from './sectionControls.js';
import { Entity, Vec3, Quat, Mat4 } from 'playcanvas';
import { ForgeMotion, sampleForgePose } from './approved/mi-forge-motion.mjs';

const SIZES=[[3.8,2.45,.66],[3.6,2.2,.72],[3.45,2.35,.62],[3.2,2.05,.6],[4.1,2.6,.8],[3.5,2.15,.68]];

export class MiForgeNavigation {
  constructor({app,entity}){this.app=app;this.entity=entity;}
  static scriptName='miForgeNavigation';
  initialize(){
    this.listeners=[];this.motion=new ForgeMotion();this.hover=null;this.keyboardFocus=null;
    this.camera=this.required('CAMERA_FORGE');this.canvas=this.app.graphicsDevice.canvas;
    const inverseCamera=new Mat4().invert(this.camera.getWorldTransform());
    this.slots=SIZES.map((size,i)=>{
      const name=`PROJECT_SLOT_${String(i+1).padStart(2,'0')}`,e=this.required(name),materials=[];
      for(const render of e.findComponents('render'))if(/_RECESSED_HEAT$|_THERMAL_POCKET$/.test(render.entity.name)){
        const clones=new Map();
        for(const instance of render.meshInstances){const original=instance.material;let clone=clones.get(original);if(!clone){clone=original.clone();clones.set(original,clone);}materials.push({instance,original,clone,emission:original.emissiveIntensity});instance.material=clone;}
      }
      let light=e.findByName('LIGHT_FORGE_EMBEDDED_HEAT_05'),created=false;
      if(!light){light=new Entity('FORGE_RUNTIME_HEAT_'+(i+1));light.addComponent('light',{type:'omni',color:[1,.27,.055],intensity:.05,range:.85,falloffMode:1,castShadows:false,affectSpecularity:false});light.setLocalPosition(-size[0]*.22+i*.035,size[1]/2-.11,size[2]/2+.02);e.addChild(light);created=true;}
      return {e,name,size,p:e.getLocalPosition().clone(),q:e.getLocalRotation().clone(),s:e.getLocalScale().clone(),restCamera:inverseCamera.transformPoint(e.getPosition()).toArray(),materials,light,created,lightIntensity:light.light.intensity,heat:.12};
    });
    this.motion.setReduced(this.initialReduced);
    this.controls();
    this.listen(this.mount.closest('.space-shell'),'keydown',e=>this.key(e));this.listen(window,'resize',()=>this.layout());
    this.listen(this.canvas,'pointermove',e=>{if(e.pointerType!=='touch'){this.hover=this.pick(e.clientX,e.clientY);this.canvas.style.cursor=this.hover===null?'':'pointer';}});
    this.listen(this.canvas,'pointerleave',()=>{this.hover=null;this.canvas.style.cursor='';});
    this.listen(this.canvas,'pointerdown',e=>{if(e.isPrimary&&e.button===0)this.down={x:e.clientX,y:e.clientY,id:e.pointerId};});
    this.listen(this.canvas,'pointercancel',()=>{this.down=null;this.hover=null;});
    this.listen(this.canvas,'pointerup',e=>{const down=this.down;this.down=null;if(down?.id!==e.pointerId||Math.hypot(e.clientX-down.x,e.clientY-down.y)>10)return;const index=this.pick(e.clientX,e.clientY);this.select(index===this.motion.selected?null:index);});
    this.layout();this.apply(0);
  }
  required(name){const e=this.app.root.findByName(name);if(!e)throw new Error('MI_03 missing '+name);return e;}
  listen(target,event,callback){target.addEventListener(event,callback);this.listeners.push(()=>target.removeEventListener(event,callback));}
  controls(){createSectionControls(this,'forge',{presentation:this.presentation||'immersive'});}
  layout(){
    const inverse=new Mat4().invert(this.camera.getWorldTransform());
    for(const slot of this.slots)slot.restCamera=inverse.transformPoint(slot.e.parent.getWorldTransform().transformPoint(slot.p)).toArray();
    const rect=this.canvas.getBoundingClientRect(),cam=this.camera.camera,aspect=rect.width/Math.max(rect.height,1),tan=Math.tan(cam.fov*Math.PI/360),tanY=cam.horizontalFov?tan/aspect:tan,tanX=cam.horizontalFov?tan:tan*aspect;
    const occupied=0,available=1;
    const focusDistance=Math.max(7,...SIZES.map(([w,h])=>Math.max(w/(2*tanX*.72),h/(2*tanY*available*.75))));
    this.config={focusDistance,backdropDistance:Math.max(focusDistance+5,...this.slots.map(s=>-s.restCamera[2]+3)),focusY:focusDistance*tanY*occupied/Math.max(rect.height,1)};
  }
  select(index){this.motion.select(index);this.acknowledge();this.apply(0);this.app.fire('mi:forge:selection',{slotId:index===null?null:this.slots[index].name});}
  setReduced(value){this.motion.setReduced(this.initialReduced||value);this.acknowledge();this.apply(0);}
  key(e){
    if(e.target?.closest?.('.space-detail'))return;
    if(e.defaultPrevented||e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;
    if(/^[1-6]$/.test(e.key)){e.preventDefault();const index=Number(e.key)-1;this.buttons[index].focus();this.select(index);}
    else if(e.key==='Escape'){e.preventDefault();this.overviewButton.focus();this.select(null);}
    else if(e.key.toLowerCase()==='m'){e.preventDefault();this.setReduced(!this.motion.reduced);}
  }
  acknowledge(){
    const {selected,active,settled}=this.motion;
    const text=selected===null?(settled?'Project Forge · Overview':'Project Forge · Reassembling'):`${this.contentLabels?.[selected]||'Project '+(selected+1)} · ${settled?'In focus':'Moving into focus'}`;
    if(text!==this.status.textContent)this.status.textContent=text;
    this.buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));this.reducedButton.setAttribute('aria-pressed',String(this.motion.reduced));
  }
  pick(clientX,clientY){
    const rect=this.canvas.getBoundingClientRect(),x=(clientX-rect.left)*this.canvas.offsetWidth/rect.width,y=(clientY-rect.top)*this.canvas.offsetHeight/rect.height,cam=this.camera.camera;
    const near=cam.screenToWorld(x,y,cam.nearClip),far=cam.screenToWorld(x,y,cam.farClip);let picked=null,distance=Infinity;
    this.slots.forEach((s,i)=>{const inverse=new Mat4().invert(s.e.getWorldTransform()),a=inverse.transformPoint(near),b=inverse.transformPoint(far),dz=b.z-a.z;if(Math.abs(dz)<1e-8)return;const t=(s.size[2]/2-a.z)/dz;if(t<0||t>1)return;const hit=new Vec3().lerp(a,b,t);if(Math.abs(hit.x)>s.size[0]/2||Math.abs(hit.y)>s.size[1]/2)return;const d=s.e.getWorldTransform().transformPoint(hit).distance(near);if(d<distance){distance=d;picked=i;}});return picked;
  }
  screenBounds(slot,inset=0){
    const [w,h,d]=slot.size,points=[];
    for(const x of [-w/2+inset,w/2-inset])for(const y of [-h/2+inset,h/2-inset])points.push(this.camera.camera.worldToScreen(slot.e.getWorldTransform().transformPoint(new Vec3(x,y,d/2-.23))));
    const r=this.canvas.getBoundingClientRect(),sx=r.width/this.canvas.offsetWidth,sy=r.height/this.canvas.offsetHeight;
    return {left:r.left+Math.min(...points.map(p=>p.x))*sx,top:r.top+Math.min(...points.map(p=>p.y))*sy,width:(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))*sx,height:(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)))*sy};
  }
  place(node,bounds){for(const key of ['left','top','width','height'])node.style[key]=bounds[key]+'px';}
  apply(dt){
    const {active,selected,progress,settled,reduced}=this.motion;
    this.slots.forEach((s,i)=>{
      if(progress===0){s.e.setLocalPosition(s.p);s.e.setLocalRotation(s.q);s.e.setLocalScale(s.s);}
      else {const pose=sampleForgePose(s.restCamera,i,active,progress,this.config),world=this.camera.getWorldTransform().transformPoint(new Vec3(...pose.position)),local=new Mat4().invert(s.e.parent.getWorldTransform()).transformPoint(world),face=new Quat().mul2(s.e.parent.getRotation().clone().invert(),this.camera.getRotation());s.e.setLocalPosition(local);s.e.setLocalRotation(new Quat().slerp(s.q,face,pose.turn));s.e.setLocalScale(s.s);}
      const heatTarget=i===selected?1.15:(i===this.hover||i===this.keyboardFocus? .5:.12);
      s.heat=reduced?heatTarget:s.heat+(heatTarget-s.heat)*(1-Math.exp(-6*dt));if(Math.abs(s.heat-heatTarget)<1e-4)s.heat=heatTarget;
      for(const m of s.materials){m.clone.emissiveIntensity=m.emission*s.heat;m.clone.emissive.set(1,.30-.10*Math.min(1,s.heat),.035);m.clone.update();}s.light.light.intensity=.025+s.heat*.20;
    });
    this.preview.style.display=selected!==null&&settled?'block':'none';
    if(selected!==null&&settled){this.previewTitle.textContent=`PROJECT ${String(selected+1).padStart(2,'0')} / PREVIEW`;this.place(this.preview,this.screenBounds(this.slots[selected],.46));}
    const mark=this.keyboardFocus;this.focusMark.style.display=mark===null?'none':'block';if(mark!==null)this.place(this.focusMark,this.screenBounds(this.slots[mark],.05));
    this.acknowledge();
  }
  update(dt){this.motion.update(dt);this.apply(dt);}
  cleanup(){
    if(this.destroyed)return;this.destroyed=true;for(const remove of this.listeners||[])remove();this.ui?.remove();this.preview?.remove();this.focusMark?.remove();if(this.canvas)this.canvas.style.cursor='';
    for(const s of this.slots||[]){s.e.setLocalPosition(s.p);s.e.setLocalRotation(s.q);s.e.setLocalScale(s.s);const clones=new Set();for(const m of s.materials){m.instance.material=m.original;clones.add(m.clone);}for(const clone of clones)clone.destroy();if(s.created)s.light.destroy();else s.light.light.intensity=s.lightIntensity;}
  }
}
