import ditouzu from '../data/reading-lab-linked-ditouzu.json';
import type {LinkedReading} from './reading-lab-linked-route';

const savedDitouzu: LinkedReading = {
  markdown: ditouzu.markdown,
  track: {
    source: ditouzu.source,
    duration: ditouzu.frames / ditouzu.sampleRate,
    cues: ditouzu.cues.map(({key, text, startFrame}) => ({key, text, start: startFrame / ditouzu.sampleRate})),
  },
};

export function linkedReadingFor(id: string): LinkedReading | undefined {
  if (id === 'ditouzu') return savedDitouzu;
}
