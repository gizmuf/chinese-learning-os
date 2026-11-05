import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {build} from 'esbuild';
async function load(entry){const r=await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));}
const d=await load('app/lesson11-data.ts'),l=await load('app/course-learning.ts'),dict=await load('app/study-lookup-model.ts'),examples=await load('app/study-examples.ts'),reviews=await load('app/course-review-model.ts');
test('Lesson11 preserves source-linked classroom content and writing support',()=>{
 const source=JSON.parse(fs.readFileSync('data/lesson11/content.json'));
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync('data/lesson11/content.json')).digest('hex'),'055e772b85482a516b2e2f88b9b23b522749aa111783db9ca2c92d36fc25f8fc');
 assert.equal(source.source.photos.length,9);assert.equal(d.lesson11Terms.length,107);assert.equal(d.lesson11Sentences.length,53);assert.equal(d.lesson11Topics.length,8);
 const dictionary=dict.appStudyDictionary('en');
 for(const v of d.lesson11All){
  assert.ok(v.hanzi&&v.pinyin&&v.meaning.en&&v.sourceIds.length,v.id);
  for(const ch of v.hanzi)if(/\p{Script=Han}/u.test(ch)){assert.ok(fs.existsSync('public/characters/'+ch+'.json'),ch);assert.ok(dictionary.get(ch)?.pinyin,ch);}
 }
 for(const topic of d.lesson11Topics){assert.ok(topic.note.en);assert.ok(d.lesson11ById.has(topic.target));}
 for(const b of d.lesson11Builders.filter(Boolean))assert.equal(b.blocks.join(''),d.lesson11ById.get(b.targetId).hanzi.replace(/[，。？！、,.?!]/gu,''));
 assert.equal(d.lesson11Optional.length,0);
 for(const v of d.lesson11All)for(const locale of ['en','fr','ru','tr'])assert.ok(v.meaning[locale],v.id+':'+locale);
});
test('Lesson11 listening uses verified exact existing bytes; ambiguous bare 干 is never independently tested visually',()=>{
 const reuse=JSON.parse(fs.readFileSync('data/lesson11/audio-reuse.json'));
 for(const [id,clip] of Object.entries(reuse)){const entry=d.lesson11ById.get(id);assert.equal(clip.text,entry.hanzi);assert.equal(clip.pinyin,entry.pinyin);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(clip.source.startsWith('/api/practice-recording')?'resources/practice-audio/'+new URL(clip.source,'https://example.test').searchParams.get('file')+'.mp3':'public'+clip.source)).digest('hex'),clip.sha256);}
 assert.equal(new Set(d.lesson11ActivityIds).size,d.lesson11ActivityIds.length);
 for(const q of d.lesson11Checks){assert.equal(q.optionIds[q.answer],q.targetId);assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(o=>o.en)).size,4);if(q.mode==='listen')assert.ok(reuse[q.targetId]);if(q.mode==='read')assert.notEqual(d.lesson11ById.get(q.targetId).hanzi,'干');}
 assert.equal(d.lesson11Checks.filter(q=>q.mode==='listen').length,Object.keys(reuse).length);
 assert.ok(examples.studyExamples('地铁','en',2,'c11-').some(v=>v.id.startsWith('c11-')));
 assert.equal(Object.keys(reuse).length,160);
 assert.deepEqual(new Set(d.lesson11Checks.map(q=>q.topic)),new Set(d.lesson11Topics.map(t=>t.id)));
});
test('Lesson11 independent checks use existing isolated Course scheduling; builders remain assisted',()=>{
 const e={id:'00000000-0000-4000-8000-000000000001',lessonId:'intensive-11',activityId:d.lesson11Checks[0].id,kind:'answer',correct:true,assisted:false,at:Date.now()};
 assert.ok(l.courseEventSchema.safeParse(e).success);assert.ok(l.courseCards([e])[e.activityId]);assert.deepEqual(l.courseCards([{...e,assisted:true}]),{});
 assert.equal(l.courseEventSchema.safeParse({...e,lessonId:'intensive-09'}).success,false);
 const builder={...e,activityId:d.lesson11Builders.filter(Boolean)[0].id};assert.equal(l.courseEventSchema.safeParse(builder).success,false);assert.ok(l.courseEventSchema.safeParse({...builder,assisted:true}).success);
 assert.ok(reviews.reviewableCourseLessons.some(v=>v.id==='intensive-11'));
});
