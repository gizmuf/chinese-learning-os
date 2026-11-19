import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {cacheDigest, createReadingLabGateway, normalizeNarrationWav, openNarrationStore,
  readingLabNarrationPath, readingLabSavedPath} from '../scripts/reading-lab-qwen-gateway.mjs';

function testWave() {
  const wav = Buffer.alloc(4844);
  wav.write('RIFF', 0);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(24000, 24);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  return wav;
}

test('only an explicit permitted POST calls Qwen, with persistent caching and free-quota shutdown', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'reading-lab-qwen-test-'));
  const expires = new Date(Date.now() + 60000).toISOString();
  writeFileSync(join(directory, 'config.json'), JSON.stringify({
    key: 'sk-' + ['dummy', 'example', 'test'].join('.'), workspace: 'ws-example', freeOnly: true, expires, characters: 500,
  }));
  let synthesis = 0;
  const server = createServer(createReadingLabGateway({directory, fetcher: async (url, init) => {
    if (init.method === 'POST') {
      synthesis++;
      const {input} = JSON.parse(init.body);
      assert.equal(input.enable_ssml, false);
      if (synthesis > 1) return Response.json({code: 'AllocationQuota.FreeTierOnly'}, {status: 403});
      return Response.json({usage: {characters: 3}, output: {audio: {url: 'https://mock.aliyuncs.com/audio'}}});
    }
    assert.equal(String(url), 'https://mock.aliyuncs.com/audio');
    return new Response(testWave());
  }}));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const url = 'http://127.0.0.1:' + server.address().port + readingLabNarrationPath;
    const post = (text, origin = 'https://cos.l00p.network') => fetch(url, {
      method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify({text}),
    });
    assert.deepEqual(await (await fetch(url)).json(), {enabled: true, voice: 'qwen'});
    assert.equal((await post('你好。', 'https://example.com')).status, 403);
    assert.equal((await post('not Chinese')).status, 400);
    assert.equal(synthesis, 0);
    const voice = await post('你好。');
    assert.equal(voice.status, 200);
    assert.equal(voice.headers.get('x-narration-cache'), 'MISS');
    const first = Buffer.from(await voice.arrayBuffer());
    assert.equal((await post('今天很冷。')).status, 429);
    assert.equal((await post('我来了。')).status, 429);
    const repeat = await post('你好。', 'https://chineseos.l00p.network');
    assert.equal(repeat.headers.get('x-narration-cache'), 'HIT');
    assert.deepEqual(Buffer.from(await repeat.arrayBuffer()), first);
    assert.equal(synthesis, 2);
  } finally {
    server.close();
    await once(server, 'close');
    rmSync(directory, {recursive: true, force: true});
  }
});

test('saved reading links use cached recordings across origins and support Safari byte ranges without synthesis', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'reading-lab-share-test-'));
  const path = join(directory, 'narration.sqlite');
  const db = openNarrationStore(path);
  const insert = db.prepare('INSERT INTO clips VALUES (?, ?)');
  for (const text of ['你好。', '我来了。']) insert.run(cacheDigest(text), normalizeNarrationWav(testWave()));
  db.close();
  let providerCalls = 0;
  const server = createServer(createReadingLabGateway({directory, fetcher: async () => {
    providerCalls++;
    throw Error('Saved readings must only use recorded clips');
  }}));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const base = 'http://127.0.0.1:' + server.address().port + readingLabSavedPath;
    const reading = {markdown: '你好。\n我来了。', sentences: ['你好。', '我来了。']};
    const save = (value, origin = 'https://cos.l00p.network') => fetch(base, {method: 'POST',
      headers: {Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify(value)});
    assert.equal((await save(reading, 'https://example.com')).status, 403);
    assert.equal((await save({markdown: '新帖子。', sentences: ['新帖子。']})).status, 409);
    const saved = await save(reading);
    assert.equal(saved.status, 200);
    const {token} = await saved.json();
    assert.match(token, /^[a-f0-9]{32}$/u);
    assert.deepEqual(await (await save(reading)).json(), {token});
    assert.equal((await fetch(base)).status, 404);
    const address = base + '?token=' + token;
    const opened = await fetch(address, {headers: {Origin: 'https://chineseos.l00p.network'}});
    assert.equal(opened.headers.get('access-control-allow-origin'), 'https://chineseos.l00p.network');
    const metadata = await opened.json();
    assert.equal(metadata.markdown, reading.markdown);
    assert.deepEqual(metadata.sentences, reading.sentences);
    assert.deepEqual(metadata.starts, [0, .34]);
    assert.equal(metadata.duration, .44);
    const partial = await fetch(address + '&audio=1', {headers: {Range: 'bytes=0-1'}});
    assert.equal(partial.status, 206);
    const length = 44 + .44 * 24000 * 2;
    assert.equal(partial.headers.get('content-range'), 'bytes 0-1/' + length);
    assert.equal(await partial.text(), 'RI');
    const wave = Buffer.from(await (await fetch(address + '&audio=1')).arrayBuffer());
    assert.equal(wave.length, length);
    assert.equal(wave.readUInt32LE(40), wave.length - 44);
    assert.equal(providerCalls, 0);
  } finally {
    server.close();
    await once(server, 'close');
    rmSync(directory, {recursive: true, force: true});
  }
});
