import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {indexedDB} from 'fake-indexeddb';
const bundled=await build({stdin:{contents:`export * from './app/grammar-hsk3-data';export * from './app/grammar-hsk3-learning';export * from './app/course-learning';export * from './app/course-persistence';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
globalThis.indexedDB=indexedDB;
const first=m.grammarQuestions[0].ex;
const event=(patch={})=>({...m.grammarReviewEvent(first.id,first.answer,false),...patch});
const open=()=>m.openCourseStore(crypto.randomUUID());
test('114 authored IDs use the shared registry; invalid lesson, activity and kind are rejected',()=>{
 assert.equal(m.grammarQuestions.length,114);assert.equal(new Set(m.grammarActivityIds).size,114);
 for(const {ex} of m.grammarQuestions)assert.ok(m.courseEventSchema.safeParse(m.grammarReviewEvent(ex.id,ex.answer,false)).success);
 for(const patch of [{lessonId:'intensive-03'},{activityId:'unknown'},{activityId:'study:'+first.id},{kind:'writing'},{correct:null}])assert.equal(m.courseEventSchema.safeParse(event(patch)).success,false);
 assert.throws(()=>m.grammarReviewEvent(first.id,-1,false));
});
test('new, due and future reviews reuse course FSRS; assisted and duplicate events earn no extra credit',()=>{
 const e=event({at:Date.UTC(2026,9,27)});
 assert.equal(m.grammarReviewQueue([]).unseen.length,114);
 assert.equal(m.grammarReviewQueue([{...e,assisted:true}]).unseen.length,114);
 assert.deepEqual(m.courseCards([{...e,assisted:true}]),{});
 assert.equal(m.courseCards([e,e])[e.activityId].reps,1);
 const due=new Date(m.courseCards([e])[e.activityId].due).getTime();
 assert.equal(m.grammarReviewQueue([e],due-1).due.length,0);
 assert.equal(m.grammarReviewQueue([e],due).due[0].ex.id,e.activityId);
 assert.equal(m.grammarReviewQueue([e],due).unseen.length,113);
 assert.equal(m.courseSummary([e]).attempted,0);
 assert.equal(m.grammarReviewQueue([{...e,lessonId:'intensive-03'}]).unseen.length,114);
});
test('IndexedDB persists offline results, deduplicates retry UUIDs and survives reopen',async()=>{
 const owner=crypto.randomUUID(),db=await m.openCourseStore(owner),e=event();
 const session=m.courseSession(db,owner,()=>true,async()=>{throw Error('offline');});
 await session.record(e);await session.record(e);
 await assert.rejects(session.sync());assert.equal((await m.readCourseEvents(db)).length,1);
 assert.equal((await m.readCourseEvents(db))[0].synced,false);
 session.dispose();const reopened=await m.openCourseStore(owner);
 assert.equal((await m.readCourseEvents(reopened))[0].activityId,first.id);reopened.close();
});
test('sync uploads once, merges a second device, deduplicates remote replay and retries offline',async()=>{
 const db=await open(), remote=event(), local=event(), server=new Map([[remote.id,remote]]),requests=[];
 let offline=true;
 const session=m.courseSession(db,'alice',()=>true,async(url,init,owner)=>{
  requests.push({url,owner});if(offline)throw Error('offline');
  if(init.method==='POST'){for(const e of JSON.parse(init.body).events)if(!server.has(e.id))server.set(e.id,e);return Response.json({accepted:[local.id]});}
  return Response.json({events:[...server.values()]});
 });
 await session.record(local);await assert.rejects(session.sync());offline=false;
 let result=await session.sync();assert.equal(result.length,2);assert.ok(result.every(e=>e.synced));
 result=await session.sync();assert.equal(result.length,2);assert.equal(server.size,2);
 assert.ok(requests.every(r=>r.owner==='alice'));assert.match(requests.at(-1).url,/lessons=all/);
 assert.equal(m.courseCards(result)[local.activityId].reps,2);session.dispose();
});
test('owner-separated databases, guests and stale sessions cannot write or sync another account',async()=>{
 const a=await open(),b=await open(),guest=await open(),e=event();
 let active=true,calls=0;
 const session=m.courseSession(a,'alice',()=>active,async()=>{calls++;return Response.json({events:[]});});
 await session.record(e);assert.equal((await m.readCourseEvents(b)).length,0);assert.equal((await m.readCourseEvents(guest)).length,0);
 active=false;await assert.rejects(session.record(event()));assert.equal(await session.sync(),null);assert.equal(calls,0);
 const gs=m.courseSession(guest,null,()=>true,async()=>{throw Error('Guest network call');});
 await gs.record(e);assert.equal(await gs.sync(),null);
 assert.equal((await m.readCourseEvents(guest)).length,1);session.dispose();gs.dispose();b.close();
});
test('changing account while a POST is in flight stops acknowledgement and subsequent GET',async()=>{
 const db=await open();let active=true,resolve,calls=0;
 const session=m.courseSession(db,'alice',()=>active,async()=>{calls++;return await new Promise(r=>resolve=r);});
 await session.record(event());const syncing=session.sync();
 while(!resolve)await new Promise(r=>setTimeout(r,0));
 active=false;resolve(Response.json({accepted:[]}));await assert.rejects(syncing,/Account changed/);
 assert.equal(calls,1);assert.equal((await m.readCourseEvents(db))[0].synced,false);session.dispose();
});
test('changing account during remote JSON decoding never imports stale remote history',async()=>{
 const db=await open();let active=true,resolve;
 const session=m.courseSession(db,'alice',()=>active,async()=>({ok:true,json:()=>new Promise(r=>resolve=r)}));
 const syncing=session.sync();while(!resolve)await new Promise(r=>setTimeout(r,0));
 active=false;resolve({events:[event()]});await assert.rejects(syncing,/Account changed/);
 assert.equal((await m.readCourseEvents(db)).length,0);session.dispose();
});
