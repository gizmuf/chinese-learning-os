import assert from 'node:assert/strict';
import {statSync} from 'node:fs';
import test from 'node:test';
import {findSwipeStory} from '../app/atlas-swipe-story-data.ts';

test('pilot stories follow verified Atlas character and word identities', () => {
  const zero = findSwipeStory({text: '零', pinyin: 'líng', id: '零', mode: 'characters'});
  const crowded = findSwipeStory({text: '挤', pinyin: 'jǐ', id: '挤', mode: 'characters'});
  const noodles = findSwipeStory({text: '面条儿', pinyin: ' miàn tiáor ', id: 'hsk1-127', mode: 'words'});

  assert.deepEqual(zero?.frames.map(frame => frame.focus), ['雨', '令', '零']);
  assert.deepEqual(crowded?.frames.map(frame => frame.focus), ['扌', '齐', '挤']);
  assert.deepEqual(noodles?.frames.map(frame => frame.focus), ['面', '条', '儿']);
  assert.equal(crowded.related?.hanzi, '济');

  assert.equal(findSwipeStory({text: '零', pinyin: 'líng'.normalize('NFD'), id: 'hsk1-112', mode: 'words'}), zero);
  assert.equal(findSwipeStory({text: '挤', pinyin: 'jǐ', id: 'hsk-browse:5:挤', mode: 'words'}), crowded);

  for (const story of [zero, crowded, noodles]) {
    assert.ok(story.example.hanzi.includes(story.target));
    assert.ok(statSync(new URL('../public' + story.example.recording, import.meta.url)).size > 0);
  }
});

test('pilot lookup rejects ambiguous readings, other senses and other spellings', () => {
  for (const input of [
    {text: '零', pinyin: 'líng', id: 'other-zero-sense', mode: 'words'},
    {text: '零', pinyin: 'ling', id: 'hsk1-112', mode: 'words'},
    {text: '零', pinyin: 'lìng', id: 'hsk1-112', mode: 'words'},
    {text: '挤', pinyin: 'jǐ / jì', id: '挤', mode: 'characters'},
    {text: '面条', pinyin: 'miàntiáo', id: 'hsk1-127', mode: 'words'},
    {text: '面条儿', pinyin: 'miàntiáor', id: '面条儿', mode: 'characters'},
  ]) {
    assert.equal(findSwipeStory(input), undefined);
  }
});
