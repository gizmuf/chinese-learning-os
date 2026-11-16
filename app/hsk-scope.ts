export type BrowseLevel = 1 | 2 | 3 | 4 | 5 | 6 | '7-9';
export type BrowseScope = 'all' | BrowseLevel;
export const browseScopes: BrowseScope[] = [1, 2, 3, 4, 5, 6, '7-9', 'all'];

export const scopeRank = (scope: BrowseScope) => scope === 'all' ? 10 : scope === '7-9' ? 9 : scope;
export function readBrowseScope(value: string | null): BrowseScope | undefined {
  if (value === 'all' || value === '7-9') return value;
  if (value && /^[1-6]$/.test(value)) return Number(value) as BrowseLevel;
}
export const parseBrowseScope = (value: string | null): BrowseScope => readBrowseScope(value) ?? 'all';
export function browseLevel(value: string): BrowseLevel {
  return value === '7-9' ? '7-9' : Number(value) as BrowseLevel;
}
export const browseInScope = (level: BrowseLevel, scope: BrowseScope) => scopeRank(level) <= scopeRank(scope);
