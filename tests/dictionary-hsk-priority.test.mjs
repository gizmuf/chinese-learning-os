import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';

const bundle=await build({stdin:{contents:`export * from './app/dictionary-word-family-model';
 export * from './app/dictionary-character-family-model';
 export {hskLevelIndex,hskClassification} from './app/hsk-level-model';
 export {sourceCharacterEntry} from './app/dictionary-source-model';`,resolveDir:process.cwd()},
 bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const read=name=>JSON.parse(gunzipSync(readFileSync('public/dictionary/'+name+'.json.gz')));
const hsk=m.hskLevelIndex(read('hsk-levels-2025'));
const rank=(text,pinyin)=>Math.min(...(m.hskClassification(hsk,text,undefined,pinyin)?.levels??[]).map(level=>parseInt(level,10)));
const sorted=rows=>rows.every((row,i)=>i===0||rank(rows[i-1].text,rows[i-1].pinyin)<=rank(row.text,row.pinyin));

test('related words put every exam word before higher levels and unlisted names, before pagination',()=>{
 const data=read('headwords'),words=Array.isArray(data)?data:data.words??Object.keys(data);
 const rows=m.dictionaryWordFamily(words,'那',['支那'],hsk);
 assert.ok(rows.length>8);
 assert.ok(rows.some(text=>rank(text)<=3),'the full 那 family contains exam vocabulary');
 const mismatch=rows.findIndex((text,i)=>i>0&&rank(rows[i-1])>rank(text));
 assert.equal(mismatch,-1,mismatch<0?'':`${rows[mismatch-1]} (${rank(rows[mismatch-1])}) comes before ${rows[mismatch]} (${rank(rows[mismatch])})`);
 const first=m.dictionaryFamilyPage(rows,0,8).words;
 assert.equal(first.filter(text=>rank(text)<=3).length,Math.min(8,rows.filter(text=>rank(text)<=3).length));
 assert.ok(rows.includes('支那'),'unlisted dictionary material remains reachable');
 assert.deepEqual(new Set(rows),new Set(m.dictionaryWordFamily(words,'那',['支那'])));
});

test('character families also rank official recognition levels ahead of out-of-scope shapes',()=>{
 const dictionary=new Map(Object.entries(read('characters')).map(([text,value])=>[text,m.sourceCharacterEntry(text,value)]));
 const rows=m.dictionaryCharacterFamily('青','青',dictionary,['蜻蜓'],hsk);
 assert.ok(rows.length>8);
 assert.ok(sorted(rows),'all recognition levels must be ascending before the first page is cut');
 assert.deepEqual(new Set(rows.map(row=>row.text)),new Set(m.dictionaryCharacterFamily('青','青',dictionary,['蜻蜓']).map(row=>row.text)));
});

test('multiple listed word senses use the earliest level and preserve existing relevance within a level',()=>{
 const index={words:new Map([['学习',['1']],['学校',['1']],['学会',['3','7-9']],['学派',['7-9']]]),characters:new Map()};
 const words=['学派','学会','学校','学习','学甲'];
 assert.deepEqual(m.dictionaryWordFamily(words,'学',['学校','学甲'],index),['学校','学习','学会','学派','学甲']);
});

test('unavailable HSK metadata preserves the existing usable family rather than hiding it',()=>{
 const words=['学习','学校','学甲'];
 assert.deepEqual(m.dictionaryWordFamily(words,'学',['学甲'],undefined),m.dictionaryWordFamily(words,'学',['学甲']));
});
