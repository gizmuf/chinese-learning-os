import source from '../data/lesson09/content.json';
import audioManifest from '../public/course09/audio/manifest.json';
import {qwenCurriculumClip} from './qwen-curriculum-audio';
import {C} from './lesson07-data';
import type {Copy} from './course-data';
import type {Pronunciation} from './atlas-spatial-model';
export {C};
export type Lesson09Entry={id:string;hanzi:string;pinyin:string;meaning:Copy;family?:string;topic?:string;phrase?:boolean;origin:string;equivalence?:string;audioText?:string;audioPinyin?:string};
export const lesson09={id:'intensive-09' as const,number:9,date:source.date,title:C('Practise, describe & get moving','Pratiquer, décrire et se déplacer','Практика, описания и движение','Alıştırma yap, anlat ve yola çık')};
export const lesson09Terms:Lesson09Entry[]=source.words;
export const lesson09Sentences:Lesson09Entry[]=source.sentences;
export const lesson09All=[...lesson09Terms,...lesson09Sentences];
export const lesson09ById=new Map(lesson09All.map(v=>[v.id,v]));
export const lesson09Topics=source.topics;
const recordingById=new Map(audioManifest.recordings.map(clip=>[clip.id,clip]));
export const lesson09Recording=(id:string)=>{const original=recordingById.get(id);return original?(qwenCurriculumClip('lesson09',original.text,id)?.source??'/course09/audio/'+original.file):undefined;};
export const lesson09Audio=(v:Pick<Lesson09Entry,'id'>)=>lesson09Recording(v.id)??'/course09/audio/'+v.id+'.mp3';
export const lesson09Pronunciation=(v:Lesson09Entry):Pronunciation=>({text:v.audioText??v.hanzi,pinyin:v.audioPinyin??v.pinyin,source:lesson09Audio(v),context:!!v.audioText,kind:v.topic?'sentence':'word'});
export const lesson09Builders=lesson09Topics.map((v,i)=>({id:'c09-build-'+(i+1),blocks:v.blocks,targetId:v.target}));
export const lesson09Checks=lesson09All.flatMap((v,i)=>{
 const topic=v.family??v.topic!,pool=lesson09All.filter(w=>(w.family??w.topic)===topic&&w.id!==v.id&&(!v.equivalence||v.equivalence!==w.equivalence));
 const options=[v];for(const w of pool){if(options.length>=4)break;if(options.every(old=>Object.keys(v.meaning).every(locale=>w.meaning[locale as keyof Copy]!==old.meaning[locale as keyof Copy])&&(!w.equivalence||w.equivalence!==old.equivalence)))options.push(w);}
 const shift=(i+1)%options.length,ordered=[...options.slice(shift),...options.slice(0,shift)];
 return (v.audioText?['read'] as const:['read','listen'] as const).map(mode=>({id:'c09-check-'+v.id+'-'+mode,targetId:v.id,topic,mode,optionIds:ordered.map(w=>w.id),options:ordered.map(w=>w.meaning),answer:ordered.findIndex(w=>w.id===v.id)}));
});
export const lesson09ActivityIds=[...lesson09Checks.map(q=>q.id),...lesson09Builders.map(b=>b.id),...lesson09Topics.map(v=>'study:c09-'+v.id)];
export const lesson09Readings=[['我先预习，再学习，最后复习。','他帮我练习汉语。','请准备听写。'],['今天天气怎么样？','今天晴，不冷不热。'],['我早上七点半出门。','晚上六点出校门。','开车半小时后到家。']].map((texts,i)=>({id:'c09-reading-'+(i+1),sentences:texts.map(text=>lesson09Sentences.find(v=>v.hanzi===text)!)}));
export const lesson09Speaking=lesson09Topics.filter((_,i)=>[0,1,2,4,5,6].includes(i)).map((v,i)=>({id:'c09-speak-'+(i+1),prompt:lesson09ById.get(v.target)!.meaning,answers:[lesson09ById.get(v.target)!]}));
