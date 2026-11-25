import {splitReadingSentences} from './reading-lab-model';
import type {ReadingLabExample, ReadingLabParagraph} from './reading-lab-types';

export function readingTutorSource(paragraph: ReadingLabParagraph, chunkId: string): ReadingLabExample | undefined {
  const chunk = paragraph.chunks.find(item => item.id === chunkId);
  if (!chunk) return;
  const matches = splitReadingSentences(paragraph).filter(sentence =>
    sentence.tokens.some(token => chunk.tokens.includes(token)));
  if (matches.length !== 1) return;
  const [{hanzi, pinyin, english}] = matches;
  if (pinyin && english) return {hanzi, pinyin, english};
}
