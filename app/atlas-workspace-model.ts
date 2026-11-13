import {cloudWords, type CloudWord} from './atlas-cloud-model';
import {extendedCharacters, extendedComponent, extendedFamily, type ExtendedCharacter} from './atlas-cloud-extended';
import {cloudRelation} from './atlas-cloud-connections';
import {familyJourney, type JourneyGroup} from './family-journey-model';
import {familyWords} from './word-family-model';
import {atlasByHanzi, atlasComponents} from './atlas-model';
import {characterPronunciation, componentPronunciation, sentencePronunciation, wordPronunciation} from './atlas-spatial-model';
import {familyStories} from './atlas-family-stories-data';
import type {Locale} from './translate';
import type {BrowseScope} from './hsk-browse';
import type {StudyExample} from './study-examples';
import {atlasWorkspaceHref, type WorkspaceKind, type WorkspaceRoute} from './atlas-workspace-route';
import {cloudRouteHref, initialCloudRoute, type CloudRoute} from './atlas-cloud-route';

export const workspaceBoardSize = 12;
export const workspaceMapSize = 18;

const characters = new Map<Locale, Map<string, ExtendedCharacter>>();
export function workspaceCharacters(locale: Locale) {
  let index = characters.get(locale);
  if (!index) {
    index = new Map(extendedCharacters(locale).map(character => [character.hanzi, character]));
    characters.set(locale, index);
  }
  return index;
}

export function workspaceScopeLabel(scope: BrowseScope) {
  if (scope === 'all') return 'All vocabulary';
  if (scope === 1) return 'HSK 1';
  return scope === '7-9' ? 'HSK 1–6 + 7–9' : 'HSK 1–' + scope;
}

export function workspaceJourneyGroup(group: JourneyGroup, locale: Locale, scope: BrowseScope) {
  const full = group.kind === 'character' ? familyWords(group.anchor, locale, scope) : group.words;
  return {here: group.words, full};
}

export function workspaceGroupLabel(group: JourneyGroup, locale: Locale, scope: BrowseScope) {
  const {here, full} = workspaceJourneyGroup(group, locale, scope);
  return group.kind === 'character'
    ? `${here.length} here · ${full.length} in full family`
    : `${here.length} in this topic`;
}

export function workspaceGroups(locale: Locale, scope: BrowseScope) {
  return familyJourney(locale, scope);
}

export function workspaceCharacterParts(character: ExtendedCharacter | undefined) {
  if (!character) return [];
  const direct = [...character.decomposition].filter(glyph => !/[\u2ff0-\u2fff?？]/u.test(glyph));
  return [...new Set(direct)].filter(glyph => glyph !== character.hanzi && extendedComponent(glyph));
}

export function workspaceStructure(scope: BrowseScope, locale: Locale, part: string) {
  return part ? extendedFamily([part], locale, scope) : [];
}

export function workspaceExample(word: CloudWord | undefined): StudyExample | undefined {
  if (word?.item?.sentence) return {
    id: word.id, text: word.item.sentence, pinyin: word.item.sentencePinyin,
    meaning: word.item.translation, audio: sentencePronunciation(word),
  };
  return undefined;
}

function workspaceStoryWord(text: string) {
  return familyStories.find(story => story.word && (story.word.hanzi === text || story.word.sentence === text));
}

export function workspaceStoryExample(text: string, locale: Locale): StudyExample | undefined {
  const authored = workspaceStoryWord(text);
  if (!authored?.word) return;
  const {sentence, sentencePinyin, translation} = authored.word;
  return {
    id: authored.id, text: sentence, pinyin: sentencePinyin, meaning: translation[locale],
    audio: {text: sentence, pinyin: sentencePinyin, source: '/atlas/family-stories/' + authored.id + '-sentence.mp3', context: false, kind: 'sentence'},
  };
}

export function resolveWorkspaceContext(route: WorkspaceRoute, locale: Locale, groups: JourneyGroup[] = []) {
  const catalog = cloudWords(locale, route.scope);
  const group = groups.find(item => item.id === route.group);
  const componentId = route.part || (route.kind === 'component' ? route.expression : '');
  const part = componentId ? extendedComponent(componentId) : undefined;
  const members = route.relation === 'literal' ? familyWords(route.anchor, locale, route.scope)
    : route.relation === 'topic' && group?.kind === 'topic' ? group.words : [];
  const structural = route.relation === 'structure' ? workspaceStructure(route.scope, locale, componentId) : [];
  const explicit = (candidate: CloudWord) => route.wordId ? candidate.id === route.wordId
    : route.kind === 'sentence' ? !!route.expression && candidate.item?.sentence === route.expression
    : route.kind === 'word' ? !!route.expression && candidate.hanzi === route.expression : false;
  const selected = route.wordId || route.expression && (route.kind === 'word' || route.kind === 'sentence')
    ? catalog.find(explicit) ?? cloudWords(locale).find(explicit) : undefined;
  const word = selected ?? (route.kind === 'word' && !route.expression
    ? route.relation === 'structure' && route.hanzi ? catalog.find(candidate => candidate.hanzi === route.hanzi) : members[0]
    : undefined);
  const characterText = route.kind === 'character' && /^\p{Script=Han}$/u.test(route.expression) ? route.expression : '';
  const hanzi = route.hanzi || characterText || (route.kind === 'component' ? part?.glyph ?? '' : '')
    || (word?.hanzi.includes(route.anchor) ? [...route.anchor][0] : [...(word?.hanzi || route.anchor)][0]);
  const character = workspaceCharacters(locale).get(hanzi);
  const reviewed = atlasByHanzi.get(hanzi);
  const knownExample = workspaceExample(word);
  const story = route.expression ? workspaceStoryWord(route.expression) : undefined;
  const storyExample = story ? workspaceStoryExample(route.expression, locale) : undefined;
  const example = route.kind === 'sentence' && route.expression
    ? (knownExample?.text === route.expression ? knownExample : storyExample)
    : route.kind === 'word' ? knownExample ?? storyExample : undefined;
  const text = route.kind === 'sentence' ? example?.text ?? route.expression
    : route.kind === 'component' ? part?.glyph ?? route.expression
    : route.kind === 'character' ? hanzi : word?.hanzi ?? route.expression ?? '';
  return {
    text, word, outsideScope: !!word && !catalog.some(candidate => candidate.id === word.id), hanzi, character, reviewed, part, group, members, structural, example,
    reading: route.kind === 'sentence' ? example?.pinyin
      : route.kind === 'character' ? reviewed?.pinyin ?? character?.readings.join(' / ')
      : route.kind === 'component' ? workspaceCharacters(locale).get(text)?.readings.join(' / ')
      : word?.pinyin ?? story?.word?.pinyin,
    meaning: route.kind === 'sentence' ? example?.meaning
      : route.kind === 'character' ? reviewed?.meaning[locale] ?? character?.meaning
      : route.kind === 'component' ? part?.label[locale]
      : word?.meaning ?? story?.word?.meaning[locale],
    pronunciation: route.kind === 'sentence' ? example?.audio
      : route.kind === 'character' ? characterPronunciation(hanzi, locale)
      : route.kind === 'component' ? componentPronunciation(componentId, locale)
      : word ? wordPronunciation(word)
      : story?.word ? {text: story.word.hanzi, pinyin: story.word.pinyin, source: '/atlas/family-stories/' + story.id + '-word.mp3', context: false, kind: 'word' as const}
      : undefined,
    parts: workspaceCharacterParts(character),
  };
}

export type WorkspaceContext = ReturnType<typeof resolveWorkspaceContext>;

function originalComponent(context: WorkspaceContext) {
  const {hanzi, character, reviewed, parts, part} = context;
  const leaves: readonly string[] = character?.leafComponents ?? [];
  const matches = (glyph: string) => glyph === hanzi || character?.components.includes(glyph);
  const canonical = (id: string) => {
    const curated = atlasComponents.find(component => component.id === id || component.glyph === id || component.aliases.includes(id));
    return extendedComponent(curated?.id ?? id);
  };
  const candidates = [part?.id, reviewed?.semantic, reviewed?.phonetic, character?.radical,
    ...parts, ...leaves, hanzi];
  for (const id of candidates) {
    if (!id) continue;
    const component = canonical(id);
    if (component?.variants.some(matches)) {
      const nested = !component.variants.some(glyph => glyph === hanzi || leaves.includes(glyph));
      return {component: component.id, nested};
    }
  }
  return {};
}

export function workspaceOriginalHref(route: WorkspaceRoute, context: WorkspaceContext, layout: CloudRoute['layout'], scroll = 0) {
  const wordId = context.word?.id ?? '';
  const params = new URLSearchParams(cloudRouteHref({
    ...initialCloudRoute, ...originalComponent(context), layout, level: route.scope, anchor: route.anchor,
    hanzi: context.hanzi, kind: wordId ? 'word' : 'character', word: wordId, familyEntry: wordId,
  }));
  params.set('returnWorkspace', atlasWorkspaceHref({...route, wordId: wordId || route.wordId, hanzi: context.hanzi}, scroll));
  return '?' + params;
}

export function workspaceSelection(route: WorkspaceRoute, word: CloudWord): Partial<WorkspaceRoute> {
  return {
    kind: 'word', wordId: word.id, expression: '',
    hanzi: word.hanzi.includes(route.hanzi) && route.hanzi ? route.hanzi
      : word.hanzi.includes(route.anchor) ? [...route.anchor][0] : [...word.hanzi][0],
  };
}

export function workspaceExploration(text: string, kind: WorkspaceKind, locale: Locale, route: WorkspaceRoute): Partial<WorkspaceRoute> {
  const catalog = cloudWords(locale, route.scope);
  if (kind === 'component') return {kind, relation: 'structure', part: text, hanzi: '', wordId: '', expression: text, page: 0};
  if (kind === 'character') return {kind, hanzi: text, wordId: '', expression: '', page: 0};
  if (kind === 'sentence') {
    const current = route.wordId ? cloudWords(locale).find(word => word.id === route.wordId && word.item?.sentence === text) : undefined;
    const owner = current ?? catalog.find(word => word.item?.sentence === text) ?? cloudWords(locale).find(word => word.item?.sentence === text);
    return {kind, wordId: owner?.id ?? '', expression: text, hanzi: owner && owner.hanzi.includes(route.hanzi) ? route.hanzi : [...(owner?.hanzi || text)][0]};

  }
  const word = catalog.find(word => word.hanzi === text) ?? cloudWords(locale).find(word => word.hanzi === text);
  return word ? workspaceSelection(route, word)
    : {kind, wordId: '', expression: text, hanzi: [...text][0]};
}

export function workspaceHanzi(text: string) {
  return [...new Set([...text].filter(letter => /\p{Script=Han}/u.test(letter)))];
}

export function workspaceStructureRole(hanzi: string, part: string) {
  const relation = cloudRelation(hanzi, part);
  if (relation === 'meaning') return 'Reviewed meaning clue';
  if (relation === 'sound') return 'Reviewed sound clue';
  return 'Modern shape';
}
