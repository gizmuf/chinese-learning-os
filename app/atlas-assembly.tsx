'use client';

import {useEffect, useMemo, useRef, useState, type FormEvent} from 'react';
import {ArrowRight, ChevronDown, ChevronsLeftRight, Grid2X2, List, Pin, Search} from 'lucide-react';
import {assemblyFamilySections, assemblyPresets, assemblySeeds, defaultAssemblyHanzi, findAssemblySeed} from './atlas-assembly-families';
import {AssemblyDrawing, AssemblyThumbnail} from './atlas-assembly-glyph';
import {
  assemblyFamily, assemblyIndex, assemblyMeaning, assemblyOperandText, assemblyPositions, assemblySwaps,
  type AssemblyCharacter, type FamilyMember, type Position,
} from './atlas-assembly-model';
import {useI18n} from './i18n';
import {browseInScope, type BrowseScope} from './hsk-scope';
import './atlas-assembly.css';

type BuildSelection = {hanzi: string; part: string};
type FamilyData = ReturnType<typeof assemblyIndex>;
type FamilyLayout = 'grid' | 'list';
const useExamples: Partial<Record<string, {hanzi: string; pinyin: string; meaning: string}[]>> = {
  挤: [
    {hanzi: '地铁站很挤。', pinyin: 'Dìtiězhàn hěn jǐ.', meaning: 'The subway station is very crowded.'},
    {hanzi: '挤牙膏', pinyin: 'jǐ yágāo', meaning: 'squeeze toothpaste'},
  ],
  让: [
    {hanzi: '这让人很担心。', pinyin: 'Zhè ràng rén hěn dānxīn.', meaning: 'This makes people worry.'},
    {hanzi: '请让一下。', pinyin: 'Qǐng ràng yíxià.', meaning: 'Please make way.'},
  ],
  济: [{hanzi: '救济', pinyin: 'jiùjì', meaning: 'provide relief'}],
  剂: [{hanzi: '药剂', pinyin: 'yàojì', meaning: 'medicinal preparation'}],
};
function labelPosition(value: Position) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function hskText(character: AssemblyCharacter) {
  return character.level ? 'HSK ' + String(character.level).replace('-', '–') : '';
}


function firstFamilyMember(index: FamilyData, part: string, scope: BrowseScope, current?: AssemblyCharacter) {
  const direct = assemblyFamily(index, part, scope, {nested: false});
  const sample = findAssemblySeed(part)?.sample;
  return direct.find(member => member.character === current) ??
    direct.find(member => member.character.data.hanzi === sample) ?? direct[0] ??
    assemblyFamily(index, part, scope)[0] ?? assemblyFamily(index, part, 'all')[0];
}

function AssemblyDirectory({index, scope, part, choose}: {
  index: FamilyData; scope: BrowseScope; part: string; choose: (part: string) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = query.trim().toLocaleLowerCase();
  const counts = useMemo(() => new Map(assemblyPresets.map(item =>
    [item.part, assemblyFamily(index, item.part, scope, {nested: false}).length])), [index, scope]);
  const visible = assemblyFamilySections.map(section => ({
    ...section,
    families: section.families.filter(item => !filtered ||
      item.forms.some(glyph => glyph === filtered) || item.label.toLocaleLowerCase().includes(filtered)),
  })).filter(section => section.families.length > 0);
  return <section id="ab-directory" className="ab-directory" aria-label="Component directory">
    <div className="ab-directory-head">
      <p>{assemblyPresets.length} starting families</p>
      <input type="search" aria-label="Search component directory" placeholder="Search components" value={query}
        onChange={event => setQuery(event.target.value)} autoComplete="off"/>
    </div>
    <div className="ab-directory-results">
      {visible.length ? visible.map(section => <div key={section.title}>
        <h3>{section.title}</h3>
        <ul>{section.families.map(item => {
          const count = counts.get(item.part) ?? 0;
          return <li key={item.part}><button type="button" disabled={!count}
            aria-pressed={item.forms.includes(part)} onClick={() => choose(item.part)}>
            <span className="ab-hanzi" lang="zh-Hans">{item.part}</span><span>{item.label}</span><small>{count}</small>
          </button></li>;
        })}</ul>
      </div>) : <p>No starting family matches this search. Try entering the part in the Atlas search above.</p>}
    </div>
  </section>;
}

function MemoryCue({owner, family}: {owner: string | null; family: string}) {
  const key = 'chinese-os:atlas-build-cue:v1:' + (owner ? 'user:' + owner : 'guest') + ':' + family;
  const [saved, setSaved] = useState(() => {
    try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
  });
  const [draft, setDraft] = useState(saved);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(false);
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const value = draft.trim();
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
      setSaved(value);
      setEditing(false);
      setError(false);
    } catch { setError(true); }
  }
  return editing
    ? <form className="ab-cue" onSubmit={save}>
      <label htmlFor="ab-memory-cue">Your memory cue</label>
      <div><input id="ab-memory-cue" value={draft} onChange={event => setDraft(event.target.value)} maxLength={90}/>
        <button type="submit">Save</button>
        <button type="button" onClick={() => { setDraft(saved); setEditing(false); setError(false); }}>Cancel</button></div>
      {error && <p role="alert">Could not save the cue in this browser.</p>}
    </form>
    : <button className="ab-cue-link" type="button" onClick={() => setEditing(true)}>{saved || '+ Add a memory cue'}</button>;
}

function FamilyPanel({index, current, select, scope, owner, layout, setLayout}: {
  index: FamilyData; current: BuildSelection; select: (member: FamilyMember, part?: string) => void;
  scope: BrowseScope; owner: string | null; layout: FamilyLayout; setLayout: (value: FamilyLayout) => void;
}) {
  const [position, setPosition] = useState<Position | 'all'>('all');
  const [form, setForm] = useState('');
  const [nested, setNested] = useState(false);
  const resultsRoot = useRef<HTMLUListElement>(null);
  const [outlines, setOutlines] = useState<ReadonlySet<string>>(() => new Set());
  const seed = findAssemblySeed(current.part);
  const filterPart = form || current.part;
  const members = useMemo(() => assemblyFamily(index, filterPart, scope, {exact: !!form, nested}),
    [index, scope, filterPart, form, nested]);
  const matchesPosition = ({positions}: {positions: Position[]}) => position === 'all' || positions.includes(position);
  const visiblePositions = useMemo(() => {
    const regions = new Set(members.flatMap(member => member.occurrences.flatMap(match => match.positions)));
    return assemblyPositions.filter(region => regions.has(region) || region === position);
  }, [members, position]);
  const visible = useMemo(() => position === 'all' ? members :
    members.filter(member => member.occurrences.some(match => match.positions.includes(position))), [members, position]);

  useEffect(() => {
    if (!resultsRoot.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      const nearby: string[] = [];
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const hanzi = entry.target.getAttribute('data-outline');
        if (hanzi) nearby.push(hanzi);
        observer.unobserve(entry.target);
      }
      if (nearby.length) setOutlines(previous => new Set([...previous, ...nearby]));
    }, {rootMargin: '120px 0px'});
    for (const card of resultsRoot.current.querySelectorAll('[data-outline]')) observer.observe(card);
    return () => observer.disconnect();
  }, [visible]);

  return <aside id="ab-component-family" className="ab-panel ab-family" aria-label="Component family" tabIndex={-1}>
    <header className="ab-family-head">
      <div>
        <h3>{current.part ? <><span className="ab-family-glyph ab-hanzi" lang="zh-Hans">{seed?.part ?? current.part}</span>
          {seed ? seed.label + ' family' : 'Shared part'}</> : 'All hanzi'}</h3>
        <p className="ab-result-count" role="status">{visible.length.toLocaleString()} {visible.length === 1 ? 'character' : 'characters'}{position !== 'all' ? ' · ' + labelPosition(position) : ''}</p>
      </div>
      <div className="ab-layout-toggle" role="group" aria-label="Family layout">
        <button type="button" aria-label="Grid" title="Grid" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}><Grid2X2 size={16}/></button>
        <button type="button" aria-label="List" title="List" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}><List size={17}/></button>
      </div>
    </header>
    {current.part && <div className="ab-family-tools">
      {seed && seed.forms.length > 1 && <select aria-label="Component form" value={form} onChange={event => {
        setForm(event.target.value);
        setPosition('all');
      }}>
        <option value="">All forms</option>
        {seed.forms.map(glyph => <option lang="zh-Hans" key={glyph}>{glyph}</option>)}
      </select>}
      <select aria-label="Component position" value={position}
        onChange={event => setPosition(event.target.value as typeof position)}>
        <option value="all">Any position</option>
        {visiblePositions.map(region => <option value={region} key={region}>{labelPosition(region)}</option>)}
      </select>
      <label className="ab-nested"><input type="checkbox" checked={nested} onChange={event => {
        setNested(event.target.checked);
        setPosition('all');
      }}/> Include nested parts</label>
      <details className="ab-family-notes">
        <summary>Notes</summary>
        {seed?.note && <p className="ab-family-note">{seed.note}</p>}
        <MemoryCue owner={owner} family={seed?.part ?? current.part} key={owner + ':' + (seed?.part ?? current.part)}/>
      </details>
    </div>}
    {visible.length > 0 ? <ul ref={resultsRoot} className={'ab-family-results ab-' + layout}>
      {visible.map(member => {
        const {character, occurrences} = member;
        const hanzi = character.data.hanzi;
        const matching = occurrences.filter(matchesPosition);
        const places = Array.from(new Set(matching.map(match => match.positions[0])));
        const isActive = (part: AssemblyCharacter['parts'][number]) =>
          matching.some(match => !match.via && match.glyph === part.glyph) &&
          (position === 'all' || part.positions.includes(position));
        const reading = character.data.readings[0];
        const meaning = assemblyMeaning(character, true);
        const metadata = [places.map(labelPosition).join(' / '), hskText(character)].filter(Boolean).join(' · ');
        return <li key={hanzi} data-outline={hanzi}>
          <button type="button" aria-pressed={current.hanzi === hanzi}
            aria-label={[hanzi, reading, meaning, metadata].filter(Boolean).join(' · ')}
            onClick={() => select(member, matching.find(match => match.glyph === current.part)?.glyph ?? matching[0]?.glyph)}>
            {outlines.has(hanzi) ? <AssemblyThumbnail character={character} active={isActive}/> :
              <span className="ab-thumbnail ab-hanzi" lang="zh-Hans">{hanzi}</span>}
            <span className="ab-result-copy">
              <strong>{reading || '—'}</strong>
              <span className="ab-gloss" title={assemblyMeaning(character)}>{meaning || '—'}</span>
              {layout === 'list' && metadata && <small>{metadata}</small>}
            </span>
          </button>
        </li>;
      })}
    </ul> : <p className="ab-empty">No characters match these filters in this HSK range.</p>}
  </aside>;
}

export default function AtlasAssembly({hanzi, part, scope, owner, onSelect, showWords, widen}: {
  hanzi?: string; part?: string; scope: BrowseScope; owner: string | null; onSelect: (selection: BuildSelection) => void;
  showWords: (hanzi: string) => void; widen: () => void;
}) {
  const {locale} = useI18n();
  const index = useMemo(() => assemblyIndex(locale), [locale]);
  const layoutRoot = useRef<HTMLDivElement>(null);
  const boardRoot = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [split, setSplit] = useState(false);
  const [directory, setDirectory] = useState(false);
  const [familyFirst, setFamilyFirst] = useState(() => !!part && index.families.has(part));
  const [builderOpen, setBuilderOpen] = useState(false);
  const [familyLayout, setFamilyLayout] = useState<FamilyLayout>('grid');
  const [change, setChange] = useState<{from: string; to: string; kept: string}>();
  const character = (hanzi ? index.characters.get(hanzi) : undefined) ??
    (part && index.families.has(part) ? firstFamilyMember(index, part, scope)?.character : undefined) ??
    index.characters.get(defaultAssemblyHanzi)!;
  const glyph = character.data.hanzi;
  const firstPart = character.parts.find(candidate => index.families.has(candidate.glyph))?.glyph ?? '';
  const relatedForm = part && findAssemblySeed(part)?.forms.find(form =>
    character.parts.some(candidate => candidate.glyph === form));
  const selected = part === '' || (part && index.families.has(part))
    ? character.parts.some(candidate => candidate.glyph === part) ? part : relatedForm || part
    : firstPart;
  const current = {hanzi: glyph, part: selected};
  const showBuilder = !familyFirst || builderOpen;
  const swaps = showBuilder ? assemblySwaps(index, character, selected, scope) : [];
  const outOfScope = scope !== 'all' && !!character.level && !browseInScope(character.level, scope);
  const seed = findAssemblySeed(selected);
  const familyKey = seed?.part ?? selected;
  const nestedMatches = selected ? index.families.get(selected)?.find(member => member.character === character)?.occurrences ?? [] : [];
  const nested = !character.parts.some(candidate => candidate.glyph === selected) ? nestedMatches.find(match => match.via) : undefined;
  const latest = change?.to === glyph && change.kept === selected ? change : undefined;
  const clue = glyph === '挤' && selected === '扌' ? 'The hand form hints at pushing or squeezing.'
    : ['挤', '济', '剂'].includes(glyph) && selected === '齐' ? '齐 gives a sound clue. Compare jǐ and jì.'
    : glyph === '让' && selected === '讠' ? '讠 is the simplified speech form. Compare 说, 讲 and 请.' : '';

  function selectHanzi(hanzi: string, part?: string) {
    const next = index.characters.get(hanzi);
    if (!next) return;
    const fallback = next.parts.find(candidate => index.families.has(candidate.glyph))?.glyph ?? '';
    onSelect({hanzi, part: part ?? fallback});
    setError('');
    setChange(undefined);
  }

  function openFamily(part: string) {
    if (!part) {
      selectHanzi(glyph, '');
      showFamilyOverview();
      return;
    }
    const first = firstFamilyMember(index, part, scope, character);
    if (!first) return;
    if (selected !== part) selectHanzi(first.character.data.hanzi,
      first.occurrences.find(match => match.glyph === part)?.glyph ?? first.occurrences[0]?.glyph ?? part);
    showFamilyOverview();
  }

  function showFamilyOverview() {
    setFamilyFirst(true);
    setBuilderOpen(false);
    setDirectory(false);
    requestAnimationFrame(() => {
      const family = layoutRoot.current?.querySelector<HTMLElement>('.ab-family');
      family?.focus({preventScroll: true});
      family?.scrollIntoView({block: 'nearest'});
    });
  }

  function find(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;
    const known = assemblyPresets.find(item => item.label.toLocaleLowerCase() === text.toLocaleLowerCase() || item.forms.includes(text));
    if (known) openFamily(known.part);
    else if (index.characters.has(text)) {
      selectHanzi(text);
      if (familyFirst) showFamilyOverview();
    }
    else if (index.families.has(text)) openFamily(text);
    else {
      setError('Enter a single indexed hanzi or part, such as 挤, 齐 or 扌.');
      return;
    }
    setQuery('');
    setError('');
  }

  function focusFamily() {
    const family = layoutRoot.current?.querySelector<HTMLElement>('.ab-family');
    const target = family?.querySelector<HTMLButtonElement>('.ab-family-results button[aria-pressed=true]') ?? family;
    target?.scrollIntoView({block: 'center'});
    target?.focus({preventScroll: true});
  }

  function chooseMember(member: FamilyMember, pin?: string) {
    selectHanzi(member.character.data.hanzi, pin ?? selected);
    if (familyFirst) return;
    const family = layoutRoot.current?.querySelector('.ab-family');
    const board = boardRoot.current;
    if (family && board && family.getBoundingClientRect().top > board.getBoundingClientRect().bottom - 2) {
      requestAnimationFrame(() => {
        board.scrollIntoView({block: 'start'});
        board.focus({preventScroll: true});
      });
    }
  }

  function pin(glyph: string) {
    if (index.families.has(glyph)) selectHanzi(current.hanzi, glyph);
  }

  function replacePart(next: AssemblyCharacter) {
    onSelect({hanzi: next.data.hanzi, part: selected});
    setChange({from: glyph, to: next.data.hanzi, kept: selected});
    setSplit(false);
  }

  const findForm = <form className="ab-find" onSubmit={find}>
    <input type="search" aria-label="Find hanzi or a part" placeholder="Find hanzi or a part" value={query}
      onChange={event => { setQuery(event.target.value); setError(''); }} maxLength={20} enterKeyHint="search" autoComplete="off"/>
    <button type="submit" aria-label="Find"><Search size={18}/></button>
  </form>;
  const directoryToggle = <button type="button" className="ab-browse-toggle" aria-expanded={directory} aria-controls="ab-directory"
    onClick={() => {setDirectory(!directory); setError('');}}>
    Browse components <ChevronDown size={15} aria-hidden="true"/>
  </button>;
  const seeds = <div className="ab-seeds" role="group" aria-label="Common component families">
    {assemblySeeds.map(seed => <button type="button" key={seed.part} aria-pressed={familyKey === seed.part}
      onClick={() => openFamily(seed.part)}><span className="ab-hanzi" lang="zh-Hans">{seed.part}</span>{seed.label}</button>)}
    <button type="button" aria-pressed={!selected} onClick={() => openFamily('')}>All hanzi</button>
    {!familyFirst && directoryToggle}
  </div>;
  const directoryContents = directory && <AssemblyDirectory index={index} scope={scope} part={selected} choose={openFamily}/>;
  const searchError = error && <p className="ab-error" role="alert">{error}</p>;

  return <section className={'ab' + (familyFirst ? ' ab-overview' : '')} aria-label="Build hanzi">
    {familyFirst ? <h2 className="ab-visually-hidden">Build hanzi</h2> : <>
      <header className="ab-header">
        <div><h2>Build hanzi</h2><p>Split a character, pin a part and see where else it appears.</p></div>
        {findForm}
      </header>
      {searchError}
      {seeds}
      {directoryContents}
    </>}
    <div ref={layoutRoot} className="ab-columns">
      <section ref={boardRoot} className="ab-panel ab-board" aria-label="Character builder" tabIndex={-1} data-character={glyph}>
        {familyFirst && <div className="ab-selected-strip">
          <button type="button" className="ab-builder-toggle" aria-expanded={builderOpen} aria-controls="ab-builder"
            onClick={() => setBuilderOpen(!builderOpen)}>
            <span lang="zh-Hans" className="ab-hanzi ab-selected-glyph">{glyph}</span>
            <span className="ab-selected-copy"><strong>{character.data.readings[0]}</strong>
              <span>{assemblyMeaning(character, true)}</span></span>
            <span className="ab-builder-action">{builderOpen ? 'Close builder' : 'Open builder'} <ChevronDown size={16} aria-hidden="true"/></span>
          </button>
          {directoryToggle}
        </div>}
        <div id="ab-builder" hidden={!showBuilder}>
        {showBuilder && <>
        <header className="ab-board-head">
          <div className="ab-character-copy">
            <div className="ab-character-reading">
              <h3>{character.data.readings.join(' / ') || glyph}</h3>
              {character.level && <small>{hskText(character)}</small>}
            </div>
            <p>{assemblyMeaning(character) || 'Meaning unavailable'}</p>
          </div>
          {character.parts.length > 0 && <button type="button" className="ab-split" aria-expanded={split} aria-controls="ab-drawing"
            onClick={() => setSplit(!split)}><ChevronsLeftRight size={18}/>{split ? 'Join' : 'Split'}</button>}
        </header>
        {outOfScope && <p className="ab-outside">Outside the selected HSK range. <button type="button" onClick={widen}>Show all HSK levels</button></p>}
        <div id="ab-drawing">
          <AssemblyDrawing character={character} selected={selected} split={split} onSplit={setSplit} onPart={pin}/>
        </div>
        {character.parts.length ? <>
          <ul className="ab-parts" aria-label="Parts of this hanzi">
            {character.parts.map(candidate => {
              const {id, glyph, positions} = candidate;
              return <li key={id}>
                {index.families.has(glyph) ? <button type="button" aria-pressed={selected === glyph}
                  onClick={() => pin(glyph)} aria-label={'Pin ' + glyph + ' · ' + labelPosition(positions[0])}>
                  <span className="ab-hanzi ab-part-glyph" lang="zh-Hans">{glyph}</span><span>{labelPosition(positions[0])}</span>
                  {selected === glyph && <Pin size={14} aria-hidden="true"/>}
                </button> : <span className="ab-unknown">{glyph === '？' ? 'Unresolved part' : glyph}</span>}
              </li>;
            })}
          </ul>
          {clue && <p className="ab-clue">{clue}</p>}
          {nested?.via && <p className="ab-part-note"><span lang="zh-Hans">{selected}</span> is inside <button type="button"
            onClick={() => selectHanzi(nested.via!, selected)} lang="zh-Hans">{nested.via}</button> · {labelPosition(nested.positions[0])}</p>}
        </> : <div className="ab-atomic">
          <p>No breakdown is indexed for this character.</p>
          {index.families.has(glyph) && <button type="button" onClick={() => openFamily(glyph)}>Find <span lang="zh-Hans">{glyph}</span> in other characters</button>}
        </div>}
        {latest && <p className="ab-changed" role="status"><span lang="zh-Hans">{latest.from} → {latest.to}</span> · kept <span lang="zh-Hans">{latest.kept}</span></p>}
        {swaps.length > 0 && <section className="ab-swaps" aria-label="Swap a part">
          <header><h4>Swap a part</h4><span>Keep <b lang="zh-Hans">{selected}</b></span></header>
          <ul className="ab-swap-tray">
            {swaps.map(({character, operand, position}) => {
              const result = character.data.hanzi;
              const newPart = assemblyOperandText(operand);
              const label = 'Swap ' + position + ' for ' + newPart + ' to make ' + result;
              return <li key={result + position}><button type="button" onClick={() => replacePart(character)} aria-label={label}>
                <span className="ab-hanzi" lang="zh-Hans">{newPart}<ArrowRight size={13}/><b>{result}</b></span>
                <small>{character.data.readings[0]} · {assemblyMeaning(character, true)}</small>
              </button></li>;
            })}
          </ul>
        </section>}
        {useExamples[glyph] && <details className="ab-usage" key={glyph}>
          <summary>See <span lang="zh-Hans">{glyph}</span> in use</summary>
          <ul>{useExamples[glyph].map(example => <li key={example.hanzi}>
            <span className="ab-hanzi" lang="zh-Hans">{example.hanzi}</span>
            <span>{example.pinyin} · {example.meaning}</span>
          </li>)}</ul>
        </details>}
        <div className="ab-board-foot">
          <div className="ab-board-links">
            <button type="button" onClick={() => showWords(glyph)}>Words with <span lang="zh-Hans">{glyph}</span><ArrowRight size={15}/></button>
            <button type="button" className="ab-jump-family" onClick={focusFamily}>View family <ArrowRight size={15}/></button>
          </div>
          <div className="ab-samples" aria-label="Example characters">
            {['挤', '森', '问', '然'].map(sample => <button type="button" lang="zh-Hans" className="ab-hanzi" key={sample}
              aria-label={'Build ' + sample} aria-pressed={glyph === sample} onClick={() => selectHanzi(sample)}>{sample}</button>)}
          </div>
        </div>
        </>}
        </div>
      </section>
      {familyFirst && directory && <div className="ab-browse-panel">
        {findForm}
        {searchError}
        {seeds}
        {directoryContents}
      </div>}
      <FamilyPanel key={familyKey} index={index} current={current} select={chooseMember}
        scope={scope} owner={owner} layout={familyLayout} setLayout={setFamilyLayout}/>
    </div>
  </section>;
}
