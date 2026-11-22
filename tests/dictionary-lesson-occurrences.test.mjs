import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {existsSync} from 'node:fs';
import {recordingAssetPath} from './audio-source-helper.mjs';
const b=await build({stdin:{contents:"export * from './app/dictionary-lesson-occurrences';export {items} from './app/content';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
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
test('Connectors word-family links are reciprocal and prefer the lesson glossary',()=>{
 const location='connectors-phone';
 for(const [from,to] of [['每次','每天'],['每天','每次']]){
  const rows=m.relatedStudyWords('每','en',location,from);
  assert.equal(rows[0].text,to);
  assert.equal(rows[0].lessonId,location);
  assert.match(rows[0].pinyin,/^měi /u);
  assert.ok(!rows.some(row=>row.text===from));
 }
 const both=m.relatedStudyWords('每','en',location,'每').slice(0,2).map(row=>row.text);
 assert.deepEqual(both,['每次','每天']);
 assert.ok(m.studyOccurrences('每','en').some(row=>row.kind==='sentence'&&row.lessonId===location));
});
test('Every HSK 1–3 sign has real study context in all four locales',()=>{
 const glyphs=new Set(m.items.filter(item=>item.hskLevel).flatMap(item=>Array.from(item.hanzi).filter(ch=>/^\p{Script=Han}$/u.test(ch))));
 assert.equal(glyphs.size,655);
 for(const locale of ['en','fr','ru','tr'])for(const glyph of glyphs){
  if(m.relatedStudyWords(glyph,locale).length)continue;
  const context=m.relatedStudySentence(glyph,locale);
  assert.ok(context?.text.includes(glyph)&&context?.pinyin&&context?.meaning,`${locale} ${glyph}`);
 }
 const polite=m.relatedStudySentence('您','en');
 assert.equal(polite.kind,'sentence');
 assert.equal(polite.lessonId,'intensive-04');
});
test('occurrence audio is exact text and points to existing retained recordings',()=>{
 const missing=[];for(const row of m.studyOccurrenceCorpus('en'))if(row.audio){assert.equal(row.audio.text,row.text);assert.equal(row.audio.kind,row.kind);if(!existsSync(recordingAssetPath(row.audio.source)))missing.push([row.id,row.audio.source]);}
 assert.deepEqual(missing,[]);
});

test('published source caveats remain visible in complete occurrence results without turning them into graded facts',()=>{const corpus=m.studyOccurrenceCorpus('en');assert.ok(corpus.find(v=>v.sourceId==='c07-s18')?.note.includes('opinion'));assert.ok(corpus.find(v=>v.sourceId==='shuoshuo:s001')?.note.includes('uncertain'));});
