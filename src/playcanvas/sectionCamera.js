function requiredDistance(points,aspect,fov,horizontal,marginX,marginY) {
  const tangent=Math.tan(fov*Math.PI/360);
  const tanY=horizontal?tangent/aspect:tangent,tanX=horizontal?tangent:tangent*aspect;
  return Math.max(...points.flatMap(([x,y,z])=>[Math.abs(x)/(tanX*marginX)+z,Math.abs(y)/(tanY*marginY)+z,z+.5]));
}

export const sectionCameraDistance=(points,aspect,fov,horizontal=false,marginX=.88,marginY=.88)=>Math.max(0,requiredDistance(points,aspect,fov,horizontal,marginX,marginY));

export function sectionCameraFrame(points,aspect,fov,horizontal=false,headerFraction=0) {
  const x=(Math.min(...points.map(p=>p[0]))+Math.max(...points.map(p=>p[0])))/2;
  const y=(Math.min(...points.map(p=>p[1]))+Math.max(...points.map(p=>p[1])))/2;
  return {x,y,distance:requiredDistance(points.map(p=>[p[0]-x,p[1]-y,p[2]]),aspect,fov,horizontal,.88,Math.max(.2,Math.min(.88,1-headerFraction*2)))};
}
