export function createSectionControls(controller,kind) {
  const neural=kind==='neural',count=neural?15:6,c=controller;
  c.ui=document.createElement('section');c.ui.className='space-controls';
  c.ui.setAttribute('aria-label',neural?'Crimson Synapse node controls':'Project Forge selection');
  c.status=document.createElement('p');c.status.setAttribute('role','status');c.ui.append(c.status);
  const row=document.createElement('div');row.className='space-choices';c.ui.append(row);
  const button=(text,action,parent=row)=>{
    const b=document.createElement('button');b.type='button';b.textContent=text;
    c.listen(b,'click',action);parent.append(b);return b;
  };
  c.buttons=Array.from({length:count},(_,i)=>{
    const b=button(String(i+1).padStart(2,'0'),()=>c.select(c.motion.selected===i?null:i));
    b.setAttribute('aria-label',neural?`Select placeholder node ${i+1}`:`Select project slot ${i+1}`);
    c.listen(b,'focus',()=>{c.keyboardFocus=i;});c.listen(b,'blur',()=>{c.keyboardFocus=null;});
    return b;
  });
  const actions=document.createElement('div');actions.className='space-control-actions';c.ui.append(actions);
  c.overviewButton=c.resetButton=button(neural?'Reset · Esc':'Overview · Esc',()=>c.select(null),actions);
  if(neural)button('Resume idle',()=>c.resumeIdle(),actions);
  c.reducedButton=button('Reduced motion · M',()=>c.setReduced(!c.motion.reduced),actions);
  const help=document.createElement('p');help.className='space-help';
  help.textContent=neural?'Demonstration topology · No verified skills mapped. Arrow keys navigate · Enter selects.':'Six project placeholders · Keys 1–6 select. No project data mapped.';
  c.ui.append(help);c.mount.append(c.ui);
  c.focusMark=document.createElement('div');c.focusMark.className='space-focus-mark';c.focusMark.setAttribute('aria-hidden','true');c.mount.append(c.focusMark);
  if(!neural){
    c.preview=document.createElement('div');c.preview.className='space-project-preview';c.preview.setAttribute('aria-hidden','true');
    c.previewTitle=document.createElement('span');c.preview.append(c.previewTitle);c.mount.append(c.preview);
  }
}
