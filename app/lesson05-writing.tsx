"use client";
import SharedWriting from './shared-writing';
import {useRef} from 'react';
import {useI18n} from './i18n';
import type {Lesson05Entry} from './lesson05-data';
import type {CourseEvent} from './course-learning';
export default function Lesson05Writing({value,penOnly,setPenOnly,ready,record,notify}:{value:Lesson05Entry;penOnly:boolean;setPenOnly:(v:boolean)=>void;ready:boolean;record:(e:CourseEvent)=>Promise<void>;notify:(v:string)=>void}){
 const {locale}=useI18n(),eventId=useRef(crypto.randomUUID());
 return <SharedWriting hanzi={value.hanzi} pinyin={value.pinyin} meaning={value.meaning[locale]} penOnly={penOnly} setPenOnly={setPenOnly} notify={notify} onSave={async()=>{
  if(!ready)throw Error('Storage is not ready');
  await record({id:eventId.current,lessonId:'intensive-05',activityId:'write:'+value.id,kind:'writing',correct:true,assisted:true,at:Date.now(),rating:3});
 }}/>;
}
