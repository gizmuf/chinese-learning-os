'use client';

import {createContext, useContext, type ReactNode} from 'react';
import {browseScopes, parseBrowseScope, type BrowseScope} from './hsk-scope';
import {globalHskLabel} from './global-hsk-model';

type GlobalHsk = {scope: BrowseScope; setScope: (scope: BrowseScope) => void};
const GlobalHskContext = createContext<GlobalHsk | null>(null);
export const useGlobalHsk = () => useContext(GlobalHskContext);

export function GlobalHskProvider({scope, setScope, children}: GlobalHsk & {children: ReactNode}) {
  return <GlobalHskContext.Provider value={{scope, setScope}}>{children}</GlobalHskContext.Provider>;
}

export function GlobalHskSelect({scope, setScope, label = 'Global HSK range', className}: GlobalHsk & {
  label?: string; className?: string;
}) {
  return <select aria-label={label} className={className} value={scope} onChange={event => setScope(parseBrowseScope(event.target.value))}>
    {browseScopes.map(scope => <option key={scope} value={scope}>{globalHskLabel(scope)}</option>)}
  </select>;
}
