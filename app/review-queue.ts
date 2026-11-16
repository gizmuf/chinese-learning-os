import {knownHskInScope} from './global-hsk-model';
import type {BrowseScope} from './hsk-scope';
import {makeQueue,type LearningEvent} from './learning';
import type {Item,StudyLevel,Skill} from './content';
export function buildReviewQueue(events:LearningEvent[],skill:Skill,pool:Item[],minutes:number,scope:'scheduled'|'extra'|'all'='scheduled') {
 if(scope==='all')return [...pool];
 const count=Math.max(1,Math.floor((minutes*60)/(skill==='writing'?90:25)));
 return (scope==='extra'?pool:makeQueue(events,skill,pool)).slice(0,count);
}
export function allReviewLevel(search:string):StudyLevel|null {
 const p=new URLSearchParams(search);if(p.get('practice')!=='all')return null;
 return ({'1':'hsk1','2':'hsk2','3':'hsk3'} as const)[p.get('hsk') as '1'|'2'|'3']??null;
}
export function allReviewHref(level:StudyLevel){return level==='bonus'?null:'?practice=all&hsk='+({hsk1:1,hsk2:2,hsk3:3}[level]);}

export function isAllReviewEntry(search:string) {
 return new URLSearchParams(search).get('practice') === 'all';
}

export function allReviewRun(search: string) {
 const run = new URLSearchParams(search).get('run');
 return run && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(run) ? run : undefined;
}
export function scopedAllReviewHref(scope: BrowseScope, run: string) {
 return '?' + new URLSearchParams({practice: 'all', hsk: String(scope), run});
}

type SavedReviewRun = {id: string; itemIds: string[]; index: number; practice?: boolean};
export function queueForScopedAllReview(items: Item[], scoped: Item[], stored: SavedReviewRun | undefined, pinned: string | undefined, legacyScope?: BrowseScope) {
 if (!stored?.practice) return {queue: scoped, index: 0};
 // Previous builds linked the exact band without a run ID. Recover that queue as
 // a pinned session even when today's global range has a different ceiling.
 const matchesLegacy = !pinned && legacyScope !== undefined && (
  sameIds(stored.itemIds, items.filter(item => item.hskLevel === legacyScope)) ||
  sameIds(stored.itemIds, items.filter(item => knownHskInScope(item.hskLevel, legacyScope))));
 if (pinned ? stored.id !== pinned : !matchesLegacy && !sameIds(stored.itemIds, scoped)) return {queue: scoped, index: 0};
 const byId = new Map(items.map(item => [item.id, item]));
 const saved = stored.itemIds.flatMap(id => byId.get(id) ?? []);
 if (saved.length !== stored.itemIds.length || !saved.length) return {queue: scoped, index: 0};
 return {queue: saved, index: Math.min(stored.index, saved.length - 1), run: stored.id};
}
function sameIds(ids: string[], queue: Item[]) {
 return ids.length === queue.length && ids.every((id, index) => id === queue[index].id);
}
