import type {BrowseScope} from './hsk-browse';
import {parseBrowseScope} from './hsk-browse';
import {isStoryTarget, type StoryTarget} from './atlas-story-explorer-model';

export const workspaceModes = ['family', 'read', 'map', 'practise'] as const;
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
  page: number;
  map: typeof workspaceMapViews[number];
  exercise: typeof workspaceExercises[number] | '';
  wide: boolean;
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
  const story = params.get('wsstory');
  return {
    mode: readOption(params.get('mode'), workspaceModes, 'family'),
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
  if (route.page) params.set('page', String(route.page));
  if (route.map !== 'structure') params.set('map', route.map);
  if (route.exercise) params.set('practice', route.exercise);
  if (route.wide) params.set('wide', '1');
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
  return atlasWorkspaceHref(readAtlasWorkspaceRoute(origin), atlasWorkspaceScroll(origin));
}
