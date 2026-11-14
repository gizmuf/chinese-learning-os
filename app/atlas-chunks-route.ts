import {cloudRouteHref, readCloudRoute, type CloudRoute} from './atlas-cloud-route';
import {hybridInventory, hybridSelection, hybridWords, isHybridLayout} from './atlas-hybrid-model';
import {compareWordFamilies, familyWords, selectFamilyWord} from './word-family-model';
import type {CloudWord} from './atlas-cloud-model';
import type {Locale} from './translate';
import {atlasWorkspaceReturn} from './atlas-workspace-route';

export function atlasLearningContext(
 route: CloudRoute,
 locale: Locale,
 scopedWords: readonly CloudWord[],
 characterWord: CloudWord | undefined,
): {word?: CloudWord; character?: {hanzi: string}; relatives?: CloudWord[]} {
 if (route.layout === 'journey') return {word: scopedWords.find(word => word.id === route.familyEntry)};
 if (route.layout === 'words') {
  const words = route.wordCompare
   ? compareWordFamilies('哪', '那', locale, route.level).flatMap(row => [...row.left, ...row.right])
   : familyWords(route.anchor, locale, route.level);
  return {word: selectFamilyWord(words, route.familyEntry)};
 }
 if (isHybridLayout(route.layout)) {
  const words = hybridWords(route.mapSet, route.anchor, locale, route.level);
  return hybridSelection(words, hybridInventory(words, locale).characters, route.hanzi, route.familyEntry);
 }
 return {word: characterWord};
}

export function atlasChunksHref(route: CloudRoute, word?: CloudWord) {
 const params = new URLSearchParams({
  course: 'intensive', material: 'speaking-chunks', chunks: 'words',
  returnAtlas: cloudRouteHref(route),
 });
 const fallback = route.layout === 'words' ? route.anchor : route.layout === 'journey' ? '' : route.hanzi;
 const query = word?.hanzi ?? fallback;
 if (query) params.set('q', query);
 return '/?' + params;
}

export function atlasChunksReturn(search: string) {
 const origin = new URLSearchParams(search).get('returnAtlas');
 const workspace = atlasWorkspaceReturn(origin);
 if (workspace) return '/' + workspace;
 if (!origin?.startsWith('?') || origin.length > 2000) return;
 const params = new URLSearchParams(origin);
 if (params.get('atlas') !== '1' || params.get('cloud') !== '1') return;
 return '/' + cloudRouteHref(readCloudRoute(origin));
}
