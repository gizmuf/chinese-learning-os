'use client';

import {useEffect, useRef, useState} from 'react';
import {ArrowLeft, BookOpen, Volume2} from 'lucide-react';
import lesson from '../data/hanzi-families-2026-11-17.json';
import exerciseData from '../data/hanzi-families-2026-11-17-practice.json';
import audioData from '../data/hanzi-families-2026-11-17-audio.json';
import {stopAudio} from './audio';
import HanziFamilyPractice, {exerciseKinds, loadHanziAttempts, type Attempts, type ExerciseFilter} from './hanzi-family-lesson-practice';
import {hanziFamilyBackLink, hanziFamilyLessonId, hanziFamilyLessonTitle, type HanziExercise} from './hanzi-family-lesson-route';
import {StudyText, useStudyLookup} from './study-lookup-context';
import {useRecordingPlayback} from './use-recording-playback';
import './hanzi-family-lesson.css';

const activities = [['study', 'Words and families'], ['compare', 'Compare shapes'], ['practice', 'Practice']] as const;
const exercises = exerciseData as HanziExercise[];
const audio = audioData as Record<string, string>;
const pageSize = 10;

function loadRoute() {
  const query = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
  const activity = activities.find(([id]) => id === query.get('activity'))?.[0] ?? 'study';
  const filter = exerciseKinds.find(([id]) => id === query.get('exercise'))?.[0] ?? 'all';
  const question = exercises.find(item => item.id === query.get('question'))?.id ?? '';
  return {activity, filter, question};
}

function asciiSearch(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function StudyWords({player}: {player: ReturnType<typeof useRecordingPlayback>}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const lookup = useStudyLookup();
  const query = asciiSearch(search.trim());
  const grouped = lesson.entries.map((entry, index) => ({entry, index})).filter(({entry}) => !query ||
    asciiSearch([entry.hanzi, entry.pinyin, entry.meaning, entry.family].join(' ')).includes(query));
  const pageCount = Math.ceil(grouped.length / pageSize);
  const visible = grouped.slice(page * pageSize, (page + 1) * pageSize);
  return <section className="panel hanzi-family-panel" aria-labelledby="hanzi-study-heading">
    <h2 id="hanzi-study-heading">Words and families</h2>
    <div className="hanzi-family-actions hanzi-family-study-controls">
      <label>Find a word
        <input type="search" value={search} placeholder="Hanzi, pinyin or meaning" onChange={event => {setSearch(event.target.value);setPage(0);}}/>
      </label>
      {pageCount > 1 && <label>Show words
        <select value={page} onChange={event => setPage(Number(event.target.value))}>
          {Array.from({length: pageCount}, (_, index) => <option value={index} key={index}>{index * pageSize + 1}–{Math.min((index + 1) * pageSize, grouped.length)}</option>)}
        </select>
      </label>}
      <p role="status">{grouped.length} words</p>
    </div>
    <div className="hanzi-family-entries">
      {visible.map(({entry, index}) => {
        const clip = audio[entry.example];
        return <details key={entry.hanzi} className="hanzi-family-entry">
          <summary>
            <span className="hanzi-family-headword" lang="zh-Hans">{entry.hanzi}</span>
            <span className="hanzi-family-reading" lang="zh-Latn">{entry.pinyin}</span>
            <span className="hanzi-family-gloss" lang="en">{entry.meaning}</span>
          </summary>
          <div className="hanzi-family-entry-body">
            <div className="hanzi-family-sentence" data-study-source-id={hanziFamilyLessonId + ':' + (index + 1)}
              data-study-sentence={entry.example} data-study-pinyin={entry.example_pinyin} data-study-meaning={entry.example_meaning} data-study-audio={clip}>
              <p className="hanzi-family-example" lang="zh-Hans"><StudyText text={entry.example} pinyin={entry.example_pinyin} sourceText={entry.example} headword={entry.hanzi}/></p>
              <p className="hanzi-family-reading" lang="zh-Latn">{entry.example_pinyin}</p>
              <p lang="en">{entry.example_meaning}</p>
              <div className="hanzi-family-actions">
                {clip && <button type="button" className="secondary" aria-label={'Listen to ' + entry.hanzi + ' example'} data-playing={player.playing === clip || undefined}
                  onClick={() => player.play(clip)}><Volume2 size={17} aria-hidden="true"/>Listen</button>}
                {lookup && <button type="button" className="secondary" onClick={event => lookup.open(entry.hanzi, event.currentTarget, {
                  text: entry.hanzi, pinyin: entry.pinyin, meaning: entry.meaning,
                })}><BookOpen size={16} aria-hidden="true"/>Dictionary</button>}
              </div>
            </div>
            <h3>Related words</h3>
            <p><StudyText text={entry.family}/></p>
            <h3>What to look for</h3>
            <p lang="pl"><StudyText text={entry.notes}/></p>
          </div>
        </details>;
      })}
      {!visible.length && <p>No words match this search.</p>}
    </div>
  </section>;
}

function CompareShapes() {
  return <section className="panel hanzi-family-panel" aria-labelledby="hanzi-compare-heading">
    <h2 id="hanzi-compare-heading">Compare shapes</h2>
    <p>Use the shared strokes and components to recognise each character.</p>
    <div className="hanzi-family-compare">
      {lesson.visualFamilies.map(group => <section className="hanzi-family-group" key={group.title}>
        <h3><StudyText text={group.title}/></h3>
        <ul>
          {group.examples?.map(example => <li key={example.hanzi}>
            <span className="hanzi-family-headword" lang="zh-Hans"><StudyText text={example.hanzi} whole/></span>
            <span className="hanzi-family-reading" lang="zh-Latn">{example.pinyin}</span>
            <span lang="en">{example.meaning}</span>
          </li>)}
        </ul>
        <p lang="pl"><StudyText text={group.notes}/></p>
      </section>)}
    </div>
  </section>;
}

export default function HanziFamilyLesson({owner, notify, penOnly, setPenOnly}: {
  owner: string | null;
  notify: (message: string) => void;
  penOnly: boolean;
  setPenOnly: (value: boolean) => void;
}) {
  const [route, setRoute] = useState(loadRoute);
  const storageKey = 'chinese-os:hanzi-family-lesson:2026-11-17:v1:' + (owner ?? 'guest');
  const [attempts, setAttempts] = useState<Attempts>(() => loadHanziAttempts(storageKey) ?? {});
  const progressInMemory = useRef(false);
  const player = useRecordingPlayback(notify);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const changed = () => setRoute(loadRoute());
    window.addEventListener('popstate', changed);
    return () => {window.removeEventListener('popstate', changed);stopAudio();};
  }, []);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey && !progressInMemory.current) setAttempts(loadHanziAttempts(storageKey) ?? {});
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [storageKey]);

  function navigate(change: Partial<typeof route>) {
    const next = {...route, ...change};
    const url = new URL(location.href);
    for (const [key, value] of Object.entries({activity: next.activity, exercise: next.filter, question: next.question})) {
      if (value === '' || value === 'all' || value === 'study') url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    window.history.replaceState(window.history.state, '', url);
    if (next.activity !== route.activity) stopAudio();
    setRoute(next);
    if (next.activity !== route.activity) requestAnimationFrame(() => heading.current?.focus());
  }

  function save(id: string, attempt: Attempts[string] | null) {
    const next = {...(progressInMemory.current ? attempts : loadHanziAttempts(storageKey) ?? attempts)};
    if (attempt) next[id] = attempt;
    else delete next[id];
    setAttempts(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      progressInMemory.current = false;
    } catch {
      if (!progressInMemory.current) notify('Practice progress is available while this page stays open.');
      progressInMemory.current = true;
    }
  }

  const previous = hanziFamilyBackLink(typeof location === 'undefined' ? '' : location.search);
  return <article className="course-space hanzi-family-lesson">
    <a className="text-button" href={previous}><ArrowLeft size={16} aria-hidden="true"/>{previous.includes('study=library') ? 'Back to My lessons' : 'Back to course'}</a>
    <header className="hanzi-family-heading">
      <p className="eyebrow">17 November 2026</p>
      <h1 ref={heading} tabIndex={-1}>{hanziFamilyLessonTitle}</h1>
      <p><span lang="zh-Hans">一般 → 出去</span> · 50 words and 12 visual families</p>
    </header>
    <nav className="hanzi-family-actions hanzi-family-tabs" aria-label="Lesson activities">
      {activities.map(([id, label]) => <button key={id} type="button" className={route.activity === id ? 'primary' : 'secondary'}
        aria-pressed={route.activity === id} onClick={() => navigate({activity: id})}>{label}</button>)}
    </nav>
    <div hidden={route.activity !== 'study'}><StudyWords player={player}/></div>
    {route.activity === 'compare' && <CompareShapes/>}
    {route.activity === 'practice' && <HanziFamilyPractice active={route.question} onSelect={question => navigate({question})}
      filter={route.filter} onFilter={(filter: ExerciseFilter) => navigate({filter, question: ''})}
      {...{exercises, attempts, save, penOnly, setPenOnly}}/>}
  </article>;
}
