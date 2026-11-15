import type {DictionaryEntry} from './atlas-spatial-model';
import type {DictionaryContext} from './dictionary-source-model';
import type {WorkspaceKind} from './atlas-workspace-route';

export const readingLabLevels = [2, 3, 4, 5] as const;
export type ReadingLabLevel = typeof readingLabLevels[number];
export type ReadingAid = 'hanzi' | 'tones' | 'pinyin';

export type ReadingLabRoute = {
  level: ReadingLabLevel;
  article: string;
  aid: ReadingAid;
  chunks: boolean;
  paragraph: string;
  grammar: string;
  review?: string;
  reviewReturn?: string;
  chunk?: string;
};

const reviewId = (value: string | null) => value && /^[a-z][a-z\d-]{0,79}:\p{Script=Han}{1,12}$/u.test(value) ? value : undefined;

const readingId = (value: string | null) => value && /^[a-z][a-z\d-]{0,79}$/i.test(value) ? value : '';

export function isReadingLabEntry(params: URLSearchParams) {
  return params.get('atlas') === '1' && params.get('reader') === '1';
}

export function readReadingLabRoute(search: string): ReadingLabRoute {
  const params = new URLSearchParams(search);
  const aid = params.get('aid');
  return {
    level: readingLabLevels.find(level => String(level) === params.get('hsk')) ?? 2,
    article: readingId(params.get('article')),
    aid: aid === 'tones' || aid === 'pinyin' ? aid : 'hanzi',
    chunks: params.get('chunks') === '1',
    paragraph: readingId(params.get('at')),
    grammar: readingId(params.get('grammar')),
    ...(reviewId(params.get('review')) && {review: reviewId(params.get('review'))}),
    ...(reviewId(params.get('reviewReturn')) && {reviewReturn: reviewId(params.get('reviewReturn'))}),
    ...(readingId(params.get('chunk')) && {chunk: readingId(params.get('chunk'))}),
  };
}

export function readingLabHref(route: ReadingLabRoute) {
  const params = new URLSearchParams({atlas: '1', reader: '1', hsk: String(route.level)});
  if (route.article) params.set('article', route.article);
  if (route.aid !== 'hanzi') params.set('aid', route.aid);
  if (route.chunks) params.set('chunks', '1');
  if (route.paragraph) params.set('at', route.paragraph);
  if (route.grammar) params.set('grammar', route.grammar);
  if (route.review) params.set('review', route.review);
  if (route.reviewReturn) params.set('reviewReturn', route.reviewReturn);
  if (route.chunk) params.set('chunk', route.chunk);
  return '?' + params;
}

export function readingLabReturn(origin: string | null) {
  if (!origin?.startsWith('?') || origin.length > 1500 || !isReadingLabEntry(new URLSearchParams(origin))) return;
  return readingLabHref(readReadingLabRoute(origin));
}

export type ReadingLabAtlasVisit = {
  entry: DictionaryEntry;
  source?: DictionaryContext;
  kind: WorkspaceKind;
};

export function readingLabAtlasVisit(entry: DictionaryEntry, kind: WorkspaceKind | undefined, source?: DictionaryContext): ReadingLabAtlasVisit {
  return {entry, source: source ?? entry.contextual, kind: kind ?? (
    [...entry.text].length === 1 ? 'character' : /[。！？!?]/u.test(entry.text) ? 'sentence' : 'word'
  )};
}

export function readingLabContextualEntry(entry: DictionaryEntry | null, opener: HTMLElement | null) {
  if (!entry || !readingLabOrigin(opener) || opener?.dataset.readerHeadword !== entry.text) return entry;
  const {readerMeaning, readerPinyin} = opener.dataset;
  if (!readerMeaning || !readerPinyin) return entry;
  return {...entry, meaning: readerMeaning, pinyin: readerPinyin, word: undefined,
    audio: entry.audio?.text === entry.text && entry.audio.pinyin === readerPinyin ? entry.audio : undefined};
}

export const readingLabAtlasEvent = 'chinese-os:reading-lab-atlas';
export const readingLabWriteEvent = 'chinese-os:reading-lab-write';

export function readingLabOrigin(element: HTMLElement | null) {
  return element?.closest<HTMLElement>('[data-reading-lab]') ?? null;
}
