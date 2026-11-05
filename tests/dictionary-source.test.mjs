import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {gzipSync,gunzipSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
async function load(path){const result=await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text+'\n// '+Math.random()).toString('base64'));}
const m=await load('app/dictionary-source-model.ts'),w=await load('app/dictionary-window.ts');
const fixture='# CC-CEDICT\r\n旦 旦 [dan4] /dawn/daybreak/\r\n得 得 [de2] /to obtain/\r\n得 得 [de5] /structural particle/\r\n得 得 [dei3] /must/to have to/\r\n櫻花 樱花 [ying1 hua1] /cherry blossom/\r\n';
test('licensed dictionary parsing supports CRLF, compounds, traditional forms and all polyphone senses',()=>{
 assert.equal(m.cedictEntry(fixture,'旦').pinyin,'dàn');assert.match(m.cedictEntry(fixture,'旦').meaning,/dawn/);
 assert.equal(m.cedictEntry(fixture,'樱花').pinyin,'yīng huā');assert.equal(m.cedictEntry(fixture,'櫻花').meaning,'cherry blossom');
 assert.deepEqual(m.cedictEntry(fixture,'得').senses.map(s=>s.pinyin),['dé','de','děi']);
 assert.equal(m.cedictEntry(fixture,'旦旦旦'),undefined);assert.equal(m.cedictEntry(fixture,'../secret'),undefined);
 assert.equal(m.tonePinyin('nu:3 peng2 you5 xue2 xiao4 lv4 shui3'), 'nǚ péng you xué xiào lǜ shuǐ');
});
test('authored MyDay source selects děi, removes mismatched isolated audio, and does not invent other contexts',()=>{
 const row=JSON.parse(readFileSync('data/my-day-01-v2.json')).sections.flatMap(s=>s.rows)[5],entry={...m.cedictEntry(fixture,'得'),audio:{source:'wrong-de.mp3'},word:{id:'particle-de',pinyin:'de'}};
 const selected=m.contextualDictionaryEntry(entry,{text:row.hanzi,pinyin:row.pinyin,meaning:row.english});assert.equal(selected.pinyin,'děi');assert.match(selected.meaning,/must/);assert.equal(selected.audio,undefined);assert.equal(selected.word,undefined);
 const particle=m.contextualDictionaryEntry(entry,{text:'他跑得快。',pinyin:'Tā pǎo de kuài.',meaning:'He runs fast.'});assert.equal(particle.pinyin,'de');assert.equal(particle.meaning,'structural particle');
 const ambiguous=m.contextualDictionaryEntry(entry,{text:'我觉得我得去学校。',pinyin:'Wǒ juéde wǒ děi qù xuéxiào.',meaning:'I think I must go to school.'});assert.equal(ambiguous.pinyin,entry.pinyin);assert.deepEqual(ambiguous.senses,entry.senses);assert.equal(ambiguous.contextual.text,'我觉得我得去学校。');
});
test('real modern IDS operators become readable layout names without tofu or invented origins',()=>{
 assert.deepEqual(m.describeStructure('⿰彳⿱旦寸'),{description:'Left–right: (彳 + Top–bottom: (旦 + 寸))',parts:['彳','旦','寸']});
 assert.equal(m.describeStructure('⿱日一').description,'Top–bottom: (日 + 一)');assert.ok(m.describeStructure('⿱？丨').description.includes('unidentified part'));
});
test('bundled data covers the reported missing character and a broad, licensed non-HSK lexicon',()=>{
 const words=JSON.parse(gunzipSync(readFileSync('public/dictionary/headwords.json.gz'))),characters=JSON.parse(gunzipSync(readFileSync('public/dictionary/characters.json.gz')));
 assert.ok(words.length>120000);assert.ok(!words.includes('輕易'));assert.ok(words.includes('轻易'));assert.ok(words.includes('樱花'));assert.ok(words.includes('人工智能'));assert.ok(Object.keys(characters).length>9500);assert.equal(characters['旦'].radical,'日');assert.equal(characters['旦'].pinyin[0],'dàn');
});
test('movable popup bounds and normalized persistence survive resize, rotation and corrupt state',()=>{
 const b={left:0,top:0,width:390,height:844},s={width:304,height:520};assert.deepEqual(w.clampDictionaryPosition({x:-500,y:10000},b,s),{x:12,y:312});
 const point=w.normalizeDictionaryPosition({x:74,y:312},b,s);assert.deepEqual(w.restoreDictionaryPosition(point,b,s),{x:74,y:312});
 const rotated={left:0,top:0,width:844,height:390},newSize={width:304,height:250},r=w.restoreDictionaryPosition(point,rotated,newSize);assert.ok(r.x>=12&&r.x+304<=832&&r.y+250<=378);
 for(const bad of [null,{}, {x:NaN,y:0},{x:-1,y:1},{x:2,y:0}])assert.equal(w.restoreDictionaryPosition(bad,b,s),undefined);
});
test('public lookup route distinguishes success, real misses, invalid input and source outages',async()=>{
 const original=globalThis.fetch;
 try{
  let calls=0;globalThis.fetch=async()=>{calls++;return new Response(readFileSync('resources/cc-cedict/cedict.txt.gz'));};const api=await load('app/api/dictionary/route.ts');
  let r=await api.GET(new Request('https://test/api/dictionary?text=旦'));assert.equal(r.status,200);assert.equal((await r.json()).entry.pinyin,'dàn');
  r=await api.GET(new Request('https://test/api/dictionary?text=旦旦旦'));assert.equal(r.status,404);assert.equal((await r.json()).status,'not-found');assert.equal(calls,1);
  r=await api.GET(new Request('https://test/api/dictionary?text=../secret'));assert.equal(r.status,400);
  globalThis.fetch=async()=>new Response('unavailable',{status:503});const failed=await load('app/api/dictionary/route.ts');r=await failed.GET(new Request('https://test/api/dictionary?text=旦'));assert.equal(r.status,503);assert.equal((await r.json()).status,'error');assert.equal(r.headers.get('Cache-Control'),'no-store');
 }finally{globalThis.fetch=original;}
});
test('client caches only useful successes and deduplicates concurrent lookups; failures remain failures',async()=>{
 const originalFetch=globalThis.fetch,originalCaches=globalThis.caches,cache=new Map();let calls=0;
 globalThis.caches={open:async()=>({match:async k=>cache.get(k)?.clone(),put:async(k,v)=>cache.set(k,v.clone())})};
 try{
  globalThis.fetch=async()=>{calls++;return Response.json({status:'found',entry:m.cedictEntry(fixture,'旦')});};const client=await load('app/dictionary-client.ts');
  const [a,b]=await Promise.all([client.fetchDictionaryEntry('旦'),client.fetchDictionaryEntry('旦')]);assert.equal(a.text,b.text);assert.equal(calls,1);await client.fetchDictionaryEntry('旦');assert.equal(calls,1);
  globalThis.fetch=async()=>{calls++;return Response.json({status:'not-found'},{status:404});};assert.equal(await client.fetchDictionaryEntry('旦旦旦'),undefined);assert.equal(cache.size,1);
  globalThis.fetch=async()=>new Response('offline',{status:503});await assert.rejects(client.fetchDictionaryEntry('樱花'),/retry/);assert.equal(cache.size,1);
 }finally{globalThis.fetch=originalFetch;globalThis.caches=originalCaches;}
});
test('authored pinyin boundaries prevent broad-dictionary false compounds across grammar and time words',async()=>{
 const p=await load('app/pinyin-boundaries.ts'),m=await load('app/atlas-spatial-model.ts'),source=JSON.parse(readFileSync('data/my-day-01-v2.json')).sections.flatMap(s=>s.rows);
 for(const row of source)assert.ok(p.authoredPinyinBoundaries(row.hanzi,row.pinyin),row.hanzi);
 const dictionary=new Map();m.registerDictionaryLexicon(dictionary,new Set(['我去','厨房','四十','十分','分开','开始']));
 const breakfast=source[2],tokens=m.dictionaryTokens(breakfast.hanzi,dictionary,undefined,p.authoredPinyinBoundaries(breakfast.hanzi,breakfast.pinyin));assert.ok(!tokens.some(t=>t.text==='我去'));assert.ok(tokens.some(t=>t.text==='厨房'));
 const time=source[11],clock=m.dictionaryTokens(time.hanzi,dictionary,undefined,p.authoredPinyinBoundaries(time.hanzi,time.pinyin));assert.ok(!clock.some(t=>t.text==='十分'||t.text==='分开'));assert.ok(clock.some(t=>t.text==='四十'));assert.ok(clock.some(t=>t.text==='开始'));
});
test('电 lexical family contains real compounds beyond HSK, has separate counts and pagination, and excludes mere homophones',async()=>{
 const m=await load('app/dictionary-word-family-model.ts'),words=JSON.parse(gunzipSync(readFileSync('public/dictionary/headwords.json.gz')));
 const family=m.dictionaryWordFamily(words,'电',['电脑','电话']);for(const word of ['电脑','电话','电影','电梯','电车','雷电'])assert.ok(family.includes(word),word);assert.ok(family.length>100);assert.ok(family.every(word=>word.includes('电')));assert.ok(!family.includes('店'));assert.ok(!family.includes('点'));assert.equal(family[0]==='电脑'||family[0]==='电话',true);assert.equal(new Set(family).size,family.length);
 const first=m.dictionaryFamilyPage(family,0),second=m.dictionaryFamilyPage(family,1);assert.equal(first.words.length,18);assert.equal(second.words.length,18);assert.ok(!first.words.some(word=>second.words.includes(word)));assert.equal(m.dictionaryWordFamily(words,'diàn').length,0);
});

test('a headword is not repeated as its own source sentence',()=>{
 const entry={text:'租车',pinyin:'zū chē',meaning:'rent a car'};assert.equal(m.contextualDictionaryEntry(entry,{text:'租车',pinyin:'zū chē',meaning:'rent a car'}).contextual,undefined);
 const context={text:'我租车去旅行。',pinyin:'Wǒ zū chē qù lǚxíng.',meaning:'I rent a car for a trip.'};assert.equal(m.contextualDictionaryEntry(entry,context).contextual,context);
});
