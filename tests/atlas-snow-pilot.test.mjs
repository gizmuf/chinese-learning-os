import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

const read = path => readFileSync(new URL('../' + path, import.meta.url));
const folder = 'public/atlas/study-cards/snow-v1/';
const {cards} = JSON.parse(read(folder + 'index.json'));
const official = JSON.parse(gunzipSync(read('public/dictionary/hsk-levels-2025.json.gz')));

test('Snow pilot exposes one annotated card, including every presented lexical item', () => {
  assert.deepEqual(cards.map(entry => entry.hanzi), ['雪']);
  const card = JSON.parse(read(folder + cards[0].pack + '.json')).雪;
  function verify(term, kind) {
    const levels = Object.entries(official[kind]).filter(([, band]) =>
      kind === 'words' ? band.split('|').includes(term.hanzi) : Array.from(band).includes(term.hanzi)
    ).map(([level]) => level);
    assert.deepEqual(term.levels, levels, term.hanzi);
    assert.ok(term.english && term.pinyin, term.hanzi);
  }
  assert.equal(card.words.length, 15);
  assert.equal(card.usage.length, 3);
  assert.equal(card.contexts.length, 4);
  assert.equal(card.comparisons.length, 5);
  assert.equal(card.story.length, 3);
  verify(card.entry, 'characters');
  card.parts.forEach(term => verify(term, 'characters'));
  card.families.flatMap(family => [family.part, ...family.members]).forEach(term => verify(term, 'characters'));
  card.comparisons.forEach(({term}) => verify(term, 'characters'));
  card.words.forEach(word => verify(word, 'words'));
  const examples = [...card.words.map(word => word.example), ...card.contexts, ...card.usage.flatMap(group => group.examples)];
  for (const example of examples) {
    assert.ok(example.pinyin && example.english);
    assert.equal(example.words.map(term => term.hanzi).join(''), example.hanzi.replace(/[^\p{Script=Han}]/gu, ''));
    example.words.forEach(term => verify(term, 'words'));
  }
});
