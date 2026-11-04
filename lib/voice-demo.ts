import {demoFruits,validatedFruitIds} from '../app/voice-demo-model';
type Env={QWEN_REALTIME_API_KEY?:string;QWEN_REALTIME_WORKSPACE?:string;VOICE_DEMO_ALLOWED_USER_ID?:string;VOICE_DEMO_EXPIRES_AT?:string;VOICE_DEMO_FREE_ONLY_CONFIRMED?:string};
export const voiceModel='qwen3.8-omni-flash-realtime';
export function voiceDemoReadiness(request:Request,env:Env,now=Date.now()){
 const expiry=Date.parse(env.VOICE_DEMO_EXPIRES_AT??'');
 const configured=!!env.QWEN_REALTIME_API_KEY&&/^ws-[a-z0-9]+$/.test(env.QWEN_REALTIME_WORKSPACE??'')&&!!env.VOICE_DEMO_ALLOWED_USER_ID&&env.VOICE_DEMO_FREE_ONLY_CONFIRMED==='1'&&expiry>now&&expiry<=now+60*60*1000;
 const authorized=!!env.VOICE_DEMO_ALLOWED_USER_ID&&request.headers.get('oai-authenticated-user-id')===env.VOICE_DEMO_ALLOWED_USER_ID;
 return {ready:configured&&authorized,configured,authorized,seconds:120,turns:3};
}
const limits={audioIn:16000*2*30,audioOut:24000*2*30};
const base64Bytes=(s:string)=>Math.floor(s.length*3/4)-(s.endsWith('==')?2:s.endsWith('=')?1:0);
let active=false;
export async function handleVoiceDemo(request:Request,env:Env):Promise<Response>{
 const state=voiceDemoReadiness(request,env),url=new URL(request.url);
 if(url.pathname==='/api/voice-demo/status')return Response.json(state,{headers:{'Cache-Control':'no-store'}});
 if(!state.ready)return Response.json({error:'Voice demo is not enabled for this account.'},{status:403,headers:{'Cache-Control':'no-store'}});
 if(request.headers.get('Origin')!==url.origin)return new Response('Origin not allowed',{status:403});
 if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
 if(active)return new Response('A demo is already running. Please try again later.',{status:429});
 active=true;
 let upstream:WebSocket;
 try{
  const response=await fetch(`https://${env.QWEN_REALTIME_WORKSPACE}.cn-beijing.maas.aliyuncs.com/api-ws/v1/realtime?model=${voiceModel}`,{headers:{Upgrade:'websocket',Authorization:'Bearer '+env.QWEN_REALTIME_API_KEY},signal:AbortSignal.timeout(15000)});
  if(!response.webSocket)throw Error('Connection unavailable');upstream=response.webSocket;upstream.accept();
 }catch{active=false;return new Response('Voice connection unavailable. No fallback was used.',{status:503});}
 const pair=new WebSocketPair(),client=pair[0],server=pair[1];server.accept();
 let closed=false,ready=false,busy=false,turns=0,inBytes=0,outBytes=0,toolCalls=0,pendingAudio=0,toolPending=false;
 const send=(v:unknown)=>{if(!closed)try{server.send(JSON.stringify(v));}catch{}};
 const finish=(reason:string)=>{if(closed)return;send({type:'demo.ended',reason});closed=true;active=false;clearTimeout(timer);try{upstream.close(1000,'Demo ended');}catch{}try{server.close(1000,'Demo ended');}catch{}};
 const timer=setTimeout(()=>finish('Two-minute demo finished.'),120000);
 const up=(v:unknown)=>{if(!closed)try{upstream.send(JSON.stringify(v));}catch{finish('Connection interrupted.');}};
 const session={modalities:['text','audio'],turn_detection:null,audio:{input:{format:{type:'pcm',sample_rate:16000,sample_format:'s16le',channels:1,packing:'interleaved',channel_layout:'mono'}},output:{voice:'longanlingxin',format:{type:'pcm',sample_rate:24000}}},instructions:'You are a concise Mandarin tutor. Help an adult practise fruit names and short sentences. Speak slowly in Mandarin, explain briefly in Polish or English when asked. Ask one question at a time. Keep spoken replies under 8 seconds. Do not claim to assess tones. Use show_fruits when the user asks to collect, add or change the visible fruits; include all desired visible IDs. Only the supplied catalogue is available. Three bananas is 三根香蕉 (sān gēn xiāngjiāo). Fried banana may mean 炸香蕉 (zhá xiāngjiāo) or pan-fried 煎香蕉 (jiān xiāngjiāo); clarify. Catalogue: '+JSON.stringify(demoFruits),tools:[{type:'function',name:'show_fruits',description:'Replace the visible practice cards with selected catalogue fruits.',parameters:{type:'object',properties:{ids:{type:'array',items:{type:'string',enum:demoFruits.map(f=>f[0])},minItems:1,maxItems:15}},required:['ids'],additionalProperties:false}}]};
 upstream.addEventListener('message',event=>{
  if(closed||typeof event.data!=='string')return;
  try{
   const e=JSON.parse(event.data);
   if(e.type==='session.created'){up({type:'session.update',session});return;}
   if(e.type==='session.updated'){ready=true;send({type:'demo.ready',seconds:120,turns:3});return;}
   if(e.type==='error'){finish('The voice service returned an error. Please try again later.');return;}
   if(e.type==='response.audio.delta'){
    if(typeof e.delta!=='string'||e.delta.length>150000){finish('Unexpected audio response.');return;}
    outBytes+=base64Bytes(e.delta);if(outBytes>limits.audioOut){finish('Audio allowance reached.');return;}send({type:e.type,delta:e.delta});
   }else if(e.type==='response.audio_transcript.delta'||e.type==='response.text.delta'){if(typeof e.delta==='string')send({type:'demo.text',delta:e.delta.slice(0,4000)});}
   else if(e.type==='response.output_item.done'&&e.item?.type==='function_call'){
    if(++toolCalls>4){finish('Demo action allowance reached.');return;}
    let ids:string[]|null=null;try{ids=e.item.name==='show_fruits'?validatedFruitIds(JSON.parse(e.item.arguments).ids):null;}catch{}
    if(ids)send({type:'demo.cards',ids});
    up({type:'conversation.item.create',item:{type:'function_call_output',call_id:e.item.call_id,output:JSON.stringify(ids?{shown:ids}:{error:'Unsupported card selection'})}});toolPending=true;
   }else if(e.type==='response.done'){
    if(toolPending){toolPending=false;up({type:'response.create'});}else{busy=false;send({type:'demo.done',turnsRemaining:3-turns});}
   }
  }catch{finish('Unexpected voice-service response.');}
 });
 server.addEventListener('message',event=>{
  if(closed||typeof event.data!=='string'||event.data.length>50000){finish('Unexpected input.');return;}
  try{
   const e=JSON.parse(event.data);
   if(e.type==='stop'){finish('Conversation stopped.');return;}
   if(!ready||busy||turns>=3)return;
   if(e.type==='audio'&&typeof e.audio==='string'&&e.audio.length>0&&e.audio.length%4===0&&/^[A-Za-z0-9+/]*={0,2}$/.test(e.audio)){
    const bytes=base64Bytes(e.audio);inBytes+=bytes;pendingAudio+=bytes;
    if(inBytes>limits.audioIn||pendingAudio>320000){finish('Recording allowance reached.');return;}
    up({type:'input_audio_buffer.append',audio:e.audio});
   }else if(e.type==='commit'&&pendingAudio>=3200){pendingAudio=0;turns++;busy=true;up({type:'input_audio_buffer.commit'});up({type:'response.create'});}
   else if(e.type==='text'&&typeof e.text==='string'&&e.text.trim().length>0&&e.text.length<=300){turns++;busy=true;up({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text:e.text}]}});up({type:'response.create'});}
  }catch{finish('Unexpected input.');}
 });
 server.addEventListener('close',()=>finish('Conversation closed.'));server.addEventListener('error',()=>finish('Connection interrupted.'));
 upstream.addEventListener('close',()=>finish('Voice service disconnected.'));upstream.addEventListener('error',()=>finish('Voice service disconnected.'));
 return new Response(null,{status:101,webSocket:client});
}
