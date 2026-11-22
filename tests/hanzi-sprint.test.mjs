import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';

const {outputFiles} = await build({
  stdin:{contents:`export * from './app/hanzi-sprint-model';
    export * from './app/hanzi-sprint-stories';
    export * from './app/hanzi-sprint-copy';`,resolveDir:process.cwd()},
  bundle:true, platform:'node', format:'esm', write:false,
});
const m = await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
const chars = [...m.sprintByHanzi.keys()];
const correct={reading:true,meaning:true}, mixed={reading:true,meaning:false};

test('the sprint keeps every HSK 1–3 character and exactly 345 additional HSK 4 characters',()=>{
  const hsk=JSON.parse(gunzipSync(readFileSync('public/dictionary/hsk-levels-2025.json.gz'))).characters;
  assert.equal(chars.length,1000);
  assert.equal(m.sprintCatalog.length,1000);
  const core=new Set([...hsk['1'],...hsk['2'],...hsk['3']]);
  assert.ok([...core].every(glyph=>chars.includes(glyph)));
  assert.equal(chars.filter(ch=>!core.has(ch)&&hsk['4'].includes(ch)).length,345);
  for(const row of m.sprintCatalog) {
    assert.ok(row.pinyin&&row.meaning&&row.part,row.hanzi);
    if(row.sentence){
      assert.ok(row.sentence.text.includes(row.hanzi),row.hanzi);
      assert.ok(row.sentence.source&&row.sentence.pinyin&&row.sentence.meaning.en,row.hanzi);
      assert.ok(existsSync('public'+row.sentence.audio),row.hanzi);
    }
    if(row.word)assert.ok(row.word.text.includes(row.hanzi)&&row.word.pinyin&&row.word.meaning.en,row.hanzi);
  }
  assert.ok(m.sprintCatalog.filter(row=>row.sentence).length>=800);
});

test('the entry test leaves untested and partial recalls in study; a round covers families with at most six cards',()=>{
  let state=m.freshSprint();
  state=m.recallSprintCharacter(state,'你',correct,1,true);
  state=m.recallSprintCharacter(state,'好',mixed,1,true);
  assert.equal(m.diagnosticQueue(state).length,998);
  const days=m.dailySprintPlan(state);
  const total=days.flat().map(row=>row.hanzi);
  assert.equal(new Set(total).size,999);
  assert.equal(days.length,12);
  assert.ok(days.every(day=>day.length>=77&&day.length<=90));
  assert.ok(!total.includes('你')&&total.includes('好'));
  const families=days.flatMap(m.sprintGroups);
  for(const group of families)assert.ok(group.members.length<=6&&group.members.every(row=>row.part===group.part&&row.clue===group.clue));
  const qing=families.find(group=>group.part==='青'&&group.clue==='sound');
  assert.ok(qing?.members.some(row=>row.hanzi==='清')&&qing.members.some(row=>row.hanzi==='请'));
});

test('successful recall spaces review, difficult recall and writing have separate records, days 13/14 mix the full set',()=>{
  const now=Date.UTC(2026,0,1,12);
  let state=m.freshSprint();
  state=m.recallSprintCharacter(state,'你',correct,now,false,1);
  assert.equal(state.records['你'].due,now+m.dayInMs);
  assert.equal(m.sprintDay(state,now+m.dayInMs),2);
  assert.ok(!m.reviewSprintQueue(state,[],now,false,1).some(row=>row.hanzi==='你'));
  assert.ok(m.reviewSprintQueue(state,[],now+m.dayInMs,false,2).some(row=>row.hanzi==='你'));
  state=m.recallSprintCharacter(state,'你',correct,now+m.dayInMs,false,2);
  assert.equal(state.records['你'].due,now+4*m.dayInMs);
  state=m.recallSprintCharacter(state,'你',mixed,now+4*m.dayInMs,false,5);
  assert.equal(state.records['你'].streak,0);
  assert.ok(m.difficultSprintCharacters(state).some(row=>row.hanzi==='你'));
  assert.ok(m.reviewSprintQueue(state,[],now+4*m.dayInMs,false,5,true).some(row=>row.hanzi==='你'));
  state=m.writeSprintRecord(state,'你',{written:true},now+4*m.dayInMs);
  assert.equal(m.difficultSprintCharacters(state).length,0);
  assert.equal(state.records['你'].latest.meaning,false);
  assert.equal(m.reviewSprintQueue(state,[],now+12*m.dayInMs,true,13).length,1000);
  assert.equal(m.sprintDay(state,now+30*m.dayInMs),14);
});

test('all four Sprint translations include three complete, voiced Atlas stories with distinct structure and scene',()=>{
  const englishKeys=Object.keys(m.hanziSprintCopy.en);
  for(const locale of ['en','fr','ru','tr']){
    assert.deepEqual(Object.keys(m.hanziSprintCopy[locale]),englishKeys);
    const stories=m.sprintStories(locale);
    assert.deepEqual(stories.map(story=>story.target),['零','面条儿','挤']);
    for(const story of stories){
      assert.equal(story.frames.length,3);
      assert.ok(story.frames.every(frame=>frame.structure&&frame.scene&&frame.structure!==frame.scene));
      assert.ok(story.translation&&story.example.pinyin&&existsSync('public'+story.example.recording));
    }
  }
  const swap=new URL(m.sprintAtlas('济','氵'),'https://example.test').searchParams;
  assert.equal(swap.get('buildHanzi'),'济');
  assert.equal(swap.get('buildPart'),'氵');
});
