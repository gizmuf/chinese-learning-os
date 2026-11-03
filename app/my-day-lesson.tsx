'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,PenLine,Volume2,X} from 'lucide-react';
import {myDayAtlasLink,myDayLesson,myDaySentences,myDaySentenceAudio,myDayVocabulary} from './my-day-lesson-model';
import {myDayMeaningGroups} from './reader-patterns-model';
import {ReaderPatternLinks} from './reader-patterns';
import {readMyDayView,saveMyDayView} from './my-day-reader-state';
import {StudyText} from './study-lookup';
import SharedWriting from './shared-writing';
import RecognitionReview from './recognition-review';
import type {Item} from './content';
import type {LearningEvent} from './learning';
import {speak,stopAudio} from './audio';
import {useRecordingPlayback} from './use-recording-playback';
import {qwenCurriculumClip,hasQwenCurriculumAudio,qwenSyntheticLabel} from './qwen-curriculum-audio';
import './my-day-lesson.css';
import MyDaySpeaking from './my-day-speaking';
import {speakingVariants} from './my-day-speaking-model';

type LessonProps={db:IDBDatabase|null;record:(event:LearningEvent)=>Promise<void>;notify:(message:string)=>void;onBack:()=>void;owner?:string};
export default function MyDayLesson(props:LessonProps){
 const [variant,setVariant]=useState('my-day-01-v2');
 useEffect(()=>{if(typeof window==='undefined')return;const id=new URLSearchParams(window.location.search).get('rehearsal');if(speakingVariants.some(v=>v.id===id))setVariant(id!);},[]);
 return <><nav className="md-controls" aria-label="My Day variants"><label>Lesson variant <select aria-label="Lesson variant" value={variant} onChange={event=>{stopAudio();setVariant(event.target.value);const url=new URL(window.location.href);url.searchParams.set('rehearsal',event.target.value);window.history.replaceState(null,'',url.pathname+url.search);}}><option value="my-day-01-v2">Day 01 · Version 2 · Original</option>{speakingVariants.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}</select></label></nav>{variant==='my-day-01-v2'?<OriginalMyDayLesson {...props}/>:<MyDaySpeaking key={variant+':'+(props.owner??'guest')} id={variant} owner={props.owner??'guest'} notify={props.notify} onBack={props.onBack}/>}</>;
}
function OriginalMyDayLesson({db,record,notify,onBack,owner='guest'}:LessonProps){
  const recording=useRecordingPlayback(notify);
  const [hanzi,setHanzi]=useState(true),[pinyin,setPinyin]=useState(true),[english,setEnglish]=useState(true);
  const [single,setSingle]=useState(false),[index,setIndex]=useState(0),[writing,setWriting]=useState<Item|null>(null);
  const [chunks,setChunks]=useState(false),[loadedOwner,setLoadedOwner]=useState<string|null>(null);
  const [practice,setPractice]=useState<string|null>(null);
  const writer=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    if(typeof window==='undefined')return;let active=true;setLoadedOwner(null);
    let view;try{view=readMyDayView(window.sessionStorage,owner);}catch{setLoadedOwner(owner);return;}
    setHanzi(view.hanzi);setPinyin(view.pinyin);setEnglish(view.english);setSingle(view.single);setIndex(view.index);setChunks(view.chunks);
    requestAnimationFrame(()=>{if(active){window.scrollTo({top:view.scrollY});setLoadedOwner(owner);}});
    return()=>{active=false;};
  },[owner]);
  useEffect(()=>{
    if(typeof window==='undefined'||loadedOwner!==owner)return;
    const remember=()=>{try{saveMyDayView(window.sessionStorage,owner,{version:1,hanzi,pinyin,english,single,chunks,index,scrollY:Math.max(0,window.scrollY)});}catch{/* View remains usable without session storage. */}};
    remember();let timer:ReturnType<typeof setTimeout>|undefined;const scroll=()=>{clearTimeout(timer);timer=setTimeout(remember,180);};
    window.addEventListener('scroll',scroll,{passive:true});return()=>{clearTimeout(timer);window.removeEventListener('scroll',scroll);};
  },[owner,loadedOwner,hanzi,pinyin,english,single,chunks,index]);
  useEffect(()=>{if(writing)writer.current?.showModal();else writer.current?.close();},[writing]);
  useEffect(()=>()=>stopAudio(),[]);
  function closeWriting(){setWriting(null);stopAudio();requestAnimationFrame(()=>opener.current?.focus({preventScroll:true}));}
  function write(item:Item,trigger?:HTMLElement){opener.current=trigger??null;setWriting(item);}
  function renderRow(row:{hanzi:string;pinyin:string;english:string},number?:number){
    const audio=number!==undefined?myDaySentenceAudio(row.hanzi):undefined;
    const qwen=number!==undefined?qwenCurriculumClip('my-day-01-v2',row.hanzi):undefined;
    const sourceId=number!==undefined?'my-day-01-v2:'+(number+1):undefined;
    return <article key={row.hanzi} className="md-sentence" data-study-source-id={sourceId} data-study-sentence={row.hanzi} data-study-pinyin={row.pinyin} data-study-meaning={row.english}>
      {number!==undefined&&<span className="md-number">{String(number+1).padStart(2,'0')}</span>}
      {hanzi&&<div className="md-hanzi" lang="zh-Hans">{chunks&&number!==undefined?myDayMeaningGroups[number].map((chunk,i)=><span className="md-chunk" key={i}><StudyText text={chunk} pinyin={row.pinyin} sourceText={row.hanzi} offset={myDayMeaningGroups[number].slice(0,i).join('').length}/></span>):<StudyText text={row.hanzi} pinyin={row.pinyin}/>}</div>}
      {pinyin&&<p className="md-pinyin" lang="zh-Latn-pinyin">{row.pinyin}</p>}
      {english&&<p className="md-english" lang="en">{row.english}</p>}
      {(qwen||audio)&&<button className="text-button" aria-pressed={!!qwen&&recording.playing===qwen.source} onClick={()=>qwen?recording.play(qwen.source):audio&&speak(row.hanzi,notify,audio)}><Volume2 size={15}/>Listen to this sentence</button>}
      {sourceId&&<ReaderPatternLinks sourceId={sourceId} notify={notify}/>}
    </article>;
  }
  return <section className="my-day-lesson" aria-label="My day · Day 01 V2">
    <button className="text-button" onClick={()=>{stopAudio();onBack();}}><ArrowLeft size={16}/>Back to study</button>
    <header className="md-heading"><p className="eyebrow">PERSONAL LESSON · SPEAKING</p><h1>{myDayLesson.title}</h1><p>{myDayLesson.subtitle}</p><span className="pill">Rehearsal, not graded</span><p className="md-intro">26 short sentences from your morning to bedtime. Say them aloud, then hide the reading or translation and try again. Reading and navigation award no review credit.</p></header>
    {hasQwenCurriculumAudio('my-day-01-v2')&&<p className="md-intro">{qwenSyntheticLabel.en}</p>}
    <details className="md-time-note"><summary>Source note · original times</summary><p>This faithful rehearsal keeps waking up around 8:00 and class at 8:40. For a realistic school-day version, you could say 七点 (7:00). The original sentences below stay unchanged.</p></details>
    <div className="md-controls" role="group" aria-label="Reading display">
      <label><input type="checkbox" checked={hanzi} onChange={e=>setHanzi(e.target.checked)}/>Hanzi</label>
      <label><input type="checkbox" checked={pinyin} onChange={e=>setPinyin(e.target.checked)}/>Pinyin</label>
      <label><input type="checkbox" checked={english} onChange={e=>setEnglish(e.target.checked)}/>English</label>
      <button className="md-group-toggle" aria-pressed={chunks} onClick={()=>setChunks(v=>!v)}>{chunks?'Plain sentence':'Meaning groups'}</button>
      <button aria-pressed={single} onClick={()=>setSingle(v=>!v)}>{single?'Show full lesson':'One sentence at a time'}</button>
    </div>
    {!hanzi&&!pinyin&&!english&&<p role="status">All text is hidden. Say the sentence from memory, then turn a layer back on to check it.</p>}
    {single?<section className="md-section" aria-label="Sentence rehearsal"><div className="md-rehearsal-nav"><button disabled={index===0} onClick={()=>setIndex(n=>n-1)}><ArrowLeft size={16}/>Previous</button><span aria-live="polite">Sentence {index+1} / {myDaySentences.length}</span><button disabled={index===myDaySentences.length-1} onClick={()=>setIndex(n=>n+1)}>Next<ArrowRight size={16}/></button></div>{renderRow(myDaySentences[index],index)}</section>:
      <div className="md-sections">{myDayLesson.sections.map(section=><section key={section.id} className="md-section" aria-labelledby={'md-'+section.id}><h2 id={'md-'+section.id}>{section.title}</h2>{section.rows.map(row=>renderRow(row,myDaySentences.findIndex(s=>s.hanzi===row.hanzi)))}</section>)}</div>}
    <div className="md-glossary"><section className="md-section"><h2>Movement · 方向与动作</h2>{myDayLesson.movement.map(row=>renderRow(row))}</section><section className="md-section"><h2>Connectors · 连接词</h2>{myDayLesson.connectors.map(row=>renderRow(row))}</section></div>
    <section className="md-section md-known-words"><h2><BookOpen size={19}/>Words already in ChineseOS</h2><p>Optional supported practice uses the existing vocabulary IDs. The rehearsal sentences are not new graded cards. Sentence recordings use exact text matches.</p>
      <div className="md-word-grid">{myDayVocabulary.map(item=>{const atlas=myDayAtlasLink(item);return <article key={item.id}><div lang="zh-Hans"><StudyText text={item.hanzi} whole/></div><p>{item.pinyin} · {item.english}</p><div className="md-word-actions"><button onClick={e=>write(item,e.currentTarget)}><PenLine size={15}/>Write {item.hanzi}</button>{atlas&&<a href={atlas.href} target="_blank" rel="noopener noreferrer">Atlas · {atlas.character}<ArrowRight size={14}/></a>}</div></article>;})}</div>
      <button className="primary" disabled={!db||!!practice} onClick={()=>setPractice(crypto.randomUUID())}>Practise these known words</button>
      {practice&&<><p>Extra supported practice · your independent review schedule stays unchanged.</p><RecognitionReview db={db} runId={practice} queue={myDayVocabulary} practice record={record} notify={notify} onPosition={()=>{}} onWrite={item=>write(item)}/><button className="secondary" onClick={()=>{stopAudio();setPractice(null);}}>Close word practice</button></>}
    </section>
    <dialog className="md-writing-dialog" ref={writer} aria-labelledby="md-writing-title" onCancel={closeWriting} onClose={()=>setWriting(null)}><header><h2 id="md-writing-title">Supported writing practice</h2><button className="secondary" aria-label="Close writing" onClick={closeWriting}><X size={18}/></button></header>{writing&&<SharedWriting key={writing.id} item={writing} hanzi={writing.hanzi} onBack={closeWriting}/>}</dialog>
  </section>;
}
