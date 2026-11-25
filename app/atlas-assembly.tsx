'use client';

import {useEffect, useMemo, useRef, useState, type FormEvent} from 'react';
import {ArrowLeft, ArrowRight, ChevronDown, ChevronsLeftRight, Grid2X2, List, Pin, Search, SquareSplitVertical, Volume2} from 'lucide-react';
import {assemblyFamilySections, assemblyPresets, assemblySeeds, defaultAssemblyHanzi, findAssemblySeed} from './atlas-assembly-families';
import {AssemblyDrawing, AssemblyThumbnail} from './atlas-assembly-glyph';
import {
  assemblyFamily, assemblyIndex, assemblyMeaning, assemblyOperandText, assemblyPositions, assemblySwaps, assemblyTrail, isAssemblyGlyph,
  type AssemblyCharacter, type FamilyMember, type Position,
} from './atlas-assembly-model';
import {playRecording, releaseRecording} from './audio';
import {useI18n} from './i18n';
import {browseInScope, type BrowseScope} from './hsk-scope';
import {type BuildDisplay} from './atlas-build-view';
import {PositionParts, partsLayouts, partsLayoutStorage, type PartsLayout} from './atlas-position-parts';
import {positionPartsCopy} from './atlas-position-parts-copy';
import './atlas-assembly.css';

type BuildSelection = {hanzi: string; part: string};
type FamilyData = ReturnType<typeof assemblyIndex>;
const useExamples: Partial<Record<string, {hanzi: string; pinyin: string; meaning: string}[]>> = {
  打: [{hanzi: '打球', pinyin: 'dǎ qiú', meaning: 'play ball'}],
  拉: [{hanzi: '拉门', pinyin: 'lā mén', meaning: 'pull the door'}],
  推: [{hanzi: '推门', pinyin: 'tuī mén', meaning: 'push the door'}],
  找: [{hanzi: '找人', pinyin: 'zhǎo rén', meaning: 'look for someone'}],
  拿: [{hanzi: '拿手机', pinyin: 'ná shǒujī', meaning: 'pick up the phone'}],
  拳: [{hanzi: '拳头', pinyin: 'quántou', meaning: 'fist'}],
  掌: [{hanzi: '手掌', pinyin: 'shǒuzhǎng', meaning: 'palm of the hand'}],
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

type Placement = {form: string; position: Position; members: FamilyMember[]};
const handSamples = Array.from('打拉推找抱抓拍提接把挤指搬按拿拳掌');
const positionPageSize = 50;
const handSentence = '/atlas/audio/hand-positions-sentence.mp3';
const handComparisonCopy = {
  en: {title: 'Two hand forms in one sentence', left: 'Left · 3 strokes', bottom: 'Bottom · 4 strokes',
    listen: 'Listen to the sentence', retry: 'Audio could not play. Try again.', translation: ''},
  fr: {title: 'Deux formes de la main dans une phrase', left: 'À gauche · 3 traits', bottom: 'En bas · 4 traits',
    listen: 'Écouter la phrase', retry: 'Lecture impossible. Réessayez.', translation: 'Je prends mon téléphone et j’appelle ma mère.'},
  ru: {title: 'Две формы компонента «рука» в одном предложении', left: 'Слева · 3 черты', bottom: 'Внизу · 4 черты',
    listen: 'Послушать предложение', retry: 'Не удалось воспроизвести запись. Попробуйте ещё раз.', translation: 'Я беру телефон и звоню маме.'},
  tr: {title: 'Bir cümlede el bileşeninin iki biçimi', left: 'Solda · 3 çizgi', bottom: 'Altta · 4 çizgi',
    listen: 'Cümleyi dinle', retry: 'Ses çalınamadı. Tekrar deneyin.', translation: 'Telefonumu alıp annemi arıyorum.'},
};
const handComparison = [
  {hanzi: '打', part: '扌', position: 'left', expression: '打电话', pinyin: 'dǎ diànhuà', meaning: 'make a phone call'},
  {hanzi: '拿', part: '手', position: 'bottom', expression: '拿起手机', pinyin: 'náqǐ shǒujī', meaning: 'pick up the phone'},
] as const;

function placeFamily(members: FamilyMember[], position: BuildDisplay['position']) {
  const placements = new Map<string, Placement>();
  for (const member of members) {
    const seen = new Set<string>();
    for (const occurrence of member.occurrences) {
      if (position !== 'all' && !occurrence.positions.includes(position)) continue;
      const place = position === 'all' ? occurrence.positions[0] : position;
      if (!place) continue;
      const key = occurrence.glyph + ':' + place;
      if (seen.has(key)) continue;
      seen.add(key);
      const group = placements.get(key) ?? {form: occurrence.glyph, position: place, members: []};
      group.members.push(member);
      placements.set(key, group);
    }
  }
  return [...placements.values()].sort((a, b) =>
    b.members.length - a.members.length || assemblyPositions.indexOf(a.position) - assemblyPositions.indexOf(b.position));
}

function HandForms() {
  return <div className="ab-hand-forms">
    <div className="ab-hand-comparison">
      <div><span className="ab-hanzi" lang="zh-Hans">手</span><p><strong>Full form</strong><small>shǒu · 4 strokes</small></p></div>
      <ArrowRight size={21} aria-hidden="true"/>
      <div><span className="ab-hanzi" lang="zh-Hans">扌</span><p><strong>Left-side form</strong><small>3 strokes</small></p></div>
    </div>
    <p className="ab-hand-rule">On the left, compact <span lang="zh-Hans">扌</span> often hints at a hand action.
      At the bottom in <span lang="zh-Hans">拿、拳、掌</span>, <span lang="zh-Hans">手</span> keeps its four strokes.</p>
  </div>;
}

function HandSentence({index, highlight}: {index: FamilyData; highlight: boolean}) {
  const {locale} = useI18n();
  const copy = handComparisonCopy[locale];
  const audio = useRef<HTMLAudioElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => () => { if (audio.current) releaseRecording(audio.current); }, []);
  function handInk({hanzi, part, position}: typeof handComparison[number]) {
    const character = index.characters.get(hanzi);
    return character ? <AssemblyThumbnail character={character}
      active={piece => highlight && piece.glyph === part && piece.positions.includes(position)}/> :
      <span className="ab-thumbnail ab-hanzi" lang="zh-Hans">{hanzi}</span>;
  }

  return <section className="ab-hand-sentence" aria-labelledby="ab-hand-sentence-title">
    <header>
      <h4 id="ab-hand-sentence-title">{copy.title}</h4>
      <button type="button" aria-label={copy.listen} onClick={() => {
        setFailed(false);
        audio.current = playRecording(handSentence, () => setFailed(true));
      }}><Volume2 size={17} aria-hidden="true"/> {copy.listen}</button>
    </header>
    <p className="ab-hand-sentence-text ab-hanzi" lang="zh-Hans">
      我{handInk(handComparison[1])}起手机，给妈妈{handInk(handComparison[0])}电话。
    </p>
    <p lang="zh-Latn-pinyin">Wǒ náqǐ shǒujī, gěi māma dǎ diànhuà.</p>
    <p lang="en">I pick up my phone and call my mum.</p>
    {copy.translation && <p lang={locale}>{copy.translation}</p>}
    {failed && <p role="status">{copy.retry}</p>}
    <ul aria-label={copy.title}>{handComparison.map(example => {
      const {hanzi, part, position, expression, pinyin, meaning} = example;
      return <li key={hanzi} data-hand-contrast={hanzi}>
        {handInk(example)}
        <div>
          <small><span lang="zh-Hans">{part}</span> · {copy[position]}</small>
          <strong lang="zh-Hans">{expression}</strong>
          <span lang="zh-Latn-pinyin">{pinyin}</span>
          <span lang="en">{meaning}</span>
        </div>
      </li>;
    })}</ul>
  </section>;
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

function FamilyPanel({index, current, select, scope, owner, display, updateDisplay, showWords}: {
  index: FamilyData; current: BuildSelection; select: (member: FamilyMember, part?: string) => void;
  scope: BrowseScope; owner: string | null; display: BuildDisplay;
  updateDisplay: (patch: Partial<BuildDisplay>) => void; showWords: (hanzi: string) => void;
}) {
  const {locale, t} = useI18n();
  const {position, nested, highlight} = display;
  const layout = !current.part && display.layout === 'positions' ? 'grid' : display.layout;
  const resultsRoot = useRef<HTMLDivElement>(null);
  const [outlines, setOutlines] = useState<ReadonlySet<string>>(() => new Set());
  const [positionPages, setPositionPages] = useState<Record<string, number>>({});
  const [partsLayout, setPartsLayout] = useState<PartsLayout>('beside');
  const [partsOpen, setPartsOpen] = useState(false);
  const partsToggle = useRef<HTMLButtonElement>(null);
  const copy = positionPartsCopy;
  const character = index.characters.get(current.hanzi);
  const showParts = layout === 'positions' && character && (partsLayout !== 'popup' || partsOpen);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(partsLayoutStorage);
      if (partsLayouts.some(option => option === stored)) setPartsLayout(stored as PartsLayout);
    } catch { /* Study layout still works when storage is unavailable. */ }
  }, []);

  function changePartsLayout(next: PartsLayout) {
    setPartsLayout(next);
    setPartsOpen(true);
    try {localStorage.setItem(partsLayoutStorage, next);} catch { /* Optional preference. */ }
  }

  function closeParts() {
    setPartsOpen(false);
    partsToggle.current?.focus({preventScroll: true});
  }
  const seed = findAssemblySeed(current.part);
  const hand = seed?.part === '扌';
  const form = seed?.forms.includes(display.form) || display.form === current.part ? display.form : '';
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
  const placements = useMemo(() => layout === 'positions' && current.part ? placeFamily(visible, position) : [],
    [layout, current.part, visible, position]);
  const example = useExamples[current.hanzi]?.[0];

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
  }, [visible, layout, form, position, positionPages, current.hanzi]);

  function memberTile(member: FamilyMember, placement?: Placement) {
    const {character, occurrences} = member;
    const hanzi = character.data.hanzi;
    const matching = occurrences.filter(match => matchesPosition(match) &&
      (!placement || match.glyph === placement.form &&
        (position === 'all' ? match.positions[0] === placement.position : match.positions.includes(placement.position))));
    const places = placement ? [placement.position] : Array.from(new Set(matching.map(match => match.positions[0])));
    const isActive = (part: AssemblyCharacter['parts'][number]) =>
      (layout !== 'positions' || highlight) && matching.some(match => !match.via && match.glyph === part.glyph) &&
      (placement && position === 'all' ? part.positions[0] === placement.position
        : position === 'all' || part.positions.includes(position));
    const reading = character.data.readings[0];
    const meaning = assemblyMeaning(character, true);
    const fullMeaning = assemblyMeaning(character);
    const metadata = [places.map(labelPosition).join(' / '), hskText(character)].filter(Boolean).join(' · ');
    return <li key={hanzi} data-outline={hanzi}>
      <button type="button" aria-pressed={current.hanzi === hanzi}
        aria-label={[hanzi, reading, placement ? fullMeaning : meaning, metadata].filter(Boolean).join(' · ')}
        onClick={() => {
          select(member, placement?.form ?? matching.find(match => match.glyph === current.part)?.glyph ?? matching[0]?.glyph);
          if (layout === 'positions') setPartsOpen(true);
        }}>
        {outlines.has(hanzi) ? <AssemblyThumbnail character={character} active={isActive}/> :
          <span className="ab-thumbnail ab-hanzi" lang="zh-Hans">{hanzi}</span>}
        <span className="ab-result-copy">
          <strong>{reading || '—'}</strong>
          <span className="ab-gloss" title={fullMeaning}>{meaning || '—'}</span>
          {layout === 'list' && metadata && <small>{metadata}</small>}
        </span>
      </button>
    </li>;
  }

  return <aside id="ab-component-family" className="ab-panel ab-family" aria-label="Component family" tabIndex={-1}>
    <header className="ab-family-head">
      <div>
        <h3>{current.part ? <><span className="ab-family-glyph ab-hanzi" lang="zh-Hans">{seed?.part ?? current.part}</span>
          {seed ? seed.label + ' family' : 'Shared part'}</> : 'All hanzi'}</h3>
        <p className="ab-result-count" role="status">{visible.length.toLocaleString()} {visible.length === 1 ? 'character' : 'characters'}{position !== 'all' ? ' · ' + labelPosition(position) : ''}</p>
      </div>
      <div className="ab-layout-toggle" role="group" aria-label="Family layout">
        <button type="button" aria-label="Grid" title="Grid" aria-pressed={layout === 'grid'} onClick={() => updateDisplay({layout: 'grid'})}><Grid2X2 size={16}/></button>
        <button type="button" aria-label="List" title="List" aria-pressed={layout === 'list'} onClick={() => updateDisplay({layout: 'list'})}><List size={17}/></button>
        {current.part && <button type="button" className="ab-positions-toggle" title="Group by position" aria-pressed={layout === 'positions'}
          onClick={() => updateDisplay({layout: 'positions'})}><SquareSplitVertical size={17} aria-hidden="true"/>Positions</button>}
      </div>
    </header>
    {current.part && <div className="ab-family-tools">
      {seed && seed.forms.length > 1 && <select aria-label="Component form" value={form}
        onChange={event => updateDisplay({form: event.target.value, position: 'all'})}>
        <option value="">All forms</option>
        {seed.forms.map(glyph => <option lang="zh-Hans" key={glyph}>{glyph}</option>)}
      </select>}
      <select aria-label="Component position" value={position}
        onChange={event => updateDisplay({position: event.target.value as typeof position})}>
        <option value="all">Any position</option>
        {visiblePositions.map(region => <option value={region} key={region}>{labelPosition(region)}</option>)}
      </select>
      <label className="ab-nested"><input type="checkbox" checked={nested}
        onChange={event => updateDisplay({nested: event.target.checked, position: 'all'})}/> Include nested parts</label>
      {layout === 'positions' && <button type="button" aria-pressed={highlight}
        onClick={() => updateDisplay({highlight: !highlight})}>{highlight ? 'Hide shared strokes' : 'Reveal shared strokes'}</button>}
      <details className="ab-family-notes">
        <summary>Notes</summary>
        {seed?.note && <p className="ab-family-note">{seed.note}</p>}
        {layout === 'positions' && hand && <details className="ab-hand-reference">
          <summary>{copy.examplePanel[locale]}</summary>
          <HandForms/><HandSentence index={index} highlight={highlight}/>
        </details>}
        <MemoryCue owner={owner} family={seed?.part ?? current.part} key={owner + ':' + (seed?.part ?? current.part)}/>
      </details>
      {layout === 'positions' && <label className="ab-parts-layout-label">
        {copy.layout[locale]}
        <select aria-label={copy.layout[locale]} value={partsLayout}
          onChange={event => changePartsLayout(event.target.value as PartsLayout)}>
          {partsLayouts.map(option => <option value={option} key={option}>{copy[option][locale]}</option>)}
        </select>
      </label>}
      {layout === 'positions' && partsLayout === 'popup' && character &&
        <button type="button" ref={partsToggle} aria-expanded={partsOpen} aria-controls={partsOpen ? 'ab-position-breakdown' : undefined}
          onClick={() => partsOpen ? closeParts() : setPartsOpen(true)}>{copy.title[locale]}</button>}
    </div>}
    <div className="ab-position-workspace" data-parts-layout={layout === 'positions' ? partsLayout : undefined}>
    {visible.length > 0 ? <div ref={resultsRoot}>
      {placements.length ? <div className={'ab-positions' + (hand && placements.length > 1 ? ' ab-hand-groups' : '')}>
        {placements.map(group => {
          const full = position === group.position && form === group.form;
          const order = hand && !full ? [...group.members].sort((a, b) => {
            const rank = (member: FamilyMember) => {
              const i = handSamples.indexOf(member.character.data.hanzi);
              return i < 0 ? handSamples.length : i;
            };
            return rank(a) - rank(b);
          }) : group.members;
          const key = [scope, seed?.part ?? current.part, form, position, nested, group.form, group.position].join(':');
          const lastPage = Math.ceil(order.length / positionPageSize) - 1;
          const selectedPage = Math.max(0, Math.floor(order.findIndex(member => member.character.data.hanzi === current.hanzi) / positionPageSize));
          const page = Math.min(lastPage, positionPages[key] ?? selectedPage);
          const start = page * positionPageSize;
          const end = Math.min(start + positionPageSize, order.length);
          const number = (value: number) => value.toLocaleString(locale);
          const changePage = (next: number) => setPositionPages(previous => ({...previous, [key]: next}));
          return <section className="ab-position-group" key={group.form + group.position}
            aria-label={group.form + ' · ' + labelPosition(group.position)}>
            <header><h4><span className="ab-hanzi" lang="zh-Hans">{group.form}</span> {labelPosition(group.position)}</h4>
              <span>{number(order.length)}</span></header>
            {lastPage > 0 && <div className="ab-position-pages">
              <button type="button" disabled={page === 0} onClick={() => changePage(page - 1)}>{t('Previous')}</button>
              <span role="status">{number(start + 1)}–{number(end)} / {number(order.length)}</span>
              <button type="button" disabled={page === lastPage} onClick={() => changePage(page + 1)}>{t('Next')}</button>
            </div>}
            <ul className="ab-family-results ab-grid">{order.slice(start, end).map(member => memberTile(member, group))}</ul>
          </section>;
        })}
      </div> : <ul className={'ab-family-results ab-' + (layout === 'list' ? 'list' : 'grid')}>
        {visible.map(member => memberTile(member))}
      </ul>}
    </div> : <p className="ab-empty">No characters match these filters in this HSK range.</p>}
    {showParts && character && <PositionParts key={current.hanzi} character={character} characters={index.characters}
      familyPart={current.part} example={example} scope={scope} close={partsLayout === 'popup' ? closeParts : undefined} showWords={showWords}/>}
    </div>
  </aside>;
}

export default function AtlasAssembly({hanzi, part, scope, owner, display, onDisplayChange, onBuilderToggle, onBack, onSelect, showWords, widen}: {
  hanzi?: string; part?: string; scope: BrowseScope; owner: string | null; display: BuildDisplay;
  onDisplayChange: (display: BuildDisplay) => void; onSelect: (selection: BuildSelection, display: BuildDisplay) => void;
  onBuilderToggle: (open: boolean) => void; onBack?: () => void;
  showWords: (hanzi: string) => void; widen: () => void;
}) {
  const {locale} = useI18n();
  const index = useMemo(() => assemblyIndex(locale), [locale]);
  const layoutRoot = useRef<HTMLDivElement>(null);
  const boardRoot = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [split, setSplit] = useState(false);
  const {directory} = display;
  const familyFirst = Boolean(part && index.families.has(part)) || display.layout === 'positions' || display.builder === false;
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
  const showBuilder = display.builder ?? !familyFirst;
  const swaps = showBuilder ? assemblySwaps(index, character, selected, scope) : [];
  const outOfScope = scope !== 'all' && !!character.level && !browseInScope(character.level, scope);
  const seed = findAssemblySeed(selected);
  const familyKey = seed?.part ?? selected;
  const trail = assemblyTrail(index, character, selected, display.inspect);
  const branch = trail.at(-1);
  const child = branch?.parts.find(piece => piece.glyph === display.inspected)?.glyph;
  const path = trail.map(piece => piece.data.hanzi).join('');
  const canContinue = !!child && assemblyTrail(index, character, selected, path + child).length > trail.length;
  const availableBreakdown = !branch && assemblyTrail(index, character, selected, selected).length > 0;
  const nestedMatches = selected ? index.families.get(selected)?.find(member => member.character === character)?.occurrences ?? [] : [];
  const nested = !character.parts.some(candidate => candidate.glyph === selected) ? nestedMatches.find(match => match.via) : undefined;
  const latest = change?.to === glyph && change.kept === selected ? change : undefined;
  const clue = glyph === '挤' && selected === '扌' ? 'The hand form hints at pushing or squeezing.'
    : ['挤', '济', '剂'].includes(glyph) && selected === '齐' ? '齐 gives a sound clue. Compare jǐ and jì.'
    : glyph === '让' && selected === '讠' ? '讠 is the simplified speech form. Compare 说, 讲 and 请.' : '';

  function updateDisplay(patch: Partial<BuildDisplay>) {
    onDisplayChange({...display, ...patch});
  }

  function selectHanzi(hanzi: string, part?: string, closeDirectory = false, inspect = false) {
    const next = index.characters.get(hanzi);
    if (!next) return;
    const fallback = next.parts.find(candidate => index.families.has(candidate.glyph))?.glyph ?? '';
    const selectedPart = part ?? fallback;
    const sameFamily = (findAssemblySeed(selectedPart)?.part ?? selectedPart) === familyKey;
    const nextDisplay = {...display, builder: showBuilder ? true : display.builder,
      ...(!sameFamily && {form: '', position: 'all' as const, nested: false}),
      ...(!selectedPart && {layout: 'grid' as const}),
      ...(closeDirectory && {directory: false, builder: false}),
      inspect: inspect && assemblyTrail(index, next, selectedPart, selectedPart).length ? selectedPart : undefined,
      inspected: undefined};
    onSelect({hanzi, part: selectedPart}, nextDisplay);
    setError('');
    setChange(undefined);
  }

  function openFamily(part: string) {
    if (!part) {
      selectHanzi(glyph, '', true);
      showFamilyOverview();
      return;
    }
    const first = firstFamilyMember(index, part, scope, character);
    if (!first) return;
    if (selected !== part) selectHanzi(first.character.data.hanzi,
      first.occurrences.find(match => match.glyph === part)?.glyph ?? first.occurrences[0]?.glyph ?? part, true);
    else updateDisplay({directory: false, builder: false, inspect: undefined, inspected: undefined});
    showFamilyOverview();
  }

  function showFamilyOverview() {
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
      selectHanzi(text, undefined, true);
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
    if (index.families.has(glyph)) selectHanzi(current.hanzi, glyph, false, true);
  }

  function replacePart(next: AssemblyCharacter) {
    onSelect({hanzi: next.data.hanzi, part: selected}, {...display, inspect: undefined, inspected: undefined});
    setChange({from: glyph, to: next.data.hanzi, kept: selected});
    setSplit(false);
  }

  const findForm = <form className="ab-find" onSubmit={find}>
    <input type="search" aria-label="Find hanzi or a part" placeholder="Find hanzi or a part" value={query}
      onChange={event => { setQuery(event.target.value); setError(''); }} maxLength={20} enterKeyHint="search" autoComplete="off"/>
    <button type="submit" aria-label="Find"><Search size={18}/></button>
  </form>;
  const directoryToggle = <button type="button" className="ab-browse-toggle" aria-expanded={directory} aria-controls="ab-directory"
    onClick={() => { updateDisplay({directory: !directory}); setError(''); }}>
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
  const back = onBack && <button type="button" className="ab-back" aria-label="Back in Atlas" onClick={onBack}>
    <ArrowLeft size={16} aria-hidden="true"/>Back
  </button>;

  return <section className={'ab' + (familyFirst ? ' ab-overview' : '') + (display.layout === 'positions' ? ' ab-by-position' : '')} aria-label="Build hanzi">
    {familyFirst ? <h2 className="ab-visually-hidden">Build hanzi</h2> : <>
      <header className="ab-header">
        <div><h2>Build hanzi</h2><p>Split a character, pin a part and see where else it appears.</p></div>
        {back}
        {findForm}
      </header>
      {searchError}
      {seeds}
      {directoryContents}
    </>}
    <div ref={layoutRoot} className="ab-columns">
      <section ref={boardRoot} className="ab-panel ab-board" aria-label="Character builder" tabIndex={-1} data-character={glyph}>
        {familyFirst && <div className="ab-selected-strip">
          {back}
          <button type="button" className="ab-builder-toggle" aria-expanded={showBuilder} aria-controls="ab-builder"
            onClick={() => onBuilderToggle(!showBuilder)}>
            <span lang="zh-Hans" className="ab-hanzi ab-selected-glyph">{glyph}</span>
            <span className="ab-selected-copy"><strong>{character.data.readings[0]}</strong>
              <span>{assemblyMeaning(character, true)}</span></span>
            <span className="ab-builder-action">{showBuilder ? 'Back to family' : 'Open builder'} <ChevronDown size={16} aria-hidden="true"/></span>
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
          <div className="ab-board-actions">
            {!familyFirst && <button type="button" className="ab-back" onClick={() => onBuilderToggle(false)}>
              <ArrowLeft size={16} aria-hidden="true"/>Back to family
            </button>}
            {character.parts.length > 0 && <button type="button" className="ab-split" aria-expanded={split} aria-controls="ab-drawing"
              onClick={() => setSplit(!split)}><ChevronsLeftRight size={18}/>{split ? 'Join' : 'Split'}</button>}
          </div>
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
        {availableBreakdown && <button type="button" className="ab-explore-part"
          onClick={() => updateDisplay({inspect: selected, inspected: undefined})}>
          Explore parts of <span lang="zh-Hans">{selected}</span> <ArrowRight size={15} aria-hidden="true"/>
        </button>}
        {branch && <section className="ab-component-detail" aria-label={'Parts of ' + branch.data.hanzi}>
          <nav aria-label="Component path">
            <button type="button" lang="zh-Hans" aria-label={'Return to ' + glyph}
              onClick={() => updateDisplay({inspect: undefined, inspected: undefined})}>{glyph}</button>
            {trail.map((piece, index) => <span key={piece.data.hanzi} className="ab-component-crumb">
              <ArrowRight size={13} aria-hidden="true"/>
              {piece === branch ? <span lang="zh-Hans" aria-current="location">{piece.data.hanzi}</span> :
                <button type="button" lang="zh-Hans" aria-label={'Return to ' + piece.data.hanzi}
                  onClick={() => updateDisplay({inspect: trail.slice(0, index + 1).map(item => item.data.hanzi).join(''), inspected: undefined})}>{piece.data.hanzi}</button>}
            </span>)}
          </nav>
          <div className="ab-component-body">
            <AssemblyThumbnail character={branch} active={piece => piece.glyph === child}/>
            <div>
              <h4>Parts of <span lang="zh-Hans">{branch.data.hanzi}</span></h4>
              {branch.data.hanzi === '齐' && <p>Written shape · <span lang="zh-Hans">文</span> above <span lang="zh-Hans">丿、丨</span>.</p>}
              <div className="ab-component-choices" role="group" aria-label="Parts in this component">
                {branch.parts.filter(piece => isAssemblyGlyph(piece.glyph)).map(piece =>
                  <button type="button" key={piece.id} aria-pressed={piece.glyph === child}
                    onClick={() => updateDisplay({inspected: piece.glyph})}>
                    <span className="ab-hanzi" lang="zh-Hans">{piece.glyph}</span> {labelPosition(piece.positions[0])}
                  </button>)}
              </div>
              {canContinue && <button type="button" className="ab-explore-part"
                onClick={() => updateDisplay({inspect: path + child, inspected: undefined})}>
                Explore parts of <span lang="zh-Hans">{child}</span> <ArrowRight size={15} aria-hidden="true"/>
              </button>}
            </div>
          </div>
        </section>}
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
        scope={scope} owner={owner} display={display} updateDisplay={updateDisplay} showWords={showWords}/>
    </div>
  </section>;
}
