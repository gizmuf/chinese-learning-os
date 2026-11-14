import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createPronunciationRecorder} from '../app/pronunciation-recorder.ts';

function mockRecording(t) {
  const permission = Promise.withResolvers();
  const render = Promise.withResolvers();
  const events = [];
  const data = new Float32Array(24000);
  const processor = {onaudioprocess: null, connect() {}, disconnect() {}};
  const stream = {getTracks: () => [{stop: () => events.push('track stopped')}]};
  const node = {connect() {}, disconnect() {}};
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true, value: {getUserMedia: () => {events.push('permission'); return permission.promise;}},
  });
  t.after(() => {delete navigator.mediaDevices;});
  globalThis.AudioContext = class {
    sampleRate = 48000;
    async resume() {}
    async close() {events.push('context closed');}
    createMediaStreamSource() {events.push('connected'); return node;}
    createScriptProcessor() {return processor;}
    createGain() {return {...node, gain: {value: 1}};}
  };
  globalThis.OfflineAudioContext = class {
    createBuffer() {return {copyToChannel() {}};}
    createBufferSource() {return {...node, start() {}};}
    startRendering() {events.push('encoding'); return render.promise;}
  };
  t.after(() => {delete globalThis.AudioContext; delete globalThis.OfflineAudioContext;});
  let encoded;
  const recorder = createPronunciationRecorder({
    onRecording: () => events.push('recording'),
    onProcessing: () => events.push('processing'),
    onReady: (pcm, wav) => {events.push('ready'); encoded = {pcm, wav};},
    onError: error => events.push(String(error)),
  });
  t.after(recorder.discard);
  return {
    recorder, permission, events, stream, encoded: () => encoded,
    sample: () => processor.onaudioprocess({inputBuffer: {getChannelData: () => data}}),
    complete: () => render.resolve({getChannelData: () => new Float32Array([1, -1, 0.5])}),
  };
}

test('discard releases a stream granted after unmount without starting recording', async t => {
  const {recorder, permission, events, stream} = mockRecording(t);
  const pending = recorder.start();
  await Promise.resolve();
  assert.deepEqual(events, ['permission']);
  recorder.discard();
  permission.resolve(stream);
  await pending;
  assert.deepEqual(events, ['permission', 'context closed', 'track stopped']);
});

test('discard during capture releases the stream without starting encoding', async t => {
  const {recorder, permission, events, stream, sample} = mockRecording(t);
  permission.resolve(stream);
  await recorder.start();
  sample();
  recorder.discard();
  await recorder.stop();
  assert.deepEqual(events, ['permission', 'connected', 'recording', 'track stopped', 'context closed']);
});

test('discard during resampling suppresses the late result and leaves no playback to create', async t => {
  const {recorder, permission, events, stream, sample, complete} = mockRecording(t);
  permission.resolve(stream);
  await recorder.start();
  sample();
  const pending = recorder.stop();
  recorder.discard();
  complete();
  await pending;
  assert.deepEqual(events, ['permission', 'connected', 'recording', 'track stopped', 'context closed', 'processing', 'encoding']);
});

test('Stop releases the microphone and returns original 16 kHz mono PCM and WAV', async t => {
  const {recorder, permission, events, stream, sample, complete, encoded} = mockRecording(t);
  permission.resolve(stream);
  await recorder.start();
  sample();
  const pending = recorder.stop();
  complete();
  await pending;
  assert.equal(events.at(-1), 'ready');
  assert.deepEqual([...encoded().pcm], [255, 127, 0, 128, 0, 64]);
  assert.equal(encoded().wav.type, 'audio/wav');
  const header = new DataView(await encoded().wav.arrayBuffer());
  assert.equal(header.getUint16(22, true), 1);
  assert.equal(header.getUint32(24, true), 16000);
});
