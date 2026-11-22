'use client';

import {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, BookOpen, Layers, Volume2} from 'lucide-react';
import {playRecording, stopAudio} from './audio';
import {useI18n} from './i18n';
import {readDraft, storageTransaction} from './local-store';
import {StudyText} from './study-lookup-context';
import SharedWriting from './shared-writing';
import {hanziSprintCopy} from './hanzi-sprint-copy';
import {sprintAtlas, sprintStories} from './hanzi-sprint-stories';
import {
 dailySprintPlan, diagnosticQueue, difficultSprintCharacters, freshSprint, lessonDays, recallSprintCharacter,
 restoreSprint, reviewSprintQueue, sprintByHanzi, sprintCatalog, sprintDay, sprintDays, sprintGroups, sprintKey, writeSprintRecord,
 type Recall, type SprintCharacter, type SprintExample, type SprintState,
} from './hanzi-sprint-model';
import './hanzi-sprint.css';

const tabs = ['entry','families','review','sentences','writing','story'] as const;
type Tab = typeof tabs[number];
const batchSize = 50;

function RecallCard({character, onRate}: {character:SprintCharacter; onRate:(result:Recall)=>void}) {
 const {locale}=useI18n(),c=hanziSprintCopy[locale];
 const [phase,setPhase]=useState(0);
 const meaning=character.meanings?.[locale];
 const ratings=[['both',true,true],['meaningOnly',true,false],['toneOnly',false,true],['neither',false,false]] as const;
 return <div className="hsprint-flash">
  <button type="button" className="hsprint-card" onClick={()=>setPhase(n=>Math.min(2,n+1))} disabled={phase===2}>
   <strong lang="zh-Hans">{character.hanzi}</strong>
   <span className="hsprint-pinyin">{phase>=1&&character.pinyin}</span>
   <span className="hsprint-answer">{phase>=2&&<>{!meaning&&locale!=='en'&&<small>{c.english}</small>}<span lang={meaning?locale:'en'}>{meaning??character.meaning}</span></>}</span>
   <small>{phase===0?c.revealPinyin:phase===1?c.revealMeaning:c.checked}</small>
  </button>
  {phase===2&&<div className="hsprint-actions" role="group" aria-label={c.checked}>
   {ratings.map(([label,meaning,reading])=><button className="secondary" type="button" key={label}
    onClick={()=>onRate({meaning,reading})}>{c[label]}</button>)}
  </div>}
 </div>;
}

function ContextExample({example, notify, listening = false}: {example:SprintExample; notify:(message:string)=>void; listening?:boolean}) {
 const {locale}=useI18n(),c=hanziSprintCopy[locale];
 const [revealed,setRevealed]=useState(!listening);
 return <div className="hsprint-context">
  {example.audio&&<button type="button" className="secondary" onClick={()=>playRecording(example.audio!,notify)}><Volume2 size={17}/> {c.listen}</button>}
  {revealed ? <>
   <p lang="zh-Hans" className="hsprint-context-hanzi"><StudyText text={example.text} pinyin={example.pinyin}/></p>
   <p className="hsprint-pinyin">{example.pinyin}</p>
   <p lang={example.meaning[locale]?locale:'en'}>{example.meaning[locale]??example.meaning.en}</p>
   {!example.meaning[locale]&&<small>{c.english}</small>}
  </> : <button type="button" className="text-button" onClick={()=>setRevealed(true)}>{c.text}</button>}
 </div>;
}

export default function HanziSprint({db, notify}: {db:IDBDatabase|null; notify:(message:string)=>void}) {
 const {locale}=useI18n(),c=hanziSprintCopy[locale];
 const [state,setState]=useState(freshSprint),[ready,setReady]=useState(false),[saveError,setSaveError]=useState(false);
 const pending=useRef<(()=>Promise<void>)|null>(null), saving=useRef(false), round=useRef(0);
 const [loadAttempt,setLoadAttempt]=useState(0),[loadError,setLoadError]=useState(false);
 const [tab,setTab]=useState<Tab>('entry'),[day,setDay]=useState(1),[groupIndex,setGroupIndex]=useState(0);
 const [batch,setBatch]=useState<readonly SprintCharacter[]>([]),[index,setIndex]=useState(0);
 const [writing,setWriting]=useState(''),[context,setContext]=useState(''),[storyIndex,setStoryIndex]=useState(0);
 useEffect(()=>{
  if(!db)return;
  let active=true;
  void readDraft<SprintState>(db,sprintKey).then(saved=>{
   if(!active)return;
   const restored=restoreSprint(saved);
   setLoadError(false);
   setState(restored);
   setDay(sprintDay(restored,Date.now()));
   setTab(Object.keys(restored.records).length?'families':'entry');
   setReady(true);
  }).catch(()=>{if(active)setLoadError(true);});
  return()=>{active=false;};
 },[db,loadAttempt]);
 useEffect(()=>()=>stopAudio(),[]);
 async function update(change:(saved:SprintState)=>SprintState) {
  if(!db)throw Error(c.storage);
  const next=await storageTransaction<SprintState>(db,'drafts','readwrite',(store,result)=>{
   const request=store.get(sprintKey);
   request.onsuccess=()=>{
    const value=change(restoreSprint(request.result as SprintState|undefined));
    store.put(value,sprintKey);
    result(value);
   };
  });
  setState(next);
  setSaveError(false);
  return next;
 }
 async function commit(action:()=>Promise<void>) {
  if(saving.current)return;
  saving.current=true;
  try{
   await action();
   pending.current=null;
  }catch{
   pending.current=action;
   setSaveError(true);
  }finally{saving.current=false;}
 }
 function changeTab(next:Tab) {
  round.current++;
  setTab(next);
  setIndex(0);
  setBatch([]);
  setContext('');
  stopAudio();
 }
 function changeDay(next:number) {
  setDay(next);
  setGroupIndex(0);
  changeTab(next>lessonDays?'review':'families');
 }
 const now=Date.now(), isFinal=day>lessonDays;
 const today=dailySprintPlan(state)[day-1]??[];
 const groups=sprintGroups(today), activeGroup=groups[Math.min(groupIndex,groups.length-1)];
 const records=Object.values(state.records);
 const tested=records.filter(record=>record.baseline).length;
 const knownMeanings=records.filter(record=>(record.latest??record.baseline)?.meaning).length;
 const knownReadings=records.filter(record=>(record.latest??record.baseline)?.reading).length;
 const due=records.filter(record=>record.due!==undefined&&record.due<=now).length;
 const diagnostic=diagnosticQueue(state);
 const review=reviewSprintQueue(state,today,now,isFinal,day);
 const repeat=reviewSprintQueue(state,today,now,isFinal,day,true).filter(item=>state.records[item.hanzi]?.reviewedDay===day);
 const hard=difficultSprintCharacters(state);
 const written=records.filter(record=>record.written).length;
 const writingEntry=sprintByHanzi.get(writing)||hard[0];
 const contextualRows=(isFinal?sprintCatalog:today).filter(item=>item.sentence||item.word);
 const contextualEntry=contextualRows.find(item=>item.hanzi===context)??contextualRows.find(item=>item.sentence)??contextualRows[0];
 const stories=sprintStories(locale), activeStory=stories[storyIndex];
 const current=batch[index], complete=!!batch.length&&!current;
 function begin(queue:readonly SprintCharacter[]) {
  round.current++;
  setIndex(0);
  setBatch(queue.slice(0,batchSize));
 }
 function rate(result:Recall) {
  if(!current)return;
  const hanzi=current.hanzi, entry=tab==='entry', activeRound=round.current;
  void commit(async()=>{
   await update(saved=>recallSprintCharacter(saved,hanzi,result,Date.now(),entry,day));
   if(round.current===activeRound)setIndex(previous=>previous+1);
  });
 }
 function enterFamily() {
  void commit(async()=>{
   const next=state.started?state:await update(saved=>({...saved,started:saved.started||Date.now()}));
   changeDay(sprintDay(next,Date.now()));
  });
 }
 const questionQueue=tab==='entry'?diagnostic:review;
 return <section className="hsprint">
  <a className="text-button hsprint-back" href="/"><ArrowLeft size={16}/> {c.back}</a>
  <div className="page-heading"><div><h1>{c.title}<span className="orange">.</span></h1><p>{c.intro}</p></div></div>
  {!ready&&!loadError&&<p role="status">{c.loading}</p>}
  {loadError&&<div className="hsprint-error" role="alert">{c.storage} <button type="button" className="secondary" onClick={()=>setLoadAttempt(v=>v+1)}>{c.tryAgain}</button></div>}
  {saveError&&<div className="hsprint-error" role="alert">{c.storage}{db&&<button type="button" className="secondary" onClick={()=>{if(pending.current)void commit(pending.current);}}>{c.tryAgain}</button>}</div>}
  {ready&&<>
   <div className="hsprint-stats">
    <div><strong>{tested} / {sprintCatalog.length}</strong><span>{c.entry}</span></div>
    <div><strong>{knownMeanings}</strong><span>{c.meaning}</span></div>
    <div><strong>{knownReadings}</strong><span>{c.reading}</span></div>
    <div><strong>{due}</strong><span>{c.due}</span></div>
    <div><strong>{written}</strong><span>{c.written}</span></div>
   </div>
   <div className="hsprint-day">
    <label>{c.day} <select value={day} onChange={e=>changeDay(Number(e.target.value))}>
     {Array.from({length:sprintDays},(_,i)=><option value={i+1} key={i}>{i+1} / {sprintDays}{i+1===sprintDay(state,now)?' · '+c.today:''}</option>)}
    </select></label>
    <span>{isFinal?c.summary:today.length+' '+c.newHanzi.toLocaleLowerCase(locale)}</span>
    <button type="button" className="text-button" onClick={()=>changeDay(sprintDay(state,Date.now()))}>{c.today}</button>
   </div>
   <nav aria-label={c.title} className="hsprint-tabs">{tabs.map(key=><button key={key} type="button" className="secondary"
    aria-pressed={tab===key} onClick={()=>changeTab(key)}>{c[key]}</button>)}</nav>
   {(tab==='entry'||tab==='review')&&<section className="panel hsprint-panel">
    <h2>{c[tab]}</h2>
    <p>{tab==='entry'?c.entryHint:c.reviewHint}</p>
    <p>{tab==='entry'?c.scope:isFinal?c.finalHint:c.delay}</p>
    {current&&<>
     <p aria-live="polite">{index+1} / {batch.length}</p>
     <RecallCard key={current.hanzi} character={current} onRate={rate}/>
    </>}
    {!current&&<div className="hsprint-actions">
     {complete&&<strong role="status">{c.finish}</strong>}
     {questionQueue.length>0&&<button className="primary" type="button" onClick={()=>begin(questionQueue)}>
      <Layers size={16}/> {complete?c.more:tab==='entry'?c.check:c.review}<span> · {questionQueue.length}</span>
     </button>}
     {tab==='review'&&repeat.length>0&&<button type="button" className="secondary" onClick={()=>begin(repeat)}>{c.revise} · {repeat.length}</button>}
     {tab==='entry'&&<button type="button" className="secondary" onClick={enterFamily}>{state.started?c.skip:c.start}<ArrowRight size={16}/></button>}
     {tab==='review'&&!questionQueue.length&&!repeat.length&&<span>{c.empty}</span>}
    </div>}
   </section>}
   {tab==='families'&&<section className="panel hsprint-panel">
    <h2>{c.families}</h2>
    {activeGroup?<>
     <div className="hsprint-actions"><span>{activeGroup.clue==='sound'?c.sound:c.part} <b lang="zh-Hans">{activeGroup.part}</b></span>
      <button className="secondary" type="button" aria-label={c.families+' −'} disabled={groupIndex===0} onClick={()=>setGroupIndex(groupIndex-1)}><ArrowLeft size={16}/></button>
      <span>{Math.min(groupIndex+1,groups.length)} / {groups.length}</span>
      <button className="secondary" type="button" aria-label={c.families+' +'} disabled={groupIndex>=groups.length-1} onClick={()=>setGroupIndex(groupIndex+1)}><ArrowRight size={16}/></button>
     </div>
     <div className="hsprint-family">{activeGroup.members.map(item=><article key={item.hanzi}>
      <h3 lang="zh-Hans"><StudyText text={item.hanzi} whole/></h3>
      <p className="hsprint-pinyin">{item.pinyin}</p>
      <p lang={item.meanings?.[locale]?locale:'en'}>{item.meanings?.[locale]??item.meaning}</p>
      {!item.meanings?.[locale]&&locale!=='en'&&<small>{c.english}</small>}
      {item.word&&<p><span lang="zh-Hans"><StudyText text={item.word.text} pinyin={item.word.pinyin}/></span> · {item.word.pinyin} · {item.word.meaning[locale]??item.word.meaning.en}</p>}
      <div className="hsprint-actions">
       <button type="button" className="secondary" onClick={()=>{changeTab('sentences');setContext(item.hanzi);}}>{c.inUse}</button>
       <a className="text-button" href={sprintAtlas(item.hanzi,item.part)}>{c.atlas}</a>
      </div>
     </article>)}</div>
     <div className="hsprint-actions"><button className="primary" type="button" onClick={()=>changeTab('review')}>{c.review}<ArrowRight size={16}/></button></div>
    </>:<p>{c.empty}</p>}
   </section>}
   {tab==='sentences'&&<section className="panel hsprint-panel">
    <h2>{c.sentences}</h2><p>{c.sentenceCheck}</p>
    {contextualEntry&&<label className="hsprint-choice">{c.choose}
     <select value={contextualEntry.hanzi} onChange={e=>{stopAudio();setContext(e.target.value);}}>{contextualRows.map(item=>
      <option key={item.hanzi} value={item.hanzi}>{item.hanzi} · {item.pinyin}</option>)}</select>
    </label>}
    {contextualEntry?.sentence?<ContextExample key={contextualEntry.hanzi} example={contextualEntry.sentence} notify={notify} listening/>:
     contextualEntry?.word?<><p>{c.noAudio}</p><ContextExample key={contextualEntry.hanzi} example={contextualEntry.word} notify={notify}/></>:<p>{c.empty}</p>}
   </section>}
   {tab==='writing'&&<section className="panel hsprint-panel">
    <h2>{c.writing}</h2>
    {writingEntry ? <>
     <label className="hsprint-choice">{c.choose}<select value={writingEntry.hanzi} onChange={e=>setWriting(e.target.value)}>
      {!hard.includes(writingEntry)&&<option value={writingEntry.hanzi}>{writingEntry.pinyin}</option>}
      {hard.map(item=><option value={item.hanzi} key={item.hanzi}>{item.pinyin} · {item.meaning}</option>)}
     </select></label>
     <SharedWriting key={writingEntry.hanzi} hanzi={writingEntry.hanzi} pinyin={writingEntry.pinyin} meaning={writingEntry.meanings?.[locale]??writingEntry.meaning}
      initialMode="recall" notify={notify} onSave={async ()=>{
       setWriting(writingEntry.hanzi);
       await update(saved=>writeSprintRecord(saved,writingEntry.hanzi,{written:true},Date.now()));
       notify(c.saved);
      }}/>
    </>:<p>{c.empty}</p>}
   </section>}
   {tab==='story'&&<section className="panel hsprint-panel">
    <h2>{c.story}</h2><p>{c.storyHint}</p>
    <div className="hsprint-actions">{stories.map((story,i)=><button type="button" className="secondary" lang="zh-Hans" key={story.id}
     aria-pressed={i===storyIndex} onClick={()=>{stopAudio();setStoryIndex(i);}}>{story.target}</button>)}</div>
    {activeStory&&<>
     <h3 className="hsprint-story-target" lang="zh-Hans">{activeStory.target}</h3><p className="hsprint-pinyin">{activeStory.reading}</p><p>{activeStory.meaning}</p>
     <div className="hsprint-frames">{activeStory.frames.map(frame=><article key={frame.focus}>
      <strong lang="zh-Hans">{frame.focus}</strong>
      <p><b>{c.structure}</b> {frame.structure}</p><p><b>{c.mnemonic}</b> {frame.scene}</p>
     </article>)}</div>
     <ContextExample key={activeStory.id} example={{text:activeStory.example.hanzi,pinyin:activeStory.example.pinyin,
      meaning:{en:activeStory.example.english,[locale]:activeStory.translation},audio:activeStory.example.recording}} notify={notify}/>
     <div className="hsprint-actions"><a href={sprintAtlas(activeStory.target,activeStory.anchor,activeStory.kind==='word'?activeStory.wordId:undefined)} className="text-button"><BookOpen size={16}/> {c.atlas}</a>
      {activeStory.id==='crowded-subway'&&<a className="text-button" href={sprintAtlas('济','氵')}>{c.compare} <span lang="zh-Hans">挤 → 济</span></a>}
     </div>
    </>}
   </section>}
  </>}
 </section>;
}
