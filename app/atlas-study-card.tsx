'use client';

import PreparedSentenceListen from './prepared-sentence-listen';
import {atlasStudyRecordings} from './atlas-study-audio';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, Columns2, Search, Volume2 } from 'lucide-react';
import {
  loadStudyCard,
  loadStudyIndex,
  type StudyCard,
  type StudyExample,
  type StudyIndexEntry,
  type StudyTerm,
  type StudyWord,
} from './atlas-study-model';
import { hasRecognitionStudyCard } from './hsk-exam-model';
import { normalizedPinyin, untonedPinyin } from './pinyin-practice-model';
import './atlas-study-card.css';

const sections = [
  ['words', 'Słowa i zwroty'],
  ['family', 'Rodzina'],
  ['compare', 'Łatwo pomylić'],
  ['usage', 'W użyciu'],
  ['story', 'Historyjka'],
] as const;

const wordFilters = [
  ['all', 'Wszystkie'],
  ['beginner', 'HSK 1–3'],
  ['advanced', 'Dalsze HSK'],
  ['unlisted', 'Poza wykazem'],
] as const;

const recognitionLevels = ['1', '2', '3'];
const familyPositions: Readonly<Record<string, string>> = {
  left: 'po lewej', right: 'po prawej', middle: 'w środku', top: 'u góry', bottom: 'na dole',
  around: 'wokół innej części', inside: 'wewnątrz innej części', overlapping: 'nakłada się na inną część',
};

type Section = typeof sections[number][0];
type WordFilter = typeof wordFilters[number][0];

type AtlasStudyCardProps = {
  hanzi: string;
  onNavigate: (hanzi: string) => void;
  onClose: () => void;
  onTrial?: (hanzi: string) => void;
  returnLabel?: string;
};

function formatLevel(level: string) {
  return 'HSK ' + level.replace('-', '–');
}

function levelText(levels: string[]) {
  return levels.length ? levels.map(formatLevel).join(' · ') : 'poza wykazem';
}

function matchesWordFilter(term: StudyTerm, filter: WordFilter) {
  switch (filter) {
    case 'all': return true;
    case 'beginner': return term.levels.some(level => recognitionLevels.includes(level));
    case 'advanced': return term.levels.some(level => !recognitionLevels.includes(level));
    case 'unlisted': return term.levels.length === 0;
  }
}

function studyTermKey(term: StudyTerm) {
  return term.hanzi + '|' + term.pinyin;
}

function MarkHanzi({ text, hanzi }: { text: string; hanzi: string }) {
  return text.split(hanzi).map((part, index) => <span key={index}>
    {index > 0 && <span className="asc-mark">{hanzi}</span>}{part}
  </span>);
}

function TermReading({ term, className }: { term: StudyTerm; className?: string }) {
  if (term.pinyin) return <span className={className} lang="zh-Latn">{term.pinyin}</span>;
  if (term.namePinyin) return <span className={className}>nazwa · <span lang="zh-Latn">{term.namePinyin}</span></span>;
  return <span className={className}>forma graficzna</span>;
}

function TermContents({ term, highlight, kind, showWordScope }: {
  term: StudyTerm;
  highlight?: string;
  kind?: 'word' | 'character';
  showWordScope?: boolean;
}) {
  return <>
    <span className="asc-glyph" lang="zh-Hans">
      {highlight ? <MarkHanzi text={term.hanzi} hanzi={highlight} /> : term.hanzi}
    </span>
    <TermReading term={term} className="asc-pinyin" />
    {term.english && <span className="asc-english" lang="en">{term.english}</span>}
    {kind && <span className={
      'asc-level' + (!term.levels.length ? '' : matchesWordFilter(term, 'beginner') ? ' asc-level-core' : ' asc-level-later')
    }>
      {levelText(term.levels)}{term.levels.length > 0 && (kind === 'character' ? ' · znak' : showWordScope ? ' · słowo' : '')}
    </span>}
  </>;
}

function StudyListen({ term, className }: {
  term: Pick<StudyTerm, 'hanzi' | 'pinyin' | 'namePinyin'> & {recordingPinyin?: string};
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const optionsId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const controls = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = controls.current;
    if (!open || !root) return;
    const doc = root.ownerDocument;
    function closeOutside(event: PointerEvent) {
      if (!root?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      event.preventDefault();
      setOpen(false);
      toggle.current?.focus();
    }
    doc.addEventListener('pointerdown', closeOutside, true);
    doc.addEventListener('keydown', closeOnEscape, true);
    return () => {
      doc.removeEventListener('pointerdown', closeOutside, true);
      doc.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [open]);
  const pinyin = term.recordingPinyin || term.pinyin || term.namePinyin;
  if (!pinyin) return null;
  const clips = atlasStudyRecordings(term.hanzi, pinyin);
  const alternate = clips.length > 1;
  const playLabel = (clip: (typeof clips)[number]) =>
    clip.context ? `${term.hanzi} · ${clip.pinyin} — ${clip.context} ${clip.contextPinyin}`
      : alternate ? `${term.hanzi} · ${clip.pinyin}` : term.hanzi;
  return <span className={'asc-listen' + (className ? ' ' + className : '')} ref={controls}
    onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
    {alternate ? <>
      <button type="button" className="secondary prepared-listen-icon" ref={toggle} aria-expanded={open}
        aria-controls={optionsId} aria-label={'Wymowa: ' + term.hanzi}
        onClick={() => setOpen(!open)}>
        <Volume2 size={16} aria-hidden="true" /><ChevronDown size={11} aria-hidden="true" />
      </button>
      <span className="asc-reading-options" id={optionsId} hidden={!open}>
        {clips.map(clip => <PreparedSentenceListen key={clip.pinyin} text={playLabel(clip)} source={clip.source}
          label={clip.context ? `${clip.pinyin} · ${clip.context} (${clip.contextPinyin})` : clip.pinyin} />)}
      </span>
    </> : clips[0]
      ? <PreparedSentenceListen key={clips[0].source} text={playLabel(clips[0])} source={clips[0].source} label="Odsłuchaj" iconOnly />
      : <button type="button" className="secondary prepared-listen-icon" disabled
          aria-label={'Brak nagrania: ' + term.hanzi} title={'Brak nagrania: ' + term.hanzi}>
          <Volume2 size={16} aria-hidden="true" />
        </button>}
  </span>;
}

function StudyTile({ term, highlight, kind, showWordScope, token = false, onSelect, pressed, current }: {
  term: StudyTerm;
  highlight?: string;
  kind?: 'word' | 'character';
  showWordScope?: boolean;
  token?: boolean;
  onSelect?: () => void;
  pressed?: boolean;
  current?: boolean;
}) {
  const content = <TermContents term={term} highlight={highlight} kind={kind} showWordScope={showWordScope} />;
  const classes = 'asc-term' + (token ? ' asc-token' : '');
  const wide = kind === 'word' && !!onSelect && Array.from(term.hanzi).length >= 4;
  return <div className={'asc-playable-tile' + (wide ? ' asc-term-wide' : '')}>
    {onSelect
      ? <button type="button" className={classes} aria-pressed={pressed} aria-current={current ? 'true' : undefined} onClick={onSelect}>{content}</button>
      : <div className={classes}>{content}</div>}
    <StudyListen term={term} className="asc-tile-listen" />
  </div>;
}

function SentenceContents({ example, hanzi }: { example: StudyExample; hanzi: string }) {
  return <>
    <span className="asc-sentence-hanzi" lang="zh-Hans"><MarkHanzi text={example.hanzi} hanzi={hanzi} /></span>
    <span className="asc-sentence-reading" lang="zh-Latn">{example.pinyin}</span>
    <span className="asc-sentence-meaning" lang="en">{example.english}</span>
  </>;
}

function ExampleWords({ example }: { example: StudyExample }) {
  if (!example.words?.length) return null;
  return <div className="asc-terms asc-example-tokens" role="group" aria-label="Słownictwo w zdaniu">
    {example.words.map(term => <StudyTile term={term} kind="word" token key={studyTermKey(term)} />)}
  </div>;
}

export default function AtlasStudyCard({ hanzi, onNavigate, onClose, onTrial, returnLabel = 'Atlas' }: AtlasStudyCardProps) {
  const label = useId();
  const pickerId = useId();
  const pickerButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusAfterChange = useRef<string | null>(null);
  const [section, setSection] = useState<Section>('words');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ hanzi: string; attempt: number; card?: StudyCard; error?: boolean }>();
  const current = result?.hanzi === hanzi && result.attempt === attempt ? result : undefined;
  const card = current?.card;

  useEffect(() => {
    let ignore = false;
    loadStudyCard(hanzi).then(
      loaded => { if (!ignore) setResult({ hanzi, attempt, card: loaded }); },
      () => { if (!ignore) setResult({ hanzi, attempt, error: true }); },
    );
    return () => { ignore = true; };
  }, [hanzi, attempt]);

  useEffect(() => {
    if (current && focusAfterChange.current === hanzi) {
      focusAfterChange.current = null;
      heading.current?.focus();
    }
  }, [current, hanzi]);

  function navigate(next: string, fromPicker = false) {
    setPickerOpen(false);
    if (hanzi === next) {
      pickerButton.current?.focus();
      return;
    }
    if (fromPicker) setSection('words');
    focusAfterChange.current = next;
    onNavigate(next);
  }

  function switchTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % sections.length; break;
      case 'ArrowLeft': next = (index + sections.length - 1) % sections.length; break;
      case 'Home': next = 0; break;
      case 'End': next = sections.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setSection(sections[next][0]);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
  }

  return <article className="atlas-study-card" lang="pl" aria-labelledby={label} data-study-hanzi={hanzi}>
    <header className="asc-mast">
      <h2 className="asc-signature" id={label} ref={heading} tabIndex={-1}>
        <span className="asc-seal" lang="zh-Hans">{hanzi}</span>
        {card && <span className="asc-headword">
          <span className="asc-reading" lang="zh-Latn">{card.entry.pinyin}</span>
          <span className="asc-translation" lang="en">{card.entry.english}</span>
        </span>}
      </h2>
      {card && <StudyListen term={card.entry} />}
      {card && <div className="asc-scope"><strong>{levelText(card.entry.levels)}</strong><span>znak</span></div>}
      <div className="asc-actions">
        {onTrial && <button type="button" className="asc-control" onClick={() => onTrial(hanzi)}>
          <Columns2 size={16} aria-hidden="true" /> Porównaj lekcje
        </button>}
        <button type="button" className="asc-control" ref={pickerButton}
          aria-expanded={pickerOpen} aria-controls={pickerId} onClick={() => setPickerOpen(!pickerOpen)}>
          <BookOpen size={16} aria-hidden="true" /> Znaki <ChevronDown className="asc-chevron" size={14} aria-hidden="true" />
        </button>
        <button type="button" className="asc-control" onClick={onClose}>
          <ArrowLeft size={16} aria-hidden="true" /> {returnLabel}
        </button>
      </div>
    </header>
    <div id={pickerId} hidden={!pickerOpen}>
      {pickerOpen && <CharacterPicker hanzi={hanzi} onSelect={next => navigate(next, true)}
        onDismiss={() => { setPickerOpen(false); pickerButton.current?.focus(); }} />}
    </div>
    {!current && <p className="asc-message" role="status">Wczytywanie karty…</p>}
    {current?.error && <div className="asc-message">
      <p role="alert">Nie udało się wczytać karty.</p>
      <button className="asc-control" type="button" onClick={() => setAttempt(attempt + 1)}>Spróbuj ponownie</button>
    </div>}
    {current && !current.error && !card && <p className="asc-message" role="status">Ten znak nie ma karty w zakresie HSK 1–3.</p>}
    {card && <>
      <div className="asc-sections" role="tablist" aria-label="Sekcje karty">
        {sections.map(([key, name], index) => <button key={key} id={label + '-' + key + '-tab'} type="button" role="tab"
          aria-selected={section === key} tabIndex={section === key ? 0 : -1}
          aria-controls={label + '-' + key} onClick={() => setSection(key)} onKeyDown={event => switchTab(event, index)}>
          {name}{key === 'family' && card.families.length === 1 && <> <span lang="zh-Hans">{card.families[0].part.hanzi}</span></>}
        </button>)}
      </div>
      {sections.map(([key]) => <section className="asc-content" key={key} id={label + '-' + key} role="tabpanel"
        aria-labelledby={label + '-' + key + '-tab'} hidden={section !== key} tabIndex={section === key ? 0 : -1}>
        <div key={hanzi}>
          {key === 'words' && <WordsPane card={card} />}
          {key === 'family' && <FamilyPane card={card} onNavigate={navigate} />}
          {key === 'compare' && <ComparePane card={card} onNavigate={navigate} />}
          {key === 'usage' && <UsagePane card={card} />}
          {key === 'story' && <StoryPane card={card} />}
        </div>
      </section>)}
    </>}
  </article>;
}

function CharacterPicker({ hanzi, onSelect, onDismiss }: {
  hanzi: string;
  onSelect: (hanzi: string) => void;
  onDismiss: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<StudyIndexEntry[]>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const search = query.trim().toLowerCase();
  const reading = untonedPinyin(search.replace(/u:/g, 'ü'));
  const groups = recognitionLevels.filter(level => !levelFilter || levelFilter === level).map(level => ({
    level,
    results: (entries ?? []).filter(entry => entry.levels.includes(level) && (
      !search || entry.hanzi.includes(search) || entry.english.toLowerCase().includes(search) ||
      (!!reading && untonedPinyin(entry.pinyin).includes(reading))
    )),
  }));
  const matches = groups.flatMap(group => group.results);

  useEffect(() => { input.current?.focus(); }, []);

  useEffect(() => {
    let ignore = false;
    loadStudyIndex().then(
      loaded => { if (!ignore) setEntries(loaded); },
      () => { if (!ignore) setError(true); },
    );
    return () => { ignore = true; };
  }, [attempt]);

  return <div className="asc-picker" onKeyDown={event => {
    if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.stopPropagation();
      onDismiss();
    }
  }}>
    <form className="asc-picker-top" role="search" aria-label="Szukaj znaku" onSubmit={event => {
      event.preventDefault();
      const exactReading = normalizedPinyin(search);
      const match = matches.find(entry => entry.hanzi === search)
        ?? matches.find(entry => entry.pinyin.split(' / ').some(value => normalizedPinyin(value) === exactReading))
        ?? matches.find(entry => entry.english.toLowerCase() === search)
        ?? matches[0];
      if (match) onSelect(match.hanzi);
    }}>
      <label className="asc-search"><Search size={16} aria-hidden="true" />
        <input ref={input} type="search" enterKeyHint="search" value={query} onChange={event => setQuery(event.target.value)}
          aria-label="Hanzi, pinyin lub znaczenie po angielsku" placeholder="Hanzi, pinyin, English" />
      </label>
      <span className="asc-index-scope">{entries && (entries.length === 1 ? '1 znak' : entries.length + ' znaków') + ' · '}HSK 1–3</span>
    </form>
    {error && <div className="asc-picker-status">
      <p role="alert">Nie udało się wczytać listy znaków.</p>
      <button type="button" className="asc-control" onClick={() => { setError(false); setAttempt(attempt + 1); }}>Spróbuj ponownie</button>
    </div>}
    {!entries && !error && <p className="asc-picker-status" role="status">Wczytywanie znaków…</p>}
    {entries && <>
      <div className="asc-filter" role="group" aria-label="Poziom znaku">
        <button type="button" aria-pressed={!levelFilter} onClick={() => setLevelFilter('')}>Wszystkie</button>
        {recognitionLevels.map(level => <button type="button" key={level} aria-pressed={levelFilter === level}
          onClick={() => setLevelFilter(level)}>{formatLevel(level)}</button>)}
        <span className="asc-picker-count" role="status">{search || levelFilter ? 'Wyniki: ' + matches.length : ''}</span>
      </div>
      {!matches.length && <p className="asc-picker-status">Brak pasujących znaków.</p>}
      {!!matches.length && <div className="asc-index">
        {groups.filter(group => group.results.length).map(({ level, results }) => <section key={level} aria-label={formatLevel(level)}>
          <h3>{formatLevel(level)}</h3>
          <div className="asc-index-grid">
            {results.map(entry => <StudyTile term={entry} key={entry.hanzi} current={entry.hanzi === hanzi ? true : undefined}
              onSelect={() => onSelect(entry.hanzi)} />)}
          </div>
        </section>)}
      </div>}
    </>}
  </div>;
}

function WordsPane({ card }: { card: StudyCard }) {
  const hanzi = card.entry.hanzi;
  const [filter, setFilter] = useState<WordFilter>('all');
  const [selection, setSelection] = useState<StudyWord | undefined>(() => card.words.find(word => word.example && word.hanzi !== hanzi) ?? card.words[0]);
  const words = card.words.filter(word => matchesWordFilter(word, filter));
  const active = selection && words.includes(selection) ? selection : words[0];

  if (!card.words.length) return <p className="asc-muted">Brak haseł ze znakiem <span lang="zh-Hans">{hanzi}</span> w tej karcie.</p>;
  return <>
    <div className="asc-filter" role="group" aria-label="Poziom słowa">
      {wordFilters.map(([key, label]) => {
        const count = card.words.filter(word => matchesWordFilter(word, key)).length;
        return <button type="button" key={key} aria-pressed={filter === key} disabled={!count} onClick={() => {
          setFilter(key);
          if (selection && !matchesWordFilter(selection, key)) setSelection(card.words.find(word => matchesWordFilter(word, key)));
        }}>{label} <span className="asc-count">· {count}</span></button>;
      })}
    </div>
    <div className="asc-word-preview">
      <div aria-live="polite" aria-atomic="true">
        {active?.example ? <div className="asc-playable-sentence">
          <div className="asc-sentence"><SentenceContents example={active.example} hanzi={hanzi} /></div>
          <StudyListen term={active.example} className="asc-sentence-listen" />
        </div> : <p className="asc-muted">
          <span lang="zh-Hans">{active?.hanzi}</span> · Brak zdania przykładowego.
        </p>}
      </div>
      {active?.example && <ExampleWords example={active.example} />}
    </div>
    <div className="asc-terms" role="group" aria-label="Słowa i zwroty">
      {words.map(word => <StudyTile term={word} key={studyTermKey(word)} kind="word" highlight={hanzi}
        pressed={word === active} onSelect={() => setSelection(word)} />)}
    </div>
  </>;
}

function CardLink({ term, current, onNavigate }: {
  term: StudyTerm;
  current: string;
  onNavigate: (hanzi: string) => void;
}) {
  if (term.hanzi === current || !hasRecognitionStudyCard(term.hanzi)) return null;
  return <button type="button" className="asc-control asc-open" onClick={() => onNavigate(term.hanzi)}>
    Otwórz kartę <span lang="zh-Hans">{term.hanzi}</span> <ArrowRight size={15} aria-hidden="true" />
  </button>;
}

function FamilyPane({ card, onNavigate }: { card: StudyCard; onNavigate: (hanzi: string) => void }) {
  const [familyIndex, setFamilyIndex] = useState(0);
  const [selection, setSelection] = useState<StudyTerm>();
  const family = card.families[familyIndex];
  const otherParts = card.parts.filter(part => !card.families.some(group => group.part.hanzi === part.hanzi));
  const active = selection && family?.members.includes(selection)
    ? selection : family?.members.find(term => term.hanzi === card.entry.hanzi) ?? family?.members[0];

  if (!family) return <>
    {!!card.parts.length && <div className="asc-terms">
      {card.parts.map(part => <StudyTile term={part} key={studyTermKey(part)} kind="character" />)}
    </div>}
    <p className="asc-muted asc-family-note">Brak powiązanych znaków ze wspólnym komponentem w tej karcie.</p>
  </>;

  return <>
    {card.families.length > 1 && <div className="asc-filter" role="group" aria-label="Wspólny komponent">
      {card.families.map(({ part }, index) => <button type="button" key={part.hanzi} aria-pressed={index === familyIndex}
        onClick={() => { setFamilyIndex(index); setSelection(undefined); }}>
        <span lang="zh-Hans">{part.hanzi}</span><span className="asc-count">{levelText(part.levels)}</span>
      </button>)}
    </div>}
    <p className="asc-family-note">
      {family.basis === 'dictionary-radical' ? 'Klucz słownikowy' : 'Wspólny komponent'}{' '}
      <strong lang="zh-Hans">{family.part.hanzi}</strong> · <TermReading term={family.part} />
      {family.part.english && <> · <span lang="en">{family.part.english}</span></>}
      {' · ' + levelText(family.part.levels)}
      {family.position && <> · {familyPositions[family.position] ?? family.position}</>}
      <StudyListen term={family.part} />
      <span className="asc-muted asc-family-scope">Poziom dotyczy rozpoznawania znaku.</span>
    </p>
    {active && <div className="asc-note asc-family-selection">
      <div aria-live="polite" aria-atomic="true">
        <p><strong lang="zh-Hans">{active.hanzi}</strong> · <TermReading term={active} />
          {active.english && <> · <span lang="en">{active.english}</span></>}
          {' · ' + levelText(active.levels)}
        </p>
        {family.notes?.[active.hanzi] && <p>{family.notes[active.hanzi]}</p>}
      </div>
      <StudyListen term={active} />
      <CardLink term={active} current={card.entry.hanzi} onNavigate={onNavigate} />
    </div>}
    <div className="asc-terms" role="group" aria-label="Znaki w rodzinie">
      {family.members.map(term => <StudyTile term={term} key={studyTermKey(term)} kind="character"
        pressed={term === active} onSelect={() => setSelection(term)} />)}
    </div>
    {!!otherParts.length && <div className="asc-other-parts">
      <h3>Pozostałe części</h3>
      <div className="asc-story-parts">
        {otherParts.map(part => <StudyTile term={part} key={studyTermKey(part)} kind="character" />)}
      </div>
    </div>}
  </>;
}

function ComparePane({ card, onNavigate }: { card: StudyCard; onNavigate: (hanzi: string) => void }) {
  const [index, setIndex] = useState(0);
  const pair = card.comparisons[index];
  if (!pair) return <p className="asc-muted">Brak par do porównania w tej karcie.</p>;
  const pairKind = Array.from(pair.term.hanzi).length === 1 ? 'character' : 'word';

  return <>
    <div className="asc-filter" role="group" aria-label="Znak do porównania">
      {card.comparisons.map(({ term }, selected) => <button type="button" key={studyTermKey(term)}
        aria-pressed={index === selected} onClick={() => setIndex(selected)}>
        <span lang="zh-Hans">{term.hanzi}</span>
        <TermReading term={term} />
      </button>)}
    </div>
    <div aria-live="polite" aria-atomic="true">
      <div className="asc-compare">
        <StudyTile term={card.entry} kind="character" />
        <StudyTile term={pair.term} kind={pairKind} showWordScope />
      </div>
      <p className="asc-note">{pair.note}</p>
    </div>
    <CardLink term={pair.term} current={card.entry.hanzi} onNavigate={onNavigate} />
  </>;
}

function UsagePane({ card }: { card: StudyCard }) {
  const [selected, setSelected] = useState<string>();
  const hanzi = card.entry.hanzi;

  if (!card.usage.length && !card.contexts.length) return <p className="asc-muted">Brak przykładów użycia w tej karcie.</p>;

  function renderExample(example: StudyExample, key: string) {
    const active = selected === key;
    return <div className="asc-example" key={key}>
      <div className="asc-playable-sentence">
        <button className="asc-sentence asc-sentence-choice" type="button"
          onClick={() => setSelected(active ? undefined : key)} aria-pressed={active}>
          <SentenceContents example={example} hanzi={hanzi} />
        </button>
        <StudyListen term={example} className="asc-sentence-listen" />
      </div>
      {active && <ExampleWords example={example}/>}
    </div>;
  }

  return <>
    {!!card.usage.length && <div className="asc-usage">
      {card.usage.map(({ title, examples }, group) => <div className="asc-usage-group" key={group}>
        <h3>{title}</h3>
        {examples.map((example, index) => renderExample(example, group + '-' + index))}
      </div>)}
    </div>}
    {!!card.contexts.length && <section className="asc-contexts" aria-label="Przykłady w kontekście">
      <h3>Przykłady w kontekście</h3>
      {card.contexts.map((example, index) => renderExample(example, 'context-' + index))}
    </section>}
  </>;
}

function storyTermKey(term: StudyTerm, kind: 'word' | 'character') {
  return JSON.stringify([kind, term.hanzi, term.pinyin, term.english, term.levels, term.namePinyin]);
}

function StoryPane({ card }: { card: StudyCard }) {
  const seen = new Set([card.entry, ...card.parts].map(term => storyTermKey(term, 'character')));
  const terms = (card.storyTerms ?? []).filter(term => {
    const key = storyTermKey(term, term.kind);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return <div className="asc-story">
    <section aria-label="Budowa i znaczenie">
      <h3>Budowa i znaczenie</h3>
      {card.parts.length ? <div className="asc-story-parts">
        {card.parts.map(part => <StudyTile term={part} key={studyTermKey(part)} kind="character" />)}
      </div> : <p className="asc-muted">Brak rozpisanych komponentów w tej karcie.</p>}
      {card.structure && <p className="asc-story-structure">{card.structure}</p>}
      <p className="asc-story-entry">
        <strong lang="zh-Hans">{card.entry.hanzi}</strong> · <TermReading term={card.entry} /> · <span lang="en">{card.entry.english}</span> · {levelText(card.entry.levels)}
        <StudyListen term={card.entry} />
      </p>
    </section>
    <section className="asc-imagery" aria-label="Wyobrażona historyjka">
      <h3>Wyobrażona historyjka</h3>
      {card.story.length ? card.story.map((line, index) => <p key={index}>{line}</p>)
        : <p className="asc-muted">Brak historyjki do tego znaku.</p>}
      {!!terms.length && <div className="asc-terms asc-example-tokens asc-story-terms" role="group"
        aria-label="Znaki i słowa z historyjki">
        {terms.map(term => <StudyTile term={term} key={storyTermKey(term, term.kind)}
          kind={term.kind} showWordScope token />)}
      </div>}
    </section>
  </div>;
}
