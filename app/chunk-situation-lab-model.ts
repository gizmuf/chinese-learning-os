import {chunkUnits,matchesChunkAnswer,type ChunkExample,type ChunkUnit} from './speaking-chunks-data';
import {grammarFrames,type GrammarFrame,type GrammarExample} from './chunk-library-data';
import glossary from '../data/speaking-chunks/grammar-lookup.json';
import readings from '../data/speaking-chunks/target-readings.json';
import {situationGrammarFrames,type GrammarSituationId,type SituationSet} from './chunk-situation-grammar';
export type SituationId='request-2'|'choice-2'|'plan-2'|'request-3'|'choice-3'|'plan-3'|GrammarSituationId;
export const situationIds:readonly SituationId[]=['request-2','choice-2','plan-2','request-3','choice-3','plan-3'];
export type Situation={id:SituationId;unit:ChunkUnit;example:ChunkExample;target:ChunkExample;grammar?:{frame:GrammarFrame;example:GrammarExample;target:GrammarExample}};
/** Adapter only: text, translations and clips remain owned by Grammar & frames. */
function grammarExample(example:GrammarExample):ChunkExample{
 return {id:'frame-'+example.id,hanzi:example.hanzi,pinyin:example.pinyin,meaning:example.meaning,chunks:example.targets.map(target=>{
  const text=example.parts[target],entry=glossary.find(g=>g.text===text),connected=(readings as Record<string,Record<string,string>>)[example.id]?.[target];
  if(!entry||!connected)throw new Error('Missing canonical grammar support: '+example.id+' / '+target);
  return {text,pinyin:connected,meaning:entry.meaning,role:'action' as const,audioId:'frame-'+example.id+'-'+target};
 })};
}
function grammarRound(set:SituationSet):Situation[]{
 const selected=situationGrammarFrames.filter(id=>{const frame=grammarFrames.find(f=>f.id===id);return set==='all'||frame?.topic===set});
 // Separate the two targets of a frame instead of immediately repeating the worked answer.
 return ([0,1] as const).flatMap(index=>selected.map(id=>{
  const frame=grammarFrames.find(f=>f.id===id)!;if(frame.examples.length!==2)throw new Error('Expected two canonical examples: '+id);
  const variants=frame.examples.map(grammarExample),target=frame.examples[index],example=frame.examples[1-index];
  return {id:target.id as GrammarSituationId,unit:{id:frame.id,title:frame.title,note:frame.note,lesson:0,variants},example:variants[1-index],target:variants[index],grammar:{frame,example,target}};
 }));
}
export function situationRound(set:SituationSet='everyday'):Situation[]{
 const everyday=()=>situationIds.map(id=>{const unit=chunkUnits.find(u=>u.variants.some(v=>v.id===id));const target=unit?.variants.find(v=>v.id===id);if(!unit||!target)throw new Error('Missing canonical situation: '+id);return {id,unit,example:unit.variants[0],target}});
 return set==='everyday'?everyday():set==='all'?[...everyday(),...grammarRound(set)]:grammarRound(set);
}
export const situationPatterns:Record<string,string>={request:'你能给我 […] 吗？',choice:'你想喝 […] 还是 […]？',plan:'我明天想去 […]。',...Object.fromEntries(grammarFrames.filter(f=>situationGrammarFrames.includes(f.id as typeof situationGrammarFrames[number])).map(f=>[f.id,f.pattern]))};
export function situationHintChunks(situation:Situation){return situation.grammar?situation.target.chunks:situation.target.chunks.filter((chunk,i)=>situation.unit.variants.some(other=>other.chunks[i]?.text!==chunk.text))}
export type SituationResult={id:SituationId;method:'typed'|'spoken'|'reveal';outcome:'model-match'|'self-check'|'retry';assisted:boolean};
export function typedSituationResult(situation:Situation,input:string,assisted:boolean):SituationResult{return {id:situation.id,method:'typed',outcome:matchesChunkAnswer(input,situation.target.hanzi)?'model-match':'retry',assisted}}
export function situationSummary(results:readonly SituationResult[]){return {unaided:results.filter(r=>!r.assisted&&r.outcome==='model-match').length,selfCheck:results.filter(r=>!r.assisted&&r.outcome==='self-check').length,assisted:results.filter(r=>r.assisted).length,retryIds:results.filter(r=>r.assisted||r.outcome==='retry').map(r=>r.id)}}
export function situationLabRequested(search:string){return new URLSearchParams(search).get('chunklab')==='1'}
/** Preserve the original collection, filters, course/material, unknown query context and hash. */
export function situationLabHref(href:string,enabled:boolean){const url=new URL(href,'http://localhost');if(enabled)url.searchParams.set('chunklab','1');else url.searchParams.delete('chunklab');return url.pathname+url.search+url.hash}
