import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Hero from './Hero.jsx';
import CommandCenter from './CommandCenter.jsx';
import SectionJourney from './SectionJourney.jsx';
import { sampleChamber } from '../playcanvas/chamberTimeline.js';
import { scrollToChamber } from '../chamberNavigation.js';
import './gatewayExperience.css';

function ChamberAtmosphere() {
  return <div className="chamber-atmosphere" aria-hidden="true">
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
      <defs><filter id="chamber-soft-light"><feGaussianBlur stdDeviation="12" /></filter></defs>
      <g className="chamber-floor-light" filter="url(#chamber-soft-light)" fill="none" stroke="#b65a24" strokeWidth="8">
        <path d="M120 900 510 782 612 748 770 724"/><path d="M1440 866 1050 794 962 745 820 724"/>
      </g>
      <g className="chamber-floor-seams" fill="none" stroke="#cf6e30">
        <path d="M0 894 430 812 404 801 599 768 580 758 770 724"/>
        <path d="M1440 881 1161 835 1186 824 1006 783 1020 775 820 724"/>
        <path d="M520 900 628 837 613 828 717 770 770 724"/>
      </g>
      <g className="chamber-embers" fill="#df8a44">
        {[[112,589],[284,318],[416,667],[573,201],[747,543],[916,291],[1081,604],[1275,432]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i%3===0?1.5:.8} />)}
      </g>
    </svg>
  </div>;
}

export default function GatewayExperience({profile,visibility,content,reduced,utilities}) {
  const chamber=useRef(null),hub=useRef(null),latest=useRef({target:0,actual:0,mode:'loading'}),pendingFocus=useRef(null);
  const journey=useRef(null);
  const sectionActive=useRef(false);
  const openSection=useCallback(id=>journey.current?.open(id),[]);
  const sectionProgress=useCallback(value=>chamber.current?.style.setProperty('--section-progress',value),[]);
  const visitingSection=useCallback(value=>{sectionActive.current=value;hub.current?.setSuspended(value);},[]);
  const canEnter=useCallback(()=>!hub.current||hub.current.getState().disposed||hub.current.getState().settled,[]);
  const [preload,setPreload]=useState(reduced),[fallback,setFallback]=useState(false);
  const still=useRef(reduced);still.current=reduced||fallback;
  const previousStill=useRef(still.current);
  const restoreArrival=useRef(false);
  useLayoutEffect(()=>{
    if(previousStill.current!==still.current) {
      if(chamber.current?.querySelector('.experience-preferences')?.contains(document.activeElement))
        scrollToChamber('#experience-preferences','instant');
      else if(restoreArrival.current)scrollToChamber('#explore','instant');
      restoreArrival.current=false;
    }
    previousStill.current=still.current;
  },[reduced,fallback]);
  const apply=useCallback(progress=>{
    const el=chamber.current;if(!el)return;
    const s=sampleChamber(progress,still.current);
    journey.current?.setChamber(s.interactive);
    const shell=el.closest('.awakening-shell'),opening=shell.querySelector('.opening-screen');
    el.style.setProperty('--chamber-reveal',s.reveal);
    el.style.setProperty('--chamber-depth',s.depth);
    el.style.setProperty('--chamber-text',s.text);
    el.style.setProperty('--chamber-controls',s.controls);
    el.dataset.phase=s.interactive?'arrived':s.reveal?'emerging':'gateway';
    opening.style.opacity=s.openingOpacity;
    opening.inert=s.openingOpacity<.02&&!still.current;
    if(!s.interactive&&el.contains(document.activeElement)) {
      shell.setAttribute('tabindex','-1');shell.focus({preventScroll:true});
    }
    el.inert=!s.interactive;
    hub.current?.setEmergence(1-s.depth);
    if(s.interactive&&pendingFocus.current) {
      const hash=pendingFocus.current;pendingFocus.current=null;
      const target=hash==='#experience-preferences'?el.querySelector('.experience-preferences button'):el.querySelector('#explore-title');
      target?.focus({preventScroll:true});
    }
  },[]);
  const attachHub=useCallback(value=>{
    hub.current=value;
    value?.setSuspended(sectionActive.current);
    apply(latest.current.mode==='ready'?latest.current.actual:latest.current.target);
  },[apply]);
  const onTarget=useCallback(value=>{
    latest.current.target=value;
    if(value>.45)setPreload(true);
    if(latest.current.mode!=='ready'||still.current)apply(value);
  },[apply]);
  const onFrame=useCallback(value=>{latest.current.actual=value;apply(value);},[apply]);
  const onMode=useCallback(mode=>{
    if(mode==='error'&&latest.current.mode!=='error') {
      const rect=chamber.current?.getBoundingClientRect();
      restoreArrival.current=!!rect&&rect.top<innerHeight&&rect.bottom>0&&latest.current.target>.78;
    }
    latest.current.mode=mode;setFallback(mode==='error');
    if(mode==='error')setPreload(true);
  },[]);
  useEffect(()=>{
    if(still.current)setPreload(true);
    apply(latest.current.mode==='ready'?latest.current.actual:latest.current.target);
  },[reduced,fallback,apply]);
  useEffect(()=>{
    const el=chamber.current,shell=el.closest('.awakening-shell');
    const resize=()=>shell.style.setProperty('--chamber-height',Math.max(innerHeight,el.offsetHeight)+'px');
    const observer=new ResizeObserver(resize);observer.observe(el);addEventListener('resize',resize);resize();
    const navigate=event=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const anchor=event.target.closest?.('a[href]');if(!anchor)return;
      const url=new URL(anchor.href,location.href);
      if(url.origin!==location.origin||url.pathname!==location.pathname||!scrollToChamber(url.hash,still.current?'instant':'smooth'))return;
      event.preventDefault();history.pushState(null,'',url.hash);pendingFocus.current=url.hash;
      if(still.current||latest.current.actual===1)apply(latest.current.target);
    };
    document.addEventListener('click',navigate);
    return()=>{observer.disconnect();removeEventListener('resize',resize);document.removeEventListener('click',navigate);};
  },[apply]);
  return <><Hero profile={profile} reduced={reduced} onFrame={onFrame} onTarget={onTarget} onMode={onMode}>
    <div ref={chamber} id="awakening-boundary" className="inner-chamber" data-phase="gateway">
      <ChamberAtmosphere />
      <CommandCenter profile={profile} visibility={visibility} reduced={reduced} utilities={utilities} preload={preload} onRuntime={attachHub} onOpen={openSection} />
    </div>
  </Hero><SectionJourney ref={journey} reduced={reduced} visibility={visibility} content={content} canStart={canEnter} onProgress={sectionProgress} onVisiting={visitingSection}/></>;
}
