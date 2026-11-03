import { Script, Vec3, Quat, Mesh, Entity } from 'playcanvas';
import { AwakeningClock, IdleLevitation, idleWeight, idleWave, sampleCinematicEnergy, DURATION, sampleAwakening, inwardHeat, phase } from './mi-awakening-motion.mjs';
import { recordLevitationProof } from './mi-levitation-proof.mjs';

export class MiAwakening extends Script {
  static scriptName='miAwakening';
  initialize(){
    this.clock=new AwakeningClock();this.idle=new IdleLevitation();this.elapsed=0;this.cameraTravel=true;this.hover=false;
    this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;this.pointer={x:0,y:0,tx:0,ty:0};
    this.main=this.required('MONOLITH_MAIN');this.core=this.required('MOLTEN_CORE');this.camera=this.required('CAMERA_HERO');
    this.masses=Array.from({length:6},(_,i)=>this.required(`STONE_MAJOR_0${i+1}`));
    this.fragments=Array.from({length:3},(_,i)=>this.required(`SUSPENDED_FRAGMENT_0${i+1}`));
    this.rest=[this.main,this.core,this.camera,...this.masses,...this.fragments].map(e=>({e,p:e.getLocalPosition().clone(),q:e.getLocalRotation().clone(),s:e.getLocalScale().clone(),enabled:e.enabled}));
    this.restByName=new Map(this.rest.map(v=>[v.e.name,v]));this.materials=[];this.flows=[];this.events=[];this.domEvents=[];
    this.lights=[...this.required('FRACTURE_LIGHTS').findComponents('light'),...this.required('PEDESTAL_LIGHTS').findComponents('light')].map(light=>({light,intensity:light.intensity,pedestal:light.entity.isDescendantOf(this.required('PEDESTAL_LIGHTS'))}));
    this.contactLight=this.required('CRUCIBLE_LIGHT_AMBER').light;this.contactShadow=this.contactLight.shadowIntensity;
    const channelRoot=this.required('MOLTEN_CHANNELS');
    for(const render of channelRoot.findComponents('render'))this.prepareMaterials(render.entity,true);
    this.prepareMaterials(this.required('CHAMBER_MOLTEN_VOLUME'),false);
    this.prepareMaterials(this.core,false);
    this.wallMaterials=[];
    for(const e of this.masses)for(const instance of e.render.meshInstances){
      if(!instance.material.name.includes('CRACK_EDGE'))continue;
      const original=instance.material,material=original.clone();instance.material=material;
      this.wallMaterials.push({instance,original,material,color:original.emissive.clone(),base:original.emissiveIntensity});
    }
    this.openSpill=[-1,1].map(side=>{const e=new Entity(side<0?'OPEN_FRACTURE_SPILL_LEFT':'OPEN_FRACTURE_SPILL_RIGHT');
      this.main.addChild(e);e.addComponent('light',{type:'omni',color:[1,.22,.035],intensity:0,range:1.75,castShadows:false,affectSpecularity:false});return {e,side};});
    this.q=new Quat();this.offset=new Quat();this.v=new Vec3();
    this.bind('MI_MONOLITH_ENTER',()=>this.open());this.bind('MI_MONOLITH_REVERSE',()=>this.close());
    this.bind('MI_MONOLITH_RESET',()=>this.reset());this.bind('MI_MONOLITH_PAUSE',()=>this.pause());
    this.bind('MI_MONOLITH_SKIP',()=>this.skip());this.bind('MI_SET_REDUCED_MOTION',value=>{if(typeof value==='boolean')this.setReduced(value);});
    this.buildControls();
    this.listen(window,'keydown',e=>this.key(e));
    this.listen(this.app.graphicsDevice.canvas,'pointermove',e=>this.pointerMove(e));
    this.listen(this.app.graphicsDevice.canvas,'pointerleave',()=>{this.hover=false;this.pointer.tx=0;this.pointer.ty=0;});
    this.listen(this.app.graphicsDevice.canvas,'click',()=>{if(this.hover)this.open();});
    this.listen(document,'visibilitychange',()=>{if(document.hidden&&!this.clock.paused&&this.clock.time>0&&this.clock.time<DURATION)this.pause();});
    this.listen(window.matchMedia('(prefers-reduced-motion: reduce)'),'change',e=>this.setReduced(e.matches));
    this.on('destroy',()=>this.cleanup());this.state='';this.updateState();this.report('initialized');
  }
  required(name){const e=this.app.root.findByName(name);if(!e)throw new Error(`P1-B missing required entity: ${name}`);return e;}
  bind(name,callback){this.events.push(this.app.on(name,callback));}
  listen(target,name,callback){target.addEventListener(name,callback);this.domEvents.push(()=>target.removeEventListener(name,callback));}
  prepareMaterials(entity,flow){
    for(const instance of entity.render.meshInstances){
      const original=instance.material,material=original.clone();instance.material=material;
      const tier=entity.name.startsWith('FOUNDATION')?'foundation':entity.name.startsWith('CONVERGENCE')?'convergence':entity===this.core?'core':'chamber';
      const entry={instance,original,material,base:original.emissiveIntensity,tier};this.materials.push(entry);
      if(flow){
        const originalMesh=instance.mesh,positions=[],normals=[],uv=[],indices=[];
        originalMesh.getPositions(positions);originalMesh.getNormals(normals);originalMesh.getUvs(0,uv);originalMesh.getIndices(indices);
        const mesh=new Mesh(this.app.graphicsDevice);mesh.setPositions(positions);mesh.setNormals(normals);mesh.setUvs(0,uv);if(indices.length)mesh.setIndices(indices);
        const colors=new Uint8Array(positions.length/3*4);colors.fill(255);mesh.setColors32(colors);mesh.update();instance.mesh=mesh;
        material.diffuseVertexColor=false;material.emissiveVertexColor=true;material.emissiveVertexColorChannel='rgb';material.update();
        const distances=Array.from({length:positions.length/3},(_,i)=>Math.abs(positions[i*3])+Math.abs(positions[i*3+2]));
        const maximum=Math.max(...distances,.001);
        this.flows.push({entry,mesh,originalMesh,colors,distances:distances.map(v=>v/maximum)});
      }
    }
  }
  buildControls(){
    this.ui=document.createElement('section');this.ui.setAttribute('aria-label','Monolith gateway controls');
    Object.assign(this.ui.style,{position:'fixed',left:'16px',bottom:'16px',maxWidth:'calc(100vw - 32px)',zIndex:'20',padding:'12px',background:'rgba(8,8,8,.92)',color:'#e8e2d9',font:'13px system-ui',border:'1px solid #3b3029',borderRadius:'3px'});
    this.status=document.createElement('div');this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');this.status.style.marginBottom='8px';this.ui.append(this.status);
    const row=document.createElement('div');Object.assign(row.style,{display:'flex',gap:'6px',flexWrap:'wrap'});this.ui.append(row);
    const buttons=[['Awaken',()=>this.open()],['Reverse',()=>this.close()],['Pause / resume',()=>this.pause()],['Reset',()=>this.reset()],['Skip',()=>this.skip()],['Camera travel',()=>this.toggleCamera()],['Reduced motion',()=>this.setReduced(!this.reduced)],['Record proof',()=>this.recordProof()]];
    for(const [label,action]of buttons){const b=document.createElement('button');b.type='button';b.textContent=label;Object.assign(b.style,{background:'#171717',color:'#e8e2d9',border:'1px solid #655044',padding:'7px 10px',cursor:'pointer',borderRadius:'2px'});b.addEventListener('click',action);row.append(b);if(label==='Camera travel')this.cameraButton=b;if(label==='Reduced motion')this.reducedButton=b;}
    document.body.append(this.ui);this.syncButtons();
  }
  syncButtons(){this.cameraButton?.setAttribute('aria-pressed',String(this.cameraTravel));this.reducedButton?.setAttribute('aria-pressed',String(this.reduced));}
  key(e){
    if(e.defaultPrevented||e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;
    if(['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;
    const key=e.key.toLowerCase();if(e.target?.tagName==='BUTTON'&&(key==='enter'||key===' '))return;
    const actions={enter:()=>this.open(),escape:()=>this.close(),c:()=>this.close(),' ':()=>this.pause(),r:()=>this.reset(),s:()=>this.skip(),f:()=>this.toggleCamera(),m:()=>this.setReduced(!this.reduced),d:()=>this.report('diagnostic'),k:()=>this.recordProof()};
    if(actions[key]){e.preventDefault();actions[key]();}
  }
  open(){
    this.clock.drive(1);if(this.reduced){this.cameraTravel=false;this.clock.seek(DURATION);}this.updateState();this.apply(0);this.report('open accepted');if(this.reduced)this.complete();
  }
  close(){if(this.clock.time===0||this.reduced){this.reset();return;}this.clock.drive(-1);this.updateState();this.report('reverse accepted');}
  pause(){if(this.clock.time===0||this.clock.time===DURATION)return;this.clock.pause();this.updateState();this.report('pause accepted');}
  skip(){this.cameraTravel=false;this.clock.seek(DURATION);this.apply(0);this.updateState();this.syncButtons();this.report('skip accepted');this.complete();}
  recordProof(){recordLevitationProof(this).catch(error=>console.error('MI_RECORDING '+error.message));}
  toggleCamera(){this.cameraTravel=!this.cameraTravel;this.apply(0);this.syncButtons();this.report('camera toggled');}
  setReduced(value){this.reduced=value;this.pointer={x:0,y:0,tx:0,ty:0};if(value&&this.clock.time>0&&this.clock.time<DURATION)this.skip();this.apply(0);this.syncButtons();this.report('motion preference');}
  reset(){
    this.hover=false;this.pointer.tx=0;this.pointer.ty=0;
    if(this.clock.time>0&&!this.reduced){this.clock.drive(-1);this.updateState();this.report('reset reassembly accepted');return;}
    this.clock.reset();this.apply(0);this.updateState();this.report('exact reassembly; idle resumed');
  }
  restorePose(){for(const r of this.rest){r.e.setLocalPosition(r.p);r.e.setLocalRotation(r.q);r.e.setLocalScale(r.s);r.e.enabled=r.enabled;}}
  pointerMove(e){
    if(this.reduced||this.clock.time>0)return;
    const canvas=this.app.graphicsDevice.canvas,rect=canvas.getBoundingClientRect(),px=(e.clientX-rect.left)/rect.width,py=(e.clientY-rect.top)/rect.height;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    const screen=new Vec3(),world=new Vec3(),local=new Vec3();
    for(const x of [-1.1,1.1])for(const y of [-2.75,2.75])for(const z of [-.79,.79]){
      this.main.getWorldTransform().transformPoint(local.set(x,y,z),world);this.camera.camera.worldToScreen(world,screen);
      const sx=screen.x/this.app.graphicsDevice.width,sy=screen.y/this.app.graphicsDevice.height;minX=Math.min(minX,sx);maxX=Math.max(maxX,sx);minY=Math.min(minY,sy);maxY=Math.max(maxY,sy);
    }
    this.hover=px>=minX&&px<=maxX&&py>=minY&&py<=maxY;
    this.pointer.tx=this.hover?(py-.5)*-6:0;this.pointer.ty=this.hover?(px-.5)*8:0;
  }
  update(dt){
    if(document.hidden)return;
    if(!this.clock.paused){this.elapsed+=Math.max(0,dt);if(!this.reduced)this.idle.advance(dt);}
    const was=this.clock.time;this.clock.advance(dt);
    if(this.clock.time===0&&was>0&&this.clock.direction===-1){this.reset();return;}
    this.apply(dt);this.updateState();
    if(this.clock.time===DURATION&&was<DURATION)this.complete();
  }
  complete(){this.app.fire('MI_MONOLITH_OPEN_COMPLETE',{state:'MONO_OPENED',cameraTravel:this.cameraTravel});this.report('opening complete');}
  apply(dt){
    const t=this.clock.time,s=sampleAwakening(t),ease=1-Math.exp(-Math.max(0,dt)/.35);
    const mainRest=this.restByName.get('MONOLITH_MAIN');
    this.pointer.x+=(this.pointer.tx-this.pointer.x)*ease;this.pointer.y+=(this.pointer.ty-this.pointer.y)*ease;
    const weight=idleWeight(t,this.reduced),idle=this.idle.y*weight;
    const cinematic=sampleCinematicEnergy(t,this.idle.y,this.reduced);
    this.main.setLocalPosition(mainRest.p.x,mainRest.p.y+s.rise*.68+idle,mainRest.p.z);
    this.offset.setFromEulerAngles(0,this.reduced?0:(this.idle.yaw+Math.max(-.5,Math.min(.5,this.pointer.y)))*weight,0);this.q.mul2(mainRest.q,this.offset);this.main.setLocalRotation(this.q);
    this.masses.forEach((e,i)=>{
      const r=this.restByName.get(e.name),side=i%2===0?-1:1,row=Math.floor(i/2),v=s.separation;
      e.setLocalPosition(r.p.x+side*(1.95+row*.10)*v,r.p.y+[-.20,.05,.45][row]*v,r.p.z+[.12,-.05,.10][row]*v);
      this.offset.setFromEulerAngles((row-1)*1.2*v,side*5*v,side*.7*v);this.q.mul2(r.q,this.offset);e.setLocalRotation(this.q);
    });
    const coreRest=this.restByName.get('MOLTEN_CORE');this.core.setLocalScale(coreRest.s);this.core.enabled=coreRest.enabled&&s.separation<.10;
    this.fragments.forEach((e,i)=>{
      const r=this.restByName.get(e.name),f=phase(t,2+i*.17,3.5+i*.17),drift=this.reduced?0:.018*idleWave(this.idle.time-.55-i*.18)*phase(this.idle.time,0,2)*weight;
      e.setLocalPosition(r.p.x+[-.055,.025,.065][i]*f,r.p.y+[.12,.18,.09][i]*f+drift,r.p.z+[-.035,.02,.025][i]*f);
      this.offset.setFromEulerAngles(2*f,(i-1)*4*f,1.5*f);this.q.mul2(r.q,this.offset);e.setLocalRotation(this.q);
    });
    const pulse=this.reduced?0:(.014+.012*idleWave(this.idle.time-.35))*weight;
    for(const m of this.materials){
      const energy=m.tier==='core'?Math.max(s.chamber,s.pulse):s[m.tier];
      const coreFade=m.tier==='core'?1-phase(s.separation,0,.10):1;
      m.material.emissiveIntensity=m.base*(.18+energy*.82+pulse+(this.hover&&t===0?.10:0))*coreFade*(m.tier==='chamber'?cinematic.crucible:1);m.material.update();
    }
    for(const m of this.wallMaterials){
      const heat=(cinematic.wall-1)/2.2;
      m.material.emissiveMap=heat>0?this.core.render.meshInstances[0].material.emissiveMap:m.original.emissiveMap;
      m.material.emissive.set(m.color.r+heat*.55,m.color.g+heat*.77,m.color.b+heat*.50);
      m.material.emissiveIntensity=m.base*cinematic.wall;m.material.update();
    }
    for(const {e,side}of this.openSpill){e.setLocalPosition(side*(.95+1.3*s.separation),.65,.3);e.light.intensity=cinematic.spill;}
    for(const f of this.flows){
      const energy=f.entry.tier==='foundation'?s.foundation:f.entry.tier==='convergence'?s.convergence:s.chamber;
      for(let i=0;i<f.distances.length;i++){const c=Math.round(255*inwardHeat(f.distances[i],energy));f.colors[i*4]=c;f.colors[i*4+1]=c;f.colors[i*4+2]=c;f.colors[i*4+3]=255;}
      f.mesh.setColors32(f.colors);f.mesh.update();
    }
    for(const v of this.lights)v.light.intensity=v.intensity*(.18+.82*(v.pedestal?s.chamber:s.pulse)+(v.pedestal?pulse:0))*(v.pedestal?cinematic.crucible:1);
    this.contactLight.intensity+=this.lights.find(v=>v.light===this.contactLight).intensity*cinematic.underside;
    this.contactLight.shadowIntensity=this.contactShadow*cinematic.shadow;
    const r=this.restByName.get('CAMERA_HERO');
    const wideY=r.p.y+1.0*s.rise,wideZ=r.p.z+3.4*s.rise;
    if(!this.cameraTravel||this.reduced||s.camera===0){this.camera.setLocalPosition(r.p.x,wideY,wideZ);this.camera.setLocalRotation(r.q);}
    else{
      const a=phase(s.camera,0,.42),b=phase(s.camera,.42,1);
      this.camera.setLocalPosition(r.p.x*(1-a),wideY*(1-a)+.55*a,wideZ+(3.5-wideZ)*a-6.1*b);
      this.q.slerp(r.q,Quat.IDENTITY,a);this.camera.setLocalRotation(this.q);
    }
  }
  updateState(){
    const t=this.clock.time;let state=this.clock.direction<0&&t>0?'MONO_RESET':t===DURATION?'MONO_OPENED':t===0&&this.clock.direction===0?'MONO_DORMANT':t<4.6?'MONO_ACTIVATE':'MONO_OPEN';
    if(t===0&&this.clock.direction===0&&this.hover)state=Math.abs(this.pointer.x)+Math.abs(this.pointer.y)>.05?'MONO_POINTER':'MONO_HOVER';
    if(state!==this.state){this.state=state;this.app.fire('MI_STATE_CHANGE',{state,time:t});console.info(`MI_STATE ${state}`);}
    const label=`${this.clock.paused?'Paused Â· ':''}${state.replace('MONO_','').toLowerCase()} Â· Enter awaken Â· Esc reverse Â· Space pause Â· R reset Â· S skip Â· F camera Â· M motion`;
    if(this.status&&this.status.textContent!==label)this.status.textContent=label;
  }
  report(action){
    let maxError=0;for(const r of this.rest){const p=r.e.getLocalPosition(),q=r.e.getLocalRotation(),s=r.e.getLocalScale();maxError=Math.max(maxError,p.distance(r.p),s.distance(r.s),1-Math.abs(q.x*r.q.x+q.y*r.q.y+q.z*r.q.z+q.w*r.q.w));}
    const mainRest=this.restByName.get('MONOLITH_MAIN');let assemblyError=0;
    for(const e of this.masses){const r=this.restByName.get(e.name);assemblyError=Math.max(assemblyError,e.getLocalPosition().distance(r.p));}
    console.info('MI_REPORT '+JSON.stringify({action,state:this.state,time:this.clock.time,velocity:this.clock.velocity,paused:this.clock.paused,reduced:this.reduced,cameraTravel:this.cameraTravel,maxRestError:maxError,assemblyError,idleTime:this.idle.time,idleHeight:this.main.getLocalPosition().y-mainRest.p.y,idleYaw:this.idle.yaw,shadowIntensity:this.contactLight.shadowIntensity,coreEnabled:this.core.enabled,energy:sampleCinematicEnergy(this.clock.time,this.idle.y,this.reduced),wallInstances:this.wallMaterials.length,cameraPosition:this.camera.getPosition().toArray()}));
  }
  cleanup(){
    this.restorePose();for(const f of this.flows){f.entry.instance.mesh=f.originalMesh;f.mesh.destroy();}
    for(const m of this.materials){m.instance.material=m.original;m.material.destroy();}
    for(const v of this.lights)v.light.intensity=v.intensity;
    this.contactLight.shadowIntensity=this.contactShadow;
    for(const m of this.wallMaterials){m.instance.material=m.original;m.material.destroy();}this.openSpill.forEach(v=>v.e.destroy());
    this.events.forEach(e=>e.off());this.domEvents.forEach(off=>off());this.ui?.remove();
  }
}