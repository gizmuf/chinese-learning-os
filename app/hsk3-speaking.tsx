'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Clock3, Headphones, Mic } from 'lucide-react';
import { StudyText } from './study-lookup-context';
import { beginSpeakingAttempt, clearSpeakingAnswers, readSpeakingAttempt, saveSpeakingAnswer } from './hsk3-speaking-storage';
import { recordSpeakingAnswer } from './hsk3-speaking-recorder';
import { speakingAudio, speakingClock, speakingSections, speakingStepsFor, speakingTasksFor, questionClip, type RecordedAnswer, type SpeakingTask } from './hsk3-speaking-model';
import type { HskExamForm } from './hsk3-form';
import './hsk3-speaking.css';

function Picture({task,form}:{task:SpeakingTask;form:HskExamForm}) {
  return <div className="hsk-speaking-picture" data-scene={task.picture} data-form={form} role="img" aria-label={task.alt}/>;
}

function AnswerPlayback({answer}:{answer:RecordedAnswer}) {
  const player=useRef<HTMLAudioElement>(null);
  useEffect(()=>{
    const element=player.current;
    if(!element)return;
    const source=URL.createObjectURL(answer.audio);
    element.src=source;
    return ()=>URL.revokeObjectURL(source);
  },[answer.audio]);
  return <audio ref={player} controls preload="metadata" aria-label={'Your recording for question '+(answer.question+1)}/>;
}

function SpeakingReview({answers,form}:{answers:RecordedAnswer[];form:HskExamForm}) {
  const speakingTasks=speakingTasksFor(form);
  const byQuestion=new Map(answers.map(answer=>[answer.question,answer]));
  return <div className="hsk-speaking-review">
    <p>{answers.length} / {speakingTasks.length} answers recorded. Listen for tones, word order and how clearly you answered the prompt.</p>
    {speakingTasks.map((task,index)=>{
      const answer=byQuestion.get(index);
      return <details key={index} className="hsk-mock-review">
        <summary><strong>{index+1}. {speakingSections[task.kind].title}</strong>{answer?'':' · no recording'}</summary>
        {task.picture&&<Picture task={task} form={form}/>}
        {task.kind!=='picture'&&<p className="hsk3-prep-question" lang="zh-Hans"><StudyText text={task.prompt}/></p>}
        <label className="hsk-speaking-playback">Original prompt
          <audio controls preload="none" src={speakingAudio(questionClip(index),form)} aria-label={'Prompt for question '+(index+1)}/>
        </label>
        {answer&&<label className="hsk-speaking-playback">Your answer <AnswerPlayback answer={answer}/></label>}
        {task.example&&<p>Example answer <span lang="zh-Hans"><StudyText text={task.example}/></span></p>}
      </details>;
    })}
  </div>;
}

type Screen='loading'|'ready'|'review'|'active';
const microphoneError='Microphone unavailable. Allow microphone access in your browser and try again.';

export default function Hsk3Speaking({form='a'}:{form?:HskExamForm}) {
  const speakingTasks=speakingTasksFor(form);
  const speakingSteps=speakingStepsFor(form);
  const [screen,setScreen]=useState<Screen>('loading');
  const [answers,setAnswers]=useState<RecordedAnswer[]>([]);
  const [microphone,setMicrophone]=useState<'off'|'loading'|'ready'>('off');
  const [step,setStep]=useState(0);
  const [time,setTime]=useState(0);
  const [note,setNote]=useState('');
  const [storageWarning,setStorageWarning]=useState(false);
  const [audioRecovery,setAudioRecovery]=useState(false);
  const [showStop,setShowStop]=useState(false);
  const source=useRef<HTMLAudioElement>(null);
  const panel=useRef<HTMLElement>(null);
  const stream=useRef<MediaStream|null>(null);
  const microphoneRequest=useRef(0);
  const running=useRef(false);
  const activeStep=useRef(-1);
  const transition=useRef(false);
  const stopRequested=useRef<string|null>(null);
  const mounted=useRef(false);
  const cue=useRef(-1);
  const deadline=useRef(0);
  const writer=useRef<ReturnType<typeof recordSpeakingAnswer>|null>(null);
  const runId=useRef('');
  const queued=useRef<Promise<unknown>>(Promise.resolve());

  function releaseMicrophone() {
    microphoneRequest.current++;
    stream.current?.getTracks().forEach(track=>{track.onended=null;track.stop();});
    stream.current=null;
  }

  useEffect(()=>{
    mounted.current=true;
    readSpeakingAttempt(form).then(previous=>{
      if(!mounted.current)return;
      const saved=previous?.answers??[];
      runId.current=previous?.id??'';
      setAnswers(saved);
      setScreen(saved.length?'review':'ready');
    }).catch(()=>{
      if(mounted.current) {setStorageWarning(true);setScreen('ready');}
    });
    const player=source.current;
    return ()=>{
      mounted.current=false;
      running.current=false;
      activeStep.current=-1;
      player?.pause();
      writer.current?.discard();
      writer.current=null;
      releaseMicrophone();
    };
  },[form]);

  function queueSave(job:()=>Promise<unknown>) {
    queued.current=queued.current.then(job).then(saved=>{
      if(saved===false&&mounted.current)setStorageWarning(true);
    }).catch(()=>{
      if(mounted.current)setStorageWarning(true);
    });
  }

  async function enableMicrophone() {
    if(microphone!=='off')return;
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder) {
      setNote('This browser cannot record here. Open the exam in Safari on iPad or in a current desktop browser.');
      return;
    }
    setNote('');
    setMicrophone('loading');
    const request=++microphoneRequest.current;
    try {
      const opened=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
      if(!mounted.current||microphoneRequest.current!==request) {opened.getTracks().forEach(track=>track.stop());return;}
      const track=opened.getAudioTracks()[0];
      if(!track||track.readyState!=='live') {
        opened.getTracks().forEach(item=>item.stop());
        throw new Error('Audio track unavailable');
      }
      stream.current=opened;
      track.onended=()=>{
        if(running.current)void advance(true,'The microphone disconnected. Your saved answers are available below.');
        else {releaseMicrophone();setMicrophone('off');setNote(microphoneError);}
      };
      setMicrophone('ready');
    } catch {
      if(mounted.current&&microphoneRequest.current===request) {setMicrophone('off');setNote(microphoneError);}
    }
  }

  function showReview(message='') {
    running.current=false;
    transition.current=false;
    stopRequested.current=null;
    activeStep.current=-1;
    deadline.current=0;
    cue.current=-1;
    source.current?.pause();
    releaseMicrophone();
    setMicrophone('off');
    setAudioRecovery(false);
    setShowStop(false);
    setNote(message);
    setScreen('review');
    requestAnimationFrame(()=>panel.current?.scrollIntoView({block:'start'}));
  }

  function playCue(index:number) {
    const item=speakingSteps[index];
    const player=source.current;
    if(!player||item.phase!=='listen')return;
    cue.current=index;
    setAudioRecovery(false);
    player.src=speakingAudio(item.clip,form);
    player.play().catch(()=>{
      if(mounted.current&&running.current&&cue.current===index)setAudioRecovery(true);
    });
  }

  function startAt(index:number) {
    if(!mounted.current||!running.current)return;
    const item=speakingSteps[index];
    if(!item) {showReview();return;}
    activeStep.current=index;
    cue.current=-1;
    setStep(index);
    if(item.phase==='listen') {
      deadline.current=0;
      playCue(index);
      return;
    }
    const capture=stream.current;
    if(item.phase==='record') {
      if(!capture?.getAudioTracks().some(track=>track.readyState==='live')) {
        showReview('The microphone disconnected. Your saved answers are available below.');
        return;
      }
      try {
        writer.current=recordSpeakingAnswer(capture,()=>{
          if(running.current)void advance(true,'The microphone stopped. Your saved answers are available below.');
        });
      } catch {
        showReview('Recording could not start. Your saved answers are available below.');
        return;
      }
    }
    setTime(item.seconds);
    deadline.current=Date.now()+item.seconds*1000;
  }

  async function advance(stop=false,message='') {
    if(!running.current)return;
    if(transition.current) {
      if(stop)stopRequested.current=message;
      return;
    }
    transition.current=true;
    const index=activeStep.current;
    deadline.current=0;
    cue.current=-1;
    const capture=writer.current;
    writer.current=null;
    if(capture) {
      const audio=await capture.finish().catch(()=>null);
      if(!mounted.current||!running.current)return;
      if(!audio){
        showReview('This answer could not be recorded. Your earlier answers are available below.');
        return;
      }
      const answer={question:speakingSteps[index].question,audio};
      const id=runId.current;
      setAnswers(current=>[...current,answer]);
      queueSave(()=>saveSpeakingAnswer(id,answer,form));
    }
    if(stop||stopRequested.current!==null||index===speakingSteps.length-1) {
      releaseMicrophone();
      await queued.current;
      if(mounted.current&&running.current)showReview(stopRequested.current??message);
    } else {
      transition.current=false;
      startAt(index+1);
    }
  }

  const advanceFromTimer=useEffectEvent(()=>{void advance();});
  useEffect(()=>{
    if(screen!=='active')return;
    function tick() {
      if(!deadline.current)return;
      const seconds=Math.max(0,Math.ceil((deadline.current-Date.now())/1000));
      setTime(seconds);
      if(seconds===0)advanceFromTimer();
    }
    const interval=window.setInterval(tick,200);
    window.addEventListener('focus',tick);
    return ()=>{window.clearInterval(interval);window.removeEventListener('focus',tick);};
  },[screen]);

  function start() {
    if(running.current||!stream.current)return;
    const id=crypto.randomUUID();
    runId.current=id;
    queueSave(()=>beginSpeakingAttempt(id,form));
    setAnswers([]);
    setNote('');
    setScreen('active');
    running.current=true;
    startAt(0);
    requestAnimationFrame(()=>panel.current?.scrollIntoView({block:'start'}));
  }

  const current=speakingSteps[step];
  const task=speakingTasks[current.question];
  return <section ref={panel} className="panel hsk3-prep-practice hsk-speaking" aria-labelledby="hsk-speaking-title">
    <audio ref={source} preload="none" hidden onEnded={()=>{
      if(cue.current===activeStep.current&&cue.current>=0&&source.current?.ended)void advance();
    }} onError={()=>{
      if(cue.current===activeStep.current&&cue.current>=0)setAudioRecovery(true);
    }}/>
    <h2 id="hsk-speaking-title">{screen==='review'?'Speaking review':'Timed HSK 3.0 speaking mock'}</h2>
    {screen==='loading'&&<p role="status">Opening speaking practice…</p>}
    {note&&<p role="status" className="hsk-speaking-note">{note}</p>}
    {storageWarning&&<p role="status" className="hsk-speaking-note">Saving on this device is unavailable. Keep this tab open to listen to the recordings.</p>}
    {screen==='ready'&&<>
      <p>15 questions · about 15 minutes. Follow the recorded Mandarin instructions and speak after each prompt. Headphones keep the prompts out of your recordings.</p>
      <ul className="hsk-mock-sections">
        <li><strong>Listen and repeat</strong><span>8 × 10 seconds</span></li>
        <li><strong>Describe a picture</strong><span>5 × 15 seconds</span></li>
        <li><strong>Answer a question</strong><span>2 × 3 min to prepare + 90 sec to speak</span></li>
      </ul>
      <p>Your recordings stay in this browser. You can play them back after the exam.</p>
      {answers.length>0&&<p>Starting a new attempt replaces the previous recordings.</p>}
      <div className="hsk-speaking-actions">
        {microphone!=='ready'?<button type="button" className="primary" disabled={microphone==='loading'} onClick={()=>void enableMicrophone()}><Mic size={18}/>{microphone==='loading'?'Waiting for microphone…':'Enable microphone'}</button>
          :<button type="button" className="primary" onClick={start}>Start speaking mock</button>}
        {answers.length>0&&<button type="button" className="secondary" onClick={()=>{releaseMicrophone();setMicrophone('off');setScreen('review');}}>Back to recordings</button>}
      </div>
    </>}
    {screen==='active'&&<>
      <div className="hsk-speaking-status">
        <span>{speakingSections[task.kind].title} · {current.question+1} / {speakingTasks.length}</span>
        {current.phase!=='listen'&&<span className="hsk-mock-timer" role="timer" aria-label="Time left"><Clock3 size={18} aria-hidden="true"/> {speakingClock(time)}</span>}
      </div>
      <p className="hsk-speaking-phase" role="status">
        {current.phase==='listen'?<><Headphones size={18}/> Listen to the prompt</>:current.phase==='prepare'?'Prepare your answer':<><Mic size={18}/> Recording · speak now</>}
      </p>
      {task.picture&&<Picture task={task} form={form}/>}
      {task.kind==='question'&&<p className="hsk3-prep-question" lang="zh-Hans">{task.prompt}</p>}
      {audioRecovery&&<button type="button" className="primary" onClick={()=>playCue(activeStep.current)}>Play prompt to continue</button>}
      <div className="hsk-speaking-actions">
        <button type="button" className="secondary" onClick={()=>showStop?void advance(true):setShowStop(true)}>{showStop?'End attempt and review':'End attempt'}</button>
        {showStop&&<button type="button" className="secondary" onClick={()=>setShowStop(false)}>Continue exam</button>}
      </div>
    </>}
    {screen==='review'&&<>
      <SpeakingReview answers={answers} form={form}/>
      <p><a href="/?course=hsk3&drill=listen-speak">Practise listening and speaking</a></p>
      <div className="hsk-speaking-actions">
        <button type="button" className="primary" onClick={()=>{setScreen('ready');setNote('');}}>New attempt</button>
        {answers.length>0&&<button type="button" className="secondary" onClick={()=>{
          const id=runId.current;
          queueSave(async()=>{
            const deleted=await clearSpeakingAnswers(id,form);
            if(!mounted.current||runId.current!==id)return;
            setAnswers([]);
            if(!deleted)setNote('A newer attempt was saved in another tab. Reload to review it.');
          });
        }}>Delete recordings</button>}
      </div>
    </>}
  </section>;
}
