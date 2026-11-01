'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,ExternalLink,PenLine,Volume2,X} from 'lucide-react';
import source from '../data/shuoshuo-day-companion-01.json';
import {items,type Item} from './content';
import {StudyText} from './study-lookup';
import {myDayAtlasLink} from './my-day-lesson-model';
import SharedWriting from './shared-writing';
import RecognitionReview from './recognition-review';
import type {LearningEvent} from './learning';
import {stopAudio} from './audio';
import './shuoshuo-day-companion.css';

type Props={
  db:IDBDatabase|null;
  record:(event:LearningEvent)=>Promise<void>;
  notify:(message:string)=>void;
  onBack:()=>void;
  onMyDay:()=>void;
};
const canonical=new Map(items.map(item=>[item.hanzi,item]));
const selected=source.vocabulary.flatMap(row=>{const item=canonical.get(row.hanzi);return item?[item]:[];});
const sceneWords=(texts:string[])=>texts.flatMap(text=>{
  const word=source.vocabulary.find(entry=>entry.hanzi===text);
  return word?[word]:[];
});

/** A source-linked companion, not a transcript or a claim about Shuo's spoken lines. */
export default function ShuoshuoDayCompanion({db,record,notify,onBack,onMyDay}:Props){
  const [tab,setTab]=useState<'scene'|'recognize'>('scene');
  const [scene,setScene]=useState(0),[index,setIndex]=useState(0),[stage,setStage]=useState<0|1|2>(0);
  const [showHanzi,setShowHanzi]=useState(true),[showPinyin,setShowPinyin]=useState(false),[showEnglish,setShowEnglish]=useState(false);
  const [writing,setWriting]=useState<Item|null>(null),[practice,setPractice]=useState<string|null>(null);
  const dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null);
  const current=source.scenes[scene],word=source.vocabulary[index];
  const linked=useMemo(()=>selected.filter((item,i,all)=>all.findIndex(other=>other.id===item.id)===i),[]);
  useEffect(()=>{if(writing)dialog.current?.showModal();else dialog.current?.close();},[writing]);
  useEffect(()=>()=>stopAudio(),[]);
  function closeWriting(){setWriting(null);requestAnimationFrame(()=>opener.current?.focus({preventScroll:true}));}
  function openWriting(item:Item,trigger:HTMLElement){opener.current=trigger;setWriting(item);}
  function nextWord(delta:number){
    setIndex(i=>Math.max(0,Math.min(source.vocabulary.length-1,i+delta)));setStage(0);
  }
  return <section className="shuo-day" aria-label="A Day with Shuo · video-linked study">
    <button className="text-button" onClick={()=>{stopAudio();onBack();}}><ArrowLeft size={16}/>Back to My lessons</button>
    <header className="shuo-heading">
      <p className="eyebrow">INDEPENDENT VIDEO COMPANION · DAY 01</p>
      <h1>{source.title}</h1>
      <p>Six original everyday scenes · {source.vocabulary.length} word targets · Hanzi-first recognition</p>
      <p className="shuo-source-note"><strong>Source distinction:</strong> These are independently written practice sentences, not the video's transcript or verified quotations from Shuo. Watch the linked video for her own narration.</p>
    </header>
    <div className="shuo-video">
      <div className="shuo-video-frame"><iframe title="ShuoshuoChinese original YouTube video" src={'https://www.youtube-nocookie.com/embed/'+source.source.videoId} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div>
      <p><a href={source.source.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Open the original ShuoshuoChinese video</a> · If video playback is blocked, use this link with your VPN.</p>
    </div>
    <nav className="shuo-tabs" aria-label="Learning modes">
      <button className={tab==='scene'?'selected':''} aria-pressed={tab==='scene'} onClick={()=>setTab('scene')}><BookOpen size={17}/>Learn by scene</button>
      <button className={tab==='recognize'?'selected':''} aria-pressed={tab==='recognize'} onClick={()=>{setTab('recognize');setStage(0);}}>Recognize hanzi</button>
    </nav>
    {tab==='scene'?<section className="shuo-panel">
      <div className="shuo-navigation">
        <button disabled={scene===0} onClick={()=>setScene(i=>i-1)}><ArrowLeft size={16}/>Previous</button>
        <span aria-live="polite">Scene {scene+1} / {source.scenes.length}</span>
        <button disabled={scene===source.scenes.length-1} onClick={()=>setScene(i=>i+1)}>Next<ArrowRight size={16}/></button>
      </div>
      <div className="shuo-scene-index">{source.scenes.map((s,i)=><button aria-label={'Scene '+(i+1)} title={s.title} key={s.id} aria-pressed={scene===i} className={scene===i?'active':''} onClick={()=>setScene(i)}>{i+1}</button>)}</div>
      <h2>{current.title}</h2><p>{current.cue}</p>
      <div className="shuo-display-controls" role="group" aria-label="Text reveal layers">
        <label><input type="checkbox" checked={showHanzi} onChange={e=>setShowHanzi(e.target.checked)}/>Hanzi</label>
        <label><input type="checkbox" checked={showPinyin} onChange={e=>setShowPinyin(e.target.checked)}/>Pinyin</label>
        <label><input type="checkbox" checked={showEnglish} onChange={e=>setShowEnglish(e.target.checked)}/>English</label>
      </div>
      <article className="shuo-sentence">
        {showHanzi&&<div className="shuo-hanzi" lang="zh-Hans"><StudyText text={current.hanzi}/></div>}
        {showPinyin&&<p className="shuo-pinyin" lang="zh-Latn-pinyin">{current.pinyin}</p>}
        {showEnglish&&<p>{current.english}</p>}
        {!showHanzi&&!showPinyin&&!showEnglish&&<p>Say the scene from memory, then reveal a text layer.</p>}
      </article>
      <h3>Notice these words</h3>
      <div className="shuo-word-grid">{sceneWords(current.words).map(v=>{
        const known=canonical.get(v.hanzi),atlas=known?myDayAtlasLink(known):null;
        return <article key={v.hanzi}><div className="shuo-word" lang="zh-Hans"><StudyText text={v.hanzi} whole/></div><p className="shuo-pinyin">{v.pinyin}</p><p>{v.english}</p>
          <div className="shuo-word-actions">{known&&<button onClick={e=>openWriting(known,e.currentTarget)}><PenLine size={15}/>Write</button>}{atlas&&<a href={atlas.href} target="_blank" rel="noopener noreferrer">Atlas · {atlas.character}</a>}</div></article>;
      })}</div>
    </section>:<section className="shuo-panel" aria-label="Hanzi recognition">
      <div className="shuo-navigation"><button disabled={index===0} onClick={()=>nextWord(-1)}><ArrowLeft size={16}/>Previous</button><span aria-live="polite">Word {index+1} / {source.vocabulary.length}</span><button disabled={index===source.vocabulary.length-1} onClick={()=>nextWord(1)}>Next<ArrowRight size={16}/></button></div>
      <p>Identify the meaning before revealing the reading. This browse-only drill does not award independent review credit.</p>
      <div className="shuo-recall-card">
        <div className="shuo-recall-hanzi" lang="zh-Hans">{word.hanzi}</div>
        {stage>=1&&<p className="shuo-pinyin">{word.pinyin}</p>}
        {stage>=2&&<p>{word.english}</p>}
        {stage===0?<button className="primary" onClick={()=>setStage(1)}>Reveal pinyin</button>:stage===1?<button className="primary" onClick={()=>setStage(2)}>Reveal meaning</button>:<button className="primary" disabled={index===source.vocabulary.length-1} onClick={()=>nextWord(1)}>Next word<ArrowRight size={15}/></button>}
      </div>
      {canonical.has(word.hanzi)&&<button className="secondary" onClick={e=>openWriting(canonical.get(word.hanzi)!,e.currentTarget)}><PenLine size={16}/>Practice writing this word</button>}
    </section>}
    <section className="shuo-panel shuo-existing">
      <h2>Continue in Chinese OS</h2>
      <p>{linked.length} of {source.vocabulary.length} target words already have an exact canonical Chinese OS vocabulary card. These can be practised using the existing writing and supported recognition tools. Unmatched words are not silently registered as new SRS cards.</p>
      <div className="shuo-actions"><button className="secondary" onClick={onMyDay}>Open 我的⼀天 · My Day</button>
      <button className="primary" disabled={!db||!linked.length||!!practice} onClick={()=>setPractice(crypto.randomUUID())}>Practise matched words</button></div>
      {practice&&<><p>Supported extra practice · the independent FSRS schedule is unchanged.</p><RecognitionReview db={db} runId={practice} queue={linked} practice record={record} notify={notify} onPosition={()=>{}} onWrite={item=>{opener.current=null;setWriting(item);}}/><button className="secondary" onClick={()=>setPractice(null)}>Close word practice</button></>}
    </section>
    <dialog className="md-writing-dialog" ref={dialog} aria-labelledby="shuo-writing-title" onCancel={e=>{e.preventDefault();closeWriting();}} onClose={()=>setWriting(null)}>
      <header><h2 id="shuo-writing-title">Supported writing practice</h2><button className="secondary" aria-label="Close writing" onClick={closeWriting}><X size={18}/></button></header>
      {writing&&<SharedWriting key={writing.id} item={writing} hanzi={writing.hanzi} onBack={closeWriting}/>}
    </dialog>
  </section>;
}
