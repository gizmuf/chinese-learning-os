'use client';

import {useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent} from 'react';
import {ArrowLeft, ArrowRight, BookOpen, ChevronRight, Columns2, Compass, Maximize2, Minimize2, PenLine} from 'lucide-react';
import {useI18n} from './i18n';
import {browseScopes, parseBrowseScope} from './hsk-browse';
import {validWordAnchor} from './word-family-model';
import type {CloudWord} from './atlas-cloud-model';
import type {JourneyGroup} from './family-journey-model';
import type {CloudRoute} from './atlas-cloud-route';
import {atlasCloudReturn, atlasWorkspaceHref, atlasWorkspaceScroll, isAtlasWorkspaceEntry, readAtlasWorkspaceRoute, type WorkspaceKind, type WorkspaceRoute} from './atlas-workspace-route';
import {resolveWorkspaceContext, workspaceExploration, workspaceGroups, workspaceOriginalHref, workspaceScopeLabel, workspaceSelection} from './atlas-workspace-model';
import {workspaceExploreEvent} from './atlas-workspace-bridge';
import {WorkspaceBoard, WorkspaceInspector, WorkspaceJourney, WorkspaceMap, WorkspacePractise, useWorkspaceAudio} from './atlas-workspace-content';
import AtlasStoryExplorer from './atlas-story-explorer';
import {isStoryTarget, type StoryTarget} from './atlas-story-explorer-model';
import './atlas-workspace.css';
import {readReadingLabRoute, readingLabHref} from './reading-lab-route';

const modes = [
  ['family', 'Whole family', Columns2], ['read', 'Read through', BookOpen], ['map', 'Map', Compass], ['practise', 'Practise', PenLine],
] as const;

const originalViews: {name: string; views: [string, CloudRoute['layout']][]}[] = [
  {name: 'Browse', views: [['Family + context', 'family'], ['Word families', 'words'], ['Family Journey', 'journey']]},
  {name: 'Explore', views: [['Cloud map', 'cloud'], ['Step path', 'path'], ['Layer map', 'layers'], ['Constellations', 'constellations'], ['Repetition matrix', 'matrix']]},
  {name: 'Practise', views: [['3D cards', 'space']]},
];

type WorkspaceHistory = {depth: number; scroll: number};
function workspaceHistory(): WorkspaceHistory {
  return window.history.state?.atlasWorkspace ?? {depth: 0, scroll: 0};
}

type EmbeddedWorkspace = {initial: WorkspaceRoute; viewport: HTMLDialogElement | null};

export default function AtlasWorkspace({penOnly, setPenOnly, notify, embedded}: {
  penOnly: boolean; setPenOnly: (value: boolean) => void; notify: (message: string) => void; embedded?: EmbeddedWorkspace;
}) {
  const {locale} = useI18n();
  const [route, setRoute] = useState(() => embedded?.initial ?? readAtlasWorkspaceRoute(window.location.search));
  const [depth, setDepth] = useState(() => embedded ? 0 : workspaceHistory().depth);
  const embedTrail = useRef<{route: WorkspaceRoute; scroll: number}[]>([]);
  const [draft, setDraft] = useState(route.anchor);
  const [error, setError] = useState('');
  const [journeyVisited, setJourneyVisited] = useState(route.mode === 'read');
  const [reelMemory, setReelMemory] = useState(false);
  const [reelRevealed, setReelRevealed] = useState(false);
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 850px)').matches);
  const root = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const pendingScroll = useRef<number | string | null>(embedded ? null : atlasWorkspaceScroll(window.location.search) || workspaceHistory().scroll);
  const audio = useWorkspaceAudio(notify);
  const groups = useMemo(() => journeyVisited || route.mode === 'read' || route.relation === 'topic' ? workspaceGroups(locale, route.scope) : [], [journeyVisited, locale, route.mode, route.relation, route.scope]);
  const context = useMemo(() => resolveWorkspaceContext(route, locale, groups), [route, locale, groups]);
  const cloudOrigin = useRef(embedded ? undefined : atlasCloudReturn(new URLSearchParams(window.location.search).get('returnCloud')));
  function ownHref(next: WorkspaceRoute, scroll = 0) {
    const href = atlasWorkspaceHref(next, scroll);
    return cloudOrigin.current ? href + '&returnCloud=' + encodeURIComponent(cloudOrigin.current) : href;
  }
  const query = ownHref(route);

  useEffect(() => {
    if (embedded) return;
    const original = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    const pop = () => {
      if (!isAtlasWorkspaceEntry(new URLSearchParams(location.search))) return;
      pendingScroll.current = workspaceHistory().scroll || atlasWorkspaceScroll(location.search);
      audio.stop();
      const next = readAtlasWorkspaceRoute(location.search);
      if (next.mode === 'read') setJourneyVisited(true);
      setDepth(workspaceHistory().depth);
      setRoute(next);
    };
    addEventListener('popstate', pop);
    return () => {
      removeEventListener('popstate', pop);
      history.scrollRestoration = original;
    };
  }, []);

  useLayoutEffect(() => {
    if (pendingScroll.current === null) return;
    const destination = pendingScroll.current;
    pendingScroll.current = null;
    const frame = requestAnimationFrame(() => {
      if (typeof destination === 'string') document.getElementById(destination)?.scrollIntoView({block: 'start'});
      else (embedded?.viewport ?? window).scrollTo({top: destination, behavior: 'instant'});
    });
    return () => cancelAnimationFrame(frame);
  }, [route]);

  useEffect(() => {
    const viewport = matchMedia('(max-width: 850px)');
    const update = () => setNarrow(viewport.matches);
    viewport.addEventListener('change', update);
    return () => viewport.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setDraft(route.anchor);
    setError('');
  }, [route.anchor]);

  function navigate(patch: Partial<WorkspaceRoute>, scroll: number | string | null = null, replace = false) {
    const next = {...route, ...patch};
    const destination = ownHref(next);
    if (destination === query) {
      if (typeof scroll === 'string') document.getElementById(scroll)?.scrollIntoView({block: 'start'});
      return;
    }
    audio.stop();
    if (embedded) {
      if (!replace) embedTrail.current.push({route, scroll: embedded.viewport?.scrollTop ?? 0});
      pendingScroll.current = scroll;
      if (next.mode === 'read') setJourneyVisited(true);
      setDepth(embedTrail.current.length);
      setRoute(next);
      return;
    }
    const current = workspaceHistory();
    const currentScroll = window.scrollY;
    const state = {...history.state, atlasWorkspace: {...current, scroll: currentScroll}};
    if (replace) history.replaceState(state, '', destination);
    else {
      history.replaceState(state, '', window.location.href);
      history.pushState({...history.state, atlasWorkspace: {depth: current.depth + 1, scroll: typeof scroll === 'number' ? scroll : currentScroll}}, '', destination);
    }
    pendingScroll.current = scroll;
    if (next.mode === 'read') setJourneyVisited(true);
    setDepth(workspaceHistory().depth);
    setRoute(next);
  }

  function previous() {
    audio.stop();
    if (embedded && depth > 0) {
      const previous = embedTrail.current.pop();
      if (!previous) return;
      pendingScroll.current = previous.scroll;
      setDepth(embedTrail.current.length);
      setRoute(previous.route);
    }
    else if (depth > 0) history.back();
    else navigate({story: '', step: 0, exercise: '', mode: 'family'}, 0, true);
  }

  function story(target: StoryTarget) {
    navigate({story: target, step: 0, exercise: ''}, 0);
    requestAnimationFrame(() => heading.current?.focus({preventScroll: true}));
  }

  function explore(text: string, kind: WorkspaceKind) {
    const selection = workspaceExploration(text, kind, locale, route);
    const detour = route.story || kind === 'component' || route.mode === 'practise';
    navigate({
      ...selection, story: '', step: 0, exercise: '',
      mode: detour ? 'family' : route.mode,
      ...(route.story && kind === 'character' ? {relation: 'literal', anchor: text, group: '', part: ''} : {}),
    }, detour ? 0 : null);
  }

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const onExplore = (event: Event) => {
      const value = (event as CustomEvent<unknown>).detail;
      if (typeof value === 'string' && isStoryTarget(value)) story(value);
      else if (value && typeof value === 'object' && 'text' in value && typeof value.text === 'string' && 'kind' in value
        && (value.kind === 'word' || value.kind === 'character' || value.kind === 'component' || value.kind === 'sentence')) explore(value.text, value.kind);
    };
    node.addEventListener(workspaceExploreEvent, onExplore);
    return () => node.removeEventListener(workspaceExploreEvent, onExplore);
  });

  function choose(word: CloudWord) {
    navigate(workspaceSelection(route, word));
  }

  function selectFamily(anchor: string, keepCharacter = false) {
    navigate({
      relation: 'literal', anchor, group: '', part: '', mode: 'family', story: '', step: 0, page: 0, exercise: '',
      kind: keepCharacter ? 'character' : 'word', hanzi: [...anchor][0], wordId: '', expression: '',
    }, 0);
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const anchor = draft.trim();
    if (!validWordAnchor(anchor)) {
      setError('Enter one or more Hanzi.');
      return;
    }
    selectFamily(anchor);
  }

  function selectMode(mode: WorkspaceRoute['mode']) {
    const available = mode === 'read' ? workspaceGroups(locale, route.scope) : [];
    const group = available.find(entry => entry.id === route.group) ?? available.find(entry => entry.anchor === route.anchor)
      ?? available.find(entry => entry.words.some(word => word.id === context.word?.id));
    navigate({mode, story: '', step: 0, exercise: '', page: 0, wordId: route.wordId || context.word?.id || '',
      hanzi: route.hanzi || context.hanzi, ...(group ? {group: group.id} : {})}, group?.id ?? 0);
  }

  function chooseJourney(word: CloudWord, group: JourneyGroup) {
    navigate({
      ...workspaceSelection({...route, anchor: group.anchor || route.anchor}, word), group: group.id,
      relation: group.kind === 'topic' ? 'topic' : 'literal', anchor: group.anchor || route.anchor, part: '', page: 0,
    });
  }

  function openGroup(group: JourneyGroup) {
    navigate({
      group: group.id, relation: group.kind === 'topic' ? 'topic' : 'literal', anchor: group.anchor || route.anchor,
      kind: 'word', hanzi: group.anchor || '', wordId: group.words[0]?.id ?? '', expression: '', part: '', page: 0,
    }, group.id);
  }

  function wholeGroup(group: JourneyGroup) {
    const selected = route.group === group.id ? context.word : undefined;
    navigate({
      mode: 'family', relation: 'literal', anchor: group.anchor, part: '', group: group.id, page: 0,
      hanzi: group.anchor, wordId: selected?.id ?? '', expression: '', kind: 'word',
    }, 0);
  }

  function changeScope(scope: WorkspaceRoute['scope']) {
    const group = route.group && (route.mode === 'read' || route.relation === 'topic')
      ? workspaceGroups(locale, scope).find(entry => entry.id === route.group)
      : undefined;
    navigate({scope, group: group?.id ?? '', page: 0, relation: route.relation === 'topic' && !group ? 'literal' : route.relation,
      wordId: route.wordId || context.word?.id || '', hanzi: route.hanzi || context.hanzi}, 0);
  }

  function setExercise(exercise: WorkspaceRoute['exercise']) {
    setReelMemory(false);
    setReelRevealed(false);
    navigate({mode: 'practise', exercise}, 0);
  }

  function returnQuery(scroll = 0) {
    return ownHref({...route, wordId: context.word?.id ?? route.wordId, hanzi: context.hanzi}, scroll);
  }

  function chunksHref(scroll = 0) {
    const params = new URLSearchParams({course: 'intensive', material: 'speaking-chunks', chunks: 'words', returnAtlas: returnQuery(scroll)});
    const searchText = context.word?.hanzi || context.text || context.hanzi;
    if (searchText) params.set('q', searchText);
    return '/?' + params;
  }

  function follow(link: HTMLAnchorElement, href: (scroll: number) => string) {
    link.href = href(window.scrollY);
    history.replaceState({...history.state, atlasWorkspace: {...workspaceHistory(), scroll: window.scrollY}}, '', location.href);
  }

  const hideInspector = route.mode === 'practise' && route.exercise === 'reels' && reelMemory && !reelRevealed;
  const inlineContext = narrow && route.mode === 'read' && groups.some(group => group.id === route.group);
  const inspector = <WorkspaceInspector context={context} route={route} audio={audio} explore={explore} showFamily={anchor => selectFamily(anchor, true)}
    onStory={story} onWriting={() => setExercise('writing')} chunksHref={embedded ? '' : chunksHref()}/>;

  return <section ref={root} className={'atlas-workspace' + (route.wide ? ' aw-wide' : '')} data-atlas-workspace aria-label="Atlas workspace"
    onClickCapture={event => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('.aw-inspector a[href*="returnAtlas"]');
      if (link) follow(link, chunksHref);
    }}>
    <header className="aw-header">
      <div className="aw-header-line">
        <div className="aw-brand"><Compass size={21} aria-hidden="true"/><h1 ref={heading} tabIndex={-1}>Hanzi Atlas</h1></div>
        <form className="aw-search" onSubmit={search}><label htmlFor="aw-anchor">Word family</label>
          <input id="aw-anchor" value={draft} onChange={event => setDraft(event.target.value)} lang="zh-Hans" maxLength={8} aria-invalid={!!error}/>
          <button type="submit" aria-label="Search word family"><ArrowRight size={17}/></button></form>
        <label className="aw-scope"><span>Vocabulary</span><select aria-label="Vocabulary scope" value={route.scope} onChange={event => changeScope(parseBrowseScope(event.target.value))}>
          {browseScopes.map(scope => <option key={scope} value={scope}>{workspaceScopeLabel(scope)}</option>)}
        </select></label>
        <button type="button" className="aw-expand" aria-pressed={route.wide} aria-label={route.wide ? 'Restore workspace' : 'Expand workspace'}
          onClick={() => navigate({wide: !route.wide}, null, true)}>{route.wide ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}</button>
        {!embedded && <><a className="aw-reader-link" href={readingLabHref(readReadingLabRoute('?hsk=' + route.scope)) + '&returnWorkspace=' + encodeURIComponent(returnQuery())}
          onClick={event => follow(event.currentTarget, scroll => readingLabHref(readReadingLabRoute('?hsk=' + route.scope)) + '&returnWorkspace=' + encodeURIComponent(returnQuery(scroll)))}>
          <BookOpen size={16}/> Reading Lab
        </a>
        {cloudOrigin.current && <a className="aw-reader-link" href={cloudOrigin.current}><ArrowLeft size={16}/> Original Atlas</a>}
        <details className="aw-original"><summary>Original views</summary><div className="aw-original-menu">{originalViews.map(group =>
          <div key={group.name}><strong>{group.name}</strong>{group.views.map(([label, view]) =>
            <a key={view} href={workspaceOriginalHref(route, context, view)} onClick={event => follow(event.currentTarget, scroll => workspaceOriginalHref(route, context, view, scroll))}>{label}</a>
          )}</div>
        )}</div></details></>}
      </div>
      {error && <p className="aw-error" role="alert">{error}</p>}
      <div className="aw-header-line aw-navigation">
        <nav className="aw-modes" aria-label="Atlas presentation">{modes.map(([mode, label, Icon]) =>
          <button key={mode} type="button" aria-pressed={route.mode === mode && !route.story} onClick={() => selectMode(mode)}><Icon size={16}/>{label}</button>
        )}</nav>
        <nav className="aw-samples" aria-label="Sample stories and families">
          <button type="button" onClick={() => explore('person', 'component')} title="Person component family"><span lang="zh-Hans">人 / 亻</span> shapes</button>
          <button type="button" onClick={() => selectFamily('生')} title="生 family"><span lang="zh-Hans">生</span> family</button>
          {(['幕', '明天', '姓'] as const).map(target =>
            <button type="button" key={target} aria-label={'Explore ' + target + ' story'} onClick={() => story(target)} lang="zh-Hans">{target}</button>
          )}
        </nav>
      </div>
    </header>

    {(depth > 0 || route.story) && <nav className="aw-trail" aria-label="Atlas exploration trail">
      {!route.story && <><button type="button" onClick={previous}><ArrowLeft size={15}/> Back</button><ChevronRight size={14} aria-hidden="true"/></>}
      <span lang="zh-Hans">{context.part?.glyph ?? route.anchor}</span>
      {!route.story && !hideInspector && context.hanzi && context.hanzi !== (context.part?.glyph ?? route.anchor) && <><ChevronRight size={14} aria-hidden="true"/><span lang="zh-Hans">{context.hanzi}</span></>}
      {(route.story || (!hideInspector && context.text && context.text !== context.hanzi)) && <><ChevronRight size={14} aria-hidden="true"/><span lang="zh-Hans" aria-current="page">{route.story || context.text}</span></>}
    </nav>}
    {route.story && <AtlasStoryExplorer target={route.story} step={route.step} onStepChange={step => navigate({step}, null, true)} onExplore={explore} onBack={previous}/>}
    <div className={'aw-layout' + (hideInspector ? ' aw-layout-single' : '')} hidden={!!route.story}>
      <div className="aw-material">
        {route.mode === 'family' && <WorkspaceBoard route={route} context={context} choose={choose} explore={explore} onPage={page => navigate({page})} onWiden={() => changeScope('all')}/>}
        {(journeyVisited || route.mode === 'read') && <div hidden={route.mode !== 'read'}>
          <WorkspaceJourney key={route.scope} route={route} groups={groups} locale={locale} context={context}
            select={chooseJourney} openGroup={openGroup} showWhole={wholeGroup} inspector={inlineContext ? inspector : undefined}/>
        </div>}
        {route.mode === 'map' && <WorkspaceMap route={route} context={context} locale={locale} choose={choose} explore={explore}
          onMap={map => navigate({map, page: 0})} onPage={page => navigate({page})} onWiden={() => changeScope('all')}/>}
        {route.mode === 'practise' && <WorkspacePractise route={route} context={context} locale={locale} choose={choose} audio={audio}
          penOnly={penOnly} setPenOnly={setPenOnly} setExercise={setExercise} memory={reelMemory} revealed={reelRevealed}
          setMemory={setReelMemory} setRevealed={setReelRevealed} onExpand={() => navigate({wide: !route.wide}, null, true)}/>}
      </div>
      {!inlineContext && !hideInspector && inspector}
    </div>
  </section>;
}
