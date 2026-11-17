import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import test from 'node:test';
import {build} from 'esbuild';

const {outputFiles:[bundle]}=await build({
 stdin:{contents:"export * from './app/practical-lesson-17-data';",resolveDir:process.cwd()},
 platform:'node',format:'esm',bundle:true,write:false,
});
const {practicalLesson17Href,practicalLesson17View,practicalLesson17Sections,practicalLesson17Exercises,practicalLesson17Review,practicalLesson17Audio}=
 await import('data:text/javascript;base64,'+Buffer.from(bundle.text).toString('base64'));

test('November 17 lesson includes all source sections, Hanzi, pinyin and English',()=>{
 assert.equal(practicalLesson17Href,'/?course=intensive&material=practical-2026-11-17');
 assert.deepEqual(practicalLesson17Sections.map(section=>section.entries.length),[12,12,12,10,12,12,12,12,12,12,12,12,12,5]);
 assert.equal(new Set(practicalLesson17Sections.map(section=>section.id)).size,14);
 for(const section of practicalLesson17Sections){
  assert.match(section.id,/^[a-z0-9-]+$/);
  assert.ok(section.title && section.note,section.id);
  for(const row of section.entries){
   assert.match(row.hanzi,/\p{Script=Han}/u);
   assert.match(row.pinyin,/[\p{L} ]+/u);
   assert.equal(row.pinyin,row.pinyin.normalize('NFC'));
   assert.ok(row.english.trim().length>0);
   assert.ok(row.sourcePage>=1&&row.sourcePage<=16);
  }
 }
 const entries=practicalLesson17Sections.flatMap(section=>section.entries);
 for(const hanzi of ['苹果多少钱一斤','又大又好吃','我没听懂','一首歌','两件衣服','进口','出口','税','水','公司','工资','我的日记']){
  assert.ok(entries.some(row=>row.hanzi===hanzi),hanzi);
 }
});

test('all 18 prompts have a source answer and the six review notes preserve the homework instructions',()=>{
 assert.deepEqual(practicalLesson17Exercises.map(exercise=>exercise.id),Array.from({length:18},(_,i)=>i+1));
 for(const exercise of practicalLesson17Exercises){
  assert.ok(exercise.prompt && exercise.hanzi && exercise.pinyin && exercise.english && exercise.explanation,exercise.id);
 }
 assert.equal(practicalLesson17Review.length,6);
 assert.match(practicalLesson17Review[5].text,/My Diary|我的日记/i);
});

test('section and question URLs resolve without falling into the November 16 lesson',()=>{
 const first=practicalLesson17Sections[0].id;
 const last=practicalLesson17Sections.at(-1).id;
 assert.deepEqual(practicalLesson17View(''),{view:'examples',topic:first,question:1});
 assert.deepEqual(practicalLesson17View('?view=recall&topic='+last+'&question=18'),{view:'recall',topic:last,question:18});
 assert.deepEqual(practicalLesson17View('?view=review&topic=unknown&question=22'),{view:'review',topic:first,question:1});
});

test('the lesson reuses existing recordings only for their matching utterances',()=>{
 const known=new Set([...practicalLesson17Sections.flatMap(section=>section.entries),...practicalLesson17Exercises].map(entry=>entry.hanzi));
 for(const [hanzi,recording] of Object.entries(practicalLesson17Audio)){
  assert.ok(known.has(hanzi));
  assert.ok([hanzi,hanzi+'。',hanzi+'？'].includes(recording.text));
  assert.match(recording.source,/^\/audio\/practical-2026-11-16\/[a-f0-9]{20}\.mp3$/);
  assert.ok(existsSync('public'+recording.source),recording.source);
 }
 assert.ok(practicalLesson17Audio['一共多少钱']);
});
