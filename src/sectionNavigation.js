export const destinations = Object.freeze({
  about: {title:'Origin',scene:null},
  projects: {title:'Forge',scene:'MI_03_PROJECT_FORGE'},
  experience: {title:'Chronicle',scene:'MI_05_CHRONICLE_FAULT'},
  skills: {title:'Skills',scene:'MI_04_NEURAL_CORE'},
  github: {title:'GitHub',scene:null},
  linkedin: {title:'Signal',scene:null},
  achievements: {title:'Vault',scene:'MI_05_VAULT_DISPLAY'},
  contact: {title:'Nexus',scene:'MI_05_NEXUS_REASSEMBLY'},
});

// The view owns loading/resources; tokens prevent cancelled loads completing a newer visit.
export class SectionNavigation {
  constructor(){
    this.chamber=false;this.reduced=false;this.sequence=0;this.queued=null;
    this.state={phase:'gateway',destination:null,progress:0,token:0,ready:false,error:false};
  }
  setChamber(value){
    this.chamber=Boolean(value);
    if(!this.state.destination)this.state.phase=this.chamber?'command-center':'gateway';
  }
  setReduced(value){this.reduced=Boolean(value);}
  enter(destination){
    if(!Object.hasOwn(destinations,destination))throw new RangeError('Unknown portfolio destination');
    if(this.state.destination===destination){
      this.queued=null;if(this.state.phase==='returning')this.state.phase='entering';return this.state.token;
    }
    if(this.state.destination&&this.state.progress>0){
      this.queued=destination;this.state.phase='returning';return null;
    }
    this.queued=null;
    this.state={phase:'entering',destination,progress:0,token:++this.sequence,ready:false,error:false};
    return this.state.token;
  }
  ready(token){
    if(token!==this.state.token||!this.state.destination||this.state.phase==='returning')return false;
    this.state.ready=true;this.state.error=false;return true;
  }
  fail(token){
    if(token!==this.state.token||!this.state.destination||this.state.phase==='returning')return false;
    Object.assign(this.state,{phase:'entering',progress:0,ready:false,error:true});return true;
  }
  retry(){
    if(!this.state.destination)return null;
    this.state={...this.state,phase:'entering',progress:0,ready:false,error:false,token:++this.sequence};
    return this.state.token;
  }
  back(){
    const accepted=Boolean(this.state.destination)&&(this.state.phase!=='returning'||this.queued!==null);
    this.queued=null;
    if(this.state.destination){this.state.phase='returning';this.state.error=false;}
    return accepted;
  }
  update(dt){
    if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid navigation delta');
    const s=this.state,step=this.reduced?1:Math.min(dt,.1)/.8;
    if(s.phase==='entering'&&s.ready){
      s.progress=Math.min(1,s.progress+step);
      if(s.progress===1)s.phase='active';
    }else if(s.phase==='returning'){
      s.progress=Math.max(0,s.progress-step);
      if(s.progress===0){
        const next=this.queued;this.queued=null;
        this.state={phase:this.chamber?'command-center':'gateway',destination:null,progress:0,token:++this.sequence,ready:false,error:false};
        if(next)this.enter(next);
      }
    }
    return this.state;
  }
}
