import {readingReviewMatchesPinId, readingReviewPinId, readingReviewTargetId, readingReviewTargetsById, resolveReadingReviewTarget, type ReadingReviewSourcePin} from './reading-lab-review-data';
import {syllableTone} from './reading-lab-model';

export const readingReviewGuestKey = 'chinese-os:reading-reviews:v1:guest';
export const readingReviewChanged = 'chinese-os:reading-reviews-changed';
export const readingReviewStorageKey = (owner: string | null) => owner === null
  ? readingReviewGuestKey : 'chinese-os:reading-reviews:v1:owner:' + encodeURIComponent(owner);
export const readingReviewWordLimit = 32;
export const readingReviewSentenceLimit = 500;
const day = 86_400_000;
const intervals = [3, 7, 14, 30] as const;

export type ReadingReviewPending = {
  id: string; startedAt: number; expectedDueAt: number; expectedRevision: number;
  stage: 'recall' | 'sentence'; word: string; sentence: string;
  help: boolean; sampleShown: boolean; sourceSeen: boolean;
};
export type ReadingReviewResponse = {word: string; sentence: string; completedAt: number; scenarioIndex: number;
  outcome: 'again' | 'remembered'; early: boolean; supported: boolean};
export type ReadingReviewCard = {
  dueAt: number; step: number; reviewCount: number; revision: number;
  lastAttemptId?: string; pending?: ReadingReviewPending; lastResponse?: ReadingReviewResponse; target?: ReadingReviewSourcePin;
};
export type ReadingReviewStore = {version: 1; cards: Record<string, ReadingReviewCard>};
type StoreAccess = Pick<Storage, 'getItem' | 'setItem'>;
type ReadingReviewOutcome = ReadingReviewResponse['outcome'];
export const emptyReadingReviewStore = (): ReadingReviewStore => ({version: 1, cards: {}});

function exact(value: unknown, required: readonly string[], optional: readonly string[] = []): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) &&
    required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
}
const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const timestamp = (value: unknown): value is number => integer(value, 0, 8_640_000_000_000_000 - 30 * day);
const attemptId = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/u.test(value);

const maxReviewCards = 4096;

function validSourcePin(value: unknown): value is ReadingReviewSourcePin {
  return exact(value, ['article', 'chunk', 'tokenIndex', 'hanzi', 'pinyin', 'sentence'])
    && typeof value.article === 'string' && /^[a-z][a-z0-9-]{0,79}$/u.test(value.article)
    && typeof value.chunk === 'string' && /^p[1-9][0-9]{0,2}-c[1-9][0-9]{0,2}$/u.test(value.chunk)
    && integer(value.tokenIndex, 0, 200)
    && typeof value.hanzi === 'string' && /^\p{Script=Han}{1,12}$/u.test(value.hanzi)
    && Array.isArray(value.pinyin) && value.pinyin.length === [...value.hanzi].length
    && value.pinyin.every(part => typeof part === 'string' && part.length <= 12 && !!syllableTone(part))
    && typeof value.sentence === 'string' && value.sentence.length <= 512 && /^[\p{Script=Han}\p{P} ]+$/u.test(value.sentence)
    && value.sentence.includes(value.hanzi);
}

export function validateReadingReviewStore(raw: unknown): ReadingReviewStore | undefined {
  if (!exact(raw, ['version', 'cards']) || raw.version !== 1 || !raw.cards || typeof raw.cards !== 'object' || Object.getPrototypeOf(raw.cards) !== Object.prototype) return;
  const entries = Object.entries(raw.cards);
  if (entries.length > maxReviewCards) return;
  const store = emptyReadingReviewStore();
  for (const [target, card] of entries) {
    if (!exact(card, ['dueAt', 'step', 'reviewCount', 'revision'], ['lastAttemptId', 'pending', 'lastResponse', 'target']) || !timestamp(card.dueAt)
      || !integer(card.step, 0, intervals.length) || !integer(card.reviewCount, 0, 100_000) || !integer(card.revision, 0, 100_000)
      || card.revision !== card.reviewCount || card.step > card.reviewCount
      || (card.reviewCount === 0 ? Object.hasOwn(card, 'lastAttemptId') : !attemptId(card.lastAttemptId))) return;
    const pin = card.target;
    if (pin === undefined) {
      if (!readingReviewTargetsById.has(target) || Object.hasOwn(card, 'target')) return;
    } else if (!validSourcePin(pin) || !readingReviewMatchesPinId(target, pin)) return;
    const entry = resolveReadingReviewTarget(target, {target: pin});
    // A well-formed pin whose source changed stays in the store, outside the active queue.
    const hanzi = entry?.hanzi ?? pin?.hanzi;
    if (!hanzi) return;
    if (Object.hasOwn(card, 'lastResponse')) {
      const response = card.lastResponse;
      if (!card.reviewCount || !exact(response, ['word', 'sentence', 'completedAt', 'scenarioIndex', 'outcome', 'early', 'supported'])
        || typeof response.word !== 'string' || response.word.length > readingReviewWordLimit || typeof response.sentence !== 'string' || response.sentence.length > readingReviewSentenceLimit
        || !timestamp(response.completedAt) || response.scenarioIndex !== (card.reviewCount - 1) % 2
        || (response.outcome !== 'again' && response.outcome !== 'remembered') || typeof response.early !== 'boolean' || typeof response.supported !== 'boolean'
        || (response.outcome === 'remembered' && (response.supported || normalizedWord(response.word) !== hanzi || !hasSentence(hanzi, response.sentence) || !!entry && copiedSentence(entry, response.sentence)))) return;
    }
    let pending: ReadingReviewPending | undefined;
    if (Object.hasOwn(card, 'pending')) {
      const p = card.pending;
      if (!exact(p, ['id', 'startedAt', 'expectedDueAt', 'expectedRevision', 'stage', 'word', 'sentence', 'help', 'sampleShown', 'sourceSeen'])
        || !attemptId(p.id) || p.id === card.lastAttemptId || !timestamp(p.startedAt) || p.expectedDueAt !== card.dueAt || p.expectedRevision !== card.revision
        || (p.stage !== 'recall' && p.stage !== 'sentence') || typeof p.word !== 'string' || p.word.length > readingReviewWordLimit
        || typeof p.sentence !== 'string' || p.sentence.length > readingReviewSentenceLimit || typeof p.help !== 'boolean'
        || typeof p.sampleShown !== 'boolean' || typeof p.sourceSeen !== 'boolean'
        || (p.stage === 'recall' && (p.sentence || p.help || p.sampleShown))
        || (p.stage === 'sentence' && !p.help && normalizedWord(p.word) !== hanzi)) return;
      pending = p as ReadingReviewPending;
    }
    store.cards[target] = {...card, ...(pending && {pending})} as ReadingReviewCard;
  }
  return store;
}

export function readReadingReviewStore(storage: StoreAccess, owner: string | null): ReadingReviewStore {
  const raw = storage.getItem(readingReviewStorageKey(owner));
  if (!raw) return emptyReadingReviewStore();
  const value = validateReadingReviewStore(JSON.parse(raw));
  if (!value) throw Error('Reading review data could not be read');
  return value;
}
export function mergeReadingReviewStores(local: ReadingReviewStore, incoming: ReadingReviewStore): ReadingReviewStore {
  return {version: 1, cards: {...incoming.cards, ...local.cards}};
}

export function readingReviewSchedule(store: ReadingReviewStore, now: number) {
  const entries = Object.entries(store.cards).filter(([id, card]) => resolveReadingReviewTarget(id, card)).sort(([, a], [, b]) => a.dueAt - b.dueAt);
  const due = entries.filter(([, card]) => card.dueAt <= now).map(([id]) => id);
  return {due, nextDue: entries.find(([, card]) => card.dueAt > now)?.[1].dueAt};
}

export function readingReviewScenario(target: string, card: ReadingReviewCard) {
  const scenarios = resolveReadingReviewTarget(target, card)?.scenarios;
  return scenarios && scenarios[card.reviewCount % scenarios.length];
}
const normalizedWord = (value: string) => value.normalize('NFKC').trim();
const normalized = (value: string) => value.normalize('NFKC').replace(/[\p{Z}\p{P}\p{Cf}\s]/gu, '');
const hanziCount = (value: string) => value.match(/\p{Script=Han}/gu)?.length ?? 0;

function hasSentence(hanzi: string, value: string) {
  const sentence = normalized(value);
  const rest = sentence.split(hanzi).join('');
  return sentence.includes(hanzi) && hanziCount(rest) >= 1;
}

function copiedSentence(entry: NonNullable<ReturnType<typeof resolveReadingReviewTarget>>, value: string) {
  const sentence = normalized(value);
  return [...entry.articleSentences, ...entry.scenarios.flatMap(example => example.hanzi ? [example.hanzi] : [])].some(example => normalized(example) === sentence);
}

export function readingReviewEligibility(target: string, card: ReadingReviewCard) {
  const entry = resolveReadingReviewTarget(target, card);
  const pending = card.pending;
  if (!entry || !pending || pending.stage !== 'sentence') return {sentenceReady: false, independent: false};
  const sentenceReady = hasSentence(entry.hanzi, pending.sentence);
  const copiesModel = copiedSentence(entry, pending.sentence);
  const independent = sentenceReady && !pending.help && !pending.sourceSeen && !copiesModel
    && normalizedWord(pending.word) === entry.hanzi;
  return {sentenceReady, independent};
}

export type ReadingReviewAction = {type: 'save'; target?: ReadingReviewSourcePin} | {type: 'begin'; attempt: string}
  | {type: 'edit'; attempt: string; field: 'word' | 'sentence'; value: string}
  | {type: 'reveal'; attempt: string; help: boolean}
  | {type: 'sample' | 'source'; attempt: string}
  | {type: 'finish'; attempt: string; outcome: ReadingReviewOutcome};

export function readingReviewNext(card: ReadingReviewCard, outcome: ReadingReviewOutcome, now: number) {
  const early = (card.pending?.startedAt ?? now) < card.dueAt || now < card.dueAt;
  const step = outcome === 'remembered' ? Math.min(card.step + 1, intervals.length) : 0;
  const interval = step ? intervals[step - 1] : 1;
  return {early, step: early ? card.step : step, dueAt: early ? card.dueAt : now + day * interval, interval};
}

function updateReadingReviewCard(target: string, card: ReadingReviewCard | undefined, action: ReadingReviewAction, now: number): ReadingReviewCard {
  const sourcePin = action.type === 'save' && action.target && readingReviewMatchesPinId(target, action.target) ? action.target : undefined;
  const entry = resolveReadingReviewTarget(target, card ?? {target: sourcePin});
  if (!entry || !timestamp(now)) throw Error('Unknown review target or time');
  if (action.type === 'save') return card ?? {dueAt: now + day, step: 0, reviewCount: 0, revision: 0,
    ...(sourcePin && {target: sourcePin})};
  if (!card || !attemptId(action.attempt)) throw Error('Reading review is unavailable');
  if (action.type === 'begin') {
    if (card.pending) return card;
    if (action.attempt === card.lastAttemptId) throw Error('Use a new attempt');
    return {...card, pending: {id: action.attempt, startedAt: now, expectedDueAt: card.dueAt, expectedRevision: card.revision,
      stage: 'recall', word: '', sentence: '', help: false, sampleShown: false, sourceSeen: false}};
  }
  if (action.type === 'finish' && card.lastAttemptId === action.attempt) return card;
  const pending = card.pending;
  if (!pending || pending.id !== action.attempt || pending.expectedRevision !== card.revision || pending.expectedDueAt !== card.dueAt) throw Error('This review changed in another tab');
  if (action.type === 'edit') {
    const field = pending.stage === 'recall' ? 'word' : 'sentence';
    if (action.field !== field) throw Error('This review step changed');
    const value = action.value.slice(0, field === 'word' ? readingReviewWordLimit : readingReviewSentenceLimit);
    return {...card, pending: {...pending, [field]: value, help: pending.help || (field === 'sentence' && pending.sampleShown && value !== pending.sentence)}};
  }
  if (action.type === 'reveal') {
    if (pending.stage !== 'recall' || (!pending.word.trim() && !action.help)) throw Error('Try the word or choose Need help');
    return {...card, pending: {...pending, stage: 'sentence', help: action.help || normalizedWord(pending.word) !== entry.hanzi}};
  }
  if (action.type === 'sample') {
    if (pending.stage !== 'sentence') throw Error('Check the word first');
    // Viewing a model before writing a real sentence is supported practice.
    return {...card, pending: {...pending, sampleShown: true, help: pending.help || !readingReviewEligibility(target, card).sentenceReady}};
  }
  if (action.type === 'source') return {...card, pending: {...pending, sourceSeen: true}};
  if (action.type !== 'finish' || pending.stage !== 'sentence') throw Error('Check the word first');
  const eligible = readingReviewEligibility(target, card);
  if (action.outcome === 'remembered' && !eligible.independent) throw Error('Use Again for supported practice');
  const {early, step, dueAt} = readingReviewNext(card, action.outcome, now);
  return {dueAt, step, ...(card.target && {target: card.target}), reviewCount: card.reviewCount + 1, revision: card.revision + 1, lastAttemptId: action.attempt,
    lastResponse: {word: pending.word, sentence: pending.sentence, completedAt: now, scenarioIndex: card.reviewCount % 2,
      outcome: action.outcome, early, supported: !eligible.independent}};
}

export function newReadingReviewAttemptId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

export function persistReadingReview(storage: StoreAccess, owner: string | null, target: string, action: ReadingReviewAction, now = Date.now()) {
  const current = readReadingReviewStore(storage, owner);
  if (action.type === 'save' && action.target) {
    if (!validSourcePin(action.target) || !resolveReadingReviewTarget(readingReviewPinId(action.target), {target: action.target})
        || (target !== readingReviewPinId(action.target) && target !== readingReviewTargetId(action.target, current.cards))) throw Error('Review source no longer matches the reading');
    target = readingReviewTargetId(action.target, current.cards);
  }
  const previous = current.cards[target];
  const nextCard = updateReadingReviewCard(target, previous, action, now);
  if (previous === nextCard) return current;
  const next: ReadingReviewStore = {version: 1, cards: {...current.cards, [target]: nextCard}};
  if (!validateReadingReviewStore(next)) throw Error('Invalid reading review change');
  storage.setItem(readingReviewStorageKey(owner), JSON.stringify(next));
  return next;
}
