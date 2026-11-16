/** Official level membership + source dictionary metadata; not authored study/SRS content. */
import {hskBrowseData as data} from './browse-data';
export * from './hsk-scope';
export const browseWords = data.words;
export const browseCharacters = data.characters;
export const browseMetadata = data.meta;
