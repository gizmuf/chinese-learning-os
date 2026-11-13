import { env } from 'cloudflare:workers';
import { getRequestUser } from '../../request-user';
import { evaluate, validatePCM, accessPolicy } from '../../../lib/soe/core.mjs';
import { sentences } from '../../../lib/soe/sentences.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function POST(request:Request){
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid origin'},403);
 const user=await getRequestUser();if(!user)return reply({error:'Sign in to Chinese OS first.'},401);
 const e=env as unknown as Record<string,string>;
 const denied=accessPolicy(e,user.userId);if(denied)return reply({error:denied.error},denied.status);
 const sentence=sentences.find(s=>s.id===new URL(request.url).searchParams.get('sentence'));
 if(!sentence)return reply({error:'Unknown sentence'},400);
 if(request.headers.get('content-type')!=='application/octet-stream')return reply({error:'PCM16 required'},415);
 // Enforce a limit even when Content-Length is absent or dishonest.
 const reader=request.body?.getReader();if(!reader)return reply({error:'No audio'},400);
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>960000){await reader.cancel();return reply({error:'Maximum recording: 30 seconds'},413);}chunks.push(value);}
 const audio=new Uint8Array(size);let offset=0;for(const chunk of chunks){audio.set(chunk,offset);offset+=chunk.length;}
 try{validatePCM(audio);}catch(error){return reply({error:(error as Error).message},422);}
 // Atomic lifetime allowance: no retries/refunds; a failed provider attempt consumes one slot.
 const db=env.DB;if(!db)return reply({error:"Experiment database is unavailable."},503);
 try{
  const result=await db.prepare('UPDATE soe_experiment_budget SET used=used+1 WHERE id=1 AND used<max_calls RETURNING used').first();
  if(!result)return reply({error:'Experiment budget exhausted. No paid request made.'},429);
 }catch{return reply({error:'Experiment budget has not been provisioned.'},503);}
 try{
  const result=await evaluate({appId:e.TENCENT_APP_ID,secretId:e.TENCENT_SECRET_ID,secretKey:e.TENCENT_SECRET_KEY},sentence.hanzi,audio);
  return reply(result);
 }catch(error){
  // Never return signed URL, provider raw payload, or credential-bearing transport errors.
  const message=(error as Error).message;
  return reply({error:message.startsWith('No reliable speech')?message:'Evaluation unavailable. Try again later; no automatic retry was made.'},502);
 }
}
