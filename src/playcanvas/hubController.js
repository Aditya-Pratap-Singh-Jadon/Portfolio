import { Vec3, Quat, Mat4 } from 'playcanvas';
import { PanelMotion } from './panelMotion.js';

export const HUB_PANELS = [
  ['ABOUT', 'Origin', 2.65, 1.6], ['PROJECTS', 'Forge', 3.05, 1.9],
  ['EXPERIENCE', 'Chronicle', 2.9, 1.65], ['SKILLS', 'Neural Core', 3, 1.9],
  ['GITHUB', 'GitHub', 2.65, 1.5], ['LINKEDIN', 'Signal', 2.7, 1.5],
  ['ACHIEVEMENTS', 'Vault', 2.6, 1.5], ['CONTACT', 'Nexus', 2.65, 1.45],
];

// Website-only transforms and cloned materials; the exported scene stays immutable.
export class HubController {
  constructor(app) {
    this.app=app;
    this.camera=this.required('CAMERA_HUB');
    this.cameraRest=this.camera.getLocalPosition().clone();
    this.motion=new PanelMotion(8);
    this.hoverMotion=new PanelMotion(8);
    this.panels=HUB_PANELS.map(([name,title,width,height])=>{
      const e=this.required('PANEL_'+name);
      return {e,title,width,height,p:e.getLocalPosition().clone(),q:e.getLocalRotation().clone(),s:e.getLocalScale().clone(),materials:this.materials(e)};
    });
    this.atmosphere=this.materials(this.required('HUB_ATMOSPHERE'));
  }
  required(name) {const e=this.app.root.findByName(name);if(!e)throw new Error('MI_02 missing '+name);return e;}
  materials(root) {
    return root.findComponents('render').flatMap(render=>render.meshInstances.map(instance=>{
      const original=instance.material;
      return {instance,original,clone:original.clone(),opacity:original.opacity,emission:original.emissiveIntensity,face:render.entity.name.endsWith('_GLASS')};
    }));
  }
  select(index) {this.motion.select(index);this.hoverMotion.select(null);}
  hover(index) {this.hoverMotion.select(this.motion.selected===null?index:null);}
  setReduced(value) {this.motion.setReduced(value);this.hoverMotion.setReduced(value);if(value)this.hoverMotion.select(null);}
  resize(width,height) {
    const aspect=width/height;
    this.camera.setLocalPosition(this.cameraRest.x,this.cameraRest.y,this.cameraRest.z+Math.max(0,1.55/aspect-1)*12);
  }
  pick(clientX,clientY) {
    const {graphicsDevice:device}=this.app,rect=device.canvas.getBoundingClientRect();
    const x=(clientX-rect.left)*device.width/rect.width,y=(clientY-rect.top)*device.height/rect.height;
    const near=this.camera.camera.screenToWorld(x,y,this.camera.camera.nearClip),far=this.camera.camera.screenToWorld(x,y,this.camera.camera.farClip);
    let selected=null,distance=Infinity;
    this.panels.forEach((p,i)=>{
      if(!p.e.enabled)return;
      const inverse=new Mat4().invert(p.e.getWorldTransform()),a=inverse.transformPoint(near),b=inverse.transformPoint(far),dz=b.z-a.z;
      if(Math.abs(dz)<1e-8)return;
      const t=-a.z/dz;if(t<0||t>1)return;
      const hit=new Vec3().lerp(a,b,t);
      if(Math.abs(hit.x)>p.width/2||Math.abs(hit.y)>p.height/2)return;
      const d=p.e.getWorldTransform().transformPoint(hit).distance(near);
      if(d<distance){distance=d;selected=i;}
    });
    return selected;
  }
  shade(entries,focus,background) {
    for(const m of entries) {
      if(focus===0&&background===0){m.instance.material=m.original;continue;}
      m.instance.material=m.clone;
      m.clone.opacity=m.opacity*(1-.82*background);
      if(m.face)m.clone.opacity+=Math.max(0,.94-m.opacity)*focus;
      m.clone.emissiveIntensity=m.emission*(1+focus*.25-background*.85);m.clone.update();
    }
  }
  update(dt) {
    this.motion.update(dt);this.hoverMotion.update(dt);
    const total=this.motion.values.reduce((a,b)=>a+b,0);
    this.panels.forEach((p,i)=>{
      const focus=this.motion.values[i],background=Math.min(1,Math.max(0,total-focus));
      p.e.setLocalPosition(p.p);p.e.setLocalRotation(p.q);p.e.setLocalScale(p.s);
      if(focus||background) {
        const camera=this.camera.camera,device=this.app.graphicsDevice,aspect=device.width/device.height;
        const tan=Math.tan(camera.fov*Math.PI/360),tanY=camera.horizontalFov?tan/aspect:tan,tanX=camera.horizontalFov?tan:tan*aspect;
        const scale=p.e.parent.getWorldTransform().getScale();
        const distance=Math.max(5.5,p.width*p.s.x*scale.x/(2*tanX*.7),p.height*p.s.y*scale.y/(2*tanY*.55));
        const inverse=new Mat4().invert(p.e.parent.getWorldTransform());
        const world=this.camera.getPosition().clone().add(this.camera.forward.clone().mulScalar(distance));
        if(aspect<1)world.add(this.camera.up.clone().mulScalar(distance*tanY*.45));
        const target=inverse.transformPoint(world),recede=inverse.transformVector(this.camera.forward.clone().mulScalar(4));
        p.e.setLocalPosition(p.p.clone().lerp(p.p,target,focus).add(recede.mulScalar(background)));
        const q=new Quat().mul2(p.e.parent.getRotation().clone().invert(),this.camera.getRotation());
        p.e.setLocalRotation(new Quat().slerp(p.q,q,focus));
      }
      if(!this.motion.reduced&&!total) {
        const hover=this.hoverMotion.values[i];
        p.e.translateLocal(0,.12*hover,.13*hover);
        p.e.rotateLocal(-2*hover,1.5*hover,0);
      }
      this.shade(p.materials,focus,background);
    });
    this.shade(this.atmosphere,0,Math.min(1,total));
  }
  dispose() {
    this.camera.setLocalPosition(this.cameraRest);
    for(const p of this.panels){p.e.setLocalPosition(p.p);p.e.setLocalRotation(p.q);p.e.setLocalScale(p.s);}
    for(const m of [...this.panels.flatMap(p=>p.materials),...this.atmosphere]){m.instance.material=m.original;m.clone.destroy();}
  }
}
