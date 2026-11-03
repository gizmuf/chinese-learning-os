import myDay from '../data/my-day-01-v2.json';
import {speakingSource} from './my-day-speaking-model';
import morning from '../data/shuoshuo-morning.json';
import {grammarFrames} from './chunk-library-data';
import {cloudWords} from './atlas-cloud-model';
import {contextualDictionaryEntry,type DictionaryContext} from './dictionary-source-model';
import type {DictionaryEntry,Pronunciation} from './atlas-spatial-model';
import type {Locale} from './translate';
import type {AtlasVisit} from './contextual-atlas';
import {readCloudRoute,cloudRouteHref} from './atlas-cloud-route';
/** Tab-local UI checkpoint only; never a learning event or a cross-owner notebook. */
export function contextSessionKey(owner:string|null,locale:string){return 'chinese-os:context-ui:v1:'+encodeURIComponent(owner??'guest')+':'+locale;}
const string=(value:unknown,max:number):value is string=>typeof value==='string'&&value.length<=max;
function audio(value:unknown):Pronunciation|undefined{
 const v=value as Pronunciation;if(!v||!string(v.source,500)||!/^\/(?!\/)[^\s<>]+$/.test(v.source)||!string(v.text,1500)||!string(v.pinyin,1500)||typeof v.context!=='boolean'||v.kind&&!['word','sentence'].includes(v.kind))return;
 return {source:v.source,text:v.text,pinyin:v.pinyin,context:v.context,...(v.kind?{kind:v.kind}:{})};
}
function source(id:unknown,locale:Locale):DictionaryContext|undefined{
 if(typeof id!=='string')return;
 const speakingMatch=/^(voice-live-2026-11-03|my-day-full-2026-11-03):(\d+)$/.exec(id);
 const row=speakingMatch?speakingSource(speakingMatch[1],Number(speakingMatch[2])-1):id.startsWith('my-day-01-v2:')?myDay.sections.flatMap(section=>section.rows)[Number(id.slice('my-day-01-v2:'.length))-1]:id.startsWith('shuoshuo:')?morning.sentences.find(row=>row.id===id.slice('shuoshuo:'.length)):undefined;
 if(row)return {sourceId:id,text:row.hanzi,pinyin:row.pinyin,meaning:row.english};
 const example=id.startsWith('grammar:')?grammarFrames.flatMap(frame=>frame.examples).find(example=>example.id===id.slice('grammar:'.length)):undefined;
 if(example)return {sourceId:id,text:example.hanzi,pinyin:example.pinyin,meaning:example.meaning[locale]};
}
export function restoreContextSession(raw:string|null,url:string,locale:Locale='en'):AtlasVisit|null{
 try{
 const value=JSON.parse(raw??'null'),v=value?.entry;
 if(!value||value.originURL!==url||!Number.isFinite(value.originY)||!string(v?.text,120)||!v.text||!string(v.pinyin,500)||!string(v.meaning,10000)||typeof value.route!=='object')return null;
 const original=v.contextual,context=original?source(original.sourceId,locale):undefined;
 if(original&&(!context||context.text!==original.text||context.pinyin!==original.pinyin||context.meaning!==original.meaning))return null;
 const sourceAudio=audio(original?.audio);if(context&&sourceAudio?.text===context.text&&sourceAudio.pinyin===context.pinyin)context.audio=sourceAudio;
 const word=typeof v.word?.id==='string'?cloudWords(locale).find(word=>word.id===v.word.id&&word.hanzi===v.text):undefined;
 let entry:DictionaryEntry={text:v.text,pinyin:v.pinyin,meaning:v.meaning,contextual:context,audio:audio(v.audio),word,...(Array.from(v.text).length===1?{character:v.text}:{})};
 if(typeof v.atlasAvailable==='boolean')entry.atlasAvailable=v.atlasAvailable;if(typeof v.phrase==='boolean')entry.phrase=v.phrase;
 if(string(v.sourceName,150))entry.sourceName=v.sourceName;if(string(v.sourceURL,500)&&/^https:\/\/(www\.mdbg\.net|github\.com)\//.test(v.sourceURL))entry.sourceURL=v.sourceURL;
 if(Array.isArray(v.senses))entry.senses=v.senses.filter((sense:unknown)=>{const s=sense as {pinyin:string;meaning:string};return s&&string(s.pinyin,500)&&string(s.meaning,10000);}).slice(0,50);
 if(string(v.structure?.radical,10)&&string(v.structure?.decomposition,200))entry.structure={radical:v.structure.radical,decomposition:v.structure.decomposition};
 entry=contextualDictionaryEntry(entry,context);
 return {entry,originURL:url,trail:Array.isArray(value.trail)?value.trail.filter((v:unknown)=>string(v,2000)).slice(-24):[],scrollTop:Number.isFinite(value.scrollTop)?Math.max(0,value.scrollTop):0,route:readCloudRoute(cloudRouteHref(value.route)),originY:Math.max(0,value.originY)};
 }catch{return null;}
}
