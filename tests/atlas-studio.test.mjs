import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({stdin:{contents:"export * from './app/atlas-studio-route';export * from './app/atlas-workshop-data';export * from './app/atlas-model';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('Malformed preview links safely resolve without manufacturing Atlas identities',()=>{
 for(const search of ['', '?view=unknown&family=bad&target=not-an-id&shape=not-a-character&word=bad','?view=__proto__&family=constructor']){
  const route=m.readStudioRoute(search);
  assert.equal(route.view,'home');assert.equal(route.family,'wood');assert.ok(m.atlasById.has(route.target));assert.ok(m.assemblies.some(a=>a.hanzi===route.shape));
 }
});
test('Every workshop shape survives URL roundtrip independently of scheduled targets',()=>{
 for(const assembly of m.assemblies){
  const route=m.readStudioRoute('?view=connections&shape='+encodeURIComponent(assembly.hanzi)+'&family='+assembly.family);
  assert.equal(route.shape,assembly.hanzi);assert.equal(route.family,assembly.family);
  assert.deepEqual(m.readStudioRoute(m.studioHref(route)),route);
  const writing=m.studioWritingTarget(route);
  if(writing)assert.equal(writing.hanzi,assembly.hanzi);
 }
});
test('Whole-word selection survives refresh and cannot reuse an unrelated writing target',()=>{
 const river=m.atlasByHanzi.get('河');assert.ok(river);
 const route=m.readStudioRoute('?view=words&family=water&word='+encodeURIComponent('清水')+'&target='+river.id);
 assert.equal(route.word,'清水');assert.deepEqual(m.readStudioRoute(m.studioHref(route)),route);
 assert.equal(m.studioWritingTarget(route)?.hanzi,'清');
 for(const word of m.wordBuilds)for(const previous of m.atlasCharacters){
  const family=m.wordFamilies(word)[0] ?? 'wood';
  const route=m.readStudioRoute('?view=words&family='+family+'&word='+encodeURIComponent(word.hanzi)+'&target='+previous.id);
  const target=m.studioWritingTarget(route);
  assert.equal(route.word,word.hanzi);assert.deepEqual(m.readStudioRoute(m.studioHref(route)),route);assert.ok(target,word.hanzi+' must open writing');
  assert.ok(word.parts.some(p=>p.hanzi===target.hanzi),word.hanzi+' must not open '+target.hanzi);
 }
});
