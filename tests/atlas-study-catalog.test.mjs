import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {test} from 'node:test';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';

const root = new URL('../', import.meta.url);
const raw = path => readFileSync(new URL(path, root));
const json = path => JSON.parse(raw(path));
const directory = 'public/atlas/study-cards/v1/';
const index = json(directory + 'index.json');
const official = JSON.parse(gunzipSync(raw('public/dictionary/hsk-levels-2025.json.gz')));
const structure = new Map(json('data/hanzi-structure.json').characters.map(row => [row.hanzi, row]));
const words = new Map();
const recognition = new Map();
for (const [level, entries] of Object.entries(official.words)) {
  for (const hanzi of new Set(entries.split('|'))) words.set(hanzi, [...(words.get(hanzi) ?? []), level]);
}
for (const [level, entries] of Object.entries(official.characters)) {
  for (const hanzi of entries) recognition.set(hanzi, [level]);
}
const packs = new Map(readdirSync(new URL(directory, root)).filter(name => /^\d+\.json$/u.test(name))
  .map(name => [name.slice(0, -5), json(directory + name)]));
const cards = new Map([...packs.values()].flatMap(pack => Object.entries(pack)));
const sentenceKey = value => value.replace(/[^\p{Script=Han}]/gu, '');

function verifyTerm(term, expected, label) {
  assert.match(term.hanzi, /\p{Script=Han}|[\u2e80-\u2fff\u31c0-\u31ef\ue000-\uf8ff]/u, label);
  assert.equal(typeof term.pinyin, 'string', label);
  assert.ok(term.english.trim(), label);
  assert.deepEqual(term.levels, expected.get(term.hanzi) ?? [], `${label} ${term.hanzi} HSK bands`);
}
function verifySentence(example, focus, label) {
  assert.ok(example.hanzi.includes(focus), label);
  assert.match(example.pinyin, /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/u, label);
  assert.ok(example.english.trim(), label);
  assert.ok(example.words?.length > 1, label);
  assert.equal(example.words.map(word => word.hanzi).join(''), sentenceKey(example.hanzi), label);
  let cursor = 0;
  for (const word of example.words) {
    verifyTerm(word, words, label);
    const at = example.hanzi.indexOf(word.hanzi, cursor);
    assert.ok(at >= cursor, `${label}: ${word.hanzi} must occur in order in ${example.hanzi}`);
    cursor = at + word.hanzi.length;
  }
}

test('every official vocabulary spelling through HSK 3 appears on a study card', () => {
  const syllabusWords = new Set(['1', '2', '3'].flatMap(level => official.words[level].split('|')));
  const taughtWords = new Set([...cards.values()].flatMap(card => card.words.map(word => word.hanzi)));
  assert.deepEqual([...syllabusWords].filter(word => !taughtWords.has(word)), []);
});

test('study index and bounded packs have exactly the recognition characters of official HSK 1–3', () => {
  const expected = [...recognition].filter(([, levels]) => ['1', '2', '3'].includes(levels[0])).map(([hanzi]) => hanzi);
  assert.equal(expected.length, 655);
  assert.deepEqual(index.cards.map(entry => entry.hanzi), expected);
  assert.deepEqual([...cards.keys()].sort(), [...expected].sort());
  assert.equal([...packs.values()].reduce((sum, pack) => sum + Object.keys(pack).length, 0), 655);
  assert.ok(raw(directory + 'index.json').byteLength < 80_000);
  for (const [pack, entries] of packs) {
    assert.ok(Object.keys(entries).length <= 10, pack);
    assert.ok(raw(`${directory}${pack}.json`).byteLength < 160_000, pack);
  }
  for (const {pack, ...entry} of index.cards) {
    assert.deepEqual(packs.get(pack)?.[entry.hanzi].entry, entry);
    verifyTerm(entry, recognition, entry.hanzi);
    assert.ok(entry.pinyin.trim(), entry.hanzi);
  }
});

test('all cards have real examples, exact lexical levels, shape labels, and individual mnemonic scenes', () => {
  let later = 0;
  let outside = 0;
  const scenes = new Set();
  for (const [glyph, card] of cards) {
    assert.ok(card.story.length && card.story.every(scene => typeof scene === 'string' && scene.length > 30), glyph);
    assert.ok(!scenes.has(card.story.join('\n')), glyph);
    scenes.add(card.story.join('\n'));
    assert.ok(card.words.length && card.words.some(word => word.example), glyph);
    assert.ok(card.contexts.length >= 2 && card.usage.length && card.comparisons.length && card.families.length, glyph);
    assert.equal(new Set(card.contexts.map(context => sentenceKey(context.hanzi))).size, card.contexts.length, glyph);
    for (const part of card.parts) verifyTerm(part, recognition, glyph);
    for (const family of card.families) {
      verifyTerm(family.part, recognition, glyph);
      assert.ok(family.members.length, glyph);
      assert.equal(new Set(family.members.map(member => member.hanzi)).size, family.members.length, glyph);
      for (const member of family.members) verifyTerm(member, recognition, glyph);
    }
    for (const comparison of card.comparisons) {
      assert.ok(comparison.note.trim(), glyph);
      if (glyph !== '雪') assert.ok(comparison.note.includes(glyph) && comparison.note.includes(comparison.term.hanzi), glyph);
      verifyTerm(comparison.term, [...comparison.term.hanzi].length === 1 ? recognition : words, glyph);
    }
    for (const word of card.words) {
      assert.ok(word.hanzi.includes(glyph), glyph);
      verifyTerm(word, words, glyph);
      assert.ok(word.pinyin.trim(), glyph);
      later += word.levels.some(level => ['4', '5', '6', '7-9'].includes(level));
      outside += word.levels.length === 0;
      if (word.example) {
        verifySentence(word.example, word.hanzi, glyph);
        assert.ok(word.example.words.some(token => token.hanzi === word.hanzi), `${glyph}: ${word.hanzi}`);
      }
    }
    for (const example of card.contexts) verifySentence(example, glyph, glyph);
    for (const group of card.usage) {
      assert.ok(group.title.trim() && group.examples.length, glyph);
      for (const example of group.examples) verifySentence(example, glyph, glyph);
    }
    if (structure.get(glyph).decomposition === glyph) assert.equal(card.parts.length, 0, glyph);
  }
  assert.ok(later > 1_500 && outside > 100);
});

test('pilot snow and high-frequency characters retain useful vocabulary and real component distinctions', () => {
  assert.deepEqual(cards.get('雪'), json('data/atlas-study-snow.json'));
  const snow = new Map(cards.get('雪').words.map(row => [row.hanzi, row.levels]));
  assert.deepEqual(snow.get('雪'), ['1']);
  assert.deepEqual(snow.get('下雪'), []);
  assert.deepEqual(snow.get('滑雪'), ['6']);
  assert.deepEqual(snow.get('雪山'), ['7-9']);
  assert.deepEqual(cards.get('睛').parts.map(row => row.hanzi), ['目', '青']);
  assert.deepEqual(cards.get('晴').parts.map(row => row.hanzi), ['日', '青']);
  assert.ok(cards.get('睛').families.find(family => family.part.hanzi === '青').members.some(row => row.hanzi === '晴'));
  assert.ok(cards.get('人').families.find(family => family.part.hanzi === '亻').members.some(row => row.hanzi === '你'));
  assert.ok(cards.get('阿').families.find(family => family.part.hanzi === '阝').members.every(row => row.hanzi !== '都'));
  for (const glyph of ['雨', '车', '人']) {
    assert.ok(cards.get(glyph).words.length >= 12);
    assert.ok(cards.get(glyph).contexts.length >= 3);
  }
  const curry = cards.get('咖').words.find(word => word.hanzi === '咖喱');
  assert.equal(curry.pinyin, 'gālí');
  assert.deepEqual(curry.levels, []);
  const contexts = cards.get('还').contexts.flatMap(context => context.words);
  assert.ok(contexts.some(word => word.hanzi === '还' && word.pinyin === 'hái'));
  assert.ok(contexts.some(word => word.hanzi === '还' && word.pinyin === 'huán'));
});

test('conventional component names remain separate from readings and retain their attribution', () => {
  const components = [...cards.values()].flatMap(card => card.parts);
  for (const [hanzi, namePinyin] of Object.entries({
    '辶': 'zǒuzhīpáng', '灬': 'sìdiǎndǐ', '阝': 'shuāng’ěrpáng', '丶': 'diǎn',
    '丨': 'shù', '丿': 'piě', '亅': 'shùgōu',
  })) {
    const part = components.find(part => part.hanzi === hanzi);
    assert.equal(part?.namePinyin, namePinyin, hanzi);
    assert.equal(part.pinyin, '', hanzi);
    assert.equal(cards.get(hanzi)?.entry.namePinyin, undefined, hanzi);
  }
  const horizontal = components.find(part => part.hanzi === '一');
  assert.equal(horizontal?.namePinyin, 'héng');
  assert.equal(horizontal.pinyin, 'yī');
  assert.match(index.sources.components.names.strokes, /^https:\/\/www\.moe\.gov\.cn\//u);
  assert.equal(index.sources.dictionary.copyright, 'CC-CEDICT contributors');
  assert.equal(index.sources.dictionary.licenseURL, 'https://creativecommons.org/licenses/by-sa/4.0/');
});

test('sparse families use attested stroke positions, nested components and dictionary indexing', () => {
  const source = JSON.parse(gunzipSync(raw('public/dictionary/characters.json.gz')));
  const ids = glyph => structure.get(glyph)?.decomposition ?? source[glyph].decomposition;
  function verifyReadings(family) {
    for (const term of [family.part, ...family.members]) {
      assert.ok(term.pinyin.split(' / ').some(reading => source[term.hanzi].pinyin.includes(reading)), term.hanzi);
    }
  }
  assert.equal(ids('一'), '一');
  for (const [glyph, position, peers] of [
    ['一', undefined, ['三', '下', '上', '旦']],
    ['再', 'top', ['三', '下', '二']],
    ['卫', 'bottom', ['上', '旦', '二']],
  ]) {
    const [family] = cards.get(glyph).families;
    assert.equal(family.part.hanzi, '一');
    assert.equal(family.part.namePinyin, 'héng');
    assert.equal(family.position, position);
    assert.deepEqual(family.members.map(term => term.hanzi), peers);
    for (const peer of position ? [glyph, ...peers] : peers) {
      assert.equal(ids(peer)[0], '⿱');
      if (position) assert.equal(ids(peer)[position === 'top' ? 1 : 2], '一');
      else assert.ok(ids(peer).includes('一'));
    }
    verifyReadings(family);
  }
  const [dance] = cards.get('舞').families;
  assert.equal(dance.part.hanzi, '舛');
  assert.equal(dance.position, 'bottom');
  assert.deepEqual(dance.members.map(({hanzi, levels}) => [hanzi, levels]), [['舜', []], ['瞬', ['6']]]);
  assert.match(ids('舞'), /^⿱.舛$/u);
  assert.match(ids('舜'), /^⿱.*舛$/u);
  assert.equal(ids('瞬'), '⿰目舜');
  assert.match(dance.notes.en, /nested inside 舜/u);
  verifyReadings(dance);

  const [indexed] = cards.get('已').families;
  assert.equal(ids('已'), '已');
  assert.equal(indexed.basis, 'dictionary-radical');
  assert.equal(indexed.position, undefined);
  assert.equal(indexed.part.hanzi, source.已.radical);
  assert.deepEqual(indexed.members.map(term => term.hanzi), ['己']);
  assert.equal(source.己.radical, '己');
  verifyReadings(indexed);
});

test('generated study assets reproduce byte for byte from their checked-in sources', () => {
  const result = execFileSync(process.execPath, ['scripts/build-atlas-study-cards.mjs', '--check'], {cwd: root, encoding: 'utf8'});
  assert.match(result, /"stories": 655/);
});
