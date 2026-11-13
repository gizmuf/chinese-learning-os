import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {existsSync} from 'node:fs';
import {recordingAssetPath} from './audio-source-helper.mjs';
const b=await build({entryPoints:['app/dictionary-lesson-occurrences.ts'],bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
test('full occurrence queries retain canonical lesson locations, translations and all pages, beyond two examples',()=>{
 for(const locale of ['en','fr','ru','tr']){
  const rows=m.studyOccurrences('我',locale);assert.ok(rows.length>30);assert.ok(rows.some(v=>v.lessonId==='intensive-12'));assert.ok(rows.some(v=>v.lessonId==='intensive-06'));assert.ok(rows.some(v=>v.lessonId==='my-day-01-v2'));
  assert.equal(new Set(rows.map(v=>v.id)).size,rows.length);for(const row of rows)assert.ok(row.sourceId&&row.lessonLabel&&row.text.includes('我')&&row.pinyin&&row.meaning);
  const all=[];for(let page=0;page<m.occurrencePage(rows,0).pages;page++)all.push(...m.occurrencePage(rows,page).rows);assert.deepEqual(all,rows);
 }
 assert.deepEqual(m.studyOccurrences('not chinese','en'),[]);
});
test('reused lesson sentences remain independently located and words stay distinct from sentence occurrences',()=>{
 const corpus=m.studyOccurrenceCorpus('en');assert.ok(corpus.some(a=>a.kind==='sentence'&&corpus.some(b=>b.id!==a.id&&b.text===a.text&&b.lessonId!==a.lessonId)));
 const word=m.studyOccurrences('银行','en');assert.ok(word.some(v=>v.kind==='word'&&v.text==='银行'));assert.ok(word.some(v=>v.kind==='sentence'&&v.text!=='银行'));
});
test('occurrence audio is exact text and points to existing retained recordings',()=>{
 const missing=[];for(const row of m.studyOccurrenceCorpus('en'))if(row.audio){assert.equal(row.audio.text,row.text);assert.equal(row.audio.kind,row.kind);if(!existsSync(recordingAssetPath(row.audio.source)))missing.push([row.id,row.audio.source]);}
 assert.deepEqual(missing,[]);
});

test('published source caveats remain visible in complete occurrence results without turning them into graded facts',()=>{const corpus=m.studyOccurrenceCorpus('en');assert.ok(corpus.find(v=>v.sourceId==='c07-s18')?.note.includes('opinion'));assert.ok(corpus.find(v=>v.sourceId==='shuoshuo:s001')?.note.includes('uncertain'));});
