import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
async function load(entry){const result=await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const cloud=await load('app/atlas-cloud-model.ts'),atlas=await load('app/atlas-model.ts'),content=await load('app/content.ts');
test('Cloud HSK scopes are cumulative and retain exact canonical learning identities',()=>{
 for(const [level,count] of [[1,300],[2,500],[3,1000],['all',1020]]){
  const words=cloud.cloudWords('en',level).filter(word=>word.origin==='curriculum');
  assert.equal(words.length,count);
  assert.deepEqual(words.map(word=>word.id),content.items.filter(item=>level==='all'||item.hskLevel<=level).map(item=>item.id));
  assert.equal(new Set(words.map(word=>word.id)).size,count);
  for(const word of words){assert.equal(word.id,word.item.id);assert.equal(word.hanzi,word.item.hanzi);if(level!=='all')assert.ok(word.level<=level&&word.level!==null);}
 }
 const de=cloud.cloudWords('en',3).filter(word=>word.hanzi==='得');assert.equal(de.length,3);assert.equal(new Set(de.map(word=>word.pinyin)).size,3);
});
test('Reviewed example words are unlevelled, never synthetic HSK items or invented sentences',()=>{
 const all=cloud.cloudWords('en');const sunny=all.find(word=>word.hanzi==='晴天');
 assert.equal(sunny.origin,'atlas-example');assert.equal(sunny.level,null);assert.equal(sunny.item,undefined);assert.ok(sunny.atlasCharacterId);
 for(const word of all.filter(word=>word.origin==='atlas-example')){
  assert.ok(atlas.atlasCharacters.some(character=>character.word===word.hanzi&&character.id===word.atlasCharacterId));
  assert.equal(word.item,undefined);
 }
 for(const level of [1,2,3])assert.ok(cloud.cloudWords('en',level).every(word=>word.origin==='curriculum'));
 assert.equal(new Set(all.map(word=>word.id)).size,all.length);
});
test('Structural families use AND membership and exact reverse component indexes',()=>{
 for(const row of cloud.cloudComponents()){
  const family=cloud.familyForComponents([row.component.id]);
  assert.deepEqual(row.characterIds,family.map(character=>character.id));assert.equal(row.count,family.length);
  for(const character of family)assert.ok(character.components.includes(row.component.id));
 }
 const qing=atlas.atlasByHanzi.get('晴');assert.ok(qing);
 const family=cloud.familyForComponents(qing.components);assert.ok(family.some(character=>character.hanzi==='晴'));
 for(const character of family)assert.ok(qing.components.every(id=>character.components.includes(id)));
 assert.deepEqual(cloud.familyForComponents(['unknown-component']),[]);
});
test('Unreviewed decomposition remains explicit while legitimate lexical words stay available',()=>{
 const missing=cloud.cloudCoverage(3).unmappedHanzi[0];assert.ok(missing);
 const detail=cloud.cloudCharacter(missing,'en',3);assert.equal(detail.decompositionAvailable,false);assert.deepEqual(detail.parts,[]);assert.ok(detail.words.length);
 const qing=cloud.cloudCharacter('晴','en');assert.ok(qing.decompositionAvailable);assert.ok(qing.parts.some(part=>part.roles.includes('phonetic')));
 for(const word of qing.words)assert.ok(word.hanzi.includes('晴'));
 assert.deepEqual(cloud.wordsForCharacter('晴天','en'),[]);
});
test('Coverage and translations report actual mapped inventory independently of HSK labels on components',()=>{
 for(const level of [1,2,3,'all']){
  const stats=cloud.cloudCoverage(level);assert.equal(stats.reviewedInventory,121);
  assert.equal(stats.mappedCharacters+stats.unmappedHanzi.length,stats.wordCharacters);
  assert.equal(stats.mappedCharacters,stats.mappedHanzi.length);
  for(const row of cloud.cloudComponents(level))assert.equal(row.component.hskLevel,undefined);
 }
 for(const locale of ['en','fr','ru'])for(const word of cloud.cloudWords(locale)){
  assert.ok(word.meaning);if(word.item)assert.equal(word.meaning,word.item.english);
 }
 assert.equal(cloud.cloudCoverage(3).syllabusEntries,1000);assert.equal(cloud.cloudCoverage('all').extraEntries,20);
});
