import {PanelMotion} from '../panelMotion.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};

export class AccentSelection {
 constructor(count,trace=false){this.focus=new PanelMotion(count);this.trace=trace;this.selected=null;this.age=0;this.time=0;this.exactRest=false;this.paused=false;}
 get reduced(){return this.focus.reduced;}
 get duration(){return .48+(this.selected??0)*.13;}
 get pulse(){return this.trace&&this.selected!==null&&!this.reduced&&this.age<this.duration?this.age/this.duration:null;}
 get settled(){return this.pulse===null&&this.focus.values.every((v,i)=>v===(i===this.selected?1:0));}
 select(index){if(index!==null&&(!Number.isInteger(index)||index<0||index>=this.focus.values.length))throw new RangeError('Invalid accent selection');this.selected=index;this.age=0;this.exactRest=false;this.focus.select(this.trace&&!this.reduced?null:index);}
 reset(){this.selected=null;this.age=0;this.exactRest=true;this.paused=false;this.focus.select(null);}
 setReduced(value){this.focus.setReduced(value);if(this.reduced)this.focus.select(this.selected);}
 update(dt){if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid delta time');if(this.paused)return;this.time+=dt;const beforeAge=this.age;if(this.selected!==null)this.age+=dt;if(this.trace&&this.selected!==null&&this.age>=this.duration&&this.focus.selected!==this.selected){const before=Math.max(0,this.duration-beforeAge);this.focus.update(before*.72);this.focus.select(this.selected);this.focus.update(Math.max(0,dt-before)*.72);}else this.focus.update(dt*.72);}
}

export class NexusMotion {
 constructor(){this.spring=new PanelMotion(1);this.target=0;this.paused=false;this.awakening=0;this.contactReady=false;}
 get progress(){return this.spring.values[0];}
 get reduced(){return this.spring.reduced;}
 get state(){return this.paused?'paused':this.progress===this.target?(this.target?(this.contactReady?'assembled':'awakening'):'separated'):(this.target?'assembling':'separating');}
 command(target){this.target=target;this.awakening=0;this.contactReady=false;this.spring.select(target?0:null);if(this.reduced&&target){this.awakening=1;this.contactReady=true;}}
 assemble(){if(this.target!==1)this.command(1);}
 separate(){if(this.target!==0)this.command(0);}
 pause(value){this.paused=Boolean(value);}
 reset(){this.target=0;this.paused=false;this.awakening=0;this.contactReady=false;this.spring.select(null);this.spring.resolve();}
 setReduced(value){this.spring.setReduced(value);if(this.reduced&&this.target){this.awakening=1;this.contactReady=true;}}
 update(dt){if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid delta time');if(this.paused)return;const wasAligned=this.progress===1;this.spring.update(dt*.42);if(Math.abs(this.progress-this.target)<1e-5&&Math.abs(this.spring.velocities[0])<1e-4){this.spring.resolve();}if(wasAligned&&this.target){this.awakening=Math.min(1,this.awakening+dt/1.05);this.contactReady=this.awakening===1;}}
}

// Rotations relax in open space. All pieces share the same final contraction to protect jagged boundaries.
export function nexusPose(fragment,progress,index){
 if(progress===0)return fragment.separated;if(progress===1)return fragment.assembled;
 const stagger=[0,.025,.01,.035,.018,.005,.03,.012][index],p=smooth((progress-stagger)/(1-stagger)),turn=smooth(p/.30),travel=smooth((p-.13)/.87);
 return {position:fragment.assembled.position.map((v,i)=>v+(fragment.separated.position[i]-v)*(1-travel)),rotation:fragment.separated.rotation.map(v=>v*(1-turn)),scale:[1,1,1]};
}

export function projectPath(point,path){
 let total=0,best=Infinity,along=0,offset=0;const lengths=path.slice(1).map((p,i)=>Math.hypot(p[0]-path[i][0],p[1]-path[i][1]));total=lengths.reduce((a,b)=>a+b,0);
 for(let i=0;i<lengths.length;i++){const a=path[i],b=path[i+1],dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(lengths[i]**2)),d=(point[0]-a[0]-t*dx)**2+(point[1]-a[1]-t*dy)**2;if(d<best){best=d;along=offset+t*lengths[i];}offset+=lengths[i];}return along/total;
}
