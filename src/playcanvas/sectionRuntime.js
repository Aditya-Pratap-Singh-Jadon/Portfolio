import {
  AppBase,AppOptions,BatchManager,createGraphicsDevice,
  RenderComponentSystem,CameraComponentSystem,LightComponentSystem,ScriptComponentSystem,
  RenderHandler,MaterialHandler,TextureHandler,JsonHandler,SceneHandler,
  HierarchyHandler,ContainerHandler,BinaryHandler,CubemapHandler,
  FILLMODE_NONE,RESOLUTION_AUTO,Vec3,Mat4,
} from 'playcanvas';
import {fetchJson,callbackPromise,configureOpening} from './openingRuntime.js';
import {sectionCameraDistance} from './sectionCamera.js';

export const sectionResources={created:0,disposed:0,live:0};

export async function createSectionRuntime(canvas,{destination,mount,signal,reduced=false,onError}) {
  const forge=destination==='projects';
  if(!forge&&destination!=='skills')throw new RangeError('No runtime for this destination');
  const folder=forge?'mi03':'mi04',name=forge?'MI_03_PROJECT_FORGE':'MI_04_NEURAL_CORE';
  let app,device,controller,observer,disposed=false,counted=false,dirty=true,active=true;
  const removers=[],check=()=>{if(signal.aborted)throw new DOMException('Section load cancelled','AbortError');};
  const listen=(node,type,fn)=>{node.addEventListener(type,fn);removers.push(()=>node.removeEventListener(type,fn));};
  const dispose=()=>{
    if(disposed)return;disposed=true;observer?.disconnect();removers.splice(0).forEach(fn=>fn());
    try {controller?.cleanup();} finally {
      controller=undefined;
      if(app)app.destroy();else device?.destroy();
      if(counted){sectionResources.live--;sectionResources.disposed++;}
    }
  };
  try {
    const [config,source,module]=await Promise.all([
      fetchJson(`/playcanvas/${folder}/config.json`,signal),fetchJson(`/playcanvas/${folder}/scene.json`,signal),
      forge?import('./forgeController.js'):import('./neuralController.js'),
    ]);check();
    device=await createGraphicsDevice(canvas,{deviceTypes:['webgl2'],alpha:false,antialias:true,powerPreference:'high-performance'});check();
    app=new AppBase(canvas);const options=new AppOptions();
    Object.assign(options,{graphicsDevice:device,batchManager:BatchManager,
      componentSystems:[RenderComponentSystem,CameraComponentSystem,LightComponentSystem,ScriptComponentSystem],
      resourceHandlers:[RenderHandler,MaterialHandler,TextureHandler,JsonHandler,SceneHandler,HierarchyHandler,ContainerHandler,BinaryHandler,CubemapHandler]});
    app.init(options);await configureOpening(app,config,signal);check();
    const errors=[];app.assets.on('error',error=>errors.push(String(error)));
    await callbackPromise(done=>app.preload(()=>done(null)),signal);check();
    if(errors.length)throw new Error('Required section assets failed to load');
    const item=app.scenes.find(name);item.data=structuredClone(source);
    for(const entity of Object.values(item.data.entities)){
      delete entity.components.script;
      if(entity.components.camera)delete entity.components.camera.offscreen;
    }
    await callbackPromise(done=>app.scenes.changeScene(item,done),signal);check();
    const camera=app.root.findComponents('camera').find(c=>c.enabled)?.entity;
    if(!camera)throw new Error('Section camera missing');
    const rest=camera.getLocalPosition().clone();
    const inverse=new Mat4().invert(camera.getWorldTransform()),points=[];
    const objects=Object.values(source.entities).filter(e=>forge?/^PROJECT_SLOT_\d\d$/.test(e.name):/^NODE_SLOT_\d\d$/.test(e.name)||e.name==='NEURAL_CUBOID_CORE');
    for(const object of objects)for(const render of app.root.findByName(object.name).findComponents('render'))for(const mesh of render.meshInstances){
      const {center,halfExtents:half}=mesh.aabb;
      for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])points.push(inverse.transformPoint(new Vec3(center.x+x*half.x,center.y+y*half.y,center.z+z*half.z)).toArray());
    }
    controller=new (forge?module.MiForgeNavigation:module.MiNeuralNavigation)({app,entity:app.root.findByName(forge?'MI_PROJECT_FORGE':'MI_CRIMSON_SYNAPSE')});
    controller.mount=mount;controller.initialReduced=reduced;
    if(!forge)controller.rigAsset=app.assets.get(313590840);
    const resize=()=>{
      if(disposed)return;
      canvas.parentElement.style.top=(mount.closest('.space-shell').querySelector('.space-header').offsetHeight+8)+'px';
      canvas.parentElement.style.bottom=((controller.ui?.offsetHeight||180)+28)+'px';
      const {clientWidth:width,clientHeight:height}=canvas.parentElement,aspect=width/Math.max(1,height);
      device.maxPixelRatio=Math.min(devicePixelRatio||1,width<700?1.25:1.6);
      app.setCanvasFillMode(FILLMODE_NONE,Math.max(1,width),Math.max(1,height));
      app.setCanvasResolution(RESOLUTION_AUTO,Math.max(1,width),Math.max(1,height));app.resizeCanvas(Math.max(1,width),Math.max(1,height));
      const distance=sectionCameraDistance(points,aspect,camera.camera.fov,camera.camera.horizontalFov);
      camera.setLocalPosition(rest.clone().add(camera.forward.clone().mulScalar(-distance)));
      if(controller.motion&&forge)controller.layout();dirty=true;
    };
    resize();controller.initialize();
    for(const method of ['select','setReduced','resumeIdle'])if(controller[method]){
      const original=controller[method].bind(controller);controller[method]=(...args)=>{original(...args);dirty=true;};
    }
    observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);observer.observe(controller.ui);resize();
    for(const event of ['pointermove','pointerleave'])listen(canvas,event,()=>{dirty=true;});
    for(const event of ['focusin','focusout'])listen(mount,event,()=>{dirty=true;});
    listen(canvas,'webglcontextlost',event=>{event.preventDefault();dispose();onError?.();});
    listen(document,'visibilitychange',()=>{dirty=true;if(document.hidden)app.renderNextFrame=false;});
    app.autoRender=false;
    app.on('update',dt=>{
      if(disposed||!active||document.hidden)return;
      if(controller.motion.reduced&&!dirty&&controller.motion.settled)return;
      controller.update(Math.min(dt,.1));dirty=false;app.renderNextFrame=true;
    });
    app.start();app.renderNextFrame=true;counted=true;sectionResources.created++;sectionResources.live++;
    return {
      app,canvas,dispose,
      setActive(value){active=Boolean(value);dirty=true;if(!active)app.renderNextFrame=false;},
      setReduced(value){reduced=Boolean(value);controller&&(controller.initialReduced=reduced,controller.setReduced(reduced));dirty=true;},
      select(index){controller?.select(index);},
      getState(){
        const entries=controller?.[forge?'slots':'nodes']||[];
        return {destination,disposed,active,reduced:controller?.motion.reduced??reduced,selected:controller?.motion.selected,settled:controller?.motion.settled,
          resources:{...sectionResources},entities:Object.keys(source.entities).length,
          exactRest:!!controller&&(forge?controller.motion.progress===0:controller.motion.exactRest)&&entries.every(e=>e.e.getLocalPosition().equals(e.p)&&e.e.getLocalRotation().equals(e.q)&&e.e.getLocalScale().equals(e.s)),
          pulses:controller?.flows?.map((_,i)=>controller.motion.pulse(i)),
          items:entries.map(e=>({name:e.e.name,position:e.e.getLocalPosition().toArray(),rest:e.p.toArray()}))};
      },
    };
  }catch(error){dispose();throw error;}
}
