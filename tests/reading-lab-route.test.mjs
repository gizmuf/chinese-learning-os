import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const {outputFiles: [bundle]} = await build({
  entryPoints: ['app/reading-lab-route.ts'],
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const reading = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));

test('the reader requires both opt-in flags and opens with a plain Hanzi page', () => {
  assert.equal(reading.isReadingLabEntry(new URLSearchParams('atlas=1&reader=1')), true);
  for (const search of ['atlas=1', 'reader=1', 'atlas=1&reader=0', 'atlas=1&workspace=1']) {
    assert.equal(reading.isReadingLabEntry(new URLSearchParams(search)), false, search);
  }
  const route = reading.readReadingLabRoute('?atlas=1&reader=1&article=hsk2-library-meeting&hsk=2');
  assert.deepEqual(route, {level: 2, article: 'hsk2-library-meeting', aid: 'hanzi', chunks: false, paragraph: '', grammar: ''});
  assert.equal(reading.readingLabHref(route), '?atlas=1&reader=1&hsk=2&article=hsk2-library-meeting');
});

test('reader navigation serializes only the article, level, aids and evidence selection', () => {
  const query = '?atlas=1&reader=1&hsk=4&article=hsk4-phone-free-dinner&aid=tones&chunks=1&at=para-2&grammar=rule-1&next=%2Foutside';
  const route = reading.readReadingLabRoute(query);
  const canonical = reading.readingLabReturn(query);
  assert.deepEqual(reading.readReadingLabRoute(canonical), route);
  assert.equal(new URLSearchParams(canonical).has('next'), false);
  assert.equal(reading.readingLabReturn('?atlas=1&workspace=1&hsk=4'), undefined);
  assert.equal(reading.readingLabReturn('https://outside.example/?atlas=1&reader=1'), undefined);
  assert.deepEqual(reading.readReadingLabRoute('?hsk=7&article=%2Fa&aid=auto&chunks=yes&at=..&grammar=%2F'), {
    level: 2, article: '', aid: 'hanzi', chunks: false, paragraph: '', grammar: '',
  });
});

test('a nested written component retains the original reading sentence independently of its dictionary sense', () => {
  const source = {text: '我们在图书馆见。', pinyin: 'Wǒ men zài tú shū guǎn jiàn。', meaning: 'We will meet at the library.'};
  const entry = {text: '囗', pinyin: 'wéi', meaning: 'enclosure'};
  const visit = reading.readingLabAtlasVisit(entry, 'component', source);
  assert.equal(visit.kind, 'component');
  assert.equal(visit.entry, entry);
  assert.equal(visit.source, source);
  assert.equal(visit.entry.contextual, undefined);
  assert.equal(reading.readingLabAtlasVisit(entry, undefined, source).kind, 'character');
});

test('an authored reading sense applies only to the exact word and a Reader opener', () => {
  const generic = {text: '还是', pinyin: 'háishi', meaning: 'or (in questions)', audio: {text: '还是', pinyin: 'háishi', source: '/audio/other.mp3', context: false}};
  const opener = {closest: () => ({}), dataset: {readerHeadword: '还是', readerPinyin: 'háishì', readerMeaning: 'still; after all (expressing a preference)'}};
  const contextual = reading.readingLabContextualEntry(generic, opener);
  assert.equal(contextual.pinyin, 'háishì');
  assert.equal(contextual.meaning, 'still; after all (expressing a preference)');
  assert.equal(contextual.audio, undefined);
  assert.equal(generic.meaning, 'or (in questions)');
  assert.equal(reading.readingLabContextualEntry(generic, {...opener, closest: () => null}), generic);
  const nested = {text: '还', pinyin: 'hái', meaning: 'still'};
  assert.equal(reading.readingLabContextualEntry(nested, opener), nested);
});
