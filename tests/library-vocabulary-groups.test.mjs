import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

const {outputFiles: [bundle]} = await build({
  stdin: {contents: `
    export * from './app/library-vocabulary-groups-model';
    export {cloudWords} from './app/atlas-cloud-model';
  `, resolveDir: process.cwd()},
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const {libraryVocabularyGroups, searchVocabularyGroups, cloudWords, vocabularySearchKey} = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));

test('both groupings cover the full selected curriculum including alternate readings', () => {
  for (const [onlyLevel, total] of [[false, 1000], [true, 500]]) {
    const expected = cloudWords('en', 3).filter(word => !onlyLevel || word.level === 3);
    assert.equal(expected.length, total);
    for (const kind of ['hanzi', 'component']) {
      const result = libraryVocabularyGroups('en', 3, onlyLevel, kind);
      assert.equal(result.total, total);
      assert.deepEqual(result.groups.flatMap(group => group.entries.map(({word}) => word.id)).sort(),
        expected.map(word => word.id).sort());
    }
  }
});

test('exact-level groups contain upper-band words also listed at an earlier level', () => {
  const official = JSON.parse(gunzipSync(readFileSync('public/dictionary/hsk-levels-2025.json.gz')));
  for (const level of [4, 5, 6, '7-9']) {
    const expected = new Set(official.words[level].split('|'));
    const {groups, total} = libraryVocabularyGroups('en', level, true, 'hanzi');
    const words = groups.flatMap(group => group.entries.map(({word}) => word));
    assert.equal(total, expected.size);
    assert.ok(words.every(word => word.level === level));
    assert.deepEqual(new Set(words.map(word => word.hanzi)), expected);
  }
  assert.ok(cloudWords('en', 4, true).some(word => word.hanzi === '两' && word.level === 4));
});

test('character and part searches show the whole family, including words filed under another group', () => {
  const hanzi = libraryVocabularyGroups('en', 3, false, 'hanzi');
  const [life] = searchVocabularyGroups(hanzi, '生');
  assert.equal(life.id, 'hanzi:生');
  assert.equal(life.entries.length, 16);
  assert.ok(life.entries.some(({word}) => word.hanzi === '学生'));
  assert.deepEqual(searchVocabularyGroups(hanzi, '學'), searchVocabularyGroups(hanzi, '学'));
  const components = libraryVocabularyGroups('en', 3, false, 'component');
  const [water] = searchVocabularyGroups(components, '氵');
  assert.equal(water.id, 'component:氵');
  assert.equal(water.entries.length, 40);
  assert.deepEqual(water.entries.find(({word}) => word.hanzi === '洗衣机').highlights, ['洗']);
});

test('word searches show matching rows and pinyin distinguishes ü from u', () => {
  const model = libraryVocabularyGroups('en', 3, false, 'hanzi');
  const words = query => searchVocabularyGroups(model, query).flatMap(group => group.entries.map(({word}) => word.hanzi));
  assert.deepEqual(words('洗衣机'), ['洗衣机']);
  assert.ok(words('lv').includes('旅游'));
  assert.deepEqual(words('lu:you').filter(word => word === '旅游'), ['旅游']);
  assert.ok(!words('lu').includes('旅游'));
});

test('group headings match the highlighted characters and ungrouped words remain browsable', () => {
  const hanzi = libraryVocabularyGroups('en', 3, false, 'hanzi').groups;
  const school = hanzi.find(group => group.id === 'hanzi:学');
  assert.ok(school.entries.some(({word}) => word.hanzi === '学校'));
  assert.ok(school.entries.some(({word}) => word.hanzi === '学生'));
  assert.ok(school.entries.every(({word, highlights}) => word.hanzi.includes('学') && highlights.join('') === '学'));

  const components = libraryVocabularyGroups('en', 3, false, 'component').groups;
  const water = components.find(group => group.id === 'component:氵');
  assert.ok(water.entries.some(({word, highlights}) => word.hanzi === '酒店' && highlights.includes('酒')));
  assert.ok(water.entries.every(({word, highlights}) => highlights.every(glyph => word.hanzi.includes(glyph))));
  const pinyin = components.filter(group => group.kind === 'pinyin');
  assert.ok(pinyin.length > 0);
  for (const {entries} of pinyin) {
    const readings = entries.map(({word}) => vocabularySearchKey(word.pinyin));
    assert.deepEqual(readings, [...readings].sort((a, b) => a.localeCompare(b, 'en')));
  }
});
