import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {build} from 'esbuild';

const read = path => JSON.parse(readFileSync(path));
const recordings = read('data/lesson-sentence-audio.json');
const {outputFiles: [bundle]} = await build({
  stdin: {
    contents: `
      export {readingLabReadings} from './app/reading-lab-data';
      export {resolveReadingGrammarFrame} from './app/reading-lab-grammar';
      export {practicalFamilyExercises} from './app/practical-family-exercise-data';
      export {frequencyAlternatives, resultAlternatives} from './app/connectors-phone-model';
    `,
    resolveDir: process.cwd(),
  },
  bundle:true, platform:'node', format:'esm', write:false,
});
const data = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));

test('curated examples and full answers all resolve to matching saved MP3s', () => {
  const root = 'public/atlas/study-cards/v1/';
  const {pack} = read(root + 'index.json').cards.find(entry => entry.hanzi === '雪');
  const card = read(root + pack + '.json')['雪'];
  const expected = {
    snowLines: [
      ...card.words.flatMap(word => word.example ? [word.example] : []),
      ...card.usage.flatMap(group => group.examples),
      ...card.contexts,
    ].map(example => example.hanzi),
    connectors: [
      ...data.frequencyAlternatives.map(item => item.example),
      '我先坐地铁，然后走路。',
      data.resultAlternatives[2].hanzi,
    ],
    supplements: data.readingLabReadings.flatMap(reading => [
      ...reading.grammar.flatMap(grammar => [
        grammar.example,
        ...data.resolveReadingGrammarFrame(grammar.frameId)?.examples ?? [],
      ]),
      reading.writing.example,
    ].filter(Boolean).map(example => example.hanzi)),
    familyPractice: Object.values(data.practicalFamilyExercises)
      .flatMap(group => group.questions.map(q => q.before + q.answer + q.after)),
    hanziFamily: read('data/hanzi-families-2026-11-17-practice.json')
      .filter(exercise => exercise.kind === 'build').map(exercise => exercise.answer),
  };
  for (const [section, texts] of Object.entries(expected)) {
    assert.deepEqual(new Set(Object.keys(recordings[section])), new Set(texts), section);
  }
  for (const clips of Object.values(recordings)) {
    for (const [text, clip] of Object.entries(clips)) {
      assert.equal(clip.text, text);
      assert.match(clip.source, /^\/(?:[a-z0-9-]+\/)+[a-z0-9-]+\.mp3$/i);
      assert.equal(createHash('sha256').update(readFileSync('public' + clip.source)).digest('hex'), clip.sha256, text);
    }
  }
});
