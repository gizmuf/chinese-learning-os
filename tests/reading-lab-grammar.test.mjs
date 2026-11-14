import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

const {outputFiles: [bundle]} = await build({
  stdin: {
    contents: `export {resolveReadingGrammarFrame} from './app/reading-lab-grammar';
      export {readingLabReadings} from './app/reading-lab-data';
      export {grammarFrames} from './app/chunk-library-data';`,
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const {resolveReadingGrammarFrame, readingLabReadings, grammarFrames} = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64')
);

test('Reading Lab grammar links are limited to equivalent existing constructions', () => {
  const links = readingLabReadings.flatMap(reading => reading.grammar.filter(grammar => grammar.frameId)
    .map(({pattern, frameId}) => [reading.id, pattern, frameId]));
  assert.deepEqual(links, [
    ['hsk3-rain-bike', '如果……就……', 'connect-if'],
    ['hsk3-exchanging-clothes', '比…… + 形容词', 'compare-bi'],
    ['hsk4-phone-free-dinner', '动词 + 得 + 补语', 'complement-de'],
    ['hsk5-neighborhood-deliveries', '即使……也……', 'adv-even-if'],
  ]);
  for (const [, , id] of links) {
    const source = grammarFrames.find(frame => frame.id === id);
    const result = resolveReadingGrammarFrame(id);
    assert.equal(result.id, source.id);
    assert.equal(result.pattern, source.pattern);
    assert.equal(result.explanation, source.learning?.explanation.en ?? source.note.en);
    assert.deepEqual(result.examples, source.examples.map(({hanzi, pinyin, meaning}) => ({hanzi, pinyin, english: meaning.en})));
  }
  assert.equal(resolveReadingGrammarFrame('missing-frame'), undefined);
  assert.equal(resolveReadingGrammarFrame(undefined), undefined);
});
