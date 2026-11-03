// Canvas-only runtime evidence; never substitutes a rendered concept for the live scene.
export async function recordLevitationProof(controller){
  if(controller.recording)return;
  if(document.hidden||controller.reduced||controller.clock.time!==0)throw new Error('Show the dormant scene with reduced motion off before recording.');
  const canvas=controller.app.graphicsDevice.canvas;
  if(!canvas.captureStream||typeof MediaRecorder==='undefined')throw new Error('Canvas recording is unavailable in this browser.');
  const mimeType=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
  if(!mimeType)throw new Error('WebM recording is unavailable.');
  const stream=canvas.captureStream(24),recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:3000000}),chunks=[];
  controller.recording=true;const cameraTravel=controller.cameraTravel;controller.cameraTravel=false;
  const mark=action=>controller.report('recording: '+action);
  const pose=()=>({p:controller.main.getPosition().clone(),q:controller.main.getRotation().clone()});
  const continuity=action=>{const before=pose();action();const after=pose();console.info('MI_HANDOFF '+JSON.stringify({positionJump:before.p.distance(after.p),rotationJump:1-Math.abs(before.q.x*after.q.x+before.q.y*after.q.y+before.q.z*after.q.z+before.q.w*after.q.w)}));};
  let elapsed=0,opened=false,reset=false;
  const update=dt=>{
    if(document.hidden){recorder.stop();return;}
    elapsed+=dt;
    if(!opened&&elapsed>=9.5){opened=true;continuity(()=>controller.open());mark('awakening');}
    if(!reset&&elapsed>=17.5){reset=true;continuity(()=>controller.reset());mark('reset/reassembly');}
    if(elapsed>=30)recorder.stop();
  };
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const finished=new Promise((resolve,reject)=>{
    recorder.onerror=e=>reject(e.error||new Error('Recording failed'));
    recorder.onstop=()=>resolve();
  });
  recorder.start(1000);controller.app.on('update',update);mark('idle cycle begins');
  try{
    await finished;
    const blob=new Blob(chunks,{type:mimeType}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='MI_idle_levitation_runtime.webm';a.textContent='Download actual runtime recording';a.style.color='#ff8c32';
    controller.ui.append(a);a.click();setTimeout(()=>URL.revokeObjectURL(url),300000);
    console.info('MI_RECORDING '+JSON.stringify({seconds:elapsed,bytes:blob.size,mimeType,complete:elapsed>=30}));
  }finally{
    controller.app.off('update',update);stream.getTracks().forEach(track=>track.stop());controller.recording=false;controller.cameraTravel=cameraTravel;controller.syncButtons();
  }
}