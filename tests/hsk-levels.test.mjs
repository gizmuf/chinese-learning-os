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
