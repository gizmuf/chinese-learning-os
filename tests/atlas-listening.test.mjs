import test from 'node:test';
import assert from 'node:assert/strict';
import{build}from'esbuild';
const output=await build({stdin:{contents:"export * from './app/atlas-listening-model';export * from './app/atlas-listening-targets';export * from './app/atlas-learning';export {familyIds} from './app/atlas-workshop-data';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const words=m.listeningPool('word','all'),sentences=m.listeningPool('sentence','all');
test('Listening inventory covers every bundled word and sentence with independent stable target IDs',()=>{
 assert.equal(words.length,30);assert.equal(sentences.length,24);assert.equal(new Set(m.listeningTargets.map(t=>t.id)).size,54);
 for(const q of m.listeningTargets){assert.ok(m.isAtlasListeningTarget(q.id));assert.ok(q.recording.endsWith(q.id+'.mp3'));assert.ok(q.hanzi&&q.pinyin);for(const locale of ['en','fr','ru'])assert.ok(q.meaning[locale]);}
 for(const family of m.familyIds)for(const kind of ['word','sentence'])assert.ok(m.listeningPool(kind,family).length>0);
});
test('Every listening prompt has four distinct translated choices and a single answer; options expose no hanzi or pinyin',()=>{
 for(const q of m.listeningTargets){
  const ids=m.listeningOptions(q,'en').map(o=>o.id);
  for(const locale of ['en','fr','ru']){
   const options=m.listeningOptions(q,locale);assert.equal(options.length,4);assert.equal(new Set(options.map(o=>o.label)).size,4);
   assert.equal(options.filter(o=>o.id===q.id).length,1);assert.deepEqual(options.map(o=>o.id),ids);
   assert.ok(options.every(o=>!/[\u3400-\u9fff]/u.test(o.label)));assert.ok(options.every(o=>Object.keys(o).join(',')==='id,label'));
  }
 }
});
const first=words[0],sentence=sentences[0];
const event={version:1,id:'00000000-0000-4000-8000-000000000080',targetId:first.id,skill:'sound',mode:'choice',assisted:false,rating:3,at:Date.UTC(2026,9,22)};
test('Server allowlist accepts listening results only as sound choices and rejects forged workshop skills or IDs',()=>{
 assert.ok(m.atlasEventSchema.safeParse(event).success);assert.ok(m.atlasEventSchema.safeParse({...event,targetId:sentence.id}).success);
 for(const patch of [{skill:'meaning'},{skill:'writing',mode:'recall'},{skill:'component'},{mode:'explore',rating:0,assisted:true},{mode:'copy',rating:0,assisted:true},{rating:0},{targetId:first.id+'-unknown'}])assert.equal(m.atlasEventSchema.safeParse({...event,...patch}).success,false,JSON.stringify(patch));
});
test('Word and sentence schedules stay separate, duplicate events are idempotent and browsing produces no cards',()=>{
 assert.deepEqual(m.atlasCards([]),{});
 assert.deepEqual(m.atlasCards([event,event]),m.atlasCards([event]));
 const second={...event,id:'00000000-0000-4000-8000-000000000081',targetId:sentence.id};
 assert.deepEqual(Object.keys(m.atlasCards([event,second])).sort(),[first.id+':sound',sentence.id+':sound'].sort());
 assert.deepEqual(m.atlasCards([{...event,assisted:true}]),{});
});
test('Sessions prioritize due reviews then unseen targets, remain unique and respect family/kind',()=>{
 const cards=m.atlasCards([event]),now=new Date(cards[first.id+':sound'].due).getTime()+1;
 const queue=m.listeningQueue(words,[event],now,()=>.5);assert.equal(queue.length,8);assert.equal(queue[0].id,first.id);assert.equal(new Set(queue.map(t=>t.id)).size,8);
 for(const family of m.familyIds)for(const kind of ['word','sentence']){
  const pool=m.listeningPool(kind,family),tasks=m.listeningQueue(pool,[event],now,()=>.5);
  assert.ok(tasks.length>0&&tasks.length<=8);assert.ok(tasks.every(t=>t.kind===kind&&t.families.includes(family)));
 }
});
