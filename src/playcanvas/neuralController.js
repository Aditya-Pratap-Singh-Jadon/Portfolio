// Website adapter of the approved controller: scoped UI/lifecycle, unchanged geometry and motion math.
import { createSectionControls } from './sectionControls.js';
import {Entity,Vec3,Quat,Mat4,Mesh,Skin,SkinInstance,MorphTarget,Morph,MorphInstance,Texture,SEMANTIC_BLENDWEIGHT,SEMANTIC_BLENDINDICES,TYPE_UINT8,PIXELFORMAT_RGBA8,ADDRESS_CLAMP_TO_EDGE,FILTER_LINEAR,calculateNormals} from 'playcanvas';
import {NeuralMotion,nodeName} from './approved/mi-neural-motion.mjs';
import {prepareLiquid} from './approved/mi-neural-liquid.mjs';

export function nearestTouchNode(x,y,points){
  let selected=null,distance=22*22;
  points.forEach((p,i)=>{if(!p)return;const d=(p.x-x)**2+(p.y-y)**2;if(d<=22*22&&(selected===null||d<distance)){selected=i;distance=d;}});
  return selected;
}

export class MiNeuralNavigation {
  constructor({app,entity}){this.app=app;this.entity=entity;}
  static scriptName='miNeuralNavigation';
  /**
   * @attribute
   * @type {Asset}
   * @resource json
   */
  rigAsset;

  initialize(){
    this.listeners=[];this.nodes=[];this.flows=[];this.materials=[];this.hover=null;this.keyboardFocus=null;

    try{
      const rig=this.rigAsset?.resource;
      if(!rig||rig.sourceHash!=='1c5db44023d66ba148170caf8c0511c6'||rig.nodes?.length!==15||rig.routes?.length!==15)throw new Error('Approved neural rig metadata missing');
      this.rig=rig;this.motion=new NeuralMotion(rig.routes);this.canvas=this.app.graphicsDevice.canvas;
      this.camera=this.app.root.findComponents('camera').find(c=>c.enabled)?.entity;if(!this.camera)throw new Error('Neural camera missing');
      this.nodes=rig.nodes.map((data,i)=>{
        if(data.name!==nodeName(i))throw new Error('Unexpected node identity');
        const e=this.required(data.name);
        return {...data,e,p:e.getLocalPosition().clone(),q:e.getLocalRotation().clone(),s:e.getLocalScale().clone(),materials:this.cloneMaterials(e),heat:0};
      });
      const core=this.required('NEURAL_CUBOID_CORE');this.core={e:core,materials:this.cloneMaterials(core)};
      this.texture=this.pulseTexture();
      rig.routes.forEach((route,index)=>this.buildFlow(route,index,core));
      this.light=new Entity('NEURAL_RUNTIME_SELECTED_HEAT');this.light.addComponent('light',{type:'omni',color:[1,.22,.035],intensity:0,range:1.15,castShadows:false,affectSpecularity:false});this.entity.addChild(this.light);
      this.motion.setReduced(this.initialReduced);
      this.controls();
      this.listen(this.mount.closest('.space-shell'),'keydown',e=>this.key(e));
      this.listen(this.canvas,'pointermove',e=>{if(e.pointerType!=='touch'){this.hover=this.pick(e.clientX,e.clientY);this.canvas.style.cursor=this.hover===null?'':'pointer';}});
      this.listen(this.canvas,'pointerleave',()=>{this.hover=null;this.canvas.style.cursor='';});
      this.listen(this.canvas,'pointerdown',e=>{if(e.isPrimary&&e.button===0)this.down={x:e.clientX,y:e.clientY,id:e.pointerId};});
      this.listen(this.canvas,'pointercancel',()=>{this.down=null;});
      this.listen(this.canvas,'pointerup',e=>{const down=this.down;this.down=null;if(down?.id!==e.pointerId||Math.hypot(e.clientX-down.x,e.clientY-down.y)>10)return;const index=this.pick(e.clientX,e.clientY,e.pointerType==='touch');this.select(index===this.motion.selected?null:index);});
      this.events={MI_SKILL_SELECT:payload=>this.externalSelect(payload),MI_NEURAL_RESET:()=>this.select(null),MI_SET_REDUCED_MOTION:value=>{if(typeof value==='boolean')this.setReduced(value);}};
      for(const [event,callback]of Object.entries(this.events))this.app.on(event,callback,this);
      this.ready=true;this.apply();
    }catch(error){this.cleanup();console.error('MI_NEURAL_INIT',error);throw error;}
  }
  required(name){const e=this.entity.findByName(name);if(!e)throw new Error('MI_04 missing '+name);return e;}
  listen(target,event,callback){target.addEventListener(event,callback);this.listeners.push(()=>target.removeEventListener(event,callback));}
  cloneMaterials(entity){
    const records=[];
    for(const render of entity.findComponents('render'))for(const instance of render.meshInstances){
      const original=instance.material,clone=original.clone(),record={instance,original,clone,diffuse:original.diffuse.clone(),emissive:original.emissive.clone(),emission:original.emissiveIntensity,edge:original.name==='MI_NEURAL_FRACTURE_EDGE',amber:/HEAT|AMBER|FRACTURE|MOLTEN|RECESS|JUNCTION/i.test(original.name+' '+render.entity.name)};
      instance.material=clone;records.push(record);this.materials.push(record);
    }
    return records;
  }
  pulseTexture(){
    const texture=new Texture(this.app.graphicsDevice,{name:'MI_NEURAL_RUNTIME_PULSE',width:256,height:1,format:PIXELFORMAT_RGBA8,mipmaps:false,minFilter:FILTER_LINEAR,magFilter:FILTER_LINEAR,addressU:ADDRESS_CLAMP_TO_EDGE,addressV:ADDRESS_CLAMP_TO_EDGE});
    const pixels=texture.lock();
    for(let i=0;i<256;i++){const x=i/255-.5,v=Math.round(255*Math.exp(-((x/.065)**2)));pixels.set([v,v,v,255],i*4);}
    texture.unlock();return texture;
  }
  buildFlow(route,index,core){
    const entity=this.required(route.name+'_SEGMENT_01'),instances=entity.render?.meshInstances;
    if(instances?.length!==1)throw new Error('Expected one continuous liquid mesh: '+route.name);
    const instance=instances[0],original=instance.mesh,positions=[],normals=[],indices=[],uvs=[];
    if(instance.skinInstance||instance.morphInstance)throw new Error('Approved liquid must be unrigged: '+route.name);
    original.getPositions(positions);original.getNormals(normals);original.getIndices(indices);original.getUvs(0,uvs);
    const prepared=prepareLiquid(positions,normals,indices,route,index),device=this.app.graphicsDevice,mesh=new Mesh(device);
    // Retain approved mesh until cleanup; MeshInstance decrements the old mesh reference on assignment.
    original.incRefCount();
    const flow={instance,original,mesh,route,index,material:instance.material,oldSkin:instance.skinInstance,oldMorph:instance.morphInstance};this.flows.push(flow);
    mesh.setPositions(prepared.positions);mesh.setNormals(calculateNormals(prepared.positions,indices));mesh.setUvs(0,uvs);mesh.setUvs(1,prepared.pulseUvs);mesh.setIndices(indices);
    mesh.setVertexStream(SEMANTIC_BLENDWEIGHT,prepared.weights,4);mesh.setVertexStream(SEMANTIC_BLENDINDICES,prepared.boneIndices,4,undefined,TYPE_UINT8);
    mesh.update();
    const bones=[route.from==='CORE'?core:this.required(route.from),this.required(route.to)],bindWorld=instance.node.getWorldTransform().clone();
    const inverseBind=bones.map(bone=>new Mat4().mul2(new Mat4().invert(bone.getWorldTransform()),bindWorld));
    mesh.skin=new Skin(device,inverseBind,bones.map(b=>b.name));
    flow.skin=new SkinInstance(mesh.skin);flow.skin.bones=bones;
    const polishedNormals=calculateNormals(prepared.positions,indices);
    const targets=prepared.targets.map((delta,i)=>{
      const displaced=Float32Array.from(prepared.positions,(v,k)=>v+delta[k]),n=calculateNormals(displaced,indices),dn=Float32Array.from(n,(v,k)=>v-polishedNormals[k]);
      return new MorphTarget({name:'liquid-tension-'+i,deltaPositions:delta,deltaNormals:dn});
    });
    mesh.morph=new Morph(targets,device);flow.morph=new MorphInstance(mesh.morph);
    const material=flow.material.clone();flow.clone=material;material.emissiveMap=this.texture;material.emissiveMapUv=1;material.emissive.set(.18,.002,.008);material.emissiveIntensity=0;material.update();
    instance.mesh=mesh;instance.skinInstance=flow.skin;instance.morphInstance=flow.morph;instance.material=material;
    flow.metrics={vertices:positions.length/3,lockedVertices:prepared.lockedVertices,maxPolish:prepared.maxPolish,maxMorph:prepared.maxMorph};
  }
  controls(){createSectionControls(this,'neural',{presentation:this.presentation||'immersive'});}
  externalSelect(payload){
    const name=typeof payload==='string'?payload:payload?.nodeId;
    if(name===null){this.select(null);return;}
    const index=this.nodes.findIndex(n=>n.name===name);if(index>=0)this.select(index);
  }
  select(index){this.motion.select(index);this.apply();this.app.fire('mi:neural:selection',{nodeId:index===null?null:this.nodes[index].name,placeholder:true});}
  resumeIdle(){this.motion.resumeIdle();this.apply();}
  setReduced(value){this.motion.setReduced(this.initialReduced||value);this.apply();}
  key(e){
    if(e.target?.closest?.('.space-detail'))return;
    if(e.defaultPrevented||e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;
    let target;
    if(e.key==='ArrowRight'||e.key==='ArrowDown')target=this.keyboardFocus===null?0:(this.keyboardFocus+1)%15;
    else if(e.key==='ArrowLeft'||e.key==='ArrowUp')target=this.keyboardFocus===null?14:(this.keyboardFocus+14)%15;
    else if(e.key==='Home')target=0;else if(e.key==='End')target=14;
    if(target!==undefined){e.preventDefault();this.buttons[target].focus();}
    else if((e.key==='Enter'||e.key===' '||e.key==='Space')&&this.keyboardFocus!==null){e.preventDefault();this.select(this.motion.selected===this.keyboardFocus?null:this.keyboardFocus);}
    else if(e.key==='Escape'){e.preventDefault();this.select(null);this.resetButton.focus();}
    else if(e.key.toLowerCase()==='m'){e.preventDefault();this.setReduced(!this.motion.reduced);}
    else if(e.key.toLowerCase()==='i'){e.preventDefault();this.resumeIdle();}
  }
  pick(clientX,clientY,touch=false){
    const rect=this.canvas.getBoundingClientRect(),x=(clientX-rect.left)*this.canvas.offsetWidth/rect.width,y=(clientY-rect.top)*this.canvas.offsetHeight/rect.height,cam=this.camera.camera;
    const near=cam.screenToWorld(x,y,cam.nearClip),far=cam.screenToWorld(x,y,cam.farClip);let selected=null,distance=Infinity;
    this.nodes.forEach((node,index)=>{
      const inverse=new Mat4().invert(node.e.getWorldTransform()),a=inverse.transformPoint(near),b=inverse.transformPoint(far);let lo=0,hi=1;
      for(const [axis,size]of ['x','y','z'].map((axis,i)=>[axis,node.size[i]])){
        const delta=b[axis]-a[axis],half=size*.5+.035;
        if(Math.abs(delta)<1e-9){if(Math.abs(a[axis])>half)return;continue;}
        const t1=(-half-a[axis])/delta,t2=(half-a[axis])/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return;
      }
      if(lo<distance){distance=lo;selected=index;}
    });
    if(selected===null&&touch){
      const points=this.nodes.map(node=>{
        const p=cam.worldToScreen(node.e.getPosition()),x=rect.left+p.x*rect.width/this.canvas.offsetWidth,y=rect.top+p.y*rect.height/this.canvas.offsetHeight;
        return p.z>0&&x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom?{x,y}:null;
      });
      return nearestTouchNode(clientX,clientY,points);
    }
    return selected;
  }
  illuminate(records,heat,emphasis){
    for(const m of records){
      m.clone.diffuse.copy(m.diffuse).mulScalar(emphasis);
      if(m.edge)m.clone.emissive.set(m.emissive.r+heat*.23,m.emissive.g+heat*.06,m.emissive.b+heat*.008);
      m.clone.emissiveIntensity=m.emission*(m.amber&&!m.edge?1+heat*1.7:1)*emphasis;m.clone.update();
    }
  }
  apply(){
    const motion=this.motion,{selected,reduced}=motion,neighbors=motion.neighbors();
    this.nodes.forEach((node,i)=>{
      const focus=motion.focus.values[i],idle=motion.idlePose(i,node.cluster);
      if(motion.exactRest){node.e.setLocalPosition(node.p);node.e.setLocalRotation(node.q);node.e.setLocalScale(node.s);}
      else {node.e.setLocalPosition(node.p.x,node.p.y+idle.y+focus*.055,node.p.z+focus*.075);node.e.setLocalRotation(new Quat().mul2(node.q,new Quat().setFromEulerAngles(idle.pitch,idle.yaw,idle.roll)));}
      const arrival=motion.arrival(node.name),attention=i===this.hover||i===this.keyboardFocus,heat=i===selected?1:arrival*.55+(attention?.22:0),emphasis=selected===null||i===selected||neighbors.includes(node.name)?1:.64;
      node.heat=heat;this.illuminate(node.materials,heat,emphasis);
    });
    this.illuminate(this.core.materials,motion.arrival('CORE')*.45,1);
    this.flows.forEach((flow,i)=>{
      const pulse=motion.pulse(i),amplitude=reduced?0:motion.idleEnvelope.values[0]*.36,travel=pulse?pulse.strength*.45:0;
      flow.morph.setWeight(0,reduced||motion.exactRest?0:amplitude*Math.sin(motion.time*.46+i*.73)+travel);
      flow.morph.setWeight(1,reduced||motion.exactRest?0:amplitude*.55*Math.cos(motion.time*.31+i*.91)-travel*.3);
      const center=pulse?(pulse.reverse?1-pulse.progress:pulse.progress):.5;
      flow.clone.emissiveMapOffset.set(.5-center,0);flow.clone.emissiveIntensity=pulse?pulse.strength*.42:0;flow.clone.update();
    });
    this.light.light.intensity=selected===null?0:.09;
    if(selected!==null){const node=this.nodes[selected];this.light.setPosition(node.e.getWorldTransform().transformPoint(new Vec3(0,.15,node.size[2]/2+.12)));}
    const label=selected===null?(motion.exactRest?'Exact rest · idle paused':'Crimson Synapse · suspended idle'):`${this.contentLabels?.[selected]||'Skill node '+(selected+1)} · ${this.contentStatuses?.[selected]||'No published entry'}`;
    if(this.status.textContent!==label)this.status.textContent=label;
    this.buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(selected===i)));this.reducedButton.setAttribute('aria-pressed',String(reduced));
    const mark=this.keyboardFocus??selected;this.focusMark.style.display=mark===null?'none':'block';
    if(mark!==null){
      const node=this.nodes[mark],points=[];
      for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])points.push(this.camera.camera.worldToScreen(node.e.getWorldTransform().transformPoint(new Vec3(x*node.size[0]/2,y*node.size[1]/2,z*node.size[2]/2))));
      const rect=this.canvas.getBoundingClientRect(),xs=points.map(p=>rect.left+p.x*rect.width/this.canvas.offsetWidth),ys=points.map(p=>rect.top+p.y*rect.height/this.canvas.offsetHeight);
      Object.assign(this.focusMark.style,{left:Math.min(...xs)-4+'px',top:Math.min(...ys)-4+'px',width:Math.max(...xs)-Math.min(...xs)+8+'px',height:Math.max(...ys)-Math.min(...ys)+8+'px'});
    }
  }
  update(dt){
    if(!this.ready||this.destroyed)return;
    this.motion.update(Math.min(dt,.1));this.apply();
  }
  cleanup(){
    if(this.destroyed)return;this.destroyed=true;this.ready=false;
    for(const remove of this.listeners||[])remove();for(const [event,callback]of Object.entries(this.events||{}))this.app.off(event,callback,this);
    this.ui?.remove();this.focusMark?.remove();if(this.canvas)this.canvas.style.cursor='';this.light?.destroy();
    for(const node of this.nodes||[]){node.e.setLocalPosition(node.p);node.e.setLocalRotation(node.q);node.e.setLocalScale(node.s);}
    for(const m of this.materials||[]){m.instance.material=m.original;m.clone.destroy();}
    for(const flow of this.flows||[]){
      if(flow.morph&&flow.instance.morphInstance!==flow.morph)flow.morph.destroy();
      flow.instance.skinInstance=flow.oldSkin;flow.instance.morphInstance=flow.oldMorph;flow.instance.mesh=flow.original;flow.original.decRefCount();flow.instance.material=flow.material;
      flow.skin?.destroy();flow.mesh.destroy();flow.clone?.destroy();
    }
    this.texture?.destroy();
  }
}
