'use client';
import {lazy,Suspense,useCallback,useEffect,useId,useMemo,useRef,useState,type ReactNode,type RefObject} from 'react';
import {Volume2,X} from 'lucide-react';
import {useI18n} from './i18n';
import {DictionaryAudio,StudyDictionaryDialog} from './study-dictionary';
import {dictionaryTokens,type DictionaryEntry,type Pronunciation,type StudyDictionary} from './atlas-spatial-model';
import {appStudyDictionary,studyLookupEntry,lookupAtOffset,studyAssessmentSelector,studyFeedbackSelector,studyAtlasHref} from './study-lookup-model';
import {loadDictionaryResources,fetchDictionaryEntry} from './dictionary-client';
import {contextualDictionaryEntry,validDictionaryText,type DictionaryContext} from './dictionary-source-model';
import {registerDictionaryLexicon} from './atlas-spatial-model';
import {qwenCurriculumClip} from './qwen-curriculum-audio';
import {playRecording,releaseRecording,stopAudio} from './audio';
import SharedWriting from './shared-writing';
import './study-lookup.css';
import {contextSessionKey,restoreContextSession} from './study-context-session';
import {sourceContext,contextualAudio} from './writing-context-model';
import {atlasVisit,type AtlasVisit} from './contextual-atlas';
const ContextualAtlas=lazy(()=>import('./contextual-atlas'));
import {LookupContext} from './study-lookup-context';
export {StudyText,StudyLookupButton,useStudyLookup} from './study-lookup-context';
const helpEvent='chinese-os:dictionary-help';
/** Existing quizzes opt into the dictionary through their existing assisted/hint state. */
export function useDictionaryAssistance(onHelp:()=>void){
 const ref=useRef<HTMLElement|null>(null),handler=useRef(onHelp);handler.current=onHelp;
 useEffect(()=>{const node=ref.current;if(!node)return;const listener=()=>handler.current();node.addEventListener(helpEvent,listener);return()=>node.removeEventListener(helpEvent,listener);},[]);
 return ref;
}
function assessmentAllows(trigger:Element,mark=true){
 const assessment=trigger.closest('[data-study-assessment]');
 if(assessment){if(assessment.getAttribute('data-study-assessment')==='blocked')return false;if(assessment.getAttribute('data-study-assessment')==='supported'&&mark)assessment.dispatchEvent(new Event(helpEvent));return true;}
 return !trigger.closest(studyAssessmentSelector)||!!trigger.closest(studyFeedbackSelector);
}
/** Passive text across every screen uses one shared dialog, without rewriting React's DOM.
 * Existing buttons, answer choices, maps, canvases and writing gestures keep their actions. */
export default function StudyLookupProvider({children,notify,penOnly,setPenOnly,owner=null,db=null}:{owner?:string|null;db?:IDBDatabase|null;children:ReactNode;notify:(s:string)=>void;penOnly:boolean;setPenOnly:(v:boolean)=>void}){
 const {locale,t}=useI18n(),baseDictionary=useMemo(()=>appStudyDictionary(locale),[locale]);
 const [resources,setResources]=useState<Awaited<ReturnType<typeof loadDictionaryResources>>|null>(null),[extra,setExtra]=useState<Map<string,DictionaryEntry>>(()=>new Map());
 const dictionary=useMemo(()=>{const result=new Map(baseDictionary);if(resources)for(const [text,entry] of resources.characters){const old=result.get(text);result.set(text,{...entry,...old,pinyin:old?.pinyin||entry.pinyin,meaning:old?.meaning&&!/not recorded|not.*dictionary/i.test(old.meaning)?old.meaning:entry.meaning,structure:old?.structure??entry.structure});}for(const [text,entry] of extra){const old=result.get(text);result.set(text,{...entry,...old,senses:entry.senses,pinyin:old?.pinyin||entry.pinyin,meaning:old?.meaning&&!/not recorded|not.*dictionary/i.test(old.meaning)?old.meaning:entry.meaning});}if(resources)registerDictionaryLexicon(result,resources.headwords);return result;},[baseDictionary,resources,extra]);
 const latestDictionary=useRef(dictionary);latestDictionary.current=dictionary;
 const requests=useRef(0),activeContext=useRef<DictionaryContext|undefined>(undefined);
 useEffect(()=>{let alive=true;void loadDictionaryResources().then(value=>{if(alive)setResources(value);}).catch(()=>{});return()=>{alive=false;requests.current++;};},[]);
 const [entry,setEntry]=useState<DictionaryEntry|null>(null),[playing,setPlaying]=useState<string|null>(null),[writing,setWriting]=useState('');
 const writingDetail=useRef<DictionaryEntry|null>(null),writingTrigger=useRef<HTMLElement|null>(null),atlasTrigger=useRef<HTMLElement|null>(null);
 const [atlas,setAtlas]=useState<AtlasVisit|null>(null);
 const atlasRef=useRef<AtlasVisit|null>(null);atlasRef.current=atlas;
 const restoredUI=useRef(false),hydratingUI=useRef(true);

 const root=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null),audio=useRef<HTMLAudioElement|null>(null),writer=useRef<HTMLDialogElement>(null),heading=useId();
 function stop(){if(audio.current){releaseRecording(audio.current);audio.current=null;}setPlaying(null);}
 function close(){requests.current++;activeContext.current=undefined;stop();setEntry(null);requestAnimationFrame(()=>opener.current?.isConnected&&opener.current.focus({preventScroll:true}));}
 const open=useCallback((text:string,trigger:HTMLElement)=>{
  if(!assessmentAllows(trigger))return;
  const fromAtlas=!!trigger.closest('.context-atlas-dialog');
  const inside=!!dialog.current?.open;
  if(fromAtlas){opener.current=trigger;activeContext.current=sourceContext(trigger)??atlasRef.current?.entry.contextual;dialog.current?.close();requestAnimationFrame(()=>{if(dialog.current&&!dialog.current.open)dialog.current.showModal();});}
  if(!inside){opener.current=trigger;activeContext.current=sourceContext(trigger)??atlasRef.current?.entry.contextual;}
  const nestedSource=sourceContext(trigger);if(nestedSource)activeContext.current=nestedSource;
  stopAudio();stop();const token=++requests.current,context=activeContext.current;
  const present=(value:DictionaryEntry)=>{let selected=contextualDictionaryEntry(value,context);if(Array.from(selected.text).length===1&&!studyAtlasHref(selected))selected.atlasAvailable=false;selected=contextualAudio(selected,selected.contextual?qwenCurriculumClip('my-day-01-v2',selected.contextual.text):undefined);return selected;};
  const localEntry=()=>studyLookupEntry(latestDictionary.current,text,locale,!!trigger.closest('[data-grammar-frame]'))??(context?.text===text?{text,pinyin:context.pinyin,meaning:context.meaning,phrase:true}:undefined);
  const local=localEntry();
  setEntry(present(local?{...local,...(!local.meaning?{lookupStatus:'loading' as const}:{})}:{text,pinyin:'',meaning:'',lookupStatus:validDictionaryText(text)?'loading':'not-found'}));
  if(!validDictionaryText(text))return;
  void fetchDictionaryEntry(text).then(remote=>{if(token!==requests.current)return;const available=localEntry();if(remote){setExtra(old=>new Map(old).set(text,remote));setEntry(present({...remote,...available,senses:remote.senses,pinyin:available?.pinyin||remote.pinyin,meaning:available?.meaning&&!/not recorded|not.*dictionary/i.test(available.meaning)?available.meaning:remote.meaning}));}else setEntry(present(available?.meaning?available:{...available,text,pinyin:available?.pinyin??'',meaning:'',lookupStatus:'not-found'}));}).catch(()=>{if(token!==requests.current)return;const available=localEntry();setEntry(present(available?.meaning?available:{...available,text,pinyin:available?.pinyin??'',meaning:'',lookupStatus:'error'}));});
 },[dictionary,locale]);
 function listen(recording:Pronunciation){stop();const player=playRecording(recording.source,notify);audio.current=player;setPlaying(recording.source);player.addEventListener('ended',()=>{if(audio.current===player){audio.current=null;setPlaying(null);}},{once:true});}
 useEffect(()=>{requests.current++;setEntry(null);setWriting('');setAtlas(null);stop();return()=>{if(audio.current)releaseRecording(audio.current);};},[locale,owner]);
 useEffect(()=>{hydratingUI.current=true;try{const saved=restoreContextSession(sessionStorage.getItem(contextSessionKey(owner,locale)),location.pathname+location.search,locale);if(saved){activeContext.current=saved.entry.contextual;setEntry(saved.entry);setAtlas(saved);}}catch{}restoredUI.current=true;},[owner,locale]);
 useEffect(()=>{if(!restoredUI.current)return;if(hydratingUI.current){hydratingUI.current=false;return;}try{const key=contextSessionKey(owner,locale);if(atlas)sessionStorage.setItem(key,JSON.stringify(atlas));else sessionStorage.removeItem(key);}catch{}},[atlas,owner,locale]);
 useEffect(()=>{if(writing){if(!writer.current?.open)writer.current?.showModal();}else writer.current?.close();},[writing]);
 function closeWriting(){setWriting('');stopAudio();requestAnimationFrame(()=>writingTrigger.current?.isConnected&&writingTrigger.current.focus({preventScroll:true}));}
 function startWriting(selected:DictionaryEntry){requests.current++;stopAudio();stop();const source=selected.contextual;const current=selected;writingDetail.current=contextualAudio(contextualDictionaryEntry({...latestDictionary.current.get(current.text),...current},source),source?qwenCurriculumClip('my-day-01-v2',source.text):undefined);writingTrigger.current=document.activeElement as HTMLElement;setWriting(selected.text);}
 function closeAtlas(){if(history.state?.chineseOSContext){history.back();return;}finishAtlas();}
 function finishAtlas(){const origin=atlasRef.current;setAtlas(null);if(origin){activeContext.current=origin.entry.contextual;setEntry(origin.entry);}stopAudio();requestAnimationFrame(()=>{const target=atlasTrigger.current?.isConnected?atlasTrigger.current:[...(dialog.current?.querySelectorAll<HTMLButtonElement>('.sp-dictionary-explore')??[])].at(-1);target?.focus({preventScroll:true});});}
 useEffect(()=>{if(!atlas)return;if(!history.state?.chineseOSContext)history.pushState({...history.state,chineseOSContext:true},'',location.href);const back=()=>{if(!history.state?.chineseOSContext)finishAtlas();};addEventListener('popstate',back);return()=>removeEventListener('popstate',back);},[!!atlas]);
 function passiveClick(e:React.MouseEvent<HTMLDivElement>){
  const target=e.target;if(!(target instanceof HTMLElement)||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.altKey)return;
  if(target.closest('button,a,summary,input,select,textarea,canvas,svg,dialog,[role="button"],[role="option"],[contenteditable="true"],[data-study-lookup="off"],.guided-host,.notebook-square'))return;
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
 return <LookupContext.Provider value={context}><div className="study-lookup-scope" ref={root} onClick={passiveClick}>{children}</div><StudyDictionaryDialog dictionary={dictionary} entry={entry} dialog={dialog} opener={opener} headingId={heading} onClose={close} onLookup={open} onRetry={()=>{if(entry&&opener.current)open(entry.text,opener.current);}} speaker={clip=><DictionaryAudio recording={clip} playing={playing} onPlay={listen}/>} onWrite={startWriting} onExplore={selected=>{if(!atlasRef.current)atlasTrigger.current=document.activeElement as HTMLElement;requests.current++;stop();stopAudio();const next=atlasVisit(selected);if(atlasRef.current&&next){dialog.current?.close();setAtlas(previous=>previous?{...previous,route:next.route}:next);}else setAtlas(next);}}/>{atlas&&<Suspense fallback={<p role="status">Opening Atlas…</p>}><ContextualAtlas visit={atlas} owner={owner} db={db} penOnly={penOnly} setPenOnly={setPenOnly} notify={notify} onClose={closeAtlas} onWrite={startWriting} onChange={(route,trail,scrollTop)=>setAtlas(previous=>previous?{...previous,route,trail,scrollTop}:null)}/></Suspense>}<dialog ref={writer} className="study-writing-dialog" aria-labelledby={heading+'-writing'} onCancel={e=>{e.preventDefault();closeWriting();}} onClose={()=>{setWriting('');stopAudio();}}><header><h2 id={heading+'-writing'}>{copy[0]}</h2><button className="secondary" aria-label={copy[1]} onClick={closeWriting}><X size={20}/></button></header>{writing&&<SharedWriting key={writing} hanzi={writing} contextual={writingDetail.current?.contextual} pinyin={writingDetail.current?.text===writing?writingDetail.current.pinyin:undefined} meaning={writingDetail.current?.text===writing?writingDetail.current.meaning:undefined} audio={{word:writingDetail.current?.audio?.text===writing&&!writingDetail.current.audio.context?writingDetail.current.audio.source:undefined}} penOnly={penOnly} setPenOnly={setPenOnly} notify={notify} onBack={closeWriting}/>}</dialog></LookupContext.Provider>;
}
