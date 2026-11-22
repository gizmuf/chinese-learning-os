import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

const {outputFiles: [bundle]} = await build({
  stdin: {contents: `
    export * from './app/library-vocabulary-groups-model';
    export {cloudWords} from './app/atlas-cloud-model';
  `, resolveDir: process.cwd()},
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const {libraryVocabularyGroups, cloudWords, vocabularySearchKey} = await import(
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
