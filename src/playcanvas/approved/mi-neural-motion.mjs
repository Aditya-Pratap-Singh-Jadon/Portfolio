import { PanelMotion } from '../panelMotion.js';

export const nodeName=index=>`NODE_SLOT_${String(index+1).padStart(2,'0')}`;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
const ZERO=Object.freeze({y:0,pitch:0,yaw:0,roll:0});

export class NeuralMotion {
  constructor(routes){
    this.routes=routes;this.focus=new PanelMotion(15);this.idleEnvelope=new PanelMotion(1);this.idleEnvelope.select(0);this.time=0;this.idle=true;this.age=Infinity;
  }
  get selected(){return this.focus.selected;}
  get reduced(){return this.focus.reduced;}
  get settled(){return this.focus.values.every((v,i)=>v===(i===this.selected?1:0))&&(this.idle||this.reduced||this.idleEnvelope.values[0]===0);}
  get exactRest(){return this.selected===null&&this.settled&&(!this.idle||this.reduced);}
  select(index){this.focus.select(index);this.age=index===null?Infinity:0;if(index===null){this.idle=false;this.idleEnvelope.select(null);}}
  reset(){this.select(null);}
  resumeIdle(){this.select(null);this.idle=true;this.idleEnvelope.select(0);}
  setReduced(value){
    this.focus.setReduced(value);this.idleEnvelope.setReduced(value);
    if(!value){this.idleEnvelope.select(null);this.idleEnvelope.resolve();if(this.idle)this.idleEnvelope.select(0);}
  }
  update(dt){
    if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid neural delta time');
    this.focus.update(dt*.64);this.idleEnvelope.update(dt*.64);
    if(!this.reduced)this.time+=dt;
    if(this.selected!==null)this.age+=dt;
  }
  neighbors(){
    if(this.selected===null)return [];
    const name=nodeName(this.selected),neighbors=[];
    for(const route of this.routes){if(route.from===name)neighbors.push(route.to);else if(route.to===name)neighbors.push(route.from);}
    return neighbors;
  }
  duration(route){return 1.35+Math.min(1.4,route.length*.22);}
  pulse(index){
    if(this.reduced||this.selected===null)return null;
    const route=this.routes[index],name=nodeName(this.selected);
    if(route.from!==name&&route.to!==name)return null;
    const progress=clamp((this.age-.12)/this.duration(route));if(progress>=1)return null;
    return {progress,reverse:route.to===name,strength:smooth(progress/.08)*smooth((1-progress)/.12)};
  }
  arrival(name){
    if(this.selected===null)return 0;
    if(nodeName(this.selected)===name)return 1;
    const selected=nodeName(this.selected),route=this.routes.find(r=>(r.from===selected&&r.to===name)||(r.to===selected&&r.from===name));
    if(!route)return 0;
    return this.reduced?1:smooth((this.age-.12-this.duration(route))/.4);
  }
  idlePose(index,cluster){
    if(this.reduced)return ZERO;
    const emphasis=Math.max(...this.focus.values),weight=(1-emphasis)*this.idleEnvelope.values[0];if(weight<1e-7)return ZERO;
    const phase=cluster*1.7+index*.49,t=this.time;
    return {y:weight*(.022*Math.sin(t*.31+phase)+.006*Math.sin(t*.17+phase*1.4)),pitch:weight*.14*Math.sin(t*.22+phase-.7),yaw:weight*.34*Math.sin(t*.24+phase-.95),roll:weight*.1*Math.sin(t*.19+phase-1.3)};
  }
}
