'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {emptyReferenceCheckpoint,persistReferenceCheckpoint,referenceCheckpointKey,restoreReferenceCheckpoint} from './reference-lesson-state';
import type {ReferenceCheckpoint,ReferenceLesson} from './reference-lesson-types';
export function useReferenceCheckpoint(owner:string|null,lesson:ReferenceLesson){
 const initial=emptyReferenceCheckpoint(owner,lesson),current=useRef(initial),active=useRef(false);
 const [snapshot,setSnapshot]=useState({value:initial,ready:false,writable:false});
 useEffect(()=>{
  active.current=true;let value=emptyReferenceCheckpoint(owner,lesson),writable=false;
  try{value=restoreReferenceCheckpoint(localStorage.getItem(referenceCheckpointKey(owner,lesson.id)),owner,lesson);writable=persistReferenceCheckpoint(localStorage,value);}catch{}
  current.current=value;setSnapshot({value,ready:true,writable});
  return()=>{active.current=false;};
 },[owner,lesson]);
 const update=useCallback((change:(old:ReferenceCheckpoint)=>ReferenceCheckpoint)=>{
  if(!active.current||current.current.owner!==(owner??'guest')||current.current.material!==lesson.id)return false;
  const next=change(current.current);let writable=false;
  try{writable=persistReferenceCheckpoint(localStorage,next);}catch{}
  current.current=next;setSnapshot({value:next,ready:true,writable});return writable;
 },[owner,lesson]);
 return {...snapshot,update,current};
}
