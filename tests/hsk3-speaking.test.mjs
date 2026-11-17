import test from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { build } from 'esbuild';
import { indexedDB } from 'fake-indexeddb';

const {outputFiles:[bundle]}=await build({
  stdin:{contents:"export * from './app/hsk3-speaking-model'; export * from './app/hsk3-speaking-storage';",resolveDir:process.cwd()},
  bundle:true,write:false,format:'esm',platform:'node',
});
const {speakingTasks,speakingSteps,speakingAudio,speakingClock,readSpeakingAnswers,beginSpeakingAttempt,saveSpeakingAnswer,clearSpeakingAnswers}
  =await import('data:text/javascript;base64,'+Buffer.from(bundle.text).toString('base64'));

test('official oral sample windows and all 15 original prompts are in order',async()=>{
  const records=speakingSteps.filter(step=>step.phase==='record');
  assert.deepEqual(records.map(step=>step.question),Array.from({length:15},(_,index)=>index));
  assert.deepEqual(records.map(step=>step.seconds),[...Array(8).fill(10),...Array(5).fill(15),90,90]);
  assert.deepEqual(speakingSteps.filter(step=>step.phase==='prepare').map(step=>[step.question,step.seconds]),[[13,180],[14,180]]);
  assert.equal(new Set(speakingTasks.filter(t=>t.kind==='picture').map(t=>t.picture)).size,5);
  for(const step of speakingSteps.filter(step=>step.phase==='listen')) assert.ok((await stat('public'+speakingAudio(step.clip))).size>1500);
  assert.ok((await stat('public/audio/hsk3-speaking/scenes.webp')).size>20_000);
  assert.equal(speakingClock(90),'1:30');
});

test('each answer survives reload and stale tabs cannot append to a newer attempt',async()=>{
  globalThis.indexedDB=indexedDB;
  const audio=new Blob(['recording'],{type:'audio/mp4'});
  await beginSpeakingAttempt('first');
  assert.equal(await saveSpeakingAnswer('first',{question:0,audio}),true);
  const found=await readSpeakingAnswers();
  assert.equal(found.length,1);
  assert.equal(found[0].audio.type,'audio/mp4');
  assert.equal(await found[0].audio.text(),'recording');
  await beginSpeakingAttempt('second');
  assert.equal(await saveSpeakingAnswer('first',{question:1,audio}),false);
  assert.equal(await saveSpeakingAnswer('second',{question:2,audio}),true);
  assert.deepEqual((await readSpeakingAnswers()).map(answer=>answer.question),[2]);
  await clearSpeakingAnswers();
  assert.deepEqual(await readSpeakingAnswers(),[]);
});
