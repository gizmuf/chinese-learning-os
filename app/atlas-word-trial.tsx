'use client';

import {Fragment, useEffect, useId, useState} from 'react';
import {ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Square, Volume2} from 'lucide-react';
import {useWordTrialPlayback, wordTrialAudioKey} from './atlas-word-trial-audio';
import trialHeads from '../data/atlas-word-trial/heads.json';
import './atlas-word-trial.css';

const providers = [['gpt', 'GPT'], ['deepseek', 'DeepSeek']] as const;
const sections = [['story', 'Historyjka'], ['situations', 'Sytuacje'], ['related', 'Podobne słowa']] as const;
const voteOptions = [...providers, ['tie', 'Remis']] as const;
type Provider = typeof providers[number][0];
type Section = typeof sections[number][0];
type Vote = typeof voteOptions[number][0];
type VoteMap = Record<string, Vote | null>;
type Term = {hanzi: string; pinyin: string; english: string; levels: string[]; characters?: Term[]};
type Version = {
  story: string;
  cues: Term[];
  inlineTerms?: Term[];
  situations: {label: string; sentence: Term; words: Term[]}[];
  related: {term: Term; hint: string}[];
};
type Entry = {head: Term; versions: Record<Provider, Version | null>; sources?: Partial<Record<Provider, string>>};
type Playback = ReturnType<typeof useWordTrialPlayback>;

const catalogUrl = '/atlas/word-trial/v1.json';
const votePrefix = 'chinese-os:atlas-word-trial:v1:vote:';
const voteKey = (word: string) => votePrefix + word;

function isVote(value: string | null): value is Vote {
  return voteOptions.some(([choice]) => choice === value);
}

function loadVotes(): VoteMap {
  try {
    const storage = window.localStorage;
    const saved: VoteMap = {};
    for (const word of trialHeads) {
      const choice = storage.getItem(voteKey(word));
      if (isVote(choice)) saved[word] = choice;
    }
    return saved;
  } catch {
    return {};
  }
}

function levelText(term: Term) {
  return term.levels.length
    ? term.levels.map(level => (level.startsWith('HSK ') ? level : 'HSK ' + level).replace('-', '–')).join(' · ')
    : 'poza wykazem';
}

function SoundButton({term, playback, inline = false}: {term: Term; playback: Playback; inline?: boolean}) {
  const active = playback.activeKey === wordTrialAudioKey(term);
  const Icon = active ? Square : Volume2;
  return <button type="button" className={inline ? 'awt-inline-sound' : 'awt-sound'}
    aria-label={`Odsłuchaj ${term.hanzi}, ${term.pinyin}`} aria-pressed={active}
    title={active ? 'Zatrzymaj nagranie' : 'Odsłuchaj nagranie'} onClick={() => playback.play(term)}>
    {inline ? <ruby lang="zh-Hans">{term.hanzi}<rt lang="zh-Latn">{term.pinyin}</rt></ruby>
      : <span className="awt-sound-label"><span lang="zh-Hans">{term.hanzi}</span><span lang="zh-Latn">{term.pinyin}</span></span>}
    <Icon size={inline ? 14 : 17} aria-hidden="true"/>
  </button>;
}

function Pronunciation({term, playback, kind = 'word'}: {term: Term; playback: Playback; kind?: 'word' | 'character' | 'sentence'}) {
  const failed = playback.errorKey === wordTrialAudioKey(term);
  return <>
    <SoundButton term={term} playback={playback}/>
    <div className="awt-gloss">
      <span lang="en">{term.english}</span>
      {kind !== 'sentence' && <span className="awt-level"
        title={kind === 'character' ? 'Poziom rozpoznawania znaku w HSK' : 'Poziom słowa w słowniku HSK'}>
        {levelText(term)} · {kind === 'character' ? 'znak' : 'słowo'}
      </span>}
    </div>
    {failed && <small className="awt-audio-error" aria-hidden="true">{playback.error}</small>}
  </>;
}

function TermTile({term, playback}: {term: Term; playback: Playback}) {
  return <div className="awt-term">
    <Pronunciation term={term} playback={playback}/>
    {!!term.characters?.length && <details>
      <summary><ChevronDown size={13} aria-hidden="true"/> Znaki <span lang="zh-Hans">{term.characters.map(char => char.hanzi).join(' · ')}</span></summary>
      <CharacterList terms={term.characters} playback={playback}/>
    </details>}
  </div>;
}

function CharacterList({terms, playback}: {terms: Term[]; playback: Playback}) {
  return <ul className="awt-characters" aria-label="Znaki składowe i poziomy ich rozpoznawania w HSK">{terms.map((term, index) => <li key={index}>
    <Pronunciation term={term} kind="character" playback={playback}/>
  </li>)}</ul>;
}

function TermList({terms, label, playback}: {terms: Term[]; label: string; playback: Playback}) {
  if (!terms.length) return null;
  return <ul className="awt-terms" aria-label={label}>{terms.map((term, index) =>
    <li key={index}><TermTile term={term} playback={playback}/></li>)}</ul>;
}

function AnnotatedProse({text, cues = [], inlineTerms = [], playback, describedTerm, story = false}: {
  text: string; cues?: Term[]; inlineTerms?: Term[]; playback: Playback; describedTerm?: Term; story?: boolean;
}) {
  const byHanzi = new Map([...inlineTerms, ...cues].map(term => [term.hanzi, term]));
  const matching = [...byHanzi.keys()].filter(hanzi => hanzi && text.includes(hanzi)).sort((a, b) => b.length - a.length);
  const segments = matching.length
    ? text.split(new RegExp('(' + matching.map(hanzi => hanzi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gu'))
    : [text];
  const mentions = new Map(cues.map(term => [wordTrialAudioKey(term), term]));
  return <>
    <p className={story ? 'awt-story' : 'awt-hint'}>{segments.map((segment, index) => {
      const term = index % 2 === 1 ? byHanzi.get(segment) : undefined;
      if (!term) return <Fragment key={index}>{segment}</Fragment>;
      const termKey = wordTrialAudioKey(term);
      if (!describedTerm || termKey !== wordTrialAudioKey(describedTerm)) mentions.set(termKey, term);
      return <Fragment key={index}>
        <SoundButton inline term={term} playback={playback}/>
        {playback.errorKey === termKey && <small className="awt-audio-error" aria-hidden="true">{playback.error}</small>}
      </Fragment>;
    })}</p>
    <TermList terms={[...mentions.values()]} playback={playback} label={story ? 'Słowa z historyjki' : 'Słowa z objaśnienia'}/>
  </>;
}

function LessonSection({version, section, playback}: {version: Version; section: Section; playback: Playback}) {
  switch (section) {
    case 'story':
      return <div className="awt-lesson-content">
        <AnnotatedProse text={version.story} cues={version.cues} inlineTerms={version.inlineTerms} playback={playback} story/>
      </div>;
    case 'situations':
      return <div className="awt-lesson-content">{version.situations.map(({label, sentence, words}, index) =>
        <section key={index} className="awt-situation">
          <h4>{label}</h4>
          <div className="awt-sentence"><Pronunciation term={sentence} kind="sentence" playback={playback}/></div>
          <TermList terms={words} label="Słowa w zdaniu" playback={playback}/>
        </section>)}</div>;
    case 'related':
      return <ul className="awt-related">{version.related.map(({term, hint}, index) => <li key={index}>
        <TermTile term={term} playback={playback}/>
        <AnnotatedProse text={hint} inlineTerms={version.inlineTerms} describedTerm={term} playback={playback}/>
      </li>)}</ul>;
  }
}

export default function AtlasWordTrial({word, onWordChange, onClose}: {
  word: string; onWordChange: (word: string) => void; onClose: () => void;
}) {
  const id = useId();
  const playback = useWordTrialPlayback();
  const [provider, setProvider] = useState<Provider>('gpt');
  const [section, setSection] = useState<Section>('story');
  const [catalog, setCatalog] = useState<Entry[]>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [savedVotes, setSavedVotes] = useState(loadVotes);
  const [temporaryVotes, setTemporaryVotes] = useState<VoteMap>({});

  useEffect(() => {
    const request = new AbortController();
    void fetch(catalogUrl, {signal: request.signal}).then(async response => {
      if (!response.ok) throw new Error('Trial catalog HTTP ' + response.status);
      const result = await response.json();
      if (!result || typeof result !== 'object' || !('entries' in result)
        || !Array.isArray(result.entries) || !result.entries.length) throw new Error('Trial catalog is empty');
      if (!request.signal.aborted) setCatalog(result.entries);
    }).catch(() => {
      if (!request.signal.aborted) setError(true);
    });
    return () => request.abort();
  }, [attempt]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    function sync(event: StorageEvent) {
      try {
        if (event.storageArea !== window.localStorage) return;
      } catch {
        return;
      }
      if (event.key === null) {
        setSavedVotes(loadVotes());
        return;
      }
      if (!event.key.startsWith(votePrefix)) return;
      const name = event.key.slice(votePrefix.length);
      if (!trialHeads.includes(name)) return;
      const choice = isVote(event.newValue) ? event.newValue : null;
      setSavedVotes(votes => ({...votes, [name]: choice}));
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const {stop} = playback;
  useEffect(() => () => stop(), [word, stop]);

  const position = catalog?.findIndex(entry => entry.head.hanzi === word) ?? -1;
  const entry = catalog?.[position];
  const votes = {...savedVotes, ...temporaryVotes};
  const voteCount = catalog?.filter(({head}) => votes[head.hanzi]).length ?? 0;

  function choose(vote: Vote) {
    const choice = votes[word] === vote ? null : vote;
    try {
      const storage = window.localStorage;
      if (choice) storage.setItem(voteKey(word), choice);
      else storage.removeItem(voteKey(word));
      setSavedVotes(current => ({...current, [word]: choice}));
      if (Object.hasOwn(temporaryVotes, word)) setTemporaryVotes(current => {
        const next = {...current};
        delete next[word];
        return next;
      });
    } catch {
      setTemporaryVotes(current => ({...current, [word]: choice}));
    }
  }

  return <article className="awt" lang="pl" data-trial-word={word} aria-labelledby={id + '-title'} data-study-lookup="off">
    <header className="awt-mast">
      <div className="awt-title">
        <button type="button" className="awt-control" onClick={onClose}><ArrowLeft size={16} aria-hidden="true"/> Wstecz</button>
        <h2 id={id + '-title'}>Porównaj lekcje</h2>
      </div>
      {catalog && <div className="awt-picker">
        <button type="button" className="awt-control" aria-label="Poprzednie słowo" disabled={position < 1}
          onClick={() => onWordChange(catalog[position - 1].head.hanzi)}><ChevronLeft size={18} aria-hidden="true"/></button>
        <label><span>Słowo</span>
          <select value={word} onChange={event => onWordChange(event.target.value)}>
            {!entry && <option value={word}>{word}</option>}
            {catalog.map(({head}) => <option key={head.hanzi} value={head.hanzi}>
              {head.hanzi} · {head.pinyin} · {head.english.split(';', 1)[0]} · {levelText(head)}
            </option>)}
          </select>
          <ChevronDown size={15} aria-hidden="true"/>
        </label>
        <button type="button" className="awt-control" aria-label="Następne słowo" disabled={position >= catalog.length - 1}
          onClick={() => onWordChange(catalog[position + 1].head.hanzi)}><ChevronRight size={18} aria-hidden="true"/></button>
      </div>}
    </header>
    {!catalog && !error && <p className="awt-message" role="status">Wczytywanie lekcji…</p>}
    {error && <div className="awt-message">
      <p role="alert">Nie udało się wczytać lekcji.</p>
      <button type="button" className="awt-control" onClick={() => {setError(false); setAttempt(attempt + 1);}}>Spróbuj ponownie</button>
    </div>}
    {catalog && !entry && <p className="awt-message" role="status">Brak lekcji dla wybranego słowa.</p>}
    <p className="awt-announcement" role="status" aria-atomic="true">{playback.error}</p>
    {entry && <>
      <div className="awt-head" key={word}>
        <div className="awt-headword"><Pronunciation term={entry.head} playback={playback}/></div>
        {!!entry.head.characters?.length && <CharacterList terms={entry.head.characters} playback={playback}/>}
      </div>
      <div className="awt-switches">
        <div className="awt-section-switch" role="group" aria-label="Część lekcji">
          {sections.map(([key, label]) => <button type="button" key={key} className="awt-control"
            aria-pressed={section === key} onClick={() => {if (section !== key) {stop(); setSection(key);}}}>{label}</button>)}
        </div>
        <div className="awt-provider-switch" role="group" aria-label="Model">
          {providers.map(([key, label]) => <button type="button" key={key} className="awt-control"
            aria-controls={id + '-' + key} aria-pressed={provider === key}
            onClick={() => {if (provider !== key) {stop(); setProvider(key);}}}>{label}</button>)}
        </div>
      </div>
      <div className="awt-columns" data-provider={provider}>
        {providers.map(([key, label]) => <section className="awt-provider" key={key} data-model={key} id={id + '-' + key}
          aria-labelledby={id + '-' + key + '-title'}>
          <header className="awt-provider-head">
            <h3 id={id + '-' + key + '-title'}>{label}</h3>
            {entry.sources?.[key] && <small>{entry.sources[key]}</small>}
          </header>
          {entry.versions[key]
            ? <LessonSection key={word + '-' + section} version={entry.versions[key]} section={section} playback={playback}/>
            : <p className="awt-message">Brak lekcji od {label}.</p>}
        </section>)}
      </div>
      <div className="awt-vote">
        <div className="awt-vote-title">
          <h3 id={id + '-vote'}>Mój wybór</h3>
          <span role="status">{voteCount}/{catalog?.length} ocenionych</span>
        </div>
        <div className="awt-vote-options" role="group" aria-labelledby={id + '-vote'}>
          {voteOptions.map(([value, label]) => <button type="button" className="awt-control" key={value}
            aria-pressed={votes[word] === value} onClick={() => choose(value)}>{label}</button>)}
        </div>
        {Object.keys(temporaryVotes).length > 0 && <small role="status">Wybory są dostępne do zamknięcia tej strony.</small>}
      </div>
    </>}
  </article>;
}
