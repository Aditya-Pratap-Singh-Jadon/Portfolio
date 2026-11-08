import { useEffect, useRef, useState } from 'react';
import { signalLinks, hubCopy } from '../../shared/signals.js';
import './commandCenter.css';

export default function CommandCenter({visibility,profile,reduced,utilities}) {
  const section=useRef(null),canvas=useRef(null),runtime=useRef(null),reducedRef=useRef(reduced),controls=useRef([]),openLink=useRef(null);
  const [entered,setEntered]=useState(false),[attempt,retry]=useState(0),[state,setState]=useState('loading'),[selected,setSelected]=useState(null);
  reducedRef.current=reduced;
  const choices=signalLinks(visibility,profile);
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
  useEffect(()=>{
    if(selected===null)return;
    openLink.current?.focus({preventScroll:true});
    const tablet=innerWidth>760&&innerWidth<=1100&&innerHeight>600;
    const target=tablet?section.current.querySelector('.hub-focus'):canvas.current.parentElement;
    const rect=target.getBoundingClientRect();
    if(innerWidth<=760||rect.top<24||rect.bottom>innerHeight-24)
      target.scrollIntoView({block:innerWidth<=1100?'start':'center',behavior:reducedRef.current?'instant':'smooth'});
  },[selected]);
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
    <div className="hub-composition" data-ui>
    <header className="hub-intro">
      <h2 id="explore-title" tabIndex="-1">{hubCopy.title}</h2>
      <p>{hubCopy.introduction}</p>
      <span className="content-note">{hubCopy.note}</span>
    </header>
    <div className={`hub-stage ${state==='ready'?'is-ready':''}`}>
      <canvas key={attempt} ref={canvas} aria-hidden="true" />
      {state!=='ready'&&<div className="hub-message" role="status">{state==='error'?<><p>The 3D hub is unavailable. Use the links below.</p><button onClick={()=>retry(n=>n+1)}>Retry 3D hub</button></>:<p>Preparing the Command Center. Navigation is available below.</p>}</div>}
    </div>
    <div className={`hub-focus ${current?'has-focus':''}`} aria-label={current?`${current.title} selected`:'Signal overview'}>
      {current?<>
        <h3>{current.title}</h3><p className="hub-section-kind">{current.subtitle}</p><p>{current.summary}</p>
        <div className="hub-focus-actions"><a ref={openLink} className="hub-open" href={current.href} onClick={navigate}>Open {current.title} <span aria-hidden="true">↗</span></a>
        <button onClick={overview}>Overview <span aria-hidden="true">↶</span></button></div>
      </>:<>
        <h3>Choose a signal.</h3>
        <p>{reduced?'A still view. Every section is one link away.':'Bring a glass panel into focus, then open its section.'}</p>
        {visibility.about&&<a className="hub-browse" href="#about" onClick={navigate}>Or start with Origin ↓</a>}
      </>}
    </div>
    <div className="hub-index">
    <p className="hub-status" role="status">{current?`${current.title} in focus · Esc for overview`:reduced?'Still view · direct navigation':state==='ready'?'Command index · select a panel':'Command index · direct navigation'}</p>
    <nav className="hub-controls" aria-label="Command Center panels">
      {choices.map((p,i)=>p.enabled&&<div key={p.id}>
        {state==='ready'&&!reduced?<button ref={e=>controls.current[i]=e} aria-pressed={selected===i} onPointerEnter={()=>runtime.current?.hover(i)} onPointerLeave={()=>runtime.current?.hover(null)} onFocus={()=>runtime.current?.hover(i)} onBlur={()=>runtime.current?.hover(null)} onClick={()=>runtime.current?.select(i)}><kbd aria-hidden="true">{i+1}</kbd>{p.title}</button>:<a href={p.href} onClick={navigate}>{p.title}<span aria-hidden="true">↗</span></a>}
      </div>)}
    </nav>
    {!reduced&&state==='ready'&&<p className="hub-key-hint">Keys 1–8 to focus · Enter to open · Esc to return</p>}
    </div>
    <div className="hub-utilities"><div className="hub-utility-links"><a href="#home" onClick={()=>runtime.current?.select(null)}>Gateway ↑</a><a href="/quick">Quick view ↗</a></div>{utilities}</div>
    </div>
  </section>;
}
