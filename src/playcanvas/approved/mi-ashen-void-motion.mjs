import { phase, DURATION } from './mi-awakening-motion.mjs';
export function sampleEnvironment(time){
  const bound=x=>Math.max(0,Math.min(1,x));
  const ember=bound(phase(time,1.2,3.2)),crucible=bound(phase(time,3.2,5.5)),ground=bound(phase(time,5.2,8.7)),atmosphere=bound(phase(time,8.4,DURATION));
  return {ember,crucible,ground,atmosphere,exposure:bound(.002+.028*ember+.18*crucible+.79*ground)};
}
export function environmentState(t){return t<1.2?'DARKNESS':t<3.2?'EMBER':t<5.2?'CRUCIBLE_REVEAL':t<8.7?'GROUND_REVEAL':'ATMOSPHERIC_SETTLE';}
export function groundPulse(radius,time){
  if(time<0||time>2.8)return 0;
  const center=1.6+time/2.8*4.2,envelope=phase(time,0,.25)*(1-phase(time,2.2,2.8));
  return envelope*Math.exp(-Math.pow((radius-center)/.42,2));
}

