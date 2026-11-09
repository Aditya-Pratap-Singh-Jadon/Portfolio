export const runtimeDestinations=Object.freeze({
  projects:{folder:'mi03',scene:'MI_03_PROJECT_FORGE',root:'MI_PROJECT_FORGE',kind:'forge'},
  skills:{folder:'mi04',scene:'MI_04_NEURAL_CORE',root:'MI_CRIMSON_SYNAPSE',kind:'neural',rig:313590840},
  experience:{folder:'mi05',scene:'MI_05_ACCENTS',root:'MI_05_CHRONICLE_FAULT',kind:'chronicle',rig:313653391},
  achievements:{folder:'mi05',scene:'MI_05_ACCENTS',root:'MI_05_VAULT_DISPLAY',kind:'vault',rig:313653391},
  contact:{folder:'mi05',scene:'MI_05_ACCENTS',root:'MI_05_NEXUS_REASSEMBLY',kind:'nexus',rig:313653391},
});

export function prepareSectionScene(source,definition) {
  const view=structuredClone(source);
  if(definition.folder==='mi05'){
    const remove=id=>{for(const child of view.entities[id]?.children||[])remove(child);delete view.entities[id];};
    for(const[id,e]of Object.entries(view.entities))if(/^MI_05_(CHRONICLE_FAULT|VAULT_DISPLAY|NEXUS_REASSEMBLY)$/.test(e.name)&&e.name!==definition.root)remove(id);
  }
  for(const entity of Object.values(view.entities)){
    entity.children=(entity.children||[]).filter(id=>view.entities[id]);
    delete entity.components.script;
    if(entity.components.camera)delete entity.components.camera.offscreen;
  }
  return view;
}

export function sectionAssetIds(scene,assets,rig) {
  const found=new Set(),queue=[scene,rig];
  while(queue.length){
    const value=queue.pop();
    if(value&&typeof value==='object')queue.push(...Object.values(value));
    else if(Object.hasOwn(assets,String(value))&&!found.has(String(value))){found.add(String(value));queue.push(assets[String(value)].data);}
  }
  return found;
}
