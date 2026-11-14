import {grammarFrames} from './chunk-library-data';
import type {ReadingLabExample} from './reading-lab-types';

export type ReadingGrammarFrame = {
  id: string;
  pattern: string;
  explanation: string;
  examples: ReadingLabExample[];
};

export function resolveReadingGrammarFrame(frameId: string | undefined): ReadingGrammarFrame | undefined {
  if (!frameId) return;
  const frame = grammarFrames.find(({id}) => id === frameId);
  if (!frame) return;
  return {
    id: frame.id,
    pattern: frame.pattern,
    explanation: frame.learning?.explanation.en ?? frame.note.en,
    examples: frame.examples.map(({hanzi, pinyin, meaning}) => ({hanzi, pinyin, english: meaning.en})),
  };
}
