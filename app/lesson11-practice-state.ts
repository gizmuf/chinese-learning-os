'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {lesson11Checks} from './lesson11-data';
import {courseEventSchema,type CourseEvent} from './course-learning';
export type Lesson11CheckDraft={choice:string;hint:boolean;done:boolean;correct:boolean;attemptId:string;submitted?:CourseEvent};
export type Lesson11PracticeState={version:1;owner:string;checkId:string;roundStartedAt:number;drafts:Record<string,Lesson11CheckDraft>};
const allowed=new Set(lesson11Checks.map(q=>q.id));
export const lesson11PracticeKey=(owner:string|null)=>'chineseos:lesson11-practice:v1:'+encodeURIComponent(owner??'guest');
export const emptyLesson11Practice=(owner:string|null):Lesson11PracticeState=>({version:1,owner:owner??'guest',checkId:lesson11Checks[0].id,roundStartedAt:0,drafts:{}});
export const freshLesson11Draft=():Lesson11CheckDraft=>({choice:'',hint:false,done:false,correct:false,attemptId:crypto.randomUUID()});
export function restoreLesson11Practice(raw:string|null,owner:string|null):Lesson11PracticeState{
 const empty=emptyLesson11Practice(owner);if(!raw)return empty;
 try{const v=JSON.parse(raw);if(v.version!==1||v.owner!==empty.owner||!allowed.has(v.checkId)||!Number.isFinite(v.roundStartedAt)||!v.drafts||typeof v.drafts!=='object')return empty;
 const drafts:Record<string,Lesson11CheckDraft>={};for(const [id,d] of Object.entries(v.drafts) as [string,Lesson11CheckDraft][]){const q=lesson11Checks.find(q=>q.id===id);if(!q||typeof d.hint!=='boolean'||typeof d.done!=='boolean'||typeof d.correct!=='boolean'||typeof d.choice!=='string'||d.choice&&!q.optionIds.includes(d.choice)||!d.attemptId||!/^[a-f0-9-]{36}$/i.test(d.attemptId))continue;
  if(d.submitted){const parsed=courseEventSchema.safeParse(d.submitted);if(!parsed.success||parsed.data.id!==d.attemptId||parsed.data.lessonId!=='intensive-11'||parsed.data.activityId!==id||parsed.data.correct!==(d.choice===q.targetId)||parsed.data.assisted!==d.hint)continue;}
  drafts[id]=d;
 }return {...empty,checkId:v.checkId,roundStartedAt:v.roundStartedAt,drafts};}catch{return empty;}
}
export function useLesson11PracticeState(owner:string|null){
 const [snapshot,setSnapshot]=useState({value:emptyLesson11Practice(owner),ready:false,writable:false}),current=useRef(snapshot.value),active=useRef(false);
 useEffect(()=>{active.current=true;let value=emptyLesson11Practice(owner),writable=false;try{value=restoreLesson11Practice(localStorage.getItem(lesson11PracticeKey(owner)),owner);localStorage.setItem(lesson11PracticeKey(owner),JSON.stringify(value));writable=true;}catch{}current.current=value;setSnapshot({value,ready:true,writable});return()=>{active.current=false;};},[owner]);
 const update=useCallback((change:(old:Lesson11PracticeState)=>Lesson11PracticeState)=>{if(!active.current||current.current.owner!==(owner??'guest'))return false;const next=change(current.current);try{localStorage.setItem(lesson11PracticeKey(owner),JSON.stringify(next));}catch{setSnapshot(old=>({...old,writable:false}));return false;}current.current=next;setSnapshot({value:next,ready:true,writable:true});return true;},[owner]);
 return {...snapshot,update};
}
