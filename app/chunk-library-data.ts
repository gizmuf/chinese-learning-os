import {items} from './content';
import {localizeItem} from './translate';
import type {Copy} from './course-data';
import framesSource from '../data/speaking-chunks/grammar-frames.json';
import advancedSource from '../data/speaking-chunks/grammar-frames-advanced.json';
import coreLearning from '../data/speaking-chunks/grammar-learning-core.json';
import original from '../data/speaking-chunks/content.json';
export type GrammarExample={id:string;hanzi:string;pinyin:string;meaning:Copy;parts:string[];targets:number[];hint:Copy};
export type FrameLearning={scene:Copy;explanation:Copy;contrast:Copy;visual:'condition'|'cause'|'contrast'|'choice'|'sequence'|'comparison'|'result'|'focus';labels:Copy[];icons?:string[]};
export type GrammarFrame={id:string;topic:'compare'|'time'|'connect'|'complement'|'attitude';level:'core'|'extension';pattern:string;title:Copy;note:Copy;sources:string[];examples:GrammarExample[];learning?:FrameLearning;advanced?:boolean};
export const grammarFrames:GrammarFrame[]=[...(framesSource as GrammarFrame[]).map(frame=>({...frame,learning:(coreLearning as Record<string,FrameLearning>)[frame.id]})),...(advancedSource as GrammarFrame[]).map(frame=>({...frame,advanced:true}))];
export type ChunkTask={id:string;collection:'original'|'words'|'grammar';level:number;topic:string;title:Copy;hint:Copy;note:Copy;pattern?:string;parts:string[];targets:number[];hanzi:string;pinyin:string;meaning:Copy;audio:string;pieceAudio?:Record<number,string>;word?:string;wordPinyin?:string;sources?:string[];frameId?:string;advanced?:boolean};
const C=(text:string):Copy=>({en:text,fr:text,ru:text,tr:text});
const copyItem=(item:(typeof items)[number],field:'english'|'translation'):Copy=>({en:item[field],fr:localizeItem(item,'fr')[field],ru:localizeItem(item,'ru')[field],tr:localizeItem(item,'tr')[field]});
const targetHints:Record<string,Copy>={
 '把':{en:'The marker that introduces the object being handled before the action.',fr:'Le marqueur qui présente l’objet traité avant l’action.',ru:'Показатель объекта, с которым совершают действие; ставится перед действием.',tr:'Eylemden önce, işlem yapılan nesneyi belirten sözcük.'},
 '子':{en:'The common noun ending in this word.',fr:'La terminaison nominale courante dans ce mot.',ru:'Обычное окончание существительного в этом слове.',tr:'Bu kelimedeki yaygın isim eki.'},
};
export const vocabularyChunkTasks:ChunkTask[]=items.filter(i=>i.hskLevel).map(item=>{
 const pieces=item.sentence.split(item.hanzi),parts:string[]=[],targets:number[]=[];
 pieces.forEach((p,i)=>{if(i){targets.push(parts.length);parts.push(item.hanzi);}if(p)parts.push(p);});
 return {id:'chunk-gap-'+item.id,collection:'words',level:item.hskLevel!,topic:item.lesson,title:copyItem(item,'english'),hint:targetHints[item.hanzi]??copyItem(item,'english'),note:C(''),parts,targets,hanzi:item.sentence,pinyin:item.sentencePinyin,meaning:copyItem(item,'translation'),audio:'/audio/'+item.id+'-sentence.mp3',pieceAudio:Object.fromEntries(targets.map(t=>[t,'/audio/'+item.id+'-word.mp3'])),word:item.hanzi,wordPinyin:item.pinyin};
});
export const grammarChunkTasks:ChunkTask[]=grammarFrames.flatMap(frame=>frame.examples.map(ex=>({
 ...ex,id:'chunk-frame-'+ex.id,collection:'grammar' as const,level:frame.level==='core'?3:4,topic:frame.topic,title:frame.title,note:frame.note,pattern:frame.pattern,sources:frame.sources,frameId:frame.id,advanced:frame.advanced,audio:'/speaking-chunks/audio/frame-'+ex.id+'.mp3',pieceAudio:Object.fromEntries(ex.targets.map(t=>[t,'/speaking-chunks/audio/frame-'+ex.id+'-'+t+'.mp3'])),
})));
export const originalGapTasks:ChunkTask[]=original.units.flatMap(unit=>unit.variants.map(ex=>{
 const target=ex.chunks.findIndex(c=>c.role==='topic');const action=ex.chunks.findIndex(c=>c.role==='action');const index=target>=0?target:action>=0?action:1;
 return {id:'chunk-gap-'+ex.id,collection:'original' as const,level:0,topic:unit.id,title:unit.title,hint:ex.chunks[index].meaning,note:unit.note,parts:ex.chunks.map(c=>c.text),targets:[index],hanzi:ex.hanzi,pinyin:ex.pinyin,meaning:ex.meaning,audio:'/speaking-chunks/audio/'+ex.id+'.mp3',pieceAudio:{[index]:'/speaking-chunks/audio/'+ex.chunks[index].audioId+'.mp3'}};
}));
// New activities have distinct IDs: no earlier whole-sentence scores are migrated.
export const clozeTasks=[...originalGapTasks,...vocabularyChunkTasks,...grammarChunkTasks];
export const clozeActivityIds=clozeTasks.map(task=>task.id);
const wholeSentenceTasks:ChunkTask[]=original.units.flatMap(unit=>unit.variants.map(ex=>({id:'chunk-recall-'+ex.id,collection:'original' as const,level:0,topic:unit.id,title:unit.title,hint:ex.meaning,note:unit.note,parts:[ex.hanzi],targets:[0],hanzi:ex.hanzi,pinyin:ex.pinyin,meaning:ex.meaning,audio:'/speaking-chunks/audio/'+ex.id+'.mp3'})));
export function taskByActivity(id:string){return clozeTasks.find(t=>t.id===id)??wholeSentenceTasks.find(t=>t.id===id);}
export function frameForTask(task:ChunkTask){return task.frameId?grammarFrames.find(frame=>frame.id===task.frameId):undefined;}
export function learningSequence(tasks:ChunkTask[]){const seen=new Set<string>();return tasks.filter(task=>{const key=task.frameId??task.id;if(seen.has(key))return false;seen.add(key);return true;});}
export function clozeAnswers(task:ChunkTask){return task.targets.map(t=>task.parts[t]);}
export function normalizeCloze(text:string){return text.normalize('NFKC').replace(/[\s\p{P}\p{Cf}]/gu,'');}
export function clozeCorrect(task:ChunkTask,answers:string[]){return answers.length===task.targets.length&&clozeAnswers(task).every((value,i)=>!!normalizeCloze(answers[i])&&normalizeCloze(answers[i])===normalizeCloze(value));}
