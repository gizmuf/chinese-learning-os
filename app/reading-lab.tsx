'use client';

import {useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode} from 'react';
import {ArrowLeft, ArrowRight, BookOpen, PenLine} from 'lucide-react';
import {readingLabReadings} from './reading-lab-data';
import {resolveReadingGrammarFrame} from './reading-lab-grammar';
import type {ReadingLabParagraph, ReadingLabReading, ReadingLabToken} from './reading-lab-types';
import {analyzeReading, readingToneNote, splitReadingSentences, tokenGlyphs, toneMarks} from './reading-lab-model';
import {isReadingLabEntry, readReadingLabRoute, readingLabAtlasEvent, readingLabHref, readingLabLevels, readingLabWriteEvent, type ReadingAid, type ReadingLabAtlasVisit, type ReadingLabRoute} from './reading-lab-route';
import {atlasWorkspaceReturn, readAtlasWorkspaceRoute} from './atlas-workspace-route';
import {workspaceExploration} from './atlas-workspace-model';
import AtlasWorkspace from './atlas-workspace';
import {loadHskLevelResource} from './dictionary-client';
import {hskLevelIndex, type HskIndex} from './hsk-level-model';
import syllabus from '../data/hsk-levels-source.json';
import {useStudyLookup} from './study-lookup-context';
import {useI18n} from './i18n';
import Guided from './guided';
import './reading-lab.css';

type ReadingProps = {penOnly: boolean; notify: (message: string) => void};
type ReaderDetour = {kind: 'atlas'; visit: ReadingLabAtlasVisit} | {kind: 'stroke'; text: string};
type ReaderHistory = {readingLabScroll?: number; readingLabDetour?: ReaderDetour};
type VocabularyReport = ReturnType<typeof analyzeReading>;
type WritingDraft = Record<string, string>;

const aids: {id: ReadingAid; label: string}[] = [
  {id: 'hanzi', label: 'Hanzi'}, {id: 'tones', label: 'Tone marks'}, {id: 'pinyin', label: 'Pinyin'},
];
const neutralNames = ['High and level', 'Rising', 'Low / dipping', 'Falling', 'Neutral'];
const defaultWorkspace = '?atlas=1&workspace=1&anchor=学&hsk=2';

function readingLabLocation(route: ReadingLabRoute, workspaceOrigin?: string) {
  return readingLabHref(route) + (workspaceOrigin ? '&returnWorkspace=' + encodeURIComponent(workspaceOrigin) : '');
}

function currentDetour() {
  const detour = (history.state as ReaderHistory | null)?.readingLabDetour;
  return detour?.kind === 'atlas' || detour?.kind === 'stroke' ? detour : undefined;
}

function Modal({children, className, label, onClose}: {children: ReactNode; className: string; label: string; onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    return () => {if (element.open) element.close();};
  }, []);
  return <dialog ref={dialog} className={className} aria-label={label} onCancel={event => {event.preventDefault(); onClose();}}>
    <header className="rl-modal-header"><strong>{label}</strong><button type="button" onClick={onClose}><ArrowLeft size={16}/> Back to reading</button></header>
    {children}
  </dialog>;
}

function ReaderToken({token, aid, onChoose}: {token: ReadingLabToken; aid: ReadingAid; onChoose: (text: string, opener: HTMLButtonElement) => void}) {
  const headword = [...token.text].filter(glyph => /\p{Script=Han}/u.test(glyph)).join('');
  if (!headword) return <span className="rl-punctuation">{token.text}</span>;
  const glyphs = aid === 'hanzi' ? undefined : tokenGlyphs(token);
  const meaning = (token as ReadingLabToken & {meaning?: string}).meaning;
  return <button type="button" className="rl-word" lang="zh-Hans" data-reader-headword={headword}
    data-reader-meaning={meaning} data-reader-pinyin={meaning ? token.pinyin.join('') : undefined} aria-label={aid === 'hanzi' ? headword : headword + ' · ' + token.pinyin.join(' ')}
    onClick={event => onChoose(headword, event.currentTarget)}>
    {glyphs ? glyphs.map((glyph, index) => glyph.tone
      ? <ruby key={index} data-tone={glyph.tone}>{glyph.text}<rt aria-hidden="true">{aid === 'tones' ? glyph.mark : glyph.pinyin}</rt></ruby>
      : <span key={index}>{glyph.text}</span>) : token.text}
  </button>;
}

function ReaderParagraph({paragraph, index, route, highlights, onChoose}: {
  paragraph: ReadingLabParagraph; index: number; route: ReadingLabRoute; highlights: ReadonlySet<string>;
  onChoose: (text: string, opener: HTMLButtonElement, paragraph: string) => void;
}) {
  const sentenceByToken = new Map(splitReadingSentences(paragraph).flatMap((sentence, sentenceIndex) => sentence.tokens.map(token => [
    token, {sentence, sentenceIndex},
  ] as const)));
  return <section className="rl-paragraph" id={'rl-' + paragraph.id} data-reader-paragraph={paragraph.id}>
    <div className="rl-paragraph-text" lang="zh-Hans" aria-label={'Paragraph ' + (index + 1)}>
      {paragraph.chunks.map(chunk => <span key={chunk.id} id={'rl-' + chunk.id} className="rl-chunk"
        data-reader-chunk={chunk.id} data-grammar-evidence={highlights.has(chunk.id) || undefined}>
        {chunk.tokens.map((token, tokenIndex) => {
          const source = sentenceByToken.get(token);
          return <span key={tokenIndex} data-study-source-id={source && route.article + ':' + paragraph.id + ':' + source.sentenceIndex}
            data-study-sentence={source?.sentence.hanzi} data-study-pinyin={source?.sentence.pinyin} data-study-meaning={source?.sentence.english}>
            <ReaderToken token={token} aid={route.aid} onChoose={(text, opener) => onChoose(text, opener, paragraph.id)}/>
          </span>;
        })}
      </span>)}
    </div>
    <details className="rl-translation"><summary>English translation</summary><p>{paragraph.english}</p></details>
  </section>;
}

function useVocabularyIndex() {
  const [index, setIndex] = useState<HskIndex>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    void loadHskLevelResource().then(data => {if (alive) setIndex(hskLevelIndex(data));}).catch(() => {if (alive) setFailed(true);});
    return () => {alive = false;};
  }, []);
  return {index, failed};
}

function VocabularyDetails({reading, index, failed}: {reading: ReadingLabReading; index?: HskIndex; failed: boolean}) {
  const report = useMemo(() => index ? analyzeReading(reading, index) : null, [reading, index]);
  const selected = report?.coverage.find(band => Number(band.level) === reading.level);
  return <details className="rl-vocabulary">
    <summary>Vocabulary breakdown</summary>
    {!report && <p role="status">{failed ? 'The official HSK vocabulary index is unavailable.' : 'Loading official HSK vocabulary…'}</p>}
    {report && <>
      <p>{report.totals.tokens} word occurrences · {report.totals.types} distinct words</p>
      {selected && <p><strong>{selected.tokenPercent}%</strong> of word occurrences and <strong>{selected.typePercent}%</strong> of distinct words are listed by HSK {reading.level}.</p>}
      <table><thead><tr><th scope="col">Through level</th><th scope="col">Occurrences</th><th scope="col">Distinct</th></tr></thead>
        <tbody>{report.coverage.map(band => <tr key={band.level}><th scope="row">HSK {band.level}</th><td>{band.tokenCount}</td><td>{band.typeCount}</td></tr>)}</tbody></table>
      {!!report.aboveLevel.length && <p><strong>Above HSK {reading.level}:</strong> {report.aboveLevel.map(word => <span lang="zh-Hans" key={word.text}>{word.text} <small>({word.firstLevel}) </small></span>)}</p>}
      {!!report.offList.length && <p><strong>Outside the official word list:</strong> <span lang="zh-Hans">{report.offList.map(word => word.text).join('、')}</span></p>}
      <p><small>Counts use the authored word boundaries. Coverage is cumulative and includes every occurrence in the denominator. <a href={syllabus.officialSource} target="_blank" rel="noreferrer">{syllabus.edition}</a></small></p>
    </>}
  </details>;
}

function LibraryCoverage({reading, report, failed}: {reading: ReadingLabReading; report?: VocabularyReport; failed: boolean}) {
  const measured = report?.coverage.find(band => Number(band.level) === reading.level);
  return <small className="rl-library-coverage">Intended HSK {reading.level}
    {measured && report ? ' · ' + measured.tokenPercent + '% of word occurrences through this level'
        + ' · ' + (report.offList.length + report.aboveLevel.length) + (report.offList.length + report.aboveLevel.length === 1 ? ' word beyond it' : ' words beyond it')
      : failed ? ' · Measured vocabulary coverage unavailable' : ' · Measuring vocabulary coverage…'}
  </small>;
}

function ReaderLibrary({route, index, failed, workspaceOrigin, onLevel, onArticle}: {
  route: ReadingLabRoute; index?: HskIndex; failed: boolean;
  workspaceOrigin?: string; onLevel: (level: ReadingLabRoute['level']) => void;
  onArticle: (event: MouseEvent<HTMLAnchorElement>, reading: ReadingLabReading) => void;
}) {
  const material = useMemo(() => readingLabReadings.filter(reading => reading.level === route.level)
    .map(reading => ({reading, report: index ? analyzeReading(reading, index) : undefined})), [route.level, index]);
  return <>
    <header className="rl-library-heading">
      <BookOpen size={24} aria-hidden="true"/><h1>Reading Lab</h1>
      <p>Read a short Chinese text, then explore the words, patterns, and ideas you want to keep.</p>
    </header>
    <nav className="rl-levels" aria-label="Reading level">
      {readingLabLevels.map(level => <button key={level} type="button" aria-pressed={level === route.level} onClick={() => onLevel(level)}>HSK {level}</button>)}
    </nav>
    <div className="rl-library-list">
      {material.map(({reading, report}) => <a className="rl-reading-card" key={reading.id}
        href={readingLabLocation({...route, article: reading.id, level: reading.level, paragraph: '', grammar: ''}, workspaceOrigin)}
        onClick={event => onArticle(event, reading)}>
        <span><small>{reading.topic}</small><strong lang="zh-Hans">{reading.title.hanzi}</strong><span>{reading.title.english}</span><LibraryCoverage reading={reading} report={report} failed={failed}/></span>
        <ArrowRight size={18} aria-hidden="true"/>
      </a>)}
      {!material.length && <p>No readings are available at this level.</p>}
    </div>
  </>;
}

function AtlasDetour({detour, level, penOnly, notify, onClose}: ReadingProps & {detour: ReadingLabAtlasVisit; level: ReadingLabRoute['level']; onClose: () => void}) {
  const {locale} = useI18n();
  const viewport = useRef<HTMLDialogElement>(null);
  const [pen, setPen] = useState(penOnly);
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const dialog = viewport.current;
    if (!dialog) return;
    dialog.showModal();
    setReady(true);
    return () => {if (dialog.open) dialog.close();};
  }, []);
  const {entry, kind, source} = detour;
  const glyphs = [...entry.text].filter(glyph => /\p{Script=Han}/u.test(glyph));
  const base = readAtlasWorkspaceRoute('?hsk=' + level + '&anchor=' + encodeURIComponent(glyphs[0] ?? '学'));
  const initial = {...base, ...workspaceExploration(entry.text, kind, locale, base)};
  return <dialog className="rl-atlas-dialog" ref={viewport} aria-label="Atlas exploration" onCancel={event => {event.preventDefault(); onClose();}}>
    <header className="rl-modal-header"><strong>Atlas exploration</strong><button type="button" onClick={onClose}><ArrowLeft size={16}/> Back to reading</button></header>
    {source && <details className="rl-detour-source"><summary>Source sentence</summary>
      <p lang="zh-Hans">{source.text}</p><p>{source.pinyin}</p><p>{source.meaning}</p>
    </details>}
    {ready && <AtlasWorkspace penOnly={pen} setPenOnly={setPen} notify={notify} embedded={{initial, viewport: viewport.current}}/>}
  </dialog>;
}

function StrokeDetour({text, penOnly, onClose}: {text: string; penOnly: boolean; onClose: () => void}) {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'watch' | 'trace'>('watch');
  const [replay, setReplay] = useState(0);
  const [complete, setComplete] = useState(false);
  const glyphs = [...text].filter(glyph => /\p{Script=Han}/u.test(glyph));
  if (!glyphs.length) return null;
  return <Modal label="Stroke practice" className="rl-stroke-dialog" onClose={onClose}>
    <p lang="zh-Hans" className="rl-stroke-word">{text}</p>
    <div className="rl-reading-actions">
      {glyphs.length > 1 && glyphs.map((glyph, i) => <button key={i} type="button" aria-pressed={index === i}
        onClick={() => {setIndex(i); setComplete(false);}} lang="zh-Hans">{glyph}</button>)}
      <button type="button" aria-pressed={mode === 'watch'} onClick={() => {setMode('watch'); setComplete(false);}}>Watch</button>
      <button type="button" aria-pressed={mode === 'trace'} onClick={() => {setMode('trace'); setComplete(false);}}>Trace</button>
      <button type="button" onClick={() => {setReplay(value => value + 1); setComplete(false);}}>Replay</button>
    </div>
    <div className="rl-stroke-canvas"><Guided character={glyphs[index]} mode={mode} penOnly={penOnly} replay={replay}
      onComplete={() => setComplete(true)} onMistake={() => undefined}/></div>
    {mode === 'trace' && complete && <p role="status">Character complete</p>}
  </Modal>;
}

export default function ReadingLab({penOnly, notify}: ReadingProps) {
  const lookup = useStudyLookup();
  const vocabulary = useVocabularyIndex();
  const [route, setRoute] = useState(() => readReadingLabRoute(location.search));
  const returnWorkspace = useRef(atlasWorkspaceReturn(new URLSearchParams(location.search).get('returnWorkspace')));
  const [drafts, setDrafts] = useState<WritingDraft>({});
  const [selectedWord, setSelectedWord] = useState('');
  const [questionEvidence, setQuestionEvidence] = useState('');
  const [detour, setDetour] = useState(currentDetour);
  const root = useRef<HTMLElement>(null);
  const selectedTrigger = useRef<HTMLElement | null>(null);
  const scrollDestination = useRef<number | string | null>((history.state as ReaderHistory | null)?.readingLabScroll ?? (route.paragraph || null));
  const reading = readingLabReadings.find(candidate => candidate.id === route.article);
  const grammar = reading?.grammar.find(entry => entry.id === route.grammar);
  const relatedFrame = resolveReadingGrammarFrame(grammar?.frameId);
  const highlights = useMemo(() => new Set([...(grammar?.sourceChunks ?? []), ...(questionEvidence ? [questionEvidence] : [])]), [grammar, questionEvidence]);

  useEffect(() => {
    const before = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    const pop = () => {
      if (!isReadingLabEntry(new URLSearchParams(location.search))) return;
      const next = readReadingLabRoute(location.search);
      const state = history.state as ReaderHistory | null;
      const restored = currentDetour();
      setDetour(restored);
      if (!restored) requestAnimationFrame(() => selectedTrigger.current?.focus({preventScroll: true}));
      scrollDestination.current = state?.readingLabScroll ?? (next.paragraph || 0);
      setRoute(next);
    };
    addEventListener('popstate', pop);
    return () => {
      removeEventListener('popstate', pop);
      history.scrollRestoration = before;
    };
  }, []);

  useLayoutEffect(() => {
    const destination = scrollDestination.current;
    if (destination === null) return;
    scrollDestination.current = null;
    const frame = requestAnimationFrame(() => {
      if (typeof destination === 'string') document.getElementById('rl-' + destination)?.scrollIntoView({block: 'start'});
      else window.scrollTo({top: destination, behavior: 'instant'});
    });
    return () => cancelAnimationFrame(frame);
  }, [route]);

  function navigate(patch: Partial<ReadingLabRoute>, options: {replace?: boolean; scroll?: number | string} = {}) {
    const next = {...route, ...patch};
    const destination = readingLabLocation(next, returnWorkspace.current);
    if (options.replace) history.replaceState(history.state, '', destination);
    else {
      history.replaceState({...history.state, readingLabScroll: window.scrollY}, '', location.href);
      history.pushState({...history.state, readingLabScroll: 0}, '', destination);
    }
    scrollDestination.current = options.scroll ?? null;
    setRoute(next);
  }

  function preservePosition() {
    history.replaceState({...history.state, readingLabScroll: window.scrollY}, '', location.href);
  }
  function beginDetour(next: ReaderDetour) {
    preservePosition();
    history.pushState({...history.state, readingLabDetour: next}, '', location.href);
    setDetour(next);
  }
  function closeDetour() {
    if (currentDetour()) history.back();
    else setDetour(undefined);
  }

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const openAtlas = (event: Event) => {
      const visit = (event as CustomEvent<ReadingLabAtlasVisit>).detail;
      if (!visit?.entry.text) return;
      beginDetour({kind: 'atlas', visit});
    };
    const openWriting = (event: Event) => {
      const text = (event as CustomEvent<string>).detail;
      if (!text || !/^\p{Script=Han}{1,12}$/u.test(text)) return;
      setSelectedWord(text); beginDetour({kind: 'stroke', text});
    };
    node.addEventListener(readingLabAtlasEvent, openAtlas);
    node.addEventListener(readingLabWriteEvent, openWriting);
    return () => {
      node.removeEventListener(readingLabAtlasEvent, openAtlas);
      node.removeEventListener(readingLabWriteEvent, openWriting);
    };
  }, []);

  function chooseWord(text: string, opener: HTMLButtonElement, paragraph: string) {
    setSelectedWord(text);
    selectedTrigger.current = opener;
    if (route.paragraph !== paragraph) navigate({paragraph}, {replace: true});
    preservePosition();
    lookup?.open(text, opener);
  }

  function showEvidence(paragraph: string, chunk: string) {
    setQuestionEvidence(chunk);
    navigate({paragraph}, {replace: true, scroll: chunk});
  }

  const workspace = returnWorkspace.current || defaultWorkspace;
  return <section ref={root} className="reading-lab" data-reading-lab aria-label="Reading Lab">
    <header className="rl-topline">
      {reading ? <button type="button" onClick={() => {
        setSelectedWord(''); setQuestionEvidence(''); navigate({article: '', paragraph: '', grammar: '', level: reading.level}, {scroll: 0});
      }}><ArrowLeft size={16}/> Reading library</button> : <a href={workspace}><ArrowLeft size={16}/> Hanzi Atlas</a>}
      {reading && <span>HSK {reading.level}</span>}
    </header>
    {reading ? <article className="rl-article">
      <header className="rl-article-heading">
        <p className="rl-topic">{reading.topic}</p>
        <h1 lang="zh-Hans">{reading.title.hanzi}</h1>
        {route.aid === 'pinyin' && <p className="rl-title-pinyin">{reading.title.pinyin}</p>}
        <p className="rl-title-translation">{reading.title.english}</p>
        <p className="rl-level-intent">{reading.levelIntent}</p>
      </header>
      <div className="rl-reader-controls">
        <div className="rl-modes" role="group" aria-label="Reading aid">{aids.map(aid =>
          <button type="button" key={aid.id} aria-pressed={route.aid === aid.id} onClick={() => navigate({aid: aid.id}, {replace: true})}>{aid.label}</button>)}</div>
        <label className="rl-chunk-switch"><input type="checkbox" checked={route.chunks} onChange={event => navigate({chunks: event.target.checked}, {replace: true})}/> Show chunks</label>
      </div>
      {route.aid !== 'hanzi' && <details className="rl-tone-legend">
        <summary>Tone guide</summary>
        <div>{Object.entries(toneMarks).map(([tone, mark], index) => <span key={tone} data-tone={tone}><b>{mark}</b> {neutralNames[index]}</span>)}</div>
        <p>{readingToneNote}</p>
      </details>}
      <div className="rl-page-grid">
        <div className="rl-text-panel">
          <div className="rl-text" data-aid={route.aid} data-chunks={route.chunks}>
            {reading.paragraphs.map((paragraph, index) =>
              <ReaderParagraph key={paragraph.id} paragraph={paragraph} index={index} route={route} highlights={highlights} onChoose={chooseWord}/>)}
          </div>
          <VocabularyDetails reading={reading} {...vocabulary}/>
        </div>
        <aside className="rl-side" aria-label="Reading context">
          <details open={!!grammar || undefined} className="rl-patterns">
            <summary>Grammar in this reading</summary>
            <div className="rl-pattern-list">{reading.grammar.map(pattern =>
              <button type="button" key={pattern.id} lang="zh-Hans" aria-pressed={grammar?.id === pattern.id} onClick={() => {
                const selected = pattern.id === grammar?.id ? undefined : pattern;
                const chunk = selected?.sourceChunks[0];
                const paragraph = reading.paragraphs.find(item => item.chunks.some(part => part.id === chunk));
                navigate({grammar: selected?.id ?? '', ...(paragraph ? {paragraph: paragraph.id} : {})}, {replace: true});
              }}>{pattern.pattern}</button>)}</div>
            {grammar && <div className="rl-pattern-note">
              <p>{grammar.note}</p>
              <button type="button" onClick={() => {
                const id = grammar.sourceChunks[0];
                const paragraph = reading.paragraphs.find(item => item.chunks.some(chunk => chunk.id === id));
                if (paragraph) showEvidence(paragraph.id, id);
              }}>Find in the text <ArrowRight size={15}/></button>
              <p className="rl-topic">Try the pattern with another idea</p>
              <p lang="zh-Hans">{grammar.example.hanzi}</p><p className="rl-example-pinyin">{grammar.example.pinyin}</p><p>{grammar.example.english}</p>
              {relatedFrame && <details className="rl-existing-frame"><summary>More from Speaking Chunks</summary>
                <p>{relatedFrame.explanation}</p>
                {relatedFrame.examples.map(example => <div key={example.hanzi} className="rl-frame-example">
                  <p lang="zh-Hans">{example.hanzi}</p><p className="rl-example-pinyin">{example.pinyin}</p><p>{example.english}</p>
                </div>)}
              </details>}
            </div>}
          </details>
          {selectedWord && <div className="rl-word-practice">
            <strong lang="zh-Hans">{selectedWord}</strong>
            <button type="button" onClick={event => {selectedTrigger.current = event.currentTarget; beginDetour({kind: 'stroke', text: selectedWord});}}><PenLine size={16}/> Stroke practice</button>
          </div>}
        </aside>
      </div>
      <section className="rl-followup">
        <h2>Check your understanding</h2>
        {reading.questions.map(question => <details key={question.id} className="rl-question">
          <summary>{question.question}</summary><p>{question.answer}</p>
          <button type="button" onClick={() => showEvidence(question.evidence.paragraphId, question.evidence.chunkId)}>Show evidence <ArrowRight size={15}/></button>
        </details>)}
      </section>
      <section className="rl-followup rl-transfer">
        <h2>Try writing</h2><p lang="zh-Hans">{reading.writing.prompt}</p><p>{reading.writing.english}</p>
        <ul>{reading.writing.requirements.map(requirement => <li key={requirement}>{requirement}</li>)}</ul>
        <label htmlFor="rl-writing">Your draft</label>
        <textarea id="rl-writing" lang="zh-Hans" rows={4} value={drafts[reading.id] ?? ''}
          onChange={event => setDrafts(previous => ({...previous, [reading.id]: event.target.value}))}/>
        {reading.writing.example && <details><summary>Read one possible response</summary>
          <p lang="zh-Hans">{reading.writing.example.hanzi}</p><p>{reading.writing.example.pinyin}</p><p>{reading.writing.example.english}</p>
        </details>}
      </section>
    </article> : <ReaderLibrary route={route} {...vocabulary} workspaceOrigin={returnWorkspace.current}
      onLevel={level => navigate({level, article: '', paragraph: '', grammar: ''}, {scroll: 0})}
      onArticle={(event, article) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        setSelectedWord(''); setQuestionEvidence('');
        navigate({article: article.id, level: article.level, paragraph: '', grammar: ''}, {scroll: 0});
      }}/>}
    {detour?.kind === 'atlas' && <AtlasDetour detour={detour.visit} level={reading?.level ?? route.level} penOnly={penOnly} notify={notify} onClose={closeDetour}/>}
    {detour?.kind === 'stroke' && <StrokeDetour text={detour.text} penOnly={penOnly} onClose={closeDetour}/>}
  </section>;
}
