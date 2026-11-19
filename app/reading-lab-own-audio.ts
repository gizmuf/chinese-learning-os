import type {ImportedSentence} from './reading-lab-own-text-model';
import type {SavedReadingAudio} from './reading-lab-audio-cache';

export function readingLabApiBase(origin = window.location.origin) {
  const gateway = origin === 'https://cos.l00p.network' ? 'https://chineseos.l00p.network' : '';
  return gateway + '/api/reading-lab';
}
export function readingAudioPath() {
  return readingLabApiBase() + '/narration';
}
const sampleRate = 24000;
const pauseFrames = Math.round(sampleRate * 0.24);
const maxFrames = sampleRate * 360;
const maxClipBytes = 4 * 1024 * 1024;

export class ReadingAudioError extends Error {
  constructor(readonly quota: boolean = false) {super('Reading audio is unavailable');}
}

export function joinSentenceAudio(sentences: readonly ImportedSentence[], audio: ReadonlyMap<string, AudioBuffer>) {
  let frames = 0;
  const segments = sentences.map(sentence => {
    const buffer = audio.get(sentence.text);
    if (!buffer?.length || buffer.sampleRate !== sampleRate) throw new ReadingAudioError();
    const start = frames;
    frames += buffer.length + pauseFrames;
    return {sentence, buffer, start};
  });
  const durationFrames = frames - pauseFrames;
  if (durationFrames <= 0 || durationFrames > maxFrames) throw new ReadingAudioError();
  const dataSize = durationFrames * 2;
  const wav = new DataView(new ArrayBuffer(44 + dataSize));
  const tag = (index: number, value: string) => {
    for (let offset = 0; offset < value.length; offset++) wav.setUint8(index + offset, value.charCodeAt(offset));
  };
  tag(0, 'RIFF');
  wav.setUint32(4, 36 + dataSize, true);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  wav.setUint32(16, 16, true);
  wav.setUint16(20, 1, true);
  wav.setUint16(22, 1, true);
  wav.setUint32(24, sampleRate, true);
  wav.setUint32(28, sampleRate * 2, true);
  wav.setUint16(32, 2, true);
  wav.setUint16(34, 16, true);
  tag(36, 'data');
  wav.setUint32(40, dataSize, true);
  for (const {buffer, start} of segments) {
    const channels = Array.from({length: buffer.numberOfChannels}, (_, index) => buffer.getChannelData(index));
    for (let frame = 0; frame < buffer.length; frame++) {
      const sample = channels.reduce((sum, channel) => sum + channel[frame], 0) / channels.length;
      const clipped = Math.max(-1, Math.min(sample, 1));
      wav.setInt16(44 + (start + frame) * 2, Math.round(clipped * (clipped < 0 ? 32768 : 32767)), true);
    }
  }
  return {
    wav: new Blob([wav.buffer], {type: 'audio/wav'}),
    duration: durationFrames / sampleRate,
    cues: segments.map(({sentence, start}) => ({key: sentence.key, text: sentence.text, start: start / sampleRate})),
  };
}

export async function generateReadingAudio(
  sentences: readonly ImportedSentence[], signal: AbortSignal, progress: (ready: number, total: number) => void,
): Promise<Omit<SavedReadingAudio, 'voice'>> {
  // Construct the offline decoder during the tap. It does not start playback.
  const decoder = new OfflineAudioContext(1, 1, sampleRate);
  const unique = [...new Set(sentences.map(item => item.text))];
  const endpoint = readingAudioPath();
  const clips = new Map<string, AudioBuffer>();
  let decodedFrames = 0;
  progress(0, unique.length);
  for (const text of unique) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({text}),
      credentials: 'omit',
      signal,
    });
    if (!response.ok || !response.headers.get('Content-Type')?.startsWith('audio/')) {
      throw new ReadingAudioError(response.status === 429);
    }
    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > maxClipBytes || signal.aborted) throw new ReadingAudioError();
    const buffer = await decoder.decodeAudioData(bytes);
    decodedFrames += buffer.length;
    if (signal.aborted || decodedFrames > maxFrames) throw new ReadingAudioError();
    clips.set(text, buffer);
    progress(clips.size, unique.length);
  }
  return joinSentenceAudio(sentences, clips);
}
