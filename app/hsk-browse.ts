/** Official level membership + source dictionary metadata; not authored study/SRS content. */
import {hskBrowseData as data} from './browse-data';
export type BrowseLevel=1|2|3|4|5|6|'7-9';
export type BrowseScope='all'|BrowseLevel;
export const browseScopes:BrowseScope[]=[1,2,3,4,5,6,'7-9','all'];
export const scopeRank=(level:BrowseScope)=>level==='all'?10:level==='7-9'?9:level;
export function parseBrowseScope(value:string|null):BrowseScope{return value==='7-9'?'7-9':value&&/^[1-6]$/.test(value)?Number(value) as BrowseLevel:'all'}
export function browseLevel(value:string):BrowseLevel{return value==='7-9'?'7-9':Number(value) as BrowseLevel}
export const browseWords=data.words;
export const browseCharacters=data.characters;
export const browseMetadata=data.meta;
export const browseInScope=(level:BrowseLevel,scope:BrowseScope)=>scopeRank(level)<=scopeRank(scope);
