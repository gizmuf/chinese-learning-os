import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {build} from 'esbuild';
async function load(entry){const r=await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));}
const d=await load('app/lesson10-data.ts'),l=await load('app/course-learning.ts'),dict=await load('app/study-lookup-model.ts'),examples=await load('app/study-examples.ts'),reviews=await load('app/course-review-model.ts');
test('Lesson10 preserves source-linked classroom content and writing support',()=>{
 const source=JSON.parse(fs.readFileSync('data/lesson10/source.json'));
 assert.equal(source.files.length,12);assert.equal(d.lesson10Terms.length,104);assert.equal(d.lesson10Sentences.length,39);assert.equal(d.lesson10Topics.length,8);
 const dictionary=dict.appStudyDictionary('en');
 for(const v of d.lesson10All){
  assert.ok(v.hanzi&&v.pinyin&&v.meaning.en&&v.sourceIds.length,v.id);
  for(const ch of v.hanzi)if(/\p{Script=Han}/u.test(ch)){assert.ok(fs.existsSync('public/characters/'+ch+'.json'),ch);assert.ok(dictionary.get(ch)?.pinyin,ch);}
 }
 for(const topic of d.lesson10Topics){assert.ok(topic.note.en);assert.ok(topic.wordIds.every(id=>d.lesson10ById.has(id)));}
 for(const b of d.lesson10Builders.filter(Boolean))assert.equal(b.blocks.join(''),d.lesson10ById.get(b.targetId).hanzi.replace(/[，。？！、,.?!]/gu,''));
 assert.ok(source.uncertainties.length);assert.equal(d.lesson10Optional.length,2);assert.ok(d.lesson10Optional.every(v=>!d.lesson10ById.has(v.id)));
});
test('Lesson10 listening uses verified exact existing bytes; ambiguous bare 干 is never independently tested visually',()=>{
 const reuse=JSON.parse(fs.readFileSync('data/lesson10/audio-reuse.json'));
 for(const [id,clip] of Object.entries(reuse)){const entry=d.lesson10ById.get(id);assert.equal(clip.text,entry.hanzi);assert.equal(clip.pinyin,entry.pinyin);assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public'+clip.source)).digest('hex'),clip.sha256);}
 assert.equal(new Set(d.lesson10ActivityIds).size,d.lesson10ActivityIds.length);
 for(const q of d.lesson10Checks){assert.equal(q.optionIds[q.answer],q.targetId);assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(o=>o.en)).size,4);if(q.mode==='listen')assert.ok(reuse[q.targetId]);if(q.mode==='read')assert.notEqual(d.lesson10ById.get(q.targetId).hanzi,'干');}
 assert.equal(d.lesson10Checks.filter(q=>q.mode==='listen').length,Object.keys(reuse).length);
 assert.ok(examples.studyExamples('电车','en',2,'c10-').some(v=>v.id.startsWith('c10-')));
});
test('Lesson10 independent checks use existing isolated Course scheduling; builders remain assisted',()=>{
 const e={id:'00000000-0000-4000-8000-000000000001',lessonId:'intensive-10',activityId:d.lesson10Checks[0].id,kind:'answer',correct:true,assisted:false,at:Date.now()};
 assert.ok(l.courseEventSchema.safeParse(e).success);assert.ok(l.courseCards([e])[e.activityId]);assert.deepEqual(l.courseCards([{...e,assisted:true}]),{});
 assert.equal(l.courseEventSchema.safeParse({...e,lessonId:'intensive-09'}).success,false);
 const builder={...e,activityId:d.lesson10Builders.filter(Boolean)[0].id};assert.equal(l.courseEventSchema.safeParse(builder).success,false);assert.ok(l.courseEventSchema.safeParse({...builder,assisted:true}).success);
 assert.ok(reviews.reviewableCourseLessons.some(v=>v.id==='intensive-10'));
});
