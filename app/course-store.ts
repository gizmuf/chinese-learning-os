"use client";
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {authenticatedFetch} from './auth-client';
import type {CourseEvent,StoredCourseEvent} from './course-learning';
import {openCourseStore,readCourseEvents,courseSession} from './course-persistence';
type Session=ReturnType<typeof courseSession>;
export function useCourseProgress(owner:string|null){
 const ownerRef=useRef(owner);
 useLayoutEffect(()=>{ownerRef.current=owner;},[owner]);
 const [snapshot,setSnapshot]=useState<{owner:string|null;session:Session;events:StoredCourseEvent[];status:string}|null>(null);
 const [storageError,setStorageError]=useState<{owner:string|null}|null>(null);
 const current=snapshot?.owner===owner?snapshot:null;
 useEffect(()=>{
  let active=true,session:Session|undefined;
  void openCourseStore(owner??'guest').then(async db=>{
   session=courseSession(db,owner,()=>active&&ownerRef.current===owner,authenticatedFetch);
   if(!session.active()){session.dispose();return;}
   const events=await readCourseEvents(db);
   if(session.active())setSnapshot({owner,session,events,status:owner?'Ready to sync':'Guest · saved on this device'});
  }).catch(()=>{if(active)setStorageError({owner});});
  return()=>{active=false;session?.dispose();};
 },[owner]);
 const session=current?.session;
 const update=useCallback((events:StoredCourseEvent[]|null,status:string)=>{
  if(!session?.active())return;
  setSnapshot(old=>old?.session===session?{...old,events:events??old.events,status}:old);
 },[session]);
 const sync=useCallback(async()=>{
  if(!session||!owner)return;
  try{
   if(!navigator.onLine)throw Error('offline');
   const events=await session.sync();
   if(events)update(events,events.some(e=>!e.synced)?'Saved here · sync pending':'All progress synced');
  }catch{update(null,navigator.onLine?'Saved here · sync pending':'Offline · saved on this device');}
 },[session,owner,update]);
 useEffect(()=>{queueMicrotask(()=>void sync());window.addEventListener('online',sync);return()=>window.removeEventListener('online',sync);},[sync]);
 const events=current?.events;
 useEffect(()=>{if(events?.some(e=>!e.synced))queueMicrotask(()=>void sync());},[events,sync]);
 const record=useCallback(async(event:CourseEvent)=>{
  if(!session)throw Error('Storage is not ready.');
  const events=await session.record(event);
  update(events,owner?'Saved here · syncing…':'Guest · saved on this device');
 },[session,owner,update]);
 return {events:events??[],record,status:current?.status??(storageError?.owner===owner?'Device storage unavailable':'Loading your notebook…'),ready:!!session,sync};
}
