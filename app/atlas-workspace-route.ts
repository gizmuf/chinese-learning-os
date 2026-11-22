import type {BrowseScope} from './hsk-browse';
import {parseBrowseScope} from './hsk-browse';
import {cloudRouteHref, readCloudRoute, type CloudRoute} from './atlas-cloud-route';
import {isHybridLayout} from './atlas-hybrid-model';
import {isStoryTarget, type StoryTarget} from './atlas-story-explorer-model';

export const workspaceModes = ['family', 'read', 'map', 'practise', 'build'] as const;
export const workspaceMapViews = ['structure', 'connections', 'matrix'] as const;
export const workspaceExercises = ['reels', 'contrast', 'recognition', 'writing'] as const;
export type WorkspaceKind = 'word' | 'character' | 'component' | 'sentence';

export type WorkspaceRoute = {
  mode: typeof workspaceModes[number];
  relation: 'literal' | 'structure' | 'topic';
  scope: BrowseScope;
  anchor: string;
  group: string;
  part: string;
  hanzi: string;
  wordId: string;
  expression: string;
  kind: WorkspaceKind;
  story: StoryTarget | '';
  step: number;
  storyPanel: boolean;
  panelStep: number;
  page: number;
  map: typeof workspaceMapViews[number];
  exercise: typeof workspaceExercises[number] | '';
  wide: boolean;
  buildHanzi?: string;
  buildPart?: string;
};

export function isAtlasWorkspaceEntry(params: URLSearchParams) {
  return params.get('atlas') === '1' && params.get('workspace') === '1';
}

const readOption = <T extends string>(value: string | null, options: readonly T[], fallback: T): T =>
  options.find(option => option === value) ?? fallback;
const smallNumber = (value: string | null, max: number) =>
  value && /^\d+$/.test(value) ? Math.min(Number(value), max) : 0;
const readAnchor = (value: string | null) =>
  value && /^[\p{Script=Han}]{1,8}$/u.test(value) ? value : '学';
const readCharacter = (value: string | null) =>
  value && /^\p{Script=Han}$/u.test(value) ? value : '';

export function readAtlasWorkspaceRoute(search: string): WorkspaceRoute {
  const params = new URLSearchParams(search);
  const mode = readOption(params.get('mode'), workspaceModes, 'family');
  const buildPart = params.get('buildPart');
  const story = params.get('wsstory');
  const storyPanel = params.get('storyPanel') === '1';
  return {
    mode,
    ...(mode === 'build' && {
      buildHanzi: readCharacter(params.get('buildHanzi')) || undefined,
      buildPart: buildPart === '' || buildPart && /^[\p{Script=Han}\u2e80-\u2fdf\u31c0-\u31ee\ue000-\uf8ff]$/u.test(buildPart) ? buildPart : undefined,
    }),
    relation: readOption(params.get('relation'), ['literal', 'structure', 'topic'], 'literal'),
    scope: parseBrowseScope(params.get('hsk')),
    anchor: readAnchor(params.get('anchor')),
    group: params.get('group')?.slice(0, 100) ?? '',
    part: params.get('part')?.slice(0, 40) ?? '',
    hanzi: readCharacter(params.get('hanzi')),
    wordId: (params.get('word') ?? params.get('entry'))?.slice(0, 100) ?? '',
    expression: params.get('text')?.slice(0, 140) ?? '',
    kind: readOption(params.get('focus'), ['word', 'character', 'component', 'sentence'], 'word'),
    story: story && isStoryTarget(story) ? story : '',
    step: smallNumber(params.get('step'), 2),
    storyPanel,
    panelStep: storyPanel ? smallNumber(params.get('panelStep'), 2) : 0,
    page: smallNumber(params.get('page'), 1000),
    map: readOption(params.get('map'), workspaceMapViews, 'structure'),
    exercise: readOption(params.get('practice'), [...workspaceExercises, ''], ''),
    wide: params.get('wide') === '1',
  };
}

export function atlasWorkspaceHref(route: WorkspaceRoute, scroll = 0) {
  const params = new URLSearchParams({atlas: '1', workspace: '1', anchor: route.anchor, hsk: String(route.scope)});
  if (route.mode !== 'family') params.set('mode', route.mode);
  if (route.relation !== 'literal') params.set('relation', route.relation);
  if (route.group) params.set('group', route.group);
  if (route.part) params.set('part', route.part);
  if (route.hanzi) params.set('hanzi', route.hanzi);
  if (route.wordId) params.set('word', route.wordId);
  if (route.expression) params.set('text', route.expression);
  if (route.kind !== 'word') params.set('focus', route.kind);
  if (route.story) {
    params.set('wsstory', route.story);
    if (route.step) params.set('step', String(route.step));
  }
  if (route.storyPanel) {
    params.set('storyPanel', '1');
    if (route.panelStep) params.set('panelStep', String(route.panelStep));
  }
  if (route.page) params.set('page', String(route.page));
  if (route.map !== 'structure') params.set('map', route.map);
  if (route.exercise) params.set('practice', route.exercise);
  if (route.wide) params.set('wide', '1');
  if (route.mode === 'build') {
    if (route.buildHanzi) params.set('buildHanzi', route.buildHanzi);
    if (route.buildPart !== undefined) params.set('buildPart', route.buildPart);
  }
  if (scroll > 0) params.set('awscroll', String(Math.floor(scroll)));
  return '?' + params;
}

export function atlasWorkspaceScroll(search: string) {
  return smallNumber(new URLSearchParams(search).get('awscroll'), 1_000_000);
}

/** Only same-page, explicitly opted-in preview queries are valid return destinations. */
export function atlasWorkspaceReturn(origin: string | null) {
  if (!origin?.startsWith('?') || origin.length > 2000) return;
  if (!isAtlasWorkspaceEntry(new URLSearchParams(origin))) return;
  const href = atlasWorkspaceHref(readAtlasWorkspaceRoute(origin), atlasWorkspaceScroll(origin));
  const cloud = atlasCloudReturn(new URLSearchParams(origin).get('returnCloud'));
  return cloud ? href + '&returnCloud=' + encodeURIComponent(cloud) : href;
}

/** Accept only a local Cloud Atlas origin and normalize it through the existing route model. */
export function atlasCloudReturn(origin: string | null) {
  if (!origin?.startsWith('?') || origin.length > 2000) return;
  const params = new URLSearchParams(origin);
  if (params.get('atlas') !== '1' || params.get('cloud') !== '1' || params.has('workspace') || params.has('reader')) return;
  return cloudRouteHref(readCloudRoute(origin));
}

export function workspaceHrefFromCloud(route: CloudRoute, word: {id: string; hanzi: string; sentence?: string} | undefined, selectedHanzi?: string, mode?: 'build') {
  const literal = route.layout === 'words' || route.layout === 'journey' || isHybridLayout(route.layout);
  const hanzi = selectedHanzi || (word && !word.hanzi.includes(route.hanzi) ? [...word.hanzi][0] : route.hanzi);
  const selectedWord = word && (literal || route.kind === 'word' || route.stage === 'sentence') ? word : undefined;
  const sentence = route.stage === 'sentence' ? selectedWord?.sentence : undefined;
  return atlasWorkspaceHref({
    ...readAtlasWorkspaceRoute(''),
    scope: route.level, mode: mode ?? (route.layout === 'journey' ? 'read' : 'family'),
    buildHanzi: mode === 'build' ? hanzi : undefined,
    anchor: literal ? route.anchor : hanzi,
    relation: literal ? 'literal' : 'structure',
    part: route.component, hanzi, wordId: selectedWord?.id ?? '',
    kind: sentence ? 'sentence' : selectedWord ? 'word' : 'character', expression: sentence ?? '',
  }) + '&returnCloud=' + encodeURIComponent(cloudRouteHref(route));
}
