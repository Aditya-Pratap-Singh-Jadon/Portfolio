export const DURATION=10.8;
const clamp=x=>Math.max(0,Math.min(1,x));
export function phase(time,start,end){const x=clamp((time-start)/(end-start));return x*x*x*(10+x*(-15+6*x));}
export function sampleAwakening(t){return {
  foundation:phase(t,0,1.2),convergence:phase(t,.7,2),chamber:phase(t,1.4,2.7),
  fragments:phase(t,2,3.4),rise:phase(t,2.8,4.4),pulse:phase(t,4,4.7),
  separation:phase(t,4.6,6.4),camera:phase(t,6.4,DURATION)
};}
export function inwardHeat(distance,progress){return .06+.94*phase(progress,1-clamp(distance)-.12,1-clamp(distance)+.12);}
export function idleWeight(time,reduced){return reduced?0:1-phase(time,0,2.8);}
export function idleWave(time){return Math.sin(2*Math.PI*time/8.2+.08*Math.sin(time*.17));}
export function sampleCinematicEnergy(time,height,reduced){
  const s=sampleAwakening(time),weight=idleWeight(time,reduced),lift=reduced?0:Math.max(-1,Math.min(1,height/.12));
  return {wall:1+2.2*phase(s.separation,.02,.65),spill:.6*phase(s.separation,.02,.65),
    crucible:1+.22*s.chamber+.35*phase(time,.3,2.5)*(1-phase(time,4.4,6.4)),
    underside:weight*(.055+.035*lift),shadow:1-weight*(.11+.07*lift)};
}
export class IdleLevitation {
  constructor(){this.time=0;this.y=0;this.yaw=0;this.vy=0;this.vyaw=0;}
  advance(dt,hidden=false){
    if(hidden||!Number.isFinite(dt)||dt<=0)return this;
    // Small fixed upper step keeps target sampling stable after a stalled frame.
    let remaining=Math.min(dt,.1);
    while(remaining>1e-8){
      const step=Math.min(remaining,1/120);this.time+=step;remaining-=step;
      const targets={y:.12*idleWave(this.time),yaw:3*Math.sin(2*Math.PI*this.time/17+.12*Math.sin(this.time*.09))};
      for(const key of ['y','yaw']){
        const velocity=key==='y'?'vy':'vyaw',delta=this[key]-targets[key],c=this[velocity]+2*delta,decay=Math.exp(-2*step);
        this[key]=targets[key]+(delta+c*step)*decay;this[velocity]=(this[velocity]-2*c*step)*decay;
      }
    }
    return this;
  }
}
export class AwakeningClock {
  constructor(){this.reset();}
  drive(direction){if(direction!==1&&direction!==-1)throw new TypeError('Expected opening or closing direction');this.direction=direction;this.paused=false;}
  pause(){this.paused=!this.paused;}
  reset(){this.time=0;this.velocity=0;this.direction=0;this.paused=false;}
  seek(time){this.time=Math.max(0,Math.min(DURATION,time));this.velocity=0;this.direction=0;this.paused=false;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    const desired=this.paused?0:this.direction===1?1:this.direction===-1?-2.8:0;
    const decay=Math.exp(-dt/.25),old=this.velocity;
    this.velocity=desired+(old-desired)*decay;
    this.time+=desired*dt+(old-desired)*.25*(1-decay);
    if(this.time>=DURATION){this.time=DURATION;this.velocity=0;}
    if(this.time<=0){this.time=0;this.velocity=0;}
    if(desired===0&&Math.abs(this.velocity)<1e-5)this.velocity=0;
  }
}