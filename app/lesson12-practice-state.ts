'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {lesson12Checks} from './lesson12-data';
import {courseEventSchema,type CourseEvent} from './course-learning';
export type Lesson12CheckDraft={choice:string;hint:boolean;done:boolean;correct:boolean;attemptId:string;submitted?:CourseEvent};
export type Lesson12PracticeState={version:1;owner:string;checkId:string;roundStartedAt:number;drafts:Record<string,Lesson12CheckDraft>};
const allowed=new Set(lesson12Checks.map(q=>q.id));
export const lesson12PracticeKey=(owner:string|null)=>'chineseos:lesson12-practice:v1:'+encodeURIComponent(owner??'guest');
export const emptyLesson12Practice=(owner:string|null):Lesson12PracticeState=>({version:1,owner:owner??'guest',checkId:lesson12Checks[0].id,roundStartedAt:0,drafts:{}});
export const freshLesson12Draft=():Lesson12CheckDraft=>({choice:'',hint:false,done:false,correct:false,attemptId:crypto.randomUUID()});
export function restoreLesson12Practice(raw:string|null,owner:string|null):Lesson12PracticeState{
 const empty=emptyLesson12Practice(owner);if(!raw)return empty;
 try{const v=JSON.parse(raw);if(v.version!==1||v.owner!==empty.owner||!allowed.has(v.checkId)||!Number.isFinite(v.roundStartedAt)||!v.drafts||typeof v.drafts!=='object')return empty;
 const drafts:Record<string,Lesson12CheckDraft>={};for(const [id,d] of Object.entries(v.drafts) as [string,Lesson12CheckDraft][]){const q=lesson12Checks.find(q=>q.id===id);if(!q||typeof d.hint!=='boolean'||typeof d.done!=='boolean'||typeof d.correct!=='boolean'||typeof d.choice!=='string'||d.choice&&!q.optionIds.includes(d.choice)||!d.attemptId||!/^[a-f0-9-]{36}$/i.test(d.attemptId))continue;
  if(d.submitted){const parsed=courseEventSchema.safeParse(d.submitted);if(!parsed.success||parsed.data.id!==d.attemptId||parsed.data.lessonId!=='intensive-12'||parsed.data.activityId!==id||parsed.data.correct!==(d.choice===q.targetId)||parsed.data.assisted!==d.hint)continue;}
  drafts[id]=d;
 }return {...empty,checkId:v.checkId,roundStartedAt:v.roundStartedAt,drafts};}catch{return empty;}
}
export function useLesson12PracticeState(owner:string|null,scope=''){
 const [snapshot,setSnapshot]=useState({value:emptyLesson12Practice(owner),ready:false,writable:false}),current=useRef(snapshot.value),active=useRef(false);
 useEffect(()=>{active.current=true;let value=emptyLesson12Practice(owner),writable=false;try{value=restoreLesson12Practice(localStorage.getItem(lesson12PracticeKey(owner)+scope),owner);localStorage.setItem(lesson12PracticeKey(owner)+scope,JSON.stringify(value));writable=true;}catch{}current.current=value;setSnapshot({value,ready:true,writable});return()=>{active.current=false;};},[owner,scope]);
 const update=useCallback((change:(old:Lesson12PracticeState)=>Lesson12PracticeState)=>{if(!active.current||current.current.owner!==(owner??'guest'))return false;const next=change(current.current);try{localStorage.setItem(lesson12PracticeKey(owner)+scope,JSON.stringify(next));}catch{setSnapshot(old=>({...old,writable:false}));return false;}current.current=next;setSnapshot({value:next,ready:true,writable:true});return true;},[owner,scope]);
 return {...snapshot,update};
}
