const chamberAnchors=new Set(['#explore','#awakening-boundary','#experience-preferences']);
const arrivalTop=shell=>scrollY+shell.getBoundingClientRect().top+shell.offsetHeight-shell.querySelector('.awakening-stage').offsetHeight;

export function scrollChamberTargetIntoView(target,options) {
  const shell=target.closest('.awakening-shell.has-chamber');
  if(!shell||shell.classList.contains('is-reduced')||shell.classList.contains('has-error')) {
    target.scrollIntoView(options);return;
  }
  const rect=target.getBoundingClientRect(),stage=shell.querySelector('.awakening-stage');
  const offset=rect.top-stage.getBoundingClientRect().top;
  const viewportTop=options.block==='center'?Math.max(24,(innerHeight-rect.height)/2):24;
  const arrival=arrivalTop(shell);
  // Native scrollIntoView can seek a sticky child back into the gateway and clear selection.
  window.scrollTo({top:arrival+Math.max(0,offset-viewportTop),behavior:options.behavior});
}

export function scrollToChamber(hash, behavior = 'smooth') {
  if(!chamberAnchors.has(hash))return false;
  const shell=document.querySelector('.awakening-shell.has-chamber');
  const target=document.getElementById(hash.slice(1));
  if(!shell||!target)return false;
  if(shell.classList.contains('is-reduced')||shell.classList.contains('has-error'))target.scrollIntoView({behavior});
  else {
    const chamber=shell.querySelector('.inner-chamber');
    const extra=hash==='#experience-preferences'?Math.max(0,target.getBoundingClientRect().bottom-chamber.getBoundingClientRect().top-innerHeight+24):0;
    window.scrollTo({top:arrivalTop(shell)+extra,behavior});
  }
  return true;
}
