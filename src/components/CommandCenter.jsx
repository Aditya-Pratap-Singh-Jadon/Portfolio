import { useEffect, useRef, useState } from 'react';
import { safeUrl } from '../../shared/content.js';
import './commandCenter.css';

const panels=[
  ['about','Origin','Identity and background'],['projects','Forge','Projects and selected work'],
  ['experience','Chronicle','Experience and contributions'],['skills','Neural Core','Skills and supporting evidence'],
  ['github','GitHub','Public repositories'],['linkedin','Signal','Posts and professional profile'],
  ['achievements','Vault','Education and achievements'],['contact','Nexus','Get in touch'],
];

export default function CommandCenter({visibility,profile,reduced}) {
  const section=useRef(null),canvas=useRef(null),runtime=useRef(null),reducedRef=useRef(reduced),controls=useRef([]),openLink=useRef(null);
  const [entered,setEntered]=useState(false),[attempt,retry]=useState(0),[state,setState]=useState('loading'),[selected,setSelected]=useState(null);
  reducedRef.current=reduced;
  const choices=panels.map(([id,title,description])=>({id,title,description,
    href:id==='github'?profile.github:id==='linkedin'?(visibility.updates?'#updates':profile.linkedin):'#'+id,
    enabled:id==='github'?Boolean(profile.github)&&safeUrl(profile.github):id==='linkedin'?visibility.updates||Boolean(profile.linkedin)&&safeUrl(profile.linkedin):Boolean(visibility[id]),
  }));
  const enabledKey=choices.map(p=>p.enabled?'1':'0').join('');
  useEffect(()=>{
    const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting)setEntered(true);},{rootMargin:'900px'});
    observer.observe(section.current);
    const handoff=e=>{if(e.detail.completed)setEntered(true);};
    document.addEventListener('mi:opening:handoff',handoff);
    return()=>{observer.disconnect();document.removeEventListener('mi:opening:handoff',handoff);};
  },[]);
  useEffect(()=>{
    if(!entered)return;
    const controller=new AbortController();let instance,cancelled=false;
    setState('loading');setSelected(null);
    const fail=()=>{if(!cancelled){setState('error');setSelected(null);}};
    const timeout=setTimeout(()=>{fail();controller.abort();instance?.dispose();},25000);
    import('../playcanvas/hubRuntime.js').then(({createHubRuntime})=>createHubRuntime(canvas.current,{
      signal:controller.signal,reduced:reducedRef.current,enabled:[...enabledKey].map(v=>v==='1'),
      onSelect:index=>{
        if(cancelled)return;
        setSelected(index);
        if(index!==null) {
          const stage=canvas.current.parentElement,rect=stage.getBoundingClientRect();
          if(rect.top<24||rect.bottom>innerHeight-24)stage.scrollIntoView({block:'center',behavior:reducedRef.current?'instant':'smooth'});
        }
      },onError:fail,
    })).then(value=>{
      instance=value;
      if(cancelled||controller.signal.aborted){value.dispose();return;}
      clearTimeout(timeout);runtime.current=value;value.setReduced(reducedRef.current);setState('ready');
      if(import.meta.env.DEV)window.__MI_HUB__=value;
    }).catch(error=>{clearTimeout(timeout);if(!cancelled){console.error('Hub runtime:',error);fail();}});
    return()=>{cancelled=true;clearTimeout(timeout);controller.abort();instance?.dispose();if(runtime.current===instance)runtime.current=null;if(window.__MI_HUB__===instance)delete window.__MI_HUB__;};
  },[entered,attempt,enabledKey]);
  useEffect(()=>{runtime.current?.setReduced(reduced);},[reduced]);
  useEffect(()=>{if(selected!==null)openLink.current?.focus({preventScroll:true});},[selected]);
  const overview=()=>{const previous=selected;runtime.current?.select(null);controls.current[previous]?.focus({preventScroll:true});};
  const navigate=event=>{
    const href=event.currentTarget.getAttribute('href');
    if(!href?.startsWith('#')||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const target=document.getElementById(href.slice(1));
    if(!target)return;
    event.preventDefault();runtime.current?.select(null);history.pushState(null,'',href);
    target.scrollIntoView({behavior:reduced?'instant':'smooth'});
    const heading=target.querySelector('h2');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});
  };
  const current=selected===null?null:choices[selected];
  return <section id="explore" ref={section} className="section command-section" aria-labelledby="explore-title" onKeyDown={event=>{
    if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;
    if(event.key==='Escape'&&selected!==null){event.preventDefault();overview();}
    if(/^[1-8]$/.test(event.key)&&state==='ready'&&!reduced){const i=Number(event.key)-1;if(choices[i].enabled){event.preventDefault();runtime.current?.select(i);}}
  }}>
    <div className="section-heading"><div><p className="hub-eyebrow">MI_02 / THE COMMAND CENTER</p><h2 id="explore-title" tabIndex="-1">Find your way in.</h2><p className="section-subtitle">Eight signals. One place to begin.</p></div><a className="text-link" href="/quick">Quick view ↗</a></div>
    <div className={`hub-stage ${state==='ready'?'is-ready':''}`}>
      <canvas key={attempt} ref={canvas} aria-hidden="true" />
      {state!=='ready'&&<div className="hub-message" role="status">{state==='error'?<><p>The 3D hub is unavailable. Use the links below.</p><button onClick={()=>retry(n=>n+1)}>Retry 3D hub</button></>:<p>Preparing the Command Center. Navigation is available below.</p>}</div>}
      {current&&<div className="hub-focus" aria-label={`${current.title} selected`}>
        <p className="hub-eyebrow">{String(selected+1).padStart(2,'0')} / SELECTED</p><h3>{current.title}</h3><p>{current.description}</p>
        <a ref={openLink} className="text-link" href={current.href} onClick={navigate}>Explore {current.title} ↗</a>
        <button onClick={overview}>Return to overview <span aria-hidden="true">↶</span></button>
      </div>}
    </div>
    <p className="hub-status" role="status">{current?`${current.title} selected. Explore it or return with Escape.`:reduced?'Still view · direct navigation':state==='ready'?'Select a glass panel, or choose below. Keys 1–8 focus a panel.':'Direct navigation'}</p>
    <nav className="hub-controls" aria-label="Command Center panels">
      {choices.map((p,i)=>p.enabled&&<div key={p.id}>
        {state==='ready'&&!reduced?<button ref={e=>controls.current[i]=e} aria-pressed={selected===i} onPointerEnter={()=>runtime.current?.hover(i)} onPointerLeave={()=>runtime.current?.hover(null)} onFocus={()=>runtime.current?.hover(i)} onBlur={()=>runtime.current?.hover(null)} onClick={()=>runtime.current?.select(i)}><span>{String(i+1).padStart(2,'0')}</span>{p.title}</button>:<a href={p.href} onClick={navigate}><span>{String(i+1).padStart(2,'0')}</span>{p.title} ↗</a>}
      </div>)}
    </nav>
    <div className="hub-footnote"><a href="#home" onClick={()=>runtime.current?.select(null)}>Return to the gateway ↑</a><span>Every section remains available below.</span>{visibility.updates&&<a href="#updates" onClick={navigate}>Latest updates ↓</a>}</div>
  </section>;
}
