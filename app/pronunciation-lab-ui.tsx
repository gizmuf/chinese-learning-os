'use client';
import {useEffect,useRef,useState} from 'react';
import {getAuthClient} from './auth-client';
import {createPronunciationRecorder} from './pronunciation-recorder';
import {sentences} from '../lib/soe/sentences.mjs';
type Result={source:string;score:number|null;words:{hanzi:string;expected:number|null;heard:number|null;status:string}[];uncertain:boolean;toneCoverage:number;total:number};
type Microphone = 'checking' | 'available' | 'insecure' | 'unsupported';

export default function PronunciationLab({serverEvaluation=true}:{serverEvaluation?:boolean}){
 const [microphone,setMicrophone]=useState<Microphone>('checking');
 const canRecord=microphone==='available';
 const [id,setId]=useState('who'),[phase,setPhase]=useState('idle'),[error,setError]=useState(''),[url,setUrl]=useState(''),[result,setResult]=useState<Result|null>(null),[consent,setConsent]=useState(false);
 const audio=useRef<Uint8Array<ArrayBuffer>|null>(null),link=useRef('');
 const recorder=useRef<ReturnType<typeof createPronunciationRecorder> | null>(null);
 const evaluation=useRef<AbortController | null>(null);
 const sentence=sentences.find(s=>s.id===id)!;
 function discard(){
  recorder.current?.discard();
  recorder.current=null;
  evaluation.current?.abort();
  evaluation.current=null;
  audio.current=null;
  if(link.current)URL.revokeObjectURL(link.current);
  link.current='';
 }
 useEffect(()=>{
  setMicrophone(!window.isSecureContext?'insecure':
   typeof navigator.mediaDevices?.getUserMedia==='function'&&typeof AudioContext!=='undefined'&&typeof OfflineAudioContext!=='undefined'?'available':'unsupported');
  function restore(event:PageTransitionEvent){
   if(!event.persisted)return;
   setUrl('');setResult(null);setError('');setConsent(false);setPhase('idle');
  }
  window.addEventListener('pagehide',discard);
  window.addEventListener('pageshow',restore);
  return ()=>{
   window.removeEventListener('pagehide',discard);
   window.removeEventListener('pageshow',restore);
   discard();
  };
 },[]);
 function record(){
  if(!canRecord)return;
  discard();
  setError('');setResult(null);setUrl('');setConsent(false);setPhase('starting');
  const take=createPronunciationRecorder({
   onRecording:()=>setPhase('recording'),
   onProcessing:()=>setPhase('processing'),
   onReady:(pcm,wav)=>{
    audio.current=pcm;
    link.current=URL.createObjectURL(wav);
    setUrl(link.current);
    setPhase('ready');
   },
   onError:error=>{setError((error as Error).message);setPhase('idle');},
  });
  recorder.current=take;
  void take.start();
 }
 async function assess(){
  const pcm=audio.current;
  if(!serverEvaluation||!pcm||!consent||evaluation.current)return;
  const request=new AbortController();
  evaluation.current=request;
  setPhase('evaluating');setResult(null);setError('');
  try{
   const auth=await getAuthClient();
   await auth?.authStateReady();
   const current=auth?.currentUser;
   const headers:Record<string,string>={'Content-Type':'application/octet-stream'};
   if(current){
    if(!current.emailVerified)throw Error('Verify your Chinese OS email before evaluating.');
    headers.Authorization='Bearer '+await current.getIdToken();
    headers['X-Notebook-Owner']='firebase:'+current.uid;
   }
   if(request.signal.aborted)return;
   const response=await fetch('/api/pronunciation?sentence='+id,{method:'POST',headers,body:new Blob([pcm]),signal:request.signal});
   const data=await response.json() as Result & {error?:string};
   if(request.signal.aborted)return;
   if(!response.ok)throw Error(data.error??'Evaluation failed');
   setResult(data);setPhase('ready');
   // Keep this experiment's history separate from SRS and self-assessed progress. No audio is stored.
   try{const key='chinese-os-soe-lab-v1';const previous=JSON.parse(sessionStorage.getItem(key)||'[]');sessionStorage.setItem(key,JSON.stringify([...previous,{sentence:id,at:Date.now(),...data}].slice(-20)));}catch{}
  }catch(error){
   if(!request.signal.aborted){setError((error as Error).message);setPhase('ready');}
  }finally{
   if(evaluation.current===request)evaluation.current=null;
  }
 }
 const busy=['starting','recording','processing','evaluating'].includes(phase);
 return <main style={{maxWidth:760,margin:'auto',padding:'32px 20px',color:'var(--ink)',fontFamily:'system-ui',lineHeight:1.7}}>
  <a href='/'>← Chinese OS</a><h1>Pronunciation lab</h1><p>{serverEvaluation?'Record a short sentence. Feedback appears after you stop and submit. This experiment does not change your SRS.':'Choose a short sentence and practise saying it aloud.'}</p>
  <label>Sentence <select disabled={busy} value={id} onChange={e=>{discard();setId(e.target.value);setResult(null);setUrl('');setConsent(false);setPhase('idle');setError('');}}>{sentences.map(s=><option key={s.id} value={s.id}>{s.english}</option>)}</select></label>
  <div lang='zh-CN' style={{fontSize:56,marginTop:24}}>{sentence.hanzi}</div><div style={{fontSize:28}}>{sentence.pinyin}</div><p>{sentence.english}</p>
  {microphone==='insecure'&&<p>Microphone recording requires HTTPS. This page is served over HTTP.</p>}
  {microphone==='unsupported'&&<p>Microphone recording is unavailable in this browser.</p>}
  <button disabled={busy||!canRecord} onClick={record} style={{padding:14}}>Record</button>{phase==='recording'&&<button onClick={()=>void recorder.current?.stop()} style={{padding:14,marginLeft:12}}>Stop recording</button>}
  <p role='status'>{phase==='recording'?'Recording… maximum 30 seconds. No feedback while you speak.':phase==='evaluating'?'Evaluating your recording…':phase==='starting'?'Opening microphone…':''}</p>
  {url&&<audio controls src={url}/>}
  {serverEvaluation&&<p><label><input type='checkbox' checked={consent} disabled={busy||!canRecord} onChange={e=>setConsent(e.target.checked)}/> Send this recording to Tencent for pronunciation evaluation. Audio is held in memory and is not saved by Chinese OS.</label></p>}
  <button style={{padding:14}} disabled={!serverEvaluation||!audio.current||busy||!consent} onClick={assess}>Evaluate recording</button>
  <p>{serverEvaluation?'Real evaluation requires server activation. There is no simulated score on this screen.':'Server evaluation is unavailable on this deployment.'}</p>
  {error&&<p role='alert'>{error}</p>}
  {result&&<section><h2>Actual audio analysis · Tencent SOE-N</h2><p>Provider score: {result.score===null?'Unavailable':Math.round(result.score)+' / 100'} · not a probability of correctness.</p><p>Tones assessed: {result.toneCoverage} / {result.total}. {result.uncertain?'Some recognition is uncertain. Record again before drawing conclusions.':''}</p>
  <table style={{width:'100%',textAlign:'left'}}><thead><tr><th>Hanzi</th><th>Expected tone</th><th>Detected tone</th><th>Feedback</th></tr></thead><tbody>{result.words.map((w,i)=><tr key={i}><td style={{fontSize:30}}>{w.hanzi}</td><td>{w.expected??'—'}</td><td>{w.heard??'—'}</td><td>{w.status==='match'?'Matches':w.status==='review'?'Review this tone':'Uncertain — no judgement'}</td></tr>)}</tbody></table>
  <p>Tone changes in connected speech, neutral tones and third-tone sandhi need teacher review. A flagged difference is a practice cue.</p></section>}
 </main>;
}
