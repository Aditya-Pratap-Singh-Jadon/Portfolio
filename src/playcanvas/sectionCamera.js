export function sectionCameraDistance(points,aspect,fov,horizontal=false) {
  const tangent=Math.tan(fov*Math.PI/360);
  const tanY=horizontal?tangent/aspect:tangent,tanX=horizontal?tangent:tangent*aspect;
  return Math.max(0,...points.flatMap(([x,y,z])=>[Math.abs(x)/(tanX*.88)+z,Math.abs(y)/(tanY*.88)+z]));
}
