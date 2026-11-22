import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

const {outputFiles: [bundle]} = await build({
  stdin: {
    contents: "export * from './app/atlas-swipe-model'; export * from './app/atlas-swipe-word-branches-model';",
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const {swipeMap, wordBranches, wordCross, wordFrames} = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));

test('一起 links each horizontal neighbor to its distinct HSK 3 family', () => {
  const frames = wordFrames('en', 3, '一', false);
  const current = frames.find(frame => frame.text === '一起');
  const {left, right} = swipeMap(frames, current, false).neighbours;
  assert.deepEqual([left.text, right.text], ['一些', '一定']);
  const [leftFamily] = wordBranches(left, '一', 3);
  const [rightFamily] = wordBranches(right, '一', 3);
  assert.equal(leftFamily.anchor, '些');
  assert.equal(rightFamily.anchor, '定');
  assert.ok(leftFamily.words.some(word => word.text === '这些' && word.pinyin && word.meaning));
  assert.deepEqual(rightFamily.words.map(({text, anchor}) => [text, anchor]), [['决定', '定']]);
  assert.ok(wordBranches(right, '一', 'all')[0].words.some(word => word.text === '规定'));
});

test('看见 has independently scrollable horizontal extensions at HSK 6', () => {
  const frames = wordFrames('en', 6, '看', false);
  const current = frames.find(frame => frame.text === '看见');
  const {left: [left], right: [right]} = wordCross(current, 6).peers;
  assert.deepEqual([left.text, right.text], ['看病', '看来']);
  for (const [candidate, anchor] of [[left, '病'], [right, '来']]) {
    const [family] = wordBranches(candidate, '看', 6);
    assert.equal(family.anchor, anchor);
    assert.ok(family.words.length >= 10);
    assert.equal(new Set(family.words.map(word => word.text)).size, family.words.length);
    assert.ok(family.words.every(word => word.anchor === anchor && word.text.includes(anchor) && word.text !== candidate.text));
  }
});

test('多元 has two real peers in every direction and 元 wraps at the end of its family', () => {
  const current = wordFrames('en', 'all', '多', false).find(frame => frame.text === '多元');
  const {horizontal, vertical, peers} = wordCross(current, 'all');
  assert.deepEqual([horizontal, vertical], ['多', '元']);
  assert.deepEqual(Object.fromEntries(Object.entries(peers).map(([direction, words]) => [direction, words.map(word => word.text)])), {
    left: ['多余', '多亏'], right: ['多半', '多边'], up: ['单元', '元首'], down: ['公元', '状元'],
  });
  const next = wordCross({...peers.down[1], anchor: '状'}, 'all', '元');
  assert.equal(next.vertical, '元');
  assert.deepEqual(next.peers.down.map(word => word.text), ['元', '元旦']);
  assert.equal(new Set(Object.values(next.peers).flat().map(word => word.text)).size, 8);
});

test('connections support repeated hanzi, long words and empty branches', () => {
  const frames = wordFrames('en', 'all', '', true);
  const find = text => frames.find(frame => frame.text === text);
  assert.deepEqual(wordBranches(find('一心一意'), '一', 'all').map(branch => branch.anchor), ['心', '意']);
  assert.deepEqual(wordBranches(find('乒乓球'), '乒', 'all').map(({anchor, words}) => [anchor, words.length === 0]),
    [['乓', true], ['球', false]]);
  assert.deepEqual(wordBranches(find('一'), '一', 'all'), []);
  assert.deepEqual(wordBranches(find('乒乓球'), '一', 'all'), []);
  const short = wordCross(find('面条儿'), 1);
  assert.deepEqual(Object.values(short.peers).flat().map(word => word.text), ['面包']);
  const oneGlyph = wordCross(find('元'), 'all', '元');
  assert.equal(oneGlyph.horizontal, undefined);
  assert.equal(oneGlyph.vertical, '元');
  assert.deepEqual(Object.values(oneGlyph.peers).flat().map(word => word.text), ['状元', '公元', '元旦', '元素']);
});
