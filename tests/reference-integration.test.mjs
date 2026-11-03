import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {indexedDB} from 'fake-indexeddb';
const b=await build({stdin:{contents:`export * from './app/reference-lessons-data';export * from './app/reference-lesson-review';export * from './app/course-learning';export * from './app/course-review-model';export * from './app/course-persistence';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const now=1800000000000;let n=0;
const event=(lesson,patch={})=>({id:'00000000-0000-4000-8000-'+String(++n).padStart(12,'0'),lessonId:m.referenceLessonEventIds[lesson.id],activityId:lesson.checks[0].id,kind:'answer',correct:true,assisted:false,at:now,...patch});
test('all 17 source pages have complete, internally consistent references and unique independent checks',()=>{
 const shas=['eb4fff3e611b0163b55d45a53a87221ffdcaff46943dc1789cb84cdf7bf2e72f','eec3672166efd67651cf9ef4441c1b4b9ecd4ccbe6b4cafc700155876d22454c','f80157217ac781b6b01435b24ff5d5d8679943e39ee98f0b950ad4827ca187cb'];const globalIds=new Set();
 for(const [i,lesson] of m.referenceLessons.entries()){
  assert.equal(lesson.source.sha256,shas[i]);assert.equal(lesson.source.pages,[10,3,4][i]);assert.deepEqual(lesson.coverage.map(x=>x.page),Array.from({length:lesson.source.pages},(_,i)=>i+1));
  const entries=new Map([...lesson.terms,...lesson.examples].map(x=>[x.id,x])),topics=new Map(lesson.topics.map(x=>[x.id,x]));const referenced=new Set(),checks=new Set();
  for(const row of [...entries.values(),...lesson.topics,...lesson.checks]){assert.ok(!globalIds.has(row.id),row.id);globalIds.add(row.id);assert.ok(row.sourcePages.length);assert.ok(row.sourcePages.every(p=>p>=1&&p<=lesson.source.pages));}
  for(const page of lesson.coverage)for(const id of page.topicIds){assert.ok(topics.has(id));assert.ok(topics.get(id).sourcePages.includes(page.page));}
  for(const topic of lesson.topics)for(const id of [...topic.termIds,...topic.exampleIds]){assert.ok(entries.has(id),id);referenced.add(id);}
  for(const entry of entries.values()){assert.ok(referenced.has(entry.id),entry.id);assert.ok(entry.hanzi&&entry.pinyin&&entry.en);if(entry.origin==='practice')assert.ok(entry.note);}
  for(const check of lesson.checks){assert.ok(entries.has(check.targetId));assert.equal(new Set(check.optionIds).size,check.optionIds.length);if(check.kind!=='pinyin'){assert.equal(check.optionIds.filter(id=>id===check.targetId).length,1);assert.ok(check.optionIds.every(id=>entries.has(id)));}const key=check.kind+':'+check.targetId;assert.ok(!checks.has(key),key);checks.add(key);}
 }
 const scenes=m.referenceLessons[1].checks.filter(x=>x.scene);assert.equal(scenes.length,12);
 for(const check of scenes){const target=m.referenceEntryById.get(check.targetId).hanzi;assert.ok(check.optionIds.some(id=>m.referenceEntryById.get(id).hanzi===target.slice(0,-1)+(target.endsWith('来')?'去':'来')));}
 assert.equal(m.referenceLessons[0].checks.filter(x=>x.kind==='pinyin').length,10);
 assert.ok(!m.referenceLessons[2].checks.some(x=>m.referenceEntryById.get(x.targetId).hanzi==='上声'));
 assert.equal(m.referenceWordOccurs('十一月三号','一月'),false);assert.equal(m.referenceWordOccurs('一月三号','一月'),true);
});
test('reference schema, UUID replay and review dates stay isolated from the eight numeric lessons',()=>{
 for(const lesson of m.referenceLessons){const e=event(lesson,{correct:false});assert.ok(m.courseEventSchema.safeParse(e).success);assert.ok(!m.courseEventSchema.safeParse({...e,activityId:'unknown'}).success);const other=m.referenceLessons.find(x=>x!==lesson);assert.ok(!m.courseEventSchema.safeParse({...e,activityId:other.checks[0].id}).success);
 const study=event(lesson,{activityId:'study:'+lesson.topics[0].id,kind:'study',correct:null,assisted:true});assert.ok(m.courseEventSchema.safeParse(study).success);assert.ok(!m.courseEventSchema.safeParse({...study,assisted:false}).success);
 const result=m.referenceReviewSummary([e,e,study,{...e,id:crypto.randomUUID(),assisted:true}],lesson,now);assert.equal(result.attempted,1);assert.equal(result.difficult.length,1);assert.equal(result.due.length,0);assert.ok(result.nextDue>now);assert.equal(m.referenceReviewSummary([e],lesson,result.nextDue).due.length,1);
 assert.deepEqual(m.courseCards([e,e]),m.courseCards([e]));assert.equal(m.courseReviewSummary([e],now).attempted,0);
 }
 assert.deepEqual(m.reviewableCourseLessons.map(x=>x.number),[3,4,5,6,7,8,9,10]);
});
test('actual indexedDB record-sync-hydrate preserves all reference IDs and separates owners and disposed sessions',async()=>{
 globalThis.indexedDB=indexedDB;const server=new Map();
 const fetcher=async(url,init,owner)=>{if(init.method==='POST'){server.set(owner,[...(server.get(owner)??[]),...JSON.parse(init.body).events]);return new Response('{}');}return new Response(JSON.stringify({events:server.get(owner)??[]}));};
 const owner='reference-a-'+crypto.randomUUID(),db=await m.openCourseStore(owner),session=m.courseSession(db,owner,()=>true,fetcher),events=m.referenceLessons.map(x=>event(x));
 for(const e of events)await session.record(e);await session.record(events[0]);assert.equal((await m.readCourseEvents(db)).length,3);
 const synced=await session.sync();assert.equal(synced.length,3);assert.ok(synced.every(e=>e.synced));session.dispose();await assert.rejects(session.record(events[0]),/Account changed/);
 const hydrated=await m.openCourseStore(owner);assert.deepEqual((await m.readCourseEvents(hydrated)).map(e=>e.id).sort(),events.map(e=>e.id).sort());hydrated.close();
 const other=await m.openCourseStore('reference-b-'+crypto.randomUUID());assert.deepEqual(await m.readCourseEvents(other),[]);other.close();
});
