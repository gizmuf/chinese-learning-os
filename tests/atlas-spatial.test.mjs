import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {readFileSync,existsSync} from 'node:fs';
const r=await build({entryPoints:['app/atlas-spatial-model.ts'],bundle:true,write:false,format:'esm',platform:'node'});const m=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
test('Family paging and Compare 4 cover every member once, including short final groups',()=>{for(const count of [0,1,6,11,21,50,655]){const indices=[];for(let index=0;index<count;index+=4)indices.push(...m.spatialCards(count,index,'compare'));assert.deepEqual(indices,Array.from({length:count},(_,i)=>i));for(let index=0;index<count;index++){const page=m.spatialPage(count,index);assert.ok(index>=page.start&&index<page.end);assert.ok(page.end-page.start<=12);assert.ok(m.spatialCards(count,index,'focus').includes(index))}}assert.equal(m.spatialNext(11,9,'compare',-1),4);assert.equal(m.spatialNext(11,9,'compare',1),9);assert.equal(m.spatialNext(0,-1,'focus',1),-1);assert.deepEqual(m.spatialCards(11,-1,'focus'),[])});
test('Swipes reject taps, vertical scrolling and diagonal intent; accept either horizontal direction',()=>{for(const [x,y] of [[0,0],[40,0],[100,110],[60,50]])assert.equal(m.spatialSwipe(x,y),0);assert.equal(m.spatialSwipe(-90,4),1);assert.equal(m.spatialSwipe(90,4),-1)});
test('Dictionary segmentation preserves the exact original sentence and word boundaries without navigation',()=>{for(const locale of ['en','fr','ru']){const d=m.studyDictionary(locale);for(const text of ['我们休息一下吧。','明天见。','森林','你好吗？','A𠀀，3D']){const tokens=m.dictionaryTokens(text,d);assert.equal(tokens.map(t=>t.text).join(''),text)}assert.ok(m.dictionaryTokens('我们休息一下吧。',d).some(t=>t.text==='休息'));assert.ok(d.get('休息').pinyin);assert.ok(d.get('休息').meaning);assert.ok(d.get('休息').audio)}});
test('Every exposed word/character pronunciation resolves to a bundled Xiaoxiao clip with the exact authored text',()=>{const records=new Map();for(const prefix of ['/audio','/atlas/audio','/course03/audio','/course04/audio']){const manifest=JSON.parse(readFileSync('public'+prefix+'/manifest.json'));assert.equal(manifest.voice,'zh-CN-XiaoxiaoNeural');for(const row of manifest.recordings)records.set(prefix+'/'+row.file,row)}for(const locale of ['en','fr','ru']){const d=m.studyDictionary(locale);for(const entry of d.values()){if(!entry.audio)continue;const recording=records.get(entry.audio.source);assert.ok(recording,entry.audio.source);assert.equal(recording.text,entry.audio.text);assert.ok(existsSync('public'+entry.audio.source));if(entry.word?.item){const sentence=m.sentencePronunciation(entry.word);assert.equal(records.get(sentence.source)?.text,sentence.text)}}}assert.equal(m.characterPronunciation('森','en').text,'森林');assert.equal(m.characterPronunciation('森','en').context,true);assert.ok(m.componentPronunciation('person','en'));assert.equal(m.characterPronunciation('𠀀','en'),undefined)});

test('林 context options group the reviewed lexical duplicates and keep their source data', async () => {
 const {outputFiles: [bundle]} = await build({stdin: {contents: `export {wordsForCharacter} from './app/atlas-cloud-model';`, resolveDir: process.cwd()}, bundle: true, write: false, format: 'esm', platform: 'node'});
 const {wordsForCharacter} = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));
 const words = wordsForCharacter('林', 'en', 'all');
 const options = m.spatialWordOptions(words);
 for (const [exampleId, text] of [['u6797', '树林'], ['u68ee', '森林']]) {
  const matches = options.filter(({word}) => word.hanzi === text);
  assert.equal(words.filter(word => word.hanzi === text).length, 2);
  assert.equal(matches.length, 1);
  const [{word, dictionary}] = matches;
  assert.equal(word.id, 'atlas-example:' + exampleId);
  assert.equal(dictionary.id, 'hsk-browse:4:' + text);
  assert.equal(dictionary.level, 4);
  assert.equal(m.wordPronunciation(word).source, '/atlas/audio/atlas-' + exampleId + '-word.mp3');
  assert.equal(m.wordPronunciation(dictionary), undefined);
  if (text === '树林') assert.match(dictionary.meaning, /Shulin city/u);
 }
 assert.deepEqual(options.filter(({dictionary}) => !dictionary).map(({word}) => word), words.filter(word => !['树林', '森林'].includes(word.hanzi)));
 const scoped = wordsForCharacter('林', 'en', 4);
 assert.deepEqual(m.spatialWordOptions(scoped).map(({word}) => word), scoped);
});

test('context grouping does not conflate alternate readings or unrelated homographs', () => {
 const recorded = {id: 'atlas-example:u6797', hanzi: '树林', origin: 'atlas-example', atlasCharacterId: 'u6797', pinyin: 'shùlín'};
 const dictionary = {id: 'hsk-browse:4:树林', hanzi: '树林', origin: 'dictionary', pinyin: 'shū lín'};
 const other = {id: 'separate-entry', hanzi: '树林', origin: 'dictionary', pinyin: 'shùlín'};
 assert.deepEqual(m.spatialWordOptions([recorded, dictionary, other]).map(({word}) => word), [recorded, dictionary, other]);
});
