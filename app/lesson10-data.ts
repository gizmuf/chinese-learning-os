import source from '../data/lesson10/content.json';
import recordings from '../data/lesson10/audio-reuse.json';
import {C} from './lesson07-data';
import type {Copy} from './course-data';
import type {Pronunciation} from './atlas-spatial-model';
export {C};
// The classroom handoff is English. Other interface languages retain English
// lesson content until a reviewed translation is supplied.
const copy=(v:{en:string}):Copy=>C(v.en,v.en,v.en,v.en);
export type Lesson10Entry={id:string;hanzi:string;pinyin:string;meaning:Copy;family?:string;topic?:string;phrase?:boolean;origin:string;sourceIds:string[]};
const entry=(v:typeof source.words[number]|typeof source.sentences[number]):Lesson10Entry=>({...v,meaning:copy(v.meaning)});
export const lesson10={id:'intensive-10' as const,number:10,date:source.date,title:copy(source.title)};
export const lesson10Terms=source.words.map(entry);
export const lesson10Sentences=source.sentences.map(entry);
export const lesson10All=[...lesson10Terms,...lesson10Sentences];
export const lesson10ById=new Map(lesson10All.map(v=>[v.id,v]));
export const lesson10Audio=(v:Pick<Lesson10Entry,'id'>):string|undefined=>(recordings as Record<string,{source:string}>)[v.id]?.source;
export const lesson10Pronunciation=(v:Lesson10Entry):Pronunciation|undefined=>{const audio=lesson10Audio(v);return audio?{text:v.hanzi,pinyin:v.pinyin,source:audio,context:false,kind:v.topic?'sentence':'word'}:undefined;};
const patterns:Record<string,string>={electronics:'电 · 电脑 · 电话 · 电视',comparison:'A + 比 + B + 形容词',guess:'你猜一猜 · 我猜你三十岁',family:'你家有几口人？',calendar:'几月几号 · 星期几',places:'谁 + 在 + 哪里',actions:'谁 + 在 + 做什么',classifiers:'数词 + 量词 + 名词'};
export const lesson10Topics=source.topics.map(v=>({...v,title:copy(v.title),note:copy(v.note),anchor:undefined as string|undefined,pattern:patterns[v.id]}));
const chunks:Record<string,string[]>={
 'c10-s01':['电车','比','油车','便宜'], 'c10-s07':['你','猜一猜'],
 'c10-s09':['你家','有','几口人'], 'c10-s10':['今天','几月几号','星期几'],
 'c10-s14':['你','在','哪儿'], 'c10-s20':['他','在','睡觉'],
 'c10-s28':['一条','裤子'],
};
export const lesson10Builders=lesson10Topics.map((v,i)=>v.target?{id:'c10-build-'+(i+1),targetId:v.target,blocks:chunks[v.target]}:undefined);
// Homophonous/synonymous alternatives must not compete as answers. All options
// are from this actual lesson, and only recorded exact readings get listening checks.
const equivalent=(a:Lesson10Entry,b:Lesson10Entry)=>a.meaning.en===b.meaning.en||['c10-s14','c10-s15'].includes(a.id)&&['c10-s14','c10-s15'].includes(b.id);
export const lesson10Checks=lesson10All.flatMap((v,i)=>{
 const pool=lesson10All.filter(w=>w.id!==v.id&&!equivalent(v,w));
 pool.sort((a,b)=>Number((b.family??b.topic)===(v.family??v.topic))-Number((a.family??a.topic)===(v.family??v.topic)));
 const options=[v];for(const w of pool){if(options.length===4)break;if(options.every(old=>!equivalent(old,w)))options.push(w);}
 const shift=(i+1)%options.length,ordered=[...options.slice(shift),...options.slice(0,shift)];
 const ambiguous=lesson10All.some(w=>w.id!==v.id&&w.hanzi===v.hanzi&&w.pinyin!==v.pinyin);
 const modes:('read'|'listen')[]=[...(!ambiguous?['read' as const]:[]),...(lesson10Audio(v)?['listen' as const]:[])];
 return modes.map(mode=>({id:'c10-check-'+v.id+'-'+mode,targetId:v.id,topic:v.family??v.topic!,mode,optionIds:ordered.map(w=>w.id),options:ordered.map(w=>w.meaning),answer:ordered.findIndex(w=>w.id===v.id)}));
});
export const lesson10ActivityIds=[...lesson10Checks.map(q=>q.id),...lesson10Builders.flatMap(b=>b?[b.id]:[]),...lesson10Topics.map(v=>'study:c10-'+v.id)];
export const lesson10Readings=[['c10-s01','c10-s04','c10-s05'],['c10-s14','c10-s16','c10-s18'],['c10-s22','c10-s23','c10-s24'],['c10-s28','c10-s30','c10-s35','c10-s37']].map((ids,i)=>({id:'c10-reading-'+(i+1),sentences:ids.map(id=>lesson10ById.get(id)!)}));
export const lesson10Speaking=lesson10Topics.filter(v=>v.target).map((v,i)=>({id:'c10-speak-'+(i+1),prompt:copy({en:'Say in Chinese: '+lesson10ById.get(v.target!)!.meaning.en}),answers:[lesson10ById.get(v.target!)!]}));
export const lesson10Optional=source.optional.map(v=>({...v,meaning:copy(v.meaning)}));
