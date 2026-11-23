import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';

const {outputFiles: [bundle]} = await build({
  stdin: {
    contents: `export * from './app/reading-lab-model'; export {hskLevelIndex} from './app/hsk-level-model';
      export {authoredCharacterReadings} from './app/pinyin-boundaries';
      export {readingLabReadings} from './app/reading-lab-data';
      export {contextualDictionaryEntry} from './app/dictionary-source-model';`,
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const model = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));
const metadata = JSON.parse(await readFile('data/hsk-levels-source.json', 'utf8'));
const compressed = await readFile('public' + metadata.asset);
const index = model.hskLevelIndex(JSON.parse(gunzipSync(compressed).toString()));

const example = {hanzi: '明天见。', pinyin: 'Míngtiān jiàn.', english: 'See you tomorrow.'};
const tokens = [
  {text: '明天', pinyin: ['míng', 'tiān']},
  {text: '见。', pinyin: ['jiàn']},
  {text: '明天', pinyin: ['míng', 'tiān']},
  {text: '！', pinyin: []},
  {text: '巾', pinyin: ['jīn']},
  {text: '杳然。', pinyin: ['yǎo', 'rán']},
];
const article = {
  id: 'sample', level: 2, title: example, topic: 'A plan', levelIntent: 'Words for setting a time.',
  paragraphs: [{id: 'p1', english: 'A short dialogue.', sentenceEnglish: ['See you tomorrow.', 'Tomorrow!', 'A cloth is far away.'], chunks: [{id: 'c1', tokens}]}],
  grammar: [{id: 'time', pattern: '明天 + action', note: 'The time comes first.', example, sourceChunks: ['c1']}],
  questions: [{id: 'when', question: 'When?', answer: 'Tomorrow.', evidence: {paragraphId: 'p1', chunkId: 'c1'}}],
  writing: {prompt: 'Write an invitation.', english: 'Use your own words.', requirements: ['Give a time.']},
  glossaryCandidates: ['巾'],
};

test('Podcast 53 has aligned reading aids, evidence, and vocabulary from the companion text', () => {
  const reading = model.readingLabReadings.find(row => row.id === 'podcast-53-after-work');
  assert.equal(reading.level, 3);
  assert.deepEqual(model.validateReading(reading), []);
  assert.equal(reading.paragraphs.flatMap(model.splitReadingSentences).length, 16);
  const words = new Set(reading.paragraphs.flatMap(p => p.chunks.flatMap(c => c.tokens.map(t => t.text))));
  assert.ok(reading.episode.vocabulary.every(entry => words.has(entry.hanzi)));
  assert.equal(reading.episode.youtubeId, 'rFaUTrhom5Y');
  assert.deepEqual(reading.episode.chapters.map(c => c.seconds), [0, 161, 333, 577, 772, 962, 1096]);
});

test('authored readings map tone signs to Hanzi and leave punctuation unmarked', () => {
  assert.deepEqual(model.tokenGlyphs({text: '妈妈，', pinyin: ['mā', 'ma']}), [
    {text: '妈', pinyin: 'mā', tone: 1, mark: '¯'}, {text: '妈', pinyin: 'ma', tone: 5, mark: '·'}, {text: '，'},
  ]);
  assert.deepEqual(['mā', 'má', 'mǎ', 'mà', 'ma', 'lǜ'].map(model.syllableTone), [1, 2, 3, 4, 5, 4]);
  assert.deepEqual(model.paragraphsText(article), ['明天见。明天！巾杳然。']);
});

test('unknown, multiple, or misaligned syllables stop validation instead of generating tones', () => {
  for (const pinyin of ['?', 'xiànzhǎng', 'hǎo hǎo', 'nǐ/nì', 'mā̌', 'xi3', 'abc', '']) assert.equal(model.syllableTone(pinyin), undefined, pinyin);
  assert.equal(model.tokenGlyphs({text: '行', pinyin: []}), undefined);
  assert.equal(model.tokenGlyphs({text: '行，行', pinyin: ['xíng', 'háng']}), undefined);
  const invalid = {...article, paragraphs: [{...article.paragraphs[0], chunks: [{id: 'other', tokens: [{text: '行', pinyin: ['?']}]}]}]};
  const summary = model.validateReading(invalid).join('\n');
  assert.match(summary, /pinyin alignment.*行/);
  assert.match(summary, /sentenceEnglish must align/);
  assert.match(summary, /invalid grammar source chunk/);
  assert.match(summary, /invalid question evidence/);
  assert.throws(() => model.analyzeReading(invalid, index), /pinyin alignment/);
});

test('sentence popup context keeps colon and closing quote with the exact authored translation', () => {
  const paragraph = {id: 'p', english: 'Paragraph gloss.', sentenceEnglish: ['Li asks, “Shall we go tomorrow?”', 'I nodded.'], chunks: [{id: 'c', tokens: [
    {text: '小李', pinyin: ['xiǎo', 'lǐ']}, {text: '问：“', pinyin: ['wèn']}, {text: '明天', pinyin: ['míng', 'tiān']},
    {text: '去', pinyin: ['qù']}, {text: '吗？”', pinyin: ['ma']}, {text: '我', pinyin: ['wǒ']}, {text: '点头。', pinyin: ['diǎn', 'tóu']},
  ]}]};
  const sentences = model.splitReadingSentences(paragraph);
  assert.deepEqual(sentences.map(({tokens, ...example}) => example), [
    {hanzi: '小李问：“明天去吗？”', pinyin: 'Xiǎo lǐ wèn：“míng tiān qù ma？”', english: 'Li asks, “Shall we go tomorrow?”'},
    {hanzi: '我点头。', pinyin: 'Wǒ diǎn tóu。', english: 'I nodded.'},
  ]);
  assert.equal(sentences[0].tokens.at(-1), paragraph.chunks[0].tokens[4]);
  assert.equal(sentences[1].tokens[0], paragraph.chunks[0].tokens[5]);
});

test('all reader sentences pass exact authored readings through the shared dictionary parser', async () => {
  const data = JSON.parse(await readFile('data/reading-lab.json', 'utf8'));
  const examples = new Map();
  for (const reading of data.readings) {
    for (const paragraph of reading.paragraphs) {
      for (const sentence of model.splitReadingSentences(paragraph)) {
        const authored = sentence.tokens.flatMap(token => model.tokenGlyphs(token))
          .filter(glyph => glyph.pinyin).map(glyph => ({character: glyph.text, pinyin: glyph.pinyin.toLowerCase()}));
        const label = `${reading.id}/${paragraph.id}: ${sentence.hanzi}`;
        assert.deepEqual(model.authoredCharacterReadings(sentence.hanzi, sentence.pinyin), authored, label);
        for (const token of sentence.tokens) if (['可能', '去年', '电饭锅'].includes(token.text)) examples.set(token.text, sentence);
      }
    }
  }
  for (const [word, glyphs] of [['可能', {可: 'kě', 能: 'néng'}], ['去年', {去: 'qù', 年: 'nián'}], ['电饭锅', {饭: 'fàn', 锅: 'guō'}]]) {
    const sentence = examples.get(word);
    assert.ok(sentence, word);
    for (const [glyph, pinyin] of Object.entries(glyphs)) {
      const entry = model.contextualDictionaryEntry({text: glyph, pinyin: 'incorrect', meaning: 'sample'}, {text: sentence.hanzi, pinyin: sentence.pinyin, meaning: sentence.english});
      assert.equal(entry.pinyin, pinyin, `${word}/${glyph}`);
    }
  }
});

test('coverage counts exact official word tokens and distinct types, including catalogue supplements', async () => {
  assert.equal(createHash('sha256').update(compressed).digest('hex'), metadata.assetSha256);
  const result = model.analyzeReading(article, index);
  assert.deepEqual(result.totals, {tokens: 5, types: 4});
  assert.deepEqual(result.coverage.find(row => row.level === 2), {level: 2, tokenCount: 3, typeCount: 2, tokenPercent: 60, typePercent: 50});
  assert.deepEqual(result.tokens.find(word => word.headword === '见').levels, ['1']);
  assert.ok(index.characters.get('巾')?.length);
  assert.deepEqual(result.offList.map(word => [word.text, word.count]), [['巾', 1], ['杳然', 1]]);
  const browse = JSON.parse(await readFile('data/hsk-browse-index.json', 'utf8'));
  const dictionaryHeadwords = new Set(browse.words.map(word => word.hanzi));
  const headword = '精彩纷呈';
  assert.equal(dictionaryHeadwords.has(headword), true);
  const classifierFixture = {...article, paragraphs: [{id: 'p1', english: 'Splendid.', sentenceEnglish: ['Splendid.'], chunks: [{id: 'c1', tokens: [{text: headword, pinyin: ['jīng', 'cǎi', 'fēn', 'chéng']}]}]}]};
  const tested = model.analyzeReading(classifierFixture, index);
  assert.deepEqual(tested.offList, []);
  assert.deepEqual(tested.aboveLevel.map(entry => [entry.text, entry.firstLevel]), [[headword, '7-9']]);
});
