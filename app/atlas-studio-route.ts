import { atlasById } from './atlas-model';
import { assemblies, wordBuilds, wordFamilies, familyIds, type FamilyId } from './atlas-workshop-data';
export const studioViews = ['home', 'explore', 'practice', 'connections', 'words', 'stories', 'listen', 'write', 'recall', 'activity'] as const;
export type StudioView = typeof studioViews[number];
// Workshop shapes and scheduled Atlas targets are separate catalogues.
// Keep both identities: a guided shape must never inherit another target's credit.
export type StudioRoute = {
    view: StudioView;
    family: FamilyId;
    target: string;
    shape: string;
    word: string;
};
export function readStudioRoute(search: string): StudioRoute {
    const p = new URLSearchParams(search), view = p.get('view'), family = p.get('family'), target = p.get('target');
    const safeTarget = target && atlasById.has(target) ? target : 'u6797';
    const requestedFamily = familyIds.includes(family as FamilyId) ? family as FamilyId : 'wood';
    const shape = assemblies.find(a => a.hanzi === p.get('shape') && a.family === requestedFamily) ?? assemblies.find(a => a.hanzi === p.get('shape')) ?? assemblies.find(a => a.hanzi === atlasById.get(safeTarget)?.hanzi && a.family === requestedFamily) ?? assemblies.find(a => a.family === requestedFamily)!;
    const safeFamily = view === 'connections' ? shape.family : requestedFamily;
    const words = wordBuilds.filter(w => wordFamilies(w).includes(safeFamily));
    return { view: studioViews.includes(view as StudioView) ? view as StudioView : 'home', family: safeFamily, target: safeTarget, shape: shape.hanzi, word: wordBuilds.find(w => w.hanzi === p.get('word'))?.hanzi ?? words[0].hanzi };
}
export function studioHref(route: StudioRoute) { const p = new URLSearchParams({ atlas: '1', studio: '1' }); if (route.view !== 'home')
    p.set('view', route.view); p.set('family', route.family); p.set('target', route.target); p.set('shape', route.shape); if (route.view === 'words')
    p.set('word', route.word); return '?' + p; }
export function studioWritingTarget(route: StudioRoute) {
    if (route.view === 'connections')
        return [...atlasById.values()].find(c => c.hanzi === route.shape);
    if (route.view !== 'words')
        return atlasById.get(route.target);
    const word = wordBuilds.find(w => w.hanzi === route.word);
    const candidates = word?.parts.map(p => [...atlasById.values()].find(c => c.hanzi === p.hanzi)).filter(c => c !== undefined) ?? [];
    return candidates.find(c => c.id === route.target) ?? candidates[0];
}
