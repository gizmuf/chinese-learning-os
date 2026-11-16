import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {build} from 'esbuild';
const bytes=readFileSync('public/dictionary/hsk-levels-2025.json.gz'),data=JSON.parse(gunzipSync(bytes)),meta=JSON.parse(readFileSync('data/hsk-levels-source.json'));
const b=await build({entryPoints:['app/hsk-level-model.ts'],bundle:true,platform:'node',format:'esm',write:false});const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));const index=m.hskLevelIndex(data);
test('the pinned official dataset covers all seven HSK bands and verifies the compressed asset identity',()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.assetSha256);assert.equal(meta.vocabularyEntries,11000);assert.equal(index.characters.size,3088);
 assert.deepEqual(Object.keys(data.words),['1','2','3','4','5','6','7-9']);assert.deepEqual(Object.values(data.characters).map(v=>v.length),[246,125,284,441,431,413,1148]);
 for(let level=1;level<=3;level++){const reference=JSON.parse(readFileSync(`data/hsk${level}-reference.json`));for(const row of reference.entries)assert.ok(index.words.get(row.hanzi)?.includes(String(level)),row.hanzi);}
 assert.deepEqual(index.words.get('朝气蓬勃'),['7-9']);assert.deepEqual(index.words.get('做主'),['7-9']);
});
test('characters use official recognition tables rather than guessing from a containing word or its word level',()=>{
 assert.deepEqual(m.hskClassification(index,'青'),{kind:'character',levels:['4']});assert.deepEqual(index.words.get('青'),['5']);
 assert.deepEqual(m.hskClassification(index,'书店'),{kind:'word',levels:['1']});assert.deepEqual(m.hskClassification(index,'银行'),{kind:'word',levels:['3']});
 assert.deepEqual(m.hskClassification(index,'基本'),{kind:'word',levels:['4']});assert.deepEqual(m.hskClassification(index,'暨'),{kind:'character',levels:['7-9']});
});
test('no level is invented for unlisted components, other Hanzi or whole sentences; cumulative max-character ranking is never used',()=>{
 assert.deepEqual(m.hskClassification(index,'讠'),{kind:'character',levels:[]});assert.deepEqual(m.hskClassification(index,'臧'),{kind:'character',levels:[]});
 assert.deepEqual(m.hskClassification(index,'我喜欢你'),{kind:'word',levels:[]});assert.equal(m.hskClassification(index,'我喜欢你。'),null);
 assert.equal(m.hskClassification(index,'HSK'),null);assert.equal(m.hskClassification(index,''),null);
 assert.throws(()=>m.hskLevelIndex({version:1,words:{'1':'你'},characters:{'1':'你'}}));
});

test('every exact syllabus word and character gets its published levels in the appropriate role',()=>{
 for(const [word,levels] of index.words)assert.deepEqual(m.hskClassification(index,word,'word'),{kind:'word',levels},word);
 for(const [glyph,levels] of index.characters)assert.deepEqual(m.hskClassification(index,glyph,'character'),{kind:'character',levels},glyph);
 assert.deepEqual(m.hskClassification(index,'青','word'),{kind:'word',levels:['5']});
});

test('the exam list contains all HSK 1–3 characters and the distinct official writing subset',async()=>{
 const exam=JSON.parse(readFileSync('data/hsk-exam-characters.json'));
 assert.deepEqual(exam.recognition,data.characters);
 const compiled=await build({entryPoints:['app/hsk-exam-model.ts'],bundle:true,platform:'node',format:'esm',write:false});
 const {examCharacters}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 for(const [level,recognition,writing] of [['1',246,100],['2',371,100],['3',655,250]]){
  const read=examCharacters(level,'recognition'),write=examCharacters(level,'writing');
  assert.equal(new Set(read).size,recognition);
  assert.equal(new Set(write).size,writing);
  for(const glyph of write)assert.ok(examCharacters(level==='1'?'2':level,'recognition').includes(glyph),glyph);
  for(const glyph of read)assert.ok(JSON.parse(readFileSync('public/characters/'+glyph+'.json')).strokes.length,glyph);
 }
});

test('metadata requires complete verified per-band counts for both tables',()=>{
 const incomplete={...data,words:{...data.words,'3':data.words['3'].split('|').slice(1).join('|')}};
 assert.throws(()=>m.hskLevelIndex(incomplete),/Invalid HSK band/);
 const malformed={...data,characters:{...data.characters,'7-9':'A'+[...data.characters['7-9']].slice(1).join('')}};
 assert.throws(()=>m.hskLevelIndex(malformed),/Invalid HSK band/);
});
test('HSK asset transport distinguishes intact compressed and decoded data from corruption',async()=>{
 const {outputFiles:[resource]}=await build({entryPoints:['app/dictionary-client.ts'],bundle:true,platform:'node',format:'esm',write:false});
 const api=await import('data:text/javascript;base64,'+Buffer.from(resource.text).toString('base64'));
 const previous=globalThis.fetch;
 try{
  for(const body of [bytes,gunzipSync(bytes)]){
   globalThis.fetch=async()=>new Response(body);
   assert.deepEqual((await api.loadHskLevelResource()).characters,data.characters);
  }
  const altered={...data,characters:{...data.characters,'1':data.characters['1'].split('').reverse().join('')}};
  globalThis.fetch=async()=>new Response(JSON.stringify(altered));
  await assert.rejects(()=>api.loadHskLevelResource(),/published fingerprint/);
 }finally{globalThis.fetch=previous;}
});
