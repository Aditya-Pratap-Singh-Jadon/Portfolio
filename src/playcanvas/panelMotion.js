// Exact critically damped spring: selection changes the target, never position or velocity.
export class PanelMotion {
  constructor(count){
    if(!Number.isInteger(count)||count<1)throw new RangeError('Invalid panel count');
    this.values=Array(count).fill(0);this.velocities=Array(count).fill(0);
    this.selected=null;this.reduced=false;
  }
  select(index){
    if(index!==null&&(!Number.isInteger(index)||index<0||index>=this.values.length))throw new RangeError('Invalid panel index');
    this.selected=index;if(this.reduced)this.resolve();
  }
  setReduced(value){this.reduced=Boolean(value);if(this.reduced)this.resolve();}
  resolve(){this.values=this.values.map((_,i)=>i===this.selected?1:0);this.velocities.fill(0);}
  update(dt){
    if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid delta time');
    if(this.reduced)return;
    const omega=12,decay=Math.exp(-omega*dt);
    for(let i=0;i<this.values.length;i++){
      const target=i===this.selected?1:0,error=this.values[i]-target;
      const c=this.velocities[i]+omega*error;
      this.values[i]=target+(error+c*dt)*decay;
      this.velocities[i]=(this.velocities[i]-omega*c*dt)*decay;
      if(Math.abs(this.values[i]-target)<1e-7&&Math.abs(this.velocities[i])<1e-7){this.values[i]=target;this.velocities[i]=0;}
    }
  }
}
