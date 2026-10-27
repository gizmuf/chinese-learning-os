'use client';
import {createContext,useCallback,useContext,useEffect,useId,useMemo,useRef,useState,type ReactNode,type RefObject} from 'react';
import {BookOpen,Volume2,X} from 'lucide-react';
import {useI18n} from './i18n';
import {DictionaryAudio,StudyDictionaryDialog} from './study-dictionary';
import {dictionaryTokens,type DictionaryEntry,type Pronunciation,type StudyDictionary} from './atlas-spatial-model';
import {appStudyDictionary,lookupAtOffset,studyAssessmentSelector,studyFeedbackSelector} from './study-lookup-model';
import {playRecording,releaseRecording,stopAudio} from './audio';
import Guided from './guided';
import WritingHelp from './writing-help';
import {WritingCharacterContext} from './writing-context';
import './study-lookup.css';
const LookupContext=createContext<{dictionary:StudyDictionary;open:(text:string,trigger:HTMLElement)=>void}|null>(null);
const helpEvent='chinese-os:dictionary-help';
/** Existing quizzes opt into the dictionary through their existing assisted/hint state. */
export function useDictionaryAssistance(onHelp:()=>void){
 const ref=useRef<HTMLElement|null>(null),handler=useRef(onHelp);handler.current=onHelp;
 useEffect(()=>{const node=ref.current;if(!node)return;const listener=()=>handler.current();node.addEventListener(helpEvent,listener);return()=>node.removeEventListener(helpEvent,listener);},[]);
 return ref;
}
export function StudyText({text,anchor='',whole=false}:{text:string;anchor?:string;whole?:boolean}){
 const lookup=useContext(LookupContext);if(!lookup)return <>{text}</>;
 const tokens=whole?[{text,chinese:/\p{Script=Han}/u.test(text)}]:dictionaryTokens(text,lookup.dictionary);
 const marked=(value:string)=>anchor?value.split(anchor).map((part,i)=><span key={i}>{i>0&&<span className="wf-shared">{anchor}</span>}{part}</span>):value;
 return <span className="study-text">{tokens.map((token,i)=>token.chinese?<button type="button" className="study-word" key={i} lang="zh-Hans" onClick={e=>{e.stopPropagation();lookup.open(token.text,e.currentTarget);}}>{marked(token.text)}</button>:<span key={i}>{token.text}</span>)}</span>;
}
export function StudyLookupButton({text}:{text:string}){const value=useContext(LookupContext),{locale}=useI18n();return value?<button type="button" className="study-lookup-button" aria-label={({en:'Definition',fr:'Définition',ru:'Значение',tr:'Anlam'})[locale]+': '+text} onClick={e=>{e.stopPropagation();value.open(text,e.currentTarget);}}><BookOpen size={17}/></button>:null;}
function assessmentAllows(trigger:Element,mark=true){
 const assessment=trigger.closest('[data-study-assessment]');
 if(assessment){if(assessment.getAttribute('data-study-assessment')==='blocked')return false;if(assessment.getAttribute('data-study-assessment')==='supported'&&mark)assessment.dispatchEvent(new Event(helpEvent));return true;}
 return !trigger.closest(studyAssessmentSelector)||!!trigger.closest(studyFeedbackSelector);
}
/** Passive text across every screen uses one shared dialog, without rewriting React's DOM.
 * Existing buttons, answer choices, maps, canvases and writing gestures keep their actions. */
export default function StudyLookupProvider({children,notify,penOnly,setPenOnly}:{children:ReactNode;notify:(s:string)=>void;penOnly:boolean;setPenOnly:(v:boolean)=>void}){
 const {locale,t}=useI18n(),dictionary=useMemo(()=>appStudyDictionary(locale),[locale]);
 const [entry,setEntry]=useState<DictionaryEntry|null>(null),[playing,setPlaying]=useState<string|null>(null),[writing,setWriting]=useState(''),[mode,setMode]=useState<'watch'|'trace'>('watch'),[replay,setReplay]=useState(0);
 const root=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null),audio=useRef<HTMLAudioElement|null>(null),writer=useRef<HTMLDialogElement>(null),heading=useId();
 function stop(){if(audio.current){releaseRecording(audio.current);audio.current=null;}setPlaying(null);}
 function close(){stop();setEntry(null);requestAnimationFrame(()=>opener.current?.isConnected&&opener.current.focus({preventScroll:true}));}
 const open=useCallback((text:string,trigger:HTMLElement)=>{if(!assessmentAllows(trigger))return;if(!dialog.current?.open)opener.current=trigger;stopAudio();stop();setEntry(dictionary.get(text)??{text,pinyin:'',meaning:t('Not yet in this study dictionary.')});},[dictionary,t]);
 function listen(recording:Pronunciation){stop();const player=playRecording(recording.source,notify);audio.current=player;setPlaying(recording.source);player.addEventListener('ended',()=>{if(audio.current===player){audio.current=null;setPlaying(null);}},{once:true});}
 useEffect(()=>{setEntry(null);setWriting('');stop();return()=>{if(audio.current)releaseRecording(audio.current);};},[locale]);
 useEffect(()=>{if(writing){if(!writer.current?.open)writer.current?.showModal();}else writer.current?.close();},[writing]);
 function closeWriting(){setWriting('');stopAudio();requestAnimationFrame(()=>opener.current?.isConnected&&opener.current.focus({preventScroll:true}));}
 function passiveClick(e:React.MouseEvent<HTMLDivElement>){
  const target=e.target;if(!(target instanceof HTMLElement)||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.altKey)return;
  if(target.closest('button,a,input,select,textarea,canvas,svg,dialog,[role="button"],[role="option"],[contenteditable="true"],[data-study-lookup="off"],.guided-host,.notebook-square'))return;
  if(!assessmentAllows(target,false)||window.getSelection()?.isCollapsed===false)return;
  const doc=document as Document&{caretPositionFromPoint?:(x:number,y:number)=>{offsetNode:Node;offset:number}|null;caretRangeFromPoint?:(x:number,y:number)=>Range|null};
  const pos=doc.caretPositionFromPoint?.(e.clientX,e.clientY),range=pos?null:doc.caretRangeFromPoint?.(e.clientX,e.clientY),node=pos?.offsetNode??range?.startContainer,offset=pos?.offset??range?.startOffset;
  if(!node||node.nodeType!==Node.TEXT_NODE||offset===undefined||!root.current?.contains(node)||!target.contains(node))return;
  const text=node.textContent??'',at=Math.min(offset,text.length-1),letterRange=document.createRange();
  // Caret APIs report the boundary after the glyph for a tap in its right half.
  let hit:number|null=null;for(const i of [at,at-1]){if(i<0||i>=text.length)continue;letterRange.setStart(node,i);letterRange.setEnd(node,i+1);const box=letterRange.getBoundingClientRect();if(e.clientX>=box.left&&e.clientX<=box.right&&e.clientY>=box.top&&e.clientY<=box.bottom){hit=i;break;}}
  if(hit===null)return;const word=lookupAtOffset(text,hit,dictionary);if(word)open(word,target);
 }
 const context=useMemo(()=>({dictionary,open}),[dictionary,open]);
 const copy={en:['Practice writing','Close writing','Pencil only','Replay','Watch animation','Trace this character'],fr:['Pratiquer l’écriture','Fermer l’écriture','Stylet uniquement','Rejouer','Voir l’animation','Tracer ce caractère'],ru:['Тренировать письмо','Закрыть письмо','Только стилус','Повторить','Смотреть анимацию','Обвести знак'],tr:['Yazma alıştırması','Yazmayı kapat','Yalnızca kalem','Tekrar oynat','Animasyonu izle','Karakterin üzerinden geç']}[locale];
 return <LookupContext.Provider value={context}><div className="study-lookup-scope" ref={root} onClick={passiveClick}>{children}</div><StudyDictionaryDialog dictionary={dictionary} entry={entry} dialog={dialog} opener={opener} headingId={heading} onClose={close} onLookup={open} speaker={clip=><DictionaryAudio recording={clip} playing={playing} onPlay={listen}/>} onWrite={selected=>{close();requestAnimationFrame(()=>{setWriting(selected.text);setMode('watch');setReplay(0);});}} onExplore={selected=>{close();const p=new URLSearchParams({atlas:'1',cloud:'1',layout:'space',hanzi:selected.character??Array.from(selected.text)[0]});if(selected.word)p.set('word',selected.word.id);window.open('/?'+p,'_blank','noopener,noreferrer');}}/><dialog ref={writer} className="study-writing-dialog" aria-labelledby={heading+'-writing'} onCancel={e=>{e.preventDefault();closeWriting();}} onClose={()=>{setWriting('');stopAudio();}}><header><h2 id={heading+'-writing'}>{copy[0]}</h2><button className="secondary" aria-label={copy[1]} onClick={closeWriting}><X size={20}/></button></header>{writing&&<><WritingCharacterContext character={writing} entry={dictionary.get(writing)} notify={notify}/><label className="pencil-toggle"><input type="checkbox" checked={penOnly} onChange={e=>setPenOnly(e.target.checked)}/>{copy[2]}</label><WritingHelp/><div className="study-writing-surface"><Guided character={writing} mode={mode} penOnly={penOnly} replay={replay} onComplete={()=>{}} onMistake={()=>{}}/></div><div className="course-actions"><button className="secondary" onClick={()=>setReplay(v=>v+1)}>{copy[3]}</button><button className="primary" onClick={()=>{setMode(v=>v==='watch'?'trace':'watch');setReplay(0);}}>{copy[mode==='watch'?5:4]}</button></div></>}</dialog></LookupContext.Provider>;
}
