import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const bundled = await build({
 stdin:{contents:"export * from './app/lesson05-data';export * from './app/course-learning';export {lesson04Checks} from './app/lesson04-data';export {exercises} from './app/course-exercises';",resolveDir:process.cwd(),loader:'ts'},
 bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent',
});
const m = await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const languages=['en','fr','ru','tr'];
const normalized=text=>text.replace(/[\p{P}\p{Z}\s]/gu,'');
const byId=new Map(m.lesson05All.map(v=>[v.id,v]));
const now=Date.UTC(2026,9,26,4);
const event=(override={})=>({id:crypto.randomUUID(),lessonId:'intensive-05',activityId:m.lesson05Checks[0].id,kind:'answer',correct:true,assisted:false,at:now,...override});

test('Lesson 05 keeps complete, unique photographed and video vocabulary with readable localized meanings',()=>{
 assert.equal(m.lesson05.id,'intensive-05');
 assert.equal(m.lesson05.date,'2026-10-26');
 assert.equal(m.lesson05Terms.length,65);
 assert.equal(m.lesson05Sentences.length,34);
 assert.equal(m.lesson05Topics.length,6);
 assert.equal(byId.size,99);
 const topics=new Set(m.lesson05Topics.map(v=>v.id));
 assert.equal(topics.size,6);
 for(const row of m.lesson05All){
  assert.match(row.id,/^c05-[ts]\d{2}$/);
  assert.ok(topics.has(row.topic),row.id+' topic');
  assert.match(row.hanzi,/\p{Script=Han}/u,row.id+' Chinese');
  assert.ok(row.pinyin.trim(),row.id+' pinyin');
  assert.doesNotMatch(row.pinyin,/\p{Script=Han}/u,row.id+' pinyin is a reading');
  assert.ok(['board','video','extension'].includes(row.source),row.id+' provenance');
  assert.ok(row.photos.length>0,row.id+' source photos');
  for(const lang of languages){
   assert.ok(row.meaning[lang]?.trim(),row.id+' '+lang);
   const item=m.lesson05Item(row,lang);
   assert.equal(item.hanzi,row.hanzi);assert.equal(item.pinyin,row.pinyin);
   assert.equal(item.english,row.meaning[lang]);assert.equal(item.translation,row.meaning[lang]);
  }
 }
 for(const [hanzi,pinyin] of [['好久不见','hǎo jiǔ bú jiàn'],['问','wèn'],['闻','wén'],['兴奋','xīngfèn'],['准备好','zhǔnbèi hǎo'],['白','bái'],['百','bǎi']]){
  assert.equal(m.lesson05Terms.find(v=>v.hanzi===hanzi)?.pinyin,pinyin,hanzi+' reading');
 }
});

test('Every Lesson 05 entry has both reading and listening checks with distinct same-topic options',()=>{
 assert.equal(m.lesson05Checks.length,198);
 assert.equal(new Set(m.lesson05ActivityIds).size,m.lesson05ActivityIds.length);
 for(const target of m.lesson05All){
  const checks=m.lesson05Checks.filter(q=>q.targetId===target.id);
  assert.deepEqual(checks.map(q=>q.mode).sort(),['listen','read'],target.id+' target coverage');
 }
 for(const q of m.lesson05Checks){
  assert.ok(q.optionIds.includes(q.targetId),q.id+' target option');
  assert.equal(new Set(q.optionIds).size,q.optionIds.length,q.id+' duplicate option');
  assert.ok(q.optionIds.length>=2&&q.optionIds.length<=4,q.id+' option count');
  const target=byId.get(q.targetId),options=q.optionIds.map(id=>byId.get(id));
  assert.ok(target&&options.every(Boolean),q.id+' valid IDs');
  assert.ok(options.every(v=>v.topic===target.topic),q.id+' same topic');
  for(const lang of languages)assert.equal(new Set(options.map(v=>v.meaning[lang].trim().toLocaleLowerCase(lang))).size,options.length,q.id+' ambiguous '+lang);
 }
});

test('Grammar paths reconstruct their actual target and builders retain their translated sentence goal',()=>{
 assert.equal(m.lesson05Paths.length,m.lesson05Topics.length);
 assert.equal(new Set(m.lesson05Paths.map(v=>v.topic)).size,m.lesson05Topics.length);
 for(const path of m.lesson05Paths){
  const target=byId.get(path.target);assert.ok(target,path.target);
  assert.equal(normalized(path.parts.map(([text])=>text).join('')),normalized(target.hanzi),path.target+' chunks');
  for(const [,role] of path.parts)for(const lang of languages)assert.ok(role[lang]?.trim(),path.target+' role '+lang);
 }
 assert.equal(m.lesson05Builders.length,16);
 assert.equal(m.lesson05BuilderCopy.length,m.lesson05Builders.length);
 for(const [i,builder] of m.lesson05Builders.entries()){
  const copy=m.lesson05BuilderCopy[i];assert.ok(copy,builder.id+' copy');
  assert.equal(builder.blocks.join(''),builder.sentence);
  assert.equal(normalized(builder.sentence),normalized(copy.hanzi),builder.id+' translated goal');
  assert.ok(copy.pinyin.trim());
  for(const lang of languages)assert.ok(copy.meaning[lang]?.trim());
 }
});

test('Course event validation isolates lessons 03, 04 and 05, event kinds and supported practice',()=>{
 const representatives=[['intensive-03',m.exercises[0].id],['intensive-04',m.lesson04Checks[0].id],['intensive-05',m.lesson05Checks[0].id]];
 for(const [lessonId,activityId] of representatives)for(const [otherLesson] of representatives){
  assert.equal(m.courseEventSchema.safeParse(event({lessonId:otherLesson,activityId})).success,otherLesson===lessonId,lessonId+' in '+otherLesson);
 }
 assert.equal(m.courseEventSchema.safeParse(event({activityId:'unknown'})).success,false);
 for(const activityId of m.lesson05ActivityIds){
  const kind=activityId.startsWith('study:')?'study':activityId.startsWith('write:')?'writing':'answer';
  const valid=event({activityId,kind,correct:kind==='study'?null:true,assisted:true});
  assert.ok(m.courseEventSchema.safeParse(valid).success,activityId+' accepted');
  const wrongKind=kind==='answer'?'writing':'answer';
  assert.equal(m.courseEventSchema.safeParse({...valid,kind:wrongKind,correct:true}).success,false,activityId+' kind');
  assert.equal(m.courseEventSchema.safeParse({...valid,correct:kind==='study'?true:null}).success,false,activityId+' correctness');
 }
 for(const b of m.lesson05Builders)assert.equal(m.courseEventSchema.safeParse(event({activityId:b.id,assisted:false})).success,false,b.id+' guided credit');
 assert.ok(m.courseEventSchema.safeParse(event({activityId:'write:'+m.lesson05Terms[0].id,kind:'writing',rating:3})).success);
 assert.equal(m.courseEventSchema.safeParse(event({activityId:'write:'+m.lesson05Terms[0].id,kind:'writing',rating:5})).success,false);
});

test('Assisted work cannot create or advance FSRS cards, and a wrong answer returns sooner',()=>{
 const correct=event(),wrong=event({correct:false});
 assert.deepEqual(m.courseCards([event({assisted:true})]),{});
 const original=m.courseCards([correct]);
 assert.deepEqual(m.courseCards([correct,correct]),original,'duplicate event is idempotent');
 assert.deepEqual(m.courseCards([correct,event({assisted:true,at:now+86400000})]),original,'assisted answer does not advance');
 assert.deepEqual(m.courseCards([event({activityId:m.lesson05Builders[0].id,assisted:true})]),{});
 assert.deepEqual(m.courseCards([event({activityId:'write:'+m.lesson05Terms[0].id,kind:'writing',assisted:true,rating:4})]),{});
 assert.deepEqual(m.courseCards([event({activityId:'study:c05-meet',kind:'study',correct:null,assisted:true})]),{});
 assert.ok(new Date(m.courseCards([wrong])[wrong.activityId].due)<new Date(original[correct.activityId].due));
});

test('Lesson 05 schedules stay out of lesson 03 summary and mixed-lesson review queues can be scoped to 05',()=>{
 const fifth=event(),fourth=event({lessonId:'intensive-04',activityId:m.lesson04Checks[0].id}),third=event({lessonId:'intensive-03',activityId:m.exercises[0].id});
 const events=[third,fourth,fifth],future=now+365*86400000;
 assert.deepEqual(m.courseSummary([fifth,fourth],future),m.courseSummary([],future));
 assert.deepEqual(m.courseSummary(events,future),m.courseSummary([third],future));
 const scoped=m.courseCards(events.filter(e=>e.lessonId==='intensive-05'));
 assert.deepEqual(Object.keys(scoped),[fifth.activityId]);
 assert.deepEqual(Object.entries(scoped).filter(([,card])=>new Date(card.due).getTime()<=future).map(([id])=>id),[fifth.activityId]);
 assert.deepEqual(m.courseCards(events.filter(e=>e.lessonId==='intensive-05')),m.courseCards([fifth]));
});
