'use client';

import { useEffect, useRef, useState } from 'react';
import { Headphones, Mic, Square, Volume2 } from 'lucide-react';
import { HskQuestionNavigation, useHskQuestionNavigation } from './hsk-question-navigation';
import { listenSpeakClip, listenSpeakTasks, type ListenSpeakTask } from './hsk3-practice-data';
import { recordSpeakingAnswer } from './hsk3-speaking-recorder';
import { StudyText } from './study-lookup-context';
import './hsk3-practice.css';

const voiceNames={xiaoxiao:'Xiaoxiao',xiaoyi:'Xiaoyi',yunxi:'Yunxi'};
type Phase='ready'|'permission'|'recording'|'saving';
type Capture={stream:MediaStream;recording:ReturnType<typeof recordSpeakingAnswer>;timer:number;stopping:boolean};

function stopStream(stream:MediaStream) {
  stream.getTracks().forEach(track=>{track.onended=null;track.stop();});
}

function ListenSpeakCard({task,answer,onAnswer,position,onMove}:{
  task:ListenSpeakTask;answer:Blob|undefined;onAnswer:(audio:Blob)=>void;position:number;onMove:(index:number)=>void;
}) {
  const [voice,setVoice]=useState(task.voices[0]);
  const [phase,setPhase]=useState<Phase>('ready');
  const [showsHanzi,setShowsHanzi]=useState(false);
  const [showsPinyin,setShowsPinyin]=useState(false);
  const [showsMeaning,setShowsMeaning]=useState(false);
  const [playerLabel,setPlayerLabel]=useState('');
  const [error,setError]=useState('');
  const answerUrl=useRef<string>(undefined);
  const player=useRef<HTMLAudioElement>(null);
  const capture=useRef<Capture|null>(null);
  const activity=useRef({generation:0});
  const nextAudio=useRef<{after:string;src:string}|null>(null);
  const example=listenSpeakClip(task,voice);
  const busy=phase!=='ready';

  useEffect(()=>{
    if(!answer) return;
    const url=URL.createObjectURL(answer);
    answerUrl.current=url;
    return()=>{
      answerUrl.current=undefined;
      URL.revokeObjectURL(url);
    };
  },[answer]);
  useEffect(()=>{
    const media=player.current;
    const playback=activity.current;
    return()=>{
      playback.generation++;
      media?.pause();
      const current=capture.current;
      if(current) {
        window.clearTimeout(current.timer);
        current.recording.discard();
        stopStream(current.stream);
        capture.current=null;
      }
    };
  },[]);

  function play(src:string,label:string,then?:string) {
    const media=player.current;
    if(!media)return;
    setError('');
    setPlayerLabel(label);
    media.src=src;
    nextAudio.current=then?{after:media.src,src:then}:null;
    media.play().catch(()=>{
      if(media.getAttribute('src')===src)setError('Playback stopped. Tap Play on the audio player to retry.');
    });
  }

  function playAnswer(compare:boolean) {
    const url=answerUrl.current;
    if(!url)return;
    if(compare)play(example,'Mandarin example',url);
    else play(url,'Your recording');
  }

  async function stopRecording() {
    const current=capture.current;
    if(!current||current.stopping)return;
    current.stopping=true;
    window.clearTimeout(current.timer);
    setPhase('saving');
    const audio=await current.recording.finish().catch(()=>null);
    stopStream(current.stream);
    if(capture.current!==current)return;
    capture.current=null;
    setPhase('ready');
    if(audio)onAnswer(audio);
    else setError('No usable audio was recorded. Try recording again.');
  }

  async function startRecording() {
    if(busy||capture.current)return;
    const request=++activity.current.generation;
    setError('');
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder) {
      setError('This browser cannot record here. Open this page in Safari on iPad or in a current desktop browser.');
      return;
    }
    player.current?.pause();
    nextAudio.current=null;
    setPhase('permission');
    let stream:MediaStream|undefined;
    try {
      stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
      if(request!==activity.current.generation){stopStream(stream);return;}
      const track=stream.getAudioTracks()[0];
      if(track?.readyState!=='live')throw new Error('Microphone unavailable');
      const recording=recordSpeakingAnswer(stream,()=>void stopRecording());
      capture.current={stream,recording,stopping:false,timer:window.setTimeout(()=>void stopRecording(),30_000)};
      track.onended=()=>void stopRecording();
      setPhase('recording');
    } catch {
      if(stream)stopStream(stream);
      if(request===activity.current.generation) {
        setError('Microphone unavailable. Allow microphone access and try again.');
        setPhase('ready');
      }
    }
  }

  function move(index:number) {
    if(busy||index<0||index>=listenSpeakTasks.length)return false;
    onMove(index);
    return true;
  }
  const swipe=useHskQuestionNavigation(step=>move(position+step));

  return <>
    <HskQuestionNavigation position={position} total={listenSpeakTasks.length} onMove={move} disabled={busy}/>
    <div className="hsk-mock-swipe" {...swipe}>
      <p className="hsk-practice-instruction">Listen once, say the sentence from memory, then compare.</p>
      {task.voices.length>1&&<div className="hsk-practice-voices" role="group" aria-label="Mandarin voice">
        {task.voices.map(value=><button className="secondary" type="button" key={value} disabled={busy} aria-pressed={voice===value} onClick={()=>setVoice(value)}>{voiceNames[value]}</button>)}
      </div>}
      <div className="hsk-practice-actions">
        <button type="button" className="primary" disabled={busy} onClick={()=>play(example,'Mandarin example')}><Headphones size={17} aria-hidden="true"/> Listen to example</button>
        {phase==='recording'?<button type="button" className="secondary" onClick={()=>void stopRecording()}><Square size={15} aria-hidden="true"/> Stop recording</button>
          :<button type="button" className="secondary" disabled={busy} onClick={()=>void startRecording()}><Mic size={17} aria-hidden="true"/> {answer?'Record again':'Record answer'}</button>}
        {answer&&<button type="button" className="secondary" disabled={busy} onClick={()=>playAnswer(true)}><Volume2 size={17} aria-hidden="true"/> Compare recordings</button>}
        {answer&&<button type="button" className="secondary" disabled={busy} onClick={()=>playAnswer(false)}>Listen to me</button>}
      </div>
      {phase!=='ready'&&<p role="status">{phase==='permission'?'Waiting for microphone…':phase==='saving'?'Preparing playback…':'Recording. Speak now.'}</p>}
      {error&&<p role="alert">{error}</p>}
      <audio ref={player} controls hidden={busy||!playerLabel} className="hsk-practice-player" aria-label={playerLabel||'Practice audio'} onEnded={()=>{
        const pending=nextAudio.current;
        if(pending&&pending.after===player.current?.src&&player.current?.ended)play(pending.src,'Your recording');
      }}/>
    </div>
    <div className="hsk-practice-reveal">
      <div className="hsk-practice-text-controls" role="group" aria-label="Text and translation">
        <button type="button" className="secondary" aria-pressed={showsHanzi} onClick={()=>setShowsHanzi(!showsHanzi)}>Hanzi</button>
        <button type="button" className="secondary" disabled={!showsHanzi} aria-pressed={showsHanzi&&showsPinyin} onClick={()=>setShowsPinyin(!showsPinyin)}>Pinyin</button>
        <button type="button" className="secondary" aria-pressed={showsMeaning} onClick={()=>setShowsMeaning(!showsMeaning)}>Translation</button>
      </div>
      {showsHanzi&&<div className="hsk-practice-chunks" lang="zh-Hans">
        {task.chunks.map(([hanzi,pinyin],index)=><span key={index}><StudyText text={hanzi} pinyin={pinyin} annotatePinyin={showsPinyin}/></span>)}
      </div>}
      {showsMeaning&&<p>{task.meaning}</p>}
    </div>
  </>;
}

export default function Hsk3ListenSpeak() {
  const [position,setPosition]=useState(0);
  const [answers,setAnswers]=useState<Record<string,Blob>>({});
  const task=listenSpeakTasks[position];
  return <section className="panel hsk3-prep-practice hsk-practice" aria-labelledby="hsk-listen-speak">
    <h2 id="hsk-listen-speak">Listen, speak, check</h2>
    <p>A five-minute practice set. Your recordings stay in this tab.</p>
    <ListenSpeakCard key={task.id} task={task} position={position} answer={answers[task.id]} onMove={setPosition}
      onAnswer={audio=>setAnswers(current=>({...current,[task.id]:audio}))}/>
  </section>;
}
