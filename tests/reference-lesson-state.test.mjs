import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const bundle=await build({entryPoints:['app/reference-lesson-state.ts'],bundle:true,platform:'node',format:'esm',write:false});const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const lesson={id:'time-dates',topics:[{id:'ref-time-p01'}],checks:[{id:'ref-time-check-01',optionIds:['a','b']}]};
test('an authored clock and calendar retain their meaning across noon, midnight and month/year boundaries',()=>{
 assert.deepEqual(m.referenceClockAngles(8,30),{hour:255,minute:180});assert.deepEqual(m.referenceClockAngles(0,0),{hour:0,minute:0});assert.deepEqual(m.referenceClockAngles(12,0),{hour:0,minute:0});
 assert.equal(m.referenceDayOffset('2026-12-31',1),'2027-01-01');assert.equal(m.referenceDayOffset('2026-03-01',-1),'2026-02-28');assert.equal(m.referenceDayOffset('2024-03-01',-1),'2024-02-29');
 assert.throws(()=>m.referenceDayOffset('2026-02-30',1));assert.throws(()=>m.referenceClockAngles(24,0));
});
test('typed recall accepts marked or numbered tones but does not silently discard missing or incorrect tones',()=>{
 assert.equal(m.normalizeReferencePinyin('Xiànzài jǐ diǎn le?'),m.normalizeReferencePinyin('xian4zai4 ji3 dian3 le5'));
 assert.notEqual(m.normalizeReferencePinyin('xianzai ji dian le'),m.normalizeReferencePinyin('Xiànzài jǐ diǎn le?'));
 assert.notEqual(m.normalizeReferencePinyin('dian4'),m.normalizeReferencePinyin('diǎn'));
});
test('come/go changes with the speaker reference while the same screen movement remains unchanged',()=>{
 const from={x:0,y:0},to={x:10,y:0};assert.equal(m.referenceMovementDeixis(to,from,to),'来');assert.equal(m.referenceMovementDeixis(from,from,to),'去');
 assert.equal(m.referenceMovementDeixis({x:0,y:10},{x:0,y:0},{x:0,y:10}),'来');assert.throws(()=>m.referenceMovementDeixis({x:0,y:0},{x:-1,y:0},{x:1,y:0}));
});
test('reload preserves assistance and submission identity only for its exact owner/material and known check options',()=>{
 const base=m.emptyReferenceCheckpoint('student-a',lesson),draft={choice:'a',assisted:true,attemptId:'00000000-0000-4000-8000-000000000001',submittedAt:1000},checkpoint={...base,frame:3,drafts:{'ref-time-check-01':draft}};
 const raw=JSON.stringify(checkpoint);assert.deepEqual(m.restoreReferenceCheckpoint(raw,'student-a',lesson),checkpoint);assert.deepEqual(m.restoreReferenceCheckpoint(raw,'student-b',lesson),m.emptyReferenceCheckpoint('student-b',lesson));
 assert.deepEqual(m.restoreReferenceCheckpoint(raw,'student-a',{...lesson,id:'shang'}),m.emptyReferenceCheckpoint('student-a',{...lesson,id:'shang'}));
 assert.deepEqual(m.restoreReferenceCheckpoint(JSON.stringify({...checkpoint,drafts:{unknown:draft}}),'student-a',lesson),base);
 assert.deepEqual(m.restoreReferenceCheckpoint(JSON.stringify({...checkpoint,drafts:{'ref-time-check-01':{...draft,choice:'invented'}}}),'student-a',lesson),base);
 assert.equal(m.persistReferenceCheckpoint({setItem(){throw Error('storage unavailable');}},checkpoint),false);
});
