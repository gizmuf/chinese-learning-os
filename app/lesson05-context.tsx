'use client';
import {useMemo,useState} from 'react';
import {Volume2,X} from 'lucide-react';
import {useI18n} from './i18n';
import {L} from './course-data';
import {studyDictionary,dictionaryTokens,type DictionaryEntry} from './atlas-spatial-model';
import {lesson05All,lesson05Terms,lesson05Item,lesson05Paths,lesson05Connections} from './lesson05-data';
import {playRecording,speak} from './audio';
export function Lesson05Gloss({text,notify}:{text:string;notify:(v:string)=>void}){
 const {locale,t}=useI18n();const [selected,setSelected]=useState<DictionaryEntry|null>(null);
 const dictionary=useMemo(()=>{const d=new Map(studyDictionary(locale));for(const v of lesson05Terms)d.set(v.hanzi,{text:v.hanzi,pinyin:v.pinyin,meaning:v.meaning[locale],audio:{text:v.hanzi,pinyin:v.pinyin,context:false,source:'/course05/audio/course05-'+v.id+'-word.mp3'}});return d;},[locale]);
 const tokens=dictionaryTokens(text,dictionary);
 return <div className="lesson05-gloss"><span className="lesson05-hanzi" lang="zh-Hans">{tokens.map((v,i)=>v.chinese&&dictionary.has(v.text)?<button key={i} className="lesson05-word" onClick={()=>setSelected(dictionary.get(v.text)!)} aria-label={v.text+' · '+t('Meaning')}>{v.text}</button>:<span key={i}>{v.text}</span>)}</span>{selected&&<aside className="lesson05-definition" aria-live="polite"><div><strong lang="zh-Hans">{selected.text}</strong><span className="pinyin">{selected.pinyin}</span><span>{selected.meaning}</span></div><button className="audio-button" aria-label={t('Listen')} onClick={()=>{if(selected.audio)playRecording(selected.audio.source,notify);}} disabled={!selected.audio}><Volume2 size={18}/></button><button className="text-button" aria-label={t('Close')} onClick={()=>setSelected(null)}><X size={18}/></button></aside>}</div>;
}
export function Lesson05Paths({topic,notify}:{topic:string;notify:(v:string)=>void}){
 const {locale}=useI18n(),c=(en:string,fr:string,ru:string)=>L(en,fr,ru)[locale];
 const path=lesson05Paths.find(v=>v.topic===topic)!,connection=lesson05Connections.find(v=>v.topic===topic)!,target=lesson05All.find(v=>v.id===path.target)!;
 return <div className="lesson05-context"><h3>{c('How this sentence works','Comment se construit cette phrase','Как устроено предложение')}</h3><div className="lesson05-path">{path.parts.map(([text,role],i)=><div key={i}><span lang="zh-Hans">{text as string}</span><small>{typeof role==='string'?role:role[locale]}</small></div>)}</div><Lesson05Gloss text={target.hanzi} notify={notify}/><p className="pinyin">{target.pinyin}</p><p>{target.meaning[locale]}</p><button className="audio-button" onClick={()=>speak(target.hanzi,notify,lesson05Item(target,locale))}><Volume2 size={16}/>{c('Listen to the whole sentence','Écouter la phrase entière','Послушать всё предложение')}</button><h3>{c('Connect to what you know','Relier à ce que vous savez','Связь с уже знакомым')}</h3><p>{connection.before[locale]}</p><p>{connection.after[locale]}</p><small>{c('Tap an underlined word to see its reading and meaning.','Touchez un mot souligné pour voir sa lecture et son sens.','Нажмите подчёркнутое слово, чтобы увидеть чтение и значение.')}</small></div>;
}
