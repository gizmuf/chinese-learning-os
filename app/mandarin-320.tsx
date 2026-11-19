'use client';

import {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, BookOpen, ChevronDown, ChevronRight, Eye, Volume2} from 'lucide-react';
import catalog from '../data/mandarin-320.json';
import audioSources from '../data/mandarin-320-audio.json';
import {stopAudio} from './audio';
import HanziQuickReview from './hanzi-quick-review';
import {HanziGroupPdf} from './hanzi-group-pdf';
import {Exercise, type Attempt, type Attempts} from './hanzi-family-lesson-practice';
import {hanziFamilyBackLink, selectedPracticeHref} from './hanzi-family-lesson-route';
import {createMandarin320PinyinLookup} from './mandarin-320-pinyin';
import {mandarin320Contrasts, mandarin320ContrastTopics, recallMandarin320, sentenceMandarin320, type MandarinEntry} from './mandarin-320-practice-model';
import {mandarin320Activities, mandarin320Id, mandarin320Modes, mandarin320Route, mandarin320Title, type Mandarin320Route} from './mandarin-320-route';
import {StudyText, useStudyLookup} from './study-lookup-context';
import {useMandarin320Progress} from './use-mandarin-320-progress';
import {useRecordingPlayback} from './use-recording-playback';
import './hanzi-family-lesson.css';
import './mandarin-320.css';

const entries: MandarinEntry[] = catalog.entries;
const lookupPinyin = createMandarin320PinyinLookup(entries);
const clips: Record<string, string> = audioSources;
const rangeSize = 40;
const wordAidsKey = 'chinese-os:mandarin-320:word-aids';
type WordAids = {pinyin: boolean; english: boolean};
type Playback = ReturnType<typeof useRecordingPlayback>;

function folded(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function Example({entry, player, dictionary = false, aids}: {entry: MandarinEntry; player: Playback; dictionary?: boolean; aids?: WordAids}) {
  const lookup = useStudyLookup();
  const clip = clips[entry.example];
  return <div className="hanzi-family-sentence mandarin320-example" data-study-source-id={mandarin320Id + ':' + entry.id}
    data-study-sentence={entry.example} data-study-pinyin={entry.example_pinyin}
    data-study-meaning={entry.example_meaning} data-study-audio={clip}>
    <p className="hanzi-family-example" lang="zh-Hans"><StudyText text={entry.example} pinyin={entry.example_pinyin} sourceText={entry.example} headword={entry.hanzi}/></p>
    {aids?.pinyin !== false && <p className="hanzi-family-reading" lang="zh-Latn">{entry.example_pinyin}</p>}
    {aids?.english !== false && <p lang="en">{entry.example_meaning}</p>}
    <div className="hanzi-family-actions">
      {clip && <button type="button" className="secondary" aria-label={'Listen to entry ' + entry.id + ' example'}
        data-playing={player.playing === clip || undefined} onClick={() => player.play(clip)}><Volume2 size={17} aria-hidden="true"/>Listen</button>}
      {dictionary && lookup && <button type="button" className="secondary" onClick={event => lookup.open(entry.hanzi, event.currentTarget, {
        text: entry.hanzi, pinyin: entry.pinyin, meaning: entry.meaning,
      })}><BookOpen size={16} aria-hidden="true"/>Dictionary</button>}
    </div>
  </div>;
}

function Words({player, practise}: {player: Playback; practise: (mode: 'recall' | 'sentence', item: number) => void}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [aids, setAids] = useState<WordAids>({pinyin: true, english: true});
  const [overrides, setOverrides] = useState<Map<number, boolean>>(() => new Map());
  const heading = useRef<HTMLHeadingElement>(null);
  const query = folded(search.trim());
  const number = /^#?(\d+)$/u.exec(query);
  const filtered = !query ? entries : entries.filter(entry => number
    ? entry.id === Number(number[1])
    : folded([entry.hanzi, entry.pinyin, entry.meaning, entry.family].join(' ')).includes(query));
  const pageCount = Math.ceil(filtered.length / rangeSize);
  const visible = filtered.slice(page * rangeSize, (page + 1) * rangeSize);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(wordAidsKey) ?? 'null');
      if (typeof saved?.pinyin === 'boolean' && typeof saved?.english === 'boolean') setAids(saved);
    } catch { /* The switches still work for this session. */ }
  }, []);

  function toggleAid(key: keyof WordAids) {
    const next = {...aids, [key]: !aids[key]};
    setAids(next);
    setOverrides(new Map());
    try { localStorage.setItem(wordAidsKey, JSON.stringify(next)); } catch { /* Store is optional. */ }
  }

  function pageFromBottom(index: number) {
    setPage(index);
    heading.current?.focus();
  }

  function toggleEntry(id: number, open: boolean) {
    setExpanded(previous => {
      if (previous.has(id) === open) return previous;
      const next = new Set(previous);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return <section className="panel hanzi-family-panel" aria-labelledby="mandarin320-words">
    <h2 id="mandarin320-words" ref={heading} tabIndex={-1}>Words and families</h2>
    {pageCount > 1 && <nav className="hanzi-family-word-ranges mandarin320-ranges" aria-label={query ? 'Search result ranges' : 'Entry ranges'}>
      {Array.from({length: pageCount}, (_, index) => <button type="button" key={index}
        aria-current={page === index ? 'true' : undefined} aria-controls="mandarin320-results"
        className={page === index ? 'primary' : 'secondary'} onClick={() => setPage(index)}>
        {index * rangeSize + 1}–{Math.min((index + 1) * rangeSize, filtered.length)}
      </button>)}
    </nav>}
    <div className="hanzi-family-actions hanzi-family-study-controls">
      <label>Find an entry
        <input type="search" value={search} placeholder="Hanzi, pinyin, meaning or entry number" onChange={event => {
          setSearch(event.target.value);
          setPage(0);
        }}/>
      </label>
      <p role="status">{filtered.length} {query ? 'matches' : 'entries'}</p>
    </div>
    <div className="hanzi-family-actions mandarin320-aids" role="group" aria-label="Words display">
      <button type="button" className="secondary" aria-pressed={aids.pinyin} onClick={() => toggleAid('pinyin')}>Pinyin</button>
      <button type="button" className="secondary" aria-pressed={aids.english} onClick={() => toggleAid('english')}>English</button>
    </div>
    {visible.length > 0 && <div className="hanzi-family-actions hanzi-group-actions">
      <HanziGroupPdf entries={visible} title={'Mandarin 320 · Words ' + (page * rangeSize + 1) + '–' + (page * rangeSize + visible.length)} />
      <HanziQuickReview entries={visible}/>
    </div>}
    <div className="hanzi-family-entries mandarin320-entries" id="mandarin320-results">
      {visible.map(entry => {
        const open = expanded.has(entry.id);
        const id = 'mandarin320-entry-' + entry.id;
        const override = overrides.get(entry.id);
        const pinyin = override ?? aids.pinyin;
        const english = override ?? aids.english;
        const showBoth = !(pinyin && english);
        return <div className="hanzi-family-entry" key={entry.id} data-entry-id={entry.id}>
          <div className="mandarin320-row">
            <button type="button" className="mandarin320-entry-main" aria-expanded={open} aria-controls={id}
              onClick={() => toggleEntry(entry.id, !open)}>
              {open ? <ChevronDown size={16} aria-hidden="true"/> : <ChevronRight size={16} aria-hidden="true"/>}
              <span className="mandarin320-entry-number">{entry.id}</span>
              <span className="hanzi-family-headword" lang="zh-Hans">{entry.hanzi}</span>
            </button>
            <button type="button" className="mandarin320-entry-hints" aria-pressed={pinyin && english}
              aria-label={(showBoth ? 'Show' : 'Hide') + ' pinyin and English for ' + entry.hanzi}
              onClick={() => setOverrides(current => {
                const next = new Map(current);
                if (showBoth === aids.pinyin && showBoth === aids.english) next.delete(entry.id);
                else next.set(entry.id, showBoth);
                return next;
              })}>
              {pinyin && <span className="hanzi-family-reading" lang="zh-Latn">{entry.pinyin}</span>}
              {english && <span className="hanzi-family-gloss" lang="en">{entry.meaning}</span>}
              {!pinyin && !english && <span className="mandarin320-hint-label"><Eye size={16} aria-hidden="true"/>Show hints</span>}
            </button>
          </div>
          <div id={id} className="hanzi-family-entry-body" hidden={!open}>{open && <>
          <Example entry={entry} player={player} dictionary aids={{pinyin, english}}/>
          <h3>Related words</h3>
          <p><StudyText text={entry.family}/></p>
          <h3>What to look for</h3>
          <p lang="pl"><StudyText text={entry.notes}/></p>
          <div className="hanzi-family-actions mandarin320-entry-practice">
            <button type="button" className="secondary" onClick={() => practise('recall', entry.id)}>Recall and write</button>
            <button type="button" className="secondary" onClick={() => practise('sentence', entry.id)}>Use in a sentence</button>
          </div>
          </>}</div>
        </div>;
      })}
      {!visible.length && <p>No entries match this search.</p>}
    </div>
    {pageCount > 1 && <div className="hanzi-family-actions hanzi-family-paging mandarin320-result-footer">
      <button type="button" className="secondary" disabled={!page} onClick={() => pageFromBottom(page - 1)}><ArrowLeft size={16} aria-hidden="true"/>Previous range</button>
      <button type="button" className="secondary" disabled={page + 1 === pageCount} onClick={() => pageFromBottom(page + 1)}>Next range<ArrowRight size={16} aria-hidden="true"/></button>
    </div>}
  </section>;
}

const lookalikeMeanings: Record<string, string> = {
  未: 'not yet', 末: 'end', 土: 'earth; soil', 士: 'scholar', 日: 'sun; day', 目: 'eye',
  白: 'white', 百: 'hundred', 买: 'buy', 卖: 'sell', 午: 'noon', 牛: 'ox; cow',
  人: 'person', 入: 'enter', 己: 'oneself', 已: 'already',
};

function appendixEntries(examples: string) {
  return examples.split(';').flatMap(row => {
    const definition = /^([\p{Script=Han}]+)\s+([^=]+?)\s*=\s*(.+)$/u.exec(row.trim());
    if (definition) return [{hanzi: definition[1], pinyin: definition[2], meaning: definition[3]}];
    return row.split('/').flatMap(part => {
      const pair = /^([\p{Script=Han}])\s+(\S+)$/u.exec(part.trim());
      return pair && lookalikeMeanings[pair[1]]
        ? [{hanzi: pair[1], pinyin: pair[2], meaning: lookalikeMeanings[pair[1]]}]
        : [];
    });
  });
}

function Appendix({onSelect}: {onSelect: (item: number) => void}) {
  return <section className="panel hanzi-family-panel" aria-labelledby="mandarin320-appendix">
    <h2 id="mandarin320-appendix">Components and contrasts</h2>
    <div className="hanzi-family-compare">
      {catalog.appendix.map((group, index) => { const review = appendixEntries(group.examples); return <section className="hanzi-family-group" key={group.title} data-appendix-id={index + 1}>
        <h3 lang="pl"><StudyText text={group.title}/></h3>
        <p><StudyText text={group.examples}/></p>
        <p lang="pl"><StudyText text={group.note}/></p>
        <button type="button" className="secondary" onClick={() => onSelect(index + 1)}>Practise this contrast</button>
        {review.length > 0 && <div className="hanzi-family-actions hanzi-group-actions">
          <HanziGroupPdf entries={review} title={group.title}/>
          <HanziQuickReview entries={review}/>
        </div>}
      </section>;})}
    </div>
  </section>;
}

function JumpToItem({item, count, label, select}: {item: number; count: number; label: string; select: (id: number) => void}) {
  const [draft, setDraft] = useState(String(item));
  const value = Number(draft);
  const valid = Number.isInteger(value) && value > 0 && value <= count;
  return <form className="hanzi-family-actions mandarin320-jump" onSubmit={event => {
    event.preventDefault();
    if (valid) select(value);
  }}>
    <label>{label}
      <input type="number" value={draft} min={1} max={count} required inputMode="numeric" onChange={event => setDraft(event.target.value)}/>
    </label>
    <button type="submit" className="secondary" disabled={!valid}>Go</button>
  </form>;
}

function Practice({route, navigate, attempts, pending, save, player, penOnly, setPenOnly}: {
  route: Mandarin320Route;
  navigate: (change: Partial<Mandarin320Route>) => void;
  attempts: Attempts;
  pending: boolean;
  save: (id: string, attempt: Attempt | null) => Promise<void>;
  player: Playback;
  penOnly: boolean;
  setPenOnly: (value: boolean) => void;
}) {
  const [isIPad, setIsIPad] = useState(false);
  const [pencilEnabled, setPencilEnabled] = useState(false);
  useEffect(() => {
    setIsIPad(/iPad/.test(navigator.userAgent)
      || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));
  }, []);
  const isContrast = route.mode === 'contrast';
  const count = isContrast ? mandarin320Contrasts.length : entries.length;
  const item = Math.min(route.item, count);
  const entry = isContrast ? undefined : entries[item - 1];
  const exercise = entry
    ? (route.mode === 'recall' ? recallMandarin320(entry) : sentenceMandarin320(entry))
    : mandarin320Contrasts[item - 1];
  const attempt = attempts[exercise.id];
  const [before, after] = exercise.context?.split(' · ', 1)[0].split('＿＿') ?? [];
  const sentenceGap = entry && route.mode === 'sentence' && exercise.kind === 'gap' && after !== undefined
    ? {before, after, translation: entry.example_meaning, lookup: lookupPinyin,
        pencil: isIPad ? {enabled: pencilEnabled, toggle: () => setPencilEnabled(enabled => !enabled)} : undefined}
    : undefined;
  const select = (item: number) => navigate({item});

  return <section className="panel hanzi-family-panel" aria-labelledby="mandarin320-practice">
    <h2 id="mandarin320-practice">Active practice</h2>
    <div className="hanzi-family-actions mandarin320-modes" role="group" aria-label="Practice mode">
      {mandarin320Modes.map(([id, label]) => <button key={id} type="button" className={route.mode === id ? 'primary' : 'secondary'}
        aria-pressed={route.mode === id} onClick={() => {
          if (route.mode !== id) navigate({mode: id, item: id === 'contrast' || isContrast ? 1 : item});
        }}>{label}</button>)}
    </div>
    <div className="hanzi-family-actions mandarin320-practice-tools">
      <JumpToItem key={route.mode + item} item={item} count={count} label={isContrast ? 'Contrast number' : 'Entry number'} select={select}/>
      <p role="status">{Object.keys(attempts).length} / {entries.length * 2 + mandarin320Contrasts.length} attempted</p>
      <a className="text-button" href={selectedPracticeHref}>Selected for practice</a>
    </div>
    <p className="mandarin320-practice-position">{isContrast ? 'Contrast' : 'Entry'} {item} / {count}</p>
    {isContrast && attempt && <p lang="pl">{mandarin320ContrastTopics[item - 1]}</p>}
    <Exercise key={exercise.id} exercise={exercise} attempt={attempt} pending={pending} sentenceGap={sentenceGap} onSave={value => save(exercise.id, value)}
      {...{penOnly, setPenOnly}} feedbackDetails={entry && <Example entry={entry} player={player} dictionary/>}/>
    <div className="hanzi-family-actions hanzi-family-paging">
      <button type="button" className="secondary" disabled={item === 1} onClick={() => select(item - 1)}><ArrowLeft size={16} aria-hidden="true"/>Previous question</button>
      <button type="button" className="secondary" disabled={item === count} onClick={() => select(item + 1)}>Next question<ArrowRight size={16} aria-hidden="true"/></button>
    </div>
  </section>;
}

export default function Mandarin320({owner, notify, penOnly, setPenOnly}: {
  owner: string | null;
  notify: (message: string) => void;
  penOnly: boolean;
  setPenOnly: (value: boolean) => void;
}) {
  const [route, setRoute] = useState(() => mandarin320Route(typeof location === 'undefined' ? '' : location.search));
  const {attempts, pending, save} = useMandarin320Progress(owner ?? 'guest', notify);
  const heading = useRef<HTMLHeadingElement>(null);
  const player = useRecordingPlayback(notify);

  useEffect(() => {
    const update = () => {stopAudio();setRoute(mandarin320Route(location.search));};
    window.addEventListener('popstate', update);
    return () => {window.removeEventListener('popstate', update);stopAudio();};
  }, []);

  function navigate(change: Partial<Mandarin320Route>) {
    const next = {...route, ...change};
    const url = new URL(location.href);
    if (next.activity === 'words') url.searchParams.delete('activity');
    else url.searchParams.set('activity', next.activity);
    if (next.mode === 'recall') url.searchParams.delete('mode');
    else url.searchParams.set('mode', next.mode);
    if (next.item === 1) url.searchParams.delete('item');
    else url.searchParams.set('item', String(next.item));
    window.history.replaceState(window.history.state, '', url);
    stopAudio();
    setRoute(next);
    if (next.activity !== route.activity) requestAnimationFrame(() => heading.current?.focus());
  }

  const back = hanziFamilyBackLink(typeof location === 'undefined' ? '' : location.search);
  return <article className="course-space hanzi-family-lesson mandarin320">
    <a className="text-button" href={back}><ArrowLeft size={16} aria-hidden="true"/>{back.includes('study=library') ? 'Back to My lessons' : 'Back to course'}</a>
    <header className="hanzi-family-heading">
      <h1 ref={heading} tabIndex={-1}>{mandarin320Title}</h1>
      <p>320 numbered entries · examples, families and comparisons</p>
    </header>
    <nav className="hanzi-family-actions hanzi-family-tabs" aria-label="Lesson activities">
      {mandarin320Activities.map(([id, label]) => <button key={id} type="button" className={route.activity === id ? 'primary' : 'secondary'}
        aria-pressed={route.activity === id} onClick={() => navigate({activity: id})}>{label}</button>)}
    </nav>
    <div hidden={route.activity !== 'words'}><Words player={player} practise={(mode, item) => navigate({activity: 'practice', mode, item})}/></div>
    {route.activity === 'appendix' && <Appendix onSelect={item => navigate({activity: 'practice', mode: 'contrast', item})}/>}
    {route.activity === 'practice' && (attempts
      ? <Practice {...{route, navigate, attempts, pending, save, player, penOnly, setPenOnly}}/>
      : <p role="status">Loading practice progress…</p>)}
  </article>;
}
