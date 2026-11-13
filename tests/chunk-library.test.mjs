import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import fs from 'node:fs';import crypto from 'node:crypto';
const result=await build({stdin:{contents:`export * from './app/chunk-library-data';export {chunkActivityIds} from './app/speaking-chunks-data';export {chunkReviewSummary} from './app/speaking-chunks-model';export {courseEventSchema} from './app/course-learning';export {libraryCopy} from './app/chunk-library-copy';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const d=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const langs=['en','fr','ru','tr'];const now=1800000000000;const event=(id,patch={})=>({id:crypto.randomUUID(),lessonId:'speaking-chunks',activityId:id,kind:'answer',correct:true,assisted:false,at:now,...patch});
test('Complete HSK1–3 word-in-context catalogue: 300/200/500, exact masks, pinyin, all four meanings and no leaked hint',()=>{
 assert.equal(d.vocabularyChunkTasks.length,1000);assert.deepEqual([1,2,3].map(level=>d.vocabularyChunkTasks.filter(t=>t.level===level).length),[300,200,500]);
 for(const task of d.vocabularyChunkTasks){assert.equal(task.parts.join(''),task.hanzi);assert.ok(task.targets.length);assert.ok(task.pinyin&&task.wordPinyin);for(const lang of langs){assert.ok(task.hint[lang]&&task.meaning[lang]&&task.title[lang]);assert.ok(!task.hint[lang].includes(task.word),task.id+' '+lang);}for(const index of task.targets)assert.equal(task.parts[index],task.word);assert.ok(d.clozeCorrect(task,d.clozeAnswers(task)));}
});
test('54 purpose-grouped frames have 108 examples with valid separated holes, original translations and sources',()=>{
 assert.equal(d.grammarFrames.length,54);assert.equal(d.grammarChunkTasks.length,108);assert.equal(d.grammarFrames.filter(f=>f.level==='extension').length,37);
 for(const frame of d.grammarFrames){assert.ok(frame.sources.every(s=>s.startsWith('https://')));for(const lang of langs)assert.ok(frame.title[lang]&&frame.note[lang]);for(const ex of frame.examples){assert.equal(ex.parts.join(''),ex.hanzi);assert.ok(ex.pinyin);assert.deepEqual([...new Set(ex.targets)].sort((a,b)=>a-b),ex.targets);for(const index of ex.targets)assert.ok(ex.parts[index]);for(const lang of langs)assert.ok(ex.meaning[lang]&&ex.hint[lang]);}}
 const t=d.grammarChunkTasks.find(t=>t.id==='chunk-frame-attitude-interest-1');assert.deepEqual(d.clozeAnswers(t),['对','感兴趣']);assert.ok(d.clozeCorrect(t,[' 对 ','感 兴趣。']));for(const input of [['感兴趣','对'],['对感兴趣'],['对','喜欢'],['对',''],['duì','gǎn xìngqù']])assert.equal(d.clozeCorrect(t,input),false);
});
test('New cloze activities are disjoint from legacy sentence recall and share the existing account-scoped registry',()=>{
 assert.equal(d.clozeTasks.length,1138);assert.equal(d.chunkActivityIds.length,1168);assert.equal(new Set(d.chunkActivityIds).size,1168);
 for(const id of d.chunkActivityIds){assert.ok(d.taskByActivity(id));assert.ok(d.courseEventSchema.safeParse(event(id)).success);assert.ok(!d.courseEventSchema.safeParse(event(id,{lessonId:'intensive-08'})).success);}
 assert.equal(d.taskByActivity('chunk-frame-unknown'),undefined);assert.ok(!d.courseEventSchema.safeParse(event('chunk-frame-unknown')).success);
 const id=d.clozeActivityIds[0],legacy=event('chunk-recall-request-1'),correct=event(id,{at:now+2}),help=event(id,{assisted:true});assert.equal(d.chunkReviewSummary([legacy],now).known,1);assert.equal(d.chunkReviewSummary([legacy],now).due.includes(id),false);assert.equal(d.chunkReviewSummary([help],now).known,0);assert.equal(d.chunkReviewSummary([correct],now).known,1);
 const wrong=event(id,{correct:false});assert.deepEqual(d.chunkReviewSummary([wrong,help],now).difficult,[id]);assert.deepEqual(d.chunkReviewSummary([wrong,correct],now).difficult,[]);
});
test('All catalogue recordings exist and exact authored frame text matches the retained voice manifest',()=>{
 const manifest=JSON.parse(fs.readFileSync('public/speaking-chunks/audio/manifest.json'));assert.equal(manifest.voice,'zh-CN-XiaoxiaoNeural');assert.equal(manifest.generationRate,'-10%');
 for(const task of d.clozeTasks){assert.ok(fs.existsSync('public'+task.audio),task.audio);for(const path of Object.values(task.pieceAudio??{}))assert.ok(fs.existsSync('public'+path),path);}
 for(const task of d.grammarChunkTasks){const id=task.audio.split('/').pop().slice(0,-4);assert.equal(manifest.recordings.find(r=>r.id===id)?.text,task.hanzi);for(const index of task.targets){const partId=task.pieceAudio[index].split('/').pop().slice(0,-4);assert.equal(manifest.recordings.find(r=>r.id===partId)?.text,task.parts[index]);}}
 for(const row of manifest.recordings)assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public/speaking-chunks/audio/'+row.file)).digest('hex'),row.sha256);
 for(const value of Object.values(d.libraryCopy))for(const lang of langs)assert.ok(value[lang]);
});
