const counts={forge:6,neural:15,chronicle:5,vault:4,nexus:0};
const names={forge:'Project slab',neural:'Skill node',chronicle:'Milestone',vault:'Achievement chamber'};

export function sectionControlDefinitions(kind) {
  if(!Object.hasOwn(counts,kind))throw new RangeError('Unknown immersive controls');
  const defs=Array.from({length:counts[kind]},(_,index)=>({action:'select',index,label:`${names[kind]} ${index+1}`}));
  if(kind==='nexus')defs.push({action:'assemble',label:'Assemble structure'},{action:'separate',label:'Separate structure'},{action:'pause',label:'Pause assembly'});
  defs.push({action:'reset',label:kind==='forge'?'Restore overview':'Reset view'});
  if(kind==='neural')defs.push({action:'resumeIdle',label:'Resume gentle motion'});
  defs.push({action:'reduced',label:'Reduce motion'});
  return defs;
}

export function createSectionControls(c,kind,{presentation='immersive'}={}) {
  if(!['immersive','demo'].includes(presentation))throw new RangeError('Unknown control presentation');
  const defs=sectionControlDefinitions(kind),all=[];
  c.ui=document.createElement('section');c.ui.className='space-controls';c.ui.dataset.presentation=presentation;
  c.ui.setAttribute('aria-label',`${kind==='neural'?'Skills':kind} object controls`);
  c.status=document.createElement('p');c.status.className='space-assistive';c.status.setAttribute('role','status');c.ui.append(c.status);
  const help=document.createElement('p');help.className='space-assistive';help.id=`space-${kind}-instructions`;
  help.textContent=kind==='nexus'?'Activate the structure to assemble or separate it. Escape restores separation. Keyboard controls follow.':'Select an object to focus it. Escape resets the view. Tab or arrow keys reach the object controls; Enter or Space activates them.';
  c.ui.append(help);c.mount.setAttribute('aria-describedby',help.id);c.buttons=[];
  for(const def of defs){
    const label=def.action==='select'&&c.contentLabels?.[def.index]?`${def.label} · ${c.contentLabels[def.index]}`:def.label;
    const b=document.createElement('button');b.type='button';b.className='space-access-control';b.textContent=label;b.setAttribute('aria-label',label);
    b.dataset.action=def.action;if(def.index!==undefined)b.dataset.index=def.index;
    c.listen(b,'click',()=>{
      if(def.action==='select')c.select(c.motion.selected===def.index?null:def.index);
      else if(def.action==='reset')c.reset?c.reset():c.select(null);
      else if(def.action==='reduced')c.setReduced(!c.motion.reduced);
      else if(def.action==='pause')c.pause(!c.motion.paused);
      else c[def.action]();
    });
    if(def.action==='select'){
      c.buttons.push(b);c.listen(b,'focus',()=>{c.keyboardFocus=def.index;});c.listen(b,'blur',()=>{c.keyboardFocus=null;});
    }else if(def.action==='reset')c.overviewButton=c.resetButton=b;
    else if(def.action==='reduced')c.reducedButton=b;
    else if(def.action==='pause')c.pauseButton=b;
    all.push(b);c.ui.append(b);
  }
  c.selectButtons=c.buttons;
  c.listen(c.ui,'keydown',event=>{
    const index=all.indexOf(document.activeElement);let next;
    if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(index+1)%all.length;
    else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(index+all.length-1)%all.length;
    if(next!==undefined){event.preventDefault();all[next].focus();}
  });
  c.mount.append(c.ui);
  c.focusMark=document.createElement('div');c.focusMark.className='space-focus-mark';c.focusMark.setAttribute('aria-hidden','true');c.mount.append(c.focusMark);
  if(kind==='forge'){
    c.preview=document.createElement('div');c.preview.className='space-project-preview';c.preview.setAttribute('aria-hidden','true');
    c.previewTitle=document.createElement('span');c.preview.append(c.previewTitle);
    if(presentation==='demo')c.mount.append(c.preview);
  }
}
