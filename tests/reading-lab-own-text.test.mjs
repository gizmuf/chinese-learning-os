import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';

const {outputFiles: [bundle]} = await build({stdin: {
  contents: `export * from './app/reading-lab-own-text-model';
    export * from './app/reading-lab-own-audio';
    export * from './lib/reading-lab-audio-policy';`,
  resolveDir: process.cwd(),
}, bundle: true, platform: 'node', format: 'esm', write: false});
const m = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));

test('identifies title and its reading, separates two sentences on one line, and keeps source punctuation', () => {
  const sample = '**低头族**\\\r\nDītóuzú\r\n\r\n什么东西都有好处，也有坏处。手机也一样。\r\n「你看到了吗？」\r\n这是最后一行';
  const reading = m.importReading(sample);
  assert.equal(reading.title, '低头族');
  assert.equal(reading.titlePinyin, 'dī tóu zú');
  assert.deepEqual(reading.sentences.map(s => s.text), ['什么东西都有好处，也有坏处。','手机也一样。','「你看到了吗？」','这是最后一行']);
  assert.equal(m.importReading('普通的第一行\n第二句话。').sentences.length, 2);
  assert.equal(m.importReading('Not Mandarin').sentences.length, 0);
});

test('preserves the needed contextual pinyin and finds paired and result patterns', () => {
  const reading = m.importReading('一方面，手机给我们的生活带来了好处，另一方面，手机也带来了很多坏处。\n坐地铁需要手机，打的需要手机。\n电动车开得很快，如果你玩手机，就注意不到危险。');
  assert.ok(reading.sentences[0].grammar.some(p => p.label === '一方面…另一方面…'));
  assert.match(reading.sentences[1].pinyin, /dǎ dī xū yào/u);
  assert.match(reading.sentences[2].pinyin, /kāi de hěn kuài/u);
  assert.deepEqual(
    reading.sentences[2].grammar.map(p => p.label),
    ['如果…就…','动词 + 得 + 描写','动词 + 不到'],
  );
});

test('audio requests reject invalid batches and count distinct sentences within the daily allowance', () => {
  assert.deepEqual(m.parseReadingAudioSentences({sentences: ['我在这里。','我在这里。','走路。']}), ['我在这里。','走路。']);
  for (const sentences of [[], ['a'], ['好\n了'], ['好'.repeat(201)], Array(25).fill('好'), Array(9).fill('好'.repeat(200))]) {
    assert.equal(m.parseReadingAudioSentences({sentences}), undefined);
  }
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync('scripts/reading-lab-audio-quota.sql','utf8'));
    const reserve = db.prepare(m.reserveReadingAudioSql);
    assert.equal(reserve.get(3,5).daily_used, 3);
    assert.equal(reserve.get(3,5), undefined);
    assert.equal(reserve.get(2,5).daily_used, 5);
    db.exec("UPDATE reading_lab_audio_quota SET utc_day = '2020-01-01'");
    assert.equal(reserve.get(4,5).daily_used, 4);
  } finally {db.close();}
});

test('assembled audio cues follow decoded PCM lengths and reuse clips for repeated text', async () => {
  const sentences = m.importReading('你好。再见。你好。').sentences;
  const clip = (length, sample) => ({length, sampleRate: 24000, numberOfChannels: 1,
    getChannelData: () => new Float32Array(length).fill(sample)});
  const buffers = new Map([['你好。', clip(24000, .5)], ['再见。', clip(12000, -.5)]]);
  const track = m.joinSentenceAudio(sentences, buffers);
  assert.deepEqual(track.cues.map(c => c.start), [0,1.24,1.98]);
  assert.equal(track.duration, 2.98);
  const wav = new DataView(await track.wav.arrayBuffer());
  assert.equal(wav.getUint32(24, true), 24000);
  assert.equal(wav.getInt16(44, true), 16384);
  assert.equal(wav.getInt16(44 + 24000 * 2, true), 0);
  assert.equal(wav.getInt16(44 + 29760 * 2, true), -16384);
  assert.throws(() => m.joinSentenceAudio(sentences, new Map()), m.ReadingAudioError);
});
