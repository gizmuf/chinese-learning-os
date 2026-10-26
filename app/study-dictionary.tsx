'use client';
import {useEffect,type ReactNode,type RefObject} from 'react';
import {ArrowRight,Volume2,X} from 'lucide-react';
import {useI18n} from './i18n';
import {L} from './course-data';
import {dictionaryTokens,pronunciationPresentation,type StudyDictionary,type DictionaryEntry,type Pronunciation} from './atlas-spatial-model';
import './atlas-spatial.css';

// These are the existing Atlas controls, shared with course text rather than
// implementing a second definition view or a different word/character lookup.
export function DictionaryWords({text,dictionary,onLookup}:{text:string;dictionary:StudyDictionary;onLookup:(text:string,trigger:HTMLButtonElement)=>void}){
 return <>{dictionaryTokens(text,dictionary).map((token,i)=>token.chinese?<button type="button" className="sp-dictionary-word" key={i} lang="zh-Hans" onClick={e=>onLookup(token.text,e.currentTarget)}>{token.text}</button>:<span key={i}>{token.text}</span>)}</>;
}
export function DictionaryAudio({recording,playing,onPlay,compact=false,target}:{recording:Pronunciation|undefined;playing:string|null;onPlay:(v:Pronunciation)=>void;compact?:boolean;target?:string}){
 const {locale}=useI18n(),c=(en:string,fr:string,ru:string)=>L(en,fr,ru)[locale];
 if(!recording)return null;
 const view=pronunciationPresentation(recording,target),kind=view.kind==='sentence'?c('Listen to the sentence','Écouter la phrase','Слушать предложение'):view.kind==='character'?c('Single character','Caractère seul','Один знак'):c('Whole word','Mot entier','Целое слово');
 return <button type="button" className={'sp-speaker'+(compact?' is-compact':'')+(recording.context?' is-context':'')+(playing===recording.source?' is-playing':'')} aria-label={kind+': '+view.text+' · '+view.pinyin} onClick={()=>onPlay(recording)}><Volume2 size={17}/>{view.kind==='sentence'?<span>{kind}</span>:(!compact||recording.context)?<span className="sp-audio-copy"><small>{kind}</small><b lang="zh-Hans">{view.text}</b><small>{view.pinyin}{view.target&&<> · {c('contains','contient','содержит')} <span lang="zh-Hans">{view.target}</span></>}</small></span>:null}</button>;
}
export function StudyDictionaryDialog({entry,dialog,opener,headingId='sp-dictionary-title',onClose,onLookup,speaker,onExplore,onWrite}:{entry:DictionaryEntry|null;dialog:RefObject<HTMLDialogElement|null>;opener:RefObject<HTMLElement|null>;headingId?:string;onClose:()=>void;onLookup:(text:string,trigger:HTMLButtonElement)=>void;speaker:(v:Pronunciation|undefined)=>ReactNode;onExplore?:(entry:DictionaryEntry)=>void;onWrite?:(entry:DictionaryEntry)=>void}){
 const {locale}=useI18n(),c=(en:string,fr:string,ru:string)=>L(en,fr,ru)[locale];
 useEffect(()=>{if(!entry){if(dialog.current?.open)dialog.current.close();return}const el=dialog.current;if(!el)return;if(!el.open)el.showModal();if(!el.contains(document.activeElement))el.querySelector<HTMLButtonElement>('.sp-dictionary-close')?.focus();const position=()=>{if(innerWidth<=600){el.style.left='';el.style.top='';return}const rect=opener.current?.getBoundingClientRect();if(!rect)return;el.style.left=Math.max(12,Math.min(rect.left,innerWidth-el.offsetWidth-12))+'px';el.style.top=Math.max(12,rect.bottom+el.offsetHeight+10<innerHeight?rect.bottom+8:Math.min(rect.top-el.offsetHeight-8,innerHeight-el.offsetHeight-12))+'px'};position();addEventListener('resize',position);return()=>removeEventListener('resize',position)},[entry,dialog,opener]);
 return <dialog className="sp-dictionary" ref={dialog} aria-labelledby={headingId} onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===dialog.current){const rect=dialog.current.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)onClose()}}}>
  {entry&&<><button type="button" className="sp-dictionary-close" onClick={onClose} aria-label={c('Close definition','Fermer la définition','Закрыть перевод')}><X size={18}/></button><h2 id={headingId} lang="zh-Hans">{entry.text}</h2><p className="sp-reading">{entry.pinyin}</p><p>{entry.meaning}</p>{speaker(entry.audio)}{entry.text.length>1&&<div className="sp-dictionary-parts"><small>{c('Characters','Caractères','Знаки')}</small>{Array.from(entry.text).map((h,i)=><button type="button" key={i} onClick={e=>onLookup(h,e.currentTarget)}>{h}</button>)}</div>}{onWrite&&Array.from(entry.text).length===1&&<button type="button" className="sp-dictionary-explore" onClick={()=>onWrite(entry)}>{({en:'Practice writing',fr:'Pratiquer l’écriture',ru:'Тренировать письмо',tr:'Yazma alıştırması'}[locale])}<ArrowRight size={16}/></button>}{onExplore&&(entry.word||entry.character)&&<button type="button" className="sp-dictionary-explore" onClick={()=>onExplore(entry)}>{c('Explore in Atlas','Explorer dans l’Atlas','Открыть в Атласе')}<ArrowRight size={16}/></button>}</>}
 </dialog>;
}
