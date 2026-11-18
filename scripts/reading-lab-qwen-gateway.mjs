import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';

export const readingLabNarrationPath = '/api/reading-lab/narration';
export const model = 'qwen-audio-3.1-tts-plus';
export const voice = 'longanhuan_v3.1';
const instruction = '请用标准普通话自然地说，像日常交谈一样。根据句意安排轻重音和语调，在意群之间自然衔接，语速适中，不要逐字朗读。';
const allowedOrigins = new Set(['https://cos.l00p.network', 'https://chineseos.l00p.network']);
const maxClipBytes = 4 * 1024 * 1024;
const maxLifetimeCharacters = 5000;
const maxDailyCharacters = 1600;
const requestBodyLimit = 2048;

export function cacheDigest(text) {
  return createHash('sha256').update(model + '\n' + voice + '\n' + text).digest('hex');
}

function reply(res, status, value, headers = {}) {
  const wav = Buffer.isBuffer(value);
  const body = wav ? value : value === undefined ? undefined : Buffer.from(JSON.stringify(value));
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Type': wav ? 'audio/wav' : 'application/json',
    ...headers,
    ...(body && {'Content-Length': body.length}),
  });
  res.end(body);
}

async function readText(req) {
  if (!/^application\/json(?:\s*;|$)/iu.test(req.headers['content-type'] || '')) return;
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req.iterator({destroyOnReturn: false})) {
    bytes += chunk.length;
    if (bytes > requestBodyLimit) return;
    chunks.push(chunk);
  }
  try {
    const {text} = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (typeof text === 'string' && text === text.trim() && text.length <= 200 &&
        /\p{Script=Han}/u.test(text) && !/\p{C}/u.test(text)) return text;
  } catch { /* Invalid JSON. */ }
}

export function openNarrationStore(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA busy_timeout = 1000; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS clips (digest TEXT PRIMARY KEY, wav BLOB NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts (digest TEXT NOT NULL, started INTEGER NOT NULL, chars INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS attempts_start ON attempts (started);
    CREATE TABLE IF NOT EXISTS disabled (id INTEGER PRIMARY KEY CHECK (id=1));
  `);
  return db;
}

function reserve(db, digest, chars, settings, now) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const clip = db.prepare('SELECT wav FROM clips WHERE digest = ?').get(digest);
    if (clip) return {clip: Buffer.from(clip.wav), status: 'HIT'};
    if (!settings.key || now >= settings.deadline || db.prepare('SELECT id FROM disabled').get()) {
      return {error: 'free_quota_unavailable', code: 429};
    }
    const dayStart = Math.floor((now + 8 * 3600000) / 86400000) * 86400000 - 8 * 3600000;
    const used = db.prepare('SELECT coalesce(sum(chars),0) total, coalesce(sum(CASE WHEN started >= ? THEN chars ELSE 0 END),0) daily FROM attempts').get(dayStart);
    if (used.total + chars > settings.characters || used.daily + chars > maxDailyCharacters) {
      return {error: 'free_quota_unavailable', code: 429};
    }
    if (db.prepare('SELECT 1 FROM attempts WHERE digest = ? AND started > ?').get(digest, now - 120000)) {
      return {error: 'narration_in_progress', code: 409};
    }
    db.prepare('INSERT INTO attempts VALUES (?, ?, ?)').run(digest, now, chars);
    return {};
  } finally { db.exec('COMMIT'); }
}

async function boundedBytes(response, limit) {
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      size += chunk.value.length;
      if (size > limit) throw Error('Provider response too large');
      chunks.push(chunk.value);
    }
    return Buffer.concat(chunks, size);
  } finally { await reader.cancel().catch(() => {}); }
}

export function normalizeNarrationWav(wav) {
  if (wav.length < 44 || wav.toString('ascii',0,4) !== 'RIFF' || wav.toString('ascii',8,12) !== 'WAVE') {
    throw Error('Invalid Wave audio');
  }
  let pcm = false;
  for (let offset = 12; offset + 8 <= wav.length;) {
    const chunk = wav.toString('ascii',offset,offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (chunk === 'fmt ' && size >= 16 && data + 16 <= wav.length) {
      pcm = wav.readUInt16LE(data) === 1 && wav.readUInt16LE(data + 2) === 1
        && wav.readUInt32LE(data + 4) === 24000 && wav.readUInt16LE(data + 14) === 16;
    }
    if (chunk === 'data' && pcm && wav.length - data >= 4800 && (wav.length - data) % 2 === 0) {
      wav.writeUInt32LE(wav.length - 8,4);
      wav.writeUInt32LE(wav.length - data,offset + 4);
      return wav;
    }
    offset = data + size + (size % 2);
  }
  throw Error('Unexpected Wave format');
}

async function synthesize(fetcher, settings, text) {
  const url = 'https://' + settings.workspace + '.cn-beijing.maas.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer';
  const request = await fetcher(url, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(32000),
    headers: {'Authorization': 'Bearer ' + settings.key, 'Content-Type': 'application/json'},
    body: JSON.stringify({model, input: {text, voice, format: 'wav', sample_rate: 24000,
      rate: 1, pitch: 1, seed: 0, enable_ssml: false, instruction}}),
  });
  const result = JSON.parse((await boundedBytes(request, 32768)).toString('utf8'));
  if (result.code === 'AllocationQuota.FreeTierOnly') return;
  if (!request.ok || !Number.isSafeInteger(result.usage?.characters) ||
      result.usage.characters <= 0 || result.usage.characters > text.length + instruction.length) {
    throw Error('Qwen refused the narration request');
  }
  const media = new URL(result.output.audio.url);
  if (!['https:', 'http:'].includes(media.protocol) || media.port || media.username || media.password ||
      !['.aliyuncs.com', '.alicdn.com'].some(suffix => media.hostname.endsWith(suffix))) {
    throw Error('Unexpected Qwen audio location');
  }
  media.protocol = 'https:';
  const response = await fetcher(media, {redirect: 'error', signal: AbortSignal.timeout(10000)});
  if (!response.ok) throw Error('Qwen audio was unavailable');
  return normalizeNarrationWav(await boundedBytes(response, maxClipBytes));
}

export function createReadingLabGateway({
  directory = join(homedir(), '.config', 'chineseos', 'reading-lab-qwen'),
  fetcher = fetch,
} = {}) {
  let store;
  let active = 0;
  function configuration() {
    try {
      const settings = JSON.parse(readFileSync(join(directory, 'config.json'), 'utf8'));
      const {workspace, freeOnly, characters, key} = settings;
      const deadline = Date.parse(settings.expires);
      if (!/^ws-[a-z0-9]+$/u.test(workspace) || !Number.isFinite(deadline) ||
          !Number.isInteger(characters) || characters < 1 || characters > maxLifetimeCharacters) return;
      return {workspace, characters, deadline,
        key: freeOnly === true && typeof key === 'string' && /^sk-[A-Za-z0-9_-]{12,}$/u.test(key) ? key : undefined};
    } catch { return undefined; }
  }

  return async function handle(req, res) {
    const origin = req.headers.origin;
    const cors = {'Vary': 'Origin'};
    if (origin && !allowedOrigins.has(origin)) return reply(res, 403, {error: 'invalid_origin'}, cors);
    if (origin) cors['Access-Control-Allow-Origin'] = origin;
    if (req.method === 'OPTIONS' && origin && req.headers['access-control-request-method'] === 'POST') {
      return reply(res, 204, undefined, {...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type'});
    }
    const settings = configuration();
    if (req.method === 'GET') return reply(res, 200, {enabled: Boolean(settings), voice: 'qwen'}, cors);
    if (req.method !== 'POST') return reply(res, 405, {error: 'method_not_allowed'}, cors);
    if (!origin) return reply(res, 403, {error: 'invalid_origin'}, cors);
    if (!settings) return reply(res, 503, {error: 'unavailable'}, cors);
    if (active >= 4) return reply(res, 503, {error: 'busy'}, cors);
    active++;
    try {
      const text = await readText(req);
      if (!text) return reply(res, 400, {error: 'invalid_request'}, cors);
      const digest = cacheDigest(text);
      store ??= openNarrationStore(join(directory, 'narration.sqlite'));
      const reserved = reserve(store, digest, text.length + instruction.length, settings, Date.now());
      if (reserved.clip) return reply(res, 200, reserved.clip, {...cors, 'X-Narration-Cache': 'HIT'});
      if (reserved.error) return reply(res, reserved.code, {error: reserved.error}, cors);
      const wav = await synthesize(fetcher, settings, text);
      if (!wav) {
        store.prepare('INSERT OR IGNORE INTO disabled VALUES (1)').run();
        return reply(res, 429, {error: 'free_quota_unavailable'}, cors);
      }
      store.prepare('INSERT OR IGNORE INTO clips VALUES (?, ?)').run(digest, wav);
      return reply(res, 200, wav, {...cors, 'X-Narration-Cache': 'MISS'});
    } catch {
      if (!res.destroyed) return reply(res, 503, {error: 'unavailable'}, cors);
    } finally { active--; }
  };
}
