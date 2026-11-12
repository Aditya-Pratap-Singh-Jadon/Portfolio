import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {refineSceneLighting} from '../src/playcanvas/sceneLighting.js';

test('website lighting improves existing directional fills without altering heat, geometry or source data',()=>{
  for(const folder of ['mi02','mi03','mi04','mi05']){
    const scene=JSON.parse(readFileSync(new URL(`../public/playcanvas/${folder}/scene.json`,import.meta.url))),before=JSON.stringify(scene);
    const entities=Object.values(scene.entities).map(e=>({name:e.name,light:e.components.light&&structuredClone(e.components.light)}));
    const app={root:{findByName:name=>entities.find(e=>e.name===name)}};
    refineSceneLighting(app);const once=JSON.stringify(entities);refineSceneLighting(app);assert.equal(JSON.stringify(entities),once);
    let changed=0;
    for(const entity of entities.filter(e=>e.light)){
      const source=Object.values(scene.entities).find(e=>e.name===entity.name).components.light;
      assert.deepEqual({...entity.light,intensity:source.intensity},source);
      if(entity.light.intensity!==source.intensity){changed++;assert.equal(source.type,'directional');assert(entity.light.intensity>source.intensity&&entity.light.intensity<=2.5);}
    }
    assert(changed>=2);assert.equal(JSON.stringify(scene),before);
  }
});
