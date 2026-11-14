import {readingLabReadings} from './reading-lab-data';
import type {ReadingLabRoute} from './reading-lab-route';

export const readingLabDraftLimit = 6000;
export const readingLabGuestKey = 'chinese-os:reading-lab:v1:guest';
export const readingLabSessionKey = (owner: string | null) => owner === null ? readingLabGuestKey : 'chinese-os:reading-lab:v1:owner:' + encodeURIComponent(owner);

export type ReadingLabResume = ReadingLabRoute & {scroll: number};
export type ReadingLabSession = {version: 1; resume?: ReadingLabResume; drafts: Record<string, string>};
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
export const emptyReadingLabSession = (): ReadingLabSession => ({version: 1, drafts: {}});
const byId = new Map(readingLabReadings.map(reading => [reading.id, reading]));
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function validateReadingLabSession(raw: unknown): ReadingLabSession | undefined {
  if (!object(raw) || raw.version !== 1 || !object(raw.drafts)) return;
  const result = emptyReadingLabSession();
  for (const [id, draft] of Object.entries(raw.drafts)) {
    if (byId.has(id) && typeof draft === 'string' && draft.length <= readingLabDraftLimit && draft.length) result.drafts[id] = draft;
  }
  if (!object(raw.resume) || typeof raw.resume.article !== 'string') return result;
  const {article, aid, chunks, paragraph, grammar, scroll} = raw.resume;
  const reading = byId.get(article);
  if (!reading) return result;
  result.resume = {
    article, level: reading.level, aid: aid === 'tones' || aid === 'pinyin' ? aid : 'hanzi', chunks: chunks === true,
    paragraph: typeof paragraph === 'string' && reading.paragraphs.some(item => item.id === paragraph) ? paragraph : '',
    grammar: typeof grammar === 'string' && reading.grammar.some(item => item.id === grammar) ? grammar : '',
    scroll: typeof scroll === 'number' && Number.isFinite(scroll) ? Math.max(0, Math.min(100_000, Math.round(scroll))) : 0,
  };
  return result;
}

export function readReadingLabSession(storage: Storage, owner: string | null): ReadingLabSession {
  const raw = storage.getItem(readingLabSessionKey(owner));
  return raw ? validateReadingLabSession(JSON.parse(raw)) ?? emptyReadingLabSession() : emptyReadingLabSession();
}

export function persistReadingLabSession(storage: Storage, owner: string | null, patch: {draft?: {article: string; text: string}; resume?: ReadingLabResume}) {
  let current: ReadingLabSession;
  try {
    current = readReadingLabSession(storage, owner);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    current = emptyReadingLabSession();
  }
  if (patch.draft && byId.has(patch.draft.article)) {
    const {article, text} = patch.draft;
    if (text) current.drafts[article] = text.slice(0, readingLabDraftLimit);
    else delete current.drafts[article];
  }
  const next = validateReadingLabSession({...current, resume: patch.resume ?? current.resume}) ?? current;
  storage.setItem(readingLabSessionKey(owner), JSON.stringify(next));
  return next;
}
