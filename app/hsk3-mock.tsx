'use client';

import { useEffect, useState } from 'react';
import { Clock3, Ear, ListChecks } from 'lucide-react';
import PinyinHandwriting from './pinyin-handwriting';
import { HskQuestionNavigation, useHskQuestionNavigation } from './hsk-question-navigation';
import { beginMock, finishMockSection, hasMockInk, mockSectionsFor, pictureLabel, scoreMockSection, syncMockClock, type Attempt, type MockSection, type MockTask } from './hsk3-mock-model';
import { type Stroke } from './learning';
import { StudyText } from './study-lookup-context';

import { hskFormStorageKey, type HskExamForm } from './hsk3-form';
import { automaticMistakes, hskMistakeReviewHref, mistakeSeed, type MistakeSeed } from './hsk3-mistakes-model';
import { saveExamMistakes } from './hsk3-mistakes-storage';
import './hsk3-practice.css';
const noInk:Stroke[]=[];

function reviewAnswer(task:MockTask) {
  if(task.kind==='choice') return task.pictures?pictureLabel(task.answer):task.answer;
  return task.example;
}

function MockResults({attempt,onReset,mockSections,form}:{attempt:Attempt;onReset:()=>void;mockSections:MockSection[];form:HskExamForm}) {
  const [busy,setBusy]=useState(false);
  const [saveError,setSaveError]=useState(false);
  const [added,setAdded]=useState<string[]>([]);
  const incorrect=automaticMistakes(form,attempt,mockSections.flatMap(section=>section.tasks));

  async function addToPractice(seeds:MistakeSeed[],open=false) {
    if(busy)return;
    setBusy(true);
    setSaveError(false);
    try {
      if(seeds.length) await saveExamMistakes(seeds);
      setAdded(current=>[...current,...seeds.map(seed=>seed.source)]);
      if(open) window.location.assign(hskMistakeReviewHref);
    } catch {
      setSaveError(true);
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel hsk3-prep-practice hsk3-mock" aria-labelledby="hsk-mock-results">
    <h2 id="hsk-mock-results">Mock exam results</h2>
    <p>Use the answer review to check handwritten work and open sentences. This practice score counts correct answers on automatically checked items.</p>
    <div className="hsk-practice-actions hsk-mistake-entry">
      <button type="button" className="primary" disabled={busy} onClick={()=>void addToPractice(incorrect,true)}>
        <ListChecks size={17} aria-hidden="true"/> Practise my mistakes
      </button>
      <span>{incorrect.length?incorrect.length+' incorrect '+(incorrect.length===1?'answer':'answers')+' to review':'You can add individual questions below.'}</span>
    </div>
    {saveError&&<p role="alert">Could not save these questions. Please try again.</p>}
    {mockSections.map(section=>{
      const {correct,automatic,review,answered}=scoreMockSection(section,attempt);
      return <details key={section.name} className="hsk-mock-review">
        <summary><strong>{section.name}</strong> · {correct}/{automatic} automatic
          {review>0&&<> · {review} to review</>} · {answered}/{section.tasks.length} answered</summary>
        <ol start={section.tasks[0].id+1}>
          {section.tasks.map(task=>{
            const answer=attempt.answers[task.id]?.trim();
            const ink=attempt.ink[task.id];
            const handwriting=hasMockInk(ink);
            const manual=task.kind==='sentence'||handwriting;
            const seed=mistakeSeed(form,attempt,task);
            const saved=added.includes(seed.source);
            return <li key={task.id}>
              <p lang={task.kind!=='choice'||task.passage||task.transcript?'zh-Hans':undefined}>{task.kind==='choice'?(task.passage??task.transcript):task.prompt}</p>
              {task.kind==='choice'&&task.passage&&!/^[A-Za-z]/.test(task.prompt)&&<p lang="zh-Hans">{task.prompt}</p>}
              {task.kind==='choice'&&task.audio&&<audio controls preload="none" src={task.audio} aria-label={`Review recording ${task.id+1}`}/>}
              <p>{answer||handwriting ? manual?'Self-review':answer===task.answer?'Correct':'Incorrect' : 'Unanswered'}</p>
              {answer&&<p>Your answer <span lang="zh-Hans">{task.kind==='choice'&&task.pictures?pictureLabel(answer):answer}</span></p>}
              {handwriting&&<PinyinHandwriting strokes={ink} onChange={()=>{}} penOnly disabled
                kind={task.kind==='character'?'hanzi':'pinyin'} label="Your handwritten answer"/>}
              <p>{task.kind==='sentence'?'Example':'Answer'} <span lang="zh-Hans">
                {task.kind==='character'&&<strong>{task.answer} · </strong>}<StudyText text={reviewAnswer(task)}/>
              </span></p>
              {task.kind==='sentence'&&<p>Check that you used the given word and wrote a complete, natural sentence.</p>}
              <button type="button" className="secondary hsk-mistake-save" disabled={busy||saved} onClick={()=>void addToPractice([seed])}>
                {saved?'Added to review':'Add question to review'}
              </button>
            </li>;
          })}
        </ol>
      </details>;
    })}
    <button type="button" className="secondary" onClick={onReset}>Retake mock exam</button>
  </section>;
}

function MockWriting({task,answer,ink,onAnswer,onInk}:{
  task:Extract<MockTask,{example:string}>;answer:string;ink:Stroke[];
  onAnswer:(value:string)=>void;onInk:(value:Stroke[])=>void;
}) {
  const [handwrite,setHandwrite]=useState(()=>hasMockInk(ink));
  const [penOnly,setPenOnly]=useState(false);
  return <>
    <div className="hsk3-prep-aids" role="group" aria-label="Writing method">
      <button type="button" className="secondary" aria-pressed={!handwrite} onClick={()=>setHandwrite(false)}>Chinese keyboard</button>
      <button type="button" className="secondary" aria-pressed={handwrite} onClick={()=>setHandwrite(true)}>Handwriting / Apple Pencil</button>
    </div>
    {handwrite?<div className="hsk-mock-writing">
      <div className="hsk-mock-writing-tools">
        <label><input type="checkbox" checked={penOnly} onChange={event=>setPenOnly(event.target.checked)}/> Pencil only</label>
        <button type="button" className="secondary" disabled={!ink.length} onClick={()=>onInk([])}>Clear ink</button>
      </div>
      <PinyinHandwriting strokes={ink} onChange={onInk} penOnly={penOnly}
        label={task.kind==='character'?'Write the missing Hanzi':'Write a Chinese sentence'}
        kind={task.kind==='character'?'hanzi':'pinyin'}/>
      <p className="hsk-mock-note">{answer?'A keyboard answer is currently saved. Writing here replaces it.':'Compare your handwriting with the answer after the exam.'}</p>
    </div>:<label className="hsk3-prep-input hsk-mock-writing">
      <span>{task.kind==='character'?'Type the missing Hanzi':'Type your Chinese sentence'}</span>
      {task.kind==='character'?<input lang="zh-Hans" autoComplete="off" spellCheck={false} value={answer} onChange={event=>onAnswer(event.target.value)}/>
        :<textarea lang="zh-Hans" rows={3} spellCheck={false} value={answer} onChange={event=>onAnswer(event.target.value)}/>}
      {hasMockInk(ink)&&<small>A handwritten answer is currently saved. Typing here replaces it.</small>}
    </label>}
  </>;
}

export default function Hsk3Mock({form='a'}:{form?:HskExamForm}) {
  const mockSections=mockSectionsFor(form);
  const storageKey=hskFormStorageKey('chinese-os:hsk3-mock:v1',form);
  const [attempt,setAttempt]=useState<Attempt|null>(null);
  const [ready,setReady]=useState(false);
  const [now,setNow]=useState(0);
  const [confirmFinish,setConfirmFinish]=useState(false);

  useEffect(()=>{
    const time=Date.now();
    try {
      const saved=localStorage.getItem(storageKey);
      if(saved) {
        const value=JSON.parse(saved) as Attempt;
        if(Number.isFinite(value.deadline)&&Number.isInteger(value.section)&&value.section>=0&&value.section<=mockSections.length&&
          Number.isInteger(value.position)&&value.position>=0&&value.position<(mockSections[value.section]?.tasks.length??1)&&value.answers&&value.ink) {
          setAttempt(syncMockClock(value,time));
        }
      }
    } catch { /* Continue with a new attempt if local storage is unavailable. */ }
    setNow(time);
    setReady(true);
  },[mockSections,storageKey]);
  useEffect(()=>{
    if(!ready) return;
    try {
      if(attempt) localStorage.setItem(storageKey,JSON.stringify(attempt));
      else localStorage.removeItem(storageKey);
    } catch { /* The current attempt remains usable in memory. */ }
  },[attempt,ready,storageKey]);
  const active=Boolean(attempt&&attempt.section<mockSections.length);
  useEffect(()=>{
    if(!active) return;
    function tick() {
      const time=Date.now();
      setNow(time);
      setAttempt(current=>current?syncMockClock(current,time):current);
    }
    tick();
    const timer=window.setInterval(tick,500);
    window.addEventListener('focus',tick);
    return ()=>{window.clearInterval(timer);window.removeEventListener('focus',tick);};
  },[active]);

  const section=attempt?mockSections[attempt.section]:undefined;
  const task=section?.tasks[attempt?.position??0];
  useEffect(()=>setConfirmFinish(false),[attempt?.section,attempt?.position]);

  function update(change:(current:Attempt)=>Attempt) {
    const time=Date.now();
    setNow(time);
    setAttempt(current=>{
      if(!current) return current;
      const latest=syncMockClock(current,time);
      return latest===current?change(current):latest;
    });
  }
  function move(position:number) {
    if(!section||position<0||position>=section.tasks.length) return false;
    update(current=>({...current,position}));
    return true;
  }
  const swipe=useHskQuestionNavigation(step=>move((attempt?.position??0)+step));

  if(!ready) return <p role="status">Loading mock exam…</p>;
  if(!attempt) return <section className="panel hsk3-prep-practice hsk3-mock" aria-labelledby="hsk-mock-start">
    <h2 id="hsk-mock-start">Full HSK 3.0 mock exam</h2>
    <p>70 original questions in 73 minutes of exam time. Use headphones and prepare a Chinese keyboard or Apple Pencil for writing.</p>
    <ul className="hsk-mock-sections">
      {mockSections.map(({name,duration,tasks})=><li key={name}><strong>{name}</strong><span>{tasks.length} questions · {duration/60_000} min</span></li>)}
    </ul>
    <p>The clock continues when you leave this tab. You can revisit questions within the current section. Play the listening clips from each question.</p>
    <button type="button" className="primary" onClick={()=>{const time=Date.now();setNow(time);setAttempt(beginMock(time));}}>Start timed exam</button>
  </section>;
  if(!section||!task) return <MockResults attempt={attempt} mockSections={mockSections} form={form} onReset={()=>setAttempt(null)}/>;

  const seconds=Math.max(0,Math.ceil((attempt.deadline-now)/1000));
  const clock=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  const answered=scoreMockSection(section,attempt).answered;
  const finishLabel=attempt.section===mockSections.length-1?'Finish exam':'Finish section';
  const answer=attempt.answers[task.id]??'';
  const ink=attempt.ink[task.id]??noInk;
  const choose=(value:string)=>update(current=>({
    ...current,answers:{...current.answers,[task.id]:value},ink:{...current.ink,[task.id]:noInk},
  }));
  const write=(value:Stroke[])=>update(current=>({
    ...current,ink:{...current.ink,[task.id]:value},answers:{...current.answers,[task.id]:''},
  }));

  return <section className="panel hsk3-prep-practice hsk3-mock" aria-labelledby="hsk-mock-active">
    <div className="hsk-mock-status">
      <div><p className="eyebrow">Section {attempt.section+1} of {mockSections.length}</p><h2 id="hsk-mock-active">{section.name}</h2></div>
      <div className="hsk-mock-timer" role="timer" aria-label="Time left" data-low={seconds<60}><Clock3 size={18} aria-hidden="true"/> {clock}</div>
    </div>
    <HskQuestionNavigation position={attempt.position} total={section.tasks.length} onMove={move}/>
    <div className="hsk-mock-swipe" {...swipe}>
      {task.kind==='choice'&&task.passage&&<p className="hsk3-prep-question" lang="zh-Hans">{task.passage}</p>}
      <p className={task.kind==='choice'&&/^[A-Za-z]/.test(task.prompt)?'hsk-mock-note':'hsk3-prep-question'}
        lang={task.kind==='choice'&&/^[A-Za-z]/.test(task.prompt)?undefined:'zh-Hans'}>{task.prompt}</p>
      {task.kind==='choice'&&task.audio&&<div className="hsk3-prep-player">
        <Ear size={19} aria-hidden="true"/><audio key={task.id} controls preload="none" src={task.audio} aria-label={`Recording ${attempt.position+1}`}/>
      </div>}
      {task.kind==='choice'&&<fieldset className="hsk3-prep-options hsk-mock-options" data-pictures={task.pictures}>
        <legend className="sr-only">Your answer</legend>
        {task.options.map((option,index)=><label key={option} data-selected={option===answer}>
          <input type="radio" name="mock-answer" checked={option===answer} onChange={()=>choose(option)} aria-label={task.pictures?pictureLabel(option):undefined}/>
          <span className="hsk-mock-option-letter" aria-hidden="true">{String.fromCharCode(65+index)}</span>
          <span lang="zh-Hans" aria-hidden={task.pictures?true:undefined}>{option}</span>
        </label>)}
      </fieldset>}
    </div>
    {task.kind!=='choice'&&<MockWriting key={task.id} task={task} answer={answer} ink={ink} onAnswer={choose} onInk={write}/>}
    <div className="hsk-mock-footer">
      <span>{answered} / {section.tasks.length} answered</span>
      <button type="button" className="secondary" onClick={()=>{
        if(answered<section.tasks.length&&!confirmFinish) {setConfirmFinish(true);return;}
        update(current=>finishMockSection(current,Date.now()));
      }}>{confirmFinish?'Submit with unanswered questions':finishLabel}</button>
      {confirmFinish&&<button type="button" className="secondary" onClick={()=>setConfirmFinish(false)}>Keep working</button>}
    </div>
  </section>;
}
