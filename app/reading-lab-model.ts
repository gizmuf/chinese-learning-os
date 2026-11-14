import type {HskIndex, HskLevel} from './hsk-level-model';
import {authoredCharacterReadings} from './pinyin-boundaries';
import type {ReadingLabExample, ReadingLabParagraph, ReadingLabReading, ReadingLabToken} from './reading-lab-types';

export type ReadingTone = 1 | 2 | 3 | 4 | 5;

export const toneMarks = {1: '¯', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ', 5: '·'} as const;
export const readingToneNote = 'Marks show the authored citation tones. In connected speech, tones can change.';

const accentTones = new Map<string, ReadingTone>([['\u0304', 1], ['\u0301', 2], ['\u030c', 3], ['\u0300', 4]]);
const hanzi = /^\p{Script=Han}$/u;
const wordToken = /^[\p{P}\p{Z}\s]*\p{Script=Han}+[\p{P}\p{Z}\s]*$/u;
const punctuationToken = /^[\p{P}\p{Z}\s]+$/u;

/** One authored syllable per Hanzi; an unaccented syllable is an explicit neutral reading. */
export function syllableTone(pinyin: string): ReadingTone | undefined {
  const spelling = pinyin.normalize('NFC').toLowerCase();
  const decomposed = Array.from(spelling.normalize('NFD'));
  const accents = decomposed.filter(mark => accentTones.has(mark));
  const plain = decomposed.filter(mark => !accentTones.has(mark)).join('').normalize('NFC');
  if (accents.length > 1 || !/^[a-züê]+$/u.test(plain)) return;
  if (!/^(?:hm|hng|ng|n|m|ê)$/u.test(plain) && !authoredCharacterReadings('字', spelling)) return;
  return accents.length ? accentTones.get(accents[0]) : 5;
}

export type ReadingGlyph = {text: string; pinyin?: string; tone?: ReadingTone; mark?: typeof toneMarks[ReadingTone]};

export function tokenGlyphs(token: ReadingLabToken): ReadingGlyph[] | undefined {
  if (!wordToken.test(token.text) && !punctuationToken.test(token.text)) return;
  const characters = Array.from(token.text);
  if (characters.filter(glyph => hanzi.test(glyph)).length !== token.pinyin.length) return;
  const glyphs: ReadingGlyph[] = [];
  let index = 0;
  for (const text of characters) {
    if (!hanzi.test(text)) {
      glyphs.push({text});
      continue;
    }
    const pinyin = token.pinyin[index++];
    const tone = syllableTone(pinyin);
    if (!tone) return;
    glyphs.push({text, pinyin, tone, mark: toneMarks[tone]});
  }
  return glyphs;
}

export function paragraphsText(reading: Pick<ReadingLabReading, 'paragraphs'>): string[] {
  return reading.paragraphs.map(paragraph => paragraph.chunks.flatMap(chunk => chunk.tokens.map(token => token.text)).join(''));
}

const sentenceEnd = /^[。！？!?]$/u;
const closingPunctuation = /^[”’」』）】》〉]$/u;

/** Keep the authored punctuation and explicit syllable boundaries for shared dictionary lookup. */
export function splitReadingSentences(paragraph: ReadingLabParagraph): (ReadingLabExample & {tokens: readonly ReadingLabToken[]})[] {
  const sentences: (ReadingLabExample & {tokens: ReadingLabToken[]})[] = [];
  let text = '';
  let pinyin = '';
  let ended = false;
  let tokens: ReadingLabToken[] = [];
  function finish() {
    if (!text.trim()) return;
    sentences.push({hanzi: text, pinyin, english: paragraph.sentenceEnglish[sentences.length] ?? '', tokens});
    text = '';
    pinyin = '';
    ended = false;
    tokens = [];
  }
  for (const token of paragraph.chunks.flatMap(chunk => chunk.tokens)) {
    for (const glyph of tokenGlyphs(token) ?? []) {
      if (ended && !sentenceEnd.test(glyph.text) && !closingPunctuation.test(glyph.text)) finish();
      if (tokens.at(-1) !== token) tokens.push(token);
      text += glyph.text;
      if (glyph.pinyin) {
        if (/[\p{Letter}\p{Mark}，。！？!?：:；;]$/u.test(pinyin)) pinyin += ' ';
        pinyin += /\p{Letter}/u.test(pinyin) ? glyph.pinyin : glyph.pinyin[0].toUpperCase() + glyph.pinyin.slice(1);
      } else pinyin += glyph.text;
      ended ||= sentenceEnd.test(glyph.text);
    }
  }
  finish();
  return sentences;
}

export function validateReading(reading: ReadingLabReading): string[] {
  const issues: string[] = [];
  const paragraphs = new Map<string, Set<string>>();
  const chunks = new Set<string>();
  if (!reading.paragraphs.length) issues.push(`${reading.id}: no paragraphs`);
  for (const paragraph of reading.paragraphs) {
    const inParagraph = new Set<string>();
    if (!paragraph.id || paragraphs.has(paragraph.id)) issues.push(`${reading.id}: duplicate or empty paragraph ID ${paragraph.id}`);
    paragraphs.set(paragraph.id, inParagraph);
    if (!paragraph.chunks.length) issues.push(`${reading.id}/${paragraph.id}: no chunks`);
    for (const chunk of paragraph.chunks) {
      if (!chunk.id || chunks.has(chunk.id)) issues.push(`${reading.id}: duplicate or empty chunk ID ${chunk.id}`);
      chunks.add(chunk.id);
      inParagraph.add(chunk.id);
      if (!chunk.tokens.length) issues.push(`${reading.id}/${chunk.id}: no tokens`);
      for (const token of chunk.tokens) {
        if (!tokenGlyphs(token)) issues.push(`${reading.id}/${chunk.id}: invalid pinyin alignment for ${token.text} (${token.pinyin.join(' ')})`);
      }
    }
    const sentences = splitReadingSentences(paragraph);
    if (sentences.length !== paragraph.sentenceEnglish.length || sentences.some(sentence => !sentence.english.trim())) {
      issues.push(`${reading.id}/${paragraph.id}: sentenceEnglish must align with ${sentences.length} sentences`);
    }
  }
  for (const grammar of reading.grammar) {
    if (!grammar.sourceChunks.length || grammar.sourceChunks.some(id => !chunks.has(id))) issues.push(`${reading.id}/${grammar.id}: invalid grammar source chunk`);
  }
  for (const question of reading.questions) {
    if (!paragraphs.get(question.evidence.paragraphId)?.has(question.evidence.chunkId)) issues.push(`${reading.id}/${question.id}: invalid question evidence`);
  }
  return issues;
}

type VocabularyLevel = HskLevel;
type ReadingVocabulary = {text: string; count: number; levels: readonly VocabularyLevel[]; firstLevel: VocabularyLevel | null};
type ClassifiedToken = Omit<ReadingVocabulary, 'count'> & {paragraphId: string; chunkId: string; headword: string};

const bands = [1, 2, 3, 4, 5, 6, '7-9'] as const;
const levelRank = (level: VocabularyLevel) => level === '7-9' ? 7 : Number(level);
const percent = (count: number, total: number) => total ? Math.round(count / total * 1000) / 10 : 0;

/** Coverage counts exact authored word tokens and unique headwords in the article body. */
export function analyzeReading(reading: ReadingLabReading, index: HskIndex) {
  const issues = validateReading(reading);
  if (issues.length) throw new Error(issues.join('\n'));
  const tokens: ClassifiedToken[] = [];
  const types = new Map<string, ReadingVocabulary>();
  for (const paragraph of reading.paragraphs) {
    for (const chunk of paragraph.chunks) {
      for (const token of chunk.tokens) {
        const headword = Array.from(token.text).filter(glyph => hanzi.test(glyph)).join('');
        if (!headword) continue;
        // A single Hanzi token can be a vocabulary word, independently of its recognition level.
        const levels = index.words.get(headword) ?? [];
        const firstLevel = levels[0] ?? null;
        tokens.push({paragraphId: paragraph.id, chunkId: chunk.id, text: token.text, headword, levels, firstLevel});
        const previous = types.get(headword);
        if (previous) previous.count++;
        else types.set(headword, {text: headword, count: 1, levels, firstLevel});
      }
    }
  }
  const vocabulary = [...types.values()];
  const totals = {tokens: tokens.length, types: types.size};
  const coverage = bands.map(level => {
    const covered = vocabulary.filter(word => word.firstLevel && levelRank(word.firstLevel) <= (level === '7-9' ? 7 : level));
    const tokenCount = covered.reduce((count, word) => count + word.count, 0);
    const typeCount = covered.length;
    return {level, tokenCount, typeCount, tokenPercent: percent(tokenCount, totals.tokens), typePercent: percent(typeCount, totals.types)};
  });
  return {
    totals, coverage, tokens,
    offList: vocabulary.filter(word => !word.firstLevel),
    aboveLevel: vocabulary.filter(word => word.firstLevel && levelRank(word.firstLevel) > reading.level),
  };
}
