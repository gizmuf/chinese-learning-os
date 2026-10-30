'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight,MessageCircle} from 'lucide-react';
import {useI18n} from './i18n';
import {stopAudio} from './audio';
import type {ChunkExample} from './speaking-chunks-data';
import {situationRound,situationPatterns,situationHintChunks,situationSummary,typedSituationResult,type SituationResult,type SituationId} from './chunk-situation-lab-model';
import {situationCopy,situationScenarios} from './chunk-situation-lab-copy';
import './chunk-situation-lab.css';
type Props={onBack:()=>void;renderExample:(example:ChunkExample)=>ReactNode};
type Comparison={method:'spoken'|'typed'|'reveal';result?:SituationResult};
export default function ChunkSituationLab({onBack,renderExample}:Props){
 const {locale}=useI18n(),c=situationCopy[locale],all=situationRound();
 const [ids,setIds]=useState<readonly SituationId[]>(all.map(s=>s.id)),[cursor,setCursor]=useState(0),[phase,setPhase]=useState<'example'|'task'|'compare'>('example'),[hint,setHint]=useState(0),[input,setInput]=useState(''),[comparison,setComparison]=useState<Comparison|null>(null),[results,setResults]=useState<SituationResult[]>([]);
 const heading=useRef<HTMLHeadingElement>(null),composing=useRef(false),situation=all.find(s=>s.id===ids[cursor]),summary=situationSummary(results);
 useEffect(()=>()=>stopAudio(),[]);
 function focus(){requestAnimationFrame(()=>heading.current?.focus())}
 function startTask(){stopAudio();setPhase('task');focus()}
 function compare(method:Comparison['method']){if(!situation||composing.current)return;stopAudio();setComparison({method,...(method==='typed'?{result:typedSituationResult(situation,input,hint>0)}:{})});setPhase('compare');focus()}
 function next(outcome:'self-check'|'retry'='retry'){
  if(!situation||!comparison)return;stopAudio();const result=comparison.result??{id:situation.id,method:comparison.method,outcome,assisted:hint>0||comparison.method==='reveal'};
  setResults([...results,result]);setCursor(cursor+1);setPhase('example');setHint(0);setInput('');setComparison(null);composing.current=false;focus();
 }
 function restart(retry:boolean){stopAudio();setIds(retry?summary.retryIds:all.map(s=>s.id));setResults([]);setCursor(0);setPhase('example');setHint(0);setInput('');setComparison(null);composing.current=false;focus()}
 return <div className="course-space chunk-space situation-lab"><button type="button" className="text-button" onClick={()=>{stopAudio();onBack()}}><ArrowLeft size={17}/>{c.back}</button>
  <header className="page-heading"><div><p className="eyebrow">CHINESE OS · LAB</p><h1>{c.title}<span className="orange">.</span></h1><p>{c.intro}</p><small>{c.local}</small></div></header>
  {!situation?<section className="panel sl-summary"><h2 ref={heading} tabIndex={-1}>{c.done}</h2><dl><div><dt>{c.unaided}</dt><dd>{summary.unaided}</dd></div><div><dt>{c.selfChecks}</dt><dd>{summary.selfCheck}</dd></div><div><dt>{c.helped}</dt><dd>{summary.assisted}</dd></div></dl><p>{c.notMastery}</p><div className="course-actions">{summary.retryIds.length>0&&<button type="button" className="secondary" onClick={()=>restart(true)}>{c.retry} · {summary.retryIds.length}</button>}<button type="button" className="primary" onClick={()=>restart(false)}>{c.again}</button></div></section>:<section className="panel chunk-lesson sl-task" data-study-assessment={phase==='task'?'blocked':undefined}>
   <header className="sl-heading"><span className="eyebrow">{c.progress} {cursor+1} {c.of} {ids.length}</span><h2 ref={heading} tabIndex={-1}>{situation.unit.title[locale]}</h2></header>
   {phase==='example'?<><p className="sl-phase">{c.example}</p><p className="chunk-translation">{situation.example.meaning[locale]}</p>{renderExample(situation.example)}<div className="course-actions"><button type="button" className="primary" onClick={startTask}>{c.try}<ArrowRight size={17}/></button></div></>:phase==='task'?<>
    <div className="sl-scenario"><MessageCircle size={22} aria-hidden="true"/><div><p className="sl-phase">{c.task}</p><p>{situationScenarios[situation.id][locale]}</p></div></div>
    <p className="sl-instruction">{c.say}</p><small>{c.noMic}</small><div className="course-actions"><button type="button" className="primary" onClick={()=>compare('spoken')}>{c.said}</button></div>
    <div className="sl-hints"><button type="button" className="text-button" disabled={hint>0} onClick={()=>setHint(1)}>{c.pattern}</button><button type="button" className="text-button" disabled={hint!==1} onClick={()=>setHint(2)}>{c.chunks}</button><button type="button" className="text-button" onClick={()=>compare('reveal')}>{c.reveal}</button></div>
    {hint>0&&<aside className="sl-support" aria-label={c.hintLabel}><p>{c.assisted}</p><p lang="zh-Hans">{situationPatterns[situation.unit.id]}</p>{hint>1&&situationHintChunks(situation).map(ch=><div className="sl-hint-piece" key={ch.audioId}><span lang="zh-Hans">{ch.text}</span><span className="pinyin">{ch.pinyin}</span><span>{ch.meaning[locale]}</span></div>)}</aside>}
    <details className="sl-typed"><summary>{c.type}</summary><p>{c.expected}</p><form onSubmit={e=>{e.preventDefault();if(input.trim())compare('typed')}}><label htmlFor="sl-answer">{c.input}</label><input id="sl-answer" value={input} lang="zh-Hans" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} onCompositionStart={()=>{composing.current=true}} onCompositionEnd={()=>{composing.current=false}} onKeyDown={e=>{if(e.key==='Enter'&&(e.nativeEvent.isComposing||composing.current||e.nativeEvent.keyCode===229))e.preventDefault()}} onChange={e=>setInput(e.target.value)}/><button type="submit" className="secondary" disabled={!input.trim()}>{c.check}</button></form></details>
   </>:<>
    <p className="sl-scenario-copy">{situationScenarios[situation.id][locale]}</p>
    <div className="sl-feedback" role="status">{comparison?.method==='typed'?<><p>{comparison.result?.outcome==='model-match'?c.match:c.compare}</p><p>{c.typedAttempt}: <span lang="zh-Hans">{input}</span></p></>:<p>{comparison?.method==='reveal'?c.assisted:c.self}</p>}{hint>0&&comparison?.method!=='reveal'&&<small>{c.assisted}</small>}</div>
    <p className="sl-phase">{c.model}</p><p className="chunk-translation">{situation.target.meaning[locale]}</p>{renderExample(situation.target)}
    <div className="course-actions">{comparison?.method==='spoken'?<><button type="button" className="primary" onClick={()=>next('self-check')}>{c.selfYes}</button><button type="button" className="secondary" onClick={()=>next('retry')}>{c.selfRetry}</button></>:<button type="button" className="primary" onClick={()=>next()}>{c.next}<ArrowRight size={17}/></button>}</div>
   </>}
  </section>}
 </div>;
}
