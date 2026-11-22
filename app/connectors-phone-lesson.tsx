'use client';

import {lazy, Suspense, useEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, BookOpen, Download, PenLine} from 'lucide-react';
import lesson from '../data/connectors-phone-lesson.json';
import ran from '../data/connectors-phone-ran.json';
import {StudyText, useStudyLookup} from './study-lookup-context';
import HskBadge from './hsk-badge';
import HanziQuickReview from './hanzi-quick-review';
import DictionaryMiniNotebook from './dictionary-mini-notebook';
import {readDraft, saveDraft} from './local-store';
import {connectorsBackHref, connectorsPhoneReadingHref, connectorsSections, connectorsSection,
  grammarGapCorrect, type ConnectorsRow, type ConnectorsSection} from './connectors-phone-model';
import {ConnectorsCompare, ConnectorsDisplayControls, ConnectorsEntry, ConnectorsWriting,
  type ConnectorsDisplay} from './connectors-phone-shared';
import './connectors-phone.css';

const Reading = lazy(() => import('./connectors-phone-reading'));
type Props = {db: IDBDatabase | null};

/** Local drafts are separate from recall grades; revealing an answer never records SRS credit. */
function useLessonDrafts(db: IDBDatabase | null) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false), [status, setStatus] = useState('Loading your practice…');
  const pending = useRef(Promise.resolve()), latest = useRef(drafts), generation = useRef(0);
  const writable = useRef(false);
  useEffect(() => {
    if (!db) return;
    let active = true;
    void readDraft<unknown>(db, 'lesson:connectors-phone:answers').then(saved => {
      if (!active) return;
      const restored = saved && typeof saved === 'object' && !Array.isArray(saved)
        ? Object.fromEntries(Object.entries(saved).filter((pair): pair is [string, string] => typeof pair[1] === 'string')) : {};
      latest.current = restored; writable.current = true; setDrafts(restored); setReady(true); setStatus('Your answers stay in this notebook.');
    }).catch(() => {if (active) {setReady(true); setStatus('Saved answers could not open. You can practise without saving.');}});
    return () => {active = false;};
  }, [db]);
  function change(key: string, value: string) {
    const next = {...latest.current, [key]: value}; latest.current = next; setDrafts(next);
    if (!db || !writable.current) return;
    const destination = db;
    const ticket = ++generation.current;
    setStatus('Saving…');
    pending.current = pending.current.then(() => saveDraft(destination, 'lesson:connectors-phone:answers', next))
      .then(() => {if (ticket === generation.current) setStatus('Answers saved in your notebook.');})
      .catch(() => {if (ticket === generation.current) setStatus('These answers could not be saved. Keep this page open and try editing again.');});
  }
  return {drafts, change, ready, status};
}

function ContextPractice({display, onWrite, db}: {display: ConnectorsDisplay; onWrite: (row: ConnectorsRow) => void} & Props) {
  const saved = useLessonDrafts(db);
  const [shown, setShown] = useState<Set<string>>(() => new Set());
  const [checks, setChecks] = useState<Record<number, boolean>>({});
  const reveal = (id: string) => setShown(old => {const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next;});
  return <div className="cl-practice">
    <h2>Use it yourself</h2>
    <p>Say each sentence, then write the Hanzi and pinyin with tone marks. Different wording can be correct. Compare your answer with the model after you try.</p>
    <p role="status" className="cl-source-note">{saved.status}</p>
    <ol className="cl-practice-list">{lesson.practice.map((row, index) => <li className="panel" key={row.id}>
      <h3>{index + 1}. {row.prompt}</h3>
      <label htmlFor={'cl-answer-' + row.id}>Your sentence</label><textarea id={'cl-answer-' + row.id} lang="zh-Hans" rows={2} value={saved.drafts[row.id] ?? ''} disabled={!saved.ready}
        onChange={event => saved.change(row.id, event.target.value)} autoComplete="off"/>
      <label htmlFor={'cl-pinyin-' + row.id}>Your pinyin with tones</label><textarea id={'cl-pinyin-' + row.id} lang="zh-Latn" rows={2} value={saved.drafts[row.id + ':pinyin'] ?? ''} disabled={!saved.ready}
        onChange={event => saved.change(row.id + ':pinyin', event.target.value)} autoComplete="off" spellCheck={false}/>
      <button type="button" className="secondary" aria-expanded={shown.has(row.id)} onClick={() => reveal(row.id)}>{shown.has(row.id) ? 'Hide model answer' : 'Compare with a model'}</button>
      {shown.has(row.id) && <ConnectorsEntry row={row} display={display} onWrite={onWrite}/>}
      {index === 4 && <ConnectorsCompare kind="frequency" display={display}/>}
    </li>)}</ol>
    <h2>A word from the 然 family</h2>
    <p>Use one of these eight words in the gap. Choose by the meaning of the whole sentence. 不然 and 要不然 can both work in the last two examples.</p>
    <p className="cl-family-bank">{ran.words.map(row => <span key={row.word}><StudyText text={row.word} pinyin={row.pinyin} whole/>{' '}</span>)}</p>
    <ol className="cl-practice-list">{ran.words.map((row, index) => {
      const key = 'ran-' + index, value = saved.drafts[key] ?? '';
      return <li className="panel" key={row.word}><p className="cl-hanzi" lang="zh-Hans"><StudyText text={row.cloze}/></p><p>{row.exampleEnglish}</p>
        <label>Missing word<input lang="zh-Hans" value={value} disabled={!saved.ready} onChange={event => {saved.change(key, event.target.value); setChecks(old => {const next = {...old}; delete next[10 + index]; return next;});}} autoComplete="off"/></label>
        <label>Pinyin with tones<input lang="zh-Latn" value={saved.drafts[key + ':pinyin'] ?? ''} disabled={!saved.ready} onChange={event => saved.change(key + ':pinyin', event.target.value)} spellCheck={false}/></label>
        <div className="cl-actions"><button type="button" className="secondary" disabled={!value.trim()} onClick={() => setChecks(old => ({...old, [10 + index]: row.accepted.includes(value.trim())}))}>Check word</button>
          <button type="button" className="text-button" aria-expanded={shown.has(key)} onClick={() => reveal(key)}>Compare with a model</button></div>
        {10 + index in checks && <p role="status">{checks[10 + index] ? 'Correct word for this meaning.' : 'Try again. Is this a sequence, certainty, surprise, continuation or a consequence?'}</p>}
        {shown.has(key) && <><ConnectorsEntry row={{hanzi: row.example, pinyin: row.examplePinyin, english: row.exampleEnglish}} display={display} onWrite={onWrite}/><p className="cl-pinyin">{row.word} · {row.pinyin}</p></>}
      </li>;
    })}</ol>
    <h2>Increasing change or a relationship?</h2><p>Fill each blank with 越来越 or 越. For two blanks, enter both parts, separated by a space.</p>
    <ol className="cl-practice-list">{lesson.grammar.map((row, index) => <li className="panel" key={row.prompt}>
      <p className="cl-hanzi" lang="zh-Hans"><StudyText text={row.prompt}/></p>
      <label>Missing construction<input lang="zh-Hans" value={saved.drafts['gap-' + index] ?? ''} disabled={!saved.ready}
        onChange={event => {saved.change('gap-' + index, event.target.value); setChecks(old => {const next = {...old}; delete next[index]; return next;});}} autoComplete="off"/></label>
      <div className="cl-actions"><button type="button" className="secondary" disabled={!saved.drafts['gap-' + index]?.trim()} onClick={() => setChecks(old => ({...old, [index]: grammarGapCorrect(saved.drafts['gap-' + index] ?? '', row.answer)}))}>Check construction</button>
        <button type="button" className="text-button" aria-expanded={shown.has('gap-' + index)} onClick={() => reveal('gap-' + index)}>Show explanation</button></div>
      {index in checks && <p role="status">{checks[index] ? 'Correct construction.' : 'Try again. Is this one changing state, or does one change depend on another?'}</p>}
      {shown.has('gap-' + index) && <><ConnectorsEntry row={row} display={display} onWrite={onWrite}/><p>{row.explanation}</p></>}
    </li>)}</ol>
    <h2>One scene, two patterns</h2><p>Try the two sentences aloud first. Then write the Hanzi and tone-marked pinyin.</p>
    {lesson.speaking.map((row, index) => <section className="panel cl-challenge" key={row.hanzi}>
      <h3>{String.fromCharCode(65 + index)}. {row.english}</h3>
      <label htmlFor={'cl-speaking-' + index}>Your answer</label><textarea id={'cl-speaking-' + index} rows={3} value={saved.drafts['speaking-' + index] ?? ''} disabled={!saved.ready} onChange={event => saved.change('speaking-' + index, event.target.value)}/>
      <button type="button" className="secondary" aria-expanded={shown.has('speaking-' + index)} onClick={() => reveal('speaking-' + index)}>Compare with a model</button>
      {shown.has('speaking-' + index) && <ConnectorsEntry row={row} display={display} onWrite={onWrite}/>}
    </section>)}
  </div>;
}

function CharacterPractice({display, onWrite, db}: {display: ConnectorsDisplay; onWrite: (row: ConnectorsRow) => void} & Props) {
  const [page, setPage] = useState(0), [selected, setSelected] = useState(lesson.characters[0]);
  const dictionary = useStudyLookup()?.dictionary;
  const meaning = (row: typeof selected) => row.english ?? dictionary?.get(row.hanzi)?.meaning ?? 'Character used in this lesson';
  const size = 16;
  return <section>
    <h2>Hanzi, stroke order & pinyin</h2><p>63 characters from the PDF. Choose one for the small notebook, or open Write for stroke order, tracing, copying and pinyin practice.</p>
    <div className="cl-actions"><HanziQuickReview entries={lesson.characters.map(row => ({hanzi: row.hanzi, pinyin: row.pinyin, meaning: meaning(row)}))}/></div>
    <nav className="cl-ranges" aria-label="Character ranges">{Array.from({length: Math.ceil(lesson.characters.length / size)}, (_, index) => <button type="button" className="secondary" key={index} aria-current={index === page ? 'page' : undefined} onClick={() => setPage(index)}>{index * size + 1}–{Math.min((index + 1) * size, lesson.characters.length)}</button>)}</nav>
    <div className="cl-characters">{lesson.characters.slice(page * size, (page + 1) * size).map(row => <button type="button" key={row.hanzi}
      className="cl-character" aria-pressed={selected.hanzi === row.hanzi} onClick={() => setSelected(row)}>
      <span className="cl-hanzi" lang="zh-Hans">{row.hanzi}</span>{display.pinyin && <span className="cl-pinyin">{row.pinyin}</span>}
      <HskBadge text={row.hanzi} kind="character"/>
    </button>)}</div>
    <section className="panel cl-character-writing" aria-label="Selected character practice">
      <div><ConnectorsEntry row={{hanzi: selected.hanzi, pinyin: selected.pinyin, english: meaning(selected)}} display={display} onWrite={onWrite} listen={false}/>
        <p>{selected.strokes} strokes · source page {selected.page}</p><p>The reading above matches the source context. Tap the character to explore its other readings and related words.</p>
        <button type="button" className="secondary" onClick={() => onWrite({hanzi: selected.hanzi, pinyin: selected.pinyin, english: meaning(selected)})}><PenLine size={16}/>Stroke order & pinyin practice</button></div>
      <DictionaryMiniNotebook key={selected.hanzi} text={selected.hanzi} visible library persist db={db} onClose={() => {}}/>
    </section>
  </section>;
}

export default function ConnectorsPhoneLesson({db}: Props) {
  const [section, setSection] = useState<ConnectorsSection>(() => connectorsSection(typeof location === 'undefined' ? '' : location.search));
  const [display, setDisplay] = useState<ConnectorsDisplay>({pinyin: true, english: false});
  const [writing, setWriting] = useState<ConnectorsRow | null>(null);
  const [readerVisited, setReaderVisited] = useState(section === 'reading');
  const [practiceVisited, setPracticeVisited] = useState(section === 'practice');
  const heading = useRef<HTMLHeadingElement>(null);
  const index = connectorsSections.findIndex(([id]) => id === section);
  useEffect(() => {
    const back = () => {const next = connectorsSection(location.search); setSection(next); if (next === 'reading') setReaderVisited(true); if (next === 'practice') setPracticeVisited(true);};
    addEventListener('popstate', back); return () => removeEventListener('popstate', back);
  }, []);
  function select(next: ConnectorsSection) {
    if (next === section) return;
    setSection(next); if (next === 'reading') setReaderVisited(true); if (next === 'practice') setPracticeVisited(true);
    const query = new URLSearchParams(location.search); query.set('section', next);
    history.replaceState(history.state, '', '/?' + query);
    requestAnimationFrame(() => heading.current?.focus({preventScroll: true}));
  }
  const table = (rows: ConnectorsRow[]) => <div className="cl-reference-grid">{rows.map(row => <div className="panel" key={row.hanzi}><ConnectorsEntry row={row} display={display} onWrite={setWriting} listen={false}/></div>)}</div>;
  const examples = (rows: ConnectorsRow[]) => <div className="cl-examples">{rows.map(row => <section className="panel" key={row.hanzi}><ConnectorsEntry row={row} display={display} onWrite={setWriting}/></section>)}</div>;
  return <article className="connectors-lesson">
    <a className="text-button cl-back" href={connectorsBackHref(typeof location === 'undefined' ? '' : location.search)}><ArrowLeft size={17}/>Back to My Lessons</a>
    <header className="cl-heading"><p className="eyebrow">MY LESSONS · GRAMMAR, READING & WRITING</p>
      <h1 ref={heading} tabIndex={-1}>{lesson.title}</h1><p>Link ideas. Read the whole story. Use the patterns and write the characters.</p>
      <div className="cl-actions"><ConnectorsDisplayControls value={display} onChange={setDisplay}/>
        <a className="text-button" href={lesson.source.download} download><Download size={16}/>Source PDF · 27 pages</a></div>
    </header>
    <nav className="cl-sections" aria-label="Lesson sections">{connectorsSections.map(([id, title], i) => <button type="button" key={id} aria-current={id === section ? 'step' : undefined} onClick={() => select(id)}>{i + 1}. {title}</button>)}</nav>
    <div className="cl-step-nav"><button type="button" className="text-button" disabled={index === 0} onClick={() => select(connectorsSections[index - 1][0])}><ArrowLeft size={17}/>Previous</button><span>{index + 1} / {connectorsSections.length}</span><button type="button" className="text-button" disabled={index === connectorsSections.length - 1} onClick={() => select(connectorsSections[index + 1][0])}>Next<ArrowRight size={17}/></button></div>
    {section === 'connectors' && <section><h2>Connect ideas and consequences</h2>{table(lesson.connectors)}
      <h2>Use the patterns</h2>{examples(lesson.connectorExamples.slice(0, 3))}
      <h2>Time & frequency</h2><p><StudyText text="每天"/> is a daily habit; <StudyText text="一直"/> describes an action or situation that continues.</p>
      {table(lesson.frequency)}<ConnectorsCompare kind="frequency" display={display}/>{examples(lesson.connectorExamples.slice(3))}
      <h2>From the phone conversation</h2>{table(lesson.phoneVocabulary)}
      <h2>A small 然 word family</h2><p>{ran.note}</p>
      <div className="cl-examples">{ran.words.map(row => <section className="panel cl-family-row" key={row.word}>
        <div><HskBadge text={row.word} pinyin={row.pinyin} kind="word"/><ConnectorsEntry row={{hanzi: row.word, pinyin: row.pinyin, english: row.english}} display={display} onWrite={setWriting}/></div>
        <ConnectorsEntry row={{hanzi: row.example, pinyin: row.examplePinyin, english: row.exampleEnglish}} display={display} onWrite={setWriting}/>
      </section>)}</div>
      <h3>然后 and 以后</h3><p>然后 connects actions. 以后 can follow a specified time or event, or refer to later/from now on. Match the construction to the context.</p>
      {ran.timeContrast.map(row => <section className="panel cl-variant" key={row.hanzi}><ConnectorsEntry row={row} display={display} onWrite={setWriting}/><p>{row.note}</p></section>)}
      <button type="button" className="secondary" onClick={() => select('practice')}>Practise the 然 words<ArrowRight size={17}/></button>
    </section>}
    {section === 'patterns' && <section><h2>One changing state</h2><p><StudyText text="越来越"/> (yuè lái yuè) + adjective or state verb: a trend over time.</p>{examples(lesson.trends)}
      <h2>Two linked changes</h2><p><StudyText text="越 A，越 B"/> (yuè A, yuè B): the more A, the more B. B can increase, decrease or become harder. The subjects can be the same or different.</p>{examples(lesson.relationships)}
      <h2>Variants & the same scene</h2>{lesson.variants.map(row => <section className="panel cl-variant" key={row.hanzi}><ConnectorsEntry row={row} display={display} onWrite={setWriting}/><p>{row.note}</p></section>)}
      <button type="button" className="secondary" onClick={() => select('practice')}>Try the four construction exercises<ArrowRight size={17}/></button></section>}
    <div hidden={section !== 'reading'}>{readerVisited && <><p className="cl-reading-link"><a className="text-button" href={connectorsPhoneReadingHref} target="_blank" rel="noopener"><BookOpen size={17}/>Open this full reading in Reading Lab</a></p>
      <Suspense fallback={<p role="status">Opening the full reading…</p>}><Reading active={section === 'reading'} display={display} onDisplayChange={setDisplay} controls={false}/></Suspense></>}</div>
    {section === 'caution' && <section><h2 lang="zh-Hans">小心一点</h2><p>Xiǎoxīn yìdiǎn · Seven ways to talk about being careful outside and in crowded places.</p>{examples(lesson.caution)}</section>}
    <div hidden={section !== 'practice'}>{practiceVisited && <ContextPractice {...{display, db}} onWrite={setWriting}/>}</div>
    {section === 'hanzi' && <CharacterPractice {...{display, db}} onWrite={setWriting}/>}
    <footer className="cl-source"><details><summary>Source & coverage</summary><p>{lesson.source.file} · all 27 pages retained in the original PDF.</p>
      <ul>{lesson.coverage.map(item => <li key={item.section}><strong>{item.section}</strong> · pp. {item.pages[0]}{item.pages.length > 1 ? '–' + item.pages.at(-1) : ''}. {item.content}.</li>)}</ul>
      <p>Source readings and model answers are preserved. Additional comparisons are labelled as practice. Your practice drafts and revealed examples do not count as independent SRS reviews.</p></details></footer>
    <ConnectorsWriting row={writing} onClose={() => setWriting(null)}/>
  </article>;
}
