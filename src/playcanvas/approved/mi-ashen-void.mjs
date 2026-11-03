import { Script, Mesh, BLEND_NORMAL } from 'playcanvas';
import { AwakeningClock, DURATION } from './mi-awakening-motion.mjs';
import { sampleEnvironment, environmentState, groundPulse } from './mi-ashen-void-motion.mjs';

export class MiAshenVoid extends Script {
  static scriptName='miAshenVoid';
  initialize(){
    this.clock=new AwakeningClock();this.clock.drive(1);this.ambientTime=0;this.pulseTime=-1;
    this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.low=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory!==undefined&&navigator.deviceMemory<=4);
    this.baseExposure=this.app.scene.exposure;this.baseFogDensity=this.app.scene.fog.density;
    this.camera=this.app.root.findByName('CAMERA_HERO');this.materials=[];this.assignments=[];this.events=[];this.listeners=[];
    this.renders=this.entity.findComponents('render');this.ash=this.renders.filter(r=>/^ENV_ASH_/.test(r.entity.name)).map((r,i)=>({e:r.entity,p:r.entity.getLocalPosition().clone(),q:r.entity.getLocalRotation().clone(),i}));
    const copies=new Map();
    for(const render of this.renders){
      const name=render.entity.name,kind=name==='ENV_BASALT_GROUND'?'ground':name.startsWith('ENV_SCATTER')?'scatter':name.startsWith('ENV_ASH_')?'ash':name.startsWith('ENV_HAZE_')?'haze':'fracture';
      for(const instance of render.meshInstances){
        const original=instance.material,key=original.id+kind;let entry=copies.get(key);
        if(!entry){const material=original.clone();material.blendType=BLEND_NORMAL;material.depthWrite=false;material.update();entry={kind,material,opacity:original.opacity,emission:original.emissiveIntensity};copies.set(key,entry);this.materials.push(entry);}
        this.assignments.push({instance,original});instance.material=entry.material;
      }
    }
    this.flows=[];
    const fractures=this.renders.find(r=>r.entity.name==='ENV_GROUND_FRACTURES');
    for(const instance of fractures.meshInstances){
      const original=instance.mesh,positions=[],normals=[],uvs=[],indices=[];
      original.getPositions(positions);original.getNormals(normals);original.getUvs(0,uvs);original.getIndices(indices);
      const mesh=new Mesh(this.app.graphicsDevice),colors=new Uint8Array(positions.length/3*4);colors.fill(255);
      mesh.setPositions(positions);mesh.setNormals(normals);mesh.setUvs(0,uvs);if(indices.length)mesh.setIndices(indices);mesh.setColors32(colors);mesh.update();instance.mesh=mesh;
      instance.material.diffuseVertexColor=false;instance.material.emissiveVertexColor=true;instance.material.emissiveVertexColorChannel='rgb';instance.material.update();
      this.flows.push({instance,original,mesh,colors,radii:Array.from({length:positions.length/3},(_,i)=>Math.hypot(positions[i*3],positions[i*3+2]))});
    }
    this.lights=this.entity.findComponents('light').map(light=>({light,intensity:light.intensity,warm:light.entity.name==='ENV_CRUCIBLE_WARM'}));
    this.bind('MI_ENV_REVEAL',()=>this.reveal());this.bind('MI_ENV_REVERSE',()=>this.reverse());this.bind('MI_ENV_DARKNESS',()=>this.darkness());this.bind('MI_ENV_SHOW',()=>this.show());this.bind('MI_ENV_PAUSE',()=>this.pause());this.bind('MI_ENV_PULSE',()=>this.pulse());
    this.bind('MI_ENV_LOW_PERFORMANCE',v=>{if(typeof v==='boolean')this.setLow(v);});this.bind('MI_ENV_REDUCED_MOTION',v=>{if(typeof v==='boolean')this.setReduced(v);});
    this.buildControls();this.listen(window,'keydown',e=>this.key(e));
    this.on('disable',()=>{this.app.scene.exposure=this.baseExposure;this.app.scene.fog.density=this.baseFogDensity;this.ui.hidden=true;});
    this.on('enable',()=>{this.ui.hidden=false;this.apply();});this.on('destroy',()=>this.cleanup());
    if(this.reduced)this.clock.seek(DURATION);this.apply();this.report('initialized');
  }
  bind(name,callback){this.events.push(this.app.on(name,callback));}
  listen(target,name,callback){target.addEventListener(name,callback);this.listeners.push(()=>target.removeEventListener(name,callback));}
  reveal(){this.clock.drive(1);if(this.reduced)this.clock.seek(DURATION);this.apply();this.report('reveal accepted');}
  reverse(){if(this.reduced){this.darkness();return;}this.clock.drive(-1);this.apply();this.report('reverse accepted');}
  darkness(){this.clock.reset();this.ambientTime=0;this.pulseTime=-1;this.apply();this.report('exact darkness');}
  show(){this.clock.seek(DURATION);this.pulseTime=-1;this.apply();this.report('settled preview');}
  pause(){this.clock.pause();this.apply();this.report('pause accepted');}
  pulse(){if(this.reduced){this.report('pulse suppressed for reduced motion');return;}this.pulseTime=0;this.report('independent ground pulse');}
  setLow(value){this.low=value;this.apply();this.report('quality changed');}
  setReduced(value){this.reduced=value;if(value)this.show();this.apply();this.report('motion preference');}
  buildControls(){
    this.ui=document.createElement('section');this.ui.setAttribute('aria-label','Ashen Void environment preview');
    Object.assign(this.ui.style,{position:'fixed',right:'12px',top:'12px',zIndex:30,maxWidth:'min(380px,calc(100vw - 24px))',padding:'10px',background:'rgba(8,8,8,.92)',color:'#e8e2d9',font:'12px system-ui',border:'1px solid #41362d'});
    this.status=document.createElement('div');this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');this.status.style.marginBottom='7px';this.ui.append(this.status);
    const row=document.createElement('div');Object.assign(row.style,{display:'flex',gap:'5px',flexWrap:'wrap'});this.ui.append(row);
    for(const [label,action]of[['Reveal',()=>this.reveal()],['Reverse',()=>this.reverse()],['Darkness',()=>this.darkness()],['Show settled',()=>this.show()],['Pause',()=>this.pause()],['Ground pulse',()=>this.pulse()],['Low performance',()=>this.setLow(!this.low)],['Reduced motion',()=>this.setReduced(!this.reduced)]]){
      const b=document.createElement('button');b.type='button';b.textContent=label;Object.assign(b.style,{background:'#171717',color:'#e8e2d9',border:'1px solid #655044',padding:'7px 9px',cursor:'pointer'});b.addEventListener('click',action);row.append(b);if(label==='Low performance')this.lowButton=b;if(label==='Reduced motion')this.motionButton=b;
    }
    document.body.append(this.ui);
  }
  key(e){
    if(e.defaultPrevented||e.repeat||e.ctrlKey||e.metaKey||e.altKey||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;
    const actions={g:()=>this.reveal(),v:()=>this.reverse(),b:()=>this.darkness(),h:()=>this.show(),u:()=>this.pause(),j:()=>this.pulse(),l:()=>this.setLow(!this.low),n:()=>this.setReduced(!this.reduced),o:()=>this.report('diagnostic')};
    const action=actions[e.key.toLowerCase()];if(action){e.preventDefault();action();}
  }
  update(dt){
    this.clock.advance(dt);
    if(!this.clock.paused&&!this.reduced){this.ambientTime+=Math.max(0,dt);if(this.pulseTime>=0){this.pulseTime+=Math.max(0,dt);if(this.pulseTime>2.8)this.pulseTime=-1;}}
    this.apply();
  }
  apply(){
    const s=sampleEnvironment(this.clock.time),pulse=this.pulseTime<0?0:Math.sin(Math.min(1,this.pulseTime/2.8)*Math.PI);
    this.app.scene.exposure=this.baseExposure*s.exposure;
    this.app.scene.fog.density=this.baseFogDensity*(.30+.70*s.ground);
    for(const entry of this.materials){
      const level=entry.kind==='haze'?s.atmosphere:entry.kind==='ash'?s.atmosphere:entry.kind==='fracture'?s.ground:s.ground;
      entry.material.opacity=entry.opacity*level;
      if(entry.kind==='fracture')entry.material.emissiveIntensity=entry.emission*s.ground*(1+2.5*pulse);
      entry.material.update();
    }
    for(const {light,intensity,warm}of this.lights)light.intensity=intensity*(warm?s.crucible*(1+pulse*.35):s.ground);
    const detail=this.entity.findByName('ENV_SCATTER_DETAIL');detail.enabled=!this.low;
    for(const v of this.ash){
      v.e.enabled=!this.low||v.i<6;
      const drift=this.reduced?0:s.atmosphere,t=this.ambientTime;
      v.e.setLocalPosition(v.p.x+Math.sin(t*.09+v.i)*.065*drift,v.p.y+Math.sin(t*.055+v.i*.8)*.09*drift,v.p.z+Math.sin(t*.07+v.i*.6)*.025*drift);
      v.e.lookAt(this.camera.getPosition());
    }
    const haze=this.entity.findByName('ASH_HAZE');haze.enabled=!this.low;
    for(const r of this.renders.filter(r=>r.entity.name.startsWith('ENV_HAZE_')))r.entity.lookAt(this.camera.getPosition());
    for(const f of this.flows){
      for(let i=0;i<f.radii.length;i++){const c=Math.round(255*(.12+.88*groundPulse(f.radii[i],this.pulseTime)));f.colors[i*4]=c;f.colors[i*4+1]=c;f.colors[i*4+2]=c;f.colors[i*4+3]=255;}
      f.mesh.setColors32(f.colors);f.mesh.update();
    }
    const state=environmentState(this.clock.time);if(state!==this.state){this.state=state;this.app.fire('MI_ENV_STATE_CHANGE',{state,time:this.clock.time});console.info('MI_ENV_STATE '+state);}
    const label=`Ashen Void Â· ${this.clock.paused?'paused Â· ':''}${state.toLowerCase().replaceAll('_',' ')} Â· G reveal / V reverse / B dark / H settled / J pulse / U pause`;
    if(this.status.textContent!==label)this.status.textContent=label;this.lowButton.setAttribute('aria-pressed',String(this.low));this.motionButton.setAttribute('aria-pressed',String(this.reduced));
  }
  report(action){console.info('MI_ENV_REPORT '+JSON.stringify({action,state:this.state,time:this.clock.time,velocity:this.clock.velocity,paused:this.clock.paused,exposure:this.app.scene.exposure,low:this.low,reduced:this.reduced,activeAsh:this.ash.filter(v=>v.e.enabled).length,pulseTime:this.pulseTime,physicalUnits:this.app.scene.physicalUnits}));}
  cleanup(){
    this.app.scene.exposure=this.baseExposure;this.app.scene.fog.density=this.baseFogDensity;
    for(const f of this.flows){f.instance.mesh=f.original;f.mesh.destroy();}for(const a of this.assignments)a.instance.material=a.original;for(const m of this.materials)m.material.destroy();
    for(const l of this.lights)l.light.intensity=l.intensity;for(const a of this.ash){a.e.setLocalPosition(a.p);a.e.setLocalRotation(a.q);a.e.enabled=true;}
    this.events.forEach(e=>e.off());this.listeners.forEach(off=>off());this.ui.remove();
  }
}

