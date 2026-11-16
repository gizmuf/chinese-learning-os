import {browseScopes, parseBrowseScope, readBrowseScope, scopeRank, type BrowseScope} from './hsk-scope';

export const defaultHskScope: BrowseScope = 1;
export const globalHskLabel = (scope: BrowseScope) =>
  scope === 'all' ? 'All' : scope === 1 ? 'HSK 1' : 'HSK 1–' + scopeRank(scope);

export function globalHskPreference(value: unknown): BrowseScope | undefined {
  if (browseScopes.includes(value as BrowseScope)) return value as BrowseScope;
  if (value === 'bonus') return 'all';
  if (typeof value === 'string' && /^hsk[1-3]$/.test(value)) return parseBrowseScope(value.slice(3));
}

export function initialGlobalHsk(search: string, sameOriginNavigation = false): BrowseScope {
  if (sameOriginNavigation) return defaultHskScope;
  const params = new URLSearchParams(search);
  return readBrowseScope(params.get('hsk')) ?? globalHskPreference(params.get('level')) ?? defaultHskScope;
}

/** Unclassified material belongs in All when building a general HSK pool. */
export function knownHskInScope(level: number | '7-9' | null | undefined, scope: BrowseScope) {
  if (scope === 'all') return true;
  if (level === undefined || level === null) return false;
  if (level === '7-9') return scopeRank(scope) >= 9;
  return Number.isInteger(level) && level >= 1 && level <= scopeRank(scope);
}

export function hskScopeForOwner(saved: {hskScope?: unknown; level?: unknown} | undefined, unopenedScope: BrowseScope) {
  return globalHskPreference(saved?.hskScope) ?? globalHskPreference(saved?.level) ?? unopenedScope;
}
