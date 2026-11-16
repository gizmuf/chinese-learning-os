import stamp from '../data/hsk-levels-source.json';
import policy from './simplified-policy-data';
import {dictionaryReadingEquivalent} from './simplified-chinese';

export const hskLevels = ['1', '2', '3', '4', '5', '6', '7-9'] as const;
export type HskLevel = typeof hskLevels[number];
export type HskIndex = {words: Map<string, HskLevel[]>; characters: Map<string, HskLevel[]>};
type HskKind = 'word' | 'character';
type HskClassification = {kind: HskKind; levels: HskLevel[]; equivalent?: string; unresolved?: true};

const aliases: Readonly<Record<string, string>> = policy.aliases;
const ambiguous: Readonly<Record<string, {readings: Record<string, string[]>}>> = policy.ambiguous;
const hanText = /^\p{Script=Han}+$/u;

export function hskLevelIndex(raw: unknown): HskIndex {
  const data = raw as {version?: number; words?: Record<string, unknown>; characters?: Record<string, unknown>};
  if (data?.version !== 1 || !data.words || !data.characters ||
    Object.keys(data.words).length !== hskLevels.length || Object.keys(data.characters).length !== hskLevels.length) {
    throw Error('Invalid HSK metadata');
  }
  const words = new Map<string, HskLevel[]>();
  const characters = new Map<string, HskLevel[]>();
  for (const level of hskLevels) {
    const wordBand = data.words[level];
    const characterBand = data.characters[level];
    if (typeof wordBand !== 'string' || typeof characterBand !== 'string') throw Error('Incomplete HSK metadata');
    const headwords = wordBand.split('|');
    const glyphs = Array.from(characterBand);
    if (headwords.length !== stamp.wordSetCounts[level] || glyphs.length !== stamp.recognitionCharacterCounts[level] ||
      new Set(headwords).size !== headwords.length || !headwords.every(word => hanText.test(word)) ||
      !glyphs.every(glyph => hanText.test(glyph))) throw Error('Invalid HSK band: ' + level);

    for (const word of headwords) words.set(word, [...(words.get(word) ?? []), level]);
    for (const character of glyphs) {
      if (characters.has(character)) throw Error('Duplicate recognition character');
      characters.set(character, [level]);
    }
  }
  return {words, characters};
}

function listedLevel(index: HskIndex, text: string, preferredKind: HskKind): HskClassification | undefined {
  const first = preferredKind === 'word' ? index.words : index.characters;
  const exact = first.get(text);
  if (exact) return {kind: preferredKind, levels: exact};
  if (Array.from(text).length !== 1) return;
  const alternate = preferredKind === 'word' ? 'character' : 'word';
  const known = (alternate === 'word' ? index.words : index.characters).get(text);
  if (known) return {kind: alternate, levels: known};
}

export function hskClassification(index: HskIndex, text: string, preferredKind?: HskKind, pinyin?: string): HskClassification | null {
  if (!hanText.test(text)) return null;
  const kind = preferredKind ?? (Array.from(text).length === 1 ? 'character' : 'word');
  const exact = listedLevel(index, text, kind);
  if (exact) return exact;
  const absent: HskClassification = {kind, levels: []};
  const alternatives = ambiguous[text];
  if (alternatives) {
    const equivalent = pinyin && dictionaryReadingEquivalent(text, pinyin);
    if (equivalent) {
      const level = listedLevel(index, equivalent, kind);
      return level ? {...level, equivalent} : absent;
    }
    return Object.values(alternatives.readings).flat().some(value => listedLevel(index, value, kind))
      ? {...absent, unresolved: true} : absent;
  }
  // HSK metadata can report an attested equivalent for a shared legacy glyph,
  // while the lexical adapter preserves that form for dictionary and structure.
  const equivalent = aliases[text];
  const level = equivalent && listedLevel(index, equivalent, kind);
  return level ? {...level, equivalent} : absent;
}
