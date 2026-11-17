import test from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { build } from 'esbuild';

const {outputFiles:[bundle]}=await build({entryPoints:['app/hsk3-mock-model.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {mockSections,pictureLabel,beginMock,finishMockSection,syncMockClock,scoreMockSection}=await import('data:text/javascript;base64,'+Buffer.from(bundle.text).toString('base64'));

test('full mock has the official counts, original response types and 30 recorded prompts',async()=>{
  assert.deepEqual(mockSections.map(section=>[section.tasks.length,section.duration/60_000]),[[30,23],[30,30],[10,20]]);
  const tasks=mockSections.flatMap(section=>section.tasks);
  assert.deepEqual(tasks.map(task=>task.id),Array.from({length:70},(_,index)=>index));
  for(const task of tasks.filter(task=>task.kind==='choice')) {
    assert.equal(task.options.filter(option=>option===task.answer).length,1,task.prompt);
    assert.equal(new Set(task.options).size,task.options.length);
    if(task.pictures) assert.ok(task.options.every(value=>pictureLabel(value)!==value));
    if(task.audio) assert.ok((await stat('public'+task.audio)).size>8000);
  }
  assert.deepEqual(mockSections[2].tasks.map(task=>task.kind),Array(5).fill('character').concat(Array(5).fill('sentence')));
});

test('expired sections lock and use absolute dates even across a background interval',()=>{
  const attempt=beginMock(20);
  const first=attempt.deadline;
  assert.equal(syncMockClock(attempt,first-1),attempt);
  const reading=syncMockClock({...attempt,position:7,answers:{7:'answer'}},first);
  assert.deepEqual([reading.section,reading.position,reading.deadline,reading.answers[7]],[1,0,first+30*60_000,'answer']);
  assert.equal(syncMockClock(reading,first+50*60_000).section,3);
  const early=finishMockSection(attempt,100);
  assert.equal(early.deadline,100+30*60_000);
});

test('typed characters grade exactly; Pencil and original sentences go to self-review',()=>{
  const attempt=beginMock(0);
  attempt.answers={60:'安',61:'错',65:'这个地方很方便。'};
  attempt.ink={62:[[{x:.1,y:.1,p:.5,t:0}]],63:[[]]};
  assert.deepEqual(scoreMockSection(mockSections[2],attempt),{correct:1,automatic:4,review:2,answered:4});
});
