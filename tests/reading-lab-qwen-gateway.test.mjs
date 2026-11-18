import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {createReadingLabGateway, readingLabNarrationPath} from '../scripts/reading-lab-qwen-gateway.mjs';

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
