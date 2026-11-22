'use client';

import {lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent} from 'react';
import {ArrowLeft, ArrowRight, BookOpen, ChevronRight, Columns2, Compass, Layers2, Hand, Maximize2, Minimize2, PenLine} from 'lucide-react';
import {useI18n} from './i18n';
import {GlobalHskSelect, useGlobalHsk} from './global-hsk';
import type {CloudWord} from './atlas-cloud-model';
import type {JourneyGroup} from './family-journey-model';
import type {CloudRoute} from './atlas-cloud-route';
import {atlasCloudReturn, atlasWorkspaceHref, atlasWorkspaceScroll, isAtlasWorkspaceEntry, readAtlasWorkspaceRoute, type WorkspaceKind, type WorkspaceRoute} from './atlas-workspace-route';
import {resolveWorkspaceContext, workspaceExploration, workspaceFamilySearch, workspaceGroups, workspaceOriginalHref, workspacePanelOutsideScope, workspaceBoardSize, workspaceScopeLabel, workspaceSelection, type WorkspaceFamilyType} from './atlas-workspace-model';
import {workspaceExploreEvent} from './atlas-workspace-bridge';
import {WorkspaceBoard, WorkspaceInspector, WorkspaceJourney, WorkspaceMap, WorkspacePractise, WorkspaceReadingProvider, useWorkspaceAudio} from './atlas-workspace-content';
import AtlasStoryExplorer from './atlas-story-explorer';
import {WorkspaceStoryPane} from './atlas-workspace-story';
import {isStoryTarget, type StoryTarget} from './atlas-story-explorer-model';
import './atlas-workspace.css';
import {readReadingLabRoute, readingLabHref} from './reading-lab-route';

const AtlasAssembly = lazy(() => import('./atlas-assembly'));
const AtlasSwipe = lazy(() => import('./atlas-swipe'));

const modes = [
  ['family', 'Whole family', Columns2], ['read', 'Read through', BookOpen], ['map', 'Map', Compass], ['build', 'Build', Layers2], ['swipe', 'Swipe', Hand], ['practise', 'Practise', PenLine],
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

export default function AtlasWorkspace({penOnly, setPenOnly, notify, embedded, owner = null}: {
  penOnly: boolean; setPenOnly: (value: boolean) => void; notify: (message: string) => void; embedded?: EmbeddedWorkspace; owner?: string | null;
}) {
  const {locale} = useI18n();
  const global = useGlobalHsk();
  const [localRoute, setRoute] = useState(() => embedded?.initial ?? readAtlasWorkspaceRoute(window.location.search));
  const route = useMemo(() => global && global.scope !== localRoute.scope ? {...localRoute, scope: global.scope} : localRoute,
    [localRoute, global?.scope]);
  const [swipeHistoryEntry, setSwipeHistoryEntry] = useState(0);
  const [depth, setDepth] = useState(() => embedded ? 0 : workspaceHistory().depth);
  const embedTrail = useRef<{route: WorkspaceRoute; scroll: number}[]>([]);
  const searchType = route.relation === 'structure' ? 'structure' : 'literal';
  const searchTerm = searchType === 'structure' ? route.part || route.anchor : route.anchor;
  const [draft, setDraft] = useState(searchTerm);
  const [familyType, setFamilyType] = useState<WorkspaceFamilyType>(searchType);
  const [error, setError] = useState('');
  const [journeyVisited, setJourneyVisited] = useState(route.mode === 'read');
  const [reelMemory, setReelMemory] = useState(false);
  const [reelRevealed, setReelRevealed] = useState(false);
  const [contrastRecallActive, setContrastRecallActive] = useState(false);
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 850px)').matches);
  const root = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const panelToggle = useRef<HTMLButtonElement>(null);
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
      if (next.mode === 'swipe') setSwipeHistoryEntry(entry => entry + 1);
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
    setDraft(searchTerm);
    setFamilyType(searchType);
    setError('');
  }, [searchType, searchTerm]);

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

  function explore(text: string, kind: WorkspaceKind, fromPanel = false) {
    const selection = workspaceExploration(text, kind, locale, route);
    const detour = route.story || fromPanel || kind === 'component' || route.mode === 'practise';
    navigate({
      ...selection, story: '', step: 0, panelStep: 0, exercise: '',
      mode: detour ? 'family' : route.mode,
      ...((route.story || fromPanel) && kind === 'character' ? {relation: 'literal', anchor: text, group: '', part: ''} : {}),
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
    navigate({...workspaceSelection(route, word), panelStep: 0});
  }

  function selectFamily(anchor: string, keepCharacter = false) {
    navigate({
      relation: 'literal', anchor, group: '', part: '', mode: 'family', story: '', step: 0, panelStep: 0, page: 0, exercise: '',
      kind: keepCharacter ? 'character' : 'word', hanzi: [...anchor][0], wordId: '', expression: '',
    }, 0);
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selection = workspaceFamilySearch(draft, familyType);
    if (!selection) {
      setError(familyType === 'literal' ? 'Enter one or more Hanzi.' : 'Enter an indexed component, such as 莫, 亻, or person.');
      return;
    }
    setError('');
    navigate({...selection, group: '', wordId: '', expression: '', mode: 'family', story: '', step: 0, panelStep: 0, page: 0, exercise: ''}, 0);
  }

  function openBuilder(hanzi: string, part?: string) {
    navigate({mode: 'build', buildHanzi: hanzi, buildPart: part, story: '', step: 0, exercise: ''}, 0);
  }

  function selectMode(mode: WorkspaceRoute['mode']) {
    if (mode === 'build' || mode === 'swipe') {
      if (mode === route.mode) return;
      const fromParts = route.mode === 'build' || route.mode === 'swipe';
      const hanzi = (fromParts && route.buildHanzi) || context.hanzi;
      const part = fromParts ? route.buildPart : route.kind === 'component' ? context.part?.glyph : undefined;
      if (mode === 'build') openBuilder(hanzi, part);
      else navigate({mode, buildHanzi: hanzi, buildPart: part, swipeSlot: undefined, swipeWord: undefined, wordView: undefined, familyMap: undefined, wide: true, story: '', step: 0, exercise: ''}, 0);
      return;
    }
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
    if (global) { audio.stop(); global.setScope(scope); return; }
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

  const building = !embedded && route.mode === 'build' && !route.story;
  const swiping = !embedded && route.mode === 'swipe' && !route.story;
  const composing = building || swiping;
  const canShowStoryPanel = route.mode === 'family' && !route.story;
  const showStoryPanel = canShowStoryPanel && route.storyPanel;
  const shortFamily = (route.relation === 'structure' ? context.structural.length : context.members.length) <= workspaceBoardSize;
  function toggleStoryPanel(open: boolean, returnToFamily = false) {
    const scroll = returnToFamily ? 'aw-family-board' : open && matchMedia('(max-width: 999px)').matches ? 'aw-story-pane' : null;
    navigate({storyPanel: open, panelStep: open ? route.panelStep : 0}, scroll);
    if (returnToFamily) requestAnimationFrame(() => panelToggle.current?.focus({preventScroll: true}));
  }

  const outsideScope = workspacePanelOutsideScope(route, context);
  const hideInspector = route.mode === 'practise' && (route.exercise === 'reels' && reelMemory && !reelRevealed
    || route.exercise === 'contrast' && contrastRecallActive);
  const inlineContext = narrow && route.mode === 'read' && groups.some(group => group.id === route.group);
  const inspector = <WorkspaceInspector context={context} route={route} audio={audio} explore={explore} showFamily={anchor => selectFamily(anchor, true)}
    onStory={story} onWriting={() => setExercise('writing')} onBuild={embedded ? undefined : openBuilder} chunksHref={embedded ? '' : chunksHref()}/>;

  return <WorkspaceReadingProvider active={route.mode === 'read' && !route.story} owner={owner} root={root} embedded={!!embedded}><section ref={root} className={'atlas-workspace' + (route.wide ? ' aw-wide' : '') + (showStoryPanel ? ' aw-story-open' : '') + (building ? ' aw-build' : '') + (swiping ? ' aw-swipe' : '')} data-atlas-workspace aria-label="Atlas workspace"
    onClickCapture={event => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('.aw-inspector a[href*="returnAtlas"]');
      if (link) follow(link, chunksHref);
    }}>
    <header className="aw-header">
      <div className="aw-header-line">
        <div className="aw-brand"><Compass size={21} aria-hidden="true"/><h1 ref={heading} tabIndex={-1}>Hanzi Atlas</h1></div>
        {!composing && <form className="aw-search" onSubmit={search}>
          <select aria-label="Family search type" value={familyType} onChange={event => {
            setFamilyType(event.target.value === 'structure' ? 'structure' : 'literal');
            setError('');
          }}>
            <option value="literal">Word family</option>
            <option value="structure">Component family</option>
          </select>
          <input id="aw-anchor" aria-label={familyType === 'literal' ? 'Shared Hanzi in words' : 'Component glyph or ID'}
            value={draft} onChange={event => setDraft(event.target.value)} lang={familyType === 'literal' ? 'zh-Hans' : undefined} maxLength={familyType === 'literal' ? 8 : 40} aria-invalid={!!error}/>
          <button type="submit" aria-label={familyType === 'literal' ? 'Search word family' : 'Search component family'}><ArrowRight size={17}/></button>
        </form>}
        <label className="aw-scope"><span>{composing ? 'Hanzi' : 'Vocabulary'}</span><GlobalHskSelect label={composing ? 'Hanzi scope' : 'Vocabulary scope'} scope={route.scope} setScope={changeScope}/></label>
        <button type="button" className="aw-expand" aria-pressed={route.wide} aria-label={route.wide ? 'Restore workspace' : 'Expand workspace'} title={route.wide ? 'Restore workspace' : 'Expand workspace'}
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
        <nav className="aw-modes" aria-label="Atlas presentation">{modes.filter(([mode]) => !embedded || (mode !== 'build' && mode !== 'swipe')).map(([mode, label, Icon]) =>
          <button key={mode} type="button" aria-pressed={route.mode === mode && !route.story} onClick={() => selectMode(mode)}><Icon size={16}/>{label}</button>
        )}</nav>
        {!composing && <nav className="aw-samples" aria-label="Sample stories and families">
          <button type="button" onClick={() => explore('person', 'component')} title="Person component family"><span lang="zh-Hans">人 / 亻</span> shapes</button>
          <button type="button" onClick={() => selectFamily('生')} title="生 family"><span lang="zh-Hans">生</span> family</button>
          {(['幕', '明天', '姓'] as const).map(target =>
            <button type="button" key={target} aria-label={'Explore ' + target + ' story'} onClick={() => story(target)} lang="zh-Hans">{target}</button>
          )}
        </nav>}
      </div>
    </header>

    {!composing && (depth > 0 || route.story) && <nav className="aw-trail" aria-label="Atlas exploration trail">
      {!route.story && <><button type="button" onClick={previous}><ArrowLeft size={15}/> Back</button><ChevronRight size={14} aria-hidden="true"/></>}
      <span lang="zh-Hans">{context.part?.glyph ?? route.anchor}</span>
      {!route.story && !hideInspector && context.hanzi && context.hanzi !== (context.part?.glyph ?? route.anchor) && <><ChevronRight size={14} aria-hidden="true"/><span lang="zh-Hans">{context.hanzi}</span></>}
      {(route.story || (!hideInspector && context.text && context.text !== context.hanzi)) && <><ChevronRight size={14} aria-hidden="true"/><span lang="zh-Hans" aria-current="page">{route.story || context.text}</span></>}
    </nav>}
    {route.story && <AtlasStoryExplorer target={route.story} step={route.step} onStepChange={step => navigate({step}, null, true)} onExplore={explore} onBack={previous}/>}
    {building && <Suspense fallback={<p role="status">Opening the hanzi builder…</p>}>
      <AtlasAssembly hanzi={route.buildHanzi} part={route.buildPart} scope={route.scope} owner={owner}
        onSelect={({hanzi, part}) => navigate({buildHanzi: hanzi, buildPart: part}, null, true)}
        showWords={hanzi => selectFamily(hanzi)} widen={() => changeScope('all')}/>
    </Suspense>}
    {swiping && <Suspense fallback={<p role="status">Opening Swipe…</p>}>
      <AtlasSwipe key={swipeHistoryEntry} entryWord={route.swipeWord} openFamilyOnEntry={route.familyMap}
        hanzi={route.buildHanzi} part={route.buildPart} slot={route.swipeSlot} scope={route.scope}
        onSelect={({hanzi, part, slot}) => navigate({buildHanzi: hanzi, buildPart: part, swipeSlot: slot, swipeWord: undefined, wordView: undefined}, null, true)}
        wordView={route.wordView}
        onWordViewChange={(view, word) => navigate({wordView: view === 'connections' ? 'connections' : undefined,
          swipeWord: word, familyMap: undefined}, null, true)}
        onFamilyMapChange={open => navigate({familyMap: open}, null, true)}
        widen={() => changeScope('all')}/>
    </Suspense>}
    {!composing && <div className={'aw-layout' + (hideInspector ? ' aw-layout-single' : '') + (showStoryPanel ? ' aw-layout-story' : '')} hidden={!!route.story}>
      <div className="aw-material" data-sticky-family={showStoryPanel && shortFamily ? true : undefined}>
        {canShowStoryPanel && <div className="aw-actions aw-story-toggle">
          <button ref={panelToggle} type="button" aria-pressed={showStoryPanel} aria-controls={showStoryPanel ? 'aw-story-pane' : undefined}
            onClick={() => toggleStoryPanel(!showStoryPanel)}><BookOpen size={16}/> Story beside family</button>
          {showStoryPanel && <a className="aw-story-jump" href="#aw-story-pane" onClick={event => {
            const pane = document.getElementById('aw-story-pane');
            if (!pane) return;
            event.preventDefault();
            pane.scrollIntoView({block: 'start'});
            pane.focus({preventScroll: true});
          }}>Jump to selected story</a>}
        </div>}
        {route.mode === 'family' && <WorkspaceBoard route={route} context={context} compact={showStoryPanel} choose={choose} explore={explore} onPage={page => navigate({page})} onWiden={() => changeScope('all')}/>}
        {(journeyVisited || route.mode === 'read') && <div hidden={route.mode !== 'read'}>
          <WorkspaceJourney key={route.scope} route={route} groups={groups} locale={locale} context={context}
            select={chooseJourney} openGroup={openGroup} showWhole={wholeGroup} inspector={inlineContext ? inspector : undefined}/>
        </div>}
        {route.mode === 'map' && <WorkspaceMap route={route} context={context} locale={locale} choose={choose} explore={explore}
          onMap={map => navigate({map, page: 0})} onPage={page => navigate({page})} onWiden={() => changeScope('all')}/>}
        {route.mode === 'practise' && outsideScope && <p className="aw-scope-note" role="status">
          The selected entry is outside the current HSK range. Widen the range to resume this exercise.
        </p>}
        {route.mode === 'practise' && !outsideScope && <WorkspacePractise route={route} context={context} locale={locale} choose={choose} audio={audio}
          penOnly={penOnly} setPenOnly={setPenOnly} setExercise={setExercise} memory={reelMemory} revealed={reelRevealed}
          setMemory={setReelMemory} setRevealed={setReelRevealed} onContrastRecallActive={setContrastRecallActive} onExpand={() => navigate({wide: !route.wide}, null, true)}/>}
      </div>
      {showStoryPanel
        ? <WorkspaceStoryPane route={route} context={context} audio={audio} step={route.panelStep}
          onStep={panelStep => navigate({panelStep}, null, true)} onExplore={(text, kind) => explore(text, kind, true)}
          onBack={() => toggleStoryPanel(false, true)} onFullStory={story} inspector={inspector}/>
        : !inlineContext && !hideInspector && inspector}
    </div>}
  </section></WorkspaceReadingProvider>;
}
