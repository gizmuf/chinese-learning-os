import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {readFileSync} from 'node:fs';
const result=await build({stdin:{contents:"export * from './app/word-family-search';export * from './app/word-family-model';export {extendedComponent} from './app/atlas-cloud-extended';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('explicit tones rank exact readings first while keeping the untoned candidates',()=>{
 const plain=m.wordFamilyCandidates('si','en','all');
 assert.ok(plain.some(x=>x.hanzi==='四'));
 assert.ok(plain.length>1);
 assert.ok(!plain.some(x=>x.hanzi==='思考'));
 const first=m.wordFamilyCandidates('sī','en','all');
 const fourth=m.wordFamilyCandidates('sì','en','all');
 const position=(rows,hanzi)=>rows.findIndex(x=>x.hanzi===hanzi);
 assert.ok(position(first,'丝')>=0&&position(first,'丝')<position(first,'四'));
 assert.ok(position(fourth,'四')<position(fourth,'丝'));
 assert.deepEqual(first,m.wordFamilyCandidates('si1','en','all'));
 assert.deepEqual(fourth,m.wordFamilyCandidates('si4','en','all'));
 assert.deepEqual(new Set(first.map(row=>row.hanzi)),new Set(plain.map(row=>row.hanzi)));
});
test('mixed input offers its written form instead of silently choosing another homophone',()=>{assert.deepEqual(m.wordFamilyCandidates('厶 sī','en','all'),[{hanzi:'厶',pinyin:''}]);assert.deepEqual(m.wordFamilyCandidates('notapinyin','en',1),[])});
test('literal 厶 is distinct from component descendants',()=>{assert.equal(m.validWordAnchor('厶'),true);assert.equal(m.familyWords('厶','en','all').length,0);assert.equal(m.extendedComponent('厶').glyph,'厶');assert.ok(m.familyWords('四','en','all').length>0)});
test('unresolved submitted query hides old board and details, candidates require click',()=>{const source=readFileSync('app/word-families.tsx','utf8');assert.ok(source.includes('setSearchPending(true)'));assert.ok(source.includes('{!searchPending&&<>'));assert.ok(source.indexOf('{!searchPending&&<>')<source.indexOf('<WordFamilyBoard'));assert.ok(source.indexOf('</>}')>source.indexOf('{selected&&!hidden&&details(selected)}'));assert.ok(source.includes('onClick={()=>chooseAnchor(row.hanzi)}'));assert.ok(source.includes("hanzi:component.glyph,stage:'family'"));});
test('pending candidate calculation follows submitted query, current locale and vocabulary scope',()=>{const source=readFileSync('app/word-families.tsx','utf8');assert.ok(source.includes('wordFamilyCandidates(submittedQuery,locale,scope)'));assert.ok(source.includes('[submittedQuery,searchPending,locale,scope]'));assert.ok(source.includes('const searchMessage=searchPending?'));const broad=m.wordFamilyCandidates('si','en','all'),narrow=m.wordFamilyCandidates('si','en',1);assert.ok(broad.length>narrow.length);assert.ok(narrow.every(row=>broad.some(other=>other.hanzi===row.hanzi)));});
test('component exploration clears previous combined component and relation filters',()=>{const source=readFileSync('app/word-families.tsx','utf8');assert.ok(source.includes("kind:'character',parts:[],relation:'all'"));});

test('WordFamilies does not retain unrelated parent character word panel',()=>{const source=readFileSync('app/atlas-cloud.tsx','utf8');assert.ok(source.includes("{route.layout!=='words'&&route.layout!=='journey'&&<DictionaryWordFamily"));});
