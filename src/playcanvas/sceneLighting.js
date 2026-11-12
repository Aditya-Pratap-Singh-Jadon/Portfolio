// Website presentation only: retain approved light directions, colors, materials and scene bytes.
const intensities={
  HUB_KEY_WARM:2.4,HUB_RIM_NEUTRAL:1.95,
  LIGHT_FORGE_KEY_ASH:2.35,LIGHT_FORGE_RIM_NEUTRAL:1.85,LIGHT_FORGE_FILL_ASH:1.05,
  LIGHT_NEURAL_KEY_ASH:2.5,LIGHT_NEURAL_RIM_NEUTRAL:2.15,LIGHT_NEURAL_FILL_ASH:.95,
  LIGHT_ACCENTS_ASH_KEY:2,LIGHT_ACCENTS_COOL_ASH_RIM:1.05,
};

export function refineSceneLighting(app){
  for(const[name,intensity]of Object.entries(intensities)){
    const light=app.root.findByName(name)?.light;
    if(light)light.intensity=intensity;
  }
}
