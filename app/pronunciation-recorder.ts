type RecordingCallbacks = {
  onRecording: () => void;
  onProcessing: () => void;
  onReady: (pcm: Uint8Array<ArrayBuffer>, wav: Blob) => void;
  onError: (error: unknown) => void;
};

const outputRate = 16000;
const maximumSeconds = 30;

async function encodeRecording(samples: Float32Array<ArrayBuffer>[], count: number, rate: number) {
  if (count < rate * 0.5) throw Error('Record at least half a second.');
  const offline = new OfflineAudioContext(1, Math.floor(count * outputRate / rate), outputRate);
  const buffer = offline.createBuffer(1, count, rate);
  let offset = 0;
  for (const sample of samples) {
    buffer.copyToChannel(sample, 0, offset);
    offset += sample.length;
  }
  const node = offline.createBufferSource();
  node.buffer = buffer;
  node.connect(offline.destination);
  node.start();
  const floats = (await offline.startRendering()).getChannelData(0);
  const pcm = new Uint8Array(floats.length * 2);
  const values = new DataView(pcm.buffer);
  for (let i = 0; i < floats.length; i++) {
    const sample = Math.max(-1, Math.min(1, floats[i]));
    values.setInt16(i * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  const wav = new Uint8Array(44 + pcm.length);
  const header = new DataView(wav.buffer);
  function label(offset: number, value: string) {
    for (let i = 0; i < value.length; i++) wav[offset + i] = value.charCodeAt(i);
  }
  label(0, 'RIFF');
  header.setUint32(4, 36 + pcm.length, true);
  label(8, 'WAVEfmt ');
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true);
  header.setUint16(22, 1, true);
  header.setUint32(24, outputRate, true);
  header.setUint32(28, outputRate * 2, true);
  header.setUint16(32, 2, true);
  header.setUint16(34, 16, true);
  label(36, 'data');
  header.setUint32(40, pcm.length, true);
  wav.set(pcm, 44);
  return {pcm, wav: new Blob([wav], {type: 'audio/wav'})};
}

export function createPronunciationRecorder(callbacks: RecordingCallbacks) {
  let active = true;
  let recording = false;
  let context: AudioContext | undefined;
  let stream: MediaStream | undefined;
  let input: MediaStreamAudioSourceNode | undefined;
  let processor: ScriptProcessorNode | undefined;
  let mute: GainNode | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const samples: Float32Array<ArrayBuffer>[] = [];
  let count = 0;

  function release() {
    clearTimeout(timer);
    if (processor) processor.onaudioprocess = null;
    input?.disconnect();
    processor?.disconnect();
    mute?.disconnect();
    stream?.getTracks().forEach(track => track.stop());
    if (context) void context.close().catch(() => {});
    context = undefined;
    stream = undefined;
    input = undefined;
    processor = undefined;
    mute = undefined;
  }

  function discard() {
    active = false;
    recording = false;
    release();
    samples.length = 0;
  }

  function fail(error: unknown) {
    if (!active) return;
    discard();
    callbacks.onError(error);
  }

  async function stop() {
    if (!recording || !context) return;
    const rate = context.sampleRate;
    recording = false;
    release();
    callbacks.onProcessing();
    try {
      const encoded = encodeRecording(samples, count, rate);
      samples.length = 0;
      const {pcm, wav} = await encoded;
      if (active) callbacks.onReady(pcm, wav);
    } catch (error) {
      fail(error);
    }
  }

  async function start() {
    try {
      const recordingContext = new AudioContext();
      context = recordingContext;
      await recordingContext.resume();
      if (!active) return;
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: {channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false},
      });
      if (!active) {
        acquired.getTracks().forEach(track => track.stop());
        return;
      }
      stream = acquired;
      const rate = recordingContext.sampleRate;
      input = recordingContext.createMediaStreamSource(stream);
      processor = recordingContext.createScriptProcessor(4096, 1, 1);
      mute = recordingContext.createGain();
      mute.gain.value = 0;
      processor.onaudioprocess = event => {
        const data = event.inputBuffer.getChannelData(0);
        if (count + data.length > rate * maximumSeconds) return;
        samples.push(data.slice());
        count += data.length;
      };
      input.connect(processor);
      processor.connect(mute);
      mute.connect(recordingContext.destination);
      recording = true;
      timer = setTimeout(() => void stop(), maximumSeconds * 1000);
      callbacks.onRecording();
    } catch (error) {
      fail(error);
    }
  }

  return {start, stop, discard};
}
