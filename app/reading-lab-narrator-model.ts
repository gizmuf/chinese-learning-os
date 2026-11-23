import demo from '../data/reading-lab-narration.json';
import prepared from '../data/reading-lab-prepared-narration.json';
import type {ReadingLabReading} from './reading-lab-types';
import {splitReadingSentences} from './reading-lab-model';

export type NarrationMode = 'continuous' | 'repeat' | 'listen-repeat';
export type NarrationCue = {key: string; text: string; start: number};
export type NarrationTrack = {
  source: string;
  duration: number;
  voice?: string;
  cues: readonly NarrationCue[];
};

export const narrationRates = [0.75, 0.9, 1, 1.15] as const;
export const narrationLoopLimit = 20;
export type NarrationRate = typeof narrationRates[number];

const demoTrack: NarrationTrack = {
  source: demo.source,
  duration: demo.frames / demo.sampleRate,
  cues: demo.cues.map(({key, text, startFrame}) => ({key, text, start: startFrame / demo.sampleRate})),
};

export function matchesNarration(reading: ReadingLabReading, track: NarrationTrack): boolean {
  if (!Number.isFinite(track.duration) || track.duration <= 0) return false;
  const sentences = reading.paragraphs.flatMap(paragraph =>
    splitReadingSentences(paragraph).map((sentence, index) => ({key: paragraph.id + ':' + index, text: sentence.hanzi})));
  return sentences.length > 0 && sentences.length === track.cues.length && track.cues.every((cue, index) =>
    cue.key === sentences[index].key && cue.text === sentences[index].text && Number.isFinite(cue.start)
    && cue.start < track.duration && (index ? cue.start > track.cues[index - 1].start : cue.start === 0));
}

export function narrationFor(reading?: ReadingLabReading): NarrationTrack | undefined {
  if (!reading) return;
  if (reading.id === demo.article && matchesNarration(reading, demoTrack)) return demoTrack;
  const clip = (prepared as Record<string, {source: string; frames: number; sampleRate: number; cues: {key: string; text: string; startFrame: number}[]}>)[reading.id];
  if (clip) {
    const track = {
      source: clip.source, duration: clip.frames / clip.sampleRate, voice: 'Synthetic study voice · Xiaoxiao',
      cues: clip.cues.map(({key, text, startFrame}) => ({key, text, start: startFrame / clip.sampleRate})),
    };
    if (matchesNarration(reading, track)) return track;
  }
}

export function narrationPosition(track: NarrationTrack, time: number) {
  return Number.isFinite(time) ? Math.max(0, Math.min(time, track.duration)) : 0;
}

export function narrationCueAt(track: NarrationTrack, time: number) {
  const position = narrationPosition(track, time);
  return track.cues.findLastIndex(cue => cue.start <= position);
}

export function narrationStep(track: NarrationTrack, mode: NarrationMode, current: number, time: number) {
  const position = narrationPosition(track, time);
  const end = track.cues[current + 1]?.start ?? track.duration;
  if (position < end) return {kind: 'follow' as const, index: current, position};
  if (mode === 'repeat') return {kind: 'loop' as const, index: current, position: track.cues[current].start};
  if (mode === 'listen-repeat') return {kind: 'wait' as const, index: current, position: end};
  if (position >= track.duration) return {kind: 'finish' as const, index: track.cues.length - 1, position: track.duration};
  return {kind: 'follow' as const, index: narrationCueAt(track, position), position};
}
