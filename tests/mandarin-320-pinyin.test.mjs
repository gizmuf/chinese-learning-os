import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {build} from 'esbuild';

const catalog = JSON.parse(readFileSync(new URL('../data/mandarin-320.json', import.meta.url)));
const {outputFiles} = await build({
  entryPoints: ['app/mandarin-320-pinyin.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const {createMandarin320PinyinLookup} = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
const lookup = createMandarin320PinyinLookup(catalog.entries);
const matches = query => lookup(query).map(candidate => candidate.hanzi);

test('all catalog targets can be picked through every listed pronunciation', () => {
  for (const {hanzi, pinyin} of catalog.entries) {
    for (const reading of pinyin.replace(/\s*\(often ([^)]+)\)/g, ' / $1').split(/\s*\/\s*/)) {
      assert.ok(matches(reading).includes(hanzi), hanzi + ' · ' + reading);
    }
  }
});

test('homophones remain distinct and the supplied tone sorts exact pronunciations first', () => {
  for (const query of ['zai', 'zài', 'zai4']) {
    assert.deepEqual(matches(query), ['再', '在']);
  }
  for (const query of ['hé', 'he2']) {
    assert.equal(matches(query)[0], '和');
  }
  for (const query of ['hē', 'he1']) {
    assert.equal(matches(query)[0], '喝');
  }
});

test('accepts numbered, unmarked and keyboard variants of catalog pinyin', () => {
  for (const query of ['nǚ', 'nv', 'nv3', 'nu:3']) {
    assert.ok(matches(query).includes('女'), query);
  }
  for (const query of ['ba4ba5', 'bàba', 'ba ba']) {
    assert.ok(matches(query).includes('爸爸'), query);
  }
  assert.ok(matches('ge0').includes('个'));
  for (const query of ['', '!', '和', 'zai8', 'h']) {
    assert.deepEqual(matches(query), []);
  }
});
