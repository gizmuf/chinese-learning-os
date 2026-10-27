'use client';
import {useEffect,useState,type ReactNode,type RefObject} from 'react';
import {ArrowRight,Volume2,X} from 'lucide-react';
import {useI18n} from './i18n';
import {L} from './course-data';
import {dictionaryTokens,pronunciationPresentation,type StudyDictionary,type DictionaryEntry,type Pronunciation} from './atlas-spatial-model';
import {dictionaryBreakdown,studyExamples} from './study-examples';
import './atlas-spatial.css';

// These are the existing Atlas controls, shared with course text rather than
// implementing a second definition view or a different word/character lookup.
export function DictionaryWords({text,dictionary,onLookup,activeText}:{text:string;dictionary:StudyDictionary;activeText?:string;onLookup:(text:string,trigger:HTMLButtonElement)=>void}){
 return <>{dictionaryTokens(text,dictionary).map((token,i)=>token.chinese&&token.text!==activeText?<button type="button" className="sp-dictionary-word" key={i} lang="zh-Hans" onClick={e=>onLookup(token.text,e.currentTarget)}>{token.text}</button>:<span className={token.text===activeText?'sp-dictionary-current':undefined} key={i}>{token.text}</span>)}</>;
}
export function DictionaryAudio({recording,playing,onPlay,compact=false,target}:{recording:Pronunciation|undefined;playing:string|null;onPlay:(v:Pronunciation)=>void;compact?:boolean;target?:string}){
 const {locale}=useI18n(),c=(en:string,fr:string,ru:string)=>L(en,fr,ru)[locale];
 if(!recording)return null;
 const view=pronunciationPresentation(recording,target),kind=view.kind==='sentence'?c('Listen to the sentence','Écouter la phrase','Слушать предложение'):view.kind==='character'?c('Single character','Caractère seul','Один знак'):c('Whole word','Mot entier','Целое слово');
 return <button type="button" className={'sp-speaker'+(compact?' is-compact':'')+(recording.context?' is-context':'')+(playing===recording.source?' is-playing':'')} aria-label={kind+': '+view.text+' · '+view.pinyin} onClick={()=>onPlay(recording)}><Volume2 size={17}/>{view.kind==='sentence'?<span>{kind}</span>:(!compact||recording.context)?<span className="sp-audio-copy"><small>{kind}</small><b lang="zh-Hans">{view.text}</b><small>{view.pinyin}{view.target&&<> · {c('contains','contient','содержит')} <span lang="zh-Hans">{view.target}</span></>}</small></span>:null}</button>;
}
export function StudyDictionaryDialog({entry,dictionary,dialog,opener,headingId='sp-dictionary-title',onClose,onLookup,speaker,onExplore,onWrite}:{entry:DictionaryEntry|null;dictionary:StudyDictionary;dialog:RefObject<HTMLDialogElement|null>;opener:RefObject<HTMLElement|null>;headingId?:string;onClose:()=>void;onLookup:(text:string,trigger:HTMLButtonElement)=>void;speaker:(v:Pronunciation|undefined)=>ReactNode;onExplore?:(entry:DictionaryEntry)=>void;onWrite?:(entry:DictionaryEntry)=>void}){
 const {locale}=useI18n(),c=(en:string,fr:string,ru:string)=>L(en,fr,ru)[locale];
 const [trail,setTrail]=useState<DictionaryEntry[]>([]);
 useEffect(()=>{if(!entry)setTrail([])},[entry]);
 const labels={en:{characters:'Inside this expression',phrase:'Words in this expression',words:'Words in this sentence',examples:'Examples in use',back:'Back to',note:'Individual character meanings are clues. The expression has its own meaning.',missing:'No separate meaning recorded yet.'},fr:{characters:'Dans cette expression',phrase:'Les mots de cette expression',words:'Les mots de cette phrase',examples:'Exemples en contexte',back:'Retour à',note:'Le sens des caractères est un indice. L’expression a son propre sens.',missing:'Sens individuel non encore renseigné.'},ru:{characters:'Из чего состоит выражение',phrase:'Слова в этом выражении',words:'Слова в этом предложении',examples:'Примеры употребления',back:'Назад к',note:'Значения знаков — подсказки. У выражения есть собственное значение.',missing:'Отдельное значение пока не записано.'},tr:{characters:'Bu ifadenin içindeki karakterler',phrase:'Bu ifadedeki kelimeler',words:'Bu cümledeki kelimeler',examples:'Kullanım örnekleri',back:'Geri dön:',note:'Karakter anlamları ipucudur. İfadenin kendine özgü bir anlamı vardır.',missing:'Ayrı anlam henüz kaydedilmedi.'}}[locale];
 const parts=entry?dictionaryBreakdown(entry,dictionary,locale):null,examples=entry&&!parts?.sentence?studyExamples(entry.text,locale):[];
 function select(text:string,trigger:HTMLButtonElement){if(!entry||text===entry.text)return;setTrail(previous=>[...previous,entry]);onLookup(text,trigger)}
 function close(){setTrail([]);onClose()}
 useEffect(()=>{if(!entry){if(dialog.current?.open)dialog.current.close();return}const el=dialog.current;if(!el)return;el.scrollTop=0;if(!el.open)el.showModal();if(!el.contains(document.activeElement))el.querySelector<HTMLButtonElement>('.sp-dictionary-close')?.focus();const position=()=>{if(innerWidth<=600){el.style.left='';el.style.top='';return}const rect=opener.current?.getBoundingClientRect();if(!rect)return;el.style.left=Math.max(12,Math.min(rect.left,innerWidth-el.offsetWidth-12))+'px';el.style.top=Math.max(12,rect.bottom+el.offsetHeight+10<innerHeight?rect.bottom+8:Math.min(rect.top-el.offsetHeight-8,innerHeight-el.offsetHeight-12))+'px'};position();addEventListener('resize',position);return()=>removeEventListener('resize',position)},[entry,dialog,opener]);
 return <dialog className="sp-dictionary" ref={dialog} aria-labelledby={headingId} onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===dialog.current){const rect=dialog.current.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)close()}}}>
  {entry&&<><button type="button" className="sp-dictionary-close" onClick={close} aria-label={c('Close definition','Fermer la définition','Закрыть перевод')}><X size={18}/></button>
   {trail.length>0&&<button type="button" className="sp-dictionary-back" onClick={e=>{const previous=trail.at(-1);if(previous){setTrail(history=>history.slice(0,-1));onLookup(previous.text,e.currentTarget)}}}>← {labels.back} {trail.at(-1)?.text}</button>}
   <h2 id={headingId} lang="zh-Hans">{entry.text}</h2>
   <div className="sp-dictionary-pronunciation"><p className="sp-reading">{entry.pinyin}</p>{speaker(entry.audio)}</div><p>{entry.meaning}</p>
   {parts&&parts.parts.length>0&&!(parts.parts.length===1&&parts.parts[0].text===entry.text)&&<section className="sp-dictionary-breakdown" aria-label={parts.sentence?labels.words:parts.phrase?labels.phrase:labels.characters}>
    <h3>{parts.sentence?labels.words:parts.phrase?labels.phrase:labels.characters}</h3>
    {!parts.sentence&&!parts.phrase&&<p className="sp-dictionary-note">{labels.note}</p>}
    <div className="sp-dictionary-entries">{parts.parts.map((part,i)=><button type="button" key={i} onClick={e=>select(part.text,e.currentTarget)}><strong lang="zh-Hans">{part.text}</strong><span><span className="sp-reading">{part.entry?.pinyin}</span><span>{part.entry?.meaning||labels.missing}</span></span><ArrowRight size={15}/></button>)}</div>
   </section>}
   {examples.length>0&&<section className="sp-dictionary-examples" aria-label={labels.examples}><h3>{labels.examples}</h3>{examples.map(example=><article key={example.id}><div lang="zh-Hans"><DictionaryWords text={example.text} dictionary={dictionary} onLookup={select} activeText={entry.text}/></div><p className="sp-reading">{example.pinyin}</p><p>{example.meaning}</p>{example.audio&&speaker(example.audio)}</article>)}</section>}
   {onWrite&&Array.from(entry.text).length===1&&<button type="button" className="sp-dictionary-explore" onClick={()=>onWrite(entry)}>{({en:'Practice writing',fr:'Pratiquer l’écriture',ru:'Тренировать письмо',tr:'Yazma alıştırması'}[locale])}<ArrowRight size={16}/></button>}
   {onExplore&&(entry.word||entry.character)&&<button type="button" className="sp-dictionary-explore" onClick={()=>onExplore(entry)}>{c('Explore in Atlas','Explorer dans l’Atlas','Открыть в Атласе')}<ArrowRight size={16}/></button>}
  </>}
 </dialog>;
}
