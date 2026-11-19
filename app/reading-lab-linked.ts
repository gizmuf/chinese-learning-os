import ditouzu from '../data/reading-lab-linked-ditouzu.json';
import type {NarrationTrack} from './reading-lab-narrator-model';

export type LinkedReading = {markdown: string; track: NarrationTrack};
export const linkedReadingParam = 'readingText';

const savedDitouzu: LinkedReading = {
  markdown: ditouzu.markdown,
  track: {
    source: ditouzu.source,
    duration: ditouzu.frames / ditouzu.sampleRate,
    cues: ditouzu.cues.map(({key, text, startFrame}) => ({key, text, start: startFrame / ditouzu.sampleRate})),
  },
};

export function linkedReadingFor(search: string): LinkedReading | undefined {
  if (new URLSearchParams(search).get(linkedReadingParam) === 'ditouzu') return savedDitouzu;
}
