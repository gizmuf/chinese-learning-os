'use client';
import {useEffect,useRef,useState} from 'react';
import {useReferenceDisplay} from './reference-display';
import {StudyText} from './study-lookup';
import {Volume2} from 'lucide-react';
import {playRecording} from './audio';
import audioReuse from '../data/reference-lessons/audio-reuse.json';
import type {ReferenceCaption} from './reference-time-model';
export function ReferenceCaptionView({value,sourceId,context}:{value:ReferenceCaption;sourceId:string;context?:ReferenceCaption}){
 const source=context??value,display=useReferenceDisplay();
 return <div className="ref-scene-caption" data-study-sentence={source.hanzi} data-study-pinyin={source.pinyin} data-study-meaning={source.en} data-study-source-id={sourceId}><div lang="zh-Hans"><StudyText text={value.hanzi} pinyin={value.pinyin}/></div>{display.pinyin&&<p className="pinyin">{value.pinyin}</p>}{display.english&&<p className="ref-meaning">{value.en}</p>}<ReferenceListen text={value.hanzi}/></div>;
}
export function useReferenceReducedMotion(){
 const [reduced,setReduced]=useState(false);
 useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
 return reduced;
}
/** One deliberate replay, never an endless decorative loop. Pause stops elapsed time. */
export function useReferenceMotion(identity:string,duration=2600){
 const reduced=useReferenceReducedMotion(),[progress,setProgress]=useState(0),[playing,setPlaying]=useState(false),last=useRef<number|null>(null),selected=useRef(false);
 useEffect(()=>{setProgress(reduced?1:0);setPlaying(selected.current&&!reduced);selected.current=false;last.current=null;},[identity]);
 useEffect(()=>{if(reduced){setPlaying(false);setProgress(1);}},[reduced]);
 useEffect(()=>{
  if(!playing||reduced){last.current=null;return;}
  let handle=0,active=true;
  const tick=(now:number)=>{if(!active)return;if(document.querySelector('dialog[open]')){setPlaying(false);return;}const delta=last.current===null?0:Math.min(100,now-last.current);last.current=now;setProgress(value=>{const next=Math.min(1,value+delta/duration);if(next===1)queueMicrotask(()=>{if(active)setPlaying(false);});return next;});handle=requestAnimationFrame(tick);};
  handle=requestAnimationFrame(tick);return()=>{active=false;cancelAnimationFrame(handle);last.current=null;};
 },[playing,reduced,duration]);
 return {progress,playing,reduced,select:(change:()=>void)=>{selected.current=true;change();setProgress(reduced?1:0);setPlaying(!reduced);last.current=null;},toggle:()=>{if(progress>=1)setProgress(0);setPlaying(value=>!value);},replay:()=>{setProgress(reduced?1:0);setPlaying(!reduced);},start:()=>{setPlaying(false);setProgress(0);},finish:()=>{setPlaying(false);setProgress(1);}};
}
export function ReferenceMotionControls({motion,onReplay}:{motion:ReturnType<typeof useReferenceMotion>;onReplay?:()=>void}){
 return <div className="ref-scene-controls ref-motion-controls"><button type="button" className="text-button" aria-label="Repeat this scene" onClick={onReplay??motion.replay}>↻ Repeat</button></div>;
}

const recordings=audioReuse as Record<string,{text:string;source:string;sha256:string}>;
export function playReferenceCaption(text:string,notify:(message:string)=>void=()=>{}){const clip=recordings[text];if(clip?.text===text)playRecording(clip.source,notify);}
export function ReferenceListen({text}:{text:string}){
 const [error,setError]=useState(''),clip=recordings[text];
 if(!clip||clip.text!==text)return null;
 return <><button type="button" className="text-button ref-listen" aria-label={'Listen: '+text} onClick={()=>{setError('');playRecording(clip.source,setError);}}><Volume2 size={16}/> Listen</button>{error&&<small role="status">{error}</small>}</>;
}
