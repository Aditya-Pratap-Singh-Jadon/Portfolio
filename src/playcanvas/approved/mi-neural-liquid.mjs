const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};

function nearest(x,y,z,track){
  let distance=Infinity,t=0;
  for(let i=1;i<track.length;i++){
    const a=track[i-1],b=track[i],dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],den=dx*dx+dy*dy+dz*dz;
    const u=den?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy+(z-a[2])*dz)/den)):0;
    const d=(x-a[0]-u*dx)**2+(y-a[1]-u*dy)**2+(z-a[2]-u*dz)**2;
    if(d<distance){distance=d;t=a[3]+(b[3]-a[3])*u;}
  }
  return {radius:Math.sqrt(distance),t};
}

// Build once: approved mesh arrays are never mutated and no vertex work runs in update().
export function prepareLiquid(original,normals,indices,route,seed){
  const positions=new Float32Array(original),count=positions.length/3,weights=new Float32Array(count*4),boneIndices=new Uint8Array(count*4),pulseUvs=new Float32Array(count*2),targets=[new Float32Array(positions.length),new Float32Array(positions.length)];
  const sums=route.branchBase?new Float32Array(positions.length):null,neighbors=sums?new Uint16Array(count):null;
  if(sums)for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){
    const id=indices[i+j];for(let k=0;k<3;k++)if(k!==j){const other=indices[i+k];for(let a=0;a<3;a++)sums[id*3+a]+=original[other*3+a];neighbors[id]++;}
  }
  let maxPolish=0,maxMorph=0,lockedVertices=0;
  for(let i=0;i<count;i++){
    const o=i*3,x=original[o],y=original[o+1],z=original[o+2],a=Math.hypot(x-route.start[0],y-route.start[1],z-route.start[2]),b=Math.hypot(x-route.end[0],y-route.end[1],z-route.end[2]);
    let sample=nearest(x,y,z,route.main);
    if(route.branch){const branch=nearest(x,y,z,route.branch);if(branch.radius<sample.radius)sample=branch;}
    const t=sample.t,w=a<.16?0:b<.16?1:smooth((t-.035)/.93),mask=smooth((a-.17)/.18)*smooth((b-.17)/.18),amplitude=Math.min(.0014,sample.radius*.018)*mask;
    weights[i*4]=1-w;weights[i*4+1]=w;boneIndices[i*4+1]=1;pulseUvs[i*2]=t;pulseUvs[i*2+1]=.5;
    if(mask===0){lockedVertices++;continue;}
    const grain=Math.sin(x*11+y*7-z*5+seed)*Math.cos(z*9-y*13+seed*.4),wave=Math.sin(t*14+seed*.79),wave2=Math.cos(t*9+seed*.43);
    const graft=route.branchBase?smooth((.115-Math.hypot(x-route.branchBase[0],y-route.branchBase[1],z-route.branchBase[2]))/.09):0;
    for(let axis=0;axis<3;axis++){
      let offset=normals[o+axis]*amplitude*grain*.48;
      if(graft&&neighbors[i]){const delta=sums[o+axis]/neighbors[i]-original[o+axis];offset+=Math.max(-amplitude,Math.min(amplitude,delta*.09))*graft;}
      positions[o+axis]+=offset;maxPolish=Math.max(maxPolish,Math.abs(offset));
      targets[0][o+axis]=normals[o+axis]*amplitude*wave;targets[1][o+axis]=normals[o+axis]*amplitude*wave2*.72;maxMorph=Math.max(maxMorph,Math.abs(targets[0][o+axis]),Math.abs(targets[1][o+axis]));
    }
  }
  return {positions,weights,boneIndices,pulseUvs,targets,maxPolish,maxMorph,lockedVertices};
}
