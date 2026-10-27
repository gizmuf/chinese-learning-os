'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Volume2} from 'lucide-react';
import {useI18n} from './i18n';
import {useCourseProgress} from './course-store';
import {chunkUnits,chunkExamples,chunkAudio,chunkMaterialId,matchesChunkAnswer,type ChunkExample} from './speaking-chunks-data';
import {chunkCopy as copy} from './speaking-chunks-copy';
import {chunkReviewSummary} from './speaking-chunks-model';
import {StudyText} from './study-lookup';
import {stopAudio,playRecording} from './audio';
import {useSwipeNavigation} from './use-swipe-navigation';
import type {CourseEvent} from './course-learning';
import './speaking-chunks.css';
type Props={owner:string|null;notify:(message:string)=>void;onBack:()=>void};
export default function SpeakingChunks(props:Props){return <ChunksContent key={props.owner??'guest'} {...props}/>;}
function ChunksContent({owner,notify,onBack}:Props){
 const {locale,t}=useI18n(),c=(key:keyof typeof copy)=>copy[key][locale],progress=useCourseProgress(owner);
 const [index,setIndex]=useState(0),[variant,setVariant]=useState(0),[queue,setQueue]=useState<string[]|null>(null),[run,setRun]=useState(0),[now,setNow]=useState(()=>Date.now()),[busy,setBusy]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null),unit=chunkUnits[index],example=unit.variants[variant],summary=chunkReviewSummary(progress.events,now);
 function focus(){requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start',behavior:'instant'});});}
 useEffect(()=>{const tick=()=>setNow(Date.now()),resume=()=>{if(document.visibilityState==='visible'){tick();void progress.sync();}};const timer=setInterval(tick,30000);document.addEventListener('visibilitychange',resume);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',resume);stopAudio();};},[progress.sync]);
 function move(delta:number){stopAudio();setIndex(i=>Math.max(0,Math.min(chunkUnits.length-1,i+delta)));setVariant(0);}
 function start(ids:string[]){if(busy||!ids.length)return;stopAudio();setQueue([...ids]);setRun(n=>n+1);focus();}
 function finish(){if(busy)return;stopAudio();setQueue(null);setNow(Date.now());focus();}
 const swipe=useSwipeNavigation(move,!!queue);
 return <div className="course-space chunk-space"><button className="text-button" disabled={busy} onClick={()=>{stopAudio();onBack();}}><ArrowLeft size={17}/>{c('back')}</button><header className="page-heading"><div><p className="eyebrow">CHINESE OS · CHUNKS</p><h1 ref={heading} tabIndex={-1}>{c('title')}<span className="orange">.</span></h1><p>{c('intro')}</p><small>{c('subtitle')}</small></div></header>
 <div className="chunk-toolbar"><button className="secondary" aria-pressed={!queue} disabled={busy} onClick={finish}>{c('learn')}</button><button className="secondary" disabled={busy} onClick={()=>start(chunkExamples.map(v=>v.id))}>{c('all')}</button><button className="secondary" disabled={busy||!progress.ready||!summary.due.length} onClick={()=>start(chunkReviewSummary(progress.events).due.map(id=>id.replace('chunk-recall-','')))}>{c('due')} · {summary.due.length}</button><button className="secondary" disabled={busy||!progress.ready||!summary.difficult.length} onClick={()=>start(chunkReviewSummary(progress.events).difficult.map(id=>id.replace('chunk-recall-','')))}>{c('difficult')} · {summary.difficult.length}</button></div>
 {!progress.ready?<p role="status">{c(progress.status==='Device storage unavailable'?'storage':'loaded')}</p>:<p className="chunk-progress">{c('progress')}: {summary.known} / {chunkExamples.length}{summary.nextDue!==null&&<> · {c('later')}: {new Date(summary.nextDue).toLocaleString(locale,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</>}</p>}
 {queue?<ChunkRecall key={run} ids={queue} ready={progress.ready} record={progress.record} notify={notify} onFinish={finish} onBusy={setBusy}/>:<>
 <nav className="chunk-patterns" aria-label={c('learn')}>{chunkUnits.map((u,i)=><button key={u.id} className="secondary" aria-pressed={index===i} onClick={()=>{stopAudio();setIndex(i);setVariant(0);}}><small>{String(i+1).padStart(2,'0')}</small>{u.title[locale]}</button>)}</nav>
 <section className="panel chunk-lesson" {...swipe}><header className="chunk-lesson-head"><div><span className="eyebrow">{index+1} / {chunkUnits.length}</span><h2>{unit.title[locale]}</h2></div><nav aria-label={c('learn')}><button className="secondary" disabled={!index} onClick={()=>move(-1)} aria-label={c('previous')}><ArrowLeft size={18}/></button><button className="secondary" disabled={index===chunkUnits.length-1} onClick={()=>move(1)} aria-label={c('next')}><ArrowRight size={18}/></button></nav></header>
 <p className="chunk-translation">{example.meaning[locale]}</p><ChunkStrip key={example.id} example={example} notify={notify}/><p className="chunk-legend">{c('legend')}</p>
 <div className="chunk-swap"><h3>{c('swap')}</h3><div className="chunk-variants">{unit.variants.map((v,i)=><button key={v.id} className="secondary" aria-pressed={variant===i} onClick={()=>{stopAudio();setVariant(i);}}>{v.chunks.filter((ch,j)=>unit.variants.some(other=>other.chunks[j]?.text!==ch.text)).map((ch,j)=><span className={"chunk-swap-piece chunk-role-"+ch.role} key={j}><span lang="zh-Hans">{ch.text}</span><span className="pinyin">{ch.pinyin}</span><small>{ch.meaning[locale]}</small></span>)}</button>)}</div></div>
 <div className="chunk-note"><p>{unit.note[locale]}</p><a href={'/?course=intensive&lesson='+unit.lesson}>{c('lesson')} {String(unit.lesson).padStart(2,'0')}<ArrowRight size={16}/></a></div>
 <p>{c('shadow')}</p><button className="primary" onClick={()=>start(unit.variants.map(v=>v.id))}>{c('recall')}<ArrowRight size={17}/></button></section>
 </>}
 <footer className="chunk-footer"><p>{c('limits')}</p><a href="https://www.chunkingchinese.com/app/" target="_blank" rel="noreferrer">{c('origin')}</a><p>{t(progress.status)}</p></footer></div>;
}
function ChunkStrip({example,notify}:{example:ChunkExample;notify:(m:string)=>void}){
 const {locale}=useI18n();return <><div className="chunk-strip">{example.chunks.map((ch,i)=><article key={i} className={'chunk-piece chunk-role-'+ch.role}><small className="chunk-role-label">{copy[ch.role][locale]}</small><div className="chunk-hanzi" lang="zh-Hans"><StudyText text={ch.text}/></div><p className="pinyin">{ch.pinyin}</p><p>{ch.meaning[locale]}</p><button className="chunk-speaker" aria-label={copy.part[locale]+': '+ch.text} onClick={()=>playRecording(chunkAudio(ch.audioId),notify)}><Volume2 size={18}/></button></article>)}</div><div className="chunk-whole"><span lang="zh-Hans"><StudyText text={example.hanzi}/></span><p className="pinyin">{example.pinyin}</p><button className="secondary" onClick={()=>playRecording(chunkAudio(example.id),notify)}><Volume2 size={18}/>{copy.listen[locale]}</button></div></>;
}
type Attempt={event:CourseEvent;input:string;saved:boolean};
function ChunkRecall({ids,ready,record,notify,onFinish,onBusy}:{ids:string[];ready:boolean;record:(e:CourseEvent)=>Promise<void>;notify:(m:string)=>void;onFinish:()=>void;onBusy:(busy:boolean)=>void}){
 const {locale}=useI18n(),c=(key:keyof typeof copy)=>copy[key][locale];
 const [index,setIndex]=useState(0),[input,setInput]=useState(''),[revealed,setRevealed]=useState(false),[attempts,setAttempts]=useState<Record<string,Attempt>>({}),[saving,setSaving]=useState(false);
 const lock=useRef(false),target=chunkExamples.find(v=>v.id===ids[index])!,attempt=attempts[target.id],unit=chunkUnits.find(u=>u.variants.some(v=>v.id===target.id))!;
 function move(delta:number){if(lock.current)return;stopAudio();setIndex(i=>Math.max(0,Math.min(ids.length-1,i+delta)));setInput('');setRevealed(false);}
 const swipe=useSwipeNavigation(move,saving);
 useEffect(()=>()=>stopAudio(),[]);
 async function check(){if(lock.current||!ready||(!input.trim()&&!attempt))return;lock.current=true;setSaving(true);onBusy(true);stopAudio();const row=attempt??{event:{id:crypto.randomUUID(),lessonId:chunkMaterialId,activityId:'chunk-recall-'+target.id,kind:'answer' as const,correct:matchesChunkAnswer(input,target.hanzi),assisted:revealed,at:Date.now()},input,saved:false};setAttempts(old=>({...old,[target.id]:row}));try{await record(row.event);setAttempts(old=>({...old,[target.id]:{...row,saved:true}}));}catch{notify(c('error'));}finally{setSaving(false);onBusy(false);lock.current=false;}}
 const feedback=!!attempt||revealed;
 return <section className="panel chunk-recall" data-study-assessment={feedback?'complete':'blocked'} {...swipe}><header className="chunk-lesson-head"><div><span className="eyebrow">{index+1} / {ids.length}</span><h2>{unit.title[locale]}</h2></div><nav aria-label={c('recall')}><button className="secondary" aria-label={c('previous')} disabled={!index||saving} onClick={()=>move(-1)}><ArrowLeft size={18}/></button><button className="secondary" aria-label={c('next')} disabled={index===ids.length-1||saving} onClick={()=>move(1)}><ArrowRight size={18}/></button></nav></header><p>{c('task')}</p><h3 className="chunk-prompt">{target.meaning[locale]}</h3><div className="chunk-role-hints" aria-hidden="true">{target.chunks.map((ch,i)=><span key={i} className={'chunk-role-'+ch.role}>{copy[ch.role][locale]}</span>)}</div>
 <label className="chunk-input">{c('input')}<textarea value={attempt?.input??input} lang="zh-Hans" autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={!!attempt||saving} onChange={e=>setInput(e.target.value)}/></label>
 <div className="course-actions">{!attempt?.saved&&<button className="primary" disabled={!ready||saving||!attempt&&!input.trim()} onClick={()=>void check()}>{saving?c('working'):attempt?c('retrySave'):c('check')}</button>}{!feedback&&<button className="text-button" onClick={()=>{stopAudio();setRevealed(true);}}>{c('reveal')}</button>}</div>
 {feedback&&<div className="chunk-feedback"><div role="status">{attempt&&<strong>{c(attempt.event.correct?'correct':'incorrect')}</strong>}{(revealed||attempt?.event.assisted)&&<p>{c('supported')}</p>}{attempt?.saved&&<p>{c('saved')}</p>}</div><ChunkStrip example={target} notify={notify}/></div>}
 {index===ids.length-1&&<button className="secondary chunk-finish" disabled={saving} onClick={onFinish}>{c('finish')}<ArrowRight size={17}/></button>}</section>;
}
