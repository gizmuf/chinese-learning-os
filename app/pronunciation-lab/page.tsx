'use client';
import {useEffect,useRef,useState} from 'react';
import {getAuthClient} from '../auth-client';
import {sentences} from '../../lib/soe/sentences.mjs';
type Result={source:string;score:number|null;words:{hanzi:string;expected:number|null;heard:number|null;status:string}[];uncertain:boolean;toneCoverage:number;total:number};
export default function PronunciationLab(){
 const [id,setId]=useState('who'),[phase,setPhase]=useState('idle'),[error,setError]=useState(''),[url,setUrl]=useState(''),[result,setResult]=useState<Result|null>(null),[consent,setConsent]=useState(false);
 const audio=useRef<Uint8Array|null>(null), cleanup=useRef<()=>void>(()=>{}),timer=useRef<ReturnType<typeof setTimeout>|null>(null),link=useRef('');
 const sentence=sentences.find(s=>s.id===id)!;
 useEffect(()=>()=>{cleanup.current();if(timer.current)clearTimeout(timer.current);URL.revokeObjectURL(link.current);},[]);
 function stop(){cleanup.current();if(timer.current)clearTimeout(timer.current);}
 async function record(){
  setError('');setResult(null);audio.current=null;setUrl('');URL.revokeObjectURL(link.current);setPhase('starting');
  let stream:MediaStream|undefined,context:AudioContext|undefined;
  try{
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Microphone requires HTTPS and Safari microphone permission.');
   context=new AudioContext();await context.resume();stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
   const input=context.createMediaStreamSource(stream),processor=context.createScriptProcessor(4096,1,1),mute=context.createGain();mute.gain.value=0;
   const samples:Float32Array[]=[];let count=0;const rate=context.sampleRate;
   processor.onaudioprocess=e=>{const data=e.inputBuffer.getChannelData(0).slice();if(count+data.length<=rate*30){samples.push(data);count+=data.length;}};
   input.connect(processor);processor.connect(mute);mute.connect(context.destination);
   cleanup.current=()=>{
    cleanup.current=()=>{};setPhase('processing');processor.disconnect();input.disconnect();mute.disconnect();stream?.getTracks().forEach(t=>t.stop());void context?.close();
    const source=new Float32Array(count);let at=0;for(const s of samples){source.set(s,at);at+=s.length;}
    // OfflineAudioContext performs browser-native resampling, including iPad's 48 kHz input.
    void (async()=>{try{
     if(count<rate*.5)throw Error('Record at least half a second.');
     const offline=new OfflineAudioContext(1,Math.floor(count*16000/rate),16000),buffer=offline.createBuffer(1,count,rate);buffer.copyToChannel(source,0);
     const node=offline.createBufferSource();node.buffer=buffer;node.connect(offline.destination);node.start();
     const rendered=await offline.startRendering(),floats=rendered.getChannelData(0),pcm=new Uint8Array(floats.length*2),v=new DataView(pcm.buffer);
     for(let i=0;i<floats.length;i++)v.setInt16(i*2,Math.round(Math.max(-1,Math.min(1,floats[i]))*(floats[i]<0?32768:32767)),true);
     audio.current=pcm;
     const wav=new Uint8Array(44+pcm.length),view=new DataView(wav.buffer);const str=(i:number,s:string)=>{for(let j=0;j<s.length;j++)wav[i+j]=s.charCodeAt(j);};
     str(0,'RIFF');view.setUint32(4,36+pcm.length,true);str(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,pcm.length,true);wav.set(pcm,44);
     link.current=URL.createObjectURL(new Blob([wav],{type:'audio/wav'}));setUrl(link.current);setPhase('ready');
    }catch(e){setError((e as Error).message);setPhase('idle');}})();
   };
   setPhase('recording');timer.current=setTimeout(stop,30000);
  }catch(e){stream?.getTracks().forEach(t=>t.stop());void context?.close();setError((e as Error).message);setPhase('idle');}
 }
 async function assess(){
  if(!audio.current)return;setPhase('evaluating');setResult(null);setError('');
  try{const auth=await getAuthClient();await auth?.authStateReady();const current=auth?.currentUser;const headers:Record<string,string>={'Content-Type':'application/octet-stream'};if(current){if(!current.emailVerified)throw Error('Verify your Chinese OS email before evaluating.');headers.Authorization='Bearer '+await current.getIdToken();headers['X-Notebook-Owner']='firebase:'+current.uid;}const r=await fetch('/api/pronunciation?sentence='+id,{method:'POST',headers,body:new Blob([audio.current as Uint8Array<ArrayBuffer>])});const data=await r.json() as Result & {error?:string};if(!r.ok)throw Error(data.error??"Evaluation failed");setResult(data);setPhase('ready');
   // Keep this experiment's history separate from SRS and self-assessed progress. No audio is stored.
   try{const key='chinese-os-soe-lab-v1';const previous=JSON.parse(sessionStorage.getItem(key)||'[]');sessionStorage.setItem(key,JSON.stringify([...previous,{sentence:id,at:Date.now(),...data}].slice(-20)));}catch{}
  }catch(e){setError((e as Error).message);setPhase('ready');}
 }
 const busy=['starting','recording','processing','evaluating'].includes(phase);
 return <main style={{maxWidth:760,margin:'auto',padding:'32px 20px',color:'var(--ink)',fontFamily:'system-ui',lineHeight:1.7}}>
  <a href='/'>← Chinese OS</a><h1>Pronunciation lab</h1><p>Record a short sentence. Feedback appears after you stop and submit. This experiment does not change your SRS.</p>
  <label>Sentence <select disabled={busy} value={id} onChange={e=>{setId(e.target.value);setResult(null);audio.current=null;setUrl('');setPhase('idle');setError('');}}>{sentences.map(s=><option key={s.id} value={s.id}>{s.english}</option>)}</select></label>
  <div lang='zh-CN' style={{fontSize:56,marginTop:24}}>{sentence.hanzi}</div><div style={{fontSize:28}}>{sentence.pinyin}</div><p>{sentence.english}</p>
  <button disabled={busy} onClick={record} style={{padding:14}}>Record</button>{phase==='recording'&&<button onClick={stop} style={{padding:14,marginLeft:12}}>Stop recording</button>}
  <p role='status'>{phase==='recording'?'Recording… maximum 30 seconds. No feedback while you speak.':phase==='evaluating'?'Evaluating your recording…':phase==='starting'?'Opening microphone…':''}</p>
  {url&&<audio controls src={url}/>}
  <p><label><input type='checkbox' checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/> Send this recording to Tencent for pronunciation evaluation. Audio is held in memory and is not saved by Chinese OS.</label></p>
  <button style={{padding:14}} disabled={!audio.current||busy||!consent} onClick={assess}>Evaluate recording</button>
  <p>Real evaluation requires server activation. There is no simulated score on this screen.</p>
  {error&&<p role='alert'>{error}</p>}
  {result&&<section><h2>Actual audio analysis · Tencent SOE-N</h2><p>Provider score: {result.score===null?'Unavailable':Math.round(result.score)+' / 100'} · not a probability of correctness.</p><p>Tones assessed: {result.toneCoverage} / {result.total}. {result.uncertain?'Some recognition is uncertain. Record again before drawing conclusions.':''}</p>
  <table style={{width:'100%',textAlign:'left'}}><thead><tr><th>Hanzi</th><th>Expected tone</th><th>Detected tone</th><th>Feedback</th></tr></thead><tbody>{result.words.map((w,i)=><tr key={i}><td style={{fontSize:30}}>{w.hanzi}</td><td>{w.expected??'—'}</td><td>{w.heard??'—'}</td><td>{w.status==='match'?'Matches':w.status==='review'?'Review this tone':'Uncertain — no judgement'}</td></tr>)}</tbody></table>
  <p>Tone changes in connected speech, neutral tones and third-tone sandhi need teacher review. A flagged difference is a practice cue.</p></section>}
 </main>;
}
