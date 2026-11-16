import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { sentenceAudioTickets } from '../lib/sentence-audio-token.ts';

test('issues independent expiring tickets for exact Mandarin output', async () => {
  const secret = '3f'.repeat(32);
  const correction = '我昨天错过了最后一班公交车。';
  const natural = '我昨天没赶上末班车。';
  const now = 1800000000000;
  const tickets = await sentenceAudioTickets(secret, { correction, natural }, now);
  const expires = now / 1000 + 86400;
  const expected = text => createHmac('sha256', secret).update(expires + '\n' + text).digest('hex');
  assert.deepEqual(tickets, {
    correction: { expires, signature: expected(correction) },
    natural: { expires, signature: expected(natural) },
  });
  assert.notEqual(tickets.correction.signature, tickets.natural.signature);
  assert.equal((await sentenceAudioTickets(secret, { correction, natural: '' }, now)).natural, undefined);
  assert.equal(await sentenceAudioTickets(undefined, { correction, natural }, now), undefined);
  assert.equal(await sentenceAudioTickets(secret, { correction: '', natural: '' }, now), undefined);
});
