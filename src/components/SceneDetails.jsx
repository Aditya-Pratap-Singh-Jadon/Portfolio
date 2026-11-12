import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import SceneContent from './SceneContent.jsx';

export default function SceneDetails({entry,selectionKey,ready,reduced,interactive,content,onClose}){
  const [shown,setShown]=useState(entry),[stage,setStage]=useState('visible');
  const shownKey=useRef(selectionKey);
  const shell=useRef(null);
  useLayoutEffect(()=>{shell.current?.querySelector('.space-detail-body')?.scrollTo({top:0,behavior:'instant'});},[shown?.record]);
  useEffect(()=>{
    if(reduced){shownKey.current=selectionKey;setShown(entry);setStage('visible');return;}
    if(!entry){
      setStage('leaving');const timer=setTimeout(()=>setShown(null),140);
      return()=>clearTimeout(timer);
    }
    if(!shown||shownKey.current===selectionKey){shownKey.current=selectionKey;setShown(entry);setStage('visible');return;}
    setStage('changing');
    const timer=setTimeout(()=>{shownKey.current=selectionKey;setShown(entry);setStage('visible');},90);
    return()=>clearTimeout(timer);
  },[selectionKey,entry?.record,ready,reduced]);
  if(!shown)return null;
  const available=Boolean(entry)&&ready&&interactive&&stage==='visible';
  return <div ref={shell} className="space-detail-shell" data-stage={stage} data-ready={ready?'true':'false'}
    inert={available?undefined:''} aria-hidden={available?undefined:true}>
    <SceneContent entry={shown} content={content} onClose={onClose}/>
  </div>;
}
