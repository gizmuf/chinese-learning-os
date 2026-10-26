import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({stdin:{contents:"export * from './app/atlas-hybrid-model';export * from './app/atlas-cloud-route';export * from './app/atlas-hybrid-copy';export {cloudWords} from './app/atlas-cloud-model';export {extendedCharacters} from './app/atlas-cloud-extended';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('Hybrid family and sample counts are derived from canonical words, not estimates',()=>{
 for(const locale of ['en','fr','ru']){
  const words=m.hybridWords('family','学',locale,1),index=m.hybridInventory(words,locale);
  assert.equal(words.length,12);assert.equal(index.characterCount,9);assert.equal(index.occurrences,26);
  const hundred=m.hybridInventory(m.hybridWords('hundred','学',locale,1),locale);
  assert.equal(hundred.wordCount,100);assert.equal(hundred.characterCount,113);assert.equal(hundred.occurrences,159);
  assert.equal(m.hybridWords('family','电',locale,1).length,6);
 }
});
test('Every word and hanzi remains reachable through the full index at every HSK scope',()=>{
 for(const level of [1,2,3,'all']){
  const words=m.hybridWords('scope','学','en',level),index=m.hybridInventory(words,'en');
  assert.deepEqual(words.map(w=>w.id),m.cloudWords('en',level).map(w=>w.id));
  const expected=[...new Set(words.flatMap(w=>Array.from(w.hanzi).filter(m.isHanzi)))].sort();
  assert.deepEqual(index.characters.map(ch=>ch.hanzi).sort(),expected);
  for(const ch of index.characters)assert.deepEqual([...ch.wordIds].sort(),words.filter(w=>w.hanzi.includes(ch.hanzi)).map(w=>w.id).sort());
 }
});
test('Repeated characters count once per word membership and each time in occurrences',()=>{
 const words=[{id:'a',hanzi:'天天',pinyin:'tiāntiān',meaning:'every day'},{id:'b',hanzi:'天',pinyin:'tiān',meaning:'sky'},{id:'c',hanzi:'天天',pinyin:'other reading',meaning:'separate identity'}];
 const index=m.hybridInventory(words,'en');assert.equal(index.occurrences,5);assert.equal(index.characterCount,1);assert.deepEqual(index.characters[0].wordIds,['a','b','c']);
});
test('Component links use existing source structure and exclude opaque source shapes',()=>{
 const words=m.hybridWords('scope','学','en',3),index=m.hybridInventory(words,'en'),source=new Map(m.extendedCharacters('en',3).map(ch=>[ch.hanzi,ch]));
 for(const ch of index.characters){const original=source.get(ch.hanzi);assert.ok(original);assert.ok(ch.parts.every(p=>original.leafComponents.includes(p)&&p!==ch.hanzi&&m.readableComponent(p)));}
 for(const part of ['木','口','子','氵']){
  const actual=m.hybridPartFamily(index.characters,part).map(ch=>ch.hanzi).sort();
  const expected=index.characters.filter(ch=>ch.hanzi===part||source.get(ch.hanzi).components.includes(part)).map(ch=>ch.hanzi).sort();assert.deepEqual(actual,expected);
 }
 for(const invalid of ['','??','？','\ue001','⿰','木木'])assert.equal(m.readableComponent(invalid),false);
});
test('Selections never attach an unrelated word to the chosen hanzi',()=>{
 const words=m.hybridWords('family','学','en',1),chars=m.hybridInventory(words,'en').characters;
 const selected=m.hybridSelection(words,chars,'生','hsk1-028');assert.equal(selected.word.hanzi,'大学生');assert.equal(selected.character.hanzi,'生');
 for(const [hanzi,entry] of [['龘','missing'],['大','missing'],['学','<script>']]){const s=m.hybridSelection(words,chars,hanzi,entry);assert.ok(s.word.hanzi.includes(s.character.hanzi));}
 const empty=m.hybridSelection([],[],'学','');assert.equal(empty.word,undefined);assert.equal(empty.character,undefined);
});
test('Matrix pages expose every word and character at desktop and phone column counts',()=>{
 for(const total of [0,9,100,655,1100])for(const size of [3,6,10,12,16]){
  const indices=[];for(let page=0;page<Math.ceil(total/size);page++){const p=m.hybridPage(total,page,size);for(let i=p.start;i<p.end;i++)indices.push(i)}assert.deepEqual(indices,Array.from({length:total},(_,i)=>i));
  for(const bad of [-5,NaN,Infinity,100000]){const p=m.hybridPage(total,bad,size);assert.ok(p.start>=0&&p.end<=total);assert.ok(p.page>=0);}
 }
});
test('All three layouts round-trip selection, component and independent matrix pages without changing old defaults',()=>{
 for(const layout of ['layers','constellations','matrix']){
  const route={...m.initialCloudRoute,layout,hanzi:'学',anchor:'学生',level:3,mapSet:'scope',mapPart:'子',mapWordPage:4,mapCharPage:7,familyEntry:'hsk1-028'};
  assert.deepEqual(m.readCloudRoute(m.cloudRouteHref(route)),route);
 }
 const bad=m.readCloudRoute('?layout=matrix&mapset=nope&mappart=木木&wordpage=-7&charpage=Infinity');
 assert.equal(bad.mapSet,'family');assert.equal(bad.mapPart,'');assert.equal(bad.mapWordPage,0);assert.equal(bad.mapCharPage,0);
 assert.deepEqual(m.readCloudRoute(''),m.initialCloudRoute);
 for(const layout of ['cloud','family','path','space','words'])assert.equal(m.readCloudRoute('?layout='+layout).layout,layout);
});
test('Every new label has EN/FR/RU copy and existing word translations remain canonical',()=>{
 for(const [key,values] of Object.entries(m.hybridCopy)){assert.equal(values.length,3,key);assert.ok(values.every(v=>typeof v==='string'&&v.trim()),key);for(const locale of ['en','fr','ru'])assert.ok(m.hybridText(locale,key));}
 const ids=['en','fr','ru'].map(locale=>m.hybridWords('scope','学',locale,3).map(w=>({id:w.id,h:w.hanzi,p:w.pinyin})));
 assert.deepEqual(ids[0],ids[1]);assert.deepEqual(ids[0],ids[2]);
});

test('Hybrid swipe changes pages only for a deliberate horizontal gesture',()=>{
 assert.equal(m.hybridSwipe(-60,4),1);assert.equal(m.hybridSwipe(60,-4),-1);
 for(const [dx,dy] of [[43,0],[0,90],[50,70],[20,5]])assert.equal(m.hybridSwipe(dx,dy),0);
});
