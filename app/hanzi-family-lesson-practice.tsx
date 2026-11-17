'use client';

import {useRef, useState, type ReactNode} from 'react';
import {ArrowLeft, ArrowRight, RotateCcw} from 'lucide-react';
import type {Stroke} from './learning';
import PinyinHandwriting from './pinyin-handwriting';
import {StudyText} from './study-lookup-context';
import {type HanziExercise, matchesHanziAnswer, selectedPracticeHref} from './hanzi-family-lesson-route';
import './pinyin-practice.css';

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
    <Exercise key={exercise.id} exercise={exercise} attempt={attempts[exercise.id]} onSave={value => save(exercise.id, value)} {...{penOnly, setPenOnly}}/>
    <div className="hanzi-family-actions hanzi-family-paging">
      <button type="button" className="secondary" disabled={index === 0} onClick={() => onSelect(filtered[index - 1].id)}><ArrowLeft size={16} aria-hidden="true"/>Previous question</button>
      <button type="button" className="secondary" disabled={index === filtered.length - 1} onClick={() => onSelect(filtered[index + 1].id)}>Next question<ArrowRight size={16} aria-hidden="true"/></button>
    </div>
  </section>;
}

export function Exercise({exercise, attempt, onSave, penOnly, setPenOnly, feedbackDetails, pending = false}: {
  exercise: HanziExercise;
  attempt: Attempt | undefined;
  onSave: (value: Attempt | null) => void | Promise<void>;
  penOnly: boolean;
  setPenOnly: (value: boolean) => void;
  feedbackDetails?: ReactNode;
  pending?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const [pieces, setPieces] = useState<number[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [writeMode, setWriteMode] = useState<'ink' | 'typing'>('ink');
  const feedback = useRef<HTMLHeadingElement>(null);
  const options = exercise.choices ?? [];
  const building = exercise.kind === 'build';
  const writing = exercise.kind === 'writing';
  const drawing = writing && writeMode === 'ink';
  const answerText = building ? pieces.map(index => options[index]).join('') : draft;
  const canCheck = drawing ? strokes.length > 0 : building ? pieces.length === options.length : answerText.trim().length > 0;

  async function check() {
    if (!canCheck || attempt || pending) return;
    await onSave(drawing ? {outcome: 'compare', response: '', strokes} : {
      outcome: matchesHanziAnswer(exercise, answerText) ? 'correct' : 'retry',
      response: answerText,
    });
    requestAnimationFrame(() => feedback.current?.focus());
  }

  function reset() {
    setDraft('');
    setPieces([]);
    setStrokes([]);
    void onSave(null);
  }

  return <div className="hanzi-family-exercise" data-study-assessment={attempt ? 'complete' : 'blocked'}>
    <h3>{exercise.prompt}</h3>
    {exercise.context && <p className="hanzi-family-context">{exercise.context}</p>}
    {attempt ? <>
      {attempt.strokes && <PinyinHandwriting kind="hanzi" label="Your handwritten answer" strokes={attempt.strokes} onChange={() => {}} disabled penOnly={penOnly} characters={[...exercise.answer].filter(ch => /\p{Script=Han}/u.test(ch)).length}/>}
      <div className="hanzi-family-feedback">
        <h4 tabIndex={-1} ref={feedback}>{attempt.outcome === 'correct' ? 'Correct' : attempt.outcome === 'retry' ? 'Review this answer' : 'Compare your handwriting'}</h4>
        {attempt.response && <p>Your answer <b lang="zh-Hans">{attempt.response}</b></p>}
        <p className="hanzi-family-example" lang="zh-Hans"><StudyText text={exercise.answer}/></p>
        {exercise.pinyin && <p className="hanzi-family-reading" lang="zh-Latn">{exercise.pinyin}</p>}
        {exercise.meaning && <p>{exercise.meaning}</p>}
        <p>{exercise.explanation}</p>
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
          {pieces.length ? pieces.map(index => <button type="button" className="secondary" key={index} onClick={() => setPieces(pieces.filter(value => value !== index))} aria-label={'Remove ' + options[index]}>{options[index]}</button>) : <span>Choose the pieces in order.</span>}
        </div>
        <div className="hanzi-family-actions hanzi-family-answer-options" role="group" aria-label="Sentence pieces" lang="zh-Hans">
          {options.map((option, index) => <button type="button" className="secondary" key={index} disabled={pieces.includes(index)} onClick={() => setPieces([...pieces, index])}>{option}</button>)}
        </div>
      </>}
      {!building && !drawing && (options.length ? <div className="hanzi-family-actions hanzi-family-answer-options" role="group" aria-label="Answer choices" lang="zh-Hans">
        {options.map(option => <button type="button" className="secondary" key={option} aria-pressed={draft === option} onClick={() => setDraft(option)}>{option}</button>)}
      </div> : <label className="hanzi-family-input">Your answer
        <input lang="zh-Hans" autoComplete="off" autoCorrect="off" spellCheck={false} value={draft} onChange={event => setDraft(event.target.value)}/>
      </label>)}
      <button type="submit" className="primary" disabled={!canCheck || pending}>{pending ? 'Saving answer…' : drawing ? 'Compare with the answer' : 'Check answer'}</button>
    </form>}
  </div>;
}
