import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {build} from 'esbuild';

const {outputFiles: [bundle]} = await build({
  stdin: {
    contents: "export * from './app/reading-lab-narrator-model'; export * from './app/reading-lab-data';",
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const {readingLabReadings, narrationFor, narrationCueAt, narrationStep, narrationPosition, matchesNarration, narrationRates} =
  await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));
const demo = readingLabReadings.find(reading => reading.id === 'my-day-morning-audio');
const track = narrationFor(demo);
const manifest = JSON.parse(readFileSync('data/reading-lab-narration.json'));
const qwen = JSON.parse(readFileSync('data/qwen-curriculum-audio.json'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('all built-in readings have a recording with exact sentence cues', () => {
  const preparedTracks = JSON.parse(readFileSync('data/reading-lab-prepared-narration.json'));
  for (const reading of readingLabReadings) {
    const narration = narrationFor(reading);
    assert.ok(narration && matchesNarration(reading, narration), reading.id);
    if (reading !== demo) assert.equal(digest(readFileSync('public' + narration.source)), preparedTracks[reading.id].sha256);
  }
  assert.ok(matchesNarration(demo, track));
  assert.equal(matchesNarration(demo, {...track, cues: track.cues.slice(1)}), false);
  assert.equal(matchesNarration(demo, {...track, cues: track.cues.map(cue => ({...cue, text: '别的文字。'}))}), false);
});

test('the demo cues refer to validated recordings and in-file frame positions', () => {
  const wav = readFileSync('public' + manifest.source);
  assert.equal(digest(wav), manifest.sha256);
  assert.equal(wav.readUInt32LE(24), manifest.sampleRate);
  assert.equal(wav.readUInt32LE(40) / 2, manifest.frames);
  assert.equal(manifest.voice, qwen.voice);
  assert.equal(manifest.model, qwen.model);
  for (const cue of manifest.cues) {
    const source = qwen.recordings.find(clip => clip.material === 'my-day-01-v2' && clip.id === cue.clipId);
    assert.ok(source.validated);
    assert.equal(source.text, cue.text);
    assert.equal(source.sha256, cue.clipSha256);
    assert.equal(digest(readFileSync('public' + source.source)), cue.clipSha256);
  }
});

test('seeking maps real playback time to sentence boundaries and clips out-of-range values', () => {
  assert.equal(narrationCueAt(track, -1), 0);
  assert.equal(narrationCueAt(track, track.cues[2].start - 0.001), 1);
  assert.equal(narrationCueAt(track, track.cues[2].start), 2);
  assert.equal(narrationCueAt(track, track.duration + 3), 5);
  assert.equal(narrationPosition(track, NaN), 0);
});

test('continuous, repeat, and listen-then-repeat resolve the same audio boundary differently', () => {
  const boundary = track.cues[2].start;
  assert.deepEqual(narrationStep(track, 'continuous', 1, boundary), {kind: 'follow', index: 2, position: boundary});
  assert.deepEqual(narrationStep(track, 'repeat', 1, boundary), {kind: 'loop', index: 1, position: track.cues[1].start});
  assert.deepEqual(narrationStep(track, 'listen-repeat', 1, boundary + 0.05), {kind: 'wait', index: 1, position: boundary});
  assert.equal(narrationStep(track, 'continuous', 5, track.duration).kind, 'finish');
  assert.equal(narrationStep(track, 'listen-repeat', 5, track.duration).kind, 'wait');
  assert.equal(narrationStep(track, 'repeat', 5, track.duration).position, track.cues[5].start);
});

test('speed changes are real media multipliers; timestamps remain media seconds', () => {
  assert.deepEqual(narrationRates, [0.75, 0.9, 1, 1.15]);
  const sourcePosition = track.cues[3].start;
  for (const rate of narrationRates) {
    const elapsed = sourcePosition / rate;
    assert.equal(narrationCueAt(track, elapsed * rate), 3);
  }
});
