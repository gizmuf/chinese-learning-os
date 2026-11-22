'use client';
import {libraryCopy} from './chunk-library-copy';
import {withTurkish} from "./turkish";
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {useI18n} from './i18n';
import {StudyText,StudyLookupButton} from './study-lookup-context';
import {grammarCounts,grammarDraftKey,grammarStudyGroups,readGrammarSelection,restoreGrammarAnswers,type GrammarAnswers} from './grammar-curriculum';
import type {GrammarUnit} from './grammar-foundations';
import {globalHskLabel,knownHskInScope} from './global-hsk-model';
import {useGlobalHsk} from './global-hsk';
import GrammarOverview,{curriculumCopy,type GrammarStudyGroup} from './hsk3-grammar-overview';
import {readDraft,saveDraft} from './local-store';
import './hsk3-grammar.css';
import GrammarReview from './hsk3-grammar-review';
const groups:GrammarStudyGroup[]=grammarStudyGroups.map(({level,units})=>({level,units:withTurkish([...units])}));
export const grammarUnits:GrammarUnit[]=groups.flatMap(({units})=>units);
const initialSelection=()=>readGrammarSelection(typeof window==='undefined'?'':window.location.search,grammarUnits);
const copy={back:withTurkish({en:'All topics',fr:'Tous les thèmes',ru:'Все темы'}),check:withTurkish({en:'Check answer',fr:'Vérifier',ru:'Проверить'}),retry:withTurkish({en:'Try again',fr:'Réessayer',ru:'Попробовать снова'}),next:withTurkish({en:'Next',fr:'Suivant',ru:'Далее'}),prev:withTurkish({en:'Previous',fr:'Précédent',ru:'Назад'}),yes:withTurkish({en:'Correct',fr:'Correct',ru:'Правильно'}),no:withTurkish({en:'Not quite — compare the explanation.',fr:'Pas tout à fait — comparez avec l’explication.',ru:'Не совсем — сравните с объяснением.'}),practice:withTurkish({en:'Guided practice · saved on this device in your notebook. This does not award independent recall credit.',fr:'Pratique guidée · enregistrée dans votre carnet sur cet appareil. Aucun crédit de rappel autonome.',ru:'Практика с подсказками · сохраняется в вашей тетради на этом устройстве. Самостоятельное воспроизведение не засчитывается.'}),count:withTurkish({en:'exercises checked',fr:'exercices vérifiés',ru:'упражнений проверено'})};
export default function HSK3Grammar({db,owner}:{db:IDBDatabase|null;owner:string|null}){
 const {locale}=useI18n();const t=(key:keyof typeof copy)=>copy[key][locale];
 const curriculum=curriculumCopy[locale];
 const hsk=useGlobalHsk();
 const [examScope]=useState(()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('grammarScope')==='exam');
 const scope=examScope?3:hsk?.scope??3;
 const visibleGroups=groups.filter(group=>knownHskInScope(group.level,scope));
 const visibleUnits=visibleGroups.flatMap(group=>group.units);
 const [{unitId,index,checklist},setSelection]=useState(initialSelection);
 const [answers,setAnswers]=useState<GrammarAnswers>({}),[ready,setReady]=useState(false);
 const [review,setReview]=useState(false);
 const loadedDb=useRef<IDBDatabase|null>(null);
 const savedAnswers=useRef<GrammarAnswers|null>(null);
 const swipeUntil=useRef(0);
 const start=useRef<{x:number;y:number}|null>(null);
 const overviewOrigin=useRef<string|null>(null);
 const pendingFocus=useRef<string|null>(null);
 useEffect(()=>{
  let current=true;
  loadedDb.current=null;
  savedAnswers.current=null;
  setReady(false);
  setAnswers({});
  if(db)void readDraft(db,grammarDraftKey).then(value=>{
   if(!current)return;
   const restored=restoreGrammarAnswers(value,grammarUnits);
   loadedDb.current=db;
   savedAnswers.current=restored;
   setAnswers(restored);
   setReady(true);
  }).catch(()=>{if(current)setReady(true);});
  return()=>{current=false;};
 },[db]);
 useEffect(()=>{
  if(db&&ready&&loadedDb.current===db&&answers!==savedAnswers.current)
   void saveDraft(db,grammarDraftKey,answers).catch(()=>{});
 },[db,ready,answers]);
 useEffect(()=>{
  const restore=()=>setSelection(initialSelection());
  window.addEventListener('popstate',restore);
  return()=>window.removeEventListener('popstate',restore);
 },[]);
 function open(nextUnitId:string|null,nextIndex=0,nextChecklist=checklist){
  const unit=grammarUnits.find(item=>item.id===nextUnitId);
  const exercise=unit?.cards.flatMap(card=>card.exercises)[nextIndex];
  const url=new URL(window.location.href);
  if(url.searchParams.get('grammar')==='hsk3'){
   url.searchParams.set('hsk',String(scope));
   if(unit&&exercise){url.searchParams.set('grammarTopic',unit.id);url.searchParams.set('grammarExercise',exercise.id);}
   else {url.searchParams.delete('grammarTopic');url.searchParams.delete('grammarExercise');}
   if(nextChecklist)url.searchParams.set('grammarIndex','syllabus');
   else url.searchParams.delete('grammarIndex');
   history.replaceState(history.state,'',url);
  }
  setSelection({unitId:unit?.id??null,index:nextIndex,checklist:nextChecklist});
 }
 function openCard(id:string,cardId:string|undefined,origin:string){
  overviewOrigin.current=origin;
  pendingFocus.current='grammar-exercise-title';
  const target=visibleUnits.find(item=>item.id===id);
  const questionIndex=target?.cards.flatMap(card=>card.exercises.map(()=>card.id)).indexOf(cardId??'')??-1;
  open(id,Math.max(0,questionIndex));
 }
 const unit=visibleUnits.find(u=>u.id===unitId);
 useLayoutEffect(()=>{
  if(!pendingFocus.current)return;
  const target=document.getElementById(pendingFocus.current);
  pendingFocus.current=null;
  target?.focus({preventScroll:true});
  target?.scrollIntoView({block:'nearest',behavior:'instant'});
 },[unit?.id]);
 const requestedLevel=groups.find(group=>group.units.some(item=>item.id===unitId))?.level;
 const questions=unit?.cards.flatMap(card=>card.exercises.map(ex=>({card,ex})))??[];
 const current=questions[index];
 const move=(delta:number)=>open(unitId,Math.max(0,Math.min(questions.length-1,index+delta)));
 const {exercises:total}=grammarCounts(visibleUnits);
 const done=visibleUnits.reduce((sum,unit)=>sum+unit.cards.reduce((count,card)=>count+card.exercises.filter(ex=>answers[ex.id]?.checked).length,0),0);
 const showReview=knownHskInScope(3,scope);
 if(review&&showReview)return <GrammarReview owner={owner} onBack={()=>setReview(false)}/>;
 return <section className="hsk-grammar"><div className="page-heading"><div><p className="eyebrow">{globalHskLabel(scope)}</p><h1 id="grammar-home-title" tabIndex={-1}>{curriculum.title}<span className="orange">.</span></h1><p>{curriculum.intro}</p></div></div>
 <div className="grammar-overview-actions"><a className="text-button" href={'/?course=intensive&material=speaking-chunks&chunks=grammar&hsk='+scope}>{libraryCopy.grammar[locale]} →</a>
 {showReview&&<button className="secondary" onClick={()=>setReview(true)}>{({en:"HSK 3 independent reviews",fr:"Révisions autonomes HSK 3",ru:"Самостоятельное повторение HSK 3",tr:"HSK 3 bağımsız tekrarları"})[locale]}</button>}</div>
 <p className="grammar-note">{done} / {total} {t('count')} · {t('practice')}</p>
 {!unit?<>{requestedLevel&&<p className="grammar-syllabus-note" role="status">{curriculum.outside} {hsk&&<button className="secondary" onClick={()=>hsk.setScope(requestedLevel)}>{curriculum.widen}</button>}</p>}
 <GrammarOverview groups={visibleGroups} checklist={checklist} onChecklist={next=>open(null,0,next)} onOpen={openCard}/></>:current&&<><button className="grammar-back" onClick={()=>{pendingFocus.current=overviewOrigin.current??'grammar-home-title';open(null);}}>← {t('back')}</button><h2 id="grammar-exercise-title" tabIndex={-1}>{unit.title[locale]}</h2><div className="grammar-navigation"><button onClick={()=>move(-1)} disabled={index===0}>← {t('prev')}</button><span>{index+1} / {questions.length}</span><button onClick={()=>move(1)} disabled={index===questions.length-1}>{t('next')} →</button></div><article className="grammar-card" data-study-assessment="supported" onTouchStart={e=>{if(e.touches.length===1)start.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}} onTouchEnd={e=>{const s=start.current;start.current=null;if(!s||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-s.x,dy=e.changedTouches[0].clientY-s.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5){swipeUntil.current=Date.now()+350;move(dx<0?1:-1);}}}>
 <h3 className="grammar-pattern"><StudyText text={current.card.pattern}/></h3><p><StudyText text={current.card.explanation[locale]}/></p><div className="grammar-example" data-study-sentence={current.card.example.hanzi} data-study-pinyin={current.card.example.pinyin} data-study-meaning={current.card.example.meaning[locale]} data-study-source-id={current.card.id+":example"}><strong lang="zh-Hans"><StudyText text={current.card.example.hanzi} pinyin={current.card.example.pinyin}/></strong><span>{current.card.example.pinyin}</span><p>{current.card.example.meaning[locale]}</p></div><hr/><p>{current.ex.prompt[locale]}</p><h3 className="grammar-question" lang="zh-Hans" data-study-sentence={current.ex.sentence} data-study-source-id={current.ex.id+":question"}><StudyText text={current.ex.sentence}/></h3><div className="grammar-options" data-study-sentence={current.ex.sentence} data-study-source-id={current.ex.id+":options"}>{current.ex.options.map((option,i)=><span className="grammar-option" key={i}><button type="button" aria-pressed={answers[current.ex.id]?.picked===i} disabled={answers[current.ex.id]?.checked} onClick={()=>{if(Date.now()<swipeUntil.current)return;setAnswers(a=>({...a,[current.ex.id]:{picked:i,checked:false}}));}}>{option}</button><StudyLookupButton text={option}/></span>)}</div>
 {!answers[current.ex.id]?.checked?<button className="primary" disabled={answers[current.ex.id]===undefined} onClick={()=>setAnswers(a=>({...a,[current.ex.id]:{...a[current.ex.id],checked:true}}))}>{t('check')}</button>:<div role="status"><strong>{answers[current.ex.id].picked===current.ex.answer?t('yes'):t('no')}</strong><p lang="zh-Hans" className="grammar-question" data-study-sentence={current.ex.sentence.replace('___',current.ex.options[current.ex.answer])} data-study-source-id={current.ex.id+":answer"}><StudyText text={current.ex.sentence.replace('___',current.ex.options[current.ex.answer])}/></p><p><StudyText text={current.ex.explanation[locale]}/></p>{answers[current.ex.id].picked!==current.ex.answer&&<button onClick={()=>setAnswers(a=>{const next={...a};delete next[current.ex.id];return next;})}>{t('retry')}</button>}</div>}
 </article></>}
 </section>;
}
