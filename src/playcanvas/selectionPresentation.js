// Content follows established focus, not merely a new animation target.
export function selectionReady(kind,motion){
  if(motion.selected===null||motion.reduced)return true;
  if(kind==='forge')return motion.active===motion.selected&&motion.progress>=.55;
  if(kind==='chronicle'&&motion.pulse!==null)return false;
  return motion.focus.values[motion.selected]>=.15;
}
