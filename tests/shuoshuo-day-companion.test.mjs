import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const lesson=JSON.parse(readFileSync('data/shuoshuo-day-companion-01.json','utf8'));
const shell=readFileSync('app/study-app.tsx','utf8');
const component=readFileSync('app/shuoshuo-day-companion.tsx','utf8');
const personal=readFileSync('app/my-day-lesson.tsx','utf8');
const hanzi=/\p{Script=Han}/u;

test('video provenance is explicit and no fabricated transcript is attributed to Shuo',()=>{
  assert.equal(lesson.source.videoId,'V6SrjHDisDs');
  assert.equal(lesson.source.url,'https://www.youtube.com/watch?v=V6SrjHDisDs');
  assert.equal(lesson.source.author,'ShuoshuoChinese说说中文');
  assert.equal(lesson.source.verifiedTranscript,false);
  assert.match(lesson.source.sourceNote,/not quotations/i);
  assert.match(component,/not the video's transcript/);
  assert.ok(!component.includes('sourceSpans'));
});

test('six independent daily-life scenes have complete Hanzi/pinyin/English and vocabulary links',()=>{
  assert.equal(lesson.scenes.length,6);
  const ids=new Set(),lexicon=new Set(lesson.vocabulary.map(v=>v.hanzi));
  assert.equal(lexicon.size,lesson.vocabulary.length);
  assert.equal(lesson.vocabulary.length,23);
  for(const word of lesson.vocabulary){
    assert.ok(hanzi.test(word.hanzi));assert.ok(word.pinyin.trim());assert.ok(word.english.trim());
  }
  for(const scene of lesson.scenes){
    assert.ok(!ids.has(scene.id));ids.add(scene.id);
    assert.ok(hanzi.test(scene.hanzi));assert.ok(scene.pinyin.trim());assert.ok(scene.english.trim());
    assert.ok(scene.words.length>=3);
    for(const text of scene.words)assert.ok(lexicon.has(text),text);
    assert.ok(!hanzi.test(scene.pinyin),'pinyin should use Latin letters');
  }
});

test('companion has a separate deep-link and is discoverable from both My lessons and My Day',()=>{
  assert.ok(shell.includes('rehearsal=shuo-video-day-01'));
  assert.ok(shell.includes('Open video lesson'));
  assert.ok(shell.includes('ShuoshuoDayCompanion'));
  assert.ok(personal.includes('Open A Day with Shuo'));
  assert.ok(component.includes('onMyDay'));
  assert.ok(component.includes('onBack'));
  assert.ok(component.includes('StudyText'));
});

test('only existing canonical items are eligible for writing and supported review',()=>{
  assert.ok(component.includes('canonical.get(v.hanzi)'));
  assert.ok(component.includes('canonical.has(word.hanzi)'));
  assert.ok(component.includes('queue={linked} practice'));
  assert.ok(component.includes('myDayAtlasLink(known)'));
  assert.ok(!readFileSync('app/content.ts','utf8').includes('shuoshuo-day-companion-01'));
});
