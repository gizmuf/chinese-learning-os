import {atlasReadingKey, correctAtlasTerm} from './atlas-study-reading-review';

/** Levels refer to listed words in words/examples and to recognition characters in structural sections. */
export type StudyTerm = {hanzi: string; pinyin: string; english: string; levels: string[]; namePinyin?: string};
export type StudyExample = {hanzi: string; pinyin: string; english: string; words?: StudyTerm[]; recordingPinyin?: string};
export type StudyWord = StudyTerm & {example?: StudyExample};
export type StudyFamily = {basis?: 'dictionary-radical'; part: StudyTerm; position?: string; members: StudyTerm[]; notes?: Record<string, string>};
export type StudyContrast = {term: StudyTerm; note: string};
export type StudyUsage = {title: string; examples: StudyExample[]};
export type StudyCard = {
  entry: StudyTerm;
  words: StudyWord[];
  parts: StudyTerm[];
  structure?: string;
  families: StudyFamily[];
  comparisons: StudyContrast[];
  usage: StudyUsage[];
  contexts: StudyExample[];
  story: string[];
  storyTerms?: (StudyTerm & {kind: 'word' | 'character'})[];
};
export type StudyIndexEntry = StudyTerm & {pack: string};

function updateExamplePinyin(sentence: string, before: StudyTerm, after: StudyTerm) {
  const key = (pinyin: string) => atlasReadingKey('', pinyin);
  const expected = key(before.pinyin);
  const tokens = Array.from(sentence.matchAll(/[\p{Letter}\p{Mark}]+/gu));
  const matches: [number, number][] = [];
  for (let start = 0; start < tokens.length; start++) {
    const begin = tokens[start].index;
    for (let end = start; end < tokens.length; end++) {
      const finish = tokens[end].index + tokens[end][0].length;
      const previous = sentence.slice(begin, finish);
      if (!/^[\p{Letter}\p{Mark}\s'’\-]+$/u.test(previous) || !expected.startsWith(key(previous))) break;
      if (key(previous) === expected) {
        matches.push([begin, finish]);
        break;
      }
    }
  }
  if (matches.length !== 1) return sentence;
  const [[start, end]] = matches;
  const label = /\p{Lu}/u.test(sentence[start])
    ? after.pinyin[0].toUpperCase() + after.pinyin.slice(1)
    : after.pinyin;
  return sentence.slice(0, start) + label + sentence.slice(end);
}

function reviewExample(example: StudyExample): StudyExample {
  if (!example.words) return example;
  const words = example.words.map(correctAtlasTerm);
  let pinyin = example.pinyin;
  for (const [index, before] of example.words.entries()) {
    const after = words[index];
    if (before.pinyin === after.pinyin || before.pinyin.includes('/') || [...before.hanzi].length < 2) continue;
    if (example.hanzi.split(before.hanzi).length !== 2) continue;
    pinyin = updateExamplePinyin(pinyin, before, after);
  }
  return pinyin === example.pinyin ? {...example, words} : {...example, words, pinyin, recordingPinyin: example.pinyin};
}

function reviewCard(card: StudyCard): StudyCard {
  return {
    ...card,
    entry: correctAtlasTerm(card.entry),
    words: card.words.map(word => {
      const term = correctAtlasTerm(word);
      return term.example ? {...term, example: reviewExample(term.example)} : term;
    }),
    parts: card.parts.map(correctAtlasTerm),
    families: card.families.map(family => ({...family, part: correctAtlasTerm(family.part), members: family.members.map(correctAtlasTerm)})),
    comparisons: card.comparisons.map(pair => ({...pair, term: correctAtlasTerm(pair.term)})),
    usage: card.usage.map(group => ({...group, examples: group.examples.map(reviewExample)})),
    contexts: card.contexts.map(reviewExample),
    storyTerms: card.storyTerms?.map(correctAtlasTerm),
  };
}

const root = '/atlas/study-cards/v1/';
let indexRequest: Promise<StudyIndexEntry[]> | undefined;
const packs = new Map<string, Promise<Record<string, StudyCard>>>();

async function fetchStudyData<T>(file: string): Promise<T> {
  const response = await fetch(root + file);
  if (!response.ok) throw new Error('Could not load study cards');
  return response.json() as Promise<T>;
}

export function loadStudyIndex() {
  indexRequest ??= fetchStudyData<{cards: StudyIndexEntry[]}>('index.json')
    .then(index => index.cards.map(correctAtlasTerm))
    .catch(error => {
      indexRequest = undefined;
      throw error;
    });
  return indexRequest;
}

export async function loadStudyCard(hanzi: string): Promise<StudyCard | undefined> {
  const index = await loadStudyIndex();
  const entry = index.find(card => card.hanzi === hanzi);
  if (!entry) return;
  let pack = packs.get(entry.pack);
  if (!pack) {
    pack = fetchStudyData<Record<string, StudyCard>>(encodeURIComponent(entry.pack) + '.json')
      .then(cards => Object.fromEntries(Object.entries(cards).map(([glyph, card]) => [glyph, reviewCard(card)])))
      .catch(error => {
        packs.delete(entry.pack);
        throw error;
      });
    packs.set(entry.pack, pack);
  }
  return (await pack)[hanzi];
}
