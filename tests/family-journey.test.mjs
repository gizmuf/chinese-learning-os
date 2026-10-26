import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const r=await build({stdin:{contents:"export * from './app/family-journey-model';export * from './app/family-journey-copy';export * from './app/atlas-cloud-route';export {cloudWords} from './app/atlas-cloud-model';export {wordPronunciation,sentencePronunciation} from './app/atlas-spatial-model';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));

test('Every canonical entry appears exactly once in the continuous journey at every scope and locale',()=>{
 for(const scope of [1,2,3,'all'])for(const locale of ['en','fr','ru']){
  const groups=m.familyJourney(locale,scope),words=groups.flatMap(g=>g.words),expected=m.cloudWords(locale,scope);
  assert.equal(new Set(words.map(w=>w.id)).size,expected.length);assert.equal(words.length,expected.length);
  assert.deepEqual(words.map(w=>w.id).sort(),expected.map(w=>w.id).sort());
  assert.equal(new Set(groups.map(g=>g.id)).size,groups.length);
 }
});
test('HSK1–3 stay in separate ordered tracks without changing earlier group assignments',()=>{
 for(const [scope,count,characters] of [[1,300,248],[2,500,371],[3,1000,655]]){
  const groups=m.familyJourney('en',scope),coverage=m.journeyCoverage(groups);assert.equal(coverage.words,count);assert.equal(coverage.characters,characters);
  const levels=groups.map(g=>g.level);assert.deepEqual([...levels].sort((a,b)=>a-b),levels);
  for(const g of groups)assert.ok(g.words.every(w=>w.level===g.level));
 }
 const ids=scope=>m.familyJourney('en',scope).filter(g=>g.level===1).map(g=>({id:g.id,words:g.words.map(w=>w.id)}));assert.deepEqual(ids(1),ids(2));assert.deepEqual(ids(1),ids(3));
 const all=m.familyJourney('en','all');assert.ok(all.some(g=>g.level===null));assert.equal(all.at(-1).level,null);
});
test('Character groups contain a literal shared character with readable header; other words use source topics',()=>{
 const groups=m.familyJourney('en',3);assert.equal(groups[0].anchor,'学');assert.equal(groups[0].reading,'xué');assert.equal(groups[0].words.length,12);
 for(const g of groups){assert.ok(g.words.length);assert.ok(g.englishTitle);if(g.kind==='character'){assert.ok(g.reading);assert.ok(g.words.length>=3);assert.ok(g.words.every(w=>w.hanzi.includes(g.anchor)))}else{assert.equal(g.anchor,'');assert.ok(g.words.every(w=>w.item?.lesson===g.words[0].item?.lesson));}}
});
test('English definitions and full-word pinyin survive FR/RU localization with stable group identities',()=>{
 const english=m.familyJourney('en',3),defs=new Map(m.cloudWords('en',3).map(w=>[w.id,w.meaning]));
 for(const locale of ['en','fr','ru']){
  const groups=m.familyJourney(locale,3);assert.deepEqual(groups.map(g=>[g.id,g.words.map(w=>w.id)]),english.map(g=>[g.id,g.words.map(w=>w.id)]));
  for(const word of groups.flatMap(g=>g.words)){assert.ok(word.hanzi&&word.pinyin&&word.meaning);assert.equal(word.englishMeaning,defs.get(word.id));}
 }
 const fr=m.familyJourney('fr',1).flatMap(g=>g.words).find(w=>w.hanzi==='学生');assert.equal(fr.englishMeaning,'student');assert.notEqual(fr.meaning,fr.englishMeaning);
});
test('Every journey entry uses the existing exact word recording and sentence recording identities',()=>{
 for(const word of m.familyJourney('en','all').flatMap(g=>g.words)){
  const clip=m.wordPronunciation(word);assert.equal(clip.text,word.hanzi);assert.equal(clip.pinyin,word.pinyin);assert.ok(clip.source.endsWith('-word.mp3'));
  if(word.item){assert.ok(clip.source.includes(encodeURIComponent(word.id)));const sentence=m.sentencePronunciation(word);assert.equal(sentence.text,word.item.sentence);assert.equal(sentence.source,clip.source.replace(/-word\.mp3$/,'-sentence.mp3'));}
 }
});
test('Selecting a word finds its single group without inventing identities or grading attempts',()=>{
 const groups=m.familyJourney('en',3);for(const word of groups.flatMap(g=>g.words)){const selection=m.journeySelection(groups,word.id);assert.equal(selection.word.id,word.id);assert.ok(selection.group.words.includes(selection.word));}
 assert.equal(m.journeySelection(groups,'missing'),null);assert.equal(m.journeySelection([],''),null);
});
test('Journey deep links preserve scope and canonical selection alongside all older layouts',()=>{
 for(const scope of [1,2,3,'all']){const route={...m.initialCloudRoute,layout:'journey',level:scope,familyEntry:'hsk3-500'};assert.deepEqual(m.readCloudRoute(m.cloudRouteHref(route)),route)}
 for(const layout of ['family','cloud','path','space','words','layers','constellations','matrix'])assert.equal(m.readCloudRoute('?layout='+layout).layout,layout);
});
test('All new controls have complete EN/FR/RU labels',()=>{
 for(const [key,values] of Object.entries(m.journeyCopy)){assert.equal(values.length,3,key);assert.ok(values.every(v=>v.trim()),key);for(const locale of ['en','fr','ru'])assert.ok(m.journeyText(locale,key));}
});
