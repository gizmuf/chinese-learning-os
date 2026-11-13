import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
const data=JSON.parse(readFileSync('data/video-self-introduction/content.json')),locales=['en','fr','ru','tr'];
const sourceLines=data.segments.flatMap(v=>v.sourceSpans);
test('Video curriculum covers every original source span in order and flags the unresolved source gap',()=>{
 assert.equal(sourceLines.length,308);assert.deepEqual(sourceLines.map(v=>v.line),Array.from({length:308},(_,i)=>i+1));
 for(const segment of data.segments){assert.ok(segment.hanzi.trim());assert.ok(segment.pinyin.trim());assert.ok(data.sections.some(s=>s.id===segment.sectionId));for(const lang of locales)assert.ok(segment.meaning[lang]?.trim());
 assert.equal(segment.hanzi,segment.sourceSpans.map(v=>v.text.replace(/\s*\[SOURCE GAP:[\s\S]*?\]/g,'')).join(''));
 }
 const gap=data.segments.find(v=>v.sourceSpans.some(s=>s.time==='14:28'));assert.ok(gap.note.en.includes('14:28'));
});
test('Each quiz has a real, unique correct passage and four distinct choices',()=>{
 assert.equal(data.quizzes.length,32);
 for(const q of data.quizzes){assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);assert.ok(q.choices.includes(q.answer));for(const id of q.choices)assert.ok(data.segments.some(s=>s.id===id));for(const lang of locales)assert.ok(q.prompt[lang]);}
 for(const g of data.grammar)for(const id of g.examples)assert.ok(data.segments.some(s=>s.id===id));
});
const r=await build({entryPoints:['app/video-study-data.ts'],bundle:true,platform:'node',format:'esm',write:false});const m=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
const learningResult=await build({entryPoints:['app/course-learning.ts'],bundle:true,platform:'node',format:'esm',write:false});const learning=await import('data:text/javascript;base64,'+Buffer.from(learningResult.outputFiles[0].text).toString('base64'));
test('All video hanzi have a dictionary reading, meaning and exact-character audio; no sentence is installed as a lookup word',()=>{
 const dict=m.videoDictionary('en');for(const ch of new Set(data.segments.flatMap(v=>Array.from(v.hanzi).filter(h=>/[\u3400-\u9fff]/u.test(h))))){const row=dict.get(ch);assert.ok(row?.pinyin);assert.ok(row.meaning);assert.equal(row.audio.text,ch);assert.ok(row.audio.source.endsWith(m.videoCharId(ch)+'.mp3'));}
 assert.equal(dict.has(data.segments[0].hanzi),false);
});
test('Video tests use existing owner-scoped progress schema and independently schedule reading/listening',()=>{
 const q=m.videoChecks[0],base={id:'00000000-0000-4000-8000-000000000001',lessonId:m.videoMaterialId,activityId:q.activityId,kind:'answer',correct:false,assisted:false,at:1700000000000};
 assert.ok(learning.courseEventSchema.safeParse(base).success);assert.equal(learning.courseEventSchema.safeParse({...base,activityId:'unknown'}).success,false);
 const cards=learning.courseCards([base]);assert.ok(cards[q.activityId]);assert.equal(Object.keys(learning.courseCards([{...base,assisted:true}])).length,0);assert.notEqual(m.videoChecks[0].activityId,m.videoChecks[1].activityId);assert.equal(learning.courseEventSchema.safeParse({...base,activityId:'write:char-4f60',kind:'writing',correct:true,assisted:false}).success,false);
});
