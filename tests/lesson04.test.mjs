import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const b=await build({stdin:{contents:"export * from './app/lesson04-data';export * from './app/course-learning';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const now=Date.now(),ev=(override={})=>({id:crypto.randomUUID(),lessonId:'intensive-04',activityId:m.lesson04Checks[0].id,kind:'answer',correct:true,assisted:false,at:now,...override});
test('Lesson 04 preserves the photographed vocabulary and equal EN/FR/RU material',()=>{
 assert.equal(m.lesson04Terms.length,73);assert.equal(m.lesson04Sentences.length,28);assert.equal(m.lesson04Topics.length,7);
 assert.equal(new Set(m.lesson04All.map(v=>v.id)).size,m.lesson04All.length);
 for(const v of m.lesson04All){assert.ok(v.hanzi&&v.pinyin);for(const lang of ['en','fr','ru'])assert.ok(v.meaning[lang]?.trim());}
 for(const text of ['贵庚','律师事务所','奶粉','蛋白粉','越来越','青色','篮'])assert.ok(m.lesson04Terms.some(v=>v.hanzi===text));
 assert.equal(m.lesson04Sentences.filter(v=>v.source==='board').length,24);
 assert.equal(m.lesson04Sentences.filter(v=>v.source==='extension').length,4);
});
test('Builders retain complete phrases, full readings and translated goals',()=>{
 assert.equal(m.lesson04Builders.length,12);assert.equal(m.lesson04BuilderCopy.length,12);
 for(const [i,b] of m.lesson04Builders.entries()){assert.equal(b.blocks.join(''),b.sentence);assert.ok(m.lesson04BuilderCopy[i].pinyin);for(const lang of ['en','fr','ru'])assert.ok(m.lesson04BuilderCopy[i].meaning[lang]);}
});
test('Reading/listening distractors exist and remain unambiguous in every language',()=>{
 assert.equal(m.lesson04Checks.length,24);assert.equal(m.lesson04Checks.filter(q=>q.mode==='listen').length,8);
 for(const q of m.lesson04Checks){assert.ok(q.optionIds.includes(q.targetId));const options=q.optionIds.map(id=>m.lesson04Terms.find(v=>v.id===id));assert.ok(options.every(Boolean));for(const lang of ['en','fr','ru'])assert.equal(new Set(options.map(v=>v.meaning[lang])).size,options.length);}
});
test('Course API accepts lesson-04 activities but rejects cross-lesson IDs and forged guided credit',()=>{
 assert.ok(m.courseEventSchema.safeParse(ev()).success);
 assert.equal(m.courseEventSchema.safeParse(ev({lessonId:'intensive-03'})).success,false);
 assert.equal(m.courseEventSchema.safeParse(ev({activityId:'unknown'})).success,false);
 assert.equal(m.courseEventSchema.safeParse(ev({activityId:m.lesson04Builders[0].id})).success,false);
 assert.ok(m.courseEventSchema.safeParse(ev({activityId:m.lesson04Builders[0].id,assisted:true})).success);
 assert.ok(m.courseEventSchema.safeParse(ev({activityId:'study:c04-identity',kind:'study',correct:null,assisted:true})).success);
});
test('Lesson-04 independent schedules are isolated from lesson-03 completion and due queues',()=>{
 const e=ev();assert.equal(Object.keys(m.courseCards([e])).length,1);assert.deepEqual(m.courseSummary([e],now+1e9),m.courseSummary([],now+1e9));
 assert.deepEqual(m.courseCards([e,e]),m.courseCards([e]));assert.equal(Object.keys(m.courseCards([ev({assisted:true})])).length,0);
});
