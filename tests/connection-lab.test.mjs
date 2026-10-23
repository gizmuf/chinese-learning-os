import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['app/connection-lab-model.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const at=Date.UTC(2026,9,23,8);
function event(overrides={}){return {version:1,experiment:'connections-v1',kind:'attempt',id:crypto.randomUUID(),sessionId:crypto.randomUUID(),route:'connections',targetId:'u6797',skill:'meaning',at,durationMs:5000,assisted:true,rating:3,...overrides};}
test('Both experimental paths retain the same activities in deliberately different orders',()=>{
 assert.deepEqual([...m.taskOrder('connections')].sort(),[...m.taskOrder('recall')].sort());
 assert.equal(m.taskOrder('connections')[0],'watch');assert.equal(m.taskOrder('recall')[0],'meaning');
});
test('Hints and guided assembly cannot earn independent recall or mutate existing schedules',()=>{
 assert.throws(()=>m.labEventSchema.parse(event({skill:'component',rating:3,assisted:false})));
 assert.throws(()=>m.labEventSchema.parse(event({skill:'watch',rating:0,assisted:false})));
 assert.equal(m.labSchedules([event({skill:'watch',rating:0}),event({skill:'component',rating:0})]).length,0);
 const s=m.labSchedules([event()]);assert.equal(s[0].independent,false);assert.equal(s[0].due,at+86400000);
 assert.equal(m.labStats([event()],'connections','meaning').independent,0);
});
test('Routes and skills schedule separately; duplicated save IDs have one effect',()=>{
 const e=event({assisted:false}),other=event({route:'recall',skill:'sound',assisted:false});
 assert.deepEqual(m.labSchedules([e,e,other]),m.labSchedules([e,other]));
 assert.equal(m.labSchedules([e,other]).length,2);
 assert.equal(m.labStats([e,e],'connections','meaning').remembered,1);
 const scheduled=m.labSchedules([e]);assert.deepEqual(m.labSchedules([e,event({at:at+5000})]),scheduled);
});
test('Delayed reviews do not expose several skills of the same character in one batch',()=>{
 const records=[event(),event({skill:'sound'}),event({skill:'writing'}),event({targetId:'u68ee'})];
 assert.equal(m.dueLabTasks(records,at).length,0);
 const due=m.dueLabTasks(records,at+86400001);assert.equal(due.length,2);assert.equal(new Set(due.map(s=>s.targetId)).size,2);
});
test('Repeating supported practice cannot postpone its first follow-up indefinitely',()=>{
 const s=m.labSchedules([event(),event({at:at+43200000})]);assert.equal(s[0].due,at+86400000);
});
test('Recently seen answers remain supported across route switches',()=>{
 const e=event();assert.equal(m.recentlyExposed([e],e.targetId,at+1000),true);assert.equal(m.recentlyExposed([e],e.targetId,at+1800001),false);
});
test('Malformed events are rejected; negative durations and unknown targets never enter the notebook',()=>{
 assert.throws(()=>m.labEventSchema.parse(event({targetId:'unknown'})));
 assert.throws(()=>m.labEventSchema.parse(event({durationMs:-1})));
 assert.throws(()=>m.labEventSchema.parse(event({skill:'writing',rating:0})));
});

test('Listening asks for meaning without exposing written Chinese or pinyin in any locale',()=>{
 for(const locale of ['en','fr','ru'])for(const targetId of ['u6797','u68ee','u6728']){
  const q=m.labQuestion(targetId,'sound',locale,3);
  const meaning=m.labQuestion(targetId,'meaning',locale,3);
  assert.equal(q.skill,'sound');assert.equal(q.answer,targetId);
  assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(o=>o.label)).size,4);
  assert.deepEqual(q.options,meaning.options);
  assert.ok(q.options.every(o=>!/[\u3400-\u9fff]/u.test(o.label)));
  assert.ok(q.options.every(o=>Object.keys(o).join(',')==='id,label'));
 }
});
test('A just-revealed due character waits before another independent review is offered',()=>{
 const now=at+86400001;
 const records=[event(),event({skill:'sound'}),event({targetId:'u68ee'}),event({skill:'watch',rating:0,at:now})];
 assert.deepEqual(m.dueLabTasks(records,now).map(t=>t.targetId),['u68ee']);
 assert.equal(m.dueLabTasks(records,now+1800001).length,2);
});

test('Review availability includes the exposure cooldown rather than a past due date',()=>{
 const now=at+86400001, recent=event({skill:'watch',rating:0,at:now});
 assert.equal(m.nextLabReview([event(),recent],now),now+1800000);
 assert.equal(m.nextLabReview([],now),null);
 assert.equal(m.nextLabReview([event()],now),now);
});
