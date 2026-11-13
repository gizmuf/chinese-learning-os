import source from '../data/lesson08/content.json';
import {C} from './lesson07-data';
import type {Copy} from './course-data';
import type {Pronunciation} from './atlas-spatial-model';
export {C};
export type Lesson08Entry={id:string;hanzi:string;pinyin:string;meaning:Copy;family?:string;topic?:string;phrase?:boolean;origin:string;equivalence?:string;audioText?:string;audioPinyin?:string};
export const lesson08={id:'intensive-08' as const,number:8,date:source.date,title:C('Time, distance & everyday connections','Heures, distances et liens du quotidien','Время, расстояние и повседневные связи','Saatler, mesafeler ve günlük bağlantılar')};
export const lesson08Terms:Lesson08Entry[]=source.words;
export const lesson08Sentences:Lesson08Entry[]=source.sentences;
export const lesson08All=[...lesson08Terms,...lesson08Sentences];
export const lesson08ById=new Map(lesson08All.map(v=>[v.id,v]));
export const lesson08Topics=source.topics;
export const lesson08Audio=(v:Pick<Lesson08Entry,'id'>)=>'/course08/audio/'+v.id+'.mp3';
export const lesson08Pronunciation=(v:Lesson08Entry):Pronunciation=>({text:v.audioText??v.hanzi,pinyin:v.audioPinyin??v.pinyin,source:lesson08Audio(v),context:!!v.audioText,kind:v.topic?'sentence':'word'});
export const lesson08Builders=lesson08Topics.map((v,i)=>({id:'c08-build-'+(i+1),blocks:v.blocks,targetId:v.target}));
export const lesson08Checks=lesson08All.flatMap((v,i)=>{
 const topic=v.family??v.topic!,pool=lesson08All.filter(w=>(w.family??w.topic)===topic&&w.id!==v.id&&(!v.equivalence||v.equivalence!==w.equivalence));
 const options=[v];for(const w of pool){if(options.length>=4)break;if(options.every(old=>Object.keys(v.meaning).every(locale=>w.meaning[locale as keyof Copy]!==old.meaning[locale as keyof Copy])&&(!w.equivalence||w.equivalence!==old.equivalence)))options.push(w);}
 const shift=(i+1)%options.length,ordered=[...options.slice(shift),...options.slice(0,shift)];
 return (v.audioText?['read'] as const:['read','listen'] as const).map(mode=>({id:'c08-check-'+v.id+'-'+mode,targetId:v.id,topic,mode,optionIds:ordered.map(w=>w.id),options:ordered.map(w=>w.meaning),answer:ordered.findIndex(w=>w.id===v.id)}));
});
export const lesson08ActivityIds=[...lesson08Checks.map(q=>q.id),...lesson08Builders.map(b=>b.id),...lesson08Topics.map(v=>'study:c08-'+v.id)];
export const lesson08Readings=[['c08-s01','c08-s02','c08-s03'],['c08-s04','c08-s05','c08-s06'],['c08-s33','c08-s35','c08-s41']].map((keys,i)=>({id:'c08-reading-'+(i+1),sentences:keys.map(k=>lesson08ById.get(k)!)}));
export const lesson08Speaking=lesson08Topics.slice(0,6).map((v,i)=>({id:'c08-speak-'+(i+1),prompt:lesson08ById.get(v.target)!.meaning,answers:[lesson08ById.get(v.target)!]}));
