import {
  AppBase,
  AppOptions,
  BatchManager,
  registerScript,
  RenderComponentSystem,
  CameraComponentSystem,
  LightComponentSystem,
  ScriptComponentSystem,
  RenderHandler,
  MaterialHandler,
  TextureHandler,
  JsonHandler,
  ScriptHandler,
  SceneHandler,
  HierarchyHandler,
  ContainerHandler,
  BinaryHandler,
  CubemapHandler,
  FILLMODE_NONE,
  RESOLUTION_AUTO,
} from "playcanvas";
import {createWebglDevice as createGraphicsDevice} from './graphicsDevice.js';
import {
  WebAwakening,
  WebAshenVoid,
  prepareOpeningScene,
} from "./openingControllers";
import {
  sampleOpening,
  ProgressSpring,
  clampProgress,
} from "./openingTimeline";
import { sampleAwakening, phase } from "./approved/mi-awakening-motion.mjs";

export { fetchJson, callbackPromise, configureOpening };

const abortError = () =>
  new DOMException("Opening load cancelled", "AbortError");
const fetchJson = async (url, signal) => {
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error("Opening asset unavailable");
  return r.json();
};
const callbackPromise = (run, signal) => new Promise((resolve, reject) => {
  const abort = () => { signal.removeEventListener('abort', abort); reject(abortError()); };
  if (signal.aborted) { abort(); return; }
  signal.addEventListener('abort', abort, { once: true });
  try {
    run(error => {
      signal.removeEventListener('abort', abort);
      if (error) reject(new Error(String(error))); else resolve();
    });
  } catch (error) { signal.removeEventListener('abort', abort); reject(error); }
});

// shortcut: pinned 2.23.3 parsers avoid configure's uncancellable XHR; recheck on engine upgrades.
const configureOpening = (app, config, signal) => callbackPromise(done => {
  const props = config.application_properties;
  if (!Array.isArray(props.libraries) || props.libraries.length || props.scripts?.length || props.externalScripts?.length)
    throw new Error("Opening scripts must be registered locally");
  app._parseApplicationProperties({ ...props, maxAssetRetries: 0 }, error => {
    if (signal.aborted) { done(abortError()); return; }
    if (!error) {
      app._parseScenes(config.scenes);
      app._parseAssets(config.assets);
    }
    done(error);
  });
}, signal);


export async function createOpeningRuntime(
  canvas,
  { signal, reduced = false, onLoad, onState, onFrame, onError },
) {
  let app,
    device,
    ready = false,
    disposed = false,
    active = true,
    dirty = true,
    lastPhase,
    lastHandoff = false,
    awakening,
    environment,
    resizeObserver,
    intersectionObserver;
  const removers = [],
    progress = new ProgressSpring(),
    samples = [];
  const checkAbort = () => {
    if (signal.aborted) throw abortError();
  };
  const listen = (target, type, fn) => {
    target.addEventListener(type, fn);
    removers.push(() => target.removeEventListener(type, fn));
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    ready = false;
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    removers.splice(0).forEach((off) => off());
    if (app) app.destroy();
    else device?.destroy();
    awakening = environment = undefined;
    samples.length = 0;
  };
  const state = () => {
    const s = sampleOpening(progress.value, reduced);
    return {
      ...s,
      target: progress.target,
      reduced,
      ready,
      active,
      entityCount: app && !disposed ? Object.keys(source.entities).length : 0,
      camera: awakening?.camera.getLocalPosition().toArray(),
      main: awakening?.main.getLocalPosition().toArray(),
      masses: awakening?.masses.map((e) => ({
        id: e.guid,
        name: e.name,
        position: e.getLocalPosition().toArray(),
        rotation: e.getLocalRotation().toArray(),
      })),
      assemblyError: awakening
        ? Math.max(
            ...awakening.masses.map((e) =>
              e.getLocalPosition().distance(awakening.restByName.get(e.name).p),
            ),
          )
        : null,
      exposure: app?.scene?.exposure,
      controllerMs: samples.length
        ? [...samples].sort((a, b) => a - b)[Math.floor(samples.length * 0.95)]
        : 0,
    };
  };
  let source;
  try {
    const [config, scene] = await Promise.all([
      fetchJson("/playcanvas/mi01/config.json", signal),
      fetchJson("/playcanvas/mi01/scene.json", signal),
    ]);
    source = scene;
    checkAbort();
    device = await createGraphicsDevice(canvas, {
      deviceTypes: ["webgl2"],
      alpha: false,
      antialias: true,
      powerPreference: "high-performance",
    });
    checkAbort();
    app = new AppBase(canvas);
    const options = new AppOptions();
    options.graphicsDevice = device;
    options.batchManager = BatchManager;
    options.componentSystems = [
      RenderComponentSystem,
      CameraComponentSystem,
      LightComponentSystem,
      ScriptComponentSystem,
    ];
    options.resourceHandlers = [
      RenderHandler,
      MaterialHandler,
      TextureHandler,
      JsonHandler,
      ScriptHandler,
      SceneHandler,
      HierarchyHandler,
      ContainerHandler,
      BinaryHandler,
      CubemapHandler,
    ];
    app.init(options);
    registerScript(WebAwakening, WebAwakening.scriptName, app);
    registerScript(WebAshenVoid, WebAshenVoid.scriptName, app);
    app.scripts.addSchema(WebAwakening.scriptName, { attributes: {} });
    app.scripts.addSchema(WebAshenVoid.scriptName, { attributes: {} });
    await configureOpening(app, config, signal);
    checkAbort();
    const assetErrors = [];
    app.assets.on("error", (error) => assetErrors.push(String(error)));
    app.on("preload:progress", (value) => {
      if (!signal.aborted) onLoad?.(value);
    });
    await callbackPromise((done) => app.preload(() => done(null)), signal);
    checkAbort();
    if (assetErrors.length)
      throw new Error("Required opening assets failed to load");
    const sceneItem = app.scenes.find("MI_01_MONOLITH_GATE");
    sceneItem.data = prepareOpeningScene(source);
    await callbackPromise((done) => app.scenes.changeScene(sceneItem, done), signal);
    checkAbort();
    awakening = app.root.findByName("RIG_HERO_ROOT").script.webAwakening;
    environment = app.root.findByName("ASHEN_VOID").script.webAshenVoid;
    app.autoRender = false;
    let width = 1,
      height = 1;
    const resize = () => {
      if (disposed) return;
      const r = canvas.getBoundingClientRect();
      width = Math.max(1, r.width);
      height = Math.max(1, r.height);
      device.maxPixelRatio = Math.min(
        window.devicePixelRatio || 1,
        width < 700 ? 1.25 : 1.6,
      );
      app.setCanvasFillMode(FILLMODE_NONE, width, height);
      app.setCanvasResolution(RESOLUTION_AUTO, width, height);
      app.resizeCanvas(width, height);
      dirty = true;
    };
    const apply = (dt) => {
      const s = sampleOpening(progress.value, reduced);
      awakening.reduced = environment.reduced = reduced;
      awakening.cameraTravel = !reduced;
      awakening.clock.seek(s.awakeningTime);
      environment.clock.seek(s.environmentTime);
      if (!reduced) {
        awakening.idle.advance(dt);
        environment.ambientTime += dt;
      }
      awakening.apply(dt);
      environment.apply();
      // Preserve the approved reveal, with enough exposure for the gateway in the initial void.
      app.scene.exposure =
        environment.baseExposure *
        (0.12 + (0.88 * app.scene.exposure) / environment.baseExposure);
      const cameraPhase = sampleAwakening(s.awakeningTime).camera,
        weight = 1 - phase(cameraPhase, 0, 0.34),
        aspect = width / height;
      const mobile = width < 700;
      awakening.camera.translateLocal(
        (mobile ? 1.4 : width < 1000 ? -0.8 : -2.6) * weight,
        (mobile ? 2.0 : 0) * weight,
        Math.max(0, 1.3 / aspect - 1) * 7 * weight,
      );
      if (lastPhase !== s.phase || lastHandoff !== s.handoff) {
        const detail = {
          phase: s.phase,
          progress: s.progress,
          handoff: s.handoff,
          reduced,
        };
        lastPhase = s.phase;
        onState?.(detail);
        canvas.dispatchEvent(
          new CustomEvent("mi:opening:state", { detail, bubbles: true }),
        );
        if (lastHandoff !== s.handoff)
          canvas.dispatchEvent(
            new CustomEvent("mi:opening:handoff", {
              detail: { ...detail, completed: s.handoff },
              bubbles: true,
            }),
          );
        lastHandoff = s.handoff;
      }
      onFrame?.(s.progress);
    };
    app.on("update", (dt) => {
      if (!ready || disposed || document.hidden || !active) return;
      if (progress.value === 1 && progress.target === 1 && !dirty) return;
      if (reduced && !dirty && progress.value === progress.target) return;
      const started = performance.now();
      progress.update(dt, reduced);
      apply(dt);
      dirty = false;
      app.renderNextFrame = true;
      samples.push(performance.now() - started);
      if (samples.length > 180) samples.shift();
    });
    app.start();
    if (!awakening.clock || !environment.clock)
      throw new Error("Approved opening controllers did not initialize");
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        active = entry.isIntersecting;
        dirty = true;
        if (!active) app.renderNextFrame = false;
      },
      { rootMargin: "20px" },
    );
    intersectionObserver.observe(canvas);
    listen(document, "visibilitychange", () => {
      dirty = true;
      if (document.hidden) app.renderNextFrame = false;
    });
    listen(canvas, "webglcontextlost", (e) => {
      e.preventDefault();
      ready = false;
      app.renderNextFrame = false;
      onError?.(
        "The 3D view is unavailable. The portfolio remains accessible below.",
      );
      dispose();
    });
    ready = true;
    resize();
    apply(0);
    app.renderNextFrame = true;
    return {
      setProgress(value, immediate = false) {
        if (!disposed) {
          progress.target = clampProgress(value);
          if (immediate) {
            progress.value = progress.target;
            progress.velocity = 0;
            apply(0);
          }
          dirty = true;
        }
      },
      setReduced(value) {
        if (!disposed) {
          reduced = Boolean(value);
          progress.update(0, reduced);
          dirty = true;
        }
      },
      reset() {
        if (!disposed) {
          progress.reset();
          awakening.idle.time =
            awakening.idle.y =
            awakening.idle.yaw =
            awakening.idle.vy =
            awakening.idle.vyaw =
              0;
          environment.ambientTime = 0;
          awakening.restorePose();
          apply(0);
          dirty = true;
          canvas.dispatchEvent(
            new CustomEvent("mi:opening:reset", { bubbles: true }),
          );
        }
      },
      getState: state,
      app,
      canvas,
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

