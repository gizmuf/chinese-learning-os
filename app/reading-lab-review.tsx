'use client';

import {useEffect, useRef, useState} from 'react';
import {readingReviewTargets, readingReviewTargetsById} from './reading-lab-review-data';
import {emptyReadingReviewStore, newReadingReviewAttemptId, persistReadingReview, readReadingReviewStore, readingReviewChanged,
  readingReviewEligibility, readingReviewNext, readingReviewScenario, readingReviewSchedule, readingReviewSentenceLimit, readingReviewStorageKey,
  readingReviewWordLimit, type ReadingReviewAction, type ReadingReviewStore} from './reading-lab-review-model';

export function useReadingReviews(owner: string | null) {
  const [snapshot, setSnapshot] = useState<{owner: string | null; store: ReadingReviewStore; now: number; unavailable: boolean}>();
  const resync = useRef(owner);
  resync.current = owner;
  const active = snapshot?.owner === owner ? snapshot : undefined;
  const ready = !!active;
  const store = active?.store ?? emptyReadingReviewStore();
  const now = active?.now ?? Date.now();
  function refresh() {
    try {setSnapshot({owner, store: readReadingReviewStore(localStorage, owner), now: Date.now(), unavailable: false});}
    catch {setSnapshot({owner, store: emptyReadingReviewStore(), now: Date.now(), unavailable: true});}
  }
  useEffect(() => {
    refresh();
    const storage = (event: StorageEvent) => {if (event.key === null || event.key === readingReviewStorageKey(owner)) refresh();};
    const visible = () => {if (document.visibilityState === 'visible') refresh();};
    window.addEventListener('storage', storage);
    window.addEventListener('pageshow', refresh);
    window.addEventListener(readingReviewChanged, refresh);
    document.addEventListener('visibilitychange', visible);
    const timer = window.setInterval(visible, 60_000);
    return () => {
      window.removeEventListener('storage', storage);
      window.removeEventListener('pageshow', refresh);
      window.removeEventListener(readingReviewChanged, refresh);
      document.removeEventListener('visibilitychange', visible);
      window.clearInterval(timer);
    };
  }, [owner]);
  function write(id: string, action: ReadingReviewAction) {
    if (resync.current !== owner) throw Error('Study owner changed');
    const next = persistReadingReview(localStorage, owner, id, action);
    setSnapshot({owner, store: next, now: Date.now(), unavailable: false});
    window.dispatchEvent(new Event(readingReviewChanged));
    return next;
  }
  return {store, ready, now, unavailable: active?.unavailable ?? false, write};
}

export const reviewDate = (timestamp: number) => new Date(timestamp).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});

export function ReadingReviewSummary({store, now, onOpen}: {store: ReadingReviewStore; now: number; onOpen: (id: string) => void}) {
  const schedule = readingReviewSchedule(store, now);
  const first = schedule.due[0] ?? Object.keys(store.cards).find(id => store.cards[id].pending);
  if (!first && !schedule.nextDue) return null;
  return <section className="rl-followup" aria-label="Saved reading reviews">
    <h2>Reading reviews</h2>
    {schedule.due.length > 0 && <p>{schedule.due.length} due</p>}
    {schedule.nextDue && <p>Next scheduled {reviewDate(schedule.nextDue)}</p>}
    {first && <button type="button" onClick={() => onOpen(first)}>{schedule.due.length ? 'Start due review' : 'Resume practice'}</button>}
  </section>;
}

export function ReadingReviewSave({article, reviews, onOpen}: {article: string; reviews: ReturnType<typeof useReadingReviews>; onOpen: (id: string) => void}) {
  const [error, setError] = useState(false);
  return <section className="rl-followup rl-review-save" aria-label="Save words for later">
    <h2>Save words for later</h2>
    <p>Choose words to recall another day and use in a new sentence.</p>
    {readingReviewTargets.filter(target => target.article === article).map(target => {
      const card = reviews.store.cards[target.id];
      return <div key={target.id} className="rl-review-target">
        <div><strong lang="zh-Hans">{target.hanzi}</strong><span>{target.pinyin} · {target.meaning}</span></div>
        {card?.lastResponse?.sentence && <details><summary>Previous response</summary><p lang="zh-Hans">{card.lastResponse.sentence}</p></details>}
        {card ? <><span>{card.dueAt <= reviews.now ? 'Due now' : 'Next review ' + reviewDate(card.dueAt)}</span>
          <button type="button" onClick={() => onOpen(target.id)}>{card.pending ? 'Resume practice' : card.dueAt <= reviews.now ? 'Review' : 'Practise now'}</button></>
          : <button type="button" disabled={!reviews.ready || reviews.unavailable} onClick={() => {
            try {reviews.write(target.id, {type: 'save'});setError(false);} catch {setError(true);}
          }}>Save for later</button>}
      </div>;
    })}
    {(error || reviews.unavailable) && <p role="alert">Could not save to this browser. Try Save for later again when browser storage is available.</p>}
  </section>;
}


export function ReadingReview({id, reviews, onExit, onSource}: {id: string; reviews: ReturnType<typeof useReadingReviews>;
  onExit: () => void; onSource: (id: string) => void}) {
  const target = readingReviewTargetsById.get(id);
  const card = reviews.store.cards[id];
  const pending = card?.pending;
  const [input, setInput] = useState<{attempt: string; word?: string; sentence?: string}>();
  const [failed, setFailed] = useState<{action: ReadingReviewAction; after?: () => void}>();
  const [finished, setFinished] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const latestWrite = useRef(reviews.write);
  latestWrite.current = reviews.write;
  const beginId = useRef<string>(undefined);
  const observedAttempt = useRef<string>(undefined);
  if (pending) observedAttempt.current = pending.id;
  const completedElsewhere = !!card?.lastAttemptId && observedAttempt.current === card.lastAttemptId && !finished;
  const attemptEnded = finished || completedElsewhere;
  function write(action: ReadingReviewAction, after?: () => void) {
    try {
      latestWrite.current(id, action);
      setFailed(undefined);
      setInput(undefined);
      after?.();
    } catch {setFailed({action, after});}
  }
  const saved = !!card;
  useEffect(() => {
    if (!saved || pending || attemptEnded || failed || observedAttempt.current) return;
    beginId.current ??= newReadingReviewAttemptId();
    write({type: 'begin', attempt: beginId.current});
  }, [id, saved, pending, attemptEnded, failed]);
  useEffect(() => {heading.current?.focus();}, [pending?.stage, attemptEnded]);
  const again = card && readingReviewNext(card, 'again', reviews.now);
  const remembered = card && readingReviewNext(card, 'remembered', reviews.now);
  const early = again?.early;
  const recall = pending?.stage === 'recall';
  const eligibility = card ? readingReviewEligibility(id, card) : undefined;
  const fields = pending && input?.attempt === pending.id ? input : undefined;
  const scenario = target && card ? readingReviewScenario(id, card) : undefined;
  const schedule = readingReviewSchedule(reviews.store, reviews.now);
  const next = schedule.due.find(key => key !== id);
  const composing = useRef(false);
  return <section className="rl-followup rl-review" aria-label="Reading review" data-study-assessment={!attemptEnded ? 'blocked' : undefined}>
    <div className="rl-reading-actions"><button type="button" disabled={!!failed && !attemptEnded} onClick={onExit}>Back to reading</button></div>
    <h1 ref={heading} tabIndex={-1}>{attemptEnded ? 'Review saved' : 'Reading review'}</h1>
    {!reviews.ready ? <p>Loading review…</p> : !saved || !target ? <p>{reviews.unavailable ? 'Could not read reviews on this browser.' : 'This word is not saved for review in this browser.'}</p> : null}
    {!attemptEnded && saved && target && pending && <>
      {early && <p>Early practice. Your scheduled review date stays the same.</p>}
      {recall ? <form onSubmit={event => {
        event.preventDefault();
        if (composing.current) return;
        write({type: 'reveal', attempt: pending.id, help: false});
      }}>
        <p>Recall the Chinese word for</p>
        <h2>{target.meaning}</h2>
        <label htmlFor="rl-review-word">Your answer in Hanzi</label>
        <input id="rl-review-word" lang="zh-Hans" autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={readingReviewWordLimit}
          onCompositionStart={() => {composing.current = true;}} onCompositionEnd={() => {composing.current = false;}}
          onKeyDown={event => {
            if (event.key === 'Enter' && (composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) event.preventDefault();
          }}
          value={fields?.word ?? pending.word} onChange={event => {
            const value = event.target.value;
            setInput({attempt: pending.id, word: value});
            write({type: 'edit', attempt: pending.id, field: 'word', value});
          }}/>
        <div className="rl-reading-actions">
          <button type="submit" disabled={!!failed || !pending.word.trim()}>Check word</button>
          <button type="button" disabled={!!failed} onClick={() => write({type: 'reveal', attempt: pending.id, help: true})}>Need help</button>
        </div>
      </form> : <>
        <div className="rl-review-answer"><strong lang="zh-Hans">{target.hanzi}</strong><span>{target.pinyin} · {target.meaning}</span></div>
        <p>{pending.help ? 'This attempt used help. Choose Again when you finish.' : 'Check the word and try it in a different situation.'}</p>
        <div className="rl-reading-actions"><button type="button" disabled={!!failed} onClick={() => write({type: 'source', attempt: pending.id}, () => onSource(id))}>Open source paragraph</button></div>
        <h2>Write a new sentence</h2>
        <p>{scenario?.prompt}</p>
        <label htmlFor="rl-review-sentence">Your Chinese sentence using <span lang="zh-Hans">{target.hanzi}</span></label>
        <textarea id="rl-review-sentence" lang="zh-Hans" rows={3} maxLength={readingReviewSentenceLimit} value={fields?.sentence ?? pending.sentence}
          onChange={event => {
            const value = event.target.value;
            setInput({attempt: pending.id, sentence: value});
            write({type: 'edit', attempt: pending.id, field: 'sentence', value});
          }}/>
        <p>You judge your sentence. This check does not grade grammar or meaning.</p>
        {pending.sampleShown ? <div className="rl-review-sample"><h3>One possible sentence</h3><strong lang="zh-Hans">{scenario?.hanzi}</strong><p>{scenario?.pinyin}</p><p>{scenario?.english}</p></div>
          : <button type="button" disabled={!!failed} onClick={() => write({type: 'sample', attempt: pending.id})}>Compare a sample</button>}
        <div className="rl-reading-actions">
          <button type="button" disabled={!!failed} onClick={() => write({type: 'finish', attempt: pending.id, outcome: 'again'}, () => setFinished(true))}>Again</button>
          <button type="button" disabled={!!failed || !eligibility?.independent} onClick={() => write({type: 'finish', attempt: pending.id, outcome: 'remembered'}, () => setFinished(true))}>Remembered</button>
        </div>
        {!early && again && remembered && <p><b>Again</b> brings this word back tomorrow ({reviewDate(again.dueAt)}). <b>Remembered</b> schedules it in {remembered.interval} days ({reviewDate(remembered.dueAt)}).</p>}
        {!eligibility?.independent && <p>To choose Remembered, recall the word without help and write your own sentence before opening the source or sample.</p>}
      </>}
    </>}
    {failed && !attemptEnded && <div role="alert"><p>Could not save this step. Your schedule has not changed.</p><button type="button" onClick={() => write(failed.action, failed.after)}>Retry save</button></div>}
    {completedElsewhere && <p>This attempt was completed in another tab.</p>}
    {attemptEnded && card && <p>Next scheduled review {reviewDate(card.dueAt)}{next ? '. Return to the library for more due words.' : '.'}</p>}
  </section>;
}
