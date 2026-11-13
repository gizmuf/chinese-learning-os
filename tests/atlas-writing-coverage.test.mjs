import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
const b=await build({stdin:{contents:"export * from './app/atlas-model';export * from './app/atlas-workshop-data';export * from './app/atlas-learning';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const added=[...'火山电脑休息月亮朋友天气机问睛'];
test('Every existing workshop shape and word constituent has a writable Atlas identity',()=>{
 for(const a of m.assemblies)assert.ok(m.atlasByHanzi.has(a.hanzi),'Missing assembly '+a.hanzi);
 for(const word of m.wordBuilds)for(const p of word.parts){
  const c=m.atlasByHanzi.get(p.hanzi);assert.ok(c,word.hanzi+' missing '+p.hanzi);
  const strokes=JSON.parse(readFileSync('public/characters/'+c.hanzi+'.json','utf8'));
  assert.ok(strokes.strokes.length>0);assert.equal(strokes.strokes.length,strokes.medians.length);
 }
});
test('New writing entries keep stable IDs, translated word context, and valid assisted recording',()=>{
 for(const h of added){const c=m.atlasByHanzi.get(h);assert.equal(c.id,'u'+h.codePointAt(0).toString(16));assert.ok(!m.coreIds.has(c.id));
  for(const lang of ['en','fr','ru']){assert.ok(c.meaning[lang]&&c.wordMeaning[lang]&&c.note[lang]);const q=m.questionFor(c.id,'meaning',lang);assert.equal(q.answer,c.id);assert.equal(new Set(q.options.map(o=>o.label)).size,4);}
  const e=m.newAtlasEvent(c.id,'writing','recall',3,true);assert.ok(m.atlasEventSchema.safeParse(e).success);assert.deepEqual(m.atlasDue([e]),[]);
 }
});
test('Flesh in brain is separate from the moon-shape learning link',()=>{
 assert.ok(m.atlasByHanzi.get('脑').components.includes('flesh'));
 assert.ok(!m.atlasByHanzi.get('脑').components.includes('moon'));
 assert.ok(m.atlasByHanzi.get('朋').note.en.includes('not a claim'));
});
