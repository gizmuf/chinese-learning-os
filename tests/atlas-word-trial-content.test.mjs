import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import test from 'node:test';

const file = path => new URL('../' + path, import.meta.url);
const read = path => JSON.parse(readFileSync(file(path), 'utf8'));
const catalog = read('public/atlas/word-trial/v1.json').entries;
const syllabus = JSON.parse(gunzipSync(readFileSync(file('public/dictionary/hsk-levels-2025.json.gz'))).toString());
const orderedHeads = read('data/atlas-word-trial/heads.json');
const levels = Object.fromEntries(Object.entries(syllabus.words).map(([level, list]) => [level, new Set(list.split('|'))]));

function checkLexicalTerm(term, isCharacter = false) {
  assert.ok(term.hanzi && term.pinyin && term.english, JSON.stringify(term));
  const matches = Object.entries(isCharacter ? syllabus.characters : levels)
    .filter(([, entries]) => isCharacter ? entries.includes(term.hanzi) : entries.has(term.hanzi)).map(([level]) => level);
  assert.deepEqual(term.levels, matches, term.hanzi);
  if ([...term.hanzi].length > 1) {
    assert.equal(term.characters.map(t => t.hanzi).join(''), term.hanzi);
    term.characters.forEach(t => checkLexicalTerm(t, true));
  }
}

test('all 20 word pairs reproduce, including original and newly collected DeepSeek lessons', () => {
  assert.equal(orderedHeads.length, 20);
  assert.equal(orderedHeads[0], '卫生间');
  assert.deepEqual(catalog.map(x => x.head.hanzi), orderedHeads);
  assert.equal(new Set(orderedHeads).size, orderedHeads.length);
  execFileSync('python3', ['scripts/build-atlas-word-trial.py', '--check'], {cwd: file('.')});
  for (const entry of catalog) {
    checkLexicalTerm(entry.head);
    assert.ok(entry.head.levels.some(level => ['1','2','3'].includes(level)), entry.head.hanzi);
    assert.notEqual(entry.versions.gpt.story, entry.versions.deepseek.story);
    for (const [provider, version] of Object.entries(entry.versions)) {
      assert.ok(entry.sources[provider]);
      assert.ok(version.story && version.situations.length >= 2 && version.related.length >= 3);
      for (const term of [...version.cues, ...version.inlineTerms, ...version.related.map(x => x.term)]) checkLexicalTerm(term);
      for (const {sentence, words, label} of version.situations) {
        assert.ok(label && sentence.pinyin && sentence.english);
        assert.equal(words.map(t => t.hanzi).join(''), sentence.hanzi.replace(/[^\p{Script=Han}〇]/gu, ''));
        words.forEach(t => checkLexicalTerm(t));
      }
    }
  }
});

test('the same character takes the exact syllabus role and pronunciation displayed in context', () => {
  const get = word => catalog.find(entry => entry.head.hanzi === word);
  assert.deepEqual(get('间').head.levels, ['2']);
  const component = get('卫生间').head.characters.find(t => t.hanzi === '间');
  assert.deepEqual(component.levels, ['1']);
  const bank = get('银行').head;
  assert.equal(bank.pinyin, 'yínháng');
  assert.equal(bank.characters[1].pinyin, 'háng');
  const noodle = get('面条儿').head;
  assert.equal(noodle.pinyin, 'miàntiáor');
  assert.equal(noodle.characters.at(-1).pinyin, 'ér');
  const extra = get('卫生间').versions.deepseek.related.find(x => x.term.hanzi === '无障碍卫生间');
  assert.deepEqual(extra.term.levels, []);
  assert.match(extra.term.english, /accessible/i);
});
