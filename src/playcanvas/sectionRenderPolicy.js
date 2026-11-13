// Dirty input/resize frames bypass this policy; continuous approved effects stay live.
export function sectionNeedsFrame(kind,controller){
 const m=controller.motion;
 if(m.paused)return false;
 const settled=m.settled??['assembled','separated'].includes(m.state);
 if(m.reduced)return !settled;
 if(kind==='forge')return !settled||controller.slots.some((slot,i)=>{
  const target=i===m.selected?1.15:((i===controller.hover||i===controller.keyboardFocus) ? .5 : .12);
  return slot.heat!==target;
 });
 if(kind==='vault')return !settled||(m.selected!==null&&m.age<m.duration);
 if(kind==='nexus')return !settled;
 if(kind==='chronicle'&&m.exactRest)return !settled;
 return true;
}
