'use client';
import {lazy,Suspense,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Menu,MessageCircle,PenLine,Sparkles,Volume2,X} from 'lucide-react';
import {items,type Item} from './content';
import {localizeItem} from './translate';
import {useI18n} from './i18n';
import {speak,stopAudio} from './audio';
import {StudyText} from './study-lookup';
import {studyExamples} from './study-examples';
import SharedWriting from './shared-writing';
import RecognitionReview from './recognition-review';
import {useAtlasProgress} from './atlas-store';
import {readCloudRoute,cloudRouteHref} from './atlas-cloud-route';
import type {LearningEvent} from './learning';
import {applyStudioCommand,backStudio,claimStudio,dayItemIds,fixtureCommand,studioFixtures,visitStudio,writeStudio,type StudioCheckpoint,type StudioPane} from './study-studio-model';
import './study-studio.css';
const AtlasCloud=lazy(()=>import('./atlas-cloud'));
const paneNames:Record<StudioPane,string>={atlas:'Character atlas',writing:'Writing',vocabulary:'Vocabulary',cards:'Flashcards',day:'My day'};
type Props={owner:string|null;db:IDBDatabase|null;penOnly:boolean;setPenOnly:(value:boolean)=>void;notify:(message:string)=>void;record:(event:LearningEvent)=>Promise<void>;onExit:()=>void;onMyDay?:()=>void;onCompanion?:()=>void;onPrivate?:()=>void;onShuoshuoLesson?:()=>void;menuOpen:boolean;onMenu:()=>void};

/** Additive workspace: all learning and ink still belong to the existing modules. */
export default function StudyStudio({owner,db,penOnly,setPenOnly,notify,record,onExit,onMyDay,onCompanion,onPrivate,onShuoshuoLesson,menuOpen,onMenu}:Props){
  const {locale}=useI18n();
  const progress=useAtlasProgress(owner);
  const [state,setState]=useState<StudioCheckpoint|null>(null),current=useRef<StudioCheckpoint|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[open,setOpen]=useState(false),[prompt,setPrompt]=useState(''),[reply,setReply]=useState('Choose a suggested command to connect your study tools.');
  const [atlasAssessment,setAtlasAssessment]=useState(false);
  const [writerVisited,setWriterVisited]=useState(false),[atlasVisited,setAtlasVisited]=useState(false);
  const generation=useRef(0),alive=useRef(false),tasks=useRef(Promise.resolve()),pending=useRef(0);
  useEffect(()=>{
    const token=++generation.current;alive.current=true;current.current=null;setState(null);
    if(db)void claimStudio(db,crypto.randomUUID()).then(checkpoint=>{
      if(!alive.current||token!==generation.current)return;current.current=checkpoint;setState(checkpoint);
      setWriterVisited(checkpoint.pane==='writing');setAtlasVisited(checkpoint.pane==='atlas');
    }).catch(()=>{if(alive.current)setError('Could not open your saved workspace. Reload to retry.');});
    return()=>{alive.current=false;stopAudio();};
  },[db]);
  const dispatch=useCallback((change:(previous:StudioCheckpoint)=>StudioCheckpoint)=>{
    const token=generation.current;pending.current++;setBusy(true);
    tasks.current=tasks.current.then(async()=>{
      const previous=current.current;
      if(!alive.current||token!==generation.current||!db||!previous)return;
      const next=change(previous);if(next===previous)return;
      const saved=await writeStudio(db,previous,next);
      if(!alive.current||token!==generation.current)return;
      current.current=saved;setState(saved);setError('');
      if(saved.pane==='writing')setWriterVisited(true);
      if(saved.pane==='atlas')setAtlasVisited(true);
    }).catch(e=>{if(alive.current){setError(e instanceof Error?e.message:'Could not save this workspace.');notify('Could not save your workspace. Your current exercise is still here.');}})
      .finally(()=>{pending.current--;if(alive.current)setBusy(pending.current>0);});
    return tasks.current;
  },[db,notify]);
  const atlasRoute=useMemo(()=>readCloudRoute(state?.atlasQuery??''),[state?.atlasQuery]);
  const atlasRouteChange=useCallback((route:ReturnType<typeof readCloudRoute>)=>{void dispatch(s=>({...s,atlasQuery:cloudRouteHref(route)}));},[dispatch]);
  const embedded=useMemo(()=>({route:atlasRoute,onRoute:atlasRouteChange,onAssessmentChange:setAtlasAssessment}),[atlasRoute,atlasRouteChange]);
  const localized=useMemo(()=>items.map(item=>localizeItem(item,locale)),[locale]);
  const item=localized.find(item=>item.id===state?.itemId);
  function command(text:string){
    if(atlasAssessment)return;
    const input=fixtureCommand(text,crypto.randomUUID());
    if(!input){setReply('These are example commands, without live AI. Choose one of the suggestions below.');return;}
    void dispatch(s=>applyStudioCommand(s,input,crypto.randomUUID()));
    setReply(input.tool==='flashcards.open'?'Selected words use extra practice. Your independent review schedule stays unchanged.':input.tool==='atlas.open'?'Explore the real Atlas. Shared shapes are not automatically shared meanings or sounds.':input.tool==='writing.open'?'Watch, trace, copy, then write from memory. Your drawing stays saved when you leave.':'Using the existing course vocabulary and authored examples.');
    setPrompt('');
  }
  function navigate(pane:StudioPane){
    if(atlasAssessment)return;
    stopAudio();
    if(pane==='cards'){command('Practise flashcards');return;}
    void dispatch(s=>visitStudio(s,{pane}));
  }
  function write(item:Item){if(!atlasAssessment)void dispatch(s=>visitStudio(s,{pane:'writing',itemId:item.id,mode:'watch'}));}
  if(!state||!item)return <section className="studio-loading" role="status">{error||'Opening your saved study workspace…'}</section>;
  const examples=studyExamples(item.hanzi,locale,3);
  const selected=state.selected.map(id=>localized.find(item=>item.id===id)!);
  const reviewQueue=state.review?.itemIds.map(id=>localized.find(item=>item.id===id)!)??[];
  return <section className="study-studio" aria-label="StudyStudio">
    <div className="ss-toolbar">
      <button onClick={onMenu} aria-expanded={menuOpen} aria-label="Toggle study menu"><Menu size={18}/></button>
      <button disabled={busy||atlasAssessment||!state.trail.length} onClick={()=>{stopAudio();void dispatch(backStudio);}}><ArrowLeft size={15}/>Back</button>
      <span>StudyStudio</span>
      <button disabled={busy||atlasAssessment} className="ss-exit" onClick={onExit}><X size={16}/>Close</button>
    </div>
    {error&&<p className="ss-error" role="alert">{error}</p>}
    <div className="ss-heading"><div><p className="ss-eyebrow">A CONNECTED WAY TO LEARN</p><h1>One connection at a time.</h1><p>Your atlas, writing and words, together.</p></div>
      <button className="ss-companion-toggle" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="ss-companion"><MessageCircle size={17}/>Study companion</button></div>
    {onMyDay&&<button className="ss-personal-lesson" onClick={onMyDay} disabled={busy||atlasAssessment}><BookOpen size={16}/>My day · Day 01 V2 · Open lesson<ArrowRight size={15}/></button>}
    {onShuoshuoLesson&&<button className="ss-personal-lesson" onClick={onShuoshuoLesson} disabled={busy||atlasAssessment}><BookOpen size={16}/>A morning with Shuoshuo · Full lesson · 42 groups<ArrowRight size={15}/></button>}
    <nav className="ss-tabs" aria-label="StudyStudio tools">{(Object.keys(paneNames) as StudioPane[]).map(pane=><button key={pane} aria-current={state.pane===pane?'page':undefined} disabled={busy||atlasAssessment} onClick={()=>navigate(pane)}>{paneNames[pane]}</button>)}</nav>
    {atlasAssessment&&<p className="ss-assessment-note" role="status">Atlas quiz in progress. Finish or cancel it in the Atlas before opening another tool.</p>}
    <div className={'ss-workspace'+(open?' ss-with-companion':'')}>
      <div className="ss-main" aria-busy={busy}>
        {atlasVisited&&<div hidden={state.pane!=='atlas'} className="ss-atlas"><Suspense fallback={<p role="status">Opening Atlas…</p>}><AtlasCloud owner={owner} db={db} penOnly={penOnly} setPenOnly={setPenOnly} notify={notify} progress={progress} onWord={write} embedded={embedded}/></Suspense></div>}
        {writerVisited&&<div hidden={state.pane!=='writing'} className="ss-panel ss-writing"><SharedWriting key={item.id} hanzi={item.hanzi} item={item} initialMode={state.mode} onModeChange={mode=>{void dispatch(s=>({...s,mode}));}} onBack={()=>{void dispatch(backStudio);}}/></div>}
        <div hidden={state.pane!=='vocabulary'} className="ss-panel"><header><BookOpen size={19}/><h2>Your practice words</h2><span>{selected.length} selected</span></header>
          <div className="ss-word-list">{localized.filter(i=>dayItemIds.includes(i.id)).map(word=><div className="ss-word" key={word.id}><label><input type="checkbox" disabled={busy} checked={state.selected.includes(word.id)} onChange={e=>{const checked=e.target.checked;void dispatch(s=>({...s,selected:checked?[...s.selected,word.id]:s.selected.filter(id=>id!==word.id)}));}}/><span lang="zh-Hans"><StudyText text={word.hanzi} whole/></span><span><b>{word.pinyin}</b><small>{word.english}</small></span></label><button onClick={()=>write(word)} aria-label={'Write '+word.hanzi}><PenLine size={17}/></button></div>)}</div>
          <div className="ss-panel-foot"><p>Saved in this notebook. Extra practice uses the existing flashcard system.</p><button disabled={busy||!selected.length} className="primary" onClick={()=>{
            const action={tool:'flashcards.open',actionId:crypto.randomUUID()};
            void dispatch(s=>applyStudioCommand({...s,review:null},action,crypto.randomUUID()));
          }}>Practice selected words<ArrowRight size={16}/></button></div>
        </div>
        {state.review&&<div hidden={state.pane!=='cards'} className="ss-cards"><RecognitionReview key={state.review.id} db={db} runId={state.review.id} queue={reviewQueue} practice record={record} notify={notify} onPosition={()=>{}} onWrite={write}/></div>}
        <div hidden={state.pane!=='day'} className="ss-panel ss-day"><header><h2>From home to school, and back</h2><span>Existing lesson examples</span></header>
          {dayItemIds.map(id=>localized.find(i=>i.id===id)!).map(word=><article key={word.id}><p className="ss-eyebrow">{word.english}</p><div lang="zh-Hans" className="ss-sentence"><StudyText text={word.sentence}/></div><p>{word.sentencePinyin}</p><p>{word.translation}</p><div className="ss-row-actions"><button onClick={()=>speak(word.sentence,notify,word)}><Volume2 size={16}/>Listen</button><button onClick={()=>write(word)}><PenLine size={16}/>Write {word.hanzi}</button></div></article>)}
        </div>
        {state.pane==='writing'&&state.mode!=='recall'&&<div className="ss-examples">{examples.map(example=><article key={example.id}><div lang="zh-Hans"><StudyText text={example.text}/></div><p>{example.pinyin}</p><p>{example.meaning}</p></article>)}</div>}
      </div>
      {open&&<aside className="ss-companion" id="ss-companion" aria-label="Study companion" onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.stopPropagation();}}}>
        <header><Sparkles size={18}/><strong>Study companion</strong><button aria-label="Close companion" onClick={()=>setOpen(false)}><X size={18}/></button></header>
        <p className="ss-context">Working in <b>{paneNames[state.pane]}</b></p>
        <div className="ss-companion-body"><p role="status">{atlasAssessment?'Focus on your quiz. Study commands are paused until you finish or cancel it.':reply}</p>
          <div className="ss-suggestions">{studioFixtures.map(f=><button key={f.label} disabled={busy||atlasAssessment} onClick={()=>command(f.label)}>{f.label}<ArrowRight size={14}/></button>)}</div></div>
        <form onSubmit={e=>{e.preventDefault();command(prompt);}}><input value={prompt} onChange={e=>setPrompt(e.target.value)} aria-label="Example study command" placeholder="Choose or type an example command" maxLength={160}/><button disabled={busy||atlasAssessment||!prompt.trim()} aria-label="Run example command"><ArrowRight size={17}/></button></form>
        <small>Example commands · no live AI connected</small>
      </aside>}
    </div>
  </section>;
}
