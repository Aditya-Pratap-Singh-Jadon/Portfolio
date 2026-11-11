import {Texture,PIXELFORMAT_SRGBA8,ADDRESS_CLAMP_TO_EDGE} from 'playcanvas';

export function paintForgeLabels(context,labels=[]){
  context.clearRect(0,0,1024,1024);context.textAlign='center';context.textBaseline='middle';
  for(let i=0;i<6;i++){
    const assigned=labels[i]&&labels[i]!=='No published entry',title=assigned?labels[i]:'Unassigned';
    context.fillStyle=assigned?'#e8ddca':'#877c6e';
    context.font=`500 ${assigned?64:36}px "Space Grotesk", sans-serif`;
    const lines=[];let line='';
    for(const word of title.split(/\s+/)){
      const next=line?line+' '+word:word;
      if(line&&context.measureText(next).width>440){lines.push(line);line=word;}else line=next;
    }
    lines.push(line);
    lines.forEach((text,row)=>context.fillText(text,(i%2)*512+256,Math.floor(i/2)*256+128+(row-(lines.length-1)/2)*72,440));
  }
}

// Approved meshes use planar XY UVs; PlayCanvas converts material V offset to 1 - tiling - offset.
export function forgeLabelUV({center,halfExtents},index){
  const tiling=[.5/(halfExtents.x*2),.25/(halfExtents.y*2)];
  return {tiling,offset:[(index%2)*.5+.25-center.x*tiling[0],(Math.floor(index/2)+.5)*.25+(center.y-1)*tiling[1]]};
}

export function createForgeLabels(device,slots,labels){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const context=canvas.getContext('2d');if(!context)throw new Error('Forge typography unavailable');
  paintForgeLabels(context,labels);
  const texture=new Texture(device,{name:'Website Forge project names',format:PIXELFORMAT_SRGBA8,mipmaps:true,flipY:true,addressU:ADDRESS_CLAMP_TO_EDGE,addressV:ADDRESS_CLAMP_TO_EDGE});
  const materials=[];let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;for(const {instance,original,clone}of materials){instance.material=original;clone.destroy();}texture.destroy();};
  try{
    texture.setSource(canvas);
    slots.forEach((slot,index)=>{
      const render=slot.e.findByName(slot.name+'_PRESENTATION')?.render;
      if(!render?.meshInstances.length)throw new Error('Forge presentation surface missing');
      for(const instance of render.meshInstances){
        const original=instance.material,clone=original.clone();materials.push({instance,original,clone});
        const {tiling,offset}=forgeLabelUV(instance.mesh.aabb,index);
        clone.emissive.set(1,1,1);clone.emissiveIntensity=(labels?.[index] && labels[index]!=='No published entry') ? .85 : .45;
        clone.emissiveMap=texture;clone.emissiveMapUv=0;clone.emissiveMapChannel='rgb';clone.emissiveMapRotation=0;
        clone.emissiveMapTiling.set(...tiling);clone.emissiveMapOffset.set(...offset);clone.update();instance.material=clone;
      }
    });
    return {dispose};
  }catch(error){dispose();throw error;}
}
