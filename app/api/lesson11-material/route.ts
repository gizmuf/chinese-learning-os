import {lesson11Materials} from '../../lesson11-materials';
export const dynamic='force-dynamic';
type Material=typeof lesson11Materials[number];
const headers=(file:Material)=>({
 'Content-Type':'application/pdf',
 'Content-Disposition':`attachment; filename="${file.filename}"`,
 'Content-Length':String(file.bytes),
 'Cache-Control':'public, max-age=3600',
 'X-Content-Type-Options':'nosniff',
 ETag:`"${file.sha256}"`,
});
async function document(request:Request,file:Material){
 const key=new Request(new URL('/api/lesson11-material?sha256='+file.sha256,request.url));
 const cache=(globalThis.caches as (CacheStorage&{default?:Cache})|undefined)?.default;
 try{const cached=await cache?.match(key);if(cached)return cached;}catch{/* Cache availability must not prevent a verified download. */}
 const upstream=await fetch('https://raw.githubusercontent.com/gizmuf/chinese-learning-os/'+file.commit+'/'+file.path,{signal:AbortSignal.timeout(30000)});
 if(!upstream.ok)throw Error('Material source unavailable');
 const declared=upstream.headers.get('Content-Length');
 if(declared!==null&&Number(declared)!==file.bytes)throw Error('Unexpected material size');
 const bytes=await upstream.arrayBuffer();
 if(bytes.byteLength!==file.bytes||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('Invalid material');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
 if(hash!==file.sha256)throw Error('Unexpected material revision');
 const response=new Response(bytes,{headers:headers(file)});
 try{await cache?.put(key,response.clone());}catch{/* The immutable upstream remains the source of truth. */}
 return response;
}
export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get('file');
 const file=lesson11Materials.find(row=>row.id===id);
 if(!file)return Response.json({error:'Unknown lesson material.'},{status:404,headers:{'Cache-Control':'no-store'}});
 if(request.headers.get('If-None-Match')===`"${file.sha256}"`)return new Response(null,{status:304,headers:{ETag:`"${file.sha256}"`,'Cache-Control':'public, max-age=3600'}});
 try{return await document(request,file);}
 catch{return Response.json({error:'Could not download this PDF. Please try again.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
export async function HEAD(request:Request){
 const response=await GET(request);
 await response.body?.cancel();
 return new Response(null,{status:response.status,headers:response.headers});
}
