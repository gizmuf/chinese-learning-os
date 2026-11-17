import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { build } from 'esbuild';
import { indexedDB } from 'fake-indexeddb';

const {outputFiles:[bundle]}=await build({
  stdin:{contents:`export * from './app/hsk3-form'; export * from './app/hsk3-mock-model';
    export * from './app/hsk3-speaking-model'; export * from './app/hsk3-practice-data';
    export * from './app/hsk3-mistakes-model'; export * from './app/hsk3-mistakes-storage';
    export * from './app/hsk3-speaking-storage'; export {authoredCharacterReadings} from './app/pinyin-boundaries';`,
    resolveDir:process.cwd()},
  bundle:true,write:false,format:'esm',platform:'node',
});
const exam=await import('data:text/javascript;base64,'+Buffer.from(bundle.text).toString('base64'));
const baseA=exam.mockSectionsFor('a').flatMap(section=>section.tasks);
const formB=exam.mockSectionsFor('b').flatMap(section=>section.tasks);

test('Form B matches the published exam lengths and uses distinct prompts, scenes and recordings', async()=>{
  assert.deepEqual(exam.mockSectionsFor('b').map(section=>[section.tasks.length,section.duration/60_000]),[[30,23],[30,30],[10,20]]);
  for(const task of formB) {
    const original=baseA[task.id];
    assert.equal(task.kind,original.kind);
    if(task.kind==='choice'){
      assert.equal(task.options.filter(option=>option===task.answer).length,1);
      assert.equal(new Set(task.options).size,task.options.length);
      if(task.pictures) {
        assert.ok(task.options.every(option=>exam.pictureLabel(option)!==option));
        assert.ok(task.options.every(option=>!original.options.includes(option)));
      }
      if(task.audio){
        assert.notEqual(task.transcript,original.transcript);
        const raw=await readFile('public'+task.audio);
        assert.ok(raw.length>8000);
        assert.ok(!raw.equals(await readFile('public'+original.audio)));
      } else assert.notEqual(task.passage,original.passage);
    } else {
      assert.notEqual(task.prompt,original.prompt);
      assert.notEqual(task.example,original.example);
    }
  }
  const spoken=exam.speakingTasksFor('b');
  assert.deepEqual(exam.speakingStepsFor('b').filter(step=>step.phase!=='listen'),
    exam.speakingStepsFor('a').filter(step=>step.phase!=='listen'));
  assert.deepEqual(spoken.map(task=>task.kind),[...Array(8).fill('repeat'),...Array(5).fill('picture'),'question','question']);
  for(const [index,task] of spoken.entries()) {
    const original=exam.speakingTasksFor('a')[index];
    const clip=exam.questionClip(index);
    if(task.kind==='picture') assert.notEqual(task.picture,original.picture);
    else {
      assert.notEqual(task.prompt,original.prompt);
      assert.notEqual(exam.speakingAudio(clip,'b'),exam.speakingAudio(clip,'a'));
    }
    assert.ok((await stat('public'+exam.speakingAudio(clip,'b'))).size>1500);
  }
  const asset=await readFile('public/audio/hsk3-speaking-b/scenes.webp');
  assert.ok(asset.length>20_000&&!asset.equals(await readFile('public/audio/hsk3-speaking/scenes.webp')));
  assert.equal(exam.hskFormStorageKey('existing','a'),'existing');
  assert.notEqual(exam.hskFormStorageKey('existing','a'),exam.hskFormStorageKey('existing','b'));
});

test('written questions all map to new review examples without exposing Form B',async()=>{
  const attempt={...exam.beginMock(0),section:3,deadline:100};
  for(const [form,tasks] of [['a',baseA],['b',formB]]) {
    for(const task of tasks) {
      const seed=exam.mistakeSeed(form,attempt,task);
      const drills=exam.hskMistakeDrills[seed.id];
      assert.ok(drills?.length>=2,form+' question '+task.id+' → '+seed.id);
      for(const drill of drills) {
        if(drill.kind==='choice'){
          assert.equal(new Set(drill.options).size,drill.options.length);
          if(drill.text)assert.notEqual(drill.text,task.passage);
          if(drill.transcript)assert.notEqual(drill.transcript,task.transcript);
        }
        if(drill.audio)assert.ok((await stat('public'+exam.practiceClip(drill.audio))).size>1500);
      }
    }
  }
});

test('missed recognition and writing get independent, rotating reviews with idempotent imports',()=>{
  const now=new Date(2026,10,17,9).getTime();
  const attempt={...exam.beginMock(now),section:3,deadline:now+1,answers:{0:'wrong choice',61:'做',62:'右',65:'这是一个句子。'}};
  const seeds=exam.automaticMistakes('a',attempt,baseA);
  assert.deepEqual(seeds.map(seed=>seed.id),['listen-picture','write-坐']);
  const queue=exam.addMistakes(exam.newMistakeQueue(),seeds,now);
  const writing=exam.mistakeSchedule(queue,now,'writing').due[0];
  assert.equal(exam.mistakeSchedule(queue,now,'recognition').due.length,1);
  assert.equal(writing.id,'write-坐');
  const first=exam.mistakeDrill(writing);
  const reviewed=exam.completeMistake(queue,writing,true,now);
  const tomorrow=new Date(2026,10,18).getTime();
  assert.equal(reviewed.cards[writing.id].dueAt,tomorrow);
  assert.strictEqual(exam.addMistakes(reviewed,seeds,now+100),reviewed);
  assert.strictEqual(exam.completeMistake(reviewed,writing,true,now),reviewed);
  const second=exam.mistakeSchedule(reviewed,tomorrow,'writing').due[0];
  assert.notEqual(exam.mistakeDrill(second),first);
  assert.equal(exam.completeMistake(reviewed,second,true,tomorrow).cards[writing.id].dueAt,new Date(2026,10,21).getTime());
  assert.equal(exam.normalizeDictation(' 我吃完饭， 再给你打电话。 '),'我吃完饭再给你打电话');
});

test('parallel oral attempts and mistake queue survive separate writes',async()=>{
  globalThis.indexedDB=indexedDB;
  const audio=new Blob(['sample'],{type:'audio/mp4'});
  await exam.beginSpeakingAttempt('original','a');
  await exam.beginSpeakingAttempt('alternate','b');
  await exam.saveSpeakingAnswer('original',{question:0,audio},'a');
  await exam.saveSpeakingAnswer('alternate',{question:2,audio},'b');
  await exam.clearSpeakingAnswers('alternate','b');
  assert.equal((await exam.readSpeakingAttempt('a')).answers[0].question,0);
  assert.equal(await exam.readSpeakingAttempt('b'),undefined);

  await Promise.all([
    exam.saveExamMistakes([{id:'write-再',source:'a:source:one'}]),
    exam.saveExamMistakes([{id:'read-passage',source:'unused'},{id:'comparative',source:'b:source:two'}]),
  ]);
  assert.deepEqual(Object.keys((await exam.readMistakeQueue()).cards).sort(),['comparative','write-再']);
});

test('authored Pinyin aligns to every Hanzi and both dōu and duō use three voices',async()=>{
  assert.equal(exam.listenSpeakTasks.length,7);
  for(const task of exam.listenSpeakTasks) {
    for(const [text,pinyin] of task.chunks) assert.ok(exam.authoredCharacterReadings(text,pinyin),text+' '+pinyin);
    for(const voice of task.voices) assert.ok((await stat('public'+exam.listenSpeakClip(task,voice))).size>1500);
  }
  assert.deepEqual(exam.listenSpeakTasks.slice(0,2).map(task=>task.voices.length),[3,3]);
});
