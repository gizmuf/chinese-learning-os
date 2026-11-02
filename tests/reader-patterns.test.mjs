import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,writeFileSync,existsSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const b=await build({stdin:{contents:`export * from './app/reader-patterns-model'; export * from './app/my-day-reader-state'; export {myDaySentences} from './app/my-day-lesson-model'; export {grammarFrames} from './app/chunk-library-data';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const file=join(mkdtempSync(join(tmpdir(),'reader-patterns-')),'bundle.mjs');writeFileSync(file,b.outputFiles[0].text);const m=await import(pathToFileURL(file));
test('all 26 authored meaning groups reconstruct the exact original My Day sentence',()=>{
 assert.equal(m.myDayMeaningGroups.length,26);
 for(const [i,groups] of m.myDayMeaningGroups.entries()){
  assert.equal(groups.join(''),m.myDaySentences[i].hanzi);
  assert.ok(groups.every(g=>g.length>0));
 }
 assert.equal(m.myDayMeaningGroups[5][2],'因为我得去学校。');
});
test('reviewed reader construction links bind actual ordered source spans to existing examples/audio, without inventing a new curriculum',()=>{
 assert.equal(m.readerPatternOccurrences.length,9);
 for(const occurrence of m.readerPatternOccurrences){
  const frame=m.grammarFrames.find(f=>f.id===occurrence.frameId);assert.ok(frame);assert.equal(frame.examples.length,2);
  for(const marker of occurrence.markers)assert.equal(occurrence.text.slice(marker.start,marker.end),marker.text);
  assert.ok(occurrence.markers.every((span,i)=>i===0||span.start>=occurrence.markers[i-1].end));
  for(const example of frame.examples){
   assert.ok(example.pinyin);for(const locale of ['en','fr','ru','tr'])assert.ok(example.meaning[locale]);
   assert.ok(existsSync('public/speaking-chunks/audio/frame-'+example.id+'.mp3'));
  }
 }
 assert.deepEqual(m.patternsForSource('shuoshuo:s001'),[]); // uncertain opening is not a reviewed condition occurrence
 assert.deepEqual(m.patternsForSource('my-day-01-v2:6'),[]); // do not infer a paired 因为…所以… from 因为 alone
 assert.deepEqual(m.patternsForSource('unknown'),[]);
});
test('reader construction presentation uses an explicit separate action with source-aware examples',()=>{
 const ui=readFileSync('app/reader-patterns.tsx','utf8');
 assert.ok(ui.includes('<details'));
 assert.ok(ui.includes('data-study-source-id'));
 assert.ok(ui.includes('data-study-sentence'));
 assert.ok(!/\.record\(|localStorage|fetch\(|onClick=\{.*setLocation/.test(ui));
});
test('My Day reload checkpoints isolate owners and save only validated UI values',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const view={...m.defaultMyDayView,pinyin:false,english:false,chunks:true,single:true,index:5,scrollY:1234};
 assert.equal(m.saveMyDayView(storage,'student-a',{...view,content:'must not be copied',progress:['private']}),true);
 assert.deepEqual(m.readMyDayView(storage,'student-a'),view);assert.deepEqual(m.readMyDayView(storage,'student-b'),m.defaultMyDayView);
 assert.ok(!data.get(m.myDayViewKey('student-a')).includes('private'));
 for(const patch of [{index:-1},{index:26},{index:0.5},{pinyin:'false'},{scrollY:-1},{scrollY:Infinity},{version:2}])assert.equal(m.saveMyDayView(storage,'student-a',{...view,...patch}),false);
 for(const bad of ['{','null',JSON.stringify({...view,index:100})]){data.set(m.myDayViewKey('student-b'),bad);assert.deepEqual(m.readMyDayView(storage,'student-b'),m.defaultMyDayView);}
 const unavailable={getItem(){throw Error('blocked')},setItem(){throw Error('full')}};
 assert.deepEqual(m.readMyDayView(unavailable,'student-a'),m.defaultMyDayView);assert.equal(m.saveMyDayView(unavailable,'student-a',view),false);
});
