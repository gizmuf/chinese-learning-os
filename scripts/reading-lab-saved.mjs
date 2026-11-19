import {createHash, randomBytes} from 'node:crypto';

export const readingLabSavedPath = '/api/reading-lab/saved';
const rate = 24000;
const pauseBytes = 5760 * 2;
const maxAudioBytes = 2 * rate * 360;
const maxStoreBytes = 96 * 1024 * 1024;
const maxReadings = 512;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function initializeSavedReadings(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reading_audio (id TEXT PRIMARY KEY, wav BLOB NOT NULL, starts TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS shared_readings (
      token TEXT PRIMARY KEY, content_hash TEXT UNIQUE NOT NULL, markdown TEXT NOT NULL,
      sentences TEXT NOT NULL, audio_id TEXT NOT NULL REFERENCES reading_audio(id)
    );
  `);
}

function parseReading(value, validText) {
  const {markdown, sentences} = value ?? {};
  if (typeof markdown !== 'string' || !markdown.length || markdown.length > 4800 ||
      !Array.isArray(sentences) || !sentences.length || sentences.length > 24 ||
      !sentences.every(validText) || sentences.reduce((total, text) => total + text.length, 0) > 1600) return;
  const plain = markdown.replace(/&#x20;|&#32;|&nbsp;/giu, ' ').replace(/\\\*/gu, '*');
  if (!sentences.every(text => plain.includes(text))) return;
  return {markdown, sentences};
}

function savedPCM(bytes) {
  if (!bytes) return;
  const wave = Buffer.from(bytes);
  for (let offset = 12; offset + 8 <= wave.length;) {
    const size = wave.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > wave.length) return;
    if (wave.toString('ascii', offset, offset + 4) === 'data') {
      return size && size % 2 === 0 ? wave.subarray(start, start + size) : undefined;
    }
    offset = start + size + (size % 2);
  }
}

function joinSavedClips(db, sentences, cacheDigest) {
  let bytes = 0;
  const starts = [];
  const parts = [];
  const silence = Buffer.alloc(pauseBytes);
  const read = db.prepare('SELECT wav FROM clips WHERE digest = ?');
  for (const text of sentences) {
    const pcm = savedPCM(read.get(cacheDigest(text))?.wav);
    if (!pcm) return;
    if (parts.length) {
      parts.push(silence);
      bytes += silence.length;
    }
    starts.push(bytes / (rate * 2));
    bytes += pcm.length;
    if (bytes > maxAudioBytes) return;
    parts.push(pcm);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(bytes + 36, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(bytes, 40);
  return {wav: Buffer.concat([header, ...parts], bytes + 44), starts};
}

function storeReading(db, reading, cacheDigest) {
  const identity = digest(reading);
  const existing = db.prepare('SELECT token FROM shared_readings WHERE content_hash = ?').get(identity);
  if (existing) return {token: existing.token};
  if (db.prepare('SELECT count(*) AS total FROM shared_readings').get().total >= maxReadings) return {error: 'storage_full'};
  const audioId = digest(reading.sentences);
  if (!db.prepare('SELECT id FROM reading_audio WHERE id = ?').get(audioId)) {
    const audio = joinSavedClips(db, reading.sentences, cacheDigest);
    if (!audio) return {error: 'missing_recording'};
    const size = db.prepare('SELECT coalesce(sum(length(wav)),0) AS bytes FROM reading_audio').get().bytes;
    if (size + audio.wav.length > maxStoreBytes) return {error: 'storage_full'};
    db.prepare('INSERT INTO reading_audio VALUES (?, ?, ?)').run(audioId, audio.wav, JSON.stringify(audio.starts));
  }
  const token = randomBytes(16).toString('hex');
  db.prepare('INSERT INTO shared_readings VALUES (?, ?, ?, ?, ?)').run(
    token, identity, reading.markdown, JSON.stringify(reading.sentences), audioId);
  return {token};
}

function audioRange(header, length) {
  if (!header) return {start: 0, end: length - 1};
  const match = /^bytes=(\d*)-(\d*)$/u.exec(header);
  if (!match || (!match[1] && !match[2])) return;
  const start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(length - 1, Number(match[2])) : length - 1;
  if (Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end) return {start, end};
}

export async function savedReadingResponse(req, res, url, cors, {getStore, validText, readJson, reply, cacheDigest}) {
  if (req.method === 'POST' && !url.search) {
    if (!req.headers.origin) return reply(res, 403, {error: 'invalid_origin'}, cors);
    const reading = parseReading(await readJson(req, 24576), validText);
    if (!reading) return reply(res, 400, {error: 'invalid_request'}, cors);
    const db = getStore();
    db.exec('BEGIN IMMEDIATE');
    let result;
    try {
      result = storeReading(db, reading, cacheDigest);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return reply(res, result.token ? 200 : result.error === 'missing_recording' ? 409 : 507, result, cors);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return reply(res, 405, {error: 'method_not_allowed'}, cors);
  const token = url.searchParams.get('token') ?? '';
  if (!/^[a-f0-9]{32}$/u.test(token)) return reply(res, 404, {error: 'not_found'}, cors);
  const db = getStore();
  const reading = db.prepare(`
    SELECT markdown, sentences, starts, audio_id, length(wav) AS bytes
    FROM shared_readings JOIN reading_audio ON reading_audio.id = audio_id WHERE token = ?
  `).get(token);
  if (!reading) return reply(res, 404, {error: 'not_found'}, cors);
  if (url.searchParams.get('audio') !== '1') {
    return reply(res, 200, {
      markdown: reading.markdown, sentences: JSON.parse(reading.sentences), starts: JSON.parse(reading.starts),
      duration: (reading.bytes - 44) / (rate * 2),
    }, cors);
  }
  const range = audioRange(req.headers.range, reading.bytes);
  const headers = {...cors, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store'};
  if (!range) return reply(res, 416, undefined, {...headers, 'Content-Range': 'bytes */' + reading.bytes});
  const size = range.end - range.start + 1;
  if (req.headers.range) headers['Content-Range'] = 'bytes ' + range.start + '-' + range.end + '/' + reading.bytes;
  headers['Content-Type'] = 'audio/wav';
  headers['Content-Length'] = size;
  const body = req.method === 'HEAD' ? undefined : Buffer.from(
    db.prepare('SELECT substr(wav, ?, ?) AS part FROM reading_audio WHERE id = ?').get(range.start + 1, size, reading.audio_id).part);
  return reply(res, req.headers.range ? 206 : 200, body, headers);
}
