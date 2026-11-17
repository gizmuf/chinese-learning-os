'use client';

import { useEffect, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { StudyText } from './study-lookup-context';
import PinyinHandwriting from './pinyin-handwriting';
import { practiceClip, practicePictureLabel } from './hsk3-practice-data';
import { mistakeDrill, mistakeOptions, mistakeSchedule, mistakeSkill, normalizeDictation, type MistakeCard, type MistakeQueue, type MistakeSkill } from './hsk3-mistakes-model';
import { readMistakeQueue, saveMistakePractice } from './hsk3-mistakes-storage';
import type { Stroke } from './learning';
import './hsk3-practice.css';

const sessionLength=5;
const filters=[['all','All'],['recognition','Recognition'],['writing','Writing']] as const;

function MistakeQuestion({card,onSaved,onNext,last}:{
  card:MistakeCard;onSaved:(queue:MistakeQueue)=>void;onNext:()=>void;last:boolean;
}) {
  const [answer,setAnswer]=useState('');
  const [ink,setInk]=useState<Stroke[]>([]);
  const [pencil,setPencil]=useState(false);
  const [revealed,setRevealed]=useState(false);
  const [finished,setFinished]=useState<boolean|null>(null);
  const [busy,setBusy]=useState(false);
  const [failed,setFailed]=useState(false);
  const task=mistakeDrill(card);
  if(!task) return null;
  const audio='audio' in task ? task.audio : undefined;
  const manual=task.kind==='sentence'||pencil;
  const modelText=task.kind==='choice'?practicePictureLabel(task.answer)??task.answer:task.example;
  const typedText=task.kind==='character'&&audio?normalizeDictation(answer):answer.trim();
  const expected=task.kind==='character'&&audio?normalizeDictation(task.example):task.kind==='sentence'?'':task.answer;
  const canCheck=pencil?ink.some(stroke=>stroke.length>0):Boolean(typedText);

  async function grade(correct:boolean) {
    if(busy||finished!==null)return;
    setBusy(true);
    setFailed(false);
    try {
      const queue=await saveMistakePractice(card,correct);
      onSaved(queue);
      setRevealed(true);
      setFinished(correct);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return <div className="hsk-practice-question">
    <p className="hsk-practice-instruction">{task.kind==='choice'?task.prompt:task.kind==='sentence'?task.prompt:audio?'Listen and write the sentence.':'Write the missing Hanzi.'}</p>
    {task.text&&<p className="hsk3-prep-question" lang="zh-Hans">{task.text}</p>}
    {audio&&<div className="hsk3-prep-player"><audio controls preload="none" src={practiceClip(audio)} aria-label="Practice recording"/></div>}
    {task.kind==='choice'?<fieldset className="hsk3-prep-options" disabled={revealed||busy}>
      <legend className="sr-only">Your answer</legend>
      {mistakeOptions(task.options,card).map(value=>{
        const description=practicePictureLabel(value);
        return <label key={value}><input type="radio" name="mistake-answer" checked={answer===value} onChange={()=>setAnswer(value)} aria-label={description}/>
          <span lang="zh-Hans" aria-hidden={description?true:undefined}>{value}</span></label>;
      })}
    </fieldset>:<>
      <div className="hsk3-prep-aids" role="group" aria-label="Writing method">
        <button type="button" className="secondary" aria-pressed={!pencil} disabled={revealed||busy} onClick={()=>setPencil(false)}>Chinese keyboard</button>
        <button type="button" className="secondary" aria-pressed={pencil} disabled={revealed||busy} onClick={()=>setPencil(true)}>Apple Pencil</button>
      </div>
      {pencil?<div className="hsk-mock-writing">
        <PinyinHandwriting strokes={ink} onChange={setInk} penOnly={false} disabled={revealed||busy}
          kind={task.kind==='character'&&!audio?'hanzi':'pinyin'} label="Write your answer"/>
        <button type="button" className="secondary" disabled={!ink.length||revealed||busy} onClick={()=>setInk([])}>Clear ink</button>
      </div>:<label className="hsk3-prep-input hsk-mock-writing">
        <span>Your answer</span>
        {task.kind==='character'&&!audio?<input lang="zh-Hans" value={answer} onChange={event=>setAnswer(event.target.value)} disabled={revealed||busy} autoComplete="off"/>
          :<textarea rows={2} lang="zh-Hans" value={answer} onChange={event=>setAnswer(event.target.value)} disabled={revealed||busy}/>}
      </label>}
    </>}
    {revealed&&<div className="hsk3-prep-feedback" aria-live="polite">
      {finished!==null&&<strong>{manual?(finished?'Marked as remembered':'Scheduled for tomorrow'):(finished?'Correct':'Try a new example tomorrow')}</strong>}
      {'transcript' in task&&task.transcript&&<p lang="zh-Hans"><StudyText text={task.transcript}/></p>}
      <p><span>{task.kind==='sentence'?'Example':'Answer'} </span><span lang="zh-Hans"><StudyText text={modelText}/></span></p>
    </div>}
    {failed&&<p role="alert">Could not save this review. Please try again.</p>}
    <div className="hsk-practice-actions">
      {finished!==null?<button type="button" className="primary" onClick={onNext}>{last?'Finish review':'Next practice'}</button>
        :revealed?<><button type="button" className="primary" disabled={busy} onClick={()=>void grade(true)}>I got it</button>
          <button type="button" className="secondary" disabled={busy} onClick={()=>void grade(false)}>Review tomorrow</button></>
          :<button type="button" className="primary" disabled={!canCheck||busy}
            onClick={()=>manual?setRevealed(true):void grade(typedText===expected)}>{manual?'Show example':'Check answer'}</button>}
    </div>
  </div>;
}

export default function Hsk3Mistakes() {
  const [queue,setQueue]=useState<MistakeQueue>();
  const [error,setError]=useState(false);
  const [now,setNow]=useState(0);
  const [skill,setSkill]=useState<MistakeSkill|'all'>('all');
  const [session,setSession]=useState<MistakeCard[]>([]);
  const [step,setStep]=useState(0);
  const [complete,setComplete]=useState(false);

  function refresh() {
    readMistakeQueue().then(value=>{
      setNow(Date.now());
      setQueue(value);
      setError(false);
    }).catch(()=>setError(true));
  }
  useEffect(()=>{
    refresh();
    const clock=window.setInterval(()=>setNow(Date.now()),60_000);
    window.addEventListener('focus',refresh);
    return ()=>{window.clearInterval(clock);window.removeEventListener('focus',refresh);};
  },[]);

  const card=session[step];
  const schedule=queue?mistakeSchedule(queue,now,skill):undefined;
  const recognition=queue?mistakeSchedule(queue,now,'recognition').due.length:0;
  const writing=queue?mistakeSchedule(queue,now,'writing').due.length:0;

  return <section className="panel hsk3-prep-practice hsk-practice" aria-labelledby="hsk-mistake-title">
    <h2 id="hsk-mistake-title">Practise my mistakes</h2>
    {card?<><div className="hsk3-prep-task-label"><span>{mistakeSkill(card.id)==='writing'?'Writing':'Recognition'}</span><span>{step+1} / {session.length}</span></div>
      <MistakeQuestion key={card.id} card={card} onSaved={setQueue} last={step+1===session.length} onNext={()=>{
        if(step+1===session.length){setSession([]);setStep(0);setComplete(true);}
        else setStep(step+1);
      }}/></>:<>
        <p>New listening, reading and writing examples based on the questions you added from your exam results.</p>
        {complete&&<p role="status">Session complete. Your next review dates are saved.</p>}
        {error&&<p role="alert">Could not open reviews on this device. <button type="button" className="text-button" onClick={refresh}>Retry</button></p>}
        {!queue&&!error&&<p role="status">Opening your reviews…</p>}
        {queue&&<>
          <p className="hsk-practice-due"><strong>{recognition}</strong> recognition due <span aria-hidden="true">·</span> <strong>{writing}</strong> writing due</p>
          <div className="hsk3-prep-aids" role="group" aria-label="Review skill">
            {filters.map(([key,label])=><button type="button" className="secondary" key={key} aria-pressed={skill===key} onClick={()=>setSkill(key)}>{label}</button>)}
          </div>
          {schedule?.due.length?<div className="hsk-practice-actions">
            <button type="button" className="primary" onClick={()=>{setSession(schedule.due.slice(0,sessionLength));setStep(0);setComplete(false);}}>
              <ListChecks size={17} aria-hidden="true"/> Start {Math.min(sessionLength,schedule.due.length)} due {schedule.due.length===1?'exercise':'exercises'}
            </button>
          </div>:schedule?.next?<p>Next review {new Date(schedule.next.dueAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}.</p>
            :<p>No exercises in this view yet. Add questions from a written mock result.</p>}
        </>}
      </>}
  </section>;
}
