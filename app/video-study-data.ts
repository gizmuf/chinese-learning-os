import source from '../data/video-self-introduction/content.json';
import characterSource from '../data/video-self-introduction/characters.json';
import {studyDictionary,type StudyDictionary} from './atlas-spatial-model';
import {lesson05Terms} from './lesson05-data';
import type {Locale} from './translate';
export const videoStudy=source;
export type VideoSegment=typeof source.segments[number];
export const videoById=new Map(source.segments.map(v=>[v.id,v]));
export const videoMaterialId='video-self-introduction' as const;
export const videoAudio=(id:string)=>'/video-self-introduction/audio/'+encodeURIComponent(id)+'.mp3';
export const videoCharId=(h:string)=>'char-'+h.codePointAt(0)!.toString(16);
export const videoChecks=source.quizzes.flatMap(q=>(['read','listen'] as const).map(mode=>({...q,mode,activityId:'video-check-'+q.id+'-'+mode})));
export const videoActivityIds=[...videoChecks.map(q=>q.activityId),...source.sections.map(s=>'study:video-'+s.id),...characterSource.characters.map(c=>'write:'+videoCharId(c.text))];
export function videoDictionary(locale:Locale):StudyDictionary{
 const map=new Map(studyDictionary(locale));
 for(const v of lesson05Terms)map.set(v.hanzi,{...map.get(v.hanzi),text:v.hanzi,pinyin:v.pinyin,meaning:v.meaning[locale],audio:{text:v.hanzi,pinyin:v.pinyin,context:false,source:'/course05/audio/course05-'+v.id+'-word.mp3'}});
 for(const row of characterSource.characters){const existing=map.get(row.text);map.set(row.text,{...existing,text:row.text,pinyin:existing?.pinyin||row.pinyin,meaning:existing?.meaning||row.meaning,character:row.text,audio:{text:row.text,pinyin:row.pinyin,source:videoAudio(videoCharId(row.text)),context:false}});}
 return map;
}
