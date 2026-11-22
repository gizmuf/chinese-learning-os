import {hskClassification,type HskIndex} from './hsk-level-model';

/** Global HSK ranges are cumulative: ascending levels put the selected range first.
 * Keep the existing relevance order within a level and retain every unlisted entry. */
export function dictionaryHskPriority<T>(rows:readonly T[],index:HskIndex|undefined,entry:(row:T)=>{text:string;pinyin?:string}):T[]{
 if(!index)return [...rows];
 return rows.map((row,position)=>{
  const value=entry(row),classification=hskClassification(index,value.text,undefined,value.pinyin);
  const rank=Math.min(...(classification?.levels??[]).map(level=>parseInt(level,10)));
  return {row,position,rank};
 }).sort((a,b)=>a.rank-b.rank||a.position-b.position).map(value=>value.row);
}
