import type {ReferenceCheckpoint,ReferenceDraft,ReferenceLesson} from './reference-lesson-types';
import {tonePinyin} from './dictionary-source-model';

/** UI checkpoints never contain a grade; saved Course events remain its authority. */
export const referenceCheckpointKey=(owner:string|null,material:string)=>'chinese-os:reference:v1:'+JSON.stringify([owner??'guest',material]);
export function emptyReferenceCheckpoint(owner:string|null,lesson:ReferenceLesson):ReferenceCheckpoint{
 return {version:1,owner:owner??'guest',material:lesson.id,topicId:lesson.topics[0]?.id??'',frame:0,checkId:lesson.checks[0]?.id??'',review:null,drafts:{}};
}
export function restoreReferenceCheckpoint(raw:string|null,owner:string|null,lesson:ReferenceLesson):ReferenceCheckpoint{
 const initial=emptyReferenceCheckpoint(owner,lesson);
 if(!raw)return initial;
 try{
  const value=JSON.parse(raw) as ReferenceCheckpoint;
  if(value.version!==1||value.owner!==initial.owner||value.material!==lesson.id||!lesson.topics.some(topic=>topic.id===value.topicId)||!Number.isInteger(value.frame)||Math.abs(value.frame)>36600||!value.drafts||typeof value.drafts!=='object'||Array.isArray(value.drafts))return initial;
  if(!lesson.checks.some(check=>check.id===value.checkId))return initial;
  if(value.review!==null&&(!value.review||typeof value.review.id!=='string'||!['due','difficult'].includes(value.review.mode)||!Array.isArray(value.review.ids)||value.review.ids.length>lesson.checks.length||new Set(value.review.ids).size!==value.review.ids.length||value.review.ids.some(id=>!lesson.checks.some(check=>check.id===id))))return initial;
  const drafts:Record<string,ReferenceDraft>={};
  for(const [id,draft] of Object.entries(value.drafts)){
   const check=lesson.checks.find(check=>check.id===id);
   if(!check||!draft||typeof draft.choice!=='string'||draft.choice.length>200||check.kind!=='pinyin'&&!check.optionIds.includes(draft.choice)&&draft.choice!==''||typeof draft.assisted!=='boolean'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(draft.attemptId)||draft.submittedAt!==null&&(!Number.isSafeInteger(draft.submittedAt)||draft.submittedAt<0))return initial;
   drafts[id]={choice:draft.choice,assisted:draft.assisted,attemptId:draft.attemptId,submittedAt:draft.submittedAt};
  }
  return {...initial,topicId:value.topicId,frame:value.frame,checkId:value.checkId,review:value.review,drafts};
 }catch{return initial;}
}
export function persistReferenceCheckpoint(storage:Pick<Storage,'setItem'>,checkpoint:ReferenceCheckpoint):boolean{
 try{storage.setItem(referenceCheckpointKey(checkpoint.owner,checkpoint.material),JSON.stringify(checkpoint));return true;}catch{return false;}
}
export function referenceClockAngles(hour:number,minute:number){
 if(!Number.isInteger(hour)||hour<0||hour>23||!Number.isInteger(minute)||minute<0||minute>59)throw Error('Invalid authored clock state');
 return {hour:(hour%12)*30+minute/2,minute:minute*6};
}
export const normalizeReferencePinyin=(value:string)=>tonePinyin(value).normalize('NFC').toLowerCase().replace(/[^\p{Letter}\p{Mark}]/gu,'');
/** UTC calendar arithmetic keeps an authored date independent of device timezone. */
export function referenceDayOffset(anchor:string,days:number){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(anchor)||!Number.isInteger(days)||Math.abs(days)>36600)throw Error('Invalid authored date state');
 const time=Date.parse(anchor+'T12:00:00Z');
 if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==anchor)throw Error('Invalid authored date');
 return new Date(time+days*86400000).toISOString().slice(0,10);
}
export type ReferencePoint={x:number;y:number};
/** Deixis follows the visible speaker, never the screen's left/right direction. */
export function referenceMovementDeixis(speaker:ReferencePoint,from:ReferencePoint,to:ReferencePoint):'来'|'去'{
 for(const point of [speaker,from,to])if(!Number.isFinite(point.x)||!Number.isFinite(point.y))throw Error('Invalid authored movement state');
 const distance=(point:ReferencePoint)=>(speaker.x-point.x)**2+(speaker.y-point.y)**2;
 const before=distance(from),after=distance(to);
 if(before===after)throw Error('Movement does not establish toward/away from this speaker');
 return after<before?'来':'去';
}
