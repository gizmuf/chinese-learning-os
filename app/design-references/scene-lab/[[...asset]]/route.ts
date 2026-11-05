import manifest from '../../../../data/scene-lab-assets.json';
export const dynamic='force-dynamic';
type Context={params:Promise<{asset?:string[]}>|{asset?:string[]}};
type Asset={bytes:number;sha256:string;type:string};
const files=manifest.files as Record<string,Asset>;
/** Same-origin, immutable approved demo assets; HK serves the same prefix statically. */
export async function GET(request:Request,context:Context){
 const parts=(await context.params).asset??[],path=parts.length?parts.join('/'):'index.html';
 if(parts.some(p=>!p||p==='.'||p==='..'||p.includes('\\'))||path.length>200||!Object.hasOwn(files,path))return new Response('Not found',{status:404});
 const file=files[path],etag='"'+file.sha256+'"',common={'Content-Type':file.type,'Cache-Control':'public, max-age=3600',ETag:etag,'X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
 if(request.headers.get('If-None-Match')===etag&&!request.headers.has('Range'))return new Response(null,{status:304,headers:{ETag:etag,'Cache-Control':common['Cache-Control']}});
 const cache=(globalThis.caches as (CacheStorage&{default?:Cache})|undefined)?.default,key=new Request(new URL('/design-references/scene-lab/_cache?sha256='+file.sha256,request.url));
 try{
  let response:Response|undefined;try{response=await cache?.match(key);}catch{}
  if(!response){
   const upstream=await fetch('https://raw.githubusercontent.com/gizmuf/chinese-learning-os/'+manifest.asset_commit+'/resources/scene-lab/'+path,{signal:AbortSignal.timeout(30000)});
   if(!upstream.ok)throw Error('Asset unavailable');
   const bytes=await upstream.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
   if(bytes.byteLength!==file.bytes||hash!==file.sha256)throw Error('Asset revision mismatch');
   response=new Response(bytes,{headers:{...common,'Content-Length':String(file.bytes)}});try{await cache?.put(key,response.clone());}catch{}
  }
  const range=request.headers.get('Range');if(!range)return new Response(response.body,{status:response.status,headers:new Headers(response.headers)});
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+file.bytes}});
  const start=match[1]?Number(match[1]):Math.max(0,file.bytes-Number(match[2])),end=match[1]?(match[2]?Math.min(file.bytes-1,Number(match[2])):file.bytes-1):file.bytes-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=file.bytes)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+file.bytes}});
  const bytes=await response.arrayBuffer(),headers=new Headers(response.headers);headers.set('Content-Range',`bytes ${start}-${end}/${file.bytes}`);headers.set('Content-Length',String(end-start+1));return new Response(bytes.slice(start,end+1),{status:206,headers});
 }catch{return new Response('Experiment temporarily unavailable. Please try again.',{status:503,headers:{'Cache-Control':'no-store'}});}
}
export async function HEAD(request:Request,context:Context){const r=await GET(request,context);await r.body?.cancel();return new Response(null,{status:r.status,headers:r.headers});}
