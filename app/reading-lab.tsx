'use client';

import {GlobalHskSelect, useGlobalHsk} from './global-hsk';
import {globalHskLabel, knownHskInScope} from './global-hsk-model';
import {useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode} from 'react';
import {ArrowLeft, ArrowRight, BookOpen, PenLine} from 'lucide-react';
import {readingLabReadings} from './reading-lab-data';
import {resolveReadingGrammarFrame} from './reading-lab-grammar';
import type {ReadingLabParagraph, ReadingLabReading, ReadingLabToken} from './reading-lab-types';
import {analyzeReading, readingToneNote, splitReadingSentences, tokenGlyphs, toneMarks} from './reading-lab-model';
import {isReadingLabEntry, readReadingLabRoute, readingLabAtlasEvent, readingLabHref, readingLabWriteEvent, type ReadingAid, type ReadingLabAtlasVisit, type ReadingLabRoute} from './reading-lab-route';
import {atlasWorkspaceReturn, readAtlasWorkspaceRoute} from './atlas-workspace-route';
import {workspaceExploration} from './atlas-workspace-model';
import AtlasWorkspace from './atlas-workspace';
import {loadHskLevelResource} from './dictionary-client';
import {hskLevelIndex, type HskIndex} from './hsk-level-model';
import syllabus from '../data/hsk-levels-source.json';
import {useStudyLookup} from './study-lookup-context';
import {useI18n} from './i18n';
import {ReadingReview, ReadingReviewSave, ReadingReviewSummary, useReadingReviews} from './reading-lab-review';
import {findReadingReviewSource, readingReviewTargetId, readingReviewsInHskScope, resolveReadingReviewTarget} from './reading-lab-review-data';
import {readingReviewTokenEvent, type ReadingReviewTokenRequest} from './reading-lab-review-popup';
import type {ReadingReviewAction} from './reading-lab-review-model';
import {emptyReadingLabSession, persistReadingLabSession, readReadingLabSession, readingLabDraftLimit, type ReadingLabResume} from './reading-lab-session';
import Guided from './guided';
import ReadingLabNarrator from './reading-lab-narrator';
import ReadingLabOwnText from './reading-lab-own-text';
import {narrationFor} from './reading-lab-narrator-model';
import {useReadingLabNarrator} from './use-reading-lab-narrator';
import './reading-lab.css';

type ReadingProps = {penOnly: boolean; notify: (message: string) => void};
type ReaderDetour = {kind: 'atlas'; visit: ReadingLabAtlasVisit} | {kind: 'stroke'; text: string};
type ReaderHistory = {readingLabReviewSource?: string; readingLabReviewEntry?: string; readingLabScroll?: number; readingLabDetour?: ReaderDetour; readingLabFocus?: {paragraph: string; word: string}};
type VocabularyReport = ReturnType<typeof analyzeReading>;
type RecallCheck = {article: string; step: 'recall' | 'compare'; responses: Record<string, string>};

function readerHistory(): ReaderHistory {
  return history.state ?? {};
}

const aids: {id: ReadingAid; label: string}[] = [
  {id: 'hanzi', label: 'Hanzi'}, {id: 'tones', label: 'Tone marks'}, {id: 'pinyin', label: 'Pinyin'},
];
const neutralNames = ['High and level', 'Rising', 'Low / dipping', 'Falling', 'Neutral'];
const defaultWorkspace = '?atlas=1&workspace=1&anchor=学&hsk=2';

function readingLabLocation(route: ReadingLabRoute, workspaceOrigin?: string) {
  return readingLabHref(route) + (workspaceOrigin ? '&returnWorkspace=' + encodeURIComponent(workspaceOrigin) : '');
}

function currentDetour() {
  const detour = readerHistory().readingLabDetour;
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

function ReaderToken({token, tokenIndex, aid, onChoose}: {token: ReadingLabToken; tokenIndex: number; aid: ReadingAid; onChoose: (text: string, opener: HTMLButtonElement) => void}) {
  const headword = [...token.text].filter(glyph => /\p{Script=Han}/u.test(glyph)).join('');
  if (!headword) return <span className="rl-punctuation">{token.text}</span>;
  const glyphs = aid === 'hanzi' ? undefined : tokenGlyphs(token);
  const meaning = (token as ReadingLabToken & {meaning?: string}).meaning;
  return <button type="button" className="rl-word" lang="zh-Hans" data-reader-headword={headword} data-reader-review-index={tokenIndex}
    data-reader-meaning={meaning} data-reader-pinyin={token.pinyin.join('')} aria-label={aid === 'hanzi' ? headword : headword + ' · ' + token.pinyin.join(' ')}
    onClick={event => onChoose(headword, event.currentTarget)}>
    {glyphs ? glyphs.map((glyph, index) => glyph.tone
      ? <ruby key={index} data-tone={glyph.tone}>{glyph.text}<rt aria-hidden="true">{aid === 'tones' ? glyph.mark : glyph.pinyin}</rt></ruby>
      : <span key={index}>{glyph.text}</span>) : token.text}
  </button>;
}

function ReaderParagraph({paragraph, index, route, highlights, activeSentence, onChoose}: {
  paragraph: ReadingLabParagraph; index: number; route: ReadingLabRoute; highlights: ReadonlySet<string>; activeSentence?: string;
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
          const sentenceKey = source && paragraph.id + ':' + source.sentenceIndex;
          return <span key={tokenIndex} data-narration-cue={sentenceKey}
            data-narration-active={activeSentence !== undefined && sentenceKey === activeSentence || undefined}
            data-study-source-id={sentenceKey && route.article + ':' + sentenceKey}
            data-study-sentence={source?.sentence.hanzi} data-study-pinyin={source?.sentence.pinyin} data-study-meaning={source?.sentence.english}>
            <ReaderToken token={token} tokenIndex={tokenIndex} aid={route.aid} onChoose={(text, opener) => onChoose(text, opener, paragraph.id)}/>
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

function ReaderLibrary({route, index, failed, workspaceOrigin, resume, onResume, onLevel, onArticle}: {
  route: ReadingLabRoute; index?: HskIndex; failed: boolean;
  workspaceOrigin?: string; resume?: ReadingLabResume; onResume: () => void; onLevel: (level: ReadingLabRoute['level']) => void;
  onArticle: (event: MouseEvent<HTMLAnchorElement>, reading: ReadingLabReading) => void;
}) {
  const material = useMemo(() => readingLabReadings.filter(reading => knownHskInScope(reading.level, route.level))
    .map(reading => ({reading, report: index ? analyzeReading(reading, index) : undefined})), [route.level, index]);
  const resumable = readingLabReadings.find(reading => reading.id === resume?.article && knownHskInScope(reading.level, route.level));
  return <>
    <header className="rl-library-heading">
      <BookOpen size={24} aria-hidden="true"/><h1>Reading Lab</h1>
      <p>Read a short Chinese text, then explore the words, patterns, and ideas you want to keep.</p>
    </header>
    {resumable && <div className="rl-reading-actions rl-resume">
      <button type="button" onClick={onResume}>Resume <span lang="zh-Hans">{resumable.title.hanzi}</span><ArrowRight size={15}/></button>
    </div>}
    <nav className="rl-levels" aria-label="Reading level">
      <GlobalHskSelect label="Reading level" scope={route.level} setScope={onLevel}/>
    </nav>
    <div className="rl-library-list">
      {material.map(({reading, report}) => <a className="rl-reading-card" key={reading.id}
        href={readingLabLocation({...route, article: reading.id, paragraph: '', grammar: ''}, workspaceOrigin)}
        onClick={event => onArticle(event, reading)}>
        <span><small>{reading.topic}</small><strong lang="zh-Hans">{reading.title.hanzi}</strong><span>{reading.title.english}</span><LibraryCoverage reading={reading} report={report} failed={failed}/></span>
        <ArrowRight size={18} aria-hidden="true"/>
      </a>)}
      {!material.length && <p>No authored readings are available in the current HSK range.</p>}
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
  return <dialog className="rl-atlas-dialog" ref={viewport} aria-label="Atlas exploration" onCancel={event => {if(event.target!==event.currentTarget)return; event.preventDefault(); onClose();}}>
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

export default function ReadingLab({owner, penOnly, notify}: ReadingProps & {owner: string | null}) {
  const lookup = useStudyLookup();
  const reviews = useReadingReviews(owner);
  const unsavedSourceVisits = useRef(new Map<string, string>());
  const vocabulary = useVocabularyIndex();
  const global = useGlobalHsk();
  const [localRoute, setRoute] = useState(() => readReadingLabRoute(location.search));
  const route = useMemo(() => global && global.scope !== localRoute.level ? {...localRoute, level: global.scope} : localRoute,
    [localRoute, global?.scope]);
  const returnWorkspace = useRef(atlasWorkspaceReturn(new URLSearchParams(location.search).get('returnWorkspace')));
  const [loaded] = useState(() => {
    try {return {session: readReadingLabSession(localStorage, owner), unavailable: false};}
    catch {return {session: emptyReadingLabSession(), unavailable: true};}
  });
  const [drafts, setDrafts] = useState(loaded.session.drafts);
  const [resume, setResume] = useState(loaded.session.resume);
  const [saveUnavailable, setSaveUnavailable] = useState(loaded.unavailable);
  const [ownText, setOwnText] = useState(false);
  const [selectedWord, setSelectedWord] = useState(() => readerHistory().readingLabFocus?.word ?? '');
  const [recall, setRecall] = useState<RecallCheck>();
  const [questionEvidence, setQuestionEvidence] = useState<{article: string; chunk: string}>();
  const [detour, setDetour] = useState(currentDetour);
  const root = useRef<HTMLElement>(null);
  const selectedTrigger = useRef<HTMLElement | null>(null);
  const savedResume = loaded.session.resume;
  const sameResume = savedResume && readingLabHref(savedResume) === readingLabHref(route);
  const scrollDestination = useRef<number | string | null>(readerHistory().readingLabScroll
    ?? (sameResume ? savedResume.scroll : route.chunk || route.paragraph || null));
  const restoringFocus = useRef(false);
  const lastSaved = useRef('');
  const recallHeading = useRef<HTMLHeadingElement>(null);
  const recallStart = useRef<HTMLButtonElement>(null);
  const requestedReading = readingLabReadings.find(candidate => candidate.id === route.article);
  const outsideScope = requestedReading && !knownHskInScope(requestedReading.level, route.level);
  const reading = outsideScope ? undefined : requestedReading;
  const track = useMemo(() => narrationFor(reading), [reading]);
  const narrator = useReadingLabNarrator(route.review ? undefined : track);
  const activeSentence = narrator.snapshot.status !== 'idle' ? track?.cues[narrator.snapshot.index]?.key : undefined;

  useEffect(() => {
    if (!activeSentence || narrator.snapshot.status !== 'playing') return;
    const token = root.current?.querySelector<HTMLElement>('[data-narration-active=true]');
    const bounds = token?.getBoundingClientRect();
    if (bounds && (bounds.top < 80 || bounds.bottom > window.innerHeight - 30)) {
      token?.scrollIntoView({block: 'center', inline: 'nearest'});
    }
  }, [activeSentence, narrator.snapshot.status]);

  const grammar = reading?.grammar.find(entry => entry.id === route.grammar);
  const relatedFrame = resolveReadingGrammarFrame(grammar?.frameId);
  const highlights = useMemo(() => new Set([...(grammar?.sourceChunks ?? []), ...(questionEvidence?.article === route.article && questionEvidence?.chunk ? [questionEvidence.chunk] : []), ...(route.chunk ? [route.chunk] : [])]), [grammar, questionEvidence, route.article, route.chunk]);

  useEffect(() => {
    const before = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    const pop = () => {
      if (!isReadingLabEntry(new URLSearchParams(location.search))) return;
      const next = readReadingLabRoute(location.search);
      const state = readerHistory();
      const restored = currentDetour();
      setDetour(restored);
      restoringFocus.current = !restored;
      if (!state.readingLabFocus) selectedTrigger.current = null;
      setSelectedWord(state.readingLabFocus?.word ?? '');
      setRecall(current => current?.article === next.article ? current : undefined);
      setQuestionEvidence(current => current?.article === next.article ? current : undefined);
      scrollDestination.current = state.readingLabScroll ?? (next.chunk || next.paragraph || 0);
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
      if (restoringFocus.current) {
        restoringFocus.current = false;
        const {readingLabFocus: saved} = readerHistory();
        const candidates = root.current?.querySelectorAll<HTMLButtonElement>('[data-reader-headword]');
        const fallback = saved && Array.from(candidates ?? []).find(button =>
          button.dataset.readerHeadword === saved.word && button.closest<HTMLElement>('[data-reader-paragraph]')?.dataset.readerParagraph === saved.paragraph);
        const trigger = selectedTrigger.current?.isConnected ? selectedTrigger.current : fallback;
        trigger?.focus({preventScroll: true});
      }
      if (typeof destination === 'string') document.getElementById('rl-' + destination)?.scrollIntoView({block: 'start'});
      else window.scrollTo({top: destination, behavior: 'instant'});
    });
    return () => cancelAnimationFrame(frame);
  }, [route, detour]);

  function saveResume(next: ReadingLabRoute, scroll: number) {
    if (!next.article || next.review) return;
    const {reviewReturn, chunk, ...savedRoute} = next;
    const snapshot = {...savedRoute, scroll: Math.max(0, Math.round(scroll))};
    const signature = JSON.stringify(snapshot);
    if (signature === lastSaved.current) return;
    try {
      const saved = persistReadingLabSession(localStorage, owner, {resume: snapshot});
      lastSaved.current = signature;
      setResume(saved.resume);
    } catch {
      setSaveUnavailable(true);
    }
  }

  function saveDraft(article: string, text: string) {
    setDrafts(previous => ({...previous, [article]: text}));
    try {
      persistReadingLabSession(localStorage, owner, {draft: {article, text}});
      setSaveUnavailable(false);
    } catch {
      setSaveUnavailable(true);
    }
  }

  useEffect(() => {
    if (!reading || route.review || detour || recall?.step === 'recall') return;
    let timer = 0;
    const flush = () => saveResume(route, window.scrollY);
    const scrolling = () => {
      clearTimeout(timer);
      timer = window.setTimeout(flush, 160);
    };
    scrolling();
    window.addEventListener('scroll', scrolling, {passive: true});
    window.addEventListener('pagehide', flush);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', scrolling);
      window.removeEventListener('pagehide', flush);
    };
  }, [route, reading, detour, recall?.step]);

  function navigate(patch: Partial<ReadingLabRoute>, options: {replace?: boolean; scroll?: number | string} = {}) {
    const next = {...route, ...patch};
    const destination = readingLabLocation(next, returnWorkspace.current);
    if (options.replace) history.replaceState({...history.state, readingLabScroll: undefined}, '', destination);
    else {
      saveResume(route, window.scrollY);
      history.replaceState({...history.state, readingLabScroll: window.scrollY}, '', location.href);
      history.pushState({...history.state, readingLabScroll: typeof options.scroll === 'number' ? options.scroll : 0, readingLabFocus: undefined, readingLabDetour: undefined}, '', destination);
    }
    scrollDestination.current = options.scroll ?? null;
    setRoute(next);
  }

  function preservePosition(focus?: ReaderHistory['readingLabFocus']) {
    history.replaceState({...history.state, readingLabScroll: window.scrollY, ...(focus ? {readingLabFocus: focus} : {})}, '', location.href);
  }
  function beginDetour(next: ReaderDetour) {
    narrator.pause();
    saveResume(route, window.scrollY);
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
  }, [route]);

  useLayoutEffect(() => {
    const node = root.current;
    if (!node || !route.article || route.review) return;
    const reviewToken = (event: Event) => {
      const opener = event.target;
      if (!(opener instanceof HTMLElement) || opener.closest('[data-reading-lab]') !== node) return;
      const chunk = opener.closest<HTMLElement>('[data-reader-chunk]')?.dataset.readerChunk;
      const index = opener.dataset.readerReviewIndex;
      const request = (event as CustomEvent<ReadingReviewTokenRequest>).detail;
      if (!chunk || index === undefined || !/^\d+$/.test(index) || !request?.reply) return;
      const pin = findReadingReviewSource(route.article, chunk, Number(index));
      if (!pin || pin.hanzi !== opener.dataset.readerHeadword) return;
      const id = readingReviewTargetId(pin, reviews.store.cards);
      try {
        const store = request.save ? reviews.write(id, {type: 'save', target: pin}) : reviews.store;
        const card = store.cards[readingReviewTargetId(pin, store.cards)];
        request.reply({pinyin: pin.pinyin.join(''), dueAt: card?.dueAt, error: reviews.unavailable && !request.save});
      } catch {request.reply({pinyin: pin.pinyin.join(''), error: true});}
    };
    node.addEventListener(readingReviewTokenEvent, reviewToken);
    return () => node.removeEventListener(readingReviewTokenEvent, reviewToken);
  }, [route.article, route.review, reviews.store, reviews.unavailable]);

  function chooseWord(text: string, opener: HTMLButtonElement, paragraph: string) {
    narrator.pause();
    setSelectedWord(text);
    selectedTrigger.current = opener;
    if (route.paragraph !== paragraph) navigate({paragraph}, {replace: true});
    preservePosition({paragraph, word: text});
    lookup?.open(text, opener);
  }

  function showEvidence(paragraph: string, chunk: string) {
    setQuestionEvidence({article: route.article, chunk});
    navigate({paragraph}, {replace: true, scroll: chunk});
  }

  function reviewOpen(id: string) {
    if (!reviews.store.cards[id]) return;
    navigate({review: id, reviewReturn: undefined}, {scroll: 0});
    history.replaceState({...history.state, readingLabReviewEntry: id}, '', location.href);
  }

  function reviewExit() {
    if (readerHistory().readingLabReviewEntry === route.review) history.back();
    else navigate({review: undefined}, {replace: true, scroll: route.chunk || route.paragraph || 0});
  }

  function reviewSource(id: string) {
    const target = resolveReadingReviewTarget(id, reviews.store.cards[id]);
    if (!target) return;
    navigate({review: undefined, reviewReturn: id, article: target.article,
      grammar: route.article === target.article ? route.grammar : '', paragraph: target.paragraph, chunk: target.chunk}, {scroll: target.chunk});
    history.replaceState({...history.state, readingLabReviewSource: id, readingLabScroll: undefined}, '', location.href);
  }

  useLayoutEffect(() => {
    if (!route.article || route.review) return;
    for (const [id, card] of Object.entries(reviews.store.cards)) {
      if (card.pending && !card.pending.sourceSeen && resolveReadingReviewTarget(id, card)?.article === route.article) {
        unsavedSourceVisits.current.set(id, card.pending.id);
        try {
          reviews.write(id, {type: 'source', attempt: card.pending.id});
          unsavedSourceVisits.current.delete(id);
        } catch { /* Keep the flag to retry before any later completion. */ }
      }
    }
  }, [route.article, route.review, reviews.store]);

  function writeReview(id: string, action: ReadingReviewAction) {
    const seen = unsavedSourceVisits.current.get(id);
    if (seen) {
      if (reviews.store.cards[id]?.pending?.id === seen) reviews.write(id, {type: 'source', attempt: seen});
      unsavedSourceVisits.current.delete(id);
    }
    return reviews.write(id, action);
  }

  const scopedReviewStore = readingReviewsInHskScope(reviews.store, route.level);
  const scopedReview = route.review ? resolveReadingReviewTarget(route.review, reviews.store.cards[route.review]) : undefined;
  if (scopedReview && !knownHskInScope(scopedReview.level, route.level)) return <section className="reading-lab">
    <div role="status" className="hsk-outside panel">
      <p>This saved reading review is HSK {scopedReview.level}, outside the current range.</p>
      <button className="secondary" onClick={() => global ? global.setScope(scopedReview.level) : navigate({level: scopedReview.level})}>
        Use {globalHskLabel(scopedReview.level)}
      </button>
      <button className="secondary" onClick={reviewExit}>Back to Reading Lab</button>
    </div>
  </section>;
  if (route.review) return <section ref={root} className="reading-lab" aria-label="Reading Lab">
    <ReadingReview key={route.review} id={route.review} reviews={{...reviews, write: writeReview}} onExit={reviewExit} onSource={reviewSource}/>
  </section>;

  const workspace = returnWorkspace.current || defaultWorkspace;
  return <section ref={root} className="reading-lab" data-reading-lab aria-label="Reading Lab">
    <header className="rl-topline">
      {reading ? <button type="button" onClick={() => {
        setSelectedWord(''); setQuestionEvidence(undefined); setRecall(undefined); navigate({article: '', paragraph: '', grammar: '', chunk: undefined, reviewReturn: undefined}, {scroll: 0});
      }}><ArrowLeft size={16}/> Reading library</button> : <a href={workspace}><ArrowLeft size={16}/> Hanzi Atlas</a>}
      {route.reviewReturn && <button type="button" onClick={() => {
        if (readerHistory().readingLabReviewSource === route.reviewReturn) history.back();
        else reviewOpen(route.reviewReturn!);
      }}>Back to review</button>}
      <button type="button" onClick={() => {narrator.pause(); setOwnText(true);}}>Your text</button>
      {reading && <span>HSK {reading.level}</span>}
    </header>
    {outsideScope && <div role="status" className="hsk-outside panel">
      <p><span lang="zh-Hans">{requestedReading.title.hanzi}</span> is HSK {requestedReading.level}, outside the current range.</p>
      <button className="secondary" onClick={() => global ? global.setScope(requestedReading.level) : navigate({level: requestedReading.level})}>
        Use {globalHskLabel(requestedReading.level)}
      </button>
    </div>}
    {reading ? <article className="rl-article">
      <header className="rl-article-heading">
        <p className="rl-topic">{reading.topic}</p>
        <h1 lang="zh-Hans">{reading.title.hanzi}</h1>
        {route.aid === 'pinyin' && <p className="rl-title-pinyin">{reading.title.pinyin}</p>}
        <p className="rl-title-translation">{reading.title.english}</p>
        <p className="rl-level-intent">{reading.levelIntent}</p>
      </header>
      <div className="rl-reader-controls" hidden={recall?.step === 'recall'}>
        <div className="rl-modes" role="group" aria-label="Reading aid">{aids.map(aid =>
          <button type="button" key={aid.id} aria-pressed={route.aid === aid.id} onClick={() => navigate({aid: aid.id}, {replace: true})}>{aid.label}</button>)}</div>
        <label className="rl-chunk-switch"><input type="checkbox" checked={route.chunks} onChange={event => navigate({chunks: event.target.checked}, {replace: true})}/> Show chunks</label>
      </div>
      <ReadingLabNarrator track={track} player={narrator} hidden={recall?.step === 'recall'}/>
      {route.aid !== 'hanzi' && recall?.step !== 'recall' && <details className="rl-tone-legend">
        <summary>Tone guide</summary>
        <div>{Object.entries(toneMarks).map(([tone, mark], index) => <span key={tone} data-tone={tone}><b>{mark}</b> {neutralNames[index]}</span>)}</div>
        <p>{readingToneNote}</p>
      </details>}
      <div className="rl-page-grid" hidden={recall?.step === 'recall'}>
        <div className="rl-text-panel">
          <div className="rl-text" data-aid={route.aid} data-chunks={route.chunks}>
            {reading.paragraphs.map((paragraph, index) =>
              <ReaderParagraph key={paragraph.id} paragraph={paragraph} index={index} route={route} highlights={highlights} activeSentence={activeSentence} onChoose={chooseWord}/>)}
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
      {recall?.step !== 'recall' && <ReadingReviewSave key={reading.id} article={reading.id} reviews={reviews} onOpen={reviewOpen}/>}
      <section className="rl-followup" aria-labelledby="rl-recall-heading" data-study-assessment={recall?.step === 'recall' ? 'blocked' : undefined}>
        <h2 id="rl-recall-heading" ref={recallHeading} tabIndex={-1}>Check your understanding</h2>
        {!recall ? <>
          <p>Try answering from memory, or open the sample answers with the text beside you.</p>
          <div className="rl-reading-actions">
            <button type="button" ref={recallStart} onClick={() => {
              saveResume(route, window.scrollY);
              narrator.pause();
              setRecall({article: reading.id, step: 'recall', responses: {}});
              requestAnimationFrame(() => recallHeading.current?.focus());
            }}>Recall with the text hidden</button>
            <button type="button" onClick={() => setRecall({article: reading.id, step: 'compare', responses: {}})}>Open sample answers</button>
          </div>
        </> : <>
          <p>{recall.step === 'recall' ? 'Answer to yourself or jot down a few words.' : 'Compare with the sample and find the passage that supports it.'} This check is for you.</p>
          {reading.questions.map(question => <div key={question.id} className="rl-question">
            <label lang="zh-Hans" htmlFor={'rl-answer-' + question.id}>{question.question}</label>
            {recall.step === 'recall' ? <textarea id={'rl-answer-' + question.id} rows={2} maxLength={1500}
              value={recall.responses[question.id] ?? ''}
              onChange={event => setRecall({...recall, responses: {...recall.responses, [question.id]: event.target.value}})}/> : <>
              {recall.responses[question.id] && <p>Your answer <span lang="zh-Hans">{recall.responses[question.id]}</span></p>}
              <p lang="zh-Hans">{question.answer}</p>
              <button type="button" onClick={() => showEvidence(question.evidence.paragraphId, question.evidence.chunkId)}>Show evidence <ArrowRight size={15}/></button>
            </>}
          </div>)}
          <div className="rl-reading-actions">
            {recall.step === 'recall' && <button type="button" onClick={() => {
              setRecall({...recall, step: 'compare'});
              requestAnimationFrame(() => recallHeading.current?.focus());
            }}>Reveal sample answers</button>}
            <button type="button" onClick={() => {
              setRecall(undefined);
              setQuestionEvidence(undefined);
              requestAnimationFrame(() => recallStart.current?.focus());
            }}>{recall.step === 'recall' ? 'Return to the text' : 'Close check'}</button>
          </div>
        </>}
      </section>
      <section className="rl-followup rl-transfer" hidden={recall?.step === 'recall'}>
        <h2>Try writing</h2><p lang="zh-Hans">{reading.writing.prompt}</p><p>{reading.writing.english}</p>
        <ul>{reading.writing.requirements.map(requirement => <li key={requirement}>{requirement}</li>)}</ul>
        <label htmlFor="rl-writing">Your draft</label>
        <textarea id="rl-writing" lang="zh-Hans" rows={4} maxLength={readingLabDraftLimit} value={drafts[reading.id] ?? ''}
          onChange={event => saveDraft(reading.id, event.target.value)}/>
        <p role="status">{saveUnavailable ? 'Could not save to this browser. Copy your draft before leaving.' : drafts[reading.id] ? 'Draft saved on this browser.' : 'Your draft stays in this browser.'}</p>
        {reading.writing.example && <details><summary>Read one possible response</summary>
          <p lang="zh-Hans">{reading.writing.example.hanzi}</p><p>{reading.writing.example.pinyin}</p><p>{reading.writing.example.english}</p>
        </details>}
      </section>
    </article> : <><ReadingReviewSummary store={scopedReviewStore} now={reviews.now} onOpen={reviewOpen}/><ReaderLibrary route={route} {...vocabulary} workspaceOrigin={returnWorkspace.current} resume={resume}
      onResume={() => {
        if (!resume) return;
        const {scroll, ...destination} = resume;
        setSelectedWord(''); setQuestionEvidence(undefined); setRecall(undefined);
        navigate({...destination, chunk: undefined, reviewReturn: undefined}, {scroll: scroll || destination.paragraph});
      }}
      onLevel={global?.setScope ?? (level => navigate({level, article: '', paragraph: '', grammar: ''}, {scroll: 0}))}
      onArticle={(event, article) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        setSelectedWord(''); setQuestionEvidence(undefined); setRecall(undefined);
        navigate({article: article.id, paragraph: '', grammar: '', chunk: undefined, reviewReturn: undefined}, {scroll: 0});
      }}/></>}
    {ownText && <Modal className="rl-own-dialog" label="Your text" onClose={() => setOwnText(false)}><ReadingLabOwnText/></Modal>}
    {detour?.kind === 'atlas' && <AtlasDetour detour={detour.visit} level={reading?.level ?? route.level} penOnly={penOnly} notify={notify} onClose={closeDetour}/>}
    {detour?.kind === 'stroke' && <StrokeDetour text={detour.text} penOnly={penOnly} onClose={closeDetour}/>}
  </section>;
}
