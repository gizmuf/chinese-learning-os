'use client';
import {useMemo,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {ArrowLeft,Maximize2,Minimize2,Volume2} from 'lucide-react';
import type {CloudWord,CloudLevel} from './atlas-cloud-model';
import type {Locale} from './translate';
import {WordFamilyBoard,type FamilyBoardCopy} from './word-family-board';
import {SharedText} from './word-family-text';
import {familyContrastPairs,familyRecallRound,familyRecallResult,retryFamilyMistakes,type ContrastPair,type RecallResult} from './family-practice-lab-model';
import {familyLabCopy} from './family-practice-lab-copy';
import './family-practice-lab.css';
type Props={words:CloudWord[];anchor:string;scope:CloudLevel;locale:Locale;boardCopy:FamilyBoardCopy;selected?:CloudWord;onChoose:(word:CloudWord)=>void;details:(word:CloudWord)=>ReactNode;listen:(word:CloudWord)=>void;silence:()=>void;columnStyle:CSSProperties;expanded:boolean;onExpand:()=>void;onBack:()=>void};
export default function FamilyPracticeLab(p:Props){
 const c=familyLabCopy[p.locale],pairs=useMemo(()=>familyContrastPairs(p.words,p.anchor),[p.words,p.anchor]);
 const initial=useMemo(()=>familyRecallRound(pairs),[pairs]);
 const [stage,setStage]=useState(0),[round,setRound]=useState(initial),[results,setResults]=useState<RecallResult[]>([]),[answer,setAnswer]=useState(''),[feedback,setFeedback]=useState<RecallResult|null>(null),[assisted,setAssisted]=useState(false);
 const input=useRef<HTMLInputElement>(null),prompt=round[results.length],complete=results.length===round.length;
 function moveStage(next:number){p.silence();if(stage===2&&next!==2&&prompt&&!feedback)setAssisted(true);setStage(next)}
 function submit(reveal=false){if(!prompt||feedback)return;setFeedback(familyRecallResult(prompt,answer,assisted||reveal));p.silence()}
 function next(){if(!feedback)return;setResults([...results,feedback]);setFeedback(null);setAnswer('');setAssisted(false);p.silence();requestAnimationFrame(()=>input.current?.focus())}
 function restart(retry=false){p.silence();setRound(retry?retryFamilyMistakes(results):initial);setResults([]);setFeedback(null);setAnswer('');setAssisted(false)}
 function contrast(pair:ContrastPair){return <div className="fl-contrast" key={pair.place.id}>{([['place',pair.place],['person',pair.person]] as const).map(([role,word])=><div className="fl-contrast-word" key={word.id}><small>{c[role]}</small><strong className="fl-contrast-hanzi" lang="zh-Hans">{role==='person'?<><SharedText text={word.hanzi.slice(0,-1)} anchor={p.anchor}/><span className="fl-changed">{word.hanzi.slice(-1)}</span></>:<SharedText text={word.hanzi} anchor={p.anchor}/>}</strong><span className="wf-reading">{word.pinyin}</span><span className="wf-meaning">{word.meaning}</span><button type="button" className="fl-audio" aria-label={p.boardCopy.word+' · '+word.hanzi} onClick={()=>p.listen(word)}><Volume2 size={16}/></button></div>)}</div>}
 return <section className="word-family-lab family-practice-lab" style={p.columnStyle} aria-labelledby="fl-title">
  <header className="wf-heading"><div><p className="wf-kicker">{c.local}</p><h2 id="fl-title">{c.title}</h2></div><button type="button" onClick={p.onExpand} aria-label={p.expanded?c.collapse:c.expand}>{p.expanded?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button></header>
  <div className="fl-context"><button type="button" className="fl-back" onClick={p.onBack}><ArrowLeft size={15}/>{c.back}</button><span>{p.anchor} · {p.words.length} {c.words} · {p.scope==='all'?'HSK 1–3 + Atlas':`HSK ${p.scope===1?'1':'1–'+p.scope}`}</span></div>
  <nav className="fl-steps" aria-label={c.title}>{[c.explore,c.spot,c.recall].map((label,i)=><button type="button" key={i} aria-current={stage===i?'step':undefined} onClick={()=>moveStage(i)}><small>{i+1}</small>{label}</button>)}</nav>
  {stage===0?<><WordFamilyBoard words={p.words} anchor={p.anchor} selectedId={p.selected?.id} onChoose={p.onChoose} copy={p.boardCopy}/>{p.selected&&p.details(p.selected)}<div className="fl-actions"><button type="button" onClick={()=>moveStage(1)}>{c.continue} →</button></div></>:!pairs.length?<p className="wf-empty">{c.empty}</p>:stage===1?<><p className="fl-guide">{c.compare}</p>{pairs.map(contrast)}<p className="wf-note"><span className="fl-changed">生</span> · {c.change}</p><div className="fl-actions"><button type="button" onClick={()=>moveStage(2)}>{c.continue} →</button></div></>:complete?<section className="fl-complete" aria-live="polite"><h3>{c.done}</h3><p>{c.score}: {results.filter(r=>r.correct).length} / {round.length}</p><p>{c.reveals}: {results.filter(r=>r.assisted).length} · {c.mistakes}: {retryFamilyMistakes(results).length}</p><div className="fl-actions">{retryFamilyMistakes(results).length>0&&<button type="button" onClick={()=>restart(true)}>{c.retry}</button>}<button type="button" onClick={()=>restart()}>{c.restart}</button></div></section>:<section className="fl-recall" data-study-assessment={feedback?'supported':'blocked'}>
   <p className="wf-count">{c.position} {results.length+1} {c.of} {round.length}</p>
   <h3>{c.cue}</h3><p className="fl-cue">{prompt.word.meaning}</p>
   {!feedback?<form onSubmit={e=>{e.preventDefault();submit()}}><label htmlFor="fl-answer">{c.input}</label><input id="fl-answer" ref={input} value={answer} onChange={e=>setAnswer(e.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} aria-describedby="fl-format"/><small id="fl-format">{c.hanzi}</small><div className="fl-actions"><button type="submit" disabled={!answer.trim()}>{c.check}</button><button type="button" onClick={()=>submit(true)}>{c.show}</button></div></form>:<div className="fl-feedback" role="status"><p>{feedback.assisted?c.assisted:feedback.correct?c.correct:c.incorrect}</p>{contrast(prompt.pair)}<div className="fl-actions"><button type="button" onClick={next}>{c.next} →</button></div></div>}
  </section>}
 </section>;
}
