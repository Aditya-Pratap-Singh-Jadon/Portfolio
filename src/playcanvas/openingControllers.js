import { MiAwakening } from "./approved/mi-awakening.mjs";
import { MiAshenVoid } from "./approved/mi-ashen-void.mjs";

// Reuse approved initialization/apply/cleanup; the website owns clocks and all input.
export class WebAwakening extends MiAwakening {
  static scriptName = "webAwakening";
  buildControls() {
    this.ui = document.createElement("div");
    this.status = document.createElement("span");
  }
  listen() {}
  bind() {}
  update() {}
  report() {}
}
export class WebAshenVoid extends MiAshenVoid {
  static scriptName = "webAshenVoid";
  buildControls() {
    this.ui = document.createElement("div");
    this.status = document.createElement("span");
    this.lowButton = document.createElement("button");
    this.motionButton = document.createElement("button");
  }
  listen() {}
  bind() {}
  update() {}
  report() {}
}

export function prepareOpeningScene(source) {
  const scene = structuredClone(source);
  for (const entity of Object.values(scene.entities)) {
    if (entity.components.camera) delete entity.components.camera.offscreen;
    const script = entity.components.script;
    if (!script) continue;
    for (const [oldName, newName] of [
      ["miAwakening", "webAwakening"],
      ["miAshenVoid", "webAshenVoid"],
    ]) {
      if (!script.scripts[oldName]) continue;
      script.scripts[newName] = script.scripts[oldName];
      delete script.scripts[oldName];
      script.order = script.order.map((name) =>
        name === oldName ? newName : name,
      );
    }
  }
  return scene;
}
