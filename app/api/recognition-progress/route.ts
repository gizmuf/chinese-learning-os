import {getRequestUser} from '../../request-user';
import {getDb} from '../../../db';
import {recognitionEvents} from '../../../db/schema';
import {and,eq,inArray} from 'drizzle-orm';
import {z} from 'zod';
import {recognitionAttemptSchema,sameRecognitionAttempt} from '../../recognition-history';
export const dynamic='force-dynamic';const headers={'Cache-Control':'no-store'};
export async function GET(){const user=await getRequestUser();if(!user)return Response.json({error:'Please sign in.'},{status:401,headers});const rows=await getDb().select({payload:recognitionEvents.payload}).from(recognitionEvents).where(eq(recognitionEvents.userId,user.userId));return Response.json({events:rows.map(row=>JSON.parse(row.payload))},{headers})}
export async function POST(request:Request){
 const user=await getRequestUser();if(!user)return Response.json({error:'Please sign in.'},{status:401,headers});if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid origin.'},{status:403,headers});
 if(Number(request.headers.get('content-length')??0)>100000)return Response.json({error:'Upload too large.'},{status:413,headers});let parsed;
 try{const body=await request.text();if(body.length>100000)return Response.json({error:'Upload too large.'},{status:413,headers});parsed=z.object({events:z.array(recognitionAttemptSchema).max(20)}).strict().safeParse(JSON.parse(body))}catch{return Response.json({error:'Invalid JSON.'},{status:400,headers})}
 if(!parsed.success||parsed.data.events.some(e=>e.at>Date.now()+300000))return Response.json({error:'Invalid recognition event.'},{status:400,headers});const events=parsed.data.events;
 if(new Set(events.map(e=>e.id)).size!==events.length)return Response.json({error:'Duplicate event IDs in batch.'},{status:400,headers});
 if(events.length){const db=getDb(),condition=and(eq(recognitionEvents.userId,user.userId),inArray(recognitionEvents.id,events.map(e=>e.id)));const previous=await db.select().from(recognitionEvents).where(condition);if(previous.some(row=>!sameRecognitionAttempt(JSON.parse(row.payload),events.find(e=>e.id===row.id)!)))return Response.json({error:'Event ID conflict.'},{status:409,headers});
 await db.insert(recognitionEvents).values(events.map(event=>({userId:user.userId,id:event.id,at:event.at,payload:JSON.stringify(event)}))).onConflictDoNothing();const stored=await db.select().from(recognitionEvents).where(condition);if(stored.some(row=>!sameRecognitionAttempt(JSON.parse(row.payload),events.find(e=>e.id===row.id)!)))return Response.json({error:'Event ID conflict.'},{status:409,headers});}
 return Response.json({accepted:events.map(e=>e.id)},{headers});
}
