'use client';

import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Volume2} from 'lucide-react';
import {stopAudio} from './audio';
import {wordPronunciation} from './atlas-spatial-model';
import {useI18n} from './i18n';
import {StudyText,useStudyLookup} from './study-lookup-context';
import {useRecordingPlayback} from './use-recording-playback';
import {
 practicalLesson17Audio,practicalLesson17Date,practicalLesson17Exercises,practicalLesson17Review,
 practicalLesson17Sections,practicalLesson17Title,practicalLesson17View,type Practical17Entry,
} from './practical-lesson-17-data';
import './practical-lesson-17.css';

type View = ReturnType<typeof practicalLesson17View>;
type Playback = ReturnType<typeof useRecordingPlayback>;

const views = [
 ['examples','Study examples'],
 ['recall','Recall and answer key'],
 ['review','Review and homework'],
] as const;
const courseCatalogHref = '/?course=intensive';

function normalizedReading(pinyin:string) {
 return pinyin.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}]/gu,'');
}

function ChineseExample({entry,sourceId,player}: {entry:Practical17Entry;sourceId:string;player:Playback}) {
 const {t}=useI18n();
 const lookup=useStudyLookup();
 const known=lookup?.dictionary.get(entry.hanzi);
 const libraryClip=known?.audio??(known?.word?wordPronunciation(known.word):undefined);
 const canUseLibraryClip=libraryClip?.text===entry.hanzi&&normalizedReading(libraryClip.pinyin)===normalizedReading(entry.pinyin);
 const clip=practicalLesson17Audio[entry.hanzi]??(canUseLibraryClip?libraryClip:undefined);
 const phrase=known?!!known.phrase:[...entry.hanzi].length>1;

 return <div className="practical17-chinese" data-study-source-id={sourceId}
  data-study-sentence={entry.hanzi} data-study-pinyin={entry.pinyin} data-study-meaning={entry.english}
  data-study-audio={clip?.source}>
  <p className="practical17-hanzi" lang="zh-Hans">
   <StudyText text={entry.hanzi} sourceText={entry.hanzi} pinyin={entry.pinyin}/>
  </p>
  <p className="practical17-pinyin" lang="zh-Latn">{entry.pinyin}</p>
  <div className="practical17-actions">
   {lookup&&<button type="button" className="secondary" onClick={event=>lookup.open(entry.hanzi,event.currentTarget,{
    text:entry.hanzi,pinyin:entry.pinyin,meaning:entry.english,phrase,
   })}><BookOpen size={16} aria-hidden="true"/>{t('Dictionary')}</button>}
   {clip&&<button type="button" className="secondary" aria-label={t('Listen')+' · '+clip.text}
    onClick={()=>player.play(clip.source)} data-playing={player.playing===clip.source||undefined}><Volume2 size={17} aria-hidden="true"/>{t('Listen')}</button>}
  </div>
 </div>;
}

export default function PracticalLesson17({notify}: {notify:(message:string)=>void}) {
 const {t}=useI18n();
 const [route,setRoute]=useState(()=>practicalLesson17View(typeof location==='undefined'?'':location.search));
 const [hideChinese,setHideChinese]=useState(false);
 const [revealed,setRevealed]=useState(false);
 const [drafts,setDrafts]=useState<Partial<Record<number,string>>>({});
 const contentHeading=useRef<HTMLHeadingElement>(null);
 const focusContent=useRef(false);
 const player=useRecordingPlayback(notify);
 const section=practicalLesson17Sections.find(item=>item.id===route.topic)??practicalLesson17Sections[0];
 const exercise=practicalLesson17Exercises[route.question-1];

 useEffect(()=>{
  const restore=()=>{stopAudio();setRevealed(false);setRoute(practicalLesson17View(location.search));};
  window.addEventListener('popstate',restore);
  return ()=>{window.removeEventListener('popstate',restore);stopAudio();};
 },[]);

 useLayoutEffect(()=>{
  if(!focusContent.current)return;
  focusContent.current=false;
  contentHeading.current?.focus();
 },[route]);

 function select(change:Partial<View>,moveFocus=false) {
  const next={...route,...change};
  focusContent.current=moveFocus;
  setRoute(next);
  setRevealed(false);
  stopAudio();
  const url=new URL(location.href);
  for(const [name,value] of Object.entries(next))url.searchParams.set(name,String(value));
  history.replaceState(history.state,'',url);
 }

 return <article className="course-space practical17">
  <a className="text-button" href={courseCatalogHref}><ArrowLeft size={17} aria-hidden="true"/>{t('Back to course')}</a>
  <header className="practical17-heading">
   <p className="eyebrow">{practicalLesson17Date}</p>
   <h1>{practicalLesson17Title}</h1>
   <p>Practise bargaining, everyday descriptions, classifiers and sound-alikes.</p>
  </header>
  <nav className="practical17-tabs" aria-label="Lesson activities">
   {views.map(([id,label])=><button key={id} type="button" className={route.view===id?'primary':'secondary'}
    aria-pressed={route.view===id} onClick={()=>select({view:id},true)}>{label}</button>)}
  </nav>

  {route.view==='examples'&&<section className="panel practical17-panel" aria-labelledby="practical17-examples">
   <div className="practical17-controls">
    <label>Topic
     <select value={section.id} onChange={event=>select({topic:event.target.value})}>
      {practicalLesson17Sections.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
     </select>
    </label>
    <label className="practical17-toggle">
     <input type="checkbox" checked={hideChinese} onChange={event=>{stopAudio();setHideChinese(event.target.checked);}}/> English prompts first
    </label>
   </div>
   <h2 id="practical17-examples" ref={contentHeading} tabIndex={-1}>{section.title}</h2>
   <p className="practical17-note">{section.note}</p>
   <ul key={section.id+String(hideChinese)} className="practical17-examples">
    {section.entries.map((entry,index)=>{
     const sourceId='practical-2026-11-17:'+section.id+':'+(index+1);
     const chinese=<ChineseExample entry={entry} sourceId={sourceId} player={player}/>;
     return <li className={hideChinese?'practical17-example is-recall':'practical17-example'} key={sourceId}>
      {hideChinese
       ? <><p className="practical17-meaning" lang="en">{entry.english}</p><details><summary>Show Chinese</summary>{chinese}</details></>
       : <>{chinese}<p className="practical17-meaning" lang="en">{entry.english}</p></>}
     </li>;
    })}
   </ul>
  </section>}

  {route.view==='recall'&&<section className="panel practical17-panel practical17-recall" aria-labelledby="practical17-practice">
   <h2 id="practical17-practice" ref={contentHeading} tabIndex={-1}>Recall and answer key</h2>
   <p className="practical17-note">Say or write your answer first. The key gives one natural answer, and other phrasings can also work.</p>
   <label className="practical17-question-select">Question
    <select value={route.question} onChange={event=>select({question:Number(event.target.value)})}>
     {practicalLesson17Exercises.map(item=><option key={item.id} value={item.id}>{item.id} / {practicalLesson17Exercises.length}</option>)}
    </select>
   </label>
   <div className="practical17-prompt" data-study-assessment={revealed?'complete':'blocked'} lang="en">
    <h3>{exercise.prompt}</h3>
    <label>Your answer (optional)
     <textarea rows={2} spellCheck={false} value={drafts[exercise.id]??''} onChange={event=>setDrafts({...drafts,[exercise.id]:event.target.value})}/>
    </label>
    <button type="button" className={revealed?'secondary':'primary'} aria-expanded={revealed} aria-controls="practical17-answer"
     onClick={()=>{stopAudio();setRevealed(!revealed);}}>{revealed?'Hide answer':'Reveal answer'}</button>
    <div id="practical17-answer" aria-live="polite">
     {revealed&&<div className="practical17-answer">
      <ChineseExample entry={exercise} sourceId={'practical-2026-11-17:recall:'+exercise.id} player={player}/>
      <p>{exercise.english}</p>
      <p>{exercise.explanation}</p>
     </div>}
    </div>
   </div>
   <div className="practical17-actions practical17-pagination">
    <button type="button" className="secondary" disabled={route.question===1} onClick={()=>select({question:route.question-1},true)}><ArrowLeft size={16} aria-hidden="true"/>Previous question</button>
    <button type="button" className="secondary" disabled={route.question===practicalLesson17Exercises.length} onClick={()=>select({question:route.question+1},true)}>Next question<ArrowRight size={16} aria-hidden="true"/></button>
   </div>
  </section>}

  {route.view==='review'&&<section className="panel practical17-panel" aria-labelledby="practical17-review">
   <h2 id="practical17-review" ref={contentHeading} tabIndex={-1}>Review and homework</h2>
   {practicalLesson17Review.map(item=><section key={item.title} className="practical17-review-note" lang="en">
    <h3>{item.title}</h3><p>{item.text}</p>
   </section>)}
  </section>}
 </article>;
}
