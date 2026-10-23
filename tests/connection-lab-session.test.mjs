import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['app/connection-lab-session.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const make=()=>m.createSession('recall','u6797');
test('Partial drafts preserve normalized handwriting and reject malformed nested data',()=>{
 const s=make(), a=s.answers[s.tasks[2].id]; a.ink=[[{x:.1,y:.2,p:.5,t:12}]];
 assert.deepEqual(m.restore(JSON.stringify(s)),s);
 for(const mutate of [s=>s.answers[s.tasks[2].id].ink=[[null]],s=>s.answers[s.tasks[2].id].ink[0][0].x=2,s=>s.answers[s.tasks[0].id].rating=9,s=>s.tasks[1].id=s.tasks[0].id,s=>s.answers[s.tasks[0].id].saved='yes',s=>s.feedback=4,s=>s.tasks[0].targetId='unknown',s=>s.answers[s.tasks[0].id].placed=[99]]){
  const invalid=structuredClone(s);mutate(invalid);assert.equal(m.restore(JSON.stringify(invalid)),null);
 }
 assert.equal(m.restore('{broken'),null);
});
test('Delayed playback and save callbacks cannot write to another session or step',()=>{
 const s=make(), id=s.tasks[0].id, next=make();
 assert.equal(m.patchAnswer(next,s.id,id,{listened:true},true),next);
 s.index=1;assert.equal(m.patchAnswer(s,s.id,id,{listened:true},true),s);
 assert.equal(m.patchAnswer(s,s.id,'unknown',{listened:true}),s);
 const updated=m.patchAnswer(s,s.id,s.tasks[1].id,{listened:true},true);assert.equal(updated.answers[s.tasks[1].id].listened,true);assert.equal(s.answers[s.tasks[1].id].listened,false);
});
test('A draft saved flag alone never unlocks progression; a matching committed event does',()=>{
 const s=make(),task=s.tasks[0];s.answers[task.id].saved=true;
 assert.equal(m.savedTask([],s,task),false);
 const e={kind:'attempt',id:task.id,sessionId:s.id,targetId:task.targetId,skill:task.skill,route:s.route};
 assert.equal(m.savedTask([e],s,task),true);
 assert.equal(m.savedTask([{...e,sessionId:crypto.randomUUID()}],s,task),false);
});
test('Each candidate character appears once even if Atlas has multiple authored families',()=>{
 assert.equal(new Set(m.labCandidates.map(c=>c.hanzi)).size,m.labCandidates.length);
 assert.equal(m.labCandidates.filter(c=>c.hanzi==='清').length,1);
});
