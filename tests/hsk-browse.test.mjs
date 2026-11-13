import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {build} from 'esbuild';
async function load(path){const b=await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'))}
const cloud=await load('app/atlas-cloud-model.ts'),extended=await load('app/atlas-cloud-extended.ts'),route=await load('app/atlas-cloud-route.ts');
const raw=JSON.parse(readFileSync('data/hsk-browse-index.json')),official=JSON.parse(gunzipSync(readFileSync('public/dictionary/hsk-levels-2025.json.gz')));
test('HSK1–3 curriculum IDs/counts unchanged; higher bands are browsing only',()=>{
 for(const [level,count] of [[1,300],[2,500],[3,1000]]){const words=cloud.cloudWords('en',level);assert.equal(words.length,count);assert.ok(words.every(w=>w.origin==='curriculum'&&w.item));}
 const higher=cloud.cloudWords('en','7-9').filter(w=>w.origin==='dictionary');assert.ok(higher.length>9800);assert.ok(higher.every(w=>!w.item&&!w.atlasCharacterId&&w.id.startsWith('hsk-browse:')));
 for(const w of higher)assert.ok(official.words[w.level].split('|').includes(w.hanzi),w.hanzi);
});
test('official combined 7–9 scope survives routes, never invents separate advanced levels',()=>{
 for(const level of [1,2,3,4,5,6,'7-9','all'])assert.equal(route.readCloudRoute(route.cloudRouteHref({...route.initialCloudRoute,level})).level,level);
 for(const invalid of ['7','8','9'])assert.equal(route.readCloudRoute('?hsk='+invalid).level,'all');
});
test('all 3088 official recognition characters can be browsed; supplied incomplete IDS stays incomplete',()=>{
 const all=extended.extendedCharacters('en','7-9');assert.equal(all.length,3088);assert.equal(new Set(all.map(x=>x.hanzi)).size,3088);
 for(const [level,count] of [[3,655],[4,1096],[5,1527],[6,1940],['7-9',3088]])assert.equal(extended.extendedCharacters('en',level).length,count);
 const missing=raw.characters.filter(r=>r.unresolvedComponents.length);assert.ok(missing.length>0);for(const row of missing)assert.equal(all.find(x=>x.hanzi===row.hanzi).complete,false);
});
test('no guessed readings for absent dictionary headwords; source limitation is explicit',()=>{
 assert.deepEqual(raw.meta.missingDictionaryEntries,[{hanzi:'精彩纷呈',level:'7-9'},{hanzi:'口哨儿',level:'7-9'}]);
 assert.equal(raw.meta.hskSource.edition,'HSK examination syllabus, November 2025');
});
const spatial=await load('app/atlas-spatial-model.ts');
test('dictionary-only words never invent a recording or independent-recall target',()=>{
 const word=cloud.cloudWords('en',4).find(w=>w.origin==='dictionary');assert.ok(word);assert.equal(spatial.wordPronunciation(word),undefined);assert.equal(spatial.sentencePronunciation(word),undefined);
 const dictionary=spatial.studyDictionary('en');assert.equal(dictionary.get(word.hanzi).audio,undefined);
 const questions=spatial.recognitionQuestions(extended.extendedCharacters('en','7-9'),'en');assert.ok(questions.every(q=>q.word.item||q.word.atlasCharacterId));
});
