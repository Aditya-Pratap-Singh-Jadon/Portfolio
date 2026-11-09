const chamberAnchors=new Set(['#explore','#awakening-boundary','#experience-preferences']);

export function scrollToChamber(hash, behavior = 'smooth') {
  if(!chamberAnchors.has(hash))return false;
  const shell=document.querySelector('.awakening-shell.has-chamber');
  const target=document.getElementById(hash.slice(1));
  if(!shell||!target)return false;
  if(shell.classList.contains('is-reduced')||shell.classList.contains('has-error'))target.scrollIntoView({behavior});
  else {
    const stage=shell.querySelector('.awakening-stage');
    const chamber=shell.querySelector('.inner-chamber');
    const extra=hash==='#experience-preferences'?Math.max(0,target.getBoundingClientRect().bottom-chamber.getBoundingClientRect().top-innerHeight+24):0;
    window.scrollTo({top:scrollY+shell.getBoundingClientRect().top+shell.offsetHeight-stage.offsetHeight+extra,behavior});
  }
  return true;
}
