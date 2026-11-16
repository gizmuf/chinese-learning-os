import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import {
  checkSentenceWithDeepSeek, JsonBodyTooLarge, parseDailyLimit, parseDeepSeekResult,
  readBoundedJson, reserveSentenceCheckSql, sentenceCheckRequest,
} from '../lib/sentence-check-deepseek.ts';

const input = { sentence: '他比我很高。', locale: 'en' };
const correction = {
  status: 'corrected', correction: '他比我高。', pinyin: 'tā bǐ wǒ gāo.',
  explanation: 'Leave out 很 in this comparison.', natural: '', naturalPinyin: '',
};

function completion(data, finish_reason = 'stop') {
  return Response.json({ choices: [{ finish_reason, message: { role: 'assistant', content: JSON.stringify(data) } }] });
}

test('sends only the submitted sentence and locale with the teacher guide to fixed DeepSeek Flash', async () => {
  let times = 0;
  const actual = await checkSentenceWithDeepSeek('inert-test-key', input, async (url, options) => {
    times += 1;
    assert.equal(url, 'https://api.deepseek.com/chat/completions');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.Authorization, 'Bearer inert-test-key');
    assert.ok(options.signal instanceof AbortSignal);
    const payload = JSON.parse(options.body);
    assert.equal(payload.model, 'deepseek-flash');
    assert.deepEqual(payload.thinking, { type: 'disabled' });
    assert.deepEqual(payload.response_format, { type: 'json_object' });
    assert.equal(payload.tools, undefined);
    assert.equal(payload.messages.length, 2);
    assert.deepEqual(JSON.parse(payload.messages[1].content), input);
    return completion(correction);
  });
  assert.equal(times, 1);
  assert.deepEqual(actual, correction);
});

test('rejects invalid or truncated AI feedback and never retries the paid call', async () => {
  for (const mocked of [completion(correction, 'length'), completion({ ...correction, unrelated: 'extra' }),
    completion({ ...correction, natural: '他比我更高。' }), Response.redirect('https://example.com/', 302), new Response('provider detail', { status: 429 })]) {
    let times = 0;
    await assert.rejects(checkSentenceWithDeepSeek('inert-test-key', input, async () => {
      times++;
      return mocked;
    }));
    assert.equal(times, 1);
  }
  assert.throws(() => parseDeepSeekResult(JSON.stringify({ ...correction, status: 'correct' }), input));
  assert.throws(() => parseDeepSeekResult(JSON.stringify({ ...correction, correction: input.sentence.replace('。', '!') }), input));
  assert.throws(() => parseDeepSeekResult(JSON.stringify({ ...correction, status: 'uncertain', correction: '' }), input));
  assert.deepEqual(parseDeepSeekResult(JSON.stringify({ ...correction, status: 'uncertain', correction: '', pinyin: '' }), input).status, 'uncertain');
});

test('requires one bounded Hanzi input, one supported locale, and no arbitrary message fields', () => {
  for (const locale of ['en', 'fr', 'ru', 'tr']) assert.ok(sentenceCheckRequest.safeParse({ ...input, locale }).success);
  for (const raw of [
    { ...input, locale: 'de' }, { ...input, chat: [] },
    { ...input, sentence: '好'.repeat(161) }, { ...input, sentence: '好\n早' },
    { ...input, sentence: 'Good morning' },
  ]) assert.ok(!sentenceCheckRequest.safeParse(raw).success);
});

test('caps bytes even when a stream has no declared length', async () => {
  const makeResponse = body => new Response(new TextEncoder().encode(body));
  assert.deepEqual(await readBoundedJson(makeResponse('{"s":"好"}'), 12), { s: '好' });
  await assert.rejects(readBoundedJson(makeResponse('{"s":"好"}'), 10), JsonBodyTooLarge);
});

test('reserves within both durable UTC quota windows and resets on rollover', () => {
  assert.equal(parseDailyLimit('1'), 1);
  assert.equal(parseDailyLimit('1000'), 1000);
  for (const raw of [undefined, '0', '1001', '1e2', '2.5', 100]) assert.equal(parseDailyLimit(raw), undefined);
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`
      CREATE TABLE sentence_check_ai_quota (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        utc_day TEXT NOT NULL DEFAULT '',
        daily_used INTEGER NOT NULL DEFAULT 0 CHECK (daily_used >= 0),
        utc_minute TEXT NOT NULL DEFAULT '',
        minute_used INTEGER NOT NULL DEFAULT 0 CHECK (minute_used >= 0)
      ) STRICT;
    `);
    const reserve = db.prepare(reserveSentenceCheckSql
      .replace("date('now')", "date('2026-11-16T10:00:00Z')")
      .replace("'%Y-%m-%dT%H:%M', 'now'", "'%Y-%m-%dT%H:%M', '2026-11-16T10:00:00Z'"));
    assert.equal(reserve.get(2), undefined);
    db.exec('INSERT INTO sentence_check_ai_quota (id) VALUES (1)');
    assert.equal(reserve.get(2)?.daily_used, 1);
    assert.equal(reserve.get(2)?.daily_used, 2);
    assert.equal(reserve.get(2), undefined);
    db.exec("UPDATE sentence_check_ai_quota SET utc_day = '2026-11-15', utc_minute = '2026-11-15T23:59', daily_used = 2, minute_used = 10");
    assert.equal(reserve.get(20)?.daily_used, 1);
    for (let used = 2; used <= 10; used++) assert.equal(reserve.get(20)?.daily_used, used);
    assert.equal(reserve.get(20), undefined);
    db.exec("UPDATE sentence_check_ai_quota SET utc_minute = '2026-11-16T09:59'");
    assert.equal(reserve.get(20)?.daily_used, 11);
  } finally {
    db.close();
  }
});
