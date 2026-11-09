import {
  AppBase, AppOptions, BatchManager, createGraphicsDevice,
  RenderComponentSystem, CameraComponentSystem, LightComponentSystem, ScriptComponentSystem,
  RenderHandler, MaterialHandler, TextureHandler, JsonHandler, SceneHandler,
  HierarchyHandler, ContainerHandler, BinaryHandler, CubemapHandler,
  FILLMODE_NONE, RESOLUTION_AUTO,
} from 'playcanvas';
import { fetchJson, callbackPromise, configureOpening } from './openingRuntime.js';
import { HubController } from './hubController.js';
import { createHubLabels } from './hubLabels.js';

export async function createHubRuntime(canvas,{signal,reduced=false,onSelect,onError,enabled}) {
  let app,device,hub,labels,emergence=1,disposed=false,ready=false,active=false,dirty=true,resizeObserver,observer;
  const removers=[];
  const listen=(target,type,callback)=>{target.addEventListener(type,callback);removers.push(()=>target.removeEventListener(type,callback));};
  const check=()=>{if(signal.aborted)throw new DOMException('Hub load cancelled','AbortError');};
  const dispose=()=>{
    if(disposed)return;disposed=true;ready=false;
    resizeObserver?.disconnect();observer?.disconnect();removers.splice(0).forEach(off=>off());
    hub?.dispose();hub=undefined;
    labels?.destroy();labels=undefined;
    if(app)app.destroy();else device?.destroy();
  };
  const select=index=>{
    if(!ready||disposed||index!==null&&!enabled[index])return;
    hub.select(index);dirty=true;onSelect?.(index);
    canvas.dispatchEvent(new CustomEvent('mi:hub:select',{bubbles:true,detail:{id:index===null?null:hub.panels[index].e.name}}));
  };
  try {
    const [config,source]=await Promise.all([fetchJson('/playcanvas/mi02/config.json',signal),fetchJson('/playcanvas/mi02/scene.json',signal)]);
    check();
    if(Object.values(source.entities).some(e=>e.components.script))throw new Error('Hub scripts must be owned by the website');
    device=await createGraphicsDevice(canvas,{deviceTypes:['webgl2'],alpha:true,antialias:true,powerPreference:'high-performance'});check();
    app=new AppBase(canvas);
    const options=new AppOptions();
    Object.assign(options,{graphicsDevice:device,batchManager:BatchManager,
      componentSystems:[RenderComponentSystem,CameraComponentSystem,LightComponentSystem,ScriptComponentSystem],
      resourceHandlers:[RenderHandler,MaterialHandler,TextureHandler,JsonHandler,SceneHandler,HierarchyHandler,ContainerHandler,BinaryHandler,CubemapHandler]});
    app.init(options);
    await configureOpening(app,config,signal);check();
    const errors=[];app.assets.on('error',error=>errors.push(String(error)));
    await callbackPromise(done=>app.preload(()=>done(null)),signal);check();
    if(errors.length)throw new Error('Required hub assets failed to load');
    const item=app.scenes.find('MI_02_HOLOGRAPHIC_HUB');
    item.data=structuredClone(source);
    for(const entity of Object.values(item.data.entities))if(entity.components.camera)delete entity.components.camera.offscreen;
    await callbackPromise(done=>app.scenes.changeScene(item,done),signal);check();
    hub=new HubController(app);hub.setReduced(reduced);
    hub.camera.camera.clearColor.set(0,0,0,0);
    labels=createHubLabels(device);hub.setLabelTexture(labels);
    hub.panels.forEach((p,i)=>{p.e.enabled=Boolean(enabled[i]);});
    app.autoRender=false;
    const resize=()=>{
      if(disposed)return;
      const {width,height}=canvas.parentElement.getBoundingClientRect();
      device.maxPixelRatio=Math.min(window.devicePixelRatio||1,width<700?1.25:1.6);
      app.setCanvasFillMode(FILLMODE_NONE,Math.max(1,width),Math.max(1,height));
      app.setCanvasResolution(RESOLUTION_AUTO,Math.max(1,width),Math.max(1,height));
      app.resizeCanvas(Math.max(1,width),Math.max(1,height));
      hub.resize(Math.max(1,width),Math.max(1,height));dirty=true;
    };
    app.on('update',dt=>{
      if(!ready||disposed||document.hidden||!active||emergence===0)return;
      const moving=[...hub.motion.velocities,...hub.hoverMotion.velocities].some(v=>v!==0);
      if(!dirty&&!moving)return;
      hub.update(Math.min(dt,.1));dirty=false;app.renderNextFrame=true;
    });
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas.parentElement);
    observer=new IntersectionObserver(([entry])=>{active=entry.isIntersecting;dirty=true;if(!active)app.renderNextFrame=false;},{rootMargin:'20px'});observer.observe(canvas);
    listen(document,'visibilitychange',()=>{dirty=true;if(document.hidden)app.renderNextFrame=false;});
    listen(canvas,'webglcontextlost',event=>{event.preventDefault();dispose();onError?.();});
    let down;
    listen(canvas,'pointerdown',e=>{if(!reduced&&e.isPrimary&&e.button===0)down={x:e.clientX,y:e.clientY,id:e.pointerId};});
    listen(canvas,'pointercancel',()=>{down=null;});
    listen(canvas,'pointerup',e=>{const start=down;down=null;if(start?.id!==e.pointerId||Math.hypot(e.clientX-start.x,e.clientY-start.y)>8)return;const i=hub.pick(e.clientX,e.clientY);if(i!==null)select(i);});
    listen(canvas,'pointermove',e=>{if(reduced||e.pointerType==='touch')return;hub.hover(hub.pick(e.clientX,e.clientY));dirty=true;});
    listen(canvas,'pointerleave',()=>{hub.hover(null);dirty=true;});
    ready=true;app.start();resize();hub.update(0);app.renderNextFrame=true;
    return {
      app,canvas,select,dispose,
      setEmergence(value){
        if(disposed)return;
        const next=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
        if(next===emergence)return;
        emergence=next;
        if(emergence<1&&hub.motion.selected!==null)select(null);
        hub.setEmergence(emergence);dirty=true;
      },
      hover(index){if(!disposed){hub.hover(index);dirty=true;}},
      setReduced(value){if(!disposed){reduced=Boolean(value);hub.setReduced(reduced);dirty=true;}},
      getState(){return {ready,disposed,active,reduced,emergence,camera:hub?.camera.getLocalPosition().toArray(),selected:hub?.motion.selected,panels:hub?.panels.map(p=>({id:p.e.name,position:p.e.getLocalPosition().toArray(),rotation:p.e.getLocalRotation().toArray(),rest:p.p.toArray()}))};},
    };
  } catch(error){dispose();throw error;}
}
