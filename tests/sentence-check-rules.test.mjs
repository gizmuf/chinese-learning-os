import assert from 'node:assert/strict';
import test from 'node:test';
import {checkSentenceRules} from '../app/sentence-check-rules.ts';

test('starter sentences give a narrow correction, matching pinyin, and a natural variant', () => {
  const past = checkSentenceRules('我昨天不去了学校。', 'en');
  assert.equal(past.status, 'corrected');
  assert.equal(past.correction, '我昨天没去学校。');
  assert.equal(past.pinyin, 'wǒ zuótiān méi qù xuéxiào.');
  assert.equal(past.natural, '昨天我没去学校。');
  assert.equal(past.naturalPinyin, 'zuótiān wǒ méi qù xuéxiào.');
  assert.match(past.explanation, /If you mean the trip did not happen/);

  const comparison = checkSentenceRules('他比我很高。', 'en');
  assert.equal(comparison.status, 'corrected');
  assert.equal(comparison.correction, '他比我高。');
  assert.equal(comparison.pinyin, 'tā bǐ wǒ gāo.');
  assert.equal(comparison.natural, '他比我更高。');
  assert.equal(comparison.naturalPinyin, 'tā bǐ wǒ gèng gāo.');
});

test('recognizes the corresponding well-formed constructions', () => {
  for (const sentence of ['我昨天没去学校。', '昨天我没去学校。', '他比我高。', '他比我更高。', '我没有坐过地铁。', '她在公园跑步。']) {
    const result = checkSentenceRules(sentence, 'en');
    assert.equal(result.status, 'correct', sentence);
    assert.equal(result.correction, sentence);
  }
});

test('corrects only bounded negation and place constructions', () => {
  assert.equal(checkSentenceRules('她不吃过火锅。', 'en').correction, '她没吃过火锅。');
  assert.equal(checkSentenceRules('我跑步在公园!', 'en').correction, '我在公园跑步！');
  assert.equal(checkSentenceRules('我跑步在公园!', 'en').pinyin, 'wǒ zài gōngyuán pǎo bù!');
});

test('unknown grammar, questions and contextual readings stay uncertain and get no suggested text', () => {
  for (const sentence of ['', '我想吃饭。', '他比我很高吗？', '他比我很高？', '我昨天决定不去学校了。', '我每天不去学校。', '我昨天没去学校，我去了医院。', '我住在北京。', '她跑步\n在公园。']) {
    const result = checkSentenceRules(sentence, 'en');
    assert.equal(result.status, 'uncertain', sentence);
    for (const key of ['correction', 'pinyin', 'natural', 'naturalPinyin']) assert.equal(result[key], '');
  }
});

test('all feedback paths offer a specific explanation in the four UI languages', () => {
  const locales = ['en', 'fr', 'ru', 'tr'];
  for (const sentence of ['我昨天不去了学校。', '他比我很高。', '她不吃过火锅。', '她在公园跑步。', '我想吃饭。']) {
    const explanations = locales.map(locale => checkSentenceRules(sentence, locale).explanation);
    assert.ok(explanations.every(explanation => explanation.length > 15), sentence);
    assert.equal(new Set(explanations).size, locales.length, sentence);
  }
});

test('DeepSeek comparison outputs use exact prerecorded Mandarin audio', async () => {
  const { sentenceCheckRecording } = await import('../app/sentence-check-recording.ts');
  const { statSync } = await import('node:fs');
  for (const sentence of ['他比我高很多。', '他比我高得多。']) {
    const asset = sentenceCheckRecording(sentence);
    assert.ok(asset && statSync(new URL('../public' + asset, import.meta.url)).size > 0);
  }
  assert.equal(sentenceCheckRecording('她骑自行车去了图书馆。'), undefined);
});
