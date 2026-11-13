import source from '../data/speaking-chunks/content.json';
import {clozeActivityIds} from './chunk-library-data';
import type {Copy} from './course-data';
export type ChunkRole='person'|'action'|'topic'|'time'|'place'|'question'|'reason';
export type SpeakingChunk={text:string;pinyin:string;role:ChunkRole;meaning:Copy;audioId:string};
export type ChunkExample={id:string;hanzi:string;pinyin:string;meaning:Copy;chunks:SpeakingChunk[]};
export type ChunkUnit={id:string;title:Copy;lesson:number;note:Copy;variants:ChunkExample[]};
export const chunkUnits=source.units as ChunkUnit[];
export const chunkExamples=chunkUnits.flatMap(u=>u.variants);
export const chunkMaterialId='speaking-chunks' as const;
export const chunkActivityIds=[...chunkExamples.map(v=>'chunk-recall-'+v.id),...clozeActivityIds];
export const chunkAudio=(id:string)=>'/speaking-chunks/audio/'+id+'.mp3';
// Mandarin IME output, spacing and punctuation may differ; word order may not.
export function normalizeChunkAnswer(text:string){return text.normalize('NFKC').replace(/[\s\p{P}\p{Cf}]/gu,'');}
export function matchesChunkAnswer(answer:string,target:string){return !!normalizeChunkAnswer(answer)&&normalizeChunkAnswer(answer)===normalizeChunkAnswer(target);}
