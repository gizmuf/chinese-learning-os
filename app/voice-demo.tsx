'use client';
import {useEffect,useRef,useState} from 'react';
import {demoFruits,pcm16,validatedFruitIds} from './voice-demo-model';
import './voice-demo.css';
type Availability={ready:boolean;configured:boolean;authorized:boolean};
export default function VoiceDemo(){
 const [showEnglish,setShowEnglish]=useState(false);
 const [availability,setAvailability]=useState<Availability|null>(null),[connected,setConnected]=useState(false),[waiting,setWaiting]=useState(false),[recording,setRecording]=useState(false),[status,setStatus]=useState('Checking voice availability…'),[seconds,setSeconds]=useState(120),[turns,setTurns]=useState(3),[text,setText]=useState(''),[reply,setReply]=useState(''),[ids,setIds]=useState<string[]>(['apple','banana','orange']);
 const socket=useRef<WebSocket|null>(null),audio=useRef<AudioContext|null>(null),media=useRef<MediaStream|null>(null),recorder=useRef<MediaRecorder|null>(null),recordTimer=useRef<ReturnType<typeof setTimeout>|null>(null),deadline=useRef(0),scheduled=useRef(0),sources=useRef<AudioBufferSourceNode[]>([]),alive=useRef(true),epoch=useRef(0);
 const stopSounds=()=>{for(const s of sources.current)try{s.stop();}catch{}sources.current=[];scheduled.current=0;};
 const disconnect=()=>{epoch.current++;if(recordTimer.current)clearTimeout(recordTimer.current);if(recorder.current?.state==='recording')recorder.current.stop();media.current?.getTracks().forEach(t=>t.stop());media.current=null;recorder.current=null;socket.current?.close();socket.current=null;stopSounds();void audio.current?.close();audio.current=null;if(alive.current){setConnected(false);setRecording(false);setWaiting(false);}};
 useEffect(()=>{alive.current=true;let cancelled=false;void fetch('/api/voice-demo/status',{cache:'no-store'}).then(r=>r.ok?r.json():null).then((input:unknown)=>{const v=input&&typeof input==='object'&&'ready' in input&&typeof input.ready==='boolean'?input as Availability:null;if(cancelled)return;setAvailability(v);setStatus(v?.ready?'Ready for a short conversation.':v?.configured?'Sign in with the approved test account to connect.':'The real voice connection is not enabled yet.');}).catch(()=>{if(!cancelled)setStatus('The real voice connection is not enabled yet.');});return()=>{cancelled=true;alive.current=false;disconnect();};},[]);
 useEffect(()=>{if(!connected)return;const tick=setInterval(()=>{const left=Math.max(0,Math.ceil((deadline.current-Date.now())/1000));setSeconds(left);if(left===0){disconnect();setStatus('Two-minute demo finished.');}},500);return()=>clearInterval(tick);},[connected]);
 async function connect(){
  if(!availability?.ready||socket.current)return;
  try{
   audio.current=new AudioContext();await audio.current.resume();setStatus('Connecting…');
   const ws=new WebSocket(location.origin.replace(/^http/,'ws')+'/api/voice-demo/stream');socket.current=ws;
   ws.onmessage=event=>{if(!alive.current||socket.current!==ws)return;try{const e=JSON.parse(event.data);
    if(e.type==='demo.ready'){deadline.current=Date.now()+120000;setSeconds(120);setTurns(3);setConnected(true);setStatus('Connected. Record a short question or type one.');}
    else if(e.type==='demo.text')setReply(v=>(v+e.delta).slice(-6000));
    else if(e.type==='demo.cards'){const next=validatedFruitIds(e.ids);if(next)setIds(next);}
    else if(e.type==='demo.done'){setWaiting(false);setTurns(e.turnsRemaining);setStatus(e.turnsRemaining?'Your turn.':'Three turns completed. You can listen, then end the demo.');}
    else if(e.type==='demo.ended'){disconnect();setStatus(e.reason);}
    else if(e.type==='response.audio.delta'&&audio.current){
     const raw=atob(e.delta),ctx=audio.current,n=Math.floor(raw.length/2),buffer=ctx.createBuffer(1,n,24000),samples=buffer.getChannelData(0);
     for(let i=0;i<n;i++){let v=raw.charCodeAt(i*2)|(raw.charCodeAt(i*2+1)<<8);if(v>32767)v-=65536;samples[i]=v/32768;}
     const source=ctx.createBufferSource();source.buffer=buffer;source.connect(ctx.destination);const start=Math.max(ctx.currentTime+.025,scheduled.current);source.start(start);scheduled.current=start+buffer.duration;sources.current.push(source);source.onended=()=>{sources.current=sources.current.filter(s=>s!==source);};
    }
   }catch{disconnect();setStatus('Could not read the voice response.');}};
   ws.onerror=()=>{disconnect();setStatus('Could not connect. No alternative model was used.');};
   ws.onclose=()=>{if(socket.current===ws){disconnect();setStatus('Conversation ended.');}};
  }catch{disconnect();setStatus('Audio is unavailable in this browser.');}
 }
 function sendText(){if(!text.trim()||!connected||waiting||recording||turns<1)return;stopSounds();setReply('');socket.current?.send(JSON.stringify({type:'text',text:text.trim().slice(0,300)}));setText('');setWaiting(true);setStatus('Tutor is responding…');}
 async function startRecording(){
  if(!connected||waiting||recording||turns<1||!audio.current)return;
  const token=epoch.current;
  try{
   stopSounds();const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
   if(token!==epoch.current||!socket.current){stream.getTracks().forEach(t=>t.stop());return;}
   media.current=stream;const supported=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t)),r=new MediaRecorder(stream,supported?{mimeType:supported}:undefined),chunks:BlobPart[]=[];recorder.current=r;
   r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   r.onstop=async()=>{
    stream.getTracks().forEach(t=>t.stop());media.current=null;if(recordTimer.current)clearTimeout(recordTimer.current);if(token!==epoch.current||!alive.current)return;
    setRecording(false);setWaiting(true);setReply('');setStatus('Sending your spoken question…');
    try{
     const ctx=audio.current,ws=socket.current;if(!ctx||!ws||ws.readyState!==WebSocket.OPEN)return;
     const decoded=await ctx.decodeAudioData(await new Blob(chunks,{type:r.mimeType}).arrayBuffer());
     if(token!==epoch.current)return;
     if(decoded.duration<.12||decoded.duration>10.3)throw Error('length');
     const render=new OfflineAudioContext(1,Math.min(160000,Math.ceil(decoded.duration*16000)),16000),source=render.createBufferSource();source.buffer=decoded;source.connect(render.destination);source.start();const converted=await render.startRendering();
     if(token!==epoch.current)return;
     const samples=converted.getChannelData(0);let energy=0;for(const v of samples)energy+=v*v;if(Math.sqrt(energy/samples.length)<.001)throw Error('silence');
     const bytes=pcm16(samples);
     for(let start=0;start<bytes.length;start+=24000){let binary='';for(const b of bytes.subarray(start,start+24000))binary+=String.fromCharCode(b);ws.send(JSON.stringify({type:'audio',audio:btoa(binary)}));}
     ws.send(JSON.stringify({type:'commit'}));setStatus('Tutor is responding…');
    }catch{setWaiting(false);setStatus('No usable short recording. Please try again.');}
   };
   r.start();setRecording(true);setStatus('Recording · up to 10 seconds. Press Stop when finished.');recordTimer.current=setTimeout(()=>{if(r.state==='recording')r.stop();},10000);
  }catch{media.current?.getTracks().forEach(t=>t.stop());media.current=null;recorder.current=null;setStatus('Microphone was not available. You can type your question.');}
 }
 return <section className="voice-demo" aria-label="Short voice demo">
  <div className="voice-demo-intro"><h2>A small fruit lesson</h2><p>Up to 2 minutes · 3 turns · speak or type</p><button aria-pressed={showEnglish} onClick={()=>setShowEnglish(v=>!v)}>EN · {showEnglish?'Hide meanings':'Show meanings'}</button></div>
  <div className="voice-fruit-cards">{demoFruits.filter(f=>ids.includes(f[0])).map(f=><article key={f[0]}><strong lang="zh-Hans">{f[1]}</strong><span>{f[2]}</span><small hidden={!showEnglish}>{f[3]}</small></article>)}</div>
  <p className="voice-example"><span lang="zh-Hans">三根香蕉</span><span>sān gēn xiāngjiāo</span><small hidden={!showEnglish}>three bananas</small></p>
  <div className="voice-demo-controls">{!connected?<button className="primary" disabled={!availability?.ready} onClick={()=>void connect()}>Start short conversation</button>:<><span>{seconds}s · {turns} turns left</span><button onClick={()=>{socket.current?.send(JSON.stringify({type:'stop'}));disconnect();setStatus('Conversation stopped.');}}>End conversation</button></>}</div>
  <p className="voice-status" role="status">{status}</p>
  {!connected&&<p className="voice-privacy">When enabled, recording sends your voice to Qwen in Beijing. Recording starts only when you press Record. This demo does not score pronunciation.</p>}
  <div className="voice-conversation"><div className="voice-reply" aria-live="polite">{reply||'Try: “Practise fruit names with me”, “Show me more fruits”, or “How do I say three bananas?”'}</div><div className="voice-input"><input aria-label="Message to the tutor" maxLength={300} placeholder="Type to your tutor…" value={text} disabled={!connected||waiting||recording||turns<1} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')sendText();}}/><button disabled={!connected||waiting||recording||turns<1||!text.trim()} onClick={sendText}>Send</button><button disabled={!connected||waiting||turns<1} onClick={()=>{if(recording)recorder.current?.stop();else void startRecording();}}>{recording?'Stop recording':'● Record'}</button></div></div>
  {!availability?.ready&&<p className="voice-unavailable">The cards are a preview; no AI call is running. The connection needs a separately approved Realtime key and a protected test session.</p>}
 </section>;
}
