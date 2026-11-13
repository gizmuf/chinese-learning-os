import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const result=await build({stdin:{contents:"export * from './app/study-context-session';export {initialCloudRoute} from './app/atlas-cloud-route';export {contextualAudio,atlasWritingEntry} from './app/writing-context-model';export {grammarFrames} from './app/chunk-library-data';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('UI return checkpoint isolates owners, validates origin and keeps authored source and route without grading state',()=>{
 assert.notEqual(m.contextSessionKey(null,'en'),m.contextSessionKey('owner-two','en'));assert.notEqual(m.contextSessionKey('a:b','en'),m.contextSessionKey('a','b:en'));
 const visit={entry:{text:'得',pinyin:'děi',meaning:'must',contextual:{sourceId:'my-day-01-v2:6',text:'早饭后，我准备出门，因为我得去学校。',pinyin:'Zǎofàn hòu, wǒ zhǔnbèi chūmén, yīnwèi wǒ děi qù xuéxiào.',meaning:'After breakfast, I get ready to leave home because I have to go to school.'}},route:{...m.initialCloudRoute,hanzi:'得',layout:'space',cards:'compare'},originURL:'/?rehearsal=my-day-01-v2',originY:712};
 const restored=m.restoreContextSession(JSON.stringify(visit),visit.originURL);assert.equal(restored.entry.contextual.sourceId,'my-day-01-v2:6');assert.equal(restored.originY,712);assert.equal(restored.route.cards,'compare');assert.equal(restored.route.hanzi,'得');assert.equal(restored.grade,undefined);const stale=structuredClone(visit);stale.entry.contextual.text='changed source';assert.equal(m.restoreContextSession(JSON.stringify(stale),visit.originURL),null);
 assert.equal(m.restoreContextSession(JSON.stringify(visit),'/?study=studio'),null);assert.equal(m.restoreContextSession('{bad',visit.originURL),null);assert.equal(m.restoreContextSession(JSON.stringify({...visit,route:{}}),visit.originURL),null);
});
test('source audio keeps exact sentence wording separate from isolated character audio',()=>{
 const contextual={text:'我得去学校。',pinyin:'Wǒ děi qù xuéxiào.',meaning:'I must go to school.'};
 const entry={text:'得',pinyin:'děi',meaning:'must',contextual};const selected=m.contextualAudio(entry,{source:'/exact.mp3'});assert.equal(selected.contextual.audio.kind,'sentence');assert.equal(selected.contextual.audio.text,contextual.text);assert.equal(selected.audio.context,true);
 const isolated={...entry,audio:{text:'得',pinyin:'děi',source:'/dei.mp3',context:false}};assert.equal(m.contextualAudio(isolated,{source:'/exact.mp3'}).audio.source,'/dei.mp3');
});

test('canonical grammar occurrences restore in their locale; malformed nested entries are discarded safely',()=>{
 const example=m.grammarFrames[0].examples[0],url='/?lesson=shuoshuo-morning';const visit={entry:{text:example.hanzi.slice(0,1),pinyin:'x',meaning:'test',contextual:{sourceId:'grammar:'+example.id,text:example.hanzi,pinyin:example.pinyin,meaning:example.meaning.fr},word:{id:'unknown-unsafe'},audio:{source:'https://untrusted.invalid/x',text:'x',pinyin:'x',context:false}},route:m.initialCloudRoute,originURL:url,originY:80,scrollTop:312,trail:['?atlas=1&hanzi=得&part=sun']};
 const restored=m.restoreContextSession(JSON.stringify(visit),url,'fr');assert.ok(restored);assert.equal(restored.scrollTop,312);assert.equal(restored.entry.audio,undefined);assert.equal(restored.entry.word,undefined);assert.equal(restored.entry.contextual.meaning,example.meaning.fr);assert.equal(m.restoreContextSession(JSON.stringify({...visit,entry:{...visit.entry,pinyin:{broken:true}}}),url,'fr'),null);assert.equal(m.restoreContextSession(JSON.stringify(visit),url,'en'),null);
});

test('curated 电 word-kind route and word-to-character writing preserve attested source context',()=>{
 const source={sourceId:'shuoshuo:s002',text:'我看电视。',pinyin:'Wǒ kàn diànshì.',meaning:'I watch television.'};
 const origin={text:'电',pinyin:'diàn',meaning:'electricity',contextual:source};const electric={hanzi:'电',pinyin:'diàn',english:'electricity'};assert.deepEqual(m.atlasWritingEntry(origin,electric,'word'),origin);
 const television={text:'电视',pinyin:'diànshì',meaning:'television',contextual:source};assert.deepEqual(m.atlasWritingEntry(television,electric,'character').contextual,source);
 const must={text:'得',pinyin:'děi',meaning:'must',contextual:{text:'我得去学校。',pinyin:'Wǒ děi qù xuéxiào.',meaning:'I must go to school.'}};assert.equal(m.atlasWritingEntry(must,{hanzi:'得',pinyin:'de',english:'particle'},'word').contextual,undefined);assert.deepEqual(m.atlasWritingEntry(must,{hanzi:'得',pinyin:'de',english:'particle'},'character'),must);
});
