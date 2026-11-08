import { Texture, PIXELFORMAT_SRGBA8 } from 'playcanvas';
import { signals } from '../../shared/signals.js';

// Keep the approved label mesh UVs; this website-owned atlas contains no personal facts.
export function paintHubLabels(context) {
  context.clearRect(0,0,1024,1024);
  signals.forEach((signal,i)=>{
    const x=(i%2)*512+34,y=Math.floor(i/2)*256;
    context.fillStyle='#e8e2d9';context.font='500 52px "Space Grotesk", sans-serif';
    context.fillText(signal.title,x,y+104,444);
    context.fillStyle='#b58a64';context.font='500 16px "DM Sans", sans-serif';
    context.fillText(signal.subtitle,x,y+152,444);
    context.fillStyle='#b9afa1';context.font='400 15px "DM Sans", sans-serif';
    context.fillText(signal.summary,x,y+197,444);
    context.fillStyle='#927a60';context.font='400 13px "DM Sans", sans-serif';
    context.fillText('Select to focus',x,y+233,444);
  });
}

export function createHubLabels(device) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const context=canvas.getContext('2d');
  if(!context)throw new Error('Hub typography unavailable');
  paintHubLabels(context);
  const texture=new Texture(device,{name:'Website signal labels',format:PIXELFORMAT_SRGBA8,mipmaps:true});
  try { texture.setSource(canvas);return texture; }
  catch(error) { texture.destroy();throw error; }
}
