import {chunkUnits,matchesChunkAnswer,type ChunkExample,type ChunkUnit} from './speaking-chunks-data';
export type SituationId='request-2'|'choice-2'|'plan-2'|'request-3'|'choice-3'|'plan-3';
export const situationIds:readonly SituationId[]=['request-2','choice-2','plan-2','request-3','choice-3','plan-3'];
export type Situation={id:SituationId;unit:ChunkUnit;example:ChunkExample;target:ChunkExample};
export function situationRound():Situation[]{return situationIds.map(id=>{const unit=chunkUnits.find(u=>u.variants.some(v=>v.id===id));const target=unit?.variants.find(v=>v.id===id);if(!unit||!target)throw new Error('Missing canonical situation: '+id);return {id,unit,example:unit.variants[0],target}})}
export const situationPatterns:Record<string,string>={request:'你能给我 […] 吗？',choice:'你想喝 […] 还是 […]？',plan:'我明天想去 […]。'};
export function situationHintChunks(situation:Situation){return situation.target.chunks.filter((chunk,i)=>situation.unit.variants.some(other=>other.chunks[i]?.text!==chunk.text))}
export type SituationResult={id:SituationId;method:'typed'|'spoken'|'reveal';outcome:'model-match'|'self-check'|'retry';assisted:boolean};
export function typedSituationResult(situation:Situation,input:string,assisted:boolean):SituationResult{return {id:situation.id,method:'typed',outcome:matchesChunkAnswer(input,situation.target.hanzi)?'model-match':'retry',assisted}}
export function situationSummary(results:readonly SituationResult[]){return {unaided:results.filter(r=>!r.assisted&&r.outcome==='model-match').length,selfCheck:results.filter(r=>!r.assisted&&r.outcome==='self-check').length,assisted:results.filter(r=>r.assisted).length,retryIds:results.filter(r=>r.assisted||r.outcome==='retry').map(r=>r.id)}}
export function situationLabRequested(search:string){return new URLSearchParams(search).get('chunklab')==='1'}
/** Preserve the original collection, filters, course/material, unknown query context and hash. */
export function situationLabHref(href:string,enabled:boolean){const url=new URL(href,'http://localhost');if(enabled)url.searchParams.set('chunklab','1');else url.searchParams.delete('chunklab');return url.pathname+url.search+url.hash}
