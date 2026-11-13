'use client';
import {useEffect,useRef,useState} from 'react';
import {playRecording} from './audio';

/** Speaker feedback follows real media events, including interruption by another clip. */
export function useRecordingPlayback(notify:(message:string)=>void){
  const [playing,setPlaying]=useState<string|null>(null),generation=useRef(0);
  useEffect(()=>()=>{generation.current++;},[]);
  function play(source:string){
    const token=++generation.current;setPlaying(null);
    const audio=playRecording(source,notify);
    const active=()=>token===generation.current;
    audio?.addEventListener('playing',()=>{if(active())setPlaying(source);});
    for(const event of ['ended','error','emptied'])audio?.addEventListener(event,()=>{if(active())setPlaying(null);});
  }
  return {playing,play};
}
