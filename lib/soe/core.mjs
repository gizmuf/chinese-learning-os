export function interpret(message, expected) {
 if(message.code!==0 || message.final!==1) throw Error('No successful final result');
 const r=message.result;
 if(!r || !Array.isArray(r.Words)) throw Error('Missing structured result');
 const aligned=r.Words.map(w=>w.Word).join('')===expected;
 const words=r.Words.map(w=>{
  const t=w.Tone, ref=t?.RefTone, heard=t?.HypothesisTone;
  const valid=aligned && w.MatchTag===0 && t?.Valid===true && [1,2,3,4].includes(ref) && [1,2,3,4].includes(heard);
  return {hanzi:w.Word,expected:valid?ref:null,heard:valid?heard:null,status:valid?(ref===heard?'match':'review'):'uncertain'};
 });
 const score=typeof r.SuggestedScore==='number' && Number.isFinite(r.SuggestedScore) && r.SuggestedScore>=0 && r.SuggestedScore<=100?r.SuggestedScore:null;
 return {source:'tencent-audio',score:aligned?score:null,words,uncertain:!aligned || words.some(w=>w.status==='uncertain'),toneCoverage:words.filter(w=>w.status!=='uncertain').length,total:words.length};
}
export function validatePCM(bytes) {
 if(bytes.length<16000 || bytes.length>960000 || bytes.length%2) throw Error('Use 0.5–30 seconds of 16 kHz mono PCM16');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let energy=0,clipped=0;
 for(let i=0;i<bytes.length;i+=2){const s=v.getInt16(i,true)/32768;energy+=s*s;if(Math.abs(s)>.99)clipped++;}
 if(Math.sqrt(energy/(bytes.length/2))<.003)throw Error('Recording is too quiet. Try again.');
 if(clipped/(bytes.length/2)>.1)throw Error('Recording is clipped. Move away from the microphone.');
}
export async function signedURL(config, text, now=Math.floor(Date.now()/1000), voiceId=crypto.randomUUID()) {
 if(!/^\d+$/.test(config.appId))throw Error('Invalid AppID');
 const p={eval_mode:1,expired:now+90,nonce:crypto.getRandomValues(new Uint32Array(1))[0],rec_mode:1,ref_text:'{::cmd{F_TDET=true}}'+text,score_coeff:4,secretid:config.secretId,sentence_info_enabled:0,server_engine_type:'16k_zh',timestamp:now,voice_format:0,voice_id:voiceId};
 const entries=Object.entries(p).sort(([a],[b])=>a.localeCompare(b,'en'));
 const path='soe.cloud.tencent.com/soe/api/'+config.appId;
 const raw=path+'?'+entries.map(([k,v])=>k+'='+v).join('&');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(config.secretKey),{name:'HMAC',hash:'SHA-1'},false,['sign']);
 const signature=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw)))));
 return 'https://'+path+'?'+new URLSearchParams([...entries.map(([k,v])=>[k,String(v)]),['signature',signature]]);
}
// Worker transport: credentials and signed URL never leave the server.
export async function evaluate(config, text, pcm, connect=fetch) {
 const response=await connect(await signedURL(config,text),{headers:{Upgrade:'websocket'},signal:AbortSignal.timeout(15000)});
 const ws=response.webSocket;
 if(!ws)throw Error('Provider connection failed');
 ws.accept();
 return await new Promise((resolve,reject)=>{
  let sent=false, latest, settled=false;
  const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);try{ws.close();}catch{} error?reject(error):resolve(value);};
  const timer=setTimeout(()=>finish(Error('Provider timeout')),45000);
  ws.addEventListener('error',()=>finish(Error('Provider connection failed')));
  ws.addEventListener('close',()=>finish(Error('Provider closed before final result')));
  ws.addEventListener('message',event=>{
   try {
    const m=JSON.parse(event.data);
    if(m.code!==0)throw Error([4105,4108].includes(m.code)?'No reliable speech detected. Try again.':'Provider evaluation failed ('+m.code+')');
    if(!sent){sent=true;ws.send(pcm);ws.send(JSON.stringify({type:'end'}));}
    if(m.result && typeof m.result==='object')latest=m.result;
    if(m.final===1)finish(null,interpret({...m,result:m.result??latest},text));
   }catch(e){finish(e);}
  });
 });
}
export function accessPolicy(config,userId){
 if(config.SOE_PAID_ENABLED!=='true')return {status:503,error:'Real audio evaluation is disabled. No paid request was made.'};
 if(!config.SOE_ALLOWED_USER_ID || userId!==config.SOE_ALLOWED_USER_ID)return {status:403,error:'This experiment is restricted to its authorized tester.'};
 if(!config.TENCENT_APP_ID||!config.TENCENT_SECRET_ID||!config.TENCENT_SECRET_KEY)return {status:503,error:'Tencent is not configured.'};
 return null;
}
