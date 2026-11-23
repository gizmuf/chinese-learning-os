/** Levels refer to listed words in words/examples and to recognition characters in structural sections. */
export type StudyTerm = {hanzi: string; pinyin: string; english: string; levels: string[]; namePinyin?: string};
export type StudyExample = {hanzi: string; pinyin: string; english: string; words?: StudyTerm[]};
export type StudyWord = StudyTerm & {example?: StudyExample};
export type StudyFamily = {part: StudyTerm; position?: string; members: StudyTerm[]; notes?: Record<string, string>};
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
};
export type StudyIndexEntry = StudyTerm & {pack: string};

const root = '/atlas/study-cards/snow-v1/';
let indexRequest: Promise<StudyIndexEntry[]> | undefined;
const packs = new Map<string, Promise<Record<string, StudyCard>>>();

async function fetchStudyData<T>(file: string): Promise<T> {
  const response = await fetch(root + file);
  if (!response.ok) throw new Error('Could not load study cards');
  return response.json() as Promise<T>;
}

export function loadStudyIndex() {
  indexRequest ??= fetchStudyData<{cards: StudyIndexEntry[]}>('index.json')
    .then(index => index.cards)
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
    pack = fetchStudyData<Record<string, StudyCard>>(encodeURIComponent(entry.pack) + '.json').catch(error => {
      packs.delete(entry.pack);
      throw error;
    });
    packs.set(entry.pack, pack);
  }
  return (await pack)[hanzi];
}
