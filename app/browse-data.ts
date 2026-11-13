/** Lossless static-data transport. No remote fetch or runtime credentials. */
import {unpack} from './packed-data';
import hskPacked from '../data/hsk-browse-index-packed';
import structurePacked from '../data/hanzi-structure-packed';

export const hskBrowseData=unpack<typeof import('../data/hsk-browse-index.json')>(hskPacked);
export const hanziStructureData=unpack<typeof import('../data/hanzi-structure.json')>(structurePacked);
