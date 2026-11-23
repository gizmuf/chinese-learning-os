'use client';

import {useEffect, useEffectEvent, useId, useRef, useState, type ReactNode} from 'react';
import {ArrowLeft, ArrowRight, RotateCcw} from 'lucide-react';
import type {Stroke} from './learning';
import PinyinHandwriting from './pinyin-handwriting';
import {StudyText} from './study-lookup-context';
import PreparedSentenceListen from './prepared-sentence-listen';
import prepared from '../data/lesson-sentence-audio.json';
import {type HanziExercise, matchesHanziAnswer, selectedPracticeHref} from './hanzi-family-lesson-route';
import {canSubmitComposition} from './pinyin-practice-model';
import './pinyin-practice.css';

// Keep assessment text non-interactive, and size Hanzi independently of inline pinyin.
function HanziRuns({text}: {text: string}) {
  return <>{text.split(/([\p{Script=Han}、。，！？：；]+)/u).map((part, index) => index % 2
    ? <span className="hanzi-family-glyphs" key={index} lang="zh-Hans">{part}</span>
    : part)}</>;
}

type Outcome = 'correct' | 'retry' | 'compare';
export type Attempt = { outcome: Outcome; response: string; strokes?: Stroke[] };
export type Attempts = Partial<Record<string, Attempt>>;

export function loadHanziAttempts(key: string): Attempts | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch {}
  return null;
}

export const exerciseKinds = [
  ['all', 'All activities'],
  ['choice', 'Choose in context'],
  ['gap', 'Fill the gap'],
  ['build', 'Build a sentence'],
  ['writing', 'Write Hanzi'],
] as const;
export type ExerciseFilter = typeof exerciseKinds[number][0];

const recordings: Record<string, {source: string}> = prepared.hanziFamily;

export default function HanziFamilyPractice({exercises, active, onSelect, filter, onFilter, attempts, save, penOnly, setPenOnly}: {
  exercises: HanziExercise[];
  active: string;
  onSelect: (id: string) => void;
  filter: ExerciseFilter;
  onFilter: (filter: ExerciseFilter) => void;
  attempts: Attempts;
  save: (id: string, attempt: Attempt | null) => void;
  penOnly: boolean;
  setPenOnly: (value: boolean) => void;
}) {
  const filtered = filter === 'all' ? exercises : exercises.filter(item => item.kind === filter);
  const index = Math.max(0, filtered.findIndex(item => item.id === active));
  const exercise = filtered[index];
  if (!exercise) return null;
  return <section className="panel hanzi-family-panel" aria-labelledby="hanzi-practice-heading">
    <h2 id="hanzi-practice-heading">Active practice</h2>
    <div className="hanzi-family-actions hanzi-family-practice-controls">
      <label>Activity
        <select value={filter} onChange={event => onFilter(event.target.value as ExerciseFilter)}>
          {exerciseKinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label>Question
        <select value={exercise.id} onChange={event => onSelect(event.target.value)}>
          {filtered.map((item, i) => <option key={item.id} value={item.id}>{i + 1} / {filtered.length}{attempts[item.id] ? ' · attempted' : ''}</option>)}
        </select>
      </label>
      <p role="status">{exercises.filter(item => attempts[item.id]).length} / {exercises.length} attempted</p>
      <a className="text-button" href={selectedPracticeHref}>Selected for practice</a>
    </div>
    <Exercise key={exercise.id} exercise={exercise} attempt={attempts[exercise.id]} onSave={value => save(exercise.id, value)} {...{penOnly, setPenOnly}}
      feedbackDetails={<PreparedSentenceListen text={exercise.answer} source={recordings[exercise.answer]?.source}/>}/>
    <div className="hanzi-family-actions hanzi-family-paging">
      <button type="button" className="secondary" disabled={index === 0} onClick={() => onSelect(filtered[index - 1].id)}><ArrowLeft size={16} aria-hidden="true"/>Previous question</button>
      <button type="button" className="secondary" disabled={index === filtered.length - 1} onClick={() => onSelect(filtered[index + 1].id)}>Next question<ArrowRight size={16} aria-hidden="true"/></button>
    </div>
  </section>;
}

type SentenceGap = {
  before: string;
  after: string;
  translation: string;
  lookup: (query: string) => {hanzi: string; pinyin: string}[];
  pencil?: {enabled: boolean; toggle: () => void};
};

export function Exercise({exercise, attempt, onSave, penOnly, setPenOnly, feedbackDetails, pending = false, sentenceGap}: {
  exercise: HanziExercise;
  attempt: Attempt | undefined;
  onSave: (value: Attempt | null) => void | Promise<void>;
  penOnly: boolean;
  setPenOnly: (value: boolean) => void;
  feedbackDetails?: ReactNode;
  pending?: boolean;
  sentenceGap?: SentenceGap;
}) {
  const [draft, setDraft] = useState('');
  const [pieces, setPieces] = useState<number[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [writeMode, setWriteMode] = useState<'ink' | 'typing'>('ink');
  const feedback = useRef<HTMLHeadingElement>(null);
  const checkButton = useRef<HTMLButtonElement>(null);
  const firstCandidate = useRef<HTMLButtonElement>(null);
  const [composing, setComposing] = useState(false);
  const [pencilInput, setPencilInput] = useState(false);
  const candidateStatusId = useId();
  const pencilHintId = useId();
  const options = exercise.choices ?? [];
  const building = exercise.kind === 'build';
  const writing = exercise.kind === 'writing';
  const drawing = writing && writeMode === 'ink';
  const answerText = building ? pieces.map(index => options[index]).join('') : draft;
  const hasHanzi = /\p{Script=Han}/u.test(draft);
  const pinyinDraft = sentenceGap && !composing && !hasHanzi && draft.trim();
  const candidates = pinyinDraft ? sentenceGap.lookup(draft) : [];
  const canCheck = sentenceGap ? hasHanzi && !composing
    : drawing ? strokes.length > 0
    : building ? pieces.length === options.length
    : answerText.trim().length > 0;
  const pencil = sentenceGap?.pencil;
  const pencilText = draft.trim();
  const pencilReady = pencil?.enabled && pencilInput && canCheck && !attempt && !pending
    && /^\p{Script=Han}+$/u.test(pencilText)
    && [...pencilText].length === exercise.answer.match(/\p{Script=Han}/gu)?.length;

  async function check() {
    if (!canCheck || attempt || pending) return;
    await onSave(drawing ? {outcome: 'compare', response: '', strokes} : {
      outcome: matchesHanziAnswer(exercise, answerText) ? 'correct' : 'retry',
      response: answerText,
    });
    requestAnimationFrame(() => feedback.current?.focus());
  }

  const checkPencilAnswer = useEffectEvent(() => {
    if (pencilReady) void check();
  });

  useEffect(() => {
    if (!pencilReady) return;
    const timer = window.setTimeout(() => checkPencilAnswer(), 1200);
    return () => window.clearTimeout(timer);
  }, [pencilReady, draft]);

  function updateGap(value: string) {
    setDraft(value);
    setPencilInput(pencil?.enabled ?? false);
  }

  function reset() {
    setDraft('');
    setPencilInput(false);
    setPieces([]);
    setStrokes([]);
    void onSave(null);
  }

  return <div className="hanzi-family-exercise" data-study-assessment={attempt ? 'complete' : 'blocked'}>
    <h3>{sentenceGap ? 'Fill the gap with Hanzi or pinyin.' : <HanziRuns text={exercise.prompt}/>}</h3>
    {!sentenceGap && exercise.context && <p className="hanzi-family-context"><HanziRuns text={exercise.context}/></p>}
    {attempt ? <>
      {attempt.strokes && <PinyinHandwriting kind="hanzi" label="Your handwritten answer" strokes={attempt.strokes} onChange={() => {}} disabled penOnly={penOnly} characters={[...exercise.answer].filter(ch => /\p{Script=Han}/u.test(ch)).length}/>}
      <div className="hanzi-family-feedback">
        <h4 tabIndex={-1} ref={feedback}>{attempt.outcome === 'correct' ? 'Correct' : attempt.outcome === 'retry' ? 'Review this answer' : 'Compare your handwriting'}</h4>
        {attempt.response && <p>Your answer <b lang="zh-Hans"><HanziRuns text={attempt.response}/></b></p>}
        <p className="hanzi-family-example" lang="zh-Hans"><StudyText text={exercise.answer}/></p>
        {exercise.pinyin && <p className="hanzi-family-reading" lang="zh-Latn">{exercise.pinyin}</p>}
        {exercise.meaning && <p>{exercise.meaning}</p>}
        <p><HanziRuns text={exercise.explanation}/></p>
        {feedbackDetails}
      </div>
      <div className="hanzi-family-actions">
        {attempt.outcome === 'compare' && <>
          <button type="button" className="primary" disabled={pending} onClick={() => void onSave({...attempt, outcome: 'correct'})}>My writing matches</button>
          <button type="button" className="secondary" disabled={pending} onClick={() => void onSave({...attempt, outcome: 'retry'})}>I need more practice</button>
        </>}
        <button type="button" className="secondary" disabled={pending} onClick={reset}><RotateCcw size={16} aria-hidden="true"/>Try again</button>
      </div>
    </> : <form onSubmit={event => {event.preventDefault(); void check();}}>
      {sentenceGap && <>
        <p className="hanzi-family-context mandarin320-gap-sentence" lang="zh-Hans">
          {sentenceGap.before}<label className="mandarin320-gap">
            <span className="mandarin320-gap-label" lang="en">Your answer</span>
            <input lang="zh-Hans" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              value={draft} placeholder={pencil?.enabled ? 'Write here' : undefined}
              aria-describedby={pinyinDraft ? candidateStatusId : pencil?.enabled ? pencilHintId : undefined}
              onChange={event => updateGap(event.target.value)}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={event => {
                updateGap(event.currentTarget.value);
                setComposing(false);
              }}
              onKeyDown={event => {
                if (event.key !== 'Enter') return;
                if (!canSubmitComposition(composing, event.nativeEvent)) {
                  event.preventDefault();
                  return;
                }
                if (pinyinDraft) {
                  event.preventDefault();
                  firstCandidate.current?.focus();
                }
              }}/>
          </label>{sentenceGap.after}
        </p>
        <p className="mandarin320-gap-translation">{sentenceGap.translation}</p>
        {pencil && <div className="mandarin320-pencil-controls">
          <button type="button" className="secondary" aria-pressed={pencil.enabled} onClick={() => {
            setPencilInput(false);
            pencil.toggle();
          }}>Write with Apple Pencil</button>
          {pencil.enabled && <p id={pencilHintId}>Write Hanzi in the gap with Chinese Scribble. Your answer is checked when you pause.</p>}
        </div>}
        <p id={candidateStatusId} className="mandarin320-candidate-status" role="status">
          {pinyinDraft && (candidates.length ? 'Choose a Hanzi match.' : 'No matching Hanzi in Mandarin 320.')}
        </p>
        {candidates.length > 0 && <div className="hanzi-family-actions mandarin320-candidates" role="group" aria-label="Matching Hanzi">
          {candidates.map(({hanzi, pinyin}, index) => <button type="button" className="secondary" key={hanzi}
            ref={index === 0 ? firstCandidate : undefined} onClick={() => {
              setPencilInput(false);
              setDraft(hanzi);
              requestAnimationFrame(() => checkButton.current?.focus());
            }}>
            <span lang="zh-Hans">{hanzi}</span><span className="hanzi-family-reading" lang="zh-Latn">{pinyin}</span>
          </button>)}
        </div>}
      </>}
      {writing && <div className="hanzi-family-actions">
        <button type="button" className="secondary" aria-pressed={drawing} onClick={() => setWriteMode('ink')}>Handwriting</button>
        <button type="button" className="secondary" aria-pressed={!drawing} onClick={() => setWriteMode('typing')}>Type Hanzi</button>
      </div>}
      {drawing && <>
        <PinyinHandwriting kind="hanzi" label="Write Hanzi here" strokes={strokes} onChange={setStrokes} penOnly={penOnly} characters={[...exercise.answer].filter(ch => /\p{Script=Han}/u.test(ch)).length}/>
        <div className="hanzi-family-actions">
          <label className="hanzi-family-pen"><input type="checkbox" checked={penOnly} onChange={event => setPenOnly(event.target.checked)}/> Apple Pencil only</label>
          <button type="button" className="secondary" disabled={!strokes.length} onClick={() => setStrokes(strokes.slice(0, -1))}>Undo stroke</button>
          <button type="button" className="secondary" disabled={!strokes.length} onClick={() => setStrokes([])}>Clear</button>
        </div>
      </>}
      {building && <>
        <div className="hanzi-family-piece-order" role="group" aria-label="Your sentence">
          {pieces.length ? pieces.map(index => <button type="button" className="secondary" key={index} onClick={() => setPieces(pieces.filter(value => value !== index))} aria-label={'Remove ' + options[index]}><HanziRuns text={options[index]}/></button>) : <span>Choose the pieces in order.</span>}
        </div>
        <div className="hanzi-family-actions hanzi-family-answer-options" role="group" aria-label="Sentence pieces" lang="zh-Hans">
          {options.map((option, index) => <button type="button" className="secondary" key={index} disabled={pieces.includes(index)} onClick={() => setPieces([...pieces, index])}><HanziRuns text={option}/></button>)}
        </div>
      </>}
      {!sentenceGap && !building && !drawing && (options.length ? <div className="hanzi-family-actions hanzi-family-answer-options" role="group" aria-label="Answer choices" lang="zh-Hans">
        {options.map(option => <button type="button" className="secondary" key={option} aria-pressed={draft === option} onClick={() => setDraft(option)}><HanziRuns text={option}/></button>)}
      </div> : <label className="hanzi-family-input">Your answer
        <input lang="zh-Hans" autoComplete="off" autoCorrect="off" spellCheck={false} value={draft} onChange={event => setDraft(event.target.value)}/>
      </label>)}
      <button ref={checkButton} type="submit" className="primary" disabled={!canCheck || pending}>{pending ? 'Saving answer…' : drawing ? 'Compare with the answer' : 'Check answer'}</button>
    </form>}
  </div>;
}
