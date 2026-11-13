import {WebglGraphicsDevice} from 'playcanvas';

// All approved scenes use WebGL2; the generic factory also imports unused WebGPU backends.
export async function createWebglDevice(canvas,options){
 return new WebglGraphicsDevice(canvas,options);
}
