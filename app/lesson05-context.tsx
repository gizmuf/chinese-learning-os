'use client';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Volume2} from 'lucide-react';
import {useI18n} from './i18n';
import {L} from './course-data';
import {DictionaryWords,DictionaryAudio,StudyDictionaryDialog} from './study-dictionary';
import {studyDictionary,type DictionaryEntry,type Pronunciation,type StudyDictionary} from './atlas-spatial-model';
import {lesson05All,lesson05Terms,lesson05Item,lesson05Paths,lesson05Connections} from './lesson05-data';
import {playRecording,releaseRecording,speak} from './audio';
export function Lesson05Gloss({text,notify,dictionaryOverride,onWrite,charactersOnly=false}:{text:string;notify:(v:string)=>void;dictionaryOverride?:StudyDictionary;onWrite?:(character:string)=>void;charactersOnly?:boolean}){
 const {locale,t}=useI18n();const [selected,setSelected]=useState<DictionaryEntry|null>(null),[playing,setPlaying]=useState<string|null>(null);
 const dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null),audio=useRef<HTMLAudioElement|null>(null),headingId=useId();
 const dictionary=useMemo(()=>{if(dictionaryOverride)return dictionaryOverride;const d=new Map(studyDictionary(locale));for(const v of lesson05Terms)d.set(v.hanzi,{...d.get(v.hanzi),text:v.hanzi,pinyin:v.pinyin,meaning:v.meaning[locale],audio:{text:v.hanzi,pinyin:v.pinyin,context:false,source:'/course05/audio/course05-'+v.id+'-word.mp3'}});return d;},[locale,dictionaryOverride]);
 function stop(){if(audio.current){releaseRecording(audio.current);audio.current=null;}setPlaying(null);}
 function close(){stop();setSelected(null);requestAnimationFrame(()=>opener.current?.isConnected&&opener.current.focus());}
 function lookup(value:string,trigger:HTMLButtonElement){if(!dialog.current?.open)opener.current=trigger;stop();setSelected(dictionary.get(value)??{text:value,pinyin:'',meaning:t('Not yet in this study dictionary.')});}
 function listen(recording:Pronunciation){stop();const player=playRecording(recording.source,notify);audio.current=player;setPlaying(recording.source);player.addEventListener('ended',()=>{if(audio.current===player){audio.current=null;setPlaying(null);}},{once:true});}
 useEffect(()=>{setSelected(null);setPlaying(null);return()=>{if(audio.current){releaseRecording(audio.current);audio.current=null;}};},[locale,text]);
 return <div className="lesson05-gloss sp-atlas"><span className="lesson05-hanzi" lang="zh-Hans">{charactersOnly?Array.from(text).map((ch,i)=>/[㐀-鿿]/u.test(ch)?<button type="button" className="sp-dictionary-word" key={i} onClick={e=>lookup(ch,e.currentTarget)}>{ch}</button>:<span key={i}>{ch}</span>):<DictionaryWords text={text} dictionary={dictionary} onLookup={lookup}/>}</span><StudyDictionaryDialog entry={selected} dialog={dialog} opener={opener} headingId={headingId} onClose={close} onLookup={lookup} speaker={recording=><DictionaryAudio recording={recording} playing={playing} onPlay={listen}/>} onWrite={onWrite?entry=>{close();requestAnimationFrame(()=>onWrite(entry.text))}:undefined} onExplore={entry=>{close();const params=new URLSearchParams({atlas:'1',cloud:'1',layout:'space',hanzi:entry.character??Array.from(entry.text)[0]});if(entry.word)params.set('word',entry.word.id);window.open('/?'+params,'_blank','noopener,noreferrer');}}/></div>;
}
export function Lesson05Paths({topic,notify}:{topic:string;notify:(v:string)=>void}){
 const {locale}=useI18n(),c=(en:string,fr:string,ru:string)=>L(en,fr,ru)[locale];
 const path=lesson05Paths.find(v=>v.topic===topic)!,connection=lesson05Connections.find(v=>v.topic===topic)!,target=lesson05All.find(v=>v.id===path.target)!;
 return <div className="lesson05-context"><h3>{c('How this sentence works','Comment se construit cette phrase','Как устроено предложение')}</h3><div className="lesson05-path">{path.parts.map(([text,role],i)=><div key={i}><span lang="zh-Hans">{text as string}</span><small>{typeof role==='string'?role:role[locale]}</small></div>)}</div><Lesson05Gloss text={target.hanzi} notify={notify}/><p className="pinyin">{target.pinyin}</p><p>{target.meaning[locale]}</p><button className="audio-button" onClick={()=>speak(target.hanzi,notify,lesson05Item(target,locale))}><Volume2 size={16}/>{c('Listen to the whole sentence','Écouter la phrase entière','Послушать всё предложение')}</button><h3>{c('Connect to what you know','Relier à ce que vous savez','Связь с уже знакомым')}</h3><p>{connection.before[locale]}</p><p>{connection.after[locale]}</p><small>{c('Tap an underlined word to see its reading and meaning.','Touchez un mot souligné pour voir sa lecture et son sens.','Нажмите подчёркнутое слово, чтобы увидеть чтение и значение.')}</small></div>;
}
