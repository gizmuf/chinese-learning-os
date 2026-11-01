"use client";
import {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, Volume2} from 'lucide-react';
import type {Item} from './content';
import {getCards, type LearningEvent} from './learning';
import {allEvents, readDraft} from './local-store';
import {useI18n} from './i18n';
import {StudyText, useDictionaryAssistance} from './study-lookup';
import {speak, stopAudio} from './audio';

export const recognitionDraftKey = 'recognition-review-v1';
type Attempt = {phase: 1|2|3; assisted: boolean; started: number; event?: LearningEvent; saved?: boolean; due?: string};
export type RecognitionDraft = {version: 1; id: string; itemIds: string[]; index: number; attempts: Record<string, Attempt>; practice?: boolean; last?: {hanzi: string; due?: string}};
export function validRecognitionDraft(value: unknown): value is RecognitionDraft {
  if (!value || typeof value !== 'object') return false;
  const v = value as RecognitionDraft;
  return v.version === 1 && typeof v.id === 'string' && Array.isArray(v.itemIds) && v.itemIds.length > 0 &&
    new Set(v.itemIds).size === v.itemIds.length && v.itemIds.every(id => typeof id === 'string') &&
    Number.isInteger(v.index) && v.index >= 0 && v.index <= v.itemIds.length && !!v.attempts &&
    typeof v.attempts === 'object' && Object.values(v.attempts).every(a => a && [1,2,3].includes(a.phase) &&
      typeof a.assisted === 'boolean' && Number.isFinite(a.started));
}
const freshAttempt = (): Attempt => ({phase: 1, assisted: false, started: Date.now()});
const ratingNames = ['Again', 'Hard', 'Good', 'Easy'] as const;
const ratingHelp = ['Could not recall', 'Correct, with effort', 'Recalled correctly', 'Quick & confident'] as const;

export function writeRecognitionDraft(db: IDBDatabase, draft: RecognitionDraft, replace = false) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('drafts', 'readwrite'), store = tx.objectStore('drafts');
    const request = store.get(recognitionDraftKey);
    request.onsuccess = () => {
      // A completed request from an abandoned session cannot replace a newer session.
      if (!replace && request.result?.id !== draft.id) {tx.abort(); return;}
      store.put(draft, recognitionDraftKey);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? Error('Review session changed'));
  });
}

/** One durable session per notebook. Rating retries reuse the complete original event. */
export default function RecognitionReview({db, runId, queue, record, notify, onPosition, practice = false, onWrite}: {
  db: IDBDatabase|null; runId: string; queue: Item[];
  record: (event: LearningEvent) => Promise<void>; notify: (message: string) => void;
  onPosition: (index: number) => void;
  practice?: boolean; onWrite?: (item: Item) => void;
}) {
  const {t, locale} = useI18n();
  const [draft, setDraft] = useState<RecognitionDraft|null>(null);
  const current = useRef<RecognitionDraft|null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false), alive = useRef(true), helped = useRef(false);
  const position = useRef(onPosition); position.current = onPosition;
  const storage = useRef(db); storage.current = db;
  const dictionaryHelp = useDictionaryAssistance(() => {
    const d = current.current;
    if (!d || d.index >= d.itemIds.length) return;
    const id = d.itemIds[d.index], a = d.attempts[id];
    if (!a || a.phase === 3 || a.saved) return;
    helped.current = true;
    void update({...d, attempts: {...d.attempts, [id]: {...a, assisted: true}}});
  });
  function display(d: RecognitionDraft) {
    current.current = d;
    if (alive.current) {setDraft(d); position.current(Math.min(d.index, d.itemIds.length - 1));}
  }
  useEffect(() => {
    alive.current = true; let cancelled = false;
    current.current = null; setDraft(null);
    if (!db) return;
    void (async () => {
      try {
        const stored = await readDraft<RecognitionDraft>(db, recognitionDraftKey);
        let d: RecognitionDraft = validRecognitionDraft(stored) && stored.id === runId ? stored :
          {version: 1, id: runId, itemIds: queue.map(i => i.id), index: 0, attempts: {}, practice};
        // Recover a committed event even if a later UI/draft write failed or the page closed.
        const history = await allEvents(db);
        const events = new Set(history.map(e => e.id)), cards = getCards(history);
        d = {...d, attempts: {...d.attempts}};
        for (const [id, a] of Object.entries(d.attempts)) {
          if (a.event && events.has(a.event.id)) d.attempts[id] = {...a, saved: true, due: cards[id+':meaning']?.due.toISOString()};
        }
        // Pending committed ratings advance once on recovery; normal Back keeps its position.
        const original = validRecognitionDraft(stored) ? stored.attempts[d.itemIds[d.index]] : undefined;
        if (original?.event && !original.saved && events.has(original.event.id)) {
          const id=d.itemIds[d.index];
          d.last={hanzi:queue.find(i=>i.id===id)!.hanzi,due:d.attempts[id].due};
          d.index++;
        }
        const id = d.itemIds[d.index];
        if (id && !d.attempts[id]) d.attempts[id] = freshAttempt();
        if (cancelled) return;
        await writeRecognitionDraft(db, d, true);
        if (!cancelled) display(d);
      } catch {if (!cancelled) notify(t('Could not load this review. Please try again.'));}
    })();
    return () => {cancelled = true; alive.current = false; stopAudio();};
  }, [db, runId]); // Queue is pinned by the persisted session, not re-generated by SRS updates.
  async function update(d: RecognitionDraft) {
    const store = storage.current;
    if (lock.current || !store) return;
    lock.current = true; setBusy(true);
    try {await writeRecognitionDraft(store, d); display(d);}
    catch {if (alive.current) notify(t('Could not save this review. Please try again.'));}
    finally {lock.current = false; if (alive.current) setBusy(false);}
  }
  function move(delta: number) {
    const d = current.current;
    if (!d) return;
    const index = d.index + delta;
    if (index < 0 || index > d.itemIds.length) return;
    if (delta > 0 && !d.attempts[d.itemIds[d.index]]?.saved) return;
    stopAudio(); helped.current = false;
    void update({...d, index});
  }
  async function rate(rating: 1|2|3|4) {
    const d = current.current, store = storage.current;
    if (!d || !store || lock.current) return;
    const id = d.itemIds[d.index], a = d.attempts[id];
    if (!a || a.phase !== 3 || a.saved) return;
    // Ref lock closes the same-render/double-tap window before any await.
    lock.current = true; setBusy(true);
    const event = a.event ?? {id: crypto.randomUUID(), itemId: id, skill: 'meaning', mode: 'recall', rating,
      assisted: !!d.practice || a.assisted || helped.current, at: Date.now(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      detail: {duration: Date.now() - a.started, input: 'hanzi > pinyin > English; self-assessed'}} satisfies LearningEvent;
    const pending = {...d, attempts: {...d.attempts, [id]: {...a, event}}};
    try {
      // Persist the UUID, rating and timestamp before attempting the event write.
      await writeRecognitionDraft(store, pending); current.current = pending;
      if (alive.current) setDraft(pending);
      await record(event);
      const cards = getCards(await allEvents(store));
      const due = cards[id + ':meaning']?.due.toISOString();
      const index = d.index + 1;
      const attempts = {...pending.attempts, [id]: {...a, event, saved: true, due}};
      const nextId = d.itemIds[index];
      if (nextId && !attempts[nextId]) attempts[nextId] = freshAttempt();
      const done = {...pending, index, attempts, last: {hanzi: queue.find(i => i.id === id)!.hanzi, due}};
      await writeRecognitionDraft(store, done);
      helped.current = false; stopAudio(); display(done);
    } catch {if (alive.current) notify(t('Could not save this review. Please try again.'));}
    finally {lock.current = false; if (alive.current) setBusy(false);}
  }
  if (!draft) return <section ref={dictionaryHelp} className="panel" role="status">{t('Loading your notebook…')}</section>;
  const id = draft.itemIds[draft.index], item = queue.find(i => i.id === id), a = draft.attempts[id];
  const finished = draft.index === draft.itemIds.length;
  return <section ref={dictionaryHelp} className="recall-card panel" data-study-assessment={a?.phase === 3 ? 'complete' : 'supported'} aria-busy={busy}>
    <div className="recognition-navigation">
      <button className="secondary" disabled={busy || draft.index === 0} onClick={() => move(-1)}><ArrowLeft size={16}/>{t('Previous')}</button>
      <span>{Math.min(draft.index + 1, draft.itemIds.length)} / {draft.itemIds.length}</span>
      {a?.saved && <button className="secondary" disabled={busy} onClick={() => move(1)}>{t('Next')}<ArrowRight size={16}/></button>}
    </div>
    {draft.practice && <p>{t('Extra practice · your review schedule stays unchanged.')}</p>}
    {draft.last && <p role="status">{draft.last.hanzi} · {draft.practice ? t('Review schedule unchanged') :
      draft.last.due ? t('Next review: {0}', [new Date(draft.last.due).toLocaleString(locale)]) : t('Guided / assisted practice')}</p>}
    {finished ? <><h2>{t('Session complete')}</h2><p>{draft.itemIds.length} {t('words reviewed. Your next reviews are scheduled.')}</p></> : item && a && <>
      <span className="pill">{t(a.assisted || draft.practice ? 'Guided / assisted practice' : 'Self-assessed recall')}</span>
      <div className="recall-hanzi"><StudyText text={item.hanzi} whole/></div>
      {a.phase >= 2 && <p className="pinyin">{item.pinyin}</p>}
      {a.phase < 3 ? <button className="primary" disabled={busy} onClick={() => void update({...draft, attempts: {...draft.attempts,
        [id]: {...a, assisted: a.assisted || helped.current, phase: a.phase === 1 ? 2 : 3}}})}>
        {t(a.phase === 1 ? 'Show pinyin' : 'Show English meaning')}<ArrowRight size={16}/></button> : <>
        <div className="revealed-answer"><h2>{item.english}</h2><p>{item.sentence}</p><p className="pinyin">{item.sentencePinyin}</p><small>{item.translation}</small>
          <button className="text-button" onClick={() => speak(item.sentence, notify, item)}><Volume2 size={14}/>{t('Listen to example')}</button>
        </div>
        {onWrite && <button className="secondary" disabled={busy} onClick={() => onWrite(item)}>{t('Try writing')}</button>}
        {a.saved ? <><p role="status">{t('Already rated · viewing only')} · {t(ratingNames[a.event!.rating - 1])}</p>
          {a.due && <p>{t('Next review: {0}', [new Date(a.due).toLocaleString(locale)])}</p>}</> : <>
          <p className="rating-instruction">{t('Rate what you remembered before revealing.')}</p>
          {a.event ? <button className="primary" disabled={busy} onClick={() => void rate(a.event!.rating as 1|2|3|4)}>{t('Retry saving review')}</button> :
            <div className="ratings">{ratingNames.map((name, i) => <button key={name} disabled={busy} className={'rating rating-' + (i + 1)} onClick={() => void rate((i + 1) as 1|2|3|4)}><strong>{t(name)}</strong><small>{t(ratingHelp[i])}</small></button>)}</div>}
        </>}
      </>}
    </>}
  </section>;
}
