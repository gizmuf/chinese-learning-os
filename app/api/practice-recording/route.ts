import recordings from '../../../data/practice-recordings.json';
export const dynamic='force-dynamic';
type Clip={text:string;file:string;sha256:string;bytes:number;commit:string};
const clips=recordings as Record<string,Clip>;
export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get('file')??'',clip=/^[a-f0-9]{64}$/.test(id)?clips[id]:undefined;
 if(!clip)return new Response('Unknown recording',{status:404});
 const key=new Request(new URL('/api/practice-recording?sha256='+clip.sha256,request.url));
 const cache=(globalThis.caches as (CacheStorage&{default?:Cache})|undefined)?.default;
 try{
  let response:Response|undefined;
  try{response=await cache?.match(key);}catch{}
  if(!response){
   const upstream=await fetch('https://raw.githubusercontent.com/gizmuf/chinese-learning-os/'+clip.commit+'/resources/practice-audio/'+clip.file,{signal:AbortSignal.timeout(30000)});
   if(!upstream.ok)throw Error('Recording unavailable');
   const bytes=await upstream.arrayBuffer();
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
   if(bytes.byteLength!==clip.bytes||hash!==clip.sha256)throw Error('Recording revision mismatch');
   response=new Response(bytes,{headers:{'Content-Type':'audio/mpeg','Content-Length':String(bytes.byteLength),'Cache-Control':'public, max-age=31536000, immutable',ETag:'"'+clip.sha256+'"','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'}});
   try{await cache?.put(key,response.clone());}catch{}
  }
  const range=request.headers.get('Range');
  if(!range)return response;
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+clip.bytes}});
  const start=match[1]?Number(match[1]):Math.max(0,clip.bytes-Number(match[2]));
  const end=match[1]?(match[2]?Math.min(clip.bytes-1,Number(match[2])):clip.bytes-1):clip.bytes-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=clip.bytes)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+clip.bytes}});
  const bytes=await response.arrayBuffer(),headers=new Headers(response.headers);headers.set('Content-Range',`bytes ${start}-${end}/${clip.bytes}`);headers.set('Content-Length',String(end-start+1));
  return new Response(bytes.slice(start,end+1),{status:206,headers});
 }catch{return new Response('Recording unavailable; please try again.',{status:503,headers:{'Cache-Control':'no-store'}});}
}
export async function HEAD(request:Request){const r=await GET(request);await r.body?.cancel();return new Response(null,{status:r.status,headers:r.headers});}
