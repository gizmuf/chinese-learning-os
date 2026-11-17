import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readFixture = (relative) => readFileSync(new URL(relative, import.meta.url));
const archiveBytes = readFixture('../resources/mandarin-320/source.json');
const archive = JSON.parse(archiveBytes);
const catalog = JSON.parse(readFixture('../data/mandarin-320.json'));

test('the Mandarin 320 archive matches the supplied file byte for byte', () => {
  assert.equal(
    createHash('sha256').update(archiveBytes).digest('hex'),
    '80fe6cabc19eb8d4ec00e618486d8566a0b69c19d500cdca44f7fc1db885ca1a',
  );
});

test('catalog preserves all 320 stable IDs and source order, including repeated examples', () => {
  assert.deepEqual(catalog.entries.map(({ id }) => id), Array.from({ length: 320 }, (_, index) => index + 1));
  assert.deepEqual(
    catalog.entries.map(({ id, hanzi }) => [id, hanzi]),
    archive.entries.map(({ id, hanzi }) => [id, hanzi]),
  );
  assert.deepEqual(catalog.entries.slice(132, 134).map(({ hanzi }) => hanzi), ['哪里', '哪儿']);
  assert.deepEqual(
    catalog.entries.filter(({ example }) => example === '我去超市买东西。').map(({ id }) => id),
    [19, 40, 116, 167],
  );
});

test('catalog contains the 14 original appendix sections and only learner-facing entry fields', () => {
  assert.deepEqual(Object.keys(catalog).sort(), ['appendix', 'entries', 'title']);
  assert.equal(catalog.title, archive.title);
  assert.equal(catalog.appendix.length, 14);
  assert.deepEqual(catalog.appendix, archive.appendix);

  const correctedEntries = archive.entries.map(entry => {
    const corrected = {...entry};
    delete corrected.source_pinyin;
    delete corrected.source_meaning;
    return corrected;
  });
  assert.deepEqual(catalog.entries, correctedEntries);

  for (const index of [59, 66, 70, 180, 212, 234, 286, 313]) {
    assert.equal(catalog.entries[index].pinyin, archive.entries[index].pinyin);
    assert.notEqual(catalog.entries[index].pinyin, archive.entries[index].source_pinyin);
  }
  assert.equal(catalog.entries[0].meaning, 'love; be fond of');
});

test('each exact example resolves to its prebuilt MP3, including the two where variants', () => {
  const audio = JSON.parse(readFixture('../data/mandarin-320-audio.json'));
  const examples = new Set(catalog.entries.map(({ example }) => example));
  assert.equal(examples.size, 298);
  assert.deepEqual(new Set(Object.keys(audio)), examples);
  assert.notEqual(audio[catalog.entries[132].example], audio[catalog.entries[133].example]);

  const paths = new Set();
  for (const [phrase, path] of Object.entries(audio)) {
    const digest = createHash('sha256').update(phrase).digest('hex').slice(0, 20);
    assert.equal(path, `/audio/mandarin-320/${digest}.mp3`, phrase);
    assert.equal(paths.has(path), false, phrase);
    paths.add(path);

    const file = readFixture(`../public${path}`);
    const id3 = file.toString('ascii', 0, 3) === 'ID3';
    const mpegFrame = file[0] === 0xff && (file[1] & 0xe0) === 0xe0;
    assert.ok(file.length > 1024 && (id3 || mpegFrame), phrase);
  }
});

test('recall and sentence exercises use stable per-entry IDs and hide the answer until checking', async () => {
  const { recallMandarin320, sentenceMandarin320 } = await import('../app/mandarin-320-practice-model.ts');
  const seen = new Set();
  const kinds = new Set();

  for (const entry of catalog.entries) {
    const recall = recallMandarin320(entry);
    const sentence = sentenceMandarin320(entry);

    assert.equal(recall.id, `recall-${entry.id}`);
    assert.equal(recall.kind, 'writing', recall.id);
    assert.equal(recall.answer, entry.hanzi, recall.id);
    assert.ok(recall.context.includes(entry.pinyin) && recall.context.includes(entry.meaning), recall.id);

    assert.equal(sentence.id, `sentence-${entry.id}`);
    assert.equal(sentence.answer, sentence.context.includes('＿＿') ? entry.hanzi : entry.example, sentence.id);
    kinds.add(sentence.kind);

    if (sentence.kind === 'build') {
      assert.notEqual(sentence.choices.join(''), sentence.answer, sentence.id);
      const unused = [...sentence.choices];
      let remainder = sentence.answer;
      while (remainder) {
        const index = unused.findIndex((choice) => remainder.startsWith(choice));
        assert.notEqual(index, -1, sentence.id);
        remainder = remainder.slice(unused[index].length);
        unused.splice(index, 1);
      }
      assert.deepEqual(unused, [], sentence.id);
    }

    for (const exercise of [recall, sentence]) {
      assert.ok(!exercise.prompt.includes(exercise.answer), exercise.id);
      assert.ok(!exercise.context.includes(exercise.answer), exercise.id);
      assert.equal(seen.has(exercise.id), false, exercise.id);
      seen.add(exercise.id);
    }
  }

  assert.equal(seen.size, 640);
  assert.deepEqual(kinds, new Set(['gap', 'build']));
});

test('contrast questions have stable identities and one selectable answer', async () => {
  const { mandarin320Contrasts, mandarin320ContrastTopics } = await import('../app/mandarin-320-practice-model.ts');
  assert.equal(mandarin320ContrastTopics.length, mandarin320Contrasts.length);
  assert.ok(mandarin320ContrastTopics.length >= catalog.appendix.length);
  assert.equal(new Set(mandarin320ContrastTopics).size, mandarin320ContrastTopics.length);

  for (const [index, exercise] of mandarin320Contrasts.entries()) {
    assert.equal(exercise.id, `contrast-${String(index + 1).padStart(2, '0')}`);
    assert.equal(exercise.kind, 'choice', exercise.id);
    assert.equal(exercise.choices.filter((choice) => choice === exercise.answer).length, 1, exercise.id);
    assert.ok(exercise.explanation, exercise.id);
    assert.ok(!exercise.prompt.includes(exercise.answer), exercise.id);
    assert.ok(!exercise.context?.includes(exercise.answer), exercise.id);
  }
});
