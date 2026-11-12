import {
  AppBase,AppOptions,BatchManager,createGraphicsDevice,
  RenderComponentSystem,CameraComponentSystem,LightComponentSystem,ScriptComponentSystem,
  RenderHandler,MaterialHandler,TextureHandler,JsonHandler,SceneHandler,
  HierarchyHandler,ContainerHandler,BinaryHandler,CubemapHandler,
  FILLMODE_NONE,RESOLUTION_AUTO,Vec3,Mat4,Quat,
} from 'playcanvas';
import {fetchJson,callbackPromise,configureOpening} from './openingRuntime.js';
import {sectionCameraFrame} from './sectionCamera.js';
import {runtimeDestinations,prepareSectionScene,sectionAssetIds} from './sectionScenes.js';
import {refineSceneLighting} from './sceneLighting.js';
import {selectionReady} from './selectionPresentation.js';

export const sectionResources={created:0,disposed:0,live:0};

export async function createSectionRuntime(canvas,{destination,mount,signal,reduced=false,presentation='immersive',contentLabels,contentStatuses,onSelection,onError}) {
  if(!Object.hasOwn(runtimeDestinations,destination))throw new RangeError('No runtime for this destination');
  const definition=runtimeDestinations[destination],{folder,scene:name,root,kind,rig}=definition,forge=kind==='forge';
  let app,device,controller,observer,disposed=false,counted=false,dirty=true,active=true;
  const removers=[],check=()=>{if(signal.aborted)throw new DOMException('Section load cancelled','AbortError');};
  let lastSelection,lastReady;
  const notify=()=>{
    if(kind==='nexus')return;
    const selected=controller.motion.selected,ready=selectionReady(kind,controller.motion);
    if(selected!==lastSelection||ready!==lastReady){lastSelection=selected;lastReady=ready;onSelection?.(selected,{ready});}
  };
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
      forge?import('./forgeController.js'):kind==='neural'?import('./neuralController.js'):import('./accentsController.js'),
    ]);check();
    const view=prepareSectionScene(source,definition),needed=sectionAssetIds(view,config.assets,rig);
    const runtimeConfig={...config,assets:Object.fromEntries(Object.entries(config.assets).filter(([id])=>needed.has(id)))};
    device=await createGraphicsDevice(canvas,{deviceTypes:['webgl2'],alpha:false,antialias:true,powerPreference:'high-performance'});check();
    app=new AppBase(canvas);const options=new AppOptions();
    Object.assign(options,{graphicsDevice:device,batchManager:BatchManager,
      componentSystems:[RenderComponentSystem,CameraComponentSystem,LightComponentSystem,ScriptComponentSystem],
      resourceHandlers:[RenderHandler,MaterialHandler,TextureHandler,JsonHandler,SceneHandler,HierarchyHandler,ContainerHandler,BinaryHandler,CubemapHandler]});
    app.init(options);await configureOpening(app,runtimeConfig,signal);check();
    const errors=[];app.assets.on('error',error=>errors.push(String(error)));
    await callbackPromise(done=>app.preload(()=>done(null)),signal);check();
    if(errors.length)throw new Error('Required section assets failed to load');
    const item=app.scenes.find(name);item.data=view;
    await callbackPromise(done=>app.scenes.changeScene(item,done),signal);check();
    refineSceneLighting(app);
    const camera=app.root.findComponents('camera').find(c=>c.enabled)?.entity;
    if(!camera)throw new Error('Section camera missing');
    const rest=camera.getLocalPosition().clone();
    const inverse=new Mat4().invert(camera.getWorldTransform()),points=[];
    const objects=Object.values(view.entities).filter(e=>forge?/^PROJECT_SLOT_\d\d$/.test(e.name):kind==='neural'?/^NODE_SLOT_\d\d$/.test(e.name)||e.name==='NEURAL_CUBOID_CORE':e.name===root);
    const captureBounds=()=>{for(const object of objects)for(const render of app.root.findByName(object.name).findComponents('render'))for(const mesh of render.meshInstances){
      const {center,halfExtents:half}=mesh.aabb;
      for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])points.push(inverse.transformPoint(new Vec3(center.x+x*half.x,center.y+y*half.y,center.z+z*half.z)).toArray());
    }};captureBounds();
    const args={app,entity:app.root.findByName(root),mount,initialReduced:reduced,presentation,contentLabels,contentStatuses,rigAsset:rig?app.assets.get(rig):undefined};
    if(folder!=='mi05'){
      controller=new (forge?module.MiForgeNavigation:module.MiNeuralNavigation)(args);
      Object.assign(controller,{mount,initialReduced:reduced,presentation,contentLabels,contentStatuses,rigAsset:args.rigAsset});
    }
    const resize=()=>{
      if(disposed)return;
      const {clientWidth:width,clientHeight:height}=canvas.parentElement,aspect=width/Math.max(1,height);
      device.maxPixelRatio=Math.min(devicePixelRatio||1,width<700?1.25:1.6);
      app.setCanvasFillMode(FILLMODE_NONE,Math.max(1,width),Math.max(1,height));
      app.setCanvasResolution(RESOLUTION_AUTO,Math.max(1,width),Math.max(1,height));app.resizeCanvas(Math.max(1,width),Math.max(1,height));
      const header=mount.closest('.space-shell').querySelector('.space-header').offsetHeight;
      const frame=sectionCameraFrame(points,aspect,camera.camera.fov,camera.camera.horizontalFov,(header+12)/Math.max(1,height));
      camera.setLocalPosition(rest.clone().add(camera.right.clone().mulScalar(frame.x)).add(camera.up.clone().mulScalar(frame.y)).add(camera.forward.clone().mulScalar(-frame.distance)));
      if(controller?.cameraRest)controller.cameraRest.p.copy(camera.getLocalPosition());
      if(controller?.motion&&forge)controller.layout();dirty=true;
    };
    resize();
    if(folder==='mi05')controller=new module.AccentsController(args,kind);else controller.initialize();
    if(controller.error)throw new Error(controller.error);
    if(kind==='nexus')captureBounds();
    for(const method of ['select','setReduced','resumeIdle','assemble','separate','reset','pause'])if(controller[method]){
      const original=controller[method].bind(controller);controller[method]=(...args)=>{original(...args);dirty=true;notify();};
    }
    observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);resize();
    for(const event of ['pointermove','pointerleave'])listen(canvas,event,()=>{dirty=true;});
    for(const event of ['focusin','focusout'])listen(mount,event,()=>{dirty=true;});
    listen(canvas,'pointermove',event=>{if(folder==='mi05')canvas.style.cursor=controller.pick(event.clientX,event.clientY)===null?'':'pointer';});
    listen(canvas,'webglcontextlost',event=>{event.preventDefault();dispose();onError?.();});
    listen(document,'visibilitychange',()=>{dirty=true;if(document.hidden)app.renderNextFrame=false;});
    app.autoRender=false;
    app.on('update',dt=>{
      if(disposed||!active||document.hidden)return;
      const settled=controller.motion.settled??['assembled','separated'].includes(controller.motion.state);
      if(controller.motion.reduced&&!dirty&&settled)return;
      controller.update(Math.min(dt,.1));notify();dirty=false;app.renderNextFrame=true;
    });
    app.start();app.renderNextFrame=true;counted=true;sectionResources.created++;sectionResources.live++;
    return {
      app,canvas,dispose,
      setActive(value){active=Boolean(value);dirty=true;if(!active)app.renderNextFrame=false;},
      setReduced(value){reduced=Boolean(value);controller&&(controller.initialReduced=reduced,controller.setReduced(reduced));dirty=true;},
      select(index){controller?.select(index);},
      reset(){if(kind==='nexus')controller?.reset();else controller?.select(null);},
      getState(){
        const entries=controller?.slots||controller?.nodes||controller?.items||[],poses=controller?.poses||entries;
        const motion=controller?.motion,atRest=forge?motion?.progress===0:kind==='neural'?motion?.exactRest:kind==='nexus'?motion?.progress===0:motion?.selected===null&&motion?.settled;
        return {destination,kind,disposed,active,reduced:motion?.reduced??reduced,selected:motion?.selected,settled:motion?.settled??['assembled','separated'].includes(motion?.state),state:controller?.state?.(),
          resources:{...sectionResources},entities:Object.keys(view.entities).length,sourceEntities:Object.keys(source.entities).length,
          exactRest:!!controller&&!!atRest&&(kind==='nexus'?entries.every(e=>e.e.getLocalPosition().equals(new Vec3(...e.data.separated.position))&&e.e.getLocalRotation().equals(new Quat().setFromEulerAngles(...e.data.separated.rotation))&&e.e.getLocalScale().equals(new Vec3(...e.data.separated.scale))):poses.every(e=>e.e.getLocalPosition().equals(e.p)&&e.e.getLocalRotation().equals(e.q)&&e.e.getLocalScale().equals(e.s))),
          pulses:controller?.flows?.map((_,i)=>controller.motion.pulse(i)),
          items:entries.map(e=>({name:e.e.name,position:e.e.getLocalPosition().toArray(),rest:kind==='nexus'?e.data.separated.position:(e.p||e.movable?.[0]?.p)?.toArray()}))};
      },
    };
  }catch(error){dispose();throw error;}
}
