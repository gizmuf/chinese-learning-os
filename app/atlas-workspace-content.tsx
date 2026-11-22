'use client';

import {createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject} from 'react';
import {ArrowDown, ArrowLeft, ArrowRight, AudioLines, BookOpen, PenLine, Volume2} from 'lucide-react';
import {WordFamilyBoard, type FamilyBoardCopy} from './word-family-board';
import {familyColumns} from './word-family-model';
import {SharedText} from './word-family-text';
import type {CloudWord} from './atlas-cloud-model';
import type {JourneyGroup} from './family-journey-model';
import type {Locale} from './translate';
import type {Pronunciation} from './atlas-spatial-model';
import {recognitionQuestions, checkRecognition, wordPronunciation} from './atlas-spatial-model';
import {playRecording, releaseRecording} from './audio';
import {StudyLookupButton, StudyText, useStudyLookup} from './study-lookup-context';
import {workspaceBoardSize, workspaceGroupLabel, workspaceHanzi, workspaceJourneyGroup, workspaceMapSize, workspacePanelOutsideScope, workspaceScopeLabel, workspaceStructureRole, type WorkspaceContext} from './atlas-workspace-model';
import type {WorkspaceKind, WorkspaceRoute} from './atlas-workspace-route';
import {hybridInventory} from './atlas-hybrid-model';
import CloudHighlight from './atlas-cloud-highlight';
import AtlasFamilyStudyActions, {atlasWordStudyEntries} from './atlas-family-study-actions';
import WordFamilyReels from './word-family-reels';
import FamilyPracticeLab from './family-practice-lab';
import {familyContrastPairs} from './family-practice-lab-model';
import Guided from './guided';
import {isStoryTarget, type StoryTarget} from './atlas-story-explorer-model';
import './word-families.css';

type Choose = (word: CloudWord) => void;
type Explore = (text: string, kind: WorkspaceKind) => void;
export const boardCopy: FamilyBoardCopy = {all: 'Family members', word: 'Hanzi', pinyin: 'Pinyin', meaning: 'Meaning'};

type ReadingHints = {pinyin: boolean; english: boolean};
const visibleReadingHints: ReadingHints = {pinyin: true, english: true};
const ReadingHintsContext = createContext<{hints: ReadingHints; active: boolean; change: (next: ReadingHints) => void} | null>(null);
const useReadingHints = () => useContext(ReadingHintsContext)?.hints ?? visibleReadingHints;

function restoreReadingHints(key: string): ReadingHints {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null');
    return {pinyin: typeof value?.pinyin === 'boolean' ? value.pinyin : true,
      english: typeof value?.english === 'boolean' ? value.english : true};
  } catch {return visibleReadingHints;}
}

export function WorkspaceReadingProvider({active, owner, root, embedded = false, children}: {
  active: boolean; owner: string | null; root: RefObject<HTMLElement | null>; embedded?: boolean; children: ReactNode;
}) {
  const key = 'chinese-os:atlas-reading-hints:v1:' + (owner ?? 'guest');
  const restored = useMemo(() => restoreReadingHints(key), [key]);
  const [saved, setSaved] = useState(() => ({key, hints: restored}));
  const hints = active ? saved.key === key ? saved.hints : restored : visibleReadingHints;
  function change(next: ReadingHints) {
    setSaved({key, hints: next});
    try {localStorage.setItem(key, JSON.stringify(next));} catch { /* Display preferences also work without storage. */ }
  }
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const topbar = embedded ? null : document.querySelector<HTMLElement>('.app-shell .topbar');
    const measure = () => node.style.setProperty('--aw-sticky-header', (topbar?.getBoundingClientRect().height ?? 0) + 'px');
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (topbar) observer?.observe(topbar);
    return () => observer?.disconnect();
  }, [root, embedded]);
  return <ReadingHintsContext.Provider value={{hints, active, change}}>{children}</ReadingHintsContext.Provider>;
}

function WorkspaceReadingControls({locale}: {locale: Locale}) {
  const display = useContext(ReadingHintsContext);
  if (!display?.active) return null;
  const translation = {en: 'English', fr: 'Français', ru: 'Русский', tr: 'Türkçe'}[locale];
  return <div className="aw-reading-controls" role="group" aria-label="Reading hints">
    <button type="button" aria-pressed={display.hints.pinyin} onClick={() => display.change({...display.hints, pinyin: !display.hints.pinyin})}>Pinyin</button>
    <button type="button" aria-pressed={display.hints.english} onClick={() => display.change({...display.hints, english: !display.hints.english})}>{translation}</button>
  </div>;
}

export function workspaceColumns(words: CloudWord[], anchor: string) {
  const columns = familyColumns(words, anchor);
  return {
    '--wf-before': columns.before, '--wf-anchor': Math.max(1, columns.anchor),
    '--wf-after': columns.after, '--wf-letters': columns.before + Math.max(1, columns.anchor) + columns.after,
  } as CSSProperties;
}

export function WorkspacePager({page, size, total, onPage}: {page: number; size: number; total: number; onPage: (page: number) => void}) {
  if (total <= size) return null;
  const last = Math.ceil(total / size) - 1;
  const current = Math.min(page, last);
  return <nav className="aw-pager" aria-label="Results pages">
    <button type="button" disabled={current === 0} onClick={() => onPage(current - 1)}><ArrowLeft size={16}/> Previous</button>
    <span>{current * size + 1}–{Math.min((current + 1) * size, total)} of {total}</span>
    <button type="button" disabled={current >= last} onClick={() => onPage(current + 1)}>Next <ArrowRight size={16}/></button>
  </nav>;
}

function TopicWords({words, selected, choose}: {words: CloudWord[]; selected?: string; choose: Choose}) {
  const hints = useReadingHints();
  return <div className="aw-topic-words">{words.map(word =>
    <button type="button" key={word.id} aria-pressed={word.id === selected} onClick={() => choose(word)} data-word-id={word.id}>
      <strong lang="zh-Hans">{word.hanzi}</strong><span>{hints.pinyin && word.pinyin}</span><span>{hints.english && word.meaning}</span>
    </button>
  )}</div>;
}

export function WorkspaceWordBoard({words, anchor, selected, choose}: {words: CloudWord[]; anchor: string; selected?: string; choose: Choose}) {
  const hints = useReadingHints();
  return anchor
    ? <div className="word-family-lab aw-family-table" style={workspaceColumns(words, anchor)}>
      <WordFamilyBoard words={words} anchor={anchor} selectedId={selected} onChoose={choose} copy={boardCopy} showPinyin={hints.pinyin} showMeaning={hints.english}/>
    </div>
    : <TopicWords words={words} selected={selected} choose={choose}/>;
}

export function WorkspaceStructureBoard({context, route, explore, onPage}: {
  context: WorkspaceContext; route: WorkspaceRoute; explore: Explore; onPage: (page: number) => void;
}) {
  const page = Math.min(route.page, Math.max(0, Math.ceil(context.structural.length / workspaceMapSize) - 1));
  const visible = context.structural.slice(page * workspaceMapSize, (page + 1) * workspaceMapSize);
  return <>
    <div className="aw-structure-board">{visible.map(node => {
      const reading = node.reviewed?.pinyin ?? node.readings.join(' / ');
      const role = workspaceStructureRole(node.hanzi, context.part?.id ?? route.part);
      return <button type="button" key={node.id} aria-pressed={route.kind === 'character' && context.hanzi === node.hanzi}
        aria-label={`${node.hanzi} · ${reading} · ${node.meaning} · ${role}`} title={node.meaning} onClick={() => explore(node.hanzi, 'character')}>
        <CloudHighlight className="aw-structure-glyph" hanzi={node.hanzi} component={context.part?.id}/>
        <span><span>{reading}</span><span>{node.meaning}</span><small>{role}</small></span>
      </button>;
    })}</div>
    <WorkspacePager page={page} size={workspaceMapSize} total={context.structural.length} onPage={onPage}/>
  </>;
}

function WorkspaceStructureScope() {
  return <div className="aw-empty"><p>Includes listed recognition characters and characters used in course words within this scope.</p></div>;
}

function WorkspaceStructureLinks({part, explore}: {part: WorkspaceContext['part']; explore: Explore}) {
  if (part?.id === '莫') return <div className="aw-actions">
    <a href="?atlas=1&studio=1&view=stories">Open the 11 authored stories about <span lang="zh-Hans">莫</span></a>
  </div>;
  if (!part || !['person', '人', '亻'].includes(part.id)) return null;
  return <div className="aw-actions" role="group" aria-label="Person component shapes">
    <button type="button" aria-pressed={part.id === 'person'} onClick={() => explore('person', 'component')}><span lang="zh-Hans">人 / 亻</span> grouped shapes</button>
    {['人', '亻'].map(glyph => <button key={glyph} type="button" aria-pressed={part.id === glyph} onClick={() => explore(glyph, 'component')}>
      <span lang="zh-Hans">{glyph}</span> exact shape
    </button>)}
  </div>;
}

export function WorkspaceBoard({route, context, choose, explore, onPage, onWiden, compact = false}: {
  route: WorkspaceRoute; context: WorkspaceContext; choose: Choose; explore: Explore;
  onPage: (page: number) => void; onWiden: () => void; compact?: boolean;
}) {
  if (route.relation === 'structure') return <section className="aw-panel aw-board" id="aw-family-board" aria-label="Component family">
    <header className="aw-panel-head"><div><p className="aw-relation">Shared component in Hanzi</p>
      <h2><span lang="zh-Hans">{context.part?.variants.join(' / ') ?? route.part}</span> Component family</h2></div>
      <span>{context.structural.length} in {workspaceScopeLabel(route.scope)}</span>
    </header>
    {!compact && <WorkspaceStructureScope/>}
    <AtlasFamilyStudyActions title={context.part?.variants.join(' / ') ?? route.part} entries={context.structural.map(node => ({
      hanzi: node.hanzi, pinyin: node.reviewed?.pinyin ?? node.readings.join(' / '), meaning: node.englishMeaning,
    }))}/>
    {(!compact || context.part?.id !== '莫') && <WorkspaceStructureLinks part={context.part} explore={explore}/>}
    {context.structural.length > 0 ? <WorkspaceStructureBoard route={route} context={context} explore={explore} onPage={onPage}/>
      : <div className="aw-empty"><p>No mapped characters for this component in {workspaceScopeLabel(route.scope)}.</p>
        {route.scope !== 'all' && <button type="button" onClick={onWiden}>Show all vocabulary</button>}</div>}
    {compact && <details className="aw-family-board-notes">
      <summary>About this component family</summary>
      <WorkspaceStructureScope/>
      {context.part?.id === '莫' && <WorkspaceStructureLinks part={context.part} explore={explore}/>}
    </details>}
  </section>;
  const {members} = context;
  const page = Math.min(route.page, Math.max(0, Math.ceil(members.length / workspaceBoardSize) - 1));
  return <section className="aw-panel aw-board" id="aw-family-board" aria-label={route.relation === 'topic' ? 'Study topic' : 'Word family'}>
    <header className="aw-panel-head"><div><p className="aw-relation">{route.relation === 'topic' ? 'Study topic' : 'Whole words sharing Hanzi'}</p>
      <h2>{route.relation === 'topic' ? context.group?.title ?? 'Topic' : <><span lang="zh-Hans">{route.anchor}</span> Word family</>}</h2></div>
      <span>{members.length} {members.length === 1 ? 'entry' : 'entries'} in {workspaceScopeLabel(route.scope)}</span>
    </header>
    {route.relation === 'literal' && members.length > 0 && <AtlasFamilyStudyActions title={route.anchor} entries={atlasWordStudyEntries(members, route.scope)}/>}
    {members.length > 0 ? <WorkspaceWordBoard words={members.slice(page * workspaceBoardSize, (page + 1) * workspaceBoardSize)}
      anchor={route.relation === 'topic' ? '' : route.anchor} selected={context.word?.id} choose={choose}/>
      : <div className="aw-empty"><p>No entries for this selection in {workspaceScopeLabel(route.scope)}.</p>
        {route.scope !== 'all' && <button type="button" onClick={onWiden}>Show all vocabulary</button>}</div>}
    <WorkspacePager page={page} size={workspaceBoardSize} total={members.length} onPage={onPage}/>
  </section>;
}

export function useWorkspaceAudio(notify: (message: string) => void) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState('');
  function stop() {
    const recording = audio.current;
    audio.current = null;
    if (recording) releaseRecording(recording);
    setPlaying('');
  }
  useEffect(() => () => { if (audio.current) releaseRecording(audio.current); }, []);
  function listen(clip?: Pronunciation) {
    if (!clip) return;
    const wasPlaying = playing === clip.source;
    stop();
    if (wasPlaying) return;
    const recording = playRecording(clip.source, message => {
      if (audio.current === recording) stop();
      notify(message);
    });
    audio.current = recording;
    setPlaying(clip.source);
    recording.addEventListener('ended', () => {
      if (audio.current === recording) stop();
    }, {once: true});
    recording.addEventListener('pause', () => {
      if (audio.current !== recording) return;
      audio.current = null;
      setPlaying('');
    }, {once: true});
  }
  return {playing, listen, stop};
}
export type WorkspaceAudio = ReturnType<typeof useWorkspaceAudio>;

function ListenButton({clip, audio, children}: {clip?: Pronunciation; audio: WorkspaceAudio; children?: ReactNode}) {
  if (!clip) return null;
  return <button type="button" aria-pressed={audio.playing === clip.source} onClick={() => audio.listen(clip)}>
    <Volume2 size={16}/>{children ?? (clip.context ? 'Listen · ' + clip.text : 'Listen')}
  </button>;
}

export function WorkspaceInspector({context, route, audio, explore, showFamily, onStory, onWriting, onBuild, chunksHref}: {
  context: WorkspaceContext; route: WorkspaceRoute; audio: WorkspaceAudio; explore: Explore;
  showFamily: (anchor: string) => void; onStory: (target: StoryTarget) => void;
  onWriting: () => void; onBuild?: (hanzi: string) => void; chunksHref: string;
}) {
  const {word, text, reading, meaning, example, pronunciation} = context;
  const hints = useReadingHints();
  const lookup = useStudyLookup();
  const fallback = text ? lookup?.dictionary.get(text) : undefined;
  const sentenceFocus = route.kind === 'sentence';
  const outsideScope = workspacePanelOutsideScope(route, context);
  const letters = workspaceHanzi(text);
  const label = route.kind === 'word' ? 'Word in context' : route.kind === 'sentence' ? 'Sentence in context'
    : route.kind === 'component' ? 'Component in context' : 'Hanzi in context';
  return <aside id="aw-context" className="aw-panel aw-inspector" aria-label="Context inspector" data-atlas-workspace-word={word?.id}>
    <p className="aw-relation">{label}</p>
    {text ? <>
      {!(sentenceFocus && example) && <>
        <div className="aw-inspector-heading">
          <h2 lang="zh-Hans"><SharedText text={text} anchor={route.relation === 'literal' ? route.anchor : ''}/></h2>
          <StudyLookupButton text={text}/>
        </div>
        {hints.pinyin && (reading || fallback?.pinyin) && <p className="aw-reading">{reading ?? fallback?.pinyin}</p>}
        {hints.english && (meaning || fallback?.meaning) && <p className="aw-meaning">{meaning ?? fallback?.meaning}</p>}
        <div className="aw-actions">
          <ListenButton clip={pronunciation} audio={audio}/>
          {!outsideScope && (route.kind === 'word' || route.kind === 'character') && /^[\p{Script=Han}]{1,8}$/u.test(text) &&
            <button type="button" onClick={onWriting}><PenLine size={16}/>Write</button>}
          {isStoryTarget(text) && <button type="button" onClick={() => onStory(text)}><BookOpen size={16}/>Explore story</button>}
        </div>
      </>}
      {outsideScope && <p className="aw-scope-note" role="status">Selected entry is outside {workspaceScopeLabel(route.scope)}.</p>}
      {example && <div className={'aw-example' + (sentenceFocus ? ' aw-selected-example' : '')} data-study-source-id={example.id}
        data-study-sentence={example.text} data-study-pinyin={example.pinyin} data-study-meaning={example.meaning} data-study-audio={example.audio?.source}>
        {!sentenceFocus && <div className="aw-example-title"><strong>In a sentence</strong>
          <button type="button" onClick={() => explore(example.text, 'sentence')} aria-label={'Explore sentence ' + example.text}><ArrowRight size={16}/></button>
        </div>}
        {sentenceFocus
          ? <h2 lang="zh-Hans"><StudyText text={example.text} pinyin={example.pinyin} headword={word?.hanzi} anchor={route.relation === 'literal' ? route.anchor : ''}/></h2>
          : <p lang="zh-Hans"><StudyText text={example.text} pinyin={example.pinyin} headword={word?.hanzi} anchor={route.relation === 'literal' ? route.anchor : ''}/></p>}
        {hints.pinyin && <p className="aw-reading">{example.pinyin}</p>}{hints.english && <p>{example.meaning}</p>}
        <div className="aw-actions">
          <ListenButton clip={example.audio} audio={audio}>Listen to sentence</ListenButton>
          {chunksHref && <a href={chunksHref}>Speaking chunks <ArrowRight size={14}/></a>}
        </div>
      </div>}
      {(route.kind === 'word' || route.kind === 'sentence') && letters.length > 0 &&
        <div className="aw-related"><strong>Hanzi in this {route.kind}</strong>
          <div className="aw-chips">{letters.map(letter => <button key={letter} type="button" lang="zh-Hans" onClick={() => explore(letter, 'character')}>{letter}</button>)}</div></div>}
      {route.kind === 'character' && <div className="aw-related">
        {context.parts.length > 0 && <><strong>Modern components</strong><div className="aw-chips">{context.parts.map(part =>
          <button key={part} type="button" lang="zh-Hans" onClick={() => explore(part, 'component')}>{part}</button>
        )}</div></>}
        {onBuild && <button type="button" onClick={() => onBuild(context.hanzi)}>Build this hanzi <ArrowRight size={14}/></button>}
        <button type="button" onClick={() => showFamily(context.hanzi)}>Words containing <b lang="zh-Hans">{context.hanzi}</b> <ArrowRight size={14}/></button>
      </div>}
      {route.kind === 'component' && context.part && /\p{Script=Han}/u.test(context.part.glyph) &&
        <div className="aw-related"><button type="button" onClick={() => showFamily(context.part!.glyph)}>Words containing <b lang="zh-Hans">{context.part.glyph}</b> <ArrowRight size={14}/></button></div>}
      {chunksHref && !example && route.kind === 'word' && <div className="aw-actions"><a href={chunksHref}>Find speaking chunks <ArrowRight size={14}/></a></div>}
    </> : <p>Choose an entry to see its reading and example.</p>}
  </aside>;
}

export function WorkspaceJourney({route, groups, locale, context, select, openGroup, showWhole, inspector}: {
  route: WorkspaceRoute; groups: JourneyGroup[]; locale: Locale; context: WorkspaceContext;
  select: (word: CloudWord, group: JourneyGroup) => void;
  openGroup: (group: JourneyGroup) => void; showWhole: (group: JourneyGroup) => void; inspector?: ReactNode;
}) {
  const hints = useReadingHints();
  const [loaded, setLoaded] = useState(12);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const selectedIndex = groups.findIndex(group => group.id === route.group);
  const shown = Math.min(groups.length, Math.max(loaded, selectedIndex + 1));
  const total = groups.reduce((count, group) => count + group.words.length, 0);
  const scope = workspaceScopeLabel(route.scope);
  function expand(id: string) {
    setExpanded(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  return <section className="aw-panel aw-journey" aria-label="Family Journey">
    <header className="aw-panel-head"><div><p className="aw-relation">Family Journey</p><h2>Read through {scope}</h2></div>
      <span>{total} entries · {groups.length} groups</span></header>
    <WorkspaceReadingControls locale={locale}/>
    {groups.length > 0 && <label className="aw-jump">Jump to group
      <select value={route.group || ''} onChange={event => {
        const group = groups.find(candidate => candidate.id === event.target.value);
        if (group) openGroup(group);
      }}>
        <option value="">Select a group</option>
        {groups.map(group => <option key={group.id} value={group.id}>{group.anchor ? group.anchor + (hints.english ? ' · ' + group.title : '') : 'Topic · ' + group.title} · {group.level ? 'HSK ' + group.level : 'Extra'}</option>)}
      </select>
    </label>}
    {groups.slice(0, shown).map(group => {
      const {here, full} = workspaceJourneyGroup(group, locale, route.scope);
      const fullOpen = expanded.has(group.id);
      return <article key={group.id} id={group.id} className="aw-journey-group" data-journey-kind={group.kind}>
        <header><div><p className="aw-relation">{group.kind === 'character' ? 'Shared written Hanzi' : 'Study topic'} · {group.level ? 'HSK ' + group.level : 'Extra'}</p>
          <h3>{group.anchor && <span lang="zh-Hans">{group.anchor} </span>}{hints.pinyin && group.reading && <small>{group.reading}{hints.english ? ' · ' : ''}</small>}{(group.kind !== 'character' || hints.english) && group.title}</h3>
          <p>{workspaceGroupLabel(group, locale, route.scope)}</p></div></header>
        <WorkspaceWordBoard words={fullOpen ? full : here} anchor={group.anchor}
          selected={context.word?.id} choose={word => select(word, group)}/>
        {group.kind === 'character' && <div className="aw-actions aw-group-actions">
          {full.length !== here.length && <button type="button" aria-expanded={fullOpen} onClick={() => expand(group.id)}>
            {fullOpen ? 'Show entries here' : 'Show complete family'} <ArrowDown size={14}/>
          </button>}
          <button type="button" onClick={() => showWhole(group)}>Open whole family <ArrowRight size={14}/></button>
        </div>}
        {group.id === route.group && inspector}
      </article>;
    })}
    {shown < groups.length && <div className="aw-actions aw-group-actions"><button type="button" onClick={() => setLoaded(shown + 12)}>Continue reading <ArrowDown size={16}/></button></div>}
  </section>;
}

export function WorkspaceMap({route, context, locale, choose, explore, onMap, onPage, onWiden}: {
  route: WorkspaceRoute; context: WorkspaceContext; locale: Locale; choose: Choose; explore: Explore;
  onMap: (map: WorkspaceRoute['map']) => void; onPage: (page: number) => void; onWiden: () => void;
}) {
  const inventory = useMemo(() => hybridInventory(context.members, locale), [context.members, locale]);
  const words = context.members;
  const page = Math.min(route.page, Math.max(0, Math.ceil(words.length / workspaceBoardSize) - 1));
  const pageWords = words.slice(page * workspaceBoardSize, (page + 1) * workspaceBoardSize);
  const matrixHanzi = workspaceHanzi(pageWords.map(word => word.hanzi).join(''));
  const linked = words.filter(word => word.hanzi.includes(context.hanzi));
  const linkedPage = Math.min(route.page, Math.max(0, Math.ceil(linked.length / workspaceBoardSize) - 1));
  return <section className="aw-panel aw-map" aria-label="Family map">
    <header className="aw-panel-head"><div><p className="aw-relation">{route.relation === 'structure' ? 'Indexed modern structure' : route.relation === 'topic' ? 'Study topic' : 'Shared written Hanzi'}</p>
      <h2>Map <span lang="zh-Hans">{context.part?.variants.join(' / ') || route.anchor}</span></h2></div>
      <span>{route.relation === 'structure' ? context.structural.length + ' mapped Hanzi' : inventory.characterCount + ' Hanzi in this word set'} · {workspaceScopeLabel(route.scope)}</span></header>
    {route.relation === 'structure' && <><WorkspaceStructureScope/><WorkspaceStructureLinks part={context.part} explore={explore}/></>}
    {route.relation === 'structure' ? context.structural.length
      ? <WorkspaceStructureBoard route={route} context={context} explore={explore} onPage={onPage}/>
      : <div className="aw-empty"><p>No mapped characters in {workspaceScopeLabel(route.scope)}.</p>
        {route.scope !== 'all' && <button type="button" onClick={onWiden}>Show all vocabulary</button>}</div>
      : <>
        <div className="aw-actions aw-map-tabs" role="group" aria-label="Map view">
          {([['structure', 'Structure'], ['connections', 'Connections'], ['matrix', 'Repetition matrix']] as const).map(([value, label]) =>
            <button type="button" key={value} aria-pressed={route.map === value} onClick={() => onMap(value)}>{label}</button>)}
        </div>
        {route.map === 'matrix' ? <><div className="aw-matrix" tabIndex={0} aria-label="Repetition matrix">
          <table><thead><tr><th scope="col">Word</th>{matrixHanzi.map(hanzi => <th scope="col" key={hanzi}>
            <button type="button" lang="zh-Hans" onClick={() => explore(hanzi, 'character')}>{hanzi}</button></th>)}</tr></thead>
            <tbody>{pageWords.map(word => <tr key={word.id}><th scope="row"><button type="button" aria-pressed={context.word?.id === word.id} onClick={() => choose(word)}>
              <span lang="zh-Hans"><SharedText text={word.hanzi} anchor={route.relation === 'literal' ? route.anchor : ''}/></span><small>{word.pinyin}</small><small>{word.meaning}</small></button></th>
              {matrixHanzi.map(hanzi => <td key={hanzi}>{word.hanzi.includes(hanzi) ? <button type="button" lang="zh-Hans" aria-label={hanzi + ' in ' + word.hanzi} onClick={() => {choose(word);}}>{hanzi}</button> : '·'}</td>)}</tr>)}</tbody>
          </table></div>
          <WorkspacePager page={page} size={workspaceBoardSize} total={words.length} onPage={onPage}/>
        </> : <>
          <div className="aw-map-characters"><strong>Hanzi in this word set</strong>
            <div className="aw-chips">{inventory.characters.slice(0, 16).map(character =>
              <button type="button" key={character.hanzi} lang="zh-Hans" aria-pressed={context.hanzi === character.hanzi} onClick={() => explore(character.hanzi, 'character')}>{character.hanzi}</button>)}</div>
            {inventory.characters.length > 16 && <p>Showing 16 of {inventory.characters.length}. The original maps include a full character index.</p>}
          </div>
          {route.map === 'structure' && <div className="aw-map-node">
            <span lang="zh-Hans">{context.hanzi}</span><div><strong>Components inside <span lang="zh-Hans">{context.hanzi}</span></strong>
              {context.parts.length ? <div className="aw-chips">{context.parts.map(part => <button type="button" key={part} lang="zh-Hans" onClick={() => explore(part, 'component')}>{part}</button>)}</div>
                : <p>No mapped components for this character.</p>}</div></div>}
          <div className="aw-map-words"><strong>Words containing <span lang="zh-Hans">{context.hanzi}</span> in this set · {linked.length}</strong>
            <WorkspaceWordBoard words={linked.slice(linkedPage * workspaceBoardSize, (linkedPage + 1) * workspaceBoardSize)}
              anchor={context.hanzi} selected={context.word?.id} choose={choose}/>
            <WorkspacePager page={linkedPage} size={workspaceBoardSize} total={linked.length} onPage={onPage}/>
          </div>
        </>}
      </>}
  </section>;
}

function WorkspaceRecognition({questions, audio}: {questions: ReturnType<typeof recognitionQuestions>; audio: WorkspaceAudio}) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState('');
  const [checked, setChecked] = useState(false);
  const question = questions[index];
  if (!question) return null;
  const result = checked ? checkRecognition(question, choice, undefined) : undefined;
  function move(next: number) {
    audio.stop();
    setIndex(next);
    setChoice('');
    setChecked(false);
  }
  return <section className="aw-recognition" aria-label="Quick recognition" data-study-assessment={checked ? 'complete' : 'blocked'}>
    <p>{index + 1} / {questions.length}</p><h3>Which character completes this word?</h3>
    <p lang="zh-Hans" className="aw-recognition-mask">{question.masked}</p><p>{question.word.meaning}</p>
    <div className="aw-chips">{question.choices.map(hanzi =>
      <button type="button" key={hanzi} lang="zh-Hans" aria-pressed={hanzi === choice} disabled={checked} onClick={() => setChoice(hanzi)}>{hanzi}</button>
    )}</div>
    <div className="aw-actions">
      <button type="button" disabled={!choice || checked} onClick={() => setChecked(true)}>Check answer</button>
      {checked && <ListenButton clip={wordPronunciation(question.word)} audio={audio}/>}
    </div>
    {result && <p aria-live="polite">{result.correct ? 'Correct' : 'Answer'} · <span lang="zh-Hans">{question.word.hanzi}</span> · {question.word.pinyin}</p>}
    <div className="aw-actions">
      <button type="button" disabled={index === 0} onClick={() => move(index - 1)}><ArrowLeft size={16}/> Previous</button>
      <button type="button" disabled={index + 1 === questions.length} onClick={() => move(index + 1)}>Next <ArrowRight size={16}/></button>
    </div>
  </section>;
}

function WorkspaceWriting({context, penOnly, setPenOnly}: {context: WorkspaceContext; penOnly: boolean; setPenOnly: (value: boolean) => void}) {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'watch' | 'trace'>('watch');
  const [replay, setReplay] = useState(0);
  const [complete, setComplete] = useState(false);
  const letters = [...context.text];
  const character = letters[index];
  return <section className="aw-write" aria-label="Stroke practice">
    <div className="aw-actions"><button type="button" aria-pressed={mode === 'watch'} onClick={() => {setMode('watch'); setComplete(false);}}>Watch</button>
      <button type="button" aria-pressed={mode === 'trace'} onClick={() => {setMode('trace'); setComplete(false);}}>Trace</button>
      <button type="button" onClick={() => {setReplay(value => value + 1); setComplete(false);}}>Replay</button>
      <label><input type="checkbox" checked={penOnly} onChange={event => setPenOnly(event.target.checked)}/> Pencil only</label></div>
    {letters.length > 1 && <div className="aw-chips">{letters.map((letter, i) =>
      <button type="button" lang="zh-Hans" key={i} aria-pressed={i === index} onClick={() => {setIndex(i); setComplete(false);}}>{letter}</button>
    )}</div>}
    <div className="aw-guided"><Guided character={character} mode={mode} penOnly={penOnly} replay={replay}
      onComplete={() => setComplete(true)} onMistake={() => undefined}/></div>
    {complete && mode === 'trace' && <p role="status">Character complete</p>}
  </section>;
}

export function WorkspacePractise({route, context, locale, audio, choose, setExercise, penOnly, setPenOnly, onExpand, memory, revealed, setMemory, setRevealed, onContrastRecallActive}: {
  route: WorkspaceRoute; context: WorkspaceContext; locale: Locale; audio: WorkspaceAudio; choose: Choose;
  setExercise: (exercise: WorkspaceRoute['exercise']) => void; penOnly: boolean; setPenOnly: (value: boolean) => void; onExpand: () => void;
  memory: boolean; revealed: boolean; setMemory: (memory: boolean) => void; setRevealed: (revealed: boolean) => void; onContrastRecallActive: (active: boolean) => void;
}) {
  const literal = route.relation === 'literal';
  const reelWords = literal ? context.members : [];
  const pairs = useMemo(() => familyContrastPairs(reelWords, route.anchor), [reelWords, route.anchor]);
  const questions = useMemo(() => recognitionQuestions(context.structural, locale), [context.structural, locale]);
  const canWrite = (route.kind === 'character' || route.kind === 'word') && /^[\p{Script=Han}]{1,8}$/u.test(context.text);
  const canListen = !!context.pronunciation;
  const options = [
    ['reels', 'Word reels', reelWords.length > 0, 'Read and recall words sharing ' + route.anchor],
    ['contrast', 'Compare and recall', pairs.length > 0, pairs.length + ' authored contrast pairs'],
    ['recognition', 'Quick recognition', questions.length > 0, questions.length + ' prompts from the component family'],
    ['writing', 'Stroke practice', canWrite, context.text],
  ] as const;
  const exercise = options.some(option => option[0] === route.exercise && option[2]) ? route.exercise : '';
  const index = Math.max(0, reelWords.findIndex(word => word.id === context.word?.id));
  return <section className="aw-panel aw-practise" aria-label="Family practice">
    <header className="aw-panel-head"><div><p className="aw-relation">Practise</p><h2>{exercise ? options.find(option => option[0] === exercise)?.[1] : 'Choose an activity'}</h2></div>
      <span>{workspaceScopeLabel(route.scope)}</span></header>
    {exercise && <div className="aw-actions aw-exercise-nav"><button type="button" onClick={() => setExercise('')}><ArrowLeft size={16}/> Activities</button></div>}
    {!exercise && <div className="aw-activity-list">
      {options.filter(option => option[2]).map(([id, label, , description]) =>
        <button type="button" key={id} onClick={() => setExercise(id)}><span><strong>{label}</strong><small>{description}</small></span><ArrowRight size={18}/></button>
      )}
      {canListen && <button type="button" aria-pressed={audio.playing === context.pronunciation?.source} onClick={() => audio.listen(context.pronunciation)}>
        <span><strong>Listen to the selected {route.kind}</strong><small lang="zh-Hans">{context.pronunciation?.text}</small></span><AudioLines size={18}/></button>}
      {!options.some(option => option[2]) && !canListen && <p>Choose a word or character for available practice.</p>}
    </div>}
    {exercise === 'reels' && <div className="word-family-lab aw-reels" style={workspaceColumns(reelWords, route.anchor)}>
      <div className="aw-actions"><button type="button" aria-pressed={memory} onClick={() => {setMemory(!memory); setRevealed(false);}}>Recall mode</button>
        {memory && <button type="button" aria-pressed={revealed} onClick={() => setRevealed(!revealed)}>{revealed ? 'Hide answer' : 'Reveal answer'}</button>}</div>
      {memory && !revealed && reelWords[index] && <div className="aw-recall-cue" aria-live="polite">
        <p>Recall the word for</p><strong>{reelWords[index].meaning}</strong>
      </div>}
      <WordFamilyReels words={reelWords} anchor={route.anchor} index={index} memory={memory} revealed={revealed}
        onSelect={next => {setRevealed(false); choose(reelWords[next]);}}/>
    </div>}
    {exercise === 'contrast' && <FamilyPracticeLab words={reelWords} anchor={route.anchor} scope={route.scope} locale={locale}
      boardCopy={boardCopy} selected={context.word} onChoose={choose}
      details={word => <p>{word.hanzi} · {word.pinyin} · {word.meaning}</p>}
      listen={word => audio.listen(wordPronunciation(word))} silence={audio.stop} columnStyle={workspaceColumns(reelWords, route.anchor)}
      expanded={route.wide} onExpand={onExpand} onBack={() => setExercise('')} onRecallActive={onContrastRecallActive}/>}
    {exercise === 'recognition' && <WorkspaceRecognition key={route.part + route.scope} questions={questions} audio={audio}/>}
    {exercise === 'writing' && <WorkspaceWriting key={context.text} context={context} penOnly={penOnly} setPenOnly={setPenOnly}/>}
  </section>;
}
