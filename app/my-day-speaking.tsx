'use client';
import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,Volume2} from 'lucide-react';
import {StudyText} from './study-lookup';
import {stopAudio} from './audio';
import {useRecordingPlayback} from './use-recording-playback';
import {speakingVariants,speakingRows,speakingClip,speakingViewKey} from './my-day-speaking-model';

export default function MyDaySpeaking({id,owner,notify,onBack}:{id:string;owner:string;notify:(s:string)=>void;onBack:()=>void}){
 const variant=speakingVariants.find(v=>v.id===id)!;
 const rows=speakingRows(id),recording=useRecordingPlayback(notify);
 const [index,setIndex]=useState(0),[size,setSize]=useState(1),[all,setAll]=useState(false),[hidden,setHidden]=useState(false),[rounds,setRounds]=useState<Record<number,number>>({}),[loaded,setLoaded]=useState(false);
 useEffect(()=>{
  try{const value=JSON.parse(sessionStorage.getItem(speakingViewKey(owner,id))??'null');if(value&&Number.isInteger(value.index)&&value.index>=0&&value.index<rows.length)setIndex(value.index);}catch{/* Session storage is optional. */}
  setLoaded(true);return()=>stopAudio();
 },[owner,id,rows.length]);
 useEffect(()=>{if(loaded)try{sessionStorage.setItem(speakingViewKey(owner,id),JSON.stringify({index}));}catch{/* Continue rehearsal. */}},[owner,id,index,loaded]);
 const visible=all?rows.map((row,i)=>({row,i})):rows.slice(index,index+size).map((row,n)=>({row,i:index+n}));
 const available=rows.filter(row=>speakingClip(row.hanzi)).length;
 function move(next:number){stopAudio();setIndex(next);setHidden(false);}
 return <section className="my-day-lesson" aria-label={variant.title}>
  <button className="text-button" onClick={()=>{stopAudio();onBack();}}><ArrowLeft size={16}/>Back to study</button>
  <header className="md-heading"><p className="eyebrow">MY DAY · SPEAKING PRACTICE</p><h1>{variant.title}</h1><p>{rows.length} sentences · Listen → repeat → recall</p><p className="md-intro">Start with one sentence. Listen, echo it aloud, then say it again without looking. Repeat three times before moving on. For a longer turn, practise two sentences together.</p><span className="pill">Self practice · no pronunciation or tone score</span></header>
  <p className="md-intro">Synthetic study voice · Qwen · {available} of {rows.length} sentences have an existing recording. Other recordings are pending.</p>
  <div className="md-controls" role="group" aria-label="Speaking practice display">
   <label>Practice size <select aria-label="Practice size" value={size} onChange={e=>{stopAudio();setSize(Number(e.target.value));}}><option value={1}>One sentence</option><option value={2}>Two sentences</option></select></label>
   <button aria-pressed={all} onClick={()=>{stopAudio();setAll(v=>!v);setHidden(false);}}>{all?'Return to practice':'Read full variant'}</button>
   <button aria-pressed={hidden} onClick={()=>setHidden(v=>!v)}>{hidden?'Reveal text':'Hide text · try from memory'}</button>
  </div>
  {!all&&<div className="md-rehearsal-nav"><button disabled={index===0} onClick={()=>move(Math.max(0,index-size))}><ArrowLeft size={16}/>Previous</button><span aria-live="polite">Sentence {index+1}{size===2&&index+1<rows.length?'–'+Math.min(index+size,rows.length):''} / {rows.length}</span><button disabled={index+size>=rows.length} onClick={()=>move(index+size)}>Next<ArrowRight size={16}/></button></div>}
  {hidden&&<p role="status">Text hidden. Say it from memory, then reveal it to check.</p>}
  <div className="md-section">{visible.map(({row,i})=>{const clip=speakingClip(row.hanzi);return <article className="md-sentence" key={i} data-study-source-id={id+':'+(i+1)} data-study-sentence={row.hanzi} data-study-pinyin={row.pinyin} data-study-meaning={row.english}>
   <span className="md-number">{String(i+1).padStart(2,'0')} · {row.section}</span>
   {!hidden&&<><div className="md-hanzi" lang="zh-Hans"><StudyText text={row.hanzi} pinyin={row.pinyin}/></div><p className="md-pinyin" lang="zh-Latn-pinyin">{row.pinyin}</p><p className="md-english" lang="en">{row.english}</p></>}
   <div className="md-speaking-actions">{clip?<button className="text-button" aria-pressed={recording.playing===clip.source} onClick={()=>recording.play(clip.source)}><Volume2 size={16}/>Listen to sentence {i+1}</button>:<span className="md-intro">Sentence recording pending</span>}
   <button className="secondary" onClick={()=>setRounds(v=>({...v,[i]:Math.min(3,(v[i]??0)+1)}))}>I said it aloud · {rounds[i]??0}/3</button>
   {(rounds[i]??0)>=3&&<span role="status">Try it once from memory.</span>}</div>
  </article>;})}</div>
  <p className="md-intro">Tap a word to explore its meaning, characters, Atlas and writing practice. Repetition counts are your own check-in for this visit; they do not measure accuracy or change your review schedule.</p>
 </section>;
}
