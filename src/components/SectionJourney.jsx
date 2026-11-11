import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {SectionNavigation,destinations} from '../sectionNavigation.js';
import {scrollToChamber} from '../chamberNavigation.js';
import {runtimeDestinations} from '../playcanvas/sectionScenes.js';
import SectionContent from './SectionContent.jsx';
import SceneContent from './SceneContent.jsx';
import {sceneEntry,sceneBindings} from '../../shared/sceneContent.js';
import './sectionJourney.css';

function Destination({id,token,reduced,interactive,hasContent,content,onReady,onError,onRetry,onFallback}) {
  const canvas=useRef(null),mount=useRef(null),runtime=useRef(null);
  const [status,setStatus]=useState('loading');
  const [selected,setSelected]=useState(null);
  const callbacks=useRef({onReady,onError});callbacks.current={onReady,onError};
  const currentReduced=useRef(reduced);currentReduced.current=reduced;
  const spatial=Object.hasOwn(runtimeDestinations,id),destination=destinations[id];
  useEffect(()=>{
    if(!spatial){callbacks.current.onReady(token);return;}
    const abort=new AbortController();let instance,cancelled=false;
    setStatus('loading');setSelected(null);
    const fail=()=>{if(!cancelled){setSelected(null);setStatus('error');callbacks.current.onError(token);}};
    const timeout=setTimeout(()=>{fail();abort.abort();instance?.dispose();},30000);
    import('../playcanvas/sectionRuntime.js').then(({createSectionRuntime})=>createSectionRuntime(canvas.current,{
      destination:id,mount:mount.current,signal:abort.signal,reduced:currentReduced.current,onError:fail,
      contentLabels:sceneBindings[id]?.map((_,index)=>sceneEntry(content,id,index).title),
      contentStatuses:sceneBindings[id]?.map((_,index)=>sceneEntry(content,id,index).record?.status||''),
      onSelection:index=>{if(!cancelled){
        if(index===null&&document.activeElement?.closest('.space-detail'))mount.current?.closest('.space-shell').querySelector('.space-back')?.focus({preventScroll:true});
        setSelected(index);
      }},
    })).then(value=>{
      instance=value;
      if(cancelled||abort.signal.aborted){value.dispose();return;}
      clearTimeout(timeout);runtime.current=value;value.setReduced(currentReduced.current);setStatus('ready');callbacks.current.onReady(token);
      if(import.meta.env.DEV)window.__MI_SECTION__=value;
    }).catch(error=>{clearTimeout(timeout);if(!cancelled&&error.name!=='AbortError'){console.error('Section runtime:',error);fail();}});
    return()=>{cancelled=true;clearTimeout(timeout);abort.abort();instance?.dispose();if(runtime.current===instance)runtime.current=null;if(window.__MI_SECTION__===instance)delete window.__MI_SECTION__;};
  },[id,token,spatial]);
  useEffect(()=>{runtime.current?.setReduced(reduced);},[reduced]);
  const entry=sceneEntry(content,id,selected);
  const close=()=>runtime.current?.reset();
  return <>
    {spatial?<>
      <div className="space-visual"><canvas ref={canvas} aria-hidden="true"/></div>
      <div ref={mount} className="space-interaction" inert={interactive?undefined:''}/>
      <span className="space-assistive" role="status">{entry?.title||''}</span>
      {status==='ready'&&interactive&&<SceneContent entry={entry} content={content} onClose={close}/>}
      {status!=='ready'&&<div className="space-load" role="status">
        <h3>{status==='error'?`${destination.title} is unavailable`:`Opening ${destination.title}`}</h3>
        <p>{status==='error'?'The 3D scene could not be opened. Return, retry, or use the accessible section.':'Preparing the inner space. You can return at any time.'}</p>
        {status==='error'&&<><button onClick={onRetry}>Retry 3D scene</button>{hasContent&&<button onClick={()=>onFallback(id)}>Read accessible section</button>}</>}
      </div>}
    </>:<div className="space-content"><SectionContent id={id} content={content}/></div>}
  </>;
}

const fromHash=()=>{
  const match=/^#space-([a-z]+)$/.exec(location.hash);
  return match&&Object.hasOwn(destinations,match[1])?match[1]:null;
};

export default forwardRef(function SectionJourney({reduced,visibility,content,canStart,onProgress,onVisiting},ref) {
  const nav=useRef(new SectionNavigation()),loaded=useRef(null),focus=useRef(null),fallback=useRef(null),backButton=useRef(null);
  const [state,setState]=useState(()=>({...nav.current.state}));
  const callbacks=useRef({canStart,onProgress,onVisiting});callbacks.current={canStart,onProgress,onVisiting};
  const publish=()=>setState({...nav.current.state});
  const open=id=>{
    if(!nav.current.state.destination)focus.current=document.activeElement;
    scrollToChamber('#explore','instant');
    if(fromHash()!==id)history.pushState({miSection:true},'',`#space-${id}`);
    nav.current.enter(id);publish();
  };
  const back=()=>{
    backButton.current?.focus({preventScroll:true});
    nav.current.back();publish();
    if(history.state?.miSection)history.back();else history.replaceState(null,'','#explore');
  };
  useImperativeHandle(ref,()=>({open,setChamber:value=>nav.current.setChamber(value)}));
  useEffect(()=>{
    const pop=()=>{const id=fromHash();if(id){scrollToChamber('#explore','instant');nav.current.enter(id);}else nav.current.back();publish();};
    addEventListener('popstate',pop);const initial=fromHash();if(initial)open(initial);
    return()=>removeEventListener('popstate',pop);
  },[]);
  useEffect(()=>{nav.current.setReduced(reduced);},[reduced]);
  const visiting=!!state.destination;
  useEffect(()=>{
    if(!visiting)return;
    const root=document.getElementById('root'),overflow=document.body.style.overflow;
    const inert=root?.inert;if(root)root.inert=true;document.body.style.overflow='hidden';backButton.current?.focus({preventScroll:true});
    return()=>{
      if(root)root.inert=inert;document.body.style.overflow=overflow;
      if(fallback.current){
        const id=fallback.current;fallback.current=null;
        const hash=id==='linkedin'?'updates':id==='github'?'projects':id;
        history.replaceState(null,'','#'+hash);const target=document.getElementById(hash);target?.scrollIntoView({behavior:'instant'});
        const heading=target?.querySelector('h2');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});
      }else if(focus.current&&focus.current!==document.body)focus.current.focus({preventScroll:true});
      else document.getElementById('explore-title')?.focus({preventScroll:true});
    };
  },[visiting]);
  useEffect(()=>{
    if(!visiting||state.phase==='active'||state.error)return;
    let frame,previous=performance.now();
    const tick=now=>{
      const controller=nav.current,s=controller.state;
      if(loaded.current===s.token&&!s.ready&&callbacks.current.canStart())controller.ready(s.token);
      const before=JSON.stringify(s);controller.update(Math.max(0,now-previous)/1000);previous=now;
      callbacks.current.onProgress(controller.state.progress);
      if(before!==JSON.stringify(controller.state))publish();
      if(controller.state.destination&&controller.state.phase!=='active')frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[visiting,state.token,state.phase,state.error]);
  useEffect(()=>{callbacks.current.onVisiting(state.phase==='active');return()=>callbacks.current.onVisiting(false);},[state.phase]);
  if(!visiting)return null;
  const p=state.progress*state.progress*(3-2*state.progress);
  return createPortal(<section className="space-shell" role="dialog" aria-modal="true" aria-labelledby="space-title" data-phase={state.phase} data-destination={state.destination}
    style={{'--space-progress':p}} onKeyDown={event=>{
      if(event.key!=='Tab')return;
      const controls=[...event.currentTarget.querySelectorAll('button,a[href],[tabindex="0"]')].filter(e=>!e.disabled&&!e.closest('[inert]')&&e.getClientRects().length);
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }}>
    <header className="space-header"><h2 id="space-title">{destinations[state.destination].title}</h2>
      <button ref={backButton} className="space-back" onClick={back}>← Command Center</button></header>
    <div className="space-destination">
      <Destination key={state.token} id={state.destination} token={state.token} reduced={reduced} content={content} interactive={state.phase==='active'}
        hasContent={Boolean(visibility[state.destination==='github'?'projects':state.destination==='linkedin'?'updates':state.destination])}
        onReady={token=>{loaded.current=token;}} onError={token=>{if(token!==nav.current.state.token)return;backButton.current?.focus({preventScroll:true});loaded.current=null;nav.current.fail(token);publish();}}
        onRetry={()=>{backButton.current?.focus({preventScroll:true});loaded.current=null;nav.current.retry();publish();}}
        onFallback={id=>{fallback.current=id;back();}}/>
    </div>
  </section>,document.body);
});
