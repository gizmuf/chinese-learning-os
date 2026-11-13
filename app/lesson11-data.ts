import source from '../data/lesson11/content.json';
import recordings from '../data/lesson11/audio-reuse.json';
import {C} from './lesson07-data';
import type {Copy} from './course-data';
import type {Pronunciation} from './atlas-spatial-model';
export {C};
const copy=(v:Copy):Copy=>v;
export type Lesson11Entry={id:string;hanzi:string;pinyin:string;meaning:Copy;family?:string;topic?:string;phrase?:boolean;origin:string;sourceIds:string[]};
const entry=(v:typeof source.words[number]|typeof source.sentences[number]):Lesson11Entry=>({...v,meaning:copy(v.meaning)});
export const lesson11={id:'intensive-11' as const,number:11,date:source.date,title:copy(source.title),intro:copy(source.intro)};
export const lesson11Terms=source.words.map(entry);
export const lesson11Sentences=source.sentences.map(v=>({...entry(v),topic:v.family}));
export const lesson11All=[...lesson11Terms,...lesson11Sentences];
export const lesson11ById=new Map(lesson11All.map(v=>[v.id,v]));
export const lesson11Audio=(v:Pick<Lesson11Entry,'id'>):string|undefined=>(recordings as Record<string,{source:string}>)[v.id]?.source;
export const lesson11Pronunciation=(v:Lesson11Entry):Pronunciation|undefined=>{const audio=lesson11Audio(v);return audio?{text:v.hanzi,pinyin:v.pinyin,source:audio,context:false,kind:v.topic?'sentence':'word'}:undefined;};
const patterns:Record<string,string>={calendar:'前天 · 昨天 · 今天 · 明天 · 后天',seasons:'春天暖 · 夏天热 · 秋天凉 · 冬天冷',degree:'有点儿 + 冷 / 冷 + 一点儿',transport:'坐 · 骑 · 开 · 走路',routine:'几点？ / 什么时候？',objects:'一张 + 纸 / 地图 / 桌子 / 菜单',frequency:'常常 / 有时候 / 很少 / 从不 · 一直',everyday:'对……好 / 不好 · 一共'};
export const lesson11Topics=source.topics.map(v=>({...v,title:copy(v.title),note:copy(v.note),anchor:undefined as string|undefined,pattern:patterns[v.id]}));
const chunks:Record<string,string[]>={'c11-s001':['今天','几月几号','星期几'],'c11-s009':['现在','是','什么季节'],'c11-s015':['有点儿','冷'],'c11-s019':['你','怎么','来学校'],'c11-s028':['六点','起床'],'c11-s032':['一张','床'],'c11-s041':['我','常常','走路','来学校'],'c11-s048':['吃苹果','对身体','好']};
export const lesson11Builders=lesson11Topics.map((v,i)=>v.target?{id:'c11-build-'+(i+1),targetId:v.target,blocks:chunks[v.target]}:undefined);
// Homophonous/synonymous alternatives must not compete as answers. All options
// are from this actual lesson, and only recorded exact readings get listening checks.
const equivalent=(a:Lesson11Entry,b:Lesson11Entry)=>a.meaning.en===b.meaning.en;
export const lesson11Checks=lesson11All.flatMap((v,i)=>{
 const pool=lesson11All.filter(w=>w.id!==v.id&&!equivalent(v,w));
 pool.sort((a,b)=>Number((b.family??b.topic)===(v.family??v.topic))-Number((a.family??a.topic)===(v.family??v.topic)));
 const options=[v];for(const w of pool){if(options.length===4)break;if(options.every(old=>!equivalent(old,w)))options.push(w);}
 const shift=(i+1)%options.length,ordered=[...options.slice(shift),...options.slice(0,shift)];
 const ambiguous=lesson11All.some(w=>w.id!==v.id&&w.hanzi===v.hanzi&&w.pinyin!==v.pinyin);
 const modes:('read'|'listen')[]=[...(!ambiguous?['read' as const]:[]),...(lesson11Audio(v)?['listen' as const]:[])];
 return modes.map(mode=>({id:'c11-check-'+v.id+'-'+mode,targetId:v.id,topic:v.family??v.topic!,mode,optionIds:ordered.map(w=>w.id),options:ordered.map(w=>w.meaning),answer:ordered.findIndex(w=>w.id===v.id)}));
});
export const lesson11ActivityIds=[...lesson11Checks.map(q=>q.id),...lesson11Builders.flatMap(b=>b?[b.id]:[]),...lesson11Topics.map(v=>'study:c11-'+v.id)];
export const lesson11Readings=lesson11Topics.map((topic,i)=>({id:'c11-reading-'+(i+1),sentences:lesson11Sentences.filter(v=>v.topic===topic.id)}));
export const lesson11Speaking=lesson11Topics.map((v,i)=>({id:'c11-speak-'+(i+1),prompt:lesson11ById.get(v.target)!.meaning,answers:[lesson11ById.get(v.target)!]}));
export const lesson11Optional: {id:string;hanzi:string;pinyin:string;meaning:Copy;note:string}[]=[];
