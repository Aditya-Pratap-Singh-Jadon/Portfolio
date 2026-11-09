import { PanelMotion } from '../panelMotion.js';

// One foreground owner: a new request waits for the outgoing slab to reassemble.
export class ForgeMotion {
  constructor(){this.spring=new PanelMotion(1);this.selected=null;this.active=null;}
  get progress(){return this.spring.values[0];}
  get reduced(){return this.spring.reduced;}
  get settled(){return this.active===this.selected&&this.progress===(this.selected===null?0:1);}
  select(index){
    if(index!==null&&(!Number.isInteger(index)||index<0||index>=6))throw new RangeError('Invalid forge slot');
    this.selected=index;
    if(this.reduced){this.active=index;this.spring.select(index===null?null:0);return;}
    if(this.active===null)this.active=index;
    this.spring.select(this.active!==null&&this.active===this.selected?0:null);
  }
  setReduced(value){this.spring.setReduced(value);if(this.reduced)this.select(this.selected);}
  update(dt){
    this.spring.update(dt*.6);
    const target=this.active!==null&&this.active===this.selected?1:0;
    if(Math.abs(this.progress-target)<1e-5&&Math.abs(this.spring.velocities[0])<1e-4)this.spring.resolve();
    if(this.progress===0&&this.active!==this.selected){this.active=this.selected;this.spring.select(this.active===null?null:0);}
  }
}

const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,p)=>{const t=Math.max(0,Math.min(1,(p-a)/(b-a)));return t*t*(3-2*t);};
export function sampleForgePose(rest,index,active,progress,{focusDistance,backdropDistance,focusY}){
  if(progress===0||active===null)return {position:rest.slice(),turn:0};
  const lift=smooth(0,.24,progress),park=smooth(.24,.5,progress),center=smooth(.5,1,progress);
  if(index!==active){
    const ratio=backdropDistance/focusDistance,column=[-1,0,1,-1,0,1][index],row=[1,2,1,0,1,0][index];
    const parkX=column*(2.05*ratio+2.6),parkY=focusY*ratio+row*(1.3*ratio+2.2);
    return {position:[mix(rest[0],parkX,park),mix(rest[1],parkY,park),mix(rest[2],-backdropDistance,lift)],turn:0};
  }
  return {position:[mix(rest[0],0,center),mix(rest[1],focusY,center),mix(rest[2],-focusDistance,lift)],turn:smooth(.28,.85,progress)};
}
