'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ExternalLink,PenLine} from 'lucide-react';
import {companion,canonicalTerm,companionAtlasLinks,claimCompanion,changeCompanion,saveCompanion,type CompanionDraft} from './shuoshuo-companion-model';
import SharedWriting from './shared-writing';
import {StudyText} from './study-lookup';
import {stopAudio} from './audio';
import './shuoshuo-companion.css';

export default function ShuoshuoCompanion({owner,db,notify,onBack}:{owner:string|null;db:IDBDatabase|null;notify:(message:string)=>void;onBack:()=>void}){
  const [state,setState]=useState<CompanionDraft|null>(null),current=useRef<CompanionDraft|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const alive=useRef(false),epoch=useRef(0),tail=useRef(Promise.resolve()),pending=useRef(0);
  const store=db?.name==='chinese-os-v1-'+(owner??'guest')?db:null;
  useEffect(()=>{
    const token=++epoch.current;alive.current=true;current.current=null;setState(null);setBusy(false);setError('');
    if(store)void claimCompanion(store,crypto.randomUUID()).then(saved=>{if(alive.current&&token===epoch.current){current.current=saved;setState(saved);}}).catch(()=>{if(alive.current&&token===epoch.current)setError('Could not open saved practice. Reload to retry.');});
    return()=>{alive.current=false;stopAudio();};
  },[store]);
  const update=useCallback((change:(state:CompanionDraft)=>CompanionDraft)=>{
    const token=epoch.current;pending.current++;setBusy(true);
    const task=tail.current.then(async()=>{
      const before=current.current;
      if(!alive.current||token!==epoch.current||!store||!before)throw Error('Practice notebook changed');
      const saved=await saveCompanion(store,before,change(before));
      if(alive.current&&token===epoch.current){current.current=saved;setState(saved);setError('');}
    });
    tail.current=task.catch(e=>{if(alive.current&&token===epoch.current){setError(e instanceof Error?e.message:'Could not save practice.');notify('Could not save practice. Keep this exercise open and retry.');}}).finally(()=>{pending.current--;if(alive.current&&token===epoch.current)setBusy(pending.current>0);});
    return task;
  },[store,notify]);
  if(!state)return <section className="shuoshuo-companion" role="status">{error||'Opening saved vocabulary practice…'}</section>;
  const term=companion.terms[state.index],phase=state.phases[state.index],writing=state.writing===null?null:companion.terms[state.writing];
  const writeItem=writing?canonicalTerm(writing):undefined;
  const patch=(change:(s:CompanionDraft)=>CompanionDraft)=>{void update(change);};
  const move=(delta:number)=>patch(s=>changeCompanion(s,{index:s.index+delta}));
  return <section className="shuoshuo-companion" aria-label="Shuoshuo vocabulary companion">
    <button className="text-button" disabled={busy} onClick={()=>{stopAudio();onBack();}}><ArrowLeft size={16}/>Back to study</button>
    <header className="sc-heading"><p className="eyebrow">INDEPENDENT STUDY COMPANION</p><h1>{companion.title}</h1><p>{companion.scope}</p><span className="pill">Ungraded rehearsal · saved on this device</span></header>
    <aside className="sc-source"><p>Based on a small vocabulary selection in Baolingo’s text associated with the video by <strong>{companion.source.authorName}</strong>. The selection was not checked against the audio. No partnership or sponsorship is claimed.</p><div><a href={companion.source.videoUrl} target="_blank" rel="noopener noreferrer">Watch the official video<ExternalLink size={15}/></a><a href={companion.source.textEvidenceUrl} target="_blank" rel="noopener noreferrer">Vocabulary text source<ExternalLink size={15}/></a></div><p>This is limited vocabulary practice, not a full sentence-listening lesson. Examples below are original ChineseOS exercises, not the creator’s words or quotations. No new recordings are included.</p></aside>
    {error&&<p role="alert" className="sc-error">{error}</p>}
    <div hidden={!!writing} className="sc-reader" aria-busy={busy}>
      <nav className="sc-word-nav" aria-label="Ten selected words">{companion.terms.map((word,i)=><button key={word.id} disabled={busy} aria-current={i===state.index?'step':undefined} onClick={()=>patch(s=>changeCompanion(s,{index:i}))}><span>{i+1}</span>{word.hanzi}</button>)}</nav>
      <article className="sc-card"><header><span>Word {state.index+1} / {companion.terms.length}</span><span>{canonicalTerm(term)?'Already in ChineseOS vocabulary':'Lesson-only vocabulary'}</span></header>
        <div className="sc-target" lang="zh-Hans">{term.hanzi}</div>
        {phase>=2&&<p className="sc-pinyin">{term.pinyin}</p>}
        {phase>=3&&<><h2>{term.english}</h2>{'usageNote' in term&&<p className="sc-usage">{term.usageNote}</p>}</>}
        {phase===3&&<button className="text-button" disabled={busy} onClick={()=>patch(s=>changeCompanion(s,{phases:s.phases.map((p,i)=>i===s.index?1:p)}))}>Try this word again</button>}
        {phase<3?<button className="primary" disabled={busy} onClick={()=>patch(s=>changeCompanion(s,{phases:s.phases.map((p,i)=>i===s.index?(p===1?2:3):p)}))}>{phase===1?'Show pinyin':'Show English meaning'}<ArrowRight size={16}/></button>:<p className="sc-status">Meaning shown · no grade or scheduled-review credit</p>}
        <footer><button className="secondary" disabled={busy||state.index===0} onClick={()=>move(-1)}><ArrowLeft size={16}/>Previous</button><button className="secondary" disabled={busy||state.index===companion.terms.length-1} onClick={()=>move(1)}>Next<ArrowRight size={16}/></button></footer>
      </article>
      {phase===3&&<section className="sc-example"><p className="eyebrow">ORIGINAL CHINESEOS PRACTICE EXAMPLE · NOT A VIDEO QUOTE</p><div lang="zh-Hans"><StudyText text={term.example.hanzi}/></div><p className="sc-pinyin">{term.example.pinyin}</p><p>{term.example.english}</p></section>}
      <div className="sc-actions"><button className="secondary" disabled={busy} onClick={()=>patch(s=>changeCompanion(s,{writing:s.index}))}><PenLine size={16}/>Write {term.hanzi}</button>{companionAtlasLinks(term).map(link=><a key={link.hanzi} href={link.href} target="_blank" rel="noopener noreferrer">Atlas character · {link.hanzi}<ExternalLink size={14}/></a>)}</div>
      <p className="sc-note">Reading, revealing and this supported writing practice do not change your review schedule. Six phrases are lesson-only vocabulary; they are not replaced by shorter words or added as scored cards.</p>
    </div>
    {writing&&<section className="sc-writing" aria-label="Companion writing"><button className="secondary" disabled={busy} onClick={()=>patch(s=>changeCompanion(s,{writing:null}))}><ArrowLeft size={16}/>Back to vocabulary</button><p>Supported, ungraded writing for the complete expression. Drafts and practice saves stay on this device; no scheduled-review credit is awarded.</p>{state.written[state.writing!]&&<p role="status">Writing practice saved locally · ungraded</p>}<SharedWriting key={writing.id} hanzi={writing.hanzi} item={writeItem} pinyin={writing.pinyin} meaning={writing.english} audio={{}} initialMode={state.writingModes[state.writing!]} onModeChange={mode=>patch(s=>changeCompanion(s,{writingModes:s.writingModes.map((m,i)=>i===s.writing?mode:m)}))} onSave={()=>update(s=>{if(s.writing!==state.writing)throw Error('Writing exercise changed');return changeCompanion(s,{written:s.written.map((done,i)=>i===state.writing?true:done)});})} onBack={()=>patch(s=>changeCompanion(s,{writing:null}))}/></section>}
  </section>;
}
